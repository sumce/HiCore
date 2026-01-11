"""
管理员路由
"""
import json
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional

from app.database import (
    get_stats, get_all_users, get_locked_tasks, 
    get_all_submissions, get_project_list, force_unlock_task,
    get_user_by_token, create_user, delete_user, update_user_password
)
from app.services.scanner import get_task_image, scan_and_init_tasks
from app.dependencies import get_current_user

router = APIRouter()


def require_admin(user: dict = Depends(get_current_user)):
    """验证管理员权限"""
    if user.get("is_admin", 0) != 1:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


class CreateUserRequest(BaseModel):
    username: str
    password: str


class UpdatePasswordRequest(BaseModel):
    username: str
    new_password: str


@router.get("/stats")
async def stats(user: dict = Depends(require_admin)):
    """获取系统统计数据"""
    return {"code": 200, "data": get_stats()}


@router.post("/scan")
async def scan_projects(user: dict = Depends(require_admin)):
    """手动扫描work目录，识别新PDF并创建任务"""
    result = scan_and_init_tasks()
    return {
        "code": 200, 
        "data": result,
        "msg": f"扫描完成: {result['scanned']} 个PDF, {result['new_tasks']} 个新任务"
    }


@router.get("/users")
async def list_users(user: dict = Depends(require_admin)):
    """获取所有用户列表"""
    users = get_all_users()
    return {"code": 200, "data": users}


@router.get("/projects")
async def list_projects(user: dict = Depends(require_admin)):
    """获取项目列表"""
    projects = get_project_list()
    return {"code": 200, "data": projects}


@router.get("/locked-tasks")
async def list_locked_tasks(user: dict = Depends(require_admin)):
    """获取当前锁定中的任务"""
    tasks = get_locked_tasks()
    return {"code": 200, "data": tasks}


@router.post("/unlock-task/{task_id}")
async def unlock_task(task_id: int, user: dict = Depends(require_admin)):
    """强制解锁任务"""
    success = force_unlock_task(task_id)
    if not success:
        raise HTTPException(status_code=400, detail="解锁失败，任务可能不存在或未锁定")
    return {"code": 200, "msg": "解锁成功"}


@router.get("/submissions")
async def list_all_submissions(
    limit: int = Query(100, ge=1, le=500),
    username: Optional[str] = None,
    project_id: Optional[str] = None,
    user: dict = Depends(require_admin)
):
    """获取所有提交记录"""
    submissions = get_all_submissions(limit, username, project_id)
    
    items = []
    for sub in submissions:
        image = get_task_image(sub["project_id"], sub["machine_id"], sub["page_index"])
        items.append({
            "id": sub["id"],
            "task_id": sub["task_id"],
            "project_id": sub["project_id"],
            "machine_id": sub["machine_id"],
            "page_index": sub["page_index"],
            "username": sub["username"],
            "submitted_at": sub["submitted_at"],
            "image": image,
            "data": json.loads(sub["data"]),
            "row_count": len(json.loads(sub["data"]))
        })
    
    return {"code": 200, "data": items}


@router.post("/users/create")
async def create_new_user(req: CreateUserRequest, user: dict = Depends(require_admin)):
    """创建新用户"""
    if len(req.username) < 2 or len(req.password) < 3:
        raise HTTPException(status_code=400, detail="用户名至少2位，密码至少3位")
    
    success = create_user(req.username, req.password)
    if not success:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    return {"code": 200, "msg": "创建成功"}


@router.delete("/users/{username}")
async def remove_user(username: str, user: dict = Depends(require_admin)):
    """删除用户"""
    if username == user["username"]:
        raise HTTPException(status_code=400, detail="不能删除自己")
    
    success = delete_user(username)
    if not success:
        raise HTTPException(status_code=400, detail="删除失败，用户不存在或是管理员")
    
    return {"code": 200, "msg": "删除成功"}


@router.post("/users/password")
async def change_password(req: UpdatePasswordRequest, user: dict = Depends(require_admin)):
    """修改用户密码"""
    if len(req.new_password) < 3:
        raise HTTPException(status_code=400, detail="密码至少3位")
    
    success = update_user_password(req.username, req.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="用户不存在")
    
    return {"code": 200, "msg": "密码修改成功"}
