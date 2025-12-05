import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('set-role')
    .setDescription('Set the role to mention in notifications')
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role to mention (leave empty to remove)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const role = interaction.options.getRole('role');
    const guildId = interaction.guild.id;

    try {
      if (!role) {
        await interaction.client.db.setMentionRole(guildId, null);
        
        return await interaction.editReply({
          content: '✅ Role mention removed from notifications!',
        });
      }

      if (!role.mentionable && role.id !== interaction.guild.id) {
        return await interaction.editReply({
          content: `⚠️  The role ${role} is not mentionable!\n` +
                   `Enable "Allow anyone to mention this role" in role settings.`,
        });
      }

      await interaction.client.db.setMentionRole(guildId, role.id);

      await interaction.editReply({
        content: `✅ Role ${role} will be mentioned in notifications!\n` +
                 `💡 Use **@role** in the custom message to mention the role.`,
      });

      console.log(`🔔 Mention role set: ${role.name} in ${interaction.guild.name}`);
    } catch (error) {
      console.error('set-role error:', error);
      await interaction.editReply({
        content: '❌ Error while setting the role. Please try again later.',
      });
    }
  },
};
