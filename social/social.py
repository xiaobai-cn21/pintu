from flask import Blueprint
from flask_jwt_extendend import jwt_required, get_jwt_identity

social_bp = Blueprint('social_bp', __name__,
    template_folfer='templates', static_url_path='assets')

@social_db.route('/send_message', methods='GET')
@jwt_required()
def send_message():
