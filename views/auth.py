from flask import Blueprint, request, jsonify
from extensions import db, users
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token

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

            if not all([username, email, password, confirmPassword]):
                return jsonify({"code": "400", "message": "请求参数异常", "data": None})

            if password != confirmPassword:
                return jsonify({"code": "400", "message": "两次输入的密码不一致", "data": None})

            if users.query.filter((users.username == username) | (users.email == email)).first():
                return jsonify({"code": "400", "message": "用户名或邮箱已存在", "data": None})  
            
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
                acces_token = create_access_token(identity=user.user_id)
                return jsonify({
                    "code": 200, 
                    "message": "登录成功", 
                    "data": {
                        "token" : acces_token,
                        "expireAt" : 1200, 
                        "userId": user.user_id
                        }
                })
            else:
                return jsonify({"code": "401", "message": "用户名或密码错误", "data": None})
    except Exception as e:
        return jsonify({"code": "500", "message": f"服务器内部错误: {str(e)}", "data": None})