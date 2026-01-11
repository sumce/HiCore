"""
FastAPI 依赖项
"""
from fastapi import Header, HTTPException

from app.database import get_user_by_token


async def get_current_user(authorization: str = Header(...)) -> dict:
    """从 Header 获取当前用户"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="无效的认证格式")
    
    token = authorization.replace("Bearer ", "")
    user = get_user_by_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="无效的Token")
    
    return user
