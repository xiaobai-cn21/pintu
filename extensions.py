from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, String, DateTime, MetaData
from config import Config
from datetime import datetime


db = SQLAlchemy()

class Users(db.Model):  
    __tablename__ = 'users'  
    user_id = Column(Integer, primary_key=True)  
    username = Column(String(50))
    email = Column(String(50))
    hash_password = Column(String(256))
    created_at = Column(DateTime)


