"""
机台数据人工采集系统 - 主入口
"""
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from app.database import init_db
from app.routers import auth, task, autocomplete, submission, admin
from app.services.scanner import scan_and_init_tasks
from app.services.autocomplete import load_history_from_excel
from app.websocket import heartbeat


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化
    init_db()
    scan_and_init_tasks()
    load_history_from_excel()
    yield
    # 关闭时清理（如需要）


app = FastAPI(
    title="机台数据采集系统",
    version="2.0",
    lifespan=lifespan
)

# CORS 跨域配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由（必须在前端 fallback 之前）
app.include_router(auth.router, prefix="/api/v1/auth", tags=["认证"])
app.include_router(task.router, prefix="/api/v1/task", tags=["任务"])
app.include_router(submission.router, prefix="/api/v1/submission", tags=["提交记录"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["管理"])
app.include_router(autocomplete.router, prefix="/api/v1/autocomplete", tags=["自动补全"])
app.include_router(heartbeat.router, tags=["WebSocket"])

# 静态文件服务
app.mount("/static", StaticFiles(directory="work"), name="static")

# 前端静态文件（生产模式）
WEB_DIST = Path(__file__).parent / "web" / "dist"
if WEB_DIST.exists():
    app.mount("/assets", StaticFiles(directory=WEB_DIST / "assets"), name="assets")
    
    @app.get("/")
    async def serve_frontend():
        return FileResponse(WEB_DIST / "index.html")
    
    @app.get("/{path:path}")
    async def serve_frontend_fallback(path: str):
        file_path = WEB_DIST / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(WEB_DIST / "index.html")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
