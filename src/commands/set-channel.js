import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set-channel')
    .setDescription('Set the notification channel for stream alerts')
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel where notifications will be sent')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const channel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    try {
      const permissions = channel.permissionsFor(interaction.client.user);
      
      if (!permissions || !permissions.has('SendMessages') || !permissions.has('EmbedLinks')) {
        return await interaction.editReply({
          content: `❌ Missing permissions in ${channel}!\n` +
                   `Ensure I can **Send Messages** and **Embed Links**.`,
        });
      }

      await interaction.client.db.setNotificationChannel(guildId, channel.id);

      await interaction.editReply({
        content: `✅ Notification channel set to ${channel}!`,
      });

      console.log(`📢 Notification channel set: ${channel.name} in ${interaction.guild.name}`);
    } catch (error) {
      console.error('set-channel error:', error);
      await interaction.editReply({
        content: '❌ Error while setting the channel. Please try again later.',
      });
    }
  },
};
