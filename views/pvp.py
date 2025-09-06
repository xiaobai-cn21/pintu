# from flask import Blueprint
# from flask_socketio import SocketIO, emit, join_room, leave_room

# pvp = Blueprint('pic', __name__)
# socketio = SocketIO()

# room_pool = {}

# @pvp.route('/')
# def main_room():
#     return "欢迎来到比赛模型"

# @socketio.on('create_room')
# def create_room(data):
#     room_id = data.get('room_id')
#     username = data.get('username')
#     if not room_id or 
# @socketio.on('join')