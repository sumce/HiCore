"""
PDF 扫描与图片转换服务
"""
import os
from pathlib import Path
from pdf2image import convert_from_path

from app.config import WORK_DIR, POPPLER_PATH
from app.database import upsert_task


def scan_and_init_tasks():
    """扫描 work 目录，初始化任务并转换 PDF（每页一个任务）"""
    if not WORK_DIR.exists():
        WORK_DIR.mkdir(parents=True)
        return
    
    for project_dir in WORK_DIR.iterdir():
        if not project_dir.is_dir() or not project_dir.name.startswith("work_"):
            continue
        
        project_id = project_dir.name.replace("work_", "")
        pdf_dir = project_dir / "pdf"
        tmp_dir = project_dir / "tmp"
        
        if not pdf_dir.exists():
            continue
        
        tmp_dir.mkdir(exist_ok=True)
        
        for pdf_file in pdf_dir.glob("*.pdf"):
            machine_id = pdf_file.stem
            images = convert_pdf_to_images(pdf_file, tmp_dir, machine_id)
            # 每页创建一个任务
            for page_index in range(len(images)):
                upsert_task(project_id, machine_id, page_index)
            print(f"[Scanner] 已注册任务: {project_id}/{machine_id}, 共 {len(images)} 页")


def convert_pdf_to_images(pdf_path: Path, tmp_dir: Path, machine_id: str) -> list:
    """
    将 PDF 转换为图片
    返回生成的图片路径列表
    """
    # 检查是否已有缓存
    existing = list(tmp_dir.glob(f"{machine_id}_*.png"))
    if existing:
        return sorted(existing)
    
    try:
        # Windows 需要指定 poppler 路径，Linux 使用系统安装的
        poppler_path = str(POPPLER_PATH) if POPPLER_PATH and POPPLER_PATH.exists() else None
        
        images = convert_from_path(
            str(pdf_path),
            poppler_path=poppler_path,
            dpi=150
        )
        
        output_paths = []
        for i, image in enumerate(images):
            output_path = tmp_dir / f"{machine_id}_{i}.png"
            image.save(str(output_path), "PNG")
            output_paths.append(output_path)
        
        return output_paths
    
    except Exception as e:
        print(f"[Scanner] PDF转换失败 {pdf_path}: {e}")
        return []


def get_task_image(project_id: str, machine_id: str, page_index: int) -> str:
    """获取任务对应的单张图片URL"""
    return f"/static/work_{project_id}/tmp/{machine_id}_{page_index}.png"
