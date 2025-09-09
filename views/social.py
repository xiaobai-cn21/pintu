from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, users, friends, friend_requests, messages

social = Blueprint('social_bp', __name__)

@social.route('/send_message', methods=['POST'])
@jwt_required()
def send_message():
    try:
        sender_id = get_jwt_identity()
        data = request.get_json()
        receiver_id = data.get('receiver_id')
        content = data.get('content')
        if not receiver_id or not content:
            return jsonify({"code":400, "message": "参数不完整", "data": None})
        msg = messages(sender_id=sender_id, receiver_id=receiver_id, content=content)
        db.session.add(msg)
        db.session.commit()
        return jsonify({"code":200, "message": "发送成功", "data": None})
    except Exception as e:
        return jsonify({"code":500, "message": f"服务器内部错误: {str(e)}", "data": None})

@social.route('/get_friends', methods=['GET'])
@jwt_required()
def get_friends():
    try:
        user_id = int(get_jwt_identity())
        friend_list = friends.query.filter(
            (friends.user_id == user_id) | (friends.friend_id == user_id)
        ).all()
        result = []
        for f in friend_list:
            fid = f.friend_id if f.user_id == user_id else f.user_id
            u = users.query.get(fid)
            if u and u.user_id != user_id:  # 过滤掉自己
                result.append({'user_id': u.user_id, 'username': u.username})
        return jsonify({"code":200, "message": "获取成功", "data": result})
    except Exception as e:
        return jsonify({"code":500, "message": f"服务器内部错误: {str(e)}", "data": None})

@social.route('/send_friend_request', methods=['POST'])
@jwt_required()
def send_friend_request():
    try:
        sender_id = get_jwt_identity()
        data = request.get_json()
        receiver_id = data.get('receiver_id')
        if not receiver_id:
            return jsonify({"code":400, "message": "参数不完整", "data": None})
        exist = friends.query.filter(
            ((friends.user_id == sender_id) & (friends.friend_id == receiver_id)) |
            ((friends.user_id == receiver_id) & (friends.friend_id == sender_id))
        ).first()
        if exist:
            return jsonify({"code":400, "message": "已经是好友", "data": None})
        req_exist = friend_requests.query.filter_by(sender_id=sender_id, receiver_id=receiver_id, status='pending').first()
        if req_exist:
            return jsonify({"code":400, "message": "已发送请求", "data": None})
        req = friend_requests(sender_id=sender_id, receiver_id=receiver_id)
        db.session.add(req)
        db.session.commit()
        return jsonify({"code":200, "message": "请求已发送", "data": None})
    except Exception as e:
        return jsonify({"code":500, "message": f"服务器内部错误: {str(e)}", "data": None})


@social.route('/handle_friend_request', methods=['POST'])
@jwt_required()
def handle_friend_request():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        request_id = data.get('request_id')
        action = data.get('action')  # 'accept' or 'reject'
        req = friend_requests.query.get(request_id)
        
        if not req or int(req.receiver_id) != int(user_id) or req.status != 'pending':
            print('error')
            return jsonify({"code":400, "message": "无效请求", "data": None})
        if action == 'accept':
            req.status = 'accepted'
            db.session.add(friends(user_id=req.sender_id, friend_id=req.receiver_id))
        elif action == 'reject':
            req.status = 'rejected'
        else:
            return jsonify({"code":400, "message": "参数错误", "data": None})
        db.session.commit()
        return jsonify({"code":200, "message": "操作成功", "data": None})
    except Exception as e:
        return jsonify({"code":500, "message": f"服务器内部错误: {str(e)}", "data": None})
    
@social.route('/search_user', methods=['GET'])
@jwt_required()
def search_user():
    try:
        keyword = request.args.get('keyword', '').strip()
        if not keyword:
            return jsonify({"code":400, "message": "请输入关键词", "data": []})
        user_id = get_jwt_identity()
        users_query = users.query.filter(users.username.like(f"%{keyword}%")).limit(20)
        result = []
        for u in users_query:
            result.append({'user_id': u.user_id, 'username': u.username})
        return jsonify({"code":200, "message": "搜索成功", "data": result})
    except Exception as e:
        return jsonify({"code":500, "message": f"服务器内部错误: {str(e)}", "data": []})
    
@social.route('/get_friend_requests', methods=['GET'])
@jwt_required()
def get_friend_requests():
    try:
        user_id = get_jwt_identity()
        reqs = friend_requests.query.filter_by(receiver_id=user_id, status='pending').all()
        result = []
        for r in reqs:
            sender = users.query.get(r.sender_id)
            result.append({
                'request_id': r.request_id,
                'sender_id': r.sender_id,
                'sender_name': sender.username if sender else '未知用户'
            })
        return jsonify({"code":200, "message": "获取成功", "data": result})
    except Exception as e:
        return jsonify({"code":500, "message": f"服务器内部错误: {str(e)}", "data": []})
    
@social.route('/get_messages', methods=['GET'])
@jwt_required()
def get_messages():
    try:
        user_id = int(get_jwt_identity())
        friend_id = int(request.args.get('friend_id', 0))
        print('user_id:', user_id, 'friend_id:', friend_id)
        msgs = messages.query.filter(
            ((messages.sender_id == user_id) & (messages.receiver_id == friend_id)) |
            ((messages.sender_id == friend_id) & (messages.receiver_id == user_id))
        ).order_by(messages.sent_at.asc()).all()
        print('msgs:', msgs)
        result = []
        for m in msgs:
            result.append({
                "message_id": m.message_id,
                "sender_id": m.sender_id,
                "receiver_id": m.receiver_id,
                "content": m.content,
                "sent_at": m.sent_at.strftime('%Y-%m-%d %H:%M:%S') if m.sent_at else ""
            })
        return jsonify({"code":200, "message": "获取成功", "data": result})
    except Exception as e:
        return jsonify({"code":500, "message": f"服务器内部错误: {str(e)}", "data": []})