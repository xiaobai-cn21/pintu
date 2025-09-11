
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from extensions import users, puzzles, db, puzzle_progress
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity

pic = Blueprint('pic', __name__)

def allowed_picture_type(filename):
    ALLOWED_EXTENSIONS = {'jpg', 'png'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@pic.route('/puzzles', methods=['POST'])
@jwt_required()
def create_puzzle():
    try:
        data = request.form
        file = request.files.get('image')
        if not file:
            return jsonify({"code": "400", "message": "图片未上传", "data": None})

        if not allowed_picture_type(file.filename):
            return jsonify({"code": "400", "message": "图片格式仅支持 JPG/PNG", "data": None})
        
        file.seek(0, 2)
        file_length = file.tell()
        file.seek(0)
        if file_length > (5 * 1024 * 1024):
            return jsonify({"code":"404", "message":"图片的大小大于5mb", "data": None})
        
        filename = secure_filename(file.filename)
        img_dir = os.path.join(current_app.root_path, 'static', 'uploads')
        os.makedirs(img_dir, exist_ok=True)
        file_path = os.path.join(img_dir, filename)
        file.save(file_path)
        image_url = f'/static/uploads/{filename}'

        creator_id = int(get_jwt_identity())
        user = users.query.get(creator_id)
        if not user:
            return jsonify({"code": "404", "message": "用户不存在", "data": None})
        
        puzzle_title = data.get('title')
        if (len(puzzle_title) < 4 or len(puzzle_title) > 20):
            return jsonify({"code": "404", "message": "拼图标题长度需在5~20个字符之间", "data": None})
        # 检查标题唯一性
        if puzzles.query.filter_by(title=puzzle_title).first():
            return jsonify({"code": "409", "message": "该关卡标题已存在，请更换标题", "data": None})

        puzzle_type = data.get('type', 'other')
        if puzzle_type not in ['nature', 'animal', 'building', 'cartoon', 'other']:
            puzzle_type = 'other'


        # 只有管理员能设置 is_system_level，普通用户强制为 False
        is_admin = getattr(user, 'is_admin', False)
        if is_admin:
            is_system_level = bool(int(data.get('is_system_level', 0)))
        else:
            is_system_level = False

        puzzle = puzzles(
            creator_id=creator_id,
            title=puzzle_title,
            image_url=image_url,
            type=puzzle_type,
            difficulty=data.get('difficulty'),
            piece_count=data.get('piece_count'),
            piece_shape=data.get('piece_shape'),
            is_rotatable=bool(int(data.get('is_rotatable', 0))),
            is_flipable=bool(int(data.get('is_flipable', 0))) if data.get('is_flipable') is not None else False,
            is_system_level=is_system_level,
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
        puzzle.type = data.get('type', puzzle.type)
        puzzle.difficulty = data.get('difficulty', puzzle.difficulty)
        puzzle.piece_count = data.get('piece_count', puzzle.piece_count)
        puzzle.piece_shape = data.get('piece_shape', puzzle.piece_shape)
        puzzle.is_rotatable = bool(int(data.get('is_rotatable', int(puzzle.is_rotatable))))
        puzzle.is_flipable = bool(int(data.get('is_flipable', int(puzzle.is_flipable))))
        puzzle.is_system_level = bool(int(data.get('is_system_level', int(puzzle.is_system_level))))
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
                "type": puzzle.type,
                "difficulty": puzzle.difficulty,
                "piece_count": puzzle.piece_count,
                "piece_shape": puzzle.piece_shape,
                "is_rotatable": puzzle.is_rotatable,
                "is_flipable": puzzle.is_flipable,
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
                "type": puzzle.type,
                "difficulty": puzzle.difficulty,
                "piece_count": puzzle.piece_count,
                "piece_shape": puzzle.piece_shape,
                "is_rotatable": puzzle.is_rotatable,
                "is_flipable": puzzle.is_flipable,
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
    
# 获取所有 is_system_level 为 true 的关卡（包含 puzzles 的所有新属性）
@pic.route('/levels/system', methods=['GET'])
def get_system_levels():
    try:
        puzzles_list = puzzles.query.filter_by(is_system_level=True).order_by(puzzles.created_at.desc()).all()
        result = []
        for puzzle in puzzles_list:
            result.append({
                "puzzle_id": puzzle.puzzle_id,
                "title": puzzle.title,
                "image_url": puzzle.image_url,
                "type": puzzle.type,
                "difficulty": puzzle.difficulty,
                "piece_count": puzzle.piece_count,
                "piece_shape": puzzle.piece_shape,
                "is_rotatable": puzzle.is_rotatable,
                "is_flipable": puzzle.is_flipable,
                "is_system_level": puzzle.is_system_level,
                "created_at": puzzle.created_at
            })
        return jsonify({"code": 200, "message": "获取成功", "data": result})
    except Exception as e:
        return jsonify({"code": 500, "message": f"服务器内部错误: {str(e)}", "data": None})
    

@pic.route('/save_progress', methods=['POST'])
@jwt_required()
def save_progress():
    data = request.json
    user_id = get_jwt_identity()  # 从token获取
    puzzle_id = data.get('puzzle_id', None)
    progress_json = data.get('progress_json', None)

    if not puzzle_id or not progress_json:
        return jsonify({"code": 400, "message": "缺少 puzzle_id 或 progress_json", "data": None})

    record = puzzle_progress.query.filter_by(user_id=user_id, puzzle_id=puzzle_id).first()
    if record:
        record.progress_json = progress_json
    else:
        record = puzzle_progress(user_id=user_id, puzzle_id=puzzle_id, progress_json=progress_json)
        db.session.add(record)
    db.session.commit()
    return jsonify({"code": 200, "message": "保存成功", "data": None})

@pic.route('/get_progress', methods=['GET'])
@jwt_required()
def get_progress():
    user_id = get_jwt_identity()
    puzzle_id = request.args.get('puzzle_id', type=int)
    if not puzzle_id:
        return jsonify({"code": 400, "message": "缺少 puzzle_id", "data": None})

    record = puzzle_progress.query.filter_by(user_id=user_id, puzzle_id=puzzle_id).first()
    if record:
        print(f"Fetched record: id={record.id}, user_id={record.user_id}, puzzle_id={record.puzzle_id}")
        print("progress_json:", record.progress_json)
        return jsonify({"code": 200, "message": "获取成功", "data": record.progress_json})
    else:
        print("No record found for user_id:", user_id, "puzzle_id:", puzzle_id)
        return jsonify({"code": 404, "message": "未找到进度", "data": None})