import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { isCreator } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('list-admins')
  .setDescription('List all admins of the league')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  const league = Storage.getLeagueByGuild(interaction.guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server!', flags: MessageFlags.Ephemeral });
    return;
  }

  // Fetch user information for each admin
  const adminList: string[] = [];

  for (const adminId of league.admins) {
    try {
      const user = await interaction.client.users.fetch(adminId);
      const role = isCreator(league, adminId) ? '👑 Creator' : '🛡️ Admin';
      adminList.push(`${role} - ${user.username}`);
    } catch (error) {
      adminList.push(`🛡️ Admin - Unknown User (${adminId})`);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x1DB954)
    .setTitle(`👥 Admins of ${league.name}`)
    .setDescription(adminList.length > 0 ? adminList.join('\n') : 'No admins found.');

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}
