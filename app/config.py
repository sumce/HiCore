"""
配置文件
"""
import platform
from pathlib import Path

# 路径配置
BASE_DIR = Path(__file__).parent.parent
WORK_DIR = BASE_DIR / "work"
DB_PATH = BASE_DIR / "database.db"

# Poppler 路径
if platform.system() == "Windows":
    POPPLER_PATH = BASE_DIR / "poppler" / "Library" / "bin"
else:
    # Linux: 使用系统安装的 poppler (apt install poppler-utils)
    POPPLER_PATH = None

# 任务配置
HEARTBEAT_TIMEOUT = 10  # 心跳超时秒数
HEARTBEAT_INTERVAL = 5  # 心跳间隔秒数

# Token 配置
TOKEN_SECRET = "your-secret-key-change-in-production"
