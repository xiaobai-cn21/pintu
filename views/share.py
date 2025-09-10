from flask import Blueprint, request, jsonify
from extensions import db, shares, users, puzzles
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity
import random

# 创建蓝图
share_bp = Blueprint('share', __name__)


@share_bp.route('/shares', methods=['POST'])
@jwt_required()
def create_share():
    """创建分享记录"""
    data = request.get_json()
    user_id = get_jwt_identity()  # 从JWT token获取用户ID
    puzzle_id = data.get('puzzle_id')

    # 验证参数
    if not puzzle_id:
        return jsonify({"code": "400", "message": "拼图ID不能为空", "data": None}), 400

    # 验证用户和拼图是否存在
    user = users.query.get(user_id)
    puzzle = puzzles.query.get(puzzle_id)
    if not user:
        return jsonify({"code": "404", "message": "用户不存在", "data": None}), 404
    if not puzzle:
        return jsonify({"code": "404", "message": "拼图不存在", "data": None}), 404
    
    # 生成6位唯一数字分享码
    while True:
        share_code = ''.join(random.choices('0123456789', k=6))
        if not shares.query.filter_by(share_code=share_code).first():
            break
    
    # 创建分享记录
    new_share = shares(
        user_id=user_id,
        puzzle_id=puzzle_id,
        share_code=share_code,
        view_count=0,
        created_at=datetime.utcnow()
    )
    db.session.add(new_share)
    db.session.commit()

    return jsonify({
        "code": "200",
        "message": "分享成功",
        "data": {
            "share_code": share_code,
            "share_id": new_share.share_id
        }
    }), 201


@share_bp.route('/shares', methods=['GET'])
def get_shares():
    """获取分享列表（支持筛选）"""
    # 支持按用户ID或拼图ID筛选
    user_id = request.args.get('user_id')
    puzzle_id = request.args.get('puzzle_id')

    query = shares.query

    if user_id:
        query = query.filter_by(user_id=user_id)
    if puzzle_id:
        query = query.filter_by(puzzle_id=puzzle_id)

    # 按创建时间倒序排列
    share_list = query.order_by(shares.created_at.desc()).all()

    result = []
    for share in share_list:
        puzzle = puzzles.query.get(share.puzzle_id)
        creator = users.query.get(share.user_id)
        if puzzle and creator:
            result.append({
                "id": share.share_id,
                "share_code": share.share_code,
                "title": puzzle.title,
                "imageUrl": puzzle.image_url,
                "creator": creator.username,
                "difficulty": puzzle.difficulty,
                "size": f"{puzzle.piece_count}x{puzzle.piece_count}",
                "puzzleId": puzzle.puzzle_id
            })

    return jsonify(result), 200


@share_bp.route('/shares/<int:share_id>', methods=['GET'])
def get_share(share_id):
    """获取单个分享详情"""
    share = shares.query.get(share_id)
    if not share:
        return jsonify({"error": "分享记录不存在"}), 404

    return jsonify({
        "share_id": share.share_id,
        "user_id": share.user_id,
        "puzzle_id": share.puzzle_id,
        "view_count": share.view_count,
        "created_at": share.created_at.isoformat()
    }), 200


@share_bp.route('/shares/<int:share_id>/view', methods=['PUT'])
def increment_view(share_id):
    """增加分享浏览量"""
    share = shares.query.get(share_id)
    if not share:
        return jsonify({"error": "分享记录不存在"}), 404

    share.view_count += 1
    db.session.commit()

    return jsonify({
        "message": "浏览量已更新",
        "view_count": share.view_count
    }), 200


@share_bp.route('/shares/<int:share_id>', methods=['DELETE'])
def delete_share(share_id):
    """删除分享记录"""
    share = shares.query.get(share_id)
    if not share:
        return jsonify({"error": "分享记录不存在"}), 404

    db.session.delete(share)
    db.session.commit()

    return jsonify({"message": "分享记录已删除"}), 200