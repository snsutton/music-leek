import { ChatInputCommandInteraction, SlashCommandBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { Storage } from '../utils/storage';
import { isCreator } from '../utils/permissions';

export const data = new SlashCommandBuilder()
  .setName('delete-league')
  .setDescription('Permanently delete this server\'s league and all data (creator only)')
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

  if (!isCreator(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only the league creator can delete the league!', flags: MessageFlags.Ephemeral });
    return;
  }

  // Suggest using /end-league instead if league is active
  const hasActiveRounds = league.rounds.some(r => r.status !== 'completed');
  const warningText = hasActiveRounds
    ? `\n\n⚠️ **Note:** This league has active rounds. Consider using \`/end-league\` instead to end the league gracefully and preserve results.`
    : '';

  const modal = new ModalBuilder()
    .setCustomId(`delete-league-modal:${interaction.guildId}`)
    .setTitle('⚠️ Confirm League Deletion');

  const confirmInput = new TextInputBuilder()
    .setCustomId('league-name-confirmation')
    .setLabel('Type the league name to confirm')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(league.name)
    .setRequired(true);

  const warningInput = new TextInputBuilder()
    .setCustomId('deletion-warning')
    .setLabel('This will permanently delete all league data!')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(
      `All data will be permanently deleted:\n` +
      `• ${league.rounds.length} round${league.rounds.length === 1 ? '' : 's'}\n` +
      `• ${league.rounds.reduce((sum, r) => sum + r.submissions.length, 0)} submissions\n` +
      `• ${league.rounds.reduce((sum, r) => sum + r.votes.length, 0)} votes\n` +
      `• ${league.participants.length} participants${warningText}`
    )
    .setRequired(false);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(warningInput);
  const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(confirmInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);
}
