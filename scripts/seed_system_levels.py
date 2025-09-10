#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量导入“系统关卡”的脚本

用法：
  1) 在项目根目录执行：
     python scripts/seed_system_levels.py

说明：
  - 不依赖管理员登录；直接在数据库写入/更新 puzzles 表记录
  - is_system_level 一律设为 True
  - 难度 difficulty 将根据 形状/网格大小/是否旋转/是否翻转 自动计算为 easy/medium/hard
  - 如果标题(title)已存在，则执行更新（覆盖核心属性），否则执行插入
"""

from datetime import datetime
from typing import Literal, List, Dict, Any
import os, sys

# 确保项目根目录在模块搜索路径中（脚本位于 scripts/ 子目录）
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    # 使用工厂函数创建应用
    from app import create_app
    app = create_app()
except Exception as e:
    raise RuntimeError("无法从 app.py 导入 create_app，请确认存在 `create_app()` 并可用") from e

from extensions import db, puzzles

PieceShape = Literal['rect', 'triangle', 'irregular']
DiffKey = Literal['easy', 'medium', 'hard']


def compute_difficulty_by_settings(grid: int, shape: PieceShape, rot: bool, flip: bool) -> DiffKey:
    """按照编辑器的规则（后端版）估算 difficulty：easy/medium/hard
    评分权重：块数 > 形状 > 旋转/翻转
    - grid: 3/4/5/6/8（表示 NxN）
    - shape: rect(方形)/triangle(三角)/irregular(不规则)
    - rot/flip: 是否允许旋转/翻转
    """
    score = 0
    # 块数
    if grid <= 3:
        score += 1  # 9块
    elif grid == 4:
        score += 2  # 16块
    elif grid == 5:
        score += 3  # 25块
    elif grid == 6:
        score += 4  # 36块
    else:  # grid >= 8
        score += 5  # 64块

    # 形状
    if shape == 'triangle':
        score += 1
    elif shape == 'irregular':
        score += 2

    if rot:
        score += 1
    if flip:
        score += 1

    if score <= 2:
        return 'easy'
    if score <= 4:
        return 'medium'
    return 'hard'


def upsert_system_levels(levels: List[Dict[str, Any]]) -> None:
    """按 title 进行 upsert：存在则更新，不存在则插入。"""
    affected = 0
    for item in levels:
        title: str = item['title']
        image_url: str = item['image_url']
        grid: int = int(item.get('grid', 4))  # 3/4/5/6/8
        shape: PieceShape = item.get('piece_shape', 'rect')  # rect/triangle/irregular
        is_rotatable: bool = bool(item.get('is_rotatable', False))
        is_flipable: bool = bool(item.get('is_flipable', False))
        level_type: str = item.get('type', 'other')  # nature/animal/building/cartoon/other

        # 计算 difficulty（与前端编辑器显示一致，但后端仅支持 easy/medium/hard）
        difficulty: DiffKey = compute_difficulty_by_settings(grid, shape, is_rotatable, is_flipable)
        # piece_count 存总块数
        piece_count: int = grid * grid

        exist = puzzles.query.filter_by(title=title).first()
        if exist:
            exist.image_url = image_url
            exist.difficulty = difficulty
            exist.piece_count = piece_count
            exist.piece_shape = shape
            exist.is_rotatable = is_rotatable
            exist.is_flipable = is_flipable
            exist.is_system_level = True
            exist.type = level_type
            affected += 1
        else:
            db.session.add(puzzles(
                creator_id=1,
                title=title,
                image_url=image_url,
                difficulty=difficulty,
                piece_count=piece_count,
                piece_shape=shape,
                is_rotatable=is_rotatable,
                is_flipable=is_flipable,
                is_system_level=True,
                type=level_type,
                created_at=datetime.utcnow(),
            ))
            affected += 1

    db.session.commit()
    print(f"✅ 导入/更新完成，共 {affected} 条")


def main():
    # 这里配置你要导入的“系统自带关卡”，可自由增减
    # grid: 3/4/5/6/8 表示 NxN；piece_shape: rect/triangle/irregular
    # is_rotatable/is_flipable: 是否允许旋转/翻转
    # type: nature/animal/building/cartoon/other
    seed_levels: List[Dict[str, Any]] = [
        # 自然
        {"title": "湖泊",   "image_url": "/static/images/nature/lake.png",    "grid": 4, "piece_shape": "rect",      "is_rotatable": True,  "is_flipable": False, "type": "nature"},
        {"title": "雪山",   "image_url": "/static/images/nature/snow.png",    "grid": 5, "piece_shape": "rect",      "is_rotatable": True,  "is_flipable": False, "type": "nature"},
        {"title": "山峰",   "image_url": "/static/images/nature/mountain.png","grid": 6, "piece_shape": "rect",      "is_rotatable": True,  "is_flipable": False, "type": "nature"},
        {"title": "海洋",   "image_url": "/static/images/nature/ocean.png",   "grid": 5, "piece_shape": "rect",      "is_rotatable": True,  "is_flipable": False, "type": "nature"},
        {"title": "流星",   "image_url": "/static/images/nature/meteor.png",  "grid": 6, "piece_shape": "triangle",  "is_rotatable": True,  "is_flipable": True,  "type": "nature"},
        {"title": "沙漠",   "image_url": "/static/images/nature/desert.png",  "grid": 5, "piece_shape": "triangle",  "is_rotatable": True,  "is_flipable": False, "type": "nature"},
        {"title": "田野",   "image_url": "/static/images/nature/field.png",   "grid": 4, "piece_shape": "rect",      "is_rotatable": False, "is_flipable": False, "type": "nature"},
        {"title": "山谷",   "image_url": "/static/images/nature/valley.png",  "grid": 5, "piece_shape": "irregular", "is_rotatable": True,  "is_flipable": True,  "type": "nature"},
        {"title": "森林",   "image_url": "/static/images/nature/woods.png",   "grid": 6, "piece_shape": "irregular", "is_rotatable": True,  "is_flipable": False, "type": "nature"},
        # 动物
        {"title": "小鸡",   "image_url": "/static/images/animals/chicken.png","grid": 4, "piece_shape": "rect",      "is_rotatable": False, "is_flipable": False, "type": "animal"},
        {"title": "海豚",   "image_url": "/static/images/animals/dolphin.png","grid": 5, "piece_shape": "rect",      "is_rotatable": True,  "is_flipable": False, "type": "animal"},
        {"title": "皮卡丘", "image_url": "/static/images/animals/pikachu.webp","grid": 6, "piece_shape": "rect",      "is_rotatable": True,  "is_flipable": True,  "type": "animal"},
        {"title": "可达鸭", "image_url": "/static/images/animals/psyduck.webp","grid": 4, "piece_shape": "triangle",  "is_rotatable": False, "is_flipable": True,  "type": "animal"},
        # 建筑
        {"title": "教堂",   "image_url": "/static/images/architecture/church.png", "grid": 4, "piece_shape": "rect",     "is_rotatable": True,  "is_flipable": False, "type": "building"},
        {"title": "花园",   "image_url": "/static/images/architecture/garden.png", "grid": 5, "piece_shape": "triangle", "is_rotatable": True,  "is_flipable": False, "type": "building"},
        {"title": "金字塔", "image_url": "/static/images/architecture/pyramid.png","grid": 6, "piece_shape": "irregular","is_rotatable": True,  "is_flipable": True,  "type": "building"},
        # 卡通
        {"title": "暖暖",   "image_url": "/static/images/cartoon/nikki.png",  "grid": 6, "piece_shape": "rect",      "is_rotatable": True,  "is_flipable": False, "type": "cartoon"},
    ]

    with app.app_context():
        upsert_system_levels(seed_levels)


if __name__ == '__main__':
    main()


