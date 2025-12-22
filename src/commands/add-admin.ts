import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { canManageAdmins, canAddAdmin, isAdmin, MAX_ADMINS } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('add-admin')
  .setDescription('Add an admin to the league (creator only)')
  .setDMPermission(false)
  .addUserOption(option =>
    option.setName('user')
      .setDescription('The user to make an admin')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);

  const league = Storage.getLeagueByGuild(interaction.guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server!', ephemeral: true });
    return;
  }

  if (!canManageAdmins(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only the league creator can add admins!', ephemeral: true });
    return;
  }

  if (isAdmin(league, targetUser.id)) {
    await interaction.reply({ content: `${targetUser.username} is already an admin!`, ephemeral: true });
    return;
  }

  if (!canAddAdmin(league)) {
    await interaction.reply({
      content: `Cannot add more admins! Maximum limit is ${MAX_ADMINS} admins per league.`,
      ephemeral: true
    });
    return;
  }

  league.admins.push(targetUser.id);
  Storage.saveLeague(league);

  await interaction.reply({
    content: `✅ ${targetUser.username} has been added as an admin of **${league.name}**!`,
    ephemeral: false
  });
}
