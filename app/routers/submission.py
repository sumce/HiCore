"""
提交记录路由
"""
import json
from fastapi import APIRouter, HTTPException, Depends, Request

from app.models import (
    SubmissionListResponse, SubmissionItem, 
    SubmissionUpdateRequest, BaseResponse
)
from app.database import get_user_submissions, get_submission_by_id, update_submission
from app.services.scanner import get_task_image
from app.services.excel_writer import update_excel_by_submission_id
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/list", response_model=SubmissionListResponse)
async def list_submissions(user: dict = Depends(get_current_user)):
    """获取当前用户的提交记录"""
    submissions = get_user_submissions(user["username"])
    
    items = []
    for sub in submissions:
        image = get_task_image(sub["project_id"], sub["machine_id"], sub["page_index"])
        items.append(SubmissionItem(
            id=sub["id"],
            task_id=sub["task_id"],
            project_id=sub["project_id"],
            machine_id=sub["machine_id"],
            page_index=sub["page_index"],
            submitted_at=sub["submitted_at"],
            image=image,
            data=json.loads(sub["data"])
        ))
    
    return SubmissionListResponse(code=200, data=items)


@router.get("/{submission_id}")
async def get_submission(submission_id: int, user: dict = Depends(get_current_user)):
    """获取单条提交记录详情"""
    sub = get_submission_by_id(submission_id, user["username"])
    if not sub:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    image = get_task_image(sub["project_id"], sub["machine_id"], sub["page_index"])
    
    return {
        "code": 200,
        "data": SubmissionItem(
            id=sub["id"],
            task_id=sub["task_id"],
            project_id=sub["project_id"],
            machine_id=sub["machine_id"],
            page_index=sub["page_index"],
            submitted_at=sub["submitted_at"],
            image=image,
            data=json.loads(sub["data"])
        )
    }


@router.post("/update", response_model=BaseResponse)
async def update_submission_data(
    req: SubmissionUpdateRequest,
    request: Request,
    user: dict = Depends(get_current_user)
):
    """修改提交记录（不加积分）"""
    sub = get_submission_by_id(req.submission_id, user["username"])
    if not sub:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    row_dicts = [row.model_dump() for row in req.rows]
    new_data = json.dumps(row_dicts, ensure_ascii=False)
    
    # 更新数据库
    success = update_submission(req.submission_id, user["username"], new_data)
    if not success:
        raise HTTPException(status_code=400, detail="更新失败")
    
    # 更新 Excel
    client_ip = request.client.host if request.client else "unknown"
    pdf_path = f"work_{sub['project_id']}/pdf/{sub['machine_id']}.pdf#page{sub['page_index']}"
    
    update_excel_by_submission_id(
        sub["project_id"],
        req.submission_id,
        row_dicts,
        pdf_path,
        client_ip,
        user["username"]
    )
    
    return BaseResponse(code=200, msg="修改成功")
