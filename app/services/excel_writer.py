"""
Excel 写入服务（线程安全）
优化：使用 submission_id 作为唯一标识，支持更新和删除
"""
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

import pandas as pd

from app.config import WORK_DIR

# 全局写入锁
_excel_lock = threading.Lock()

# 预定义列顺序
COLUMNS = [
    "submission_id", "pdf_path", "request_ip", "request_time", "username",
    "machine_id", "circuit_name", "area", "device_pos",
    "voltage", "phase_wire", "power", "max_current",
    "run_current", "machine_switch", "factory_switch", "remark"
]


def append_to_excel(
    project_id: str,
    submission_id: int,
    rows: List[Dict[str, Any]],
    pdf_path: str,
    request_ip: str,
    username: str
) -> bool:
    """
    追加数据到 Excel 文件
    每行都带有 submission_id，方便后续更新/删除
    """
    excel_path = WORK_DIR / f"work_{project_id}" / "data.xlsx"
    
    with _excel_lock:
        try:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            records = []
            
            for row in rows:
                record = {
                    "submission_id": submission_id,
                    "pdf_path": pdf_path,
                    "request_ip": request_ip,
                    "request_time": now,
                    "username": username,
                    **row
                }
                records.append(record)
            
            df_new = pd.DataFrame(records)
            
            # 确保列顺序
            all_columns = COLUMNS.copy()
            for col in df_new.columns:
                if col not in all_columns:
                    all_columns.append(col)
            
            for col in all_columns:
                if col not in df_new.columns:
                    df_new[col] = ""
            df_new = df_new[all_columns]
            
            if excel_path.exists():
                with pd.ExcelFile(excel_path) as xls:
                    if "DATA" in xls.sheet_names:
                        df_existing = pd.read_excel(xls, sheet_name="DATA")
                        for col in df_new.columns:
                            if col not in df_existing.columns:
                                df_existing[col] = ""
                        for col in df_existing.columns:
                            if col not in df_new.columns:
                                df_new[col] = ""
                        df_combined = pd.concat([df_existing, df_new], ignore_index=True)
                    else:
                        df_combined = df_new
                
                with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
                    df_combined.to_excel(writer, sheet_name="DATA", index=False)
            else:
                excel_path.parent.mkdir(parents=True, exist_ok=True)
                with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
                    df_new.to_excel(writer, sheet_name="DATA", index=False)
            
            return True
        
        except Exception as e:
            print(f"[ExcelWriter] 写入失败: {e}")
            return False


def update_excel_by_submission_id(
    project_id: str,
    submission_id: int,
    rows: List[Dict[str, Any]],
    pdf_path: str,
    request_ip: str,
    username: str
) -> bool:
    """
    根据 submission_id 更新 Excel 数据
    先删除该 submission_id 的所有旧行，再追加新行
    """
    excel_path = WORK_DIR / f"work_{project_id}" / "data.xlsx"
    
    with _excel_lock:
        try:
            if not excel_path.exists():
                # 文件不存在，直接写入
                return append_to_excel(project_id, submission_id, rows, pdf_path, request_ip, username)
            
            # 读取现有数据
            df = pd.read_excel(excel_path, sheet_name="DATA")
            
            # 确保 submission_id 列存在
            if "submission_id" not in df.columns:
                df["submission_id"] = None
            
            # 删除该 submission_id 的所有旧行
            df = df[df["submission_id"] != submission_id]
            
            # 准备新数据
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            records = []
            for row in rows:
                record = {
                    "submission_id": submission_id,
                    "pdf_path": pdf_path,
                    "request_ip": request_ip,
                    "request_time": now,
                    "username": username,
                    **row
                }
                records.append(record)
            
            df_new = pd.DataFrame(records)
            
            # 合并列
            for col in df_new.columns:
                if col not in df.columns:
                    df[col] = ""
            for col in df.columns:
                if col not in df_new.columns:
                    df_new[col] = ""
            
            df_combined = pd.concat([df, df_new], ignore_index=True)
            
            # 写入
            with pd.ExcelWriter(excel_path, engine="openpyxl", mode="w") as writer:
                df_combined.to_excel(writer, sheet_name="DATA", index=False)
            
            return True
        
        except Exception as e:
            print(f"[ExcelWriter] 更新失败: {e}")
            return False
