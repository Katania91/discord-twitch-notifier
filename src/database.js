import mysql from 'mysql2/promise';

class BotDatabase {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME || 'discord_bot',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    };
  }

  async init() {
    try {
      this.pool = mysql.createPool(this.config);
      
      const connection = await this.pool.getConnection();
      console.log('✅ Connected to MariaDB');
      connection.release();
      
      return true;
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
      console.error('💡 Check .env credentials and ensure the database exists');
      throw error;
    }
  }

  async getGuildConfig(guildId) {
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM guild_configs WHERE guild_id = ?',
        [guildId]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('getGuildConfig error:', error);
      return null;
    }
  }

  async setNotificationChannel(guildId, channelId) {
    try {
      await this.pool.query(`
        INSERT INTO guild_configs (guild_id, notification_channel_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE notification_channel_id = ?
      `, [guildId, channelId, channelId]);
      return true;
    } catch (error) {
      console.error('setNotificationChannel error:', error);
      return false;
    }
  }

  async setMentionRole(guildId, roleId) {
    try {
      await this.pool.query(`
        INSERT INTO guild_configs (guild_id, mention_role_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE mention_role_id = ?
      `, [guildId, roleId, roleId]);
      return true;
    } catch (error) {
      console.error('setMentionRole error:', error);
      return false;
    }
  }

  async setCustomMessage(guildId, message) {
    try {
      await this.pool.query(`
        INSERT INTO guild_configs (guild_id, custom_message)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE custom_message = ?
      `, [guildId, message, message]);
      return true;
    } catch (error) {
      console.error('setCustomMessage error:', error);
      return false;
    }
  }

  async deleteGuildConfig(guildId) {
    try {
      await this.pool.query('DELETE FROM guild_configs WHERE guild_id = ?', [guildId]);
      await this.pool.query('DELETE FROM streamers WHERE guild_id = ?', [guildId]);
      return true;
    } catch (error) {
      console.error('deleteGuildConfig error:', error);
      return false;
    }
  }

  async addStreamer(guildId, username, displayName = null, profileImage = null, customMessage = null) {
    try {
      await this.pool.query(`
        INSERT IGNORE INTO guild_configs (guild_id) VALUES (?)
      `, [guildId]);

      await this.pool.query(`
        INSERT INTO streamers (guild_id, username, display_name, profile_image, custom_message)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          display_name = ?,
          profile_image = ?,
          custom_message = ?
      `, [guildId, username.toLowerCase(), displayName, profileImage, customMessage, displayName, profileImage, customMessage]);
      return true;
    } catch (error) {
      console.error('addStreamer error:', error);
      return false;
    }
  }

  async removeStreamer(guildId, username) {
    try {
      const [result] = await this.pool.query(
        'DELETE FROM streamers WHERE guild_id = ? AND username = ?',
        [guildId, username.toLowerCase()]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('removeStreamer error:', error);
      return false;
    }
  }

  async getStreamer(guildId, username) {
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM streamers WHERE guild_id = ? AND username = ?',
        [guildId, username.toLowerCase()]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('getStreamer error:', error);
      return null;
    }
  }

  async getGuildStreamers(guildId) {
    try {
      const [rows] = await this.pool.query(
        'SELECT * FROM streamers WHERE guild_id = ? ORDER BY username',
        [guildId]
      );
      return rows;
    } catch (error) {
      console.error('getGuildStreamers error:', error);
      return [];
    }
  }

  async getAllStreamers() {
    try {
      const [rows] = await this.pool.query('SELECT * FROM streamers');
      return rows;
    } catch (error) {
      console.error('getAllStreamers error:', error);
      return [];
    }
  }

  async updateStreamerStatus(guildId, username, isLive, streamId = null) {
    try {
      await this.pool.query(`
        UPDATE streamers 
        SET is_live = ?, last_stream_id = ?
        WHERE guild_id = ? AND username = ?
      `, [isLive ? 1 : 0, streamId, guildId, username.toLowerCase()]);
      return true;
    } catch (error) {
      console.error('updateStreamerStatus error:', error);
      return false;
    }
  }

  async updateStreamerInfo(guildId, username, displayName, profileImage) {
    try {
      await this.pool.query(`
        UPDATE streamers 
        SET display_name = ?, profile_image = ?
        WHERE guild_id = ? AND username = ?
      `, [displayName, profileImage, guildId, username.toLowerCase()]);
      return true;
    } catch (error) {
      console.error('updateStreamerInfo error:', error);
      return false;
    }
  }

  async updateStreamerMessage(guildId, username, customMessage) {
    try {
      await this.pool.query(`
        UPDATE streamers 
        SET custom_message = ?
        WHERE guild_id = ? AND username = ?
      `, [customMessage, guildId, username.toLowerCase()]);
      return true;
    } catch (error) {
      console.error('updateStreamerMessage error:', error);
      return false;
    }
  }

  async saveNotificationMessage(guildId, username, messageId, channelId, title, game, viewerCount) {
    try {
      await this.pool.query(`
        UPDATE streamers 
        SET last_notification_message_id = ?,
            last_notification_channel_id = ?,
            last_update_time = NOW(),
            last_title = ?,
            last_game = ?,
            last_viewer_count = ?
        WHERE guild_id = ? AND username = ?
      `, [messageId, channelId, title, game, viewerCount, guildId, username.toLowerCase()]);
      return true;
    } catch (error) {
      console.error('saveNotificationMessage error:', error);
      return false;
    }
  }

  async updateNotificationData(guildId, username, title, game, viewerCount) {
    try {
      await this.pool.query(`
        UPDATE streamers 
        SET last_update_time = NOW(),
            last_title = ?,
            last_game = ?,
            last_viewer_count = ?
        WHERE guild_id = ? AND username = ?
      `, [title, game, viewerCount, guildId, username.toLowerCase()]);
      return true;
    } catch (error) {
      console.error('updateNotificationData error:', error);
      return false;
    }
  }

  async clearNotificationMessage(guildId, username) {
    try {
      await this.pool.query(`
        UPDATE streamers 
        SET last_notification_message_id = NULL,
            last_notification_channel_id = NULL,
            last_update_time = NULL,
            last_title = NULL,
            last_game = NULL,
            last_viewer_count = 0
        WHERE guild_id = ? AND username = ?
      `, [guildId, username.toLowerCase()]);
      return true;
    } catch (error) {
      console.error('clearNotificationMessage error:', error);
      return false;
    }
  }

  async addStreamHistory(streamerId, streamId, title, gameName, viewerCount) {
    try {
      await this.pool.query(`
        INSERT INTO stream_history (streamer_id, stream_id, title, game_name, viewer_count)
        VALUES (?, ?, ?, ?, ?)
      `, [streamerId, streamId, title, gameName, viewerCount]);
      return true;
    } catch (error) {
      console.error('addStreamHistory error:', error);
      return false;
    }
  }

  async getStreamHistory(streamerId, limit = 10) {
    try {
      const [rows] = await this.pool.query(`
        SELECT * FROM stream_history 
        WHERE streamer_id = ? 
        ORDER BY started_at DESC 
        LIMIT ?
      `, [streamerId, limit]);
      return rows;
    } catch (error) {
      console.error('getStreamHistory error:', error);
      return [];
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('💾 Database pool closed');
    }
  }
}

export default BotDatabase;
