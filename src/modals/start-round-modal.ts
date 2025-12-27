import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Round } from '../types';
import { getCurrentRound } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { DEFAULT_SUBMISSION_DAYS, DEFAULT_VOTING_DAYS } from '../constants';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';

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

  // Check if starting round would exceed total rounds
  const nextRoundNumber = league.rounds.length + 1;
  if (nextRoundNumber > league.totalRounds) {
    await interaction.reply({
      content: `❌ Cannot start round ${nextRoundNumber}. This league is limited to ${league.totalRounds} rounds.\n\nThe league has been completed!`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const now = Date.now();
  const round: Round = {
    roundNumber: nextRoundNumber,
    prompt,
    status: 'submission',
    startedAt: now,
    submissionDeadline: now + (submissionHours * 60 * 60 * 1000),
    votingDeadline: now + ((submissionHours + votingHours) * 60 * 60 * 1000),
    submissions: [],
    votes: [],
    notificationsSent: {
      roundStarted: false,
      submissionReminder: false,
      votingStarted: false,
      votingReminder: false,
      allVotesReceived: false
    }
  };

  league.rounds.push(round);
  league.currentRound = league.rounds.length;
  Storage.saveLeague(league);

  // Send round started notification to all participants
  const embed = NotificationTemplates.roundStarted(league, round);
  const results = await NotificationService.sendBulkDM(
    interaction.client,
    league.participants,
    { embeds: [embed] },
    100
  );

  // Mark notification as sent
  round.notificationsSent.roundStarted = true;
  Storage.saveLeague(league);

  const summary = NotificationService.getNotificationSummary(results);

  await interaction.reply({
    content: `🎵 **Round ${round.roundNumber}** has started in **${league.name}**!\n\n` +
             `**Prompt:** ${prompt}\n` +
             `**Submission Deadline:** <t:${Math.floor(round.submissionDeadline / 1000)}:F>\n\n` +
             `Notifications sent to ${summary.successful}/${summary.total} participants.\n\n` +
             `Use \`/submit-song\` to submit your entry!`
  });
}
