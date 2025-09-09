from flask import Blueprint, request, jsonify, render_template
from flask_socketio import emit, join_room, leave_room
import random, os
from werkzeug.utils import secure_filename
import base64

pvp = Blueprint('pvp', __name__)

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# 房间结构：{room_id: {"users": [...], "image": "filename"}}
room_pool = {}
user_sid_map = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_room_id():
    while True:
        room_id = str(random.randint(1000, 9999))
        if room_id not in room_pool:
            return room_id

def register_socketio_events(socketio):
    @socketio.on('create_room')
    def create_room(data):
        username = data.get('username')
        image = data.get('image')  # 这里仅用于兼容socketio，不实际用
        if not username:
            emit('error', {'code': 400, 'msg': '用户名不能为空', 'data': None})
            return
        # 这里socketio方式不支持图片上传，图片上传请用HTTP POST
        emit('error', {'code': 400, 'msg': '请通过表单上传图片创建房间', 'data': None})

    @socketio.on('join_room')
    def join_existing_room(data):
        room_id = data.get('room_id')
        username = data.get('username')
        if not room_id or not username:
            emit('error', {'code': 400, 'msg': '房间号和用户名不能为空', 'data': None})
            return
        if room_id not in room_pool:
            emit('error', {'code': 404, 'msg': '房间不存在', 'data': None})
            return
        join_room(room_id)
        # Prevent duplicate usernames in the same room
        if username not in room_pool[room_id]["users"]:
            room_pool[room_id]["users"].append(username)
        user_sid_map[request.sid] = {'username': username, 'room_id': room_id}

        image = room_pool[room_id].get("image")
        config = room_pool[room_id].get("config", {})
        if len(room_pool[room_id]["users"]) == 2:
            emit('start', {'code': 200, 'msg': '房间已满，可以开始', 'data': {'room_id': room_id, 'image': image, 'config': config}}, room=room_id)
        else:
            emit('waiting', {'code': 200, 'msg': '等待其他玩家加入', 'data': {'room_id': room_id, 'image': image, 'config': config}}, to=request.sid)
        emit('joined', {'code': 200, 'msg': '加入房间成功', 'data': {'room_id': room_id, 'username': username, 'image': image, 'config': config}}, to=request.sid)

        
    @socketio.on('disconnect')
    def handle_disconnect():
        info = user_sid_map.get(request.sid)
        if info:
            room_id = info['room_id']
            username = info['username']
            leave_room(room_id)
            if room_id in room_pool and username in room_pool[room_id]["users"]:
                room_pool[room_id]["users"].remove(username)
                #if not room_pool[room_id]["users"]:
                #   del room_pool[room_id]
            emit('left', {'code': 200, 'msg': '用户已断开并离开房间', 'data': {'room_id': room_id, 'username': username}}, room=room_id)
            user_sid_map.pop(request.sid, None)

    @socketio.on('leave_room')
    def leave_existing_room(data):
        room_id = data.get('room_id')
        username = data.get('username')
        if not room_id or not username:
            emit('error', {'msg': '房间号和用户名不能为空', 'data': None})
            return
        leave_room(room_id)
        if room_id in room_pool and username in room_pool[room_id]["users"]:
            room_pool[room_id]["users"].remove(username)
            if not room_pool[room_id]["users"]:
                del room_pool[room_id]
        emit('left', {'code': 200, 'msg': '离开房间成功', 'data': {'room_id': room_id, 'username': username}}, room=room_id)
        for sid, info in list(user_sid_map.items()):
            if info['username'] == username and info['room_id'] == room_id:
                user_sid_map.pop(sid, None)

    @socketio.on('challenge')
    def challenge(data):
        room_id = data.get('room_id')
        emit('lose', {}, room=room_id, include_self=False)
        emit('win', {}, to=request.sid)

    @socketio.on('send_message')
    def handle_send_message(data):
        room_id = data.get('room_id')
        message = data.get('message')
        username = data.get('username')
        if not room_id or not username or not message:
            emit('error', {'msg': '消息参数不完整', 'data': None})
            return
        emit('receive_message', {
            'room_id': room_id,
            'username': username,
            'message': message
        }, room=room_id)

@pvp.route('/new')
def new_room_page():
    return render_template('new.html')

@pvp.route('/create_room', methods=['POST'])
def create_room_with_image():
    if request.content_type and 'application/json' in request.content_type:
        # JSON方式（来自online_editor.html）
        data = request.get_json()
        username = data.get('username')
        puzzle = data.get('puzzle', {})
        img_base64 = puzzle.get('img')
        size = puzzle.get('size')
        shape = puzzle.get('shape')
        if not username or not img_base64 or not size or not shape:
            return jsonify({'code': 400, 'msg': 'Missing username, image, or config', 'data': None})
        # 保存图片
        header, b64data = img_base64.split(',', 1) if ',' in img_base64 else ('', img_base64)
        ext = 'png' if 'png' in header else 'jpg'
        filename = f"{random.randint(100000,999999)}.{ext}"
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(b64data))
        config = {'size': size, 'shape': shape}
    else:
        # 表单方式（兼容旧流程）
        username = request.form.get('username')
        file = request.files.get('image')
        size = request.form.get('size')
        shape = request.form.get('shape')
        if not username or not file or not allowed_file(file.filename):
            return jsonify({'code': 400, 'msg': '用户名和图片必填，且图片格式需为png/jpg/jpeg/gif', 'data': None})
        filename = secure_filename(file.filename)
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        config = {'size': size, 'shape': shape}
    room_id = generate_room_id()
    room_pool[room_id] = {"users": [], "image": filename, "config": config}
    return jsonify({'code': 200, 'msg': '房间创建成功', 'data': {'room_id': room_id, 'username': username, 'image': filename, 'config': config}})

@pvp.route('/rooms', methods=['GET'])
def get_rooms():
    return jsonify({
        "code": 200,
        "message": "获取成功",
        "data": [{"room_id": rid, "user_count": len(info["users"])} for rid, info in room_pool.items()]
    })

@pvp.route('/photo')
def photo_page():
    return render_template('photo.html')

@pvp.route('/room_info')
def room_info():
    room_id = request.args.get('room_id')
    print('room_pool:', room_pool)
    print('room_id requested:', room_id)
    if not room_id or room_id not in room_pool:
        print('Room not found!')
        return jsonify({'code': 404, 'msg': 'Room not found'})
    info = room_pool[room_id]
    return jsonify({
        'code': 200,
        'image': info['image'],
        'config': info.get('config', {})
    })