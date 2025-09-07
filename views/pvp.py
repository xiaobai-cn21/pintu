from flask import Blueprint, request
from flask_socketio import emit, join_room, leave_room
import random

pvp = Blueprint('pvp', __name__)

room_pool = {}

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
        emit('room_created', {'code': 200, 'msg': '房间创建成功', 'data': {'room_id': room_id, 'username': username}}, room=room_id)

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
        # 只发给自己，确保能收到
        emit('joined', {'code': 200, 'msg': '加入房间成功', 'data': {'room_id': room_id, 'username': username}}, to=request.sid)

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

    @socketio.on('challenge')
    def challenge(data):
        room_id = data.get('room_id')
        emit('lose', {}, room=room_id, include_self=False)