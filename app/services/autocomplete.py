"""
自动补全服务
基于历史提交数据提供输入建议
"""
import pandas as pd
from pathlib import Path
from typing import List, Dict, Set
from collections import defaultdict

from app.config import WORK_DIR

# 内存缓存：字段名 -> 历史值集合
_cache: Dict[str, Set[str]] = defaultdict(set)

# 支持补全的字段
AUTOCOMPLETE_FIELDS = [
    "circuit_name", "area", "device_pos", "voltage", 
    "phase_wire", "power", "max_current", "run_current",
    "machine_switch", "factory_switch"
]


def load_history_from_excel():
    """从所有 Excel 文件加载历史数据到缓存"""
    global _cache
    _cache = defaultdict(set)
    
    if not WORK_DIR.exists():
        return
    
    for project_dir in WORK_DIR.iterdir():
        if not project_dir.is_dir():
            continue
        
        excel_path = project_dir / "data.xlsx"
        if not excel_path.exists():
            continue
        
        try:
            df = pd.read_excel(excel_path, sheet_name="DATA")
            for field in AUTOCOMPLETE_FIELDS:
                if field in df.columns:
                    values = df[field].dropna().astype(str).unique()
                    _cache[field].update(v for v in values if v.strip())
        except Exception as e:
            print(f"[Autocomplete] 加载失败 {excel_path}: {e}")
    
    total = sum(len(v) for v in _cache.values())
    print(f"[Autocomplete] 已加载 {total} 条历史记录")


def add_to_cache(field: str, value: str):
    """添加新值到缓存"""
    if field in AUTOCOMPLETE_FIELDS and value and value.strip():
        _cache[field].add(value.strip())


def add_rows_to_cache(rows: List[dict]):
    """批量添加提交的数据到缓存"""
    for row in rows:
        for field in AUTOCOMPLETE_FIELDS:
            if field in row and row[field]:
                add_to_cache(field, str(row[field]))


def get_suggestions(field: str, prefix: str, limit: int = 10) -> List[str]:
    """
    获取补全建议
    :param field: 字段名
    :param prefix: 用户输入的前缀
    :param limit: 返回数量限制
    :return: 匹配的建议列表
    """
    if field not in AUTOCOMPLETE_FIELDS:
        return []
    
    prefix_lower = prefix.lower().strip()
    if not prefix_lower:
        # 无输入时返回最常用的（这里简单返回前N个）
        return sorted(list(_cache[field]))[:limit]
    
    # 前缀匹配 + 包含匹配
    exact_matches = []  # 前缀匹配优先
    contains_matches = []
    
    for value in _cache[field]:
        value_lower = value.lower()
        if value_lower.startswith(prefix_lower):
            exact_matches.append(value)
        elif prefix_lower in value_lower:
            contains_matches.append(value)
    
    # 合并结果，前缀匹配优先
    results = sorted(exact_matches) + sorted(contains_matches)
    return results[:limit]
