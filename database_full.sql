CREATE DATABASE IF NOT EXISTS discord_bot
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE discord_bot;

CREATE TABLE IF NOT EXISTS guild_configs (
    guild_id VARCHAR(20) PRIMARY KEY,
    notification_channel_id VARCHAR(20) DEFAULT NULL,
    mention_role_id VARCHAR(20) DEFAULT NULL,
    custom_message TEXT DEFAULT '@role {streamer} is now live on Twitch!',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_guild (guild_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    username VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) DEFAULT NULL,
    profile_image TEXT DEFAULT NULL,
    custom_message TEXT DEFAULT NULL,
    is_live TINYINT(1) DEFAULT 0,
    last_stream_id VARCHAR(100) DEFAULT NULL,
    last_notification_message_id VARCHAR(20) DEFAULT NULL,
    last_notification_channel_id VARCHAR(20) DEFAULT NULL,
    last_update_time TIMESTAMP NULL DEFAULT NULL,
    last_title TEXT DEFAULT NULL,
    last_game VARCHAR(255) DEFAULT NULL,
    last_viewer_count INT DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_streamer (guild_id, username),
    INDEX idx_guild_username (guild_id, username),
    INDEX idx_is_live (is_live),
    FOREIGN KEY (guild_id) REFERENCES guild_configs(guild_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stream_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    streamer_id INT NOT NULL,
    stream_id VARCHAR(100) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL DEFAULT NULL,
    title TEXT DEFAULT NULL,
    game_name VARCHAR(255) DEFAULT NULL,
    viewer_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_streamer (streamer_id),
    INDEX idx_stream_id (stream_id),
    INDEX idx_started_at (started_at),
    FOREIGN KEY (streamer_id) REFERENCES streamers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Database schema created successfully (combined script).' AS status;
