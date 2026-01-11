"""
用户认证路由
"""
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models import LoginRequest, LoginResponse
from app.database import (
    verify_user, update_user_token, 
    is_system_initialized, initialize_admin
)

router = APIRouter()


class InitRequest(BaseModel):
    username: str
    password: str


@router.get("/status")
async def system_status():
    """检查系统初始化状态"""
    initialized = is_system_initialized()
    return {"code": 200, "initialized": initialized}


@router.post("/init")
async def init_system(req: InitRequest):
    """初始化系统（创建管理员）"""
    if is_system_initialized():
        raise HTTPException(status_code=400, detail="系统已初始化")
    
    if len(req.username) < 2 or len(req.password) < 3:
        raise HTTPException(status_code=400, detail="用户名至少2位，密码至少3位")
    
    success = initialize_admin(req.username, req.password)
    if not success:
        raise HTTPException(status_code=400, detail="初始化失败")
    
    return {"code": 200, "msg": "初始化成功"}


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """用户登录"""
    user = verify_user(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    
    # 生成新 Token
    token = str(uuid.uuid4())
    update_user_token(req.username, token)
    
    return LoginResponse(
        code=200,
        token=token,
        contribution=user["contribution"],
        is_admin=user.get("is_admin", 0) == 1
    )
