import eventlet
eventlet.monkey_patch()
from flask import Flask,render_template, send_file
from config import Config
from extensions import db
from flask_jwt_extended import JWTManager
from views.auth import auth
from views.pic import pic
from views.ai import ai
from views.pvp import pvp, register_socketio_events
from flask_socketio import SocketIO
from views.ranking import ranking
from views.levels import levels
from views.social import social

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        f"mysql+pymysql://{Config.MYSQL_USER}:{Config.MYSQL_PASSWORD}@"
        f"{Config.MYSQL_HOST}:{Config.MYSQL_PORT}/{Config.MYSQL_DB}"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = Config.SECRET_KEY
    db.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(pic, url_prefix='/pic')
    app.register_blueprint(ai, url_prefix='/ai')
    app.register_blueprint(pvp, url_prefix='/pvp')
    app.register_blueprint(ranking, url_prefix='/ranking')
    app.register_blueprint(levels, url_prefix='/levels')
    app.register_blueprint(social, url_prefix='/social')

    @app.route('/')
    def main():
        return render_template('index.html')

    # 其它页面路由（模板渲染）
    @app.route('/menu')
    def menu_page():
        return render_template('index.html')

    @app.route('/option')
    def option_page():
        return render_template('option.html')

    @app.route('/game')
    def game_page():
        return render_template('game.html')

    @app.route('/editor')
    def editor_page():
        return render_template('edditor.html')

    @app.route('/rank')
    def rank_page():
        return render_template('rank.html')

    @app.route('/my-puzzle')
    def my_puzzle_page():
        return render_template('myPuzzle.html')

    @app.route('/share')
    def share_page():
        return render_template('share.html')

    @app.route('/loading')
    def loading_page():
        return render_template('loading.html')

    @app.route('/ai-page')
    def ai_page():
        return render_template('ai.html')

    @app.route('/versus')
    def versus_page():
        return render_template('versus.html')
    
    @app.route('/messages')
    def messages_page():
        return render_template('messages.html')
    
    @app.route('/search_friends')
    def search_friend():
        return render_template('search_friend.html')
    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
    from views.pvp import register_socketio_events
    socketio = SocketIO(app, async_mode='eventlet',cors_allowed_origins="*")  # 这里创建并绑定 app
    print("async_mode:", socketio.async_mode)
    register_socketio_events(socketio)
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, use_reloader=False)