"""
数据库操作模块
"""
import sqlite3
import hashlib
from contextlib import contextmanager
from typing import Optional, Dict, Any
from datetime import datetime

from app.config import DB_PATH, DB_DIR


def init_db():
    """初始化数据库表"""
    # 确保数据库目录存在
    DB_DIR.mkdir(parents=True, exist_ok=True)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 任务表（每页一个任务）
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id TEXT NOT NULL,
                machine_id TEXT NOT NULL,
                page_index INTEGER DEFAULT 0,
                status INTEGER DEFAULT 0,
                locked_by TEXT,
                locked_at DATETIME,
                UNIQUE(project_id, machine_id, page_index)
            )
        """)
        
        # 用户表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                token TEXT,
                contribution INTEGER DEFAULT 0,
                is_admin INTEGER DEFAULT 0
            )
        """)
        
        # 提交记录表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                project_id TEXT NOT NULL,
                machine_id TEXT NOT NULL,
                page_index INTEGER DEFAULT 0,
                username TEXT NOT NULL,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                data TEXT NOT NULL,
                FOREIGN KEY (task_id) REFERENCES tasks(id)
            )
        """)
        
        # 系统配置表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)
        
        conn.commit()


def sync_users_from_file():
    """已废弃，保留兼容"""
    pass


@contextmanager
def get_db():
    """获取数据库连接的上下文管理器"""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ========== 系统初始化相关 ==========

def is_system_initialized() -> bool:
    """检查系统是否已初始化"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM config WHERE key = 'initialized'")
        row = cursor.fetchone()
        return row is not None and row[0] == '1'


def initialize_admin(username: str, password: str) -> bool:
    """初始化管理员账户"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 检查是否已初始化
        cursor.execute("SELECT value FROM config WHERE key = 'initialized'")
        if cursor.fetchone():
            return False
        
        # 创建管理员
        pwd_hash = hashlib.sha256(password.encode()).hexdigest()
        cursor.execute("""
            INSERT INTO users (username, password, contribution, is_admin)
            VALUES (?, ?, 0, 1)
        """, (username, pwd_hash))
        
        # 标记已初始化
        cursor.execute("""
            INSERT INTO config (key, value) VALUES ('initialized', '1')
        """)
        
        conn.commit()
        return True


def create_user(username: str, password: str, is_admin: bool = False) -> bool:
    """创建用户"""
    with get_db() as conn:
        cursor = conn.cursor()
        try:
            pwd_hash = hashlib.sha256(password.encode()).hexdigest()
            cursor.execute("""
                INSERT INTO users (username, password, contribution, is_admin)
                VALUES (?, ?, 0, ?)
            """, (username, pwd_hash, 1 if is_admin else 0))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False


def delete_user(username: str) -> bool:
    """删除用户"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE username = ? AND is_admin = 0", (username,))
        conn.commit()
        return cursor.rowcount > 0


def update_user_password(username: str, new_password: str) -> bool:
    """更新用户密码"""
    with get_db() as conn:
        cursor = conn.cursor()
        pwd_hash = hashlib.sha256(new_password.encode()).hexdigest()
        cursor.execute("UPDATE users SET password = ? WHERE username = ?", (pwd_hash, username))
        conn.commit()
        return cursor.rowcount > 0


def get_user_count() -> int:
    """获取用户数量"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM users")
        return cursor.fetchone()[0]


# ========== 用户相关 ==========

def verify_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """验证用户登录"""
    pwd_hash = hashlib.sha256(password.encode()).hexdigest()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM users WHERE username = ? AND password = ?",
            (username, pwd_hash)
        )
        row = cursor.fetchone()
        return dict(row) if row else None


def update_user_token(username: str, token: str):
    """更新用户Token"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET token = ? WHERE username = ?",
            (token, username)
        )
        conn.commit()


def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
    """通过Token获取用户"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE token = ?", (token,))
        row = cursor.fetchone()
        return dict(row) if row else None


def increment_contribution(username: str):
    """增加用户贡献值"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET contribution = contribution + 1 WHERE username = ?",
            (username,)
        )
        conn.commit()


