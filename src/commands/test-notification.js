import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('test-notification')
    .setDescription('Send a test notification for a streamer')
    .addStringOption(option =>
      option
        .setName('username')
        .setDescription('Twitch username of the streamer')
        .setRequired(true)
        .setAutocomplete(true)
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

    const username = interaction.options.getString('username').toLowerCase();
    const guildId = interaction.guild.id;

    try {
      const config = await interaction.client.db.getGuildConfig(guildId);
      
      if (!config || !config.notification_channel_id) {
        return await interaction.editReply({
          content: '❌ No notification channel configured!\n💡 Use `/set-channel` first.',
        });
      }

      const streamer = await interaction.client.db.getStreamer(guildId, username);
      
      if (!streamer) {
        return await interaction.editReply({
          content: `❌ **${username}** is not in the list!\n💡 Use \`/add-streamer\` first.`,
        });
      }

      await interaction.client.monitor.sendTestNotification(guildId, username);

      await interaction.editReply({
        content: `✅ Test notification sent for **${streamer.display_name || username}**!\n` +
                 `Check <#${config.notification_channel_id}>`,
      });

      console.log(`🧪 Test notification for ${username} in ${interaction.guild.name}`);
    } catch (error) {
      console.error('test-notification error:', error);
      await interaction.editReply({
        content: `❌ Error while sending the test notification:\n${error.message}`,
      });
    }
  },
};
