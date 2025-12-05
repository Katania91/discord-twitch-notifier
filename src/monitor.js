import { EmbedBuilder } from 'discord.js';

class StreamMonitor {
  constructor(client, database, twitchAPI) {
    this.client = client;
    this.db = database;
    this.twitch = twitchAPI;
    this.interval = null;
    this.checkInterval = parseInt(process.env.CHECK_INTERVAL) || 60000;
    this.titleKeyword = (process.env.STREAM_TITLE_KEYWORD || '').trim().toLowerCase();
  }

  start() {
    if (this.interval) {
      console.log('⚠️  Monitor already running');
      return;
    }

    console.log(`🔄 Starting monitor (every ${this.checkInterval / 1000}s)`);
    this.checkStreams();
    this.interval = setInterval(() => {
      this.checkStreams();
    }, this.checkInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 Monitor stopped');
    }
  }

  async checkStreams() {
    try {
      const allStreamers = await this.db.getAllStreamers();
      
      if (allStreamers.length === 0) {
        return;
      }

      const batchSize = 100;
      for (let i = 0; i < allStreamers.length; i += batchSize) {
        const batch = allStreamers.slice(i, i + batchSize);
        await this.checkBatch(batch);
      }
      
    } catch (error) {
      console.error('❌ Error while checking streams:', error);
    }
  }

  async checkBatch(streamers) {
    try {
      const usernames = [...new Set(streamers.map(s => s.username))];
      const liveStreams = await this.twitch.getStreams(usernames);
      const liveMap = new Map();
      liveStreams.forEach(stream => {
        liveMap.set(stream.user_login.toLowerCase(), stream);
      });

      for (const streamer of streamers) {
        const liveStream = liveMap.get(streamer.username);
        const wasLive = streamer.is_live === 1;
        const isLive = !!liveStream;

        if (isLive && !wasLive) {
          await this.handleStreamStart(streamer, liveStream);
        }
        else if (!isLive && wasLive) {
          await this.handleStreamEnd(streamer);
        }
        else if (isLive && wasLive) {
          await this.handleStreamUpdate(streamer, liveStream);
        }
      }
    } catch (error) {
      console.error('❌ Error in batch check:', error);
    }
  }

  async handleStreamStart(streamer, streamData) {
    console.log(`🔴 ${streamer.username} went live`);

    await this.db.updateStreamerStatus(
      streamer.guild_id,
      streamer.username,
      true,
      streamData.id
    );

    let profileImage = streamer.profile_image;
    try {
      const users = await this.twitch.getUsers([streamer.username]);
      if (users.length > 0 && users[0].profile_image_url) {
        profileImage = users[0].profile_image_url;
      }
    } catch (error) {
      console.error(`⚠️  Unable to fetch profile image for ${streamer.username}:`, error.message);
    }

    await this.db.updateStreamerInfo(
      streamer.guild_id,
      streamer.username,
      streamData.user_name,
      profileImage
    );

    streamer.profile_image = profileImage;

    await this.db.addStreamHistory(
      streamer.id,
      streamData.id,
      streamData.title,
      streamData.game_name,
      streamData.viewer_count
    );

    const requiresKeyword = !!this.titleKeyword;
    const titleHasKeyword = streamData.title && streamData.title.toLowerCase().includes(this.titleKeyword);

    if (requiresKeyword && !titleHasKeyword) {
      console.log(`⏭️  ${streamer.username} is live but title "${streamData.title}" does not contain "${this.titleKeyword}". Skipping notification.`);
      return;
    }

    console.log(`✅ ${streamer.username} is live and passed title filter. Sending notification...`);
    await this.sendNotification(streamer, streamData);
  }

  async handleStreamEnd(streamer) {
    console.log(`⚫ ${streamer.username} ended the stream`);

    await this.db.updateStreamerStatus(
      streamer.guild_id,
      streamer.username,
      false,
      null
    );

    await this.db.clearNotificationMessage(
      streamer.guild_id,
      streamer.username
    );
  }

