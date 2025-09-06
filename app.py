from flask import Flask
from config import Config
from extensions import db
from flask_jwt_extended import JWTManager
# 注册蓝图（从views文件夹导入）
from views.auth import auth
from config import Config

def create_app():
    app = Flask(__name__)
    # 先设置数据库配置
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        f"mysql+pymysql://{Config.MYSQL_USER}:{Config.MYSQL_PASSWORD}@"
        f"{Config.MYSQL_HOST}:{Config.MYSQL_PORT}/{Config.MYSQL_DB}"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = Config.SECRET_KEY
    # 再初始化 db
    db.init_app(app)
    JWTManager(app)
    app.register_blueprint(auth, url_prefix='/auth')
    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)
