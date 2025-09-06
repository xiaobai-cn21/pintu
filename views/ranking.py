from flask import Blueprint, request, jsonify
from extensions import db
from extensions import users
from sqlalchemy import exc

ranking = Blueprint('ranking', __name__)

@ranking.route('/api/record', methods=['POST'])
def update_record():
	data = request.get_json()
	user_id = data.get('user_id')
	step_count = data.get('step_count')
	time_used = data.get('time_used')
	if not (user_id and step_count and time_used):
		return jsonify({'code': 400, 'msg': '参数缺失'}), 400
	from sqlalchemy import text
	sql = text('INSERT INTO records (user_id, step_count, time_used) VALUES (:user_id, :step_count, :time_used) ON DUPLICATE KEY UPDATE step_count=:step_count, time_used=:time_used')
	try:
		db.session.execute(sql, {'user_id': user_id, 'step_count': step_count, 'time_used': time_used})
		db.session.commit()
		return jsonify({'code': 200, 'msg': '记录已更新'}), 200
	except exc.SQLAlchemyError as e:
		db.session.rollback()
		return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500
