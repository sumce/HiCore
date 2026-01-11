"""
Pydantic 数据模型
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    code: int = 200
    token: str
    contribution: int
    is_admin: bool = False


class TaskData(BaseModel):
    task_token: str
    project_id: str
    machine_id: str
    page_index: int
    image: str


class TaskFetchResponse(BaseModel):
    code: int = 200
    data: Optional[TaskData] = None
    msg: str


class RowData(BaseModel):
    machine_id: str = Field(..., description="机台ID，必填")
    circuit_name: str = Field(..., description="回路名称，必填")
    area: Optional[str] = None
    device_pos: Optional[str] = None
    voltage: Optional[str] = None
    phase_wire: Optional[str] = None
    power: Optional[str] = None
    max_current: Optional[str] = None
    run_current: Optional[str] = None
    machine_switch: Optional[str] = None
    factory_switch: Optional[str] = None
    remark: Optional[str] = None


class SubmitRequest(BaseModel):
    task_token: str
    rows: List[RowData]


class BaseResponse(BaseModel):
    code: int = 200
    msg: str = "success"


class SubmissionItem(BaseModel):
    id: int
    task_id: int
    project_id: str
    machine_id: str
    page_index: int
    submitted_at: str
    image: str
    data: List[dict]


class SubmissionListResponse(BaseModel):
    code: int = 200
    data: List[SubmissionItem]


class SubmissionUpdateRequest(BaseModel):
    submission_id: int
    rows: List[RowData]
