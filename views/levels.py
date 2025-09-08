from flask import Blueprint, request, jsonify
from extensions import db
from sqlalchemy import exc, text
from flask_jwt_extended import jwt_required, get_jwt_identity

levels = Blueprint('levels', __name__)

@levels.route('/system-levels', methods=['GET'])
def get_system_levels():
    """获取所有系统关卡信息"""
    sql = text('''
        SELECT level_id, level_name, image_url, difficulty
        FROM level_records 
        WHERE user_id = 0
        ORDER BY 
            CASE 
                WHEN level_id LIKE '%nature%' THEN 1
                WHEN level_id LIKE '%animal%' THEN 2
                WHEN level_id LIKE '%building%' THEN 3
                WHEN level_id LIKE '%cartoon%' THEN 4
                ELSE 5
            END,
            difficulty,
            level_name
    ''')
    
    try:
        result = db.session.execute(sql)
        levels = []
        for row in result:
            # 提取分类信息
            category = 'nature'
            if 'animal' in row.level_id:
                category = 'animal'
            elif 'building' in row.level_id:
                category = 'building'
            elif 'cartoon' in row.level_id:
                category = 'cartoon'
            
            levels.append({
                'level_id': row.level_id,
                'level_name': row.level_name,
                'image_url': row.image_url,
                'difficulty': row.difficulty,
                'category': category,
                'difficulty_text': get_difficulty_text(row.difficulty),
                'difficulty_color': get_difficulty_color(row.difficulty)
            })
        return jsonify({'code': 200, 'msg': '获取成功', 'data': levels}), 200
    except exc.SQLAlchemyError as e:
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500

@levels.route('/records', methods=['GET'])
@jwt_required()
def get_user_level_records():
    """获取用户所有关卡的成绩记录"""
    user_id = get_jwt_identity()
    
    sql = text('''
        SELECT level_id, level_name, image_url, difficulty, 
               best_time, best_steps, completed
        FROM level_records 
        WHERE user_id = :user_id
        ORDER BY difficulty, level_name
    ''')
    
    try:
        result = db.session.execute(sql, {'user_id': user_id})
        records = []
        for row in result:
            records.append({
                'level_id': row.level_id,
                'level_name': row.level_name,
                'image_url': row.image_url,
                'difficulty': row.difficulty,
                'best_time': row.best_time,
                'best_steps': row.best_steps,
                'completed': row.completed,
                'status_text': format_level_status(row.best_time, row.best_steps, row.completed)
            })
        return jsonify({'code': 200, 'msg': '获取成功', 'data': records}), 200
    except exc.SQLAlchemyError as e:
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500

@levels.route('/record', methods=['POST'])
@jwt_required()
def update_level_record():
    """更新关卡成绩记录"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    level_id = data.get('level_id')
    level_name = data.get('level_name')
    image_url = data.get('image_url')
    difficulty = data.get('difficulty')
    time_used = data.get('time_used')  # 秒
    step_count = data.get('step_count')
    
    if not all([level_id, level_name, image_url, difficulty, time_used, step_count]):
        return jsonify({'code': 400, 'msg': '参数缺失'}), 400
    
    # 检查是否已有记录
    check_sql = text('SELECT best_time, best_steps FROM level_records WHERE user_id = :user_id AND level_id = :level_id')
    existing = db.session.execute(check_sql, {'user_id': user_id, 'level_id': level_id}).fetchone()
    
    if existing:
        # 更新记录（只保留最佳成绩）
        best_time = min(existing.best_time or float('inf'), time_used)
        best_steps = min(existing.best_steps or float('inf'), step_count)
        
        update_sql = text('''
            UPDATE level_records 
            SET best_time = :best_time, best_steps = :best_steps, completed = TRUE, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id AND level_id = :level_id
        ''')
        db.session.execute(update_sql, {
            'user_id': user_id, 
            'level_id': level_id, 
            'best_time': best_time, 
            'best_steps': best_steps
        })
    else:
        # 插入新记录
        insert_sql = text('''
            INSERT INTO level_records (user_id, level_id, level_name, image_url, difficulty, best_time, best_steps, completed)
            VALUES (:user_id, :level_id, :level_name, :image_url, :difficulty, :time_used, :step_count, TRUE)
        ''')
        db.session.execute(insert_sql, {
            'user_id': user_id,
            'level_id': level_id,
            'level_name': level_name,
            'image_url': image_url,
            'difficulty': difficulty,
            'time_used': time_used,
            'step_count': step_count
        })
    
    try:
        db.session.commit()
        return jsonify({'code': 200, 'msg': '成绩记录已更新'}), 200
    except exc.SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500

@levels.route('/saves', methods=['GET'])
@jwt_required()
def get_user_saves():
    """获取用户游戏存档"""
    user_id = get_jwt_identity()
    
    sql = text('''
        SELECT save_id, level_id, level_name, image_url, difficulty, 
               current_time, current_steps, save_time
        FROM game_saves 
        WHERE user_id = :user_id
        ORDER BY save_time DESC
    ''')
    
    try:
        result = db.session.execute(sql, {'user_id': user_id})
        saves = []
        for row in result:
            saves.append({
                'save_id': row.save_id,
                'level_id': row.level_id,
                'level_name': row.level_name,
                'image_url': row.image_url,
                'difficulty': row.difficulty,
                'current_time': row.current_time,
                'current_steps': row.current_steps,
                'save_time': row.save_time.strftime('%Y-%m-%d %H:%M') if row.save_time else None,
                'time_text': format_time(row.current_time),
                'steps_text': f"{row.current_steps}步"
            })
        return jsonify({'code': 200, 'msg': '获取成功', 'data': saves}), 200
    except exc.SQLAlchemyError as e:
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500

@levels.route('/save', methods=['POST'])
@jwt_required()
def save_game():
    """保存游戏进度"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    level_id = data.get('level_id')
    level_name = data.get('level_name')
    image_url = data.get('image_url')
    difficulty = data.get('difficulty')
    current_time = data.get('current_time')
    current_steps = data.get('current_steps')
    puzzle_state = data.get('puzzle_state', '')
    
    if not all([level_id, level_name, image_url, difficulty, current_time, current_steps]):
        return jsonify({'code': 400, 'msg': '参数缺失'}), 400
    
    sql = text('''
        INSERT INTO game_saves (user_id, level_id, level_name, image_url, difficulty, current_time, current_steps, puzzle_state)
        VALUES (:user_id, :level_id, :level_name, :image_url, :difficulty, :current_time, :current_steps, :puzzle_state)
    ''')
    
    try:
        db.session.execute(sql, {
            'user_id': user_id,
            'level_id': level_id,
            'level_name': level_name,
            'image_url': image_url,
            'difficulty': difficulty,
            'current_time': current_time,
            'current_steps': current_steps,
            'puzzle_state': puzzle_state
        })
        db.session.commit()
        return jsonify({'code': 200, 'msg': '游戏已保存'}), 200
    except exc.SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500

@levels.route('/save/<int:save_id>', methods=['DELETE'])
@jwt_required()
def delete_save(save_id):
    """删除游戏存档"""
    user_id = get_jwt_identity()
    
    sql = text('DELETE FROM game_saves WHERE save_id = :save_id AND user_id = :user_id')
    
    try:
        result = db.session.execute(sql, {'save_id': save_id, 'user_id': user_id})
        db.session.commit()
        
        if result.rowcount > 0:
            return jsonify({'code': 200, 'msg': '存档已删除'}), 200
        else:
            return jsonify({'code': 404, 'msg': '存档不存在'}), 404
    except exc.SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'code': 500, 'msg': '数据库错误', 'error': str(e)}), 500

def format_level_status(best_time, best_steps, completed):
    """格式化关卡状态文本"""
    if not completed:
        return "未挑战该难度"
    
    if best_time and best_steps:
        time_text = format_time(best_time)
        return f"你的最佳成绩：{time_text} | {best_steps}步"
    elif best_time:
        time_text = format_time(best_time)
        return f"你的最佳成绩：{time_text}"
    elif best_steps:
        return f"你的最佳成绩：{best_steps}步"
    else:
        return "已完成"

def format_time(seconds):
    """格式化时间显示"""
    if not seconds:
        return "00:00"
    
    minutes = seconds // 60
    seconds = seconds % 60
    return f"{minutes:02d}:{seconds:02d}"

def get_difficulty_text(difficulty):
    """获取难度文本"""
    difficulty_map = {
        3: '简单',
        4: '中等', 
        5: '困难'
    }
    return difficulty_map.get(difficulty, '未知')

def get_difficulty_color(difficulty):
    """获取难度颜色"""
    color_map = {
        3: '#52C41A',  # 绿色
        4: '#FAAD14',  # 橙色
        5: '#FF4D4F'   # 红色
    }
    return color_map.get(difficulty, '#666666')
