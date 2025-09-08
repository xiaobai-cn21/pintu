from flask import Blueprint, request, jsonify
from flask_socketio import emit, join_room, leave_room
import random

pvp = Blueprint('pvp', __name__)

room_pool = {}
user_sid_map = {}

def generate_room_id():
    while True:
        room_id = str(random.randint(1000, 9999))
        if room_id not in room_pool:
            return room_id

def register_socketio_events(socketio):
    @socketio.on('create_room')
    def create_room(data):
        username = data.get('username')
        if not username:
            emit('error', {'code': 400, 'msg': '用户名不能为空', 'data': None})
            return
        room_id = generate_room_id()
        room_pool.setdefault(room_id, [])
        join_room(room_id)
        room_pool[room_id].append(username)
        user_sid_map[request.sid] = {'username': username, 'room_id': room_id}
        # 第一个用户只能收到waiting
        emit('waiting', {'code': 200, 'msg': '等待另一个玩家加入', 'data': {'room_id': room_id, 'username': username}}, to=request.sid)

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
        room_pool[room_id].append(username)
        user_sid_map[request.sid] = {'username': username, 'room_id': room_id}

        emit('start', {'code': 200, 'msg': '房间已满，可以开始', 'data': {'room_id': room_id}}, room=room_id)

        emit('joined', {'code': 200, 'msg': '加入房间成功', 'data': {'room_id': room_id, 'username': username}}, to=request.sid)

    @socketio.on('disconnect')
    def handle_disconnect():
        info = user_sid_map.get(request.sid)
        if info:
            room_id = info['room_id']
            username = info['username']
            leave_room(room_id)
            if room_id in room_pool and username in room_pool[room_id]:
                room_pool[room_id].remove(username)
                if not room_pool[room_id]:
                    del room_pool[room_id]
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
        if room_id in room_pool and username in room_pool[room_id]:
            room_pool[room_id].remove(username)
            if not room_pool[room_id]:
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

@pvp.route('/rooms', methods=['GET'])
def get_rooms():
    return jsonify({
        "code": 200,
        "message": "获取成功",
        "data": [{"room_id": rid, "user_count": len(users)} for rid, users in room_pool.items()]
    })