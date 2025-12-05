import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show the bot command guide')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#9146FF')
      .setTitle('📖 Twitch Bot Command Guide')
      .setDescription('Bot for Twitch live notifications, similar to Streamcord')
      .addFields(
        {
          name: '📺 Streamer management',
          value: 
            '`/add-streamer <username> [message]` - Add a streamer with optional message\n' +
            '`/edit-streamer <username> <message>` - Edit streamer message\n' +
            '`/remove-streamer <username>` - Remove streamer\n' +
            '`/list-streamers` - List monitored streamers',
          inline: false,
        },
        {
          name: '⚙️ Configuration',
          value:
            '`/set-channel <channel>` - Set notification channel\n' +
            '`/set-role <role>` - Set mention role\n' +
            '`/set-message <message>` - Customize message\n' +
            '`/config` - Show configuration',
          inline: false,
        },
        {
          name: '🧪 Test & Info',
          value:
            '`/test-notification <username>` - Send a test notification\n' +
            '`/help` - Show this guide',
          inline: false,
        },
        {
          name: '💡 Message variables',
          value:
            '`{streamer}` - Streamer name\n' +
            '`{game}` - Current game\n' +
            '`{title}` - Stream title\n' +
            '`{url}` - Stream link\n' +
            '`@role` - Mention role',
          inline: false,
        },
        {
          name: '🔗 Useful links',
          value:
            '[Discord Bot](https://discord.com/developers/applications) • ' +
            '[Twitch API](https://dev.twitch.tv/console/apps) • ' +
            '[Streamcord](https://streamcord.io/)',
          inline: false,
        }
      )
      .setFooter({ text: 'Twitch Notifier Bot' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
  },
};
