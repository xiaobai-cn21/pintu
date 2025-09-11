from flask import Blueprint, request, jsonify
from extensions import db, users
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import re

auth = Blueprint('auth', __name__)



@auth.route('/signin', methods=['GET', 'POST'])
def signin():
    try:
        if request.method == 'POST':
            data = request.get_json()
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
            confirmPassword = data.get('confirmPassword')

            error = validate_signup(username, email, password, confirmPassword)
            if error:
                return jsonify({"code": "400", "message": error, "data": None})
            
            hash_password = generate_password_hash(password)
            user_obj = users(username=username, email=email, hash_password=hash_password, created_at=datetime.now())
            db.session.add(user_obj)
            db.session.commit()
            return jsonify({"code": "200", "message": "注册成功", "data": None})
    except Exception as e:
        return jsonify({"code": "500", "message": f"服务器内部错误: {str(e)}", "data": None})
    
@auth.route('/login', methods=['GET', 'POST'])
def  login():
    try:
        if request.method == 'POST':
            data = request.get_json()
            loginKey = data.get('loginKey')
            password = data.get('password')

            user = users.query.filter(
                (users.username == loginKey) | (users.email == loginKey)
            ).first()

            if user and check_password_hash(user.hash_password, password):
                access_token = create_access_token(identity=str(user.user_id))
                return jsonify({
                    "code": 200, 
                    "message": "登录成功", 
                    "data": {
                        "token" : access_token,
                        "expireAt" : 1200, 
                        "userId": user.user_id
                        }
                })
            else:
                return jsonify({"code": "401", "message": "用户名或密码错误", "data": None})
    except Exception as e:
        return jsonify({"code": "500", "message": f"服务器内部错误: {str(e)}", "data": None})
    

def is_email(s):
    return re.match(r'[\w\.-]+@[\w\.-]+\w+$', s)


@auth.route('/is_admin', methods=['GET'])
@jwt_required()
def is_admin():
    try:
        user_id = get_jwt_identity()
        u = users.query.get(int(user_id))
        if not u:
            return jsonify({"code": 404, "message": "用户不存在", "data": None})
        return jsonify({
            "code": 200,
            "message": "OK",
            "data": {"isAdmin": bool(getattr(u, 'is_admin', False))}
        })
    except Exception as e:
        return jsonify({"code": "500", "message": f"服务器内部错误: {str(e)}", "data": None})

# 获取当前登录用户信息
@auth.route('/me', methods=['GET'])
@jwt_required()
def me():
    try:
        user_id = get_jwt_identity()
        u = users.query.get(int(user_id))
        if not u:
            return jsonify({"code": 404, "message": "用户不存在", "data": None})
        return jsonify({
            "code": 200,
            "message": "OK",
            "data": {"userId": u.user_id, "username": u.username}
        })
    except Exception as e:
        return jsonify({"code": 500, "message": f"服务器内部错误: {str(e)}", "data": None})

def is_valid_password(s):
    return len(s) >= 6 and len(s) <= 20 


def is_valid_username(s):
    return len(s) >= 4 and len(s) <= 16 and not re.search(r'[^\w]', s)

def validate_signup(username, email, password, confirmPassword):
    if not all([username, email, password, confirmPassword]):
        return "请求参数异常"
    if password != confirmPassword:
        return "两次输入的密码不一致"
    if users.query.filter((users.username == username) | (users.email == email)).first():
        return "用户名或邮箱已存在"
    if not is_valid_password(password):
        return "密码长度必须在6-20位之间"
    if not is_valid_username(username):
        return "用户名只能包含字母、数字和下划线，长度在4-16位之间"
    if not is_email(email):
        return "你输入一个有效的电子邮件"
    return None