CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(16) NOT NULL,
    email VARCHAR(50) NOT NULL,
    hash_password VARCHAR(256) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE puzzles (
    puzzle_id INT PRIMARY KEY AUTO_INCREMENT ,
    creator_id INT,
    title VARCHAR(20) NOT NULL ,
    image_url VARCHAR(255) NOT NULL ,
    difficulty ENUM('easy', 'medium', 'hard'),
    piece_count INT NOT NULL,
    piece_shape ENUM('rect', 'irregular') NOT NULL,
    is_rotatable BOOLEAN DEFAULT FALSE,
    is_system_level BOOLEAN DEFAULT FALSE ,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP ,
    FOREIGN KEY (creator_id) REFERENCES users(user_id)
);

CREATE TABLE records (
    user_id INT PRIMARY KEY,
    step_count INT NOT NULL,
    time_used INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);