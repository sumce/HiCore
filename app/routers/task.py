"""
任务管理路由
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from app.models import TaskFetchResponse, TaskData, SubmitRequest, BaseResponse
from app.services.task_manager import task_manager
from app.dependencies import get_current_user

router = APIRouter()


class SkipRequest(BaseModel):
    task_token: str


@router.get("/projects")
async def get_projects(user: dict = Depends(get_current_user)):
    """获取有可用任务的项目列表"""
    projects = task_manager.get_available_projects()
    return {"code": 200, "data": projects}


@router.get("/leaderboard")
async def get_leaderboard(limit: int = 10, user: dict = Depends(get_current_user)):
    """获取贡献排行榜"""
    leaderboard = task_manager.get_leaderboard(limit)
    return {"code": 200, "data": leaderboard}


@router.get("/fetch", response_model=TaskFetchResponse)
async def fetch_task(
    project_id: str = None,
    user: dict = Depends(get_current_user)
):
    """获取/抽取一个任务"""
    result = task_manager.fetch_task(user["username"], project_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="暂无可用任务")
    
    return TaskFetchResponse(
        code=200,
        data=TaskData(**result),
        msg="获取成功，请在10秒内建立WebSocket连接"
    )


@router.post("/skip", response_model=BaseResponse)
async def skip_task(req: SkipRequest, user: dict = Depends(get_current_user)):
    """跳过当前任务"""
    success, msg = task_manager.skip_task(req.task_token, user["username"])
    
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    
    return BaseResponse(code=200, msg=msg)


@router.post("/submit", response_model=BaseResponse)
async def submit_task(
    req: SubmitRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """提交作业"""
    # 获取客户端 IP
    client_ip = request.client.host if request.client else "unknown"
    
    success, msg = task_manager.submit_task(
        req.task_token,
        req.rows,
        client_ip,
        user["username"]
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    
    return BaseResponse(code=200, msg=msg)
