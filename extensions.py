from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, DateTime, MetaData, Enum, ForeignKey,Boolean
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
    created_at = Column(DateTime)
    puzzles = relationship('puzzles', backref='creator', lazy=True)
    records = relationship('records', backref='user', lazy=True)

class puzzles(db.Model):
    __tablename__ = 'puzzles'
    puzzle_id = Column(Integer, primary_key=True, autoincrement=True)
    creator_id = Column(Integer, ForeignKey('users.user_id'))
    title = Column(String(20), nullable=False)
    image_url = Column(String(255), nullable=False)
    difficulty = Column(Enum('easy', 'medium', 'hard'), nullable=True)
    piece_count = Column(Integer, nullable=False)
    piece_shape = Column(Enum('rect', 'irregular'), nullable=False)
    is_rotatable = Column(Boolean, default=False)
    is_system_level = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class records(db.Model):
    __tablename__ = 'records'
    user_id = Column(Integer, ForeignKey('users.user_id'), primary_key=True)
    step_count = Column(Integer, nullable=False)
    time_used = Column(Integer, nullable=False)

