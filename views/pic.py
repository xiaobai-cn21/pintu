from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from extensions import users, puzzles, db
from datetime import datetime

pic = Blueprint('pic', __name__)

@pic.route('/puzzles', methods=['POST'])
def create_puzzle():
    try:
        data = request.form
        file = request.files.get('image')
        if not file:
            return jsonify({"code": "400", "message": "图片未上传", "data": None})

        filename = secure_filename(file.filename)
        img_dir = os.path.join(current_app.root_path, 'static', 'uploads')
        os.makedirs(img_dir, exist_ok=True)
        file_path = os.path.join(img_dir, filename)
        file.save(file_path)
        image_url = f'/static/uploads/{filename}'

        creator_id = data.get('creator_id')
        user = users.query.get(creator_id)
        if not user:
            return jsonify({"code": "404", "message": "用户不存在", "data": None})

        puzzle = puzzles(
            creator_id=creator_id,
            title=data.get('title'),
            image_url=image_url,
            difficulty=data.get('difficulty'),
            piece_count=data.get('piece_count'),
            piece_shape=data.get('piece_shape'),
            is_rotatable=bool(int(data.get('is_rotatable', 0))),
            is_system_level=bool(int(data.get('is_system_level', 0))),
            created_at=datetime.now()
        )
        db.session.add(puzzle)
        db.session.commit()
        return jsonify({"code": "200", "message": "关卡创建成功", "data": {"puzzle_id": puzzle.puzzle_id}})
    except Exception as e:
        return jsonify({"code": "500", "message": f"服务器内部错误: {str(e)}", "data": None})


@pic.route('/puzzles/<int:puzzle_id>', methods=['PUT'])
def update_puzzle(puzzle_id):
    try:
        puzzle = puzzles.query.get(puzzle_id)
        if not puzzle:
            return jsonify({"code": "404", "message": "关卡不存在", "data": None})

        data = request.form
        file = request.files.get('image')
        if file:
            filename = secure_filename(file.filename)
            img_dir = os.path.join(current_app.root_path, 'static', 'uploads')
            os.makedirs(img_dir, exist_ok=True)
            file_path = os.path.join(img_dir, filename)
            file.save(file_path)
            puzzle.image_url = f'/static/uploads/{filename}'

        puzzle.title = data.get('title', puzzle.title)
        puzzle.difficulty = data.get('difficulty', puzzle.difficulty)
        puzzle.piece_count = data.get('piece_count', puzzle.piece_count)
        puzzle.piece_shape = data.get('piece_shape', puzzle.piece_shape)
        puzzle.is_rotatable = bool(int(data.get('is_rotatable', puzzle.is_rotatable)))
        puzzle.is_system_level = bool(int(data.get('is_system_level', puzzle.is_system_level)))
        db.session.commit()
        return jsonify({"code": "200", "message": "关卡更新成功", "data": None})
    except Exception as e:
        return jsonify({"code": "500", "message": f"服务器内部错误: {str(e)}", "data": None})


@pic.route('/puzzles/<int:puzzle_id>', methods=['DELETE'])
def delete_puzzle(puzzle_id):
    try:
        puzzle = puzzles.query.get(puzzle_id)
        if not puzzle:
            return jsonify({"code": "404", "message": "关卡不存在", "data": None})
        db.session.delete(puzzle)
        db.session.commit()
        return jsonify({"code": "200", "message": "关卡删除成功", "data": None})
    except Exception as e:
        return jsonify({"code": "500", "message": f"服务器内部错误: {str(e)}", "data": None})


@pic.route('/puzzles/<int:puzzle_id>', methods=['GET'])
def get_puzzle_detail(puzzle_id):
    try:
        puzzle = puzzles.query.get(puzzle_id)
        if not puzzle:
            return jsonify({"code": "404", "message": "关卡不存在", "data": None})
        creator = users.query.get(puzzle.creator_id)
        return jsonify({
            "code": 200,
            "message": "获取成功",
            "data": {
                "puzzle_id": puzzle.puzzle_id,
                "title": puzzle.title,
                "image_url": puzzle.image_url,
                "difficulty": puzzle.difficulty,
                "piece_count": puzzle.piece_count,
                "piece_shape": puzzle.piece_shape,
                "is_rotatable": puzzle.is_rotatable,
                "is_system_level": puzzle.is_system_level,
                "created_at": puzzle.created_at,
                "creator": {
                    "user_id": creator.user_id,
                    "username": creator.username,
                    "email": creator.email
                } if creator else None
            }
        })
    except Exception as e:
        return jsonify({"code": "500", "message": f"服务器内部错误: {str(e)}", "data": None})


@pic.route('/puzzles', methods=['GET'])
def get_puzzle_list():
    try:
        puzzles_list = puzzles.query.order_by(puzzles.created_at.desc()).all()
        result = []
        for puzzle in puzzles_list:
            result.append({
                "puzzle_id": puzzle.puzzle_id,
                "title": puzzle.title,
                "image_url": puzzle.image_url,
                "difficulty": puzzle.difficulty,
                "piece_count": puzzle.piece_count,
                "piece_shape": puzzle.piece_shape,
                "is_rotatable": puzzle.is_rotatable,
                "is_system_level": puzzle.is_system_level,
                "created_at": puzzle.created_at
            })
        return jsonify({
            "code": 200,
            "message": "获取成功",
            "data": result
        })
    except Exception as e:
        return jsonify({"code": "500", "message": f"服务器内部错误: {str(e)}", "data": None})