import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, toTimestamp } from '../utils/helpers';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('submit-theme')
  .setDescription('Submit a theme idea for the current round')
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Resolve guild context (server or DM)
  const { guildId } = resolveGuildContext(interaction);

  if (!guildId) {
    await interaction.reply({
      content: '❌ This command requires league context.\n\n' +
               'Please run this command from the server where your league is hosted, ' +
               'or wait for a notification from your league.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if league exists
  const league = Storage.getLeagueByGuild(guildId);
  if (!league) {
    await interaction.reply({
      content: 'No league found for this server!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Check if user is a participant
  if (!league.participants.includes(interaction.user.id)) {
    await interaction.reply({
      content: 'You are not in this league! Use `/join-league` first.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Get current round
  const round = getCurrentRound(league);
  if (!round) {
    await interaction.reply({
      content: 'No active round! Wait for an admin to start one.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Validate theme submission phase is active
  if (round.status !== 'theme-submission') {
    await interaction.reply({
      content: 'Theme submission phase has ended for this round!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Validate deadline hasn't passed
  if (!round.themeSubmissionDeadline || Date.now() > toTimestamp(round.themeSubmissionDeadline)) {
    await interaction.reply({
      content: 'Theme submission deadline has passed!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`submit-theme-modal:${guildId}`)
    .setTitle(`Submit Theme: Round ${round.roundNumber}`);

  const themeInput = new TextInputBuilder()
    .setCustomId('theme')
    .setLabel('Your Theme Idea')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('e.g., Songs about childhood memories')
    .setMaxLength(200)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(themeInput);

  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}
