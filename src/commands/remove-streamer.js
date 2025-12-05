import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('remove-streamer')
    .setDescription('Remove a streamer from monitoring')
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
        .slice(0, 25) // Discord limita a 25 opzioni
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
    const guildId = interaction.guild.id;

    try {
      const streamer = await interaction.client.db.getStreamer(guildId, username);

      if (!streamer) {
        return await interaction.editReply({
          content: `❌ **${username}** is not monitored!`,
        });
      }

      await interaction.client.db.removeStreamer(guildId, username);

      await interaction.editReply({
        content: `✅ **${streamer.display_name || username}** removed from the list!`,
      });

      console.log(`➖ Streamer removed: ${username} from ${interaction.guild.name}`);
    } catch (error) {
      console.error('remove-streamer error:', error);
      await interaction.editReply({
        content: '❌ Error while removing the streamer. Please try again later.',
      });
    }
  },
};