# ========== 任务相关 ==========

def upsert_task(project_id: str, machine_id: str, page_index: int):
    """插入或更新任务（每页一个任务）"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO tasks (project_id, machine_id, page_index, status)
            VALUES (?, ?, ?, 0)
            ON CONFLICT(project_id, machine_id, page_index) DO NOTHING
        """, (project_id, machine_id, page_index))
        conn.commit()


def get_existing_tasks() -> set:
    """获取数据库中所有任务的key集合"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT project_id, machine_id, page_index FROM tasks")
        return {(row[0], row[1], row[2]) for row in cursor.fetchall()}


def remove_orphan_tasks(valid_tasks: set) -> int:
    """删除不在valid_tasks中且未完成的孤立任务"""
    with get_db() as conn:
        cursor = conn.cursor()
        # 获取所有未完成的任务
        cursor.execute("SELECT id, project_id, machine_id, page_index FROM tasks WHERE status != 2")
        orphans = []
        for row in cursor.fetchall():
            task_key = (row[1], row[2], row[3])
            if task_key not in valid_tasks:
                orphans.append(row[0])
        
        if orphans:
            cursor.execute(f"DELETE FROM tasks WHERE id IN ({','.join('?' * len(orphans))})", orphans)
            conn.commit()
        
        return len(orphans)


def fetch_available_task(timeout_seconds: int = 10, project_id: str = None) -> Optional[Dict[str, Any]]:
    """获取可用任务（未处理或超时的僵尸任务）"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        if project_id:
            cursor.execute("""
                SELECT * FROM tasks 
                WHERE (status = 0 OR (status = 1 AND datetime(locked_at, '+' || ? || ' seconds') < datetime('now')))
                  AND project_id = ?
                ORDER BY RANDOM()
                LIMIT 1
            """, (timeout_seconds, project_id))
        else:
            cursor.execute("""
                SELECT * FROM tasks 
                WHERE status = 0 
                   OR (status = 1 AND datetime(locked_at, '+' || ? || ' seconds') < datetime('now'))
                ORDER BY RANDOM()
                LIMIT 1
            """, (timeout_seconds,))
        
        row = cursor.fetchone()
        return dict(row) if row else None


def get_available_projects() -> list:
    """获取有可用任务的项目列表"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT project_id, COUNT(*) as available_count
            FROM tasks 
            WHERE status = 0
            GROUP BY project_id
            ORDER BY project_id DESC
        """)
        return [dict(row) for row in cursor.fetchall()]


def get_leaderboard(limit: int = 10) -> list:
    """获取贡献排行榜"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT username, contribution
            FROM users
            WHERE contribution > 0
            ORDER BY contribution DESC
            LIMIT ?
        """, (limit,))
        return [dict(row) for row in cursor.fetchall()]


def get_user_locked_task(username: str) -> Optional[Dict[str, Any]]:
    """获取用户当前锁定的任务"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM tasks 
            WHERE status = 1 AND locked_by = ?
            LIMIT 1
        """, (username,))
        row = cursor.fetchone()
        return dict(row) if row else None


def lock_task(task_id: int, username: str) -> bool:
    """锁定任务"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE tasks SET status = 1, locked_by = ?, locked_at = ?
            WHERE id = ?
        """, (username, datetime.now(), task_id))
        conn.commit()
        return cursor.rowcount > 0


def unlock_task(task_id: int):
    """解锁任务（释放回池）"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE tasks SET status = 0, locked_by = NULL, locked_at = NULL
            WHERE id = ?
        """, (task_id,))
        conn.commit()


def complete_task(task_id: int):
    """完成任务"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE tasks SET status = 2 WHERE id = ?", (task_id,))
        conn.commit()


def get_task_by_id(task_id: int) -> Optional[Dict[str, Any]]:
    """通过ID获取任务"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


# ========== 提交记录相关 ==========

