import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set-message')
    .setDescription('Customize the notification message')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Custom message (use {streamer}, {game}, {title}, {url}, @role)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const message = interaction.options.getString('message');
    const guildId = interaction.guild.id;

    try {
      await interaction.client.db.setCustomMessage(guildId, message);

      let preview = message
        .replace(/{streamer}/g, 'StreamerName')
        .replace(/{game}/g, 'Game Name')
        .replace(/{title}/g, 'Stream Title')
        .replace(/{url}/g, 'https://twitch.tv/streamer');

      const config = await interaction.client.db.getGuildConfig(guildId);
      if (config?.mention_role_id) {
        preview = preview.replace(/@role/g, `<@&${config.mention_role_id}>`);
      } else {
        preview = preview.replace(/@role/g, '@Role');
      }

      await interaction.editReply({
        content: `✅ Custom message set!\n\n**Preview:**\n${preview}\n\n` +
                 `**Available variables:**\n` +
                 `• \`{streamer}\` - Streamer name\n` +
                 `• \`{game}\` - Current game\n` +
                 `• \`{title}\` - Stream title\n` +
                 `• \`{url}\` - Stream link\n` +
                 `• \`@role\` - Mention the configured role`,
      });

      console.log(`💬 Custom message set in ${interaction.guild.name}`);
    } catch (error) {
      console.error('set-message error:', error);
      await interaction.editReply({
        content: '❌ Error while setting the message. Please try again later.',
      });
    }
  },
};
