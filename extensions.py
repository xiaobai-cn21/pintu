from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, DateTime, MetaData, Enum, ForeignKey, Boolean, Text
from config import Config
from datetime import datetime
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class users(db.Model):
    __tablename__ = 'users'
    user_id = Column(Integer, primary_key=True)
    username = Column(String(50))
    email = Column(String(50))
    hash_password = Column(String(256))
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime)
    puzzles = relationship('puzzles', backref='creator', lazy=True)
    records = relationship('records', backref='user', lazy=True)
    level_records = relationship('level_records', backref='user', lazy=True)
    game_saves = relationship('game_saves', backref='user', lazy=True)

class puzzles(db.Model):
    __tablename__ = 'puzzles'
    puzzle_id = Column(Integer, primary_key=True, autoincrement=True)
    creator_id = Column(Integer, ForeignKey('users.user_id'))
    title = Column(String(20), nullable=False)
    image_url = Column(String(255), nullable=False)
    difficulty = Column(Enum('easy', 'medium', 'hard'), nullable=True)
    piece_count = Column(Integer, nullable=False)
    piece_shape = Column(Enum('rect', 'irregular', 'triangle'), nullable=False)
    is_rotatable = Column(Boolean, default=False)
    is_flipable = Column(Boolean, default=False)
    is_system_level = Column(Boolean, default=False)
    type = Column(Enum('nature', 'animal', 'building', 'cartoon', 'other'), default='other')
    created_at = Column(DateTime, default=datetime.utcnow)

class records(db.Model):
    __tablename__ = 'records'
    user_id = Column(Integer, ForeignKey('users.user_id'), primary_key=True)
    step_count = Column(Integer, nullable=False)
    time_used = Column(Integer, nullable=False)

class level_records(db.Model):
    __tablename__ = 'level_records'
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    level_id = Column(String(50), nullable=False)
    level_name = Column(String(100), nullable=False)
    image_url = Column(String(255), nullable=False)
    difficulty = Column(Integer, nullable=False)
    best_time = Column(Integer, default=None)
    best_steps = Column(Integer, default=None)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class game_saves(db.Model):
    __tablename__ = 'game_saves'
    save_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    level_id = Column(String(50), nullable=False)
    level_name = Column(String(100), nullable=False)
    image_url = Column(String(255), nullable=False)
    difficulty = Column(Integer, nullable=False)
    current_time = Column(Integer, default=0)
    current_steps = Column(Integer, default=0)
    puzzle_state = Column(Text)
    save_time = Column(DateTime, default=datetime.utcnow)

class messages(db.Model):
    __tablename__ = 'messages'
    message_id = Column(Integer, primary_key=True, autoincrement=True)
    sender_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    receiver_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    content = Column(String(500), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship('users', foreign_keys=[sender_id], backref='sent_messages', lazy=True)
    receiver = relationship('users', foreign_keys=[receiver_id], backref='received_messages', lazy=True)


class friend_requests(db.Model):
    __tablename__ = 'friend_requests'
    request_id = Column(Integer, primary_key=True, autoincrement=True)
    sender_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    receiver_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    status = Column(Enum('pending', 'accepted', 'rejected'), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)

class friends(db.Model):
    __tablename__ = 'friends'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    friend_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (
        db.UniqueConstraint('user_id', 'friend_id', name='unique_friendship'),
    )


# 分享表
class shares(db.Model):
    __tablename__ = 'shares'
    share_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    puzzle_id = Column(Integer, ForeignKey('puzzles.puzzle_id'), nullable=False)
    share_code = Column(Integer)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)