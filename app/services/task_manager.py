"""
任务管理服务
"""
import json
import uuid
import asyncio
from typing import Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime

from app.database import (
    fetch_available_task, lock_task, unlock_task, 
    complete_task, get_task_by_id, increment_contribution,
    save_submission, get_user_locked_task, get_available_projects, get_leaderboard
)
from app.services.scanner import get_task_image
from app.services.excel_writer import append_to_excel
from app.services.autocomplete import add_rows_to_cache
from app.config import HEARTBEAT_TIMEOUT, WORK_DIR


@dataclass
class ActiveTask:
    """活跃任务信息"""
    task_id: int
    project_id: str
    machine_id: str
    page_index: int
    username: str
    last_heartbeat: datetime = field(default_factory=datetime.now)
    ws_connected: bool = False
    release_task: Optional[asyncio.Task] = None


class TaskManager:
    """任务管理器（单例）"""
    
    def __init__(self):
        self._active_tasks: Dict[str, ActiveTask] = {}  # task_token -> ActiveTask
    
    def fetch_task(self, username: str, project_id: str = None) -> Optional[dict]:
        """获取一个可用任务"""
        # 先检查内存中是否已有该用户的任务
        for token, active in self._active_tasks.items():
            if active.username == username:
                # 用户已有任务，返回现有任务
                image = get_task_image(active.project_id, active.machine_id, active.page_index)
                return {
                    "task_token": token,
                    "project_id": active.project_id,
                    "machine_id": active.machine_id,
                    "page_index": active.page_index,
                    "image": image
                }
        
        # 再检查数据库中是否有该用户锁定的任务（服务重启后恢复）
        db_locked = get_user_locked_task(username)
        if db_locked:
            task_token = str(uuid.uuid4())
            page_index = db_locked.get("page_index", 0)
            
            self._active_tasks[task_token] = ActiveTask(
                task_id=db_locked["id"],
                project_id=db_locked["project_id"],
                machine_id=db_locked["machine_id"],
                page_index=page_index,
                username=username
            )
            
            image = get_task_image(db_locked["project_id"], db_locked["machine_id"], page_index)
            return {
                "task_token": task_token,
                "project_id": db_locked["project_id"],
                "machine_id": db_locked["machine_id"],
                "page_index": page_index,
                "image": image
            }
        
        # 获取新任务（可指定项目）
        task = fetch_available_task(HEARTBEAT_TIMEOUT, project_id)
        if not task:
            return None
        
        # 锁定任务
        if not lock_task(task["id"], username):
            return None
        
        # 生成任务令牌
        task_token = str(uuid.uuid4())
        
        page_index = task.get("page_index", 0)
        
        # 记录活跃任务
        self._active_tasks[task_token] = ActiveTask(
            task_id=task["id"],
            project_id=task["project_id"],
            machine_id=task["machine_id"],
            page_index=page_index,
            username=username
        )
        
        # 获取单张图片
        image = get_task_image(task["project_id"], task["machine_id"], page_index)
        
        return {
            "task_token": task_token,
            "project_id": task["project_id"],
            "machine_id": task["machine_id"],
            "page_index": page_index,
            "image": image
        }
    
    def get_available_projects(self) -> list:
        """获取有可用任务的项目列表"""
        return get_available_projects()
    
    def get_leaderboard(self, limit: int = 10) -> list:
        """获取贡献排行榜"""
        return get_leaderboard(limit)
    
    def get_active_task(self, task_token: str) -> Optional[ActiveTask]:
        """获取活跃任务"""
        return self._active_tasks.get(task_token)
    
    def update_heartbeat(self, task_token: str):
        """更新心跳时间"""
        if task_token in self._active_tasks:
            self._active_tasks[task_token].last_heartbeat = datetime.now()
    
    def set_ws_connected(self, task_token: str, connected: bool):
        """设置 WebSocket 连接状态"""
        if task_token in self._active_tasks:
            self._active_tasks[task_token].ws_connected = connected
    
    async def schedule_release(self, task_token: str):
        """计划释放任务（10秒后）"""
        active = self._active_tasks.get(task_token)
        if not active:
            return
        
        # 取消之前的释放任务
        if active.release_task and not active.release_task.done():
            active.release_task.cancel()
        
        async def delayed_release():
            await asyncio.sleep(HEARTBEAT_TIMEOUT)
            # 再次检查是否重连
            if task_token in self._active_tasks:
                current = self._active_tasks[task_token]
                if not current.ws_connected:
                    self.release_task(task_token)
        
        active.release_task = asyncio.create_task(delayed_release())
    
    def cancel_release(self, task_token: str):
        """取消释放计划"""
        active = self._active_tasks.get(task_token)
        if active and active.release_task and not active.release_task.done():
            active.release_task.cancel()
            active.release_task = None
    
    def release_task(self, task_token: str):
        """释放任务回池"""
        active = self._active_tasks.pop(task_token, None)
        if active:
            unlock_task(active.task_id)
            print(f"[TaskManager] 任务已释放: {active.machine_id}_p{active.page_index}")
    
    def skip_task(self, task_token: str, username: str) -> tuple[bool, str]:
        """跳过当前任务"""
        active = self._active_tasks.get(task_token)
        if not active:
            return False, "无效的任务令牌"
        
        if active.username != username:
            return False, "任务不属于当前用户"
        
        # 取消释放计划
        self.cancel_release(task_token)
        
        # 释放任务回池
        self.release_task(task_token)
        
        return True, "已跳过任务"
    
    def submit_task(
        self, 
        task_token: str, 
        rows: list, 
        request_ip: str,
        username: str
    ) -> tuple[bool, str]:
        """提交任务数据"""
        active = self._active_tasks.get(task_token)
        if not active:
            return False, "无效的任务令牌"
        
        if active.username != username:
            return False, "任务不属于当前用户"
        
        # 构建 PDF 路径（包含页码）
        pdf_path = f"work_{active.project_id}/pdf/{active.machine_id}.pdf#page{active.page_index}"
        
        # 写入 Excel
        row_dicts = [row.model_dump() for row in rows]
        
        # 先保存提交记录获取 submission_id
        submission_id = save_submission(
            active.task_id,
            active.project_id,
            active.machine_id,
            active.page_index,
            username,
            json.dumps(row_dicts, ensure_ascii=False)
        )
        
        success = append_to_excel(
            active.project_id,
            submission_id,
            row_dicts,
            pdf_path,
            request_ip,
            username
        )
        
        if not success:
            return False, "数据写入失败"
        
        # 更新补全缓存
        add_rows_to_cache(row_dicts)
        
        # 完成任务
        complete_task(active.task_id)
        increment_contribution(username)
        
        # 清理
        self.cancel_release(task_token)
        del self._active_tasks[task_token]
        
        return True, "提交成功"


# 全局单例
task_manager = TaskManager()
