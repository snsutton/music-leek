import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Round } from '../types';
import { getCurrentRound } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { DEFAULT_SUBMISSION_DAYS, DEFAULT_VOTING_DAYS } from '../constants';

export const customId = 'start-round-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const prompt = interaction.fields.getTextInputValue('prompt');
  const submissionDaysStr = interaction.fields.getTextInputValue('submission-days');
  const votingDaysStr = interaction.fields.getTextInputValue('voting-days');

  const submissionDays = parseInt(submissionDaysStr) || DEFAULT_SUBMISSION_DAYS;
  const votingDays = parseInt(votingDaysStr) || DEFAULT_VOTING_DAYS;

  const submissionHours = submissionDays * 24;
  const votingHours = votingDays * 24;

  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  const league = Storage.getLeagueByGuild(interaction.guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server! Use `/create-league` to create one.', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!isAdmin(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only league admins can start rounds!', flags: MessageFlags.Ephemeral });
    return;
  }

  const currentRound = getCurrentRound(league);
  if (currentRound && currentRound.status !== 'completed') {
    await interaction.reply({ content: 'The current round is not completed yet!', flags: MessageFlags.Ephemeral });
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
    content: `🎵 **Round ${round.roundNumber}** has started in **${league.name}**!\n\n**Prompt:** ${prompt}\n**Submission Deadline:** <t:${Math.floor(round.submissionDeadline / 1000)}:F>\n\nUse \`/submit-song\` to submit your entry!`
  });
}
