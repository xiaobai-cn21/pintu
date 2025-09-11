from flask import Blueprint, request, jsonify
from extensions import db, users, rank_records, puzzles
from sqlalchemy import exc
from sqlalchemy import text
from flask_jwt_extended import jwt_required, get_jwt_identity

ranking = Blueprint('ranking', __name__)

@ranking.route('/record', methods=['POST'])
@jwt_required()
def update_record():
    data = request.get_json()
    # 1. 从JWT获取用户ID（字符串类型），并统一转换为整数
    user_id_str = get_jwt_identity()  # 明确命名为字符串类型，便于区分
    user_id = None
    
    # 核心修改：安全处理JWT中的字符串类型user_id，转为整数
    try:
        # 先判断是否为空（避免空字符串转换报错）
        if not user_id_str:
            raise ValueError("用户ID为空")
        # 将字符串类型的user_id转为整数（适配JWT存储的字符串格式）
        user_id = int(user_id_str)
        # 额外校验：确保用户ID为正整数（符合数据库设计）
        if user_id <= 0:
            raise ValueError("用户ID必须为正整数")
    except ValueError as e:
        # 捕获所有类型转换或值非法的错误，统一返回401
        return jsonify({'code': 401, 'msg': f'用户身份无效：{str(e)}'}), 401

    # 2. 校验 step_count 和 time_used 是有效数字（大于0）
    try:
        step_count = int(data.get('step_count', 0))
        time_used = int(data.get('time_used', 0))
        if step_count <= 0 or time_used <= 0:
            return jsonify({'code': 400, 'msg': '步数和时长必须为正整数'}), 400
    except (ValueError, TypeError):
        return jsonify({'code': 400, 'msg': '步数和时长必须为有效数字'}), 400

    # 3. 获取并校验 level_id（保持原有逻辑，确保为正整数）
    try:
        level_id = int(data.get('level_id', 0))
        if level_id <= 0:
            return jsonify({'code': 400, 'msg': '关卡ID必须为正整数'}), 400
    except (ValueError, TypeError):
        return jsonify({'code': 400, 'msg': '关卡ID必须为有效数字'}), 400

    # 4. 检查该用户在该关卡是否已有记录（根据user_id和level_id联合查询）
    check_sql = text('''
        SELECT step_count, time_used 
        FROM rank_records 
        WHERE user_id = :user_id AND level_id = :level_id
    ''')
    existing = db.session.execute(
        check_sql, 
        {'user_id': user_id, 'level_id': level_id}  # 此时user_id已确保为整数
    ).fetchone()
    
    # 5. 只保留最佳成绩（步数更少或时间更短）
    if existing:
        # 比较当前成绩与已有成绩，仅在更优时更新
        current_better = (step_count < existing.step_count) or \
                        (step_count == existing.step_count and time_used < existing.time_used)
        
        if not current_better:
            return jsonify({'code': 200, 'msg': '已有更优成绩，无需更新'}), 200
        
        # 更新记录（仅当新成绩更优）
        sql = text('''
            UPDATE rank_records 
            SET step_count = :step_count, time_used = :time_used 
            WHERE user_id = :user_id AND level_id = :level_id
        ''')
    else:
        # 插入新记录
        sql = text('''
            INSERT INTO rank_records (user_id, level_id, step_count, time_used) 
            VALUES (:user_id, :level_id, :step_count, :time_used)
        ''')
    
    try:
        db.session.execute(
            sql, 
            {
                'user_id': user_id,  # 整数类型，与数据库字段匹配
                'level_id': level_id,
                'step_count': step_count, 
                'time_used': time_used
            }
        )
        db.session.commit()
        return jsonify({'code': 200, 'msg': '记录已更新'}), 200
    except exc.SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500

@ranking.route('/', methods=['GET'])
def get_ranking():
    sql = text('''
        SELECT 
            r.user_id, 
            u.username, 
            SUM(r.step_count) as step_count,  # 保留原字段名：总步数
            SUM(r.time_used) as time_used,    # 保留原字段名：总用时
            COUNT(DISTINCT r.level_id) as passed_levels  # 通过关卡数
        FROM rank_records r
        JOIN users u ON r.user_id = u.user_id
        GROUP BY r.user_id, u.username  # 按用户分组统计
        ORDER BY 
            passed_levels DESC,  # 按通过关卡数降序（主要条件）
            time_used ASC,       # 按总用时升序（次要条件）
            step_count ASC       # 按总步数升序（次要条件）
    ''')
    try:
        result = db.session.execute(sql)
        ranking_list = [
            {
                'user_id': row.user_id,  # 数据库返回整数，直接使用
                'username': row.username,
                'step_count': row.step_count,  # 保持原字段名
                'time_used': row.time_used,    # 保持原字段名
                'passed_levels': row.passed_levels
            }
            for row in result
        ]
        return jsonify({
            'code': 200, 
            'msg': '获取成功', 
            'data': ranking_list
        }), 200
    except exc.SQLAlchemyError as e:
        return jsonify({
            'code': 500, 
            'msg': '数据库错误', 
            'error': str(e)
        }), 500

@ranking.route('/by-level/<int:level_id>', methods=['GET'])
def get_ranking_by_level(level_id):
    """根据关卡ID获取该关卡的排名数据"""
    try:
        # 查询关卡信息确认存在
        puzzle = puzzles.query.get(level_id)
        if not puzzle:
            return jsonify({'code': 404, 'msg': '关卡不存在'}), 404
        
        # 从records表查询该关卡的排名数据（不再依赖level_records表）
        sql = text('''
            SELECT r.user_id, u.username, r.time_used, r.step_count
            FROM rank_records r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.level_id = :level_id
            ORDER BY r.time_used ASC, r.step_count ASC
            LIMIT 10
        ''')
        
        result = db.session.execute(sql, {'level_id': level_id})
        ranking_list = []
        rank = 1
        
        for row in result:
            ranking_list.append({
                'rank': rank,
                'user_id': row.user_id,  # 数据库返回整数，直接使用
                'username': row.username,
                'totalTime': row.time_used,
                'totalSteps': row.step_count
            })
            rank += 1
        
        return jsonify({'code': 200, 'msg': '获取成功', 'data': ranking_list}), 200
    except exc.SQLAlchemyError as e:
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500

@ranking.route('/level-info/<int:level_id>', methods=['GET'])
def get_level_info(level_id):
    """根据关卡ID获取关卡信息，包括名称、难度、拼图块数"""
    try:
        puzzle = puzzles.query.get(level_id)
        if not puzzle:
            return jsonify({'code': 404, 'msg': '关卡不存在'}), 404
        
        level_info = {
            'level_id': puzzle.puzzle_id,  # 数据库返回整数，直接使用
            'level_name': puzzle.title,
            'difficulty': puzzle.difficulty,
            'piece_count': puzzle.piece_count
        }
        
        return jsonify({'code': 200, 'msg': '获取成功', 'data': level_info}), 200
    except exc.SQLAlchemyError as e:
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500