import { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('add-streamer')
    .setDescription('Add a streamer to monitor')
    .addStringOption(option =>
      option
        .setName('username')
        .setDescription('Twitch username of the streamer')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Custom message (use {streamer}, {game}, {title}, {url}, @role)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const username = interaction.options.getString('username').trim().toLowerCase();
    const customMessage = interaction.options.getString('message');
    const guildId = interaction.guild.id;

    try {
      if (!username || username.length < 3 || username.length > 25) {
        return await interaction.editReply({
          content: '❌ Invalid Twitch username! Must be 3 to 25 characters.',
        });
      }

      const users = await interaction.client.twitchAPI.getUsers([username]);

      if (users.length === 0) {
        return await interaction.editReply({
          content: `❌ Twitch user **${username}** not found!`,
        });
      }

      const twitchUser = users[0];

      const existing = await interaction.client.db.getStreamer(guildId, username);

      if (existing) {
        return await interaction.editReply({
          content: `⚠️  **${twitchUser.display_name}** is already monitored!`,
        });
      }

      await interaction.client.db.addStreamer(
        guildId,
        twitchUser.login,
        twitchUser.display_name,
        twitchUser.profile_image_url,
        customMessage
      );

      let response = `✅ **${twitchUser.display_name}** added to the list!\n🔗 https://twitch.tv/${twitchUser.login}`;
      
      if (customMessage) {
        response += `\n\n💬 **Custom message:**\n${customMessage}`;
      } else {
        response += `\n\n💡 The server-level message will be used.`;
      }

      await interaction.editReply({
        content: response,
      });

      console.log(`➕ Streamer added: ${twitchUser.display_name} in ${interaction.guild.name}`);
    } catch (error) {
      console.error('add-streamer error:', error);
      await interaction.editReply({
        content: '❌ Error while adding the streamer. Please try again later.',
      });
    }
  },
};
