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

CREATE TABLE messages (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content VARCHAR(500) NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES users(user_id)
);

CREATE TABLE friend_requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (receiver_id) REFERENCES users(user_id)
);

CREATE TABLE shares (
    share_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    puzzle_id INT NOT NULL,
    view_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (puzzle_id) REFERENCES puzzles(puzzle_id)
);

CREATE TABLE friends (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (friend_id) REFERENCES users(user_id),
    UNIQUE KEY unique_friendship (user_id, friend_id)
);