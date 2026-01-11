"""
WebSocket 心跳保活
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.task_manager import task_manager

router = APIRouter()


@router.websocket("/ws/heartbeat/{task_token}")
async def heartbeat_ws(websocket: WebSocket, task_token: str):
    """任务心跳 WebSocket"""
    # 验证任务令牌
    active = task_manager.get_active_task(task_token)
    if not active:
        await websocket.close(code=4001, reason="无效的任务令牌")
        return
    
    await websocket.accept()
    task_manager.set_ws_connected(task_token, True)
    task_manager.cancel_release(task_token)  # 取消可能存在的释放计划
    
    print(f"[WS] 连接建立: {task_token[:8]}...")
    
    try:
        while True:
            # 等待客户端 ping
            data = await websocket.receive_text()
            if data == "ping":
                task_manager.update_heartbeat(task_token)
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        print(f"[WS] 连接断开: {task_token[:8]}...")
        task_manager.set_ws_connected(task_token, False)
        # 启动 10 秒延迟释放
        await task_manager.schedule_release(task_token)
