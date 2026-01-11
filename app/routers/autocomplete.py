"""
自动补全路由
"""
from fastapi import APIRouter, Query
from typing import List

from app.services.autocomplete import get_suggestions, AUTOCOMPLETE_FIELDS

router = APIRouter()


@router.get("/suggest")
async def suggest(
    field: str = Query(..., description="字段名"),
    q: str = Query("", description="用户输入的前缀"),
    limit: int = Query(10, ge=1, le=50, description="返回数量")
) -> dict:
    """
    获取输入建议
    
    支持的字段: circuit_name, area, device_pos, voltage, 
    phase_wire, power, max_current, run_current, machine_switch, factory_switch
    """
    if field not in AUTOCOMPLETE_FIELDS:
        return {
            "code": 400,
            "msg": f"不支持的字段，可用字段: {', '.join(AUTOCOMPLETE_FIELDS)}",
            "data": []
        }
    
    suggestions = get_suggestions(field, q, limit)
    
    return {
        "code": 200,
        "data": suggestions
    }


@router.get("/fields")
async def list_fields() -> dict:
    """获取支持补全的字段列表"""
    return {
        "code": 200,
        "data": AUTOCOMPLETE_FIELDS
    }
