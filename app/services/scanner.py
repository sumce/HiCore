"""
PDF 扫描与图片转换服务
"""
import os
from pathlib import Path
from pdf2image import convert_from_path

from app.config import WORK_DIR, POPPLER_PATH
from app.database import upsert_task, get_existing_tasks, remove_orphan_tasks


def scan_and_init_tasks() -> dict:
    """
    扫描 work 目录，初始化任务并转换 PDF（每页一个任务）
    返回扫描结果统计
    """
    result = {"scanned": 0, "new_tasks": 0, "projects": []}
    
    if not WORK_DIR.exists():
        WORK_DIR.mkdir(parents=True)
        print("[Scanner] work 目录为空，已创建")
        return result
    
    # 获取数据库中已有的任务
    existing_tasks = get_existing_tasks()
    found_tasks = set()
    
    for project_dir in WORK_DIR.iterdir():
        if not project_dir.is_dir() or not project_dir.name.startswith("work_"):
            continue
        
        project_id = project_dir.name.replace("work_", "")
        pdf_dir = project_dir / "pdf"
        tmp_dir = project_dir / "tmp"
        
        if not pdf_dir.exists():
            continue
        
        pdf_files = list(pdf_dir.glob("*.pdf"))
        if not pdf_files:
            continue
            
        tmp_dir.mkdir(exist_ok=True)
        project_tasks = 0
        
        for pdf_file in pdf_files:
            machine_id = pdf_file.stem
            result["scanned"] += 1
            
            images = convert_pdf_to_images(pdf_file, tmp_dir, machine_id)
            
            for page_index in range(len(images)):
                task_key = (project_id, machine_id, page_index)
                found_tasks.add(task_key)
                
                # 只有新任务才插入
                if task_key not in existing_tasks:
                    upsert_task(project_id, machine_id, page_index)
                    result["new_tasks"] += 1
                    project_tasks += 1
            
            if images:
                print(f"[Scanner] 已处理: {project_id}/{machine_id}, 共 {len(images)} 页")
        
        if project_tasks > 0 or pdf_files:
            result["projects"].append(project_id)
    
    # 清理孤立任务（PDF已删除但数据库还有记录）
    orphan_count = remove_orphan_tasks(found_tasks)
    if orphan_count > 0:
        print(f"[Scanner] 已清理 {orphan_count} 个孤立任务")
    
    print(f"[Scanner] 扫描完成: {result['scanned']} 个PDF, {result['new_tasks']} 个新任务")
    return result


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
