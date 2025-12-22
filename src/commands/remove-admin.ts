import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { canManageAdmins, isAdmin, isCreator } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('remove-admin')
  .setDescription('Remove an admin from the league (creator only)')
  .setDMPermission(false)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The admin to remove')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);

  const league = Storage.getLeagueByGuild(interaction.guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!canManageAdmins(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only the league creator can remove admins!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!isAdmin(league, targetUser.id)) {
    await interaction.reply({ content: `${targetUser.username} is not an admin!`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (isCreator(league, targetUser.id)) {
    await interaction.reply({
      content: 'Cannot remove the league creator! The creator will always be an admin.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  league.admins = league.admins.filter(id => id !== targetUser.id);
  Storage.saveLeague(league);

  await interaction.reply({
    content: `✅ ${targetUser.username} has been removed as an admin of **${league.name}**.`
  });
}