  async handleStreamUpdate(streamer, streamData) {
    const requiresKeyword = !!this.titleKeyword;
    const titleContainsKeyword = streamData.title && streamData.title.toLowerCase().includes(this.titleKeyword);
    const hadNotification = !!(streamer.last_notification_message_id && streamer.last_notification_channel_id);

    if (requiresKeyword && !titleContainsKeyword && hadNotification) {
      console.log(`⏸️  ${streamer.username} removed the keyword from the title. Keeping existing notification but no further updates.`);
      return;
    }

    if ((!requiresKeyword || titleContainsKeyword) && !hadNotification) {
      console.log(`📢 ${streamer.username} now matches the title filter. Sending notification...`);
      
      let profileImage = streamer.profile_image;
      try {
        const users = await this.twitch.getUsers([streamer.username]);
        if (users.length > 0 && users[0].profile_image_url) {
          profileImage = users[0].profile_image_url;
        }
      } catch (error) {
        console.error(`⚠️  Unable to fetch profile image for ${streamer.username}:`, error.message);
      }
      
      streamer.profile_image = profileImage;
      await this.sendNotification(streamer, streamData);
      return;
    }

    if (requiresKeyword && !titleContainsKeyword && !hadNotification) {
      return;
    }

    const UPDATE_INTERVAL = 10 * 60 * 1000;
    const lastUpdate = streamer.last_update_time ? new Date(streamer.last_update_time).getTime() : 0;
    const now = Date.now();

    if (now - lastUpdate < UPDATE_INTERVAL) {
      return;
    }

    const titleChanged = streamer.last_title !== streamData.title;
    const gameChanged = streamer.last_game !== streamData.game_name;
    const viewerThreshold = 0.20;
    const oldViewers = streamer.last_viewer_count || 0;
    const newViewers = streamData.viewer_count;
    const viewerDiff = Math.abs(newViewers - oldViewers);
    const viewerChanged = oldViewers === 0 ? true : (viewerDiff / oldViewers) >= viewerThreshold;

    const shouldUpdate = titleChanged || gameChanged || viewerChanged || true;
    
    if (shouldUpdate) {
      console.log(`🔄 Updating live data for ${streamer.username} (title: ${titleChanged}, game: ${gameChanged}, viewers: ${viewerChanged})`);
      await this.updateNotificationMessage(streamer, streamData);
    }

    if (streamer.last_stream_id !== streamData.id) {
      await this.db.updateStreamerStatus(
        streamer.guild_id,
        streamer.username,
        true,
        streamData.id
      );
    }
  }

