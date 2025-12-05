import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('list-streamers')
    .setDescription('Show all monitored streamers')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply();

    const guildId = interaction.guild.id;

    try {
      const streamers = await interaction.client.db.getGuildStreamers(guildId);

      if (streamers.length === 0) {
        return await interaction.editReply({
          content: '📭 No streamers are monitored in this server.\n💡 Use `/add-streamer` to add one!',
        });
      }

      const usernames = streamers.map(s => s.username);
      const liveStreams = await interaction.client.twitchAPI.getStreams(usernames);
      const liveMap = new Map(liveStreams.map(s => [s.user_login.toLowerCase(), s]));

      let description = `Total: **${streamers.length}** streamers\n\n`;
      
      for (const streamer of streamers) {
        const isLive = liveMap.has(streamer.username);
        const status = isLive ? '🔴 **LIVE**' : '⚫ Offline';
        const name = streamer.display_name || streamer.username;
        
        if (isLive) {
          const stream = liveMap.get(streamer.username);
          description += `${status} **[${name}](https://twitch.tv/${streamer.username})**\n`;
          description += `   └ ${stream.game_name || 'No game'} • ${stream.viewer_count} 👥\n\n`;
        } else {
          description += `${status} **${name}**\n\n`;
        }
      }

      const embed = new EmbedBuilder()
        .setColor('#9146FF')
        .setTitle('📺 Monitored Streamers')
        .setDescription(description || 'No streamers')
        .setFooter({ text: interaction.guild.name })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('list-streamers error:', error);
      await interaction.editReply({
        content: '❌ Error while retrieving the list. Please try again later.',
      });
    }
  },
};