def save_submission(task_id: int, project_id: str, machine_id: str, page_index: int, username: str, data: str):
    """保存提交记录"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO submissions (task_id, project_id, machine_id, page_index, username, data)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (task_id, project_id, machine_id, page_index, username, data))
        conn.commit()
        return cursor.lastrowid


def get_user_submissions(username: str, limit: int = 50) -> list:
    """获取用户的提交记录"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, task_id, project_id, machine_id, page_index, submitted_at, data
            FROM submissions
            WHERE username = ?
            ORDER BY submitted_at DESC
            LIMIT ?
        """, (username, limit))
        return [dict(row) for row in cursor.fetchall()]


def get_submission_by_id(submission_id: int, username: str) -> Optional[Dict[str, Any]]:
    """获取单条提交记录（验证用户）"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, task_id, project_id, machine_id, page_index, submitted_at, data
            FROM submissions
            WHERE id = ? AND username = ?
        """, (submission_id, username))
        row = cursor.fetchone()
        return dict(row) if row else None


def update_submission(submission_id: int, username: str, data: str) -> bool:
    """更新提交记录"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE submissions SET data = ?, submitted_at = CURRENT_TIMESTAMP
            WHERE id = ? AND username = ?
        """, (data, submission_id, username))
        conn.commit()
        return cursor.rowcount > 0


# ========== 管理员统计相关 ==========

def get_stats() -> Dict[str, Any]:
    """获取系统统计数据"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 任务统计
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 0")
        pending_tasks = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 1")
        locked_tasks = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 2")
        completed_tasks = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM tasks")
        total_tasks = cursor.fetchone()[0]
        
        # 用户统计
        cursor.execute("SELECT COUNT(*) FROM users")
        total_users = cursor.fetchone()[0]
        
        # 提交统计
        cursor.execute("SELECT COUNT(*) FROM submissions")
        total_submissions = cursor.fetchone()[0]
        
        # 今日提交
        cursor.execute("""
            SELECT COUNT(*) FROM submissions 
            WHERE date(submitted_at) = date('now')
        """)
        today_submissions = cursor.fetchone()[0]
        
        return {
            "tasks": {
                "total": total_tasks,
                "pending": pending_tasks,
                "locked": locked_tasks,
                "completed": completed_tasks
            },
            "users": {
                "total": total_users
            },
            "submissions": {
                "total": total_submissions,
                "today": today_submissions
            }
        }


def get_all_users() -> list:
    """获取所有用户"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT username, contribution, is_admin,
                   (SELECT COUNT(*) FROM submissions WHERE submissions.username = users.username) as submission_count
            FROM users
            ORDER BY contribution DESC
        """)
        return [dict(row) for row in cursor.fetchall()]


def get_locked_tasks() -> list:
    """获取当前锁定中的任务"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, project_id, machine_id, page_index, locked_by, locked_at
            FROM tasks
            WHERE status = 1
            ORDER BY locked_at DESC
        """)
        return [dict(row) for row in cursor.fetchall()]


def get_all_submissions(limit: int = 100, username: str = None, project_id: str = None) -> list:
    """获取所有提交记录（管理员）"""
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT id, task_id, project_id, machine_id, page_index, username, submitted_at, data
            FROM submissions
            WHERE 1=1
        """
        params = []
        
        if username:
            query += " AND username = ?"
            params.append(username)
        
        if project_id:
            query += " AND project_id = ?"
            params.append(project_id)
        
        query += " ORDER BY submitted_at DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def get_project_list() -> list:
    """获取项目列表"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT project_id,
                   COUNT(*) as total_tasks,
                   SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as completed_tasks
            FROM tasks
            GROUP BY project_id
            ORDER BY project_id DESC
        """)
        return [dict(row) for row in cursor.fetchall()]


def force_unlock_task(task_id: int) -> bool:
    """强制解锁任务"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE tasks SET status = 0, locked_by = NULL, locked_at = NULL
            WHERE id = ? AND status = 1
        """, (task_id,))
        conn.commit()
        return cursor.rowcount > 0