  async updateNotificationMessage(streamer, streamData) {
    try {
      const channel = await this.client.channels.fetch(streamer.last_notification_channel_id).catch(() => null);
      
      if (!channel) {
        console.log(`⚠️  Channel not found for update: ${streamer.last_notification_channel_id}`);
        return;
      }

      const message = await channel.messages.fetch(streamer.last_notification_message_id).catch(() => null);
      
      if (!message) {
        console.log(`⚠️  Message not found for update: ${streamer.last_notification_message_id}`);
        await this.db.clearNotificationMessage(streamer.guild_id, streamer.username);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#9146FF')
        .setAuthor({
          name: streamData.user_name,
          iconURL: streamer.profile_image || undefined,
          url: `https://twitch.tv/${streamer.username}`,
        })
        .setTitle((streamData.title || 'Untitled').slice(0, 256))
        .setURL(`https://twitch.tv/${streamer.username}`)
        .setDescription(`Playing **${streamData.game_name || 'No game'}**`)
        .setImage(streamData.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`)
        .addFields(
          { name: '👥 Viewers', value: streamData.viewer_count.toString(), inline: true },
          { name: '🎮 Game', value: (streamData.game_name || 'N/A').slice(0, 1024), inline: true },
        )
        .setFooter({ text: 'Twitch • Last update' })
        .setTimestamp();

      await message.edit({ embeds: [embed] });

      await this.db.updateNotificationData(
        streamer.guild_id,
        streamer.username,
        streamData.title,
        streamData.game_name,
        streamData.viewer_count
      );

      console.log(`✅ Message updated for ${streamer.username}`);
    } catch (error) {
      console.error(`❌ Error updating message for ${streamer.username}:`, error);
    }
  }

  async sendNotification(streamer, streamData) {
    try {
      const config = await this.db.getGuildConfig(streamer.guild_id);
      
      if (!config || !config.notification_channel_id) {
        console.log(`⚠️  No channel configured for ${streamer.guild_id}`);
        return;
      }

      const channel = await this.client.channels.fetch(config.notification_channel_id).catch(() => null);
      
      if (!channel) {
        console.log(`⚠️  Channel not found: ${config.notification_channel_id}`);
        return;
      }

      if (!channel.isTextBased()) {
        console.log(`⚠️  Channel ${config.notification_channel_id} is not text-based`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#9146FF')
        .setAuthor({
          name: streamData.user_name,
          iconURL: streamer.profile_image || undefined,
          url: `https://twitch.tv/${streamer.username}`,
        })
        .setTitle((streamData.title || 'Untitled').slice(0, 256))
        .setURL(`https://twitch.tv/${streamer.username}`)
        .setDescription(`Playing **${streamData.game_name || 'No game'}**`)
        .setImage(streamData.thumbnail_url.replace('{width}', '1280').replace('{height}', '720') + `?t=${Date.now()}`)
        .addFields(
          { name: '👥 Viewers', value: streamData.viewer_count.toString(), inline: true },
          { name: '🎮 Game', value: (streamData.game_name || 'N/A').slice(0, 1024), inline: true },
        )
        .setFooter({ text: 'Twitch' })
        .setTimestamp();

      let message = streamer.custom_message || config.custom_message || '{streamer} is now live on Twitch!';
      message = message.replace(/{streamer}/g, streamData.user_name);
      message = message.replace(/{game}/g, streamData.game_name || 'No game');
      message = message.replace(/{title}/g, streamData.title || 'Untitled');
      message = message.replace(/{url}/g, `https://twitch.tv/${streamer.username}`);

      if (config.mention_role_id) {
        message = message.replace(/@role/g, `<@&${config.mention_role_id}>`);
      } else {
        message = message.replace(/@role/g, '');
      }

      const sentMessage = await channel.send({
        content: message.trim().slice(0, 2000),
        embeds: [embed],
      });

      await this.db.saveNotificationMessage(
        streamer.guild_id,
        streamer.username,
        sentMessage.id,
        channel.id,
        streamData.title,
        streamData.game_name,
        streamData.viewer_count
      );

      console.log(`✅ Notification sent for ${streamer.username} in guild ${streamer.guild_id}`);
    } catch (error) {
      console.error(`❌ Error sending notification for ${streamer.username}:`, error);
    }
  }
  async sendTestNotification(guildId, username) {
    const streamer = await this.db.getStreamer(guildId, username);
    
    if (!streamer) {
      throw new Error('Streamer not found');
    }

    const stream = await this.twitch.isStreamLive(username);
    
    if (!stream) {
      const users = await this.twitch.getUsers([username]);
      
      if (users.length === 0) {
        throw new Error('Twitch user not found');
      }

      const user = users[0];
      
      const fakeStream = {
        id: 'test_' + Date.now(),
        user_id: user.id,
        user_login: user.login,
        user_name: user.display_name,
        game_name: 'Just Chatting',
        title: '🧪 This is a test notification!',
        viewer_count: 0,
        started_at: new Date().toISOString(),
        thumbnail_url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${user.login}-{width}x{height}.jpg`,
      };

      await this.sendNotification(streamer, fakeStream);
    } else {
      await this.sendNotification(streamer, stream);
    }
  }
}

export default StreamMonitor;
