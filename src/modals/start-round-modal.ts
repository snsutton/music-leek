import { ModalSubmitInteraction } from 'discord.js';
import { Storage } from '../utils/storage';
import { Round } from '../types';
import { getCurrentRound } from '../utils/helpers';

export const customId = 'start-round-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const leagueId = interaction.fields.getTextInputValue('league-id');
  const prompt = interaction.fields.getTextInputValue('prompt');
  const submissionHoursStr = interaction.fields.getTextInputValue('submission-hours');
  const votingHoursStr = interaction.fields.getTextInputValue('voting-hours');

  const submissionHours = parseInt(submissionHoursStr) || 72;
  const votingHours = parseInt(votingHoursStr) || 48;

  const league = Storage.getLeague(leagueId);

  if (!league) {
    await interaction.reply({ content: 'League not found!', ephemeral: true });
    return;
  }

  if (league.createdBy !== interaction.user.id) {
    await interaction.reply({ content: 'Only the league creator can start rounds!', ephemeral: true });
    return;
  }

  const currentRound = getCurrentRound(league);
  if (currentRound && currentRound.status !== 'completed') {
    await interaction.reply({ content: 'The current round is not completed yet!', ephemeral: true });
    return;
  }

  const now = Date.now();
  const round: Round = {
    roundNumber: league.rounds.length + 1,
    prompt,
    status: 'submission',
    startedAt: now,
    submissionDeadline: now + (submissionHours * 60 * 60 * 1000),
    votingDeadline: now + ((submissionHours + votingHours) * 60 * 60 * 1000),
    submissions: [],
    votes: []
  };

  league.rounds.push(round);
  league.currentRound = league.rounds.length;
  Storage.saveLeague(league);

  await interaction.reply({
    content: `🎵 **Round ${round.roundNumber}** has started in **${league.name}**!\n\n**Prompt:** ${prompt}\n**Submission Deadline:** <t:${Math.floor(round.submissionDeadline / 1000)}:F>\n\nUse \`/submit-song\` to submit your entry!`,
    ephemeral: false
  });
}
