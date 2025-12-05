import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('edit-streamer')
    .setDescription('Edit a streamer\'s custom message')
    .addStringOption(option =>
      option
        .setName('username')
        .setDescription('Streamer\'s Twitch username')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('New message (use {streamer}, {game}, {title}, {url}, @role) or "reset" to remove')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const guildId = interaction.guild.id;

    try {
      const streamers = await interaction.client.db.getGuildStreamers(guildId);
      
      const filtered = streamers
        .filter(s => 
          s.username.toLowerCase().includes(focusedValue) ||
          (s.display_name && s.display_name.toLowerCase().includes(focusedValue))
        )
        .slice(0, 25)
        .map(s => ({
          name: s.display_name || s.username,
          value: s.username
        }));

      await interaction.respond(filtered);
    } catch (error) {
      console.error('autocomplete error:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const username = interaction.options.getString('username').trim().toLowerCase();
    const message = interaction.options.getString('message').trim();
    const guildId = interaction.guild.id;

    try {
      const streamer = await interaction.client.db.getStreamer(guildId, username);

      if (!streamer) {
        return await interaction.editReply({
          content: `❌ **${username}** is not in the monitored list!`,
        });
      }

      const newMessage = message.toLowerCase() === 'reset' ? null : message;

      await interaction.client.db.updateStreamerMessage(guildId, username, newMessage);

      if (newMessage) {
        let preview = newMessage
          .replace(/{streamer}/g, streamer.display_name || username)
          .replace(/{game}/g, 'Game Name')
          .replace(/{title}/g, 'Stream Title')
          .replace(/{url}/g, `https://twitch.tv/${username}`);

        const config = await interaction.client.db.getGuildConfig(guildId);
        if (config?.mention_role_id) {
          preview = preview.replace(/@role/g, `<@&${config.mention_role_id}>`);
        } else {
          preview = preview.replace(/@role/g, '@Role');
        }

        await interaction.editReply({
          content: `✅ Custom message updated for **${streamer.display_name || username}**!\n\n` +
                   `**Preview:**\n${preview}\n\n` +
                   `**Available variables:**\n` +
                   `• \`{streamer}\` - Streamer name\n` +
                   `• \`{game}\` - Current game\n` +
                   `• \`{title}\` - Stream title\n` +
                   `• \`{url}\` - Stream link\n` +
                   `• \`@role\` - Mention the configured role`,
        });
      } else {
        await interaction.editReply({
          content: `✅ Custom message removed for **${streamer.display_name || username}**!\n\n` +
                   `💡 The server-level message will now be used.`,
        });
      }

      console.log(`✏️ Message updated for ${username} in ${interaction.guild.name}`);
    } catch (error) {
      console.error('edit-streamer error:', error);
      await interaction.editReply({
        content: '❌ Error while editing the message. Please try again later.',
      });
    }
  },
};
