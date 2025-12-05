import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Show the current bot configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const guildId = interaction.guild.id;

    try {
      const config = await interaction.client.db.getGuildConfig(guildId);
      const streamers = await interaction.client.db.getGuildStreamers(guildId);

      const embed = new EmbedBuilder()
        .setColor('#9146FF')
        .setTitle('⚙️ Bot Configuration')
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();

      const channelText = config?.notification_channel_id 
        ? `<#${config.notification_channel_id}>`
        : '❌ Not set';
      embed.addFields({ name: '📢 Notification channel', value: channelText, inline: false });

      const roleText = config?.mention_role_id
        ? `<@&${config.mention_role_id}>`
        : '❌ Not set';
      embed.addFields({ name: '🔔 Mention role', value: roleText, inline: false });

        const messageText = config?.custom_message || 'Default message';
      embed.addFields({ 
          name: '💬 Custom message', 
        value: `\`\`\`${messageText}\`\`\``, 
        inline: false 
      });

      embed.addFields({ 
        name: '📺 Monitored streamers', 
        value: streamers.length > 0 ? `${streamers.length} streamers` : 'None',
        inline: true 
      });

      const interval = parseInt(process.env.CHECK_INTERVAL) || 60000;
      embed.addFields({ 
        name: '⏱️ Poll interval', 
        value: `${interval / 1000}s`,
        inline: true 
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('config error:', error);
      await interaction.editReply({
        content: '❌ Error while fetching configuration.',
      });
    }
  },
};
