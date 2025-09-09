from flask import Blueprint, request, jsonify
from extensions import db
from extensions import users
from sqlalchemy import exc
from sqlalchemy import text
from extensions import users, records
from flask_jwt_extended import jwt_required, get_jwt_identity

ranking = Blueprint('ranking', __name__)

@ranking.route('/record', methods=['POST'])
@jwt_required()
def update_record():
    data = request.get_json()
    user_id = get_jwt_identity()
    step_count = data.get('step_count')
    time_used = data.get('time_used')
    if not (user_id and step_count and time_used):
        return jsonify({'code': 400, 'msg': '参数缺失'}), 400

    # 检查是否已有记录
    check_sql = text('SELECT step_count, time_used FROM records WHERE user_id = :user_id')
    existing = db.session.execute(check_sql, {'user_id': user_id}).fetchone()
    
    if existing:
        # 更新记录
        sql = text('UPDATE records SET step_count = :step_count, time_used = :time_used WHERE user_id = :user_id')
    else:
        # 插入新记录
        sql = text('INSERT INTO records (user_id, step_count, time_used) VALUES (:user_id, :step_count, :time_used)')
    try:
        db.session.execute(sql, {'user_id': user_id, 'step_count': step_count, 'time_used': time_used})
        db.session.commit()
        return jsonify({'code': 200, 'msg': '记录已更新'}), 200
    except exc.SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500

@ranking.route('/', methods=['GET'])
def get_ranking():
    sql = text('''
        SELECT r.user_id, u.username, r.step_count, r.time_used
        FROM records r
        JOIN users u ON r.user_id = u.user_id
        ORDER BY r.time_used DESC, r.step_count ASC
    ''')
    try:
        result = db.session.execute(sql)
        ranking_list = [
            {
                'user_id': row.user_id,
                'username': row.username,
                'step_count': row.step_count,
                'time_used': row.time_used
            }
            for row in result
        ]
        return jsonify({'code': 200, 'msg': '获取成功', 'data': ranking_list}), 200
    except exc.SQLAlchemyError as e:
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500