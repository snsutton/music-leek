import { ChatInputCommandInteraction, SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';

export const data = new SlashCommandBuilder()
  .setName('submit-song')
  .setDescription('Submit a song for the current round (opens DM)')
  .setDMPermission(false);

export async function execute(interaction: ChatInputCommandInteraction) {
  // This command can be used in server or DM, but we need a guildId
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: 'Please run this command from the server where the league is hosted!',
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

  // Validate submission phase is active
  if (round.status !== 'submission') {
    await interaction.reply({
      content: 'Submission phase has ended for this round!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // Validate deadline hasn't passed
  if (Date.now() > round.submissionDeadline) {
    await interaction.reply({
      content: 'Submission deadline has passed!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`submit-song-modal:${guildId}`)
    .setTitle(`Submit: Round ${round.roundNumber}`);

  // Show theme in placeholder so users see the full prompt
  const themeTruncated = round.prompt.length > 50
    ? round.prompt.substring(0, 50) + '...'
    : round.prompt;

  const songUrlInput = new TextInputBuilder()
    .setCustomId('song-url')
    .setLabel('Song URL (Spotify)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(`Theme: "${themeTruncated}"`)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(songUrlInput);

  modal.addComponents(firstActionRow);

  await interaction.showModal(modal);
}
