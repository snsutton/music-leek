import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Round } from '../types';
import { getCurrentRound, toISOString, toTimestamp, snapToNoonEastern } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { DEFAULT_SUBMISSION_DAYS, DEFAULT_VOTING_DAYS } from '../constants';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';
import { SpotifyOAuthService } from '../services/spotify-oauth-service';

export const customId = 'start-round-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const prompt = interaction.fields.getTextInputValue('prompt');
  const submissionDaysStr = interaction.fields.getTextInputValue('submission-days');
  const votingDaysStr = interaction.fields.getTextInputValue('voting-days');

  const submissionDays = parseInt(submissionDaysStr) || DEFAULT_SUBMISSION_DAYS;
  const votingDays = parseInt(votingDaysStr) || DEFAULT_VOTING_DAYS;

  // Extract guildId from customId (format: start-round-modal:guildId)
  const guildId = interaction.customId.split(':')[1] || interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server!', flags: MessageFlags.Ephemeral });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);

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
  const themeDeadline = snapToNoonEastern(now, 1); // Next noon EST, >= 24h from now
  const submissionDeadline = snapToNoonEastern(themeDeadline, submissionDays);
  const votingDeadline = snapToNoonEastern(submissionDeadline, votingDays); // Placeholder - recalculated when voting starts
  const round: Round = {
    roundNumber: nextRoundNumber,
    prompt: '', // Empty initially - will be set when theme is selected
    adminPrompt: prompt, // Store admin's prompt as fallback
    status: 'theme-submission', // Start in theme submission phase
    startedAt: toISOString(now),
    themeSubmissionDeadline: toISOString(themeDeadline),
    submissionDeadline: toISOString(submissionDeadline),
    votingDeadline: toISOString(votingDeadline),
    votingDurationDays: votingDays, // Store voting duration for deadline recalculation
    themeSubmissions: [
      {
        userId: interaction.user.id,
        theme: prompt,
        submittedAt: toISOString(now)
      }
    ], // Include admin's theme in the drawing
    submissions: [],
    votes: [],
    notificationsSent: {
      roundStarted: false,
      themeSubmissionReminder: false,
      themeSelected: false,
      submissionReminder: false,
      votingStarted: false,
      votingReminder: false,
      allVotesReceived: false
    }
  };

  league.rounds.push(round);
  league.currentRound = league.rounds.length;
  Storage.saveLeague(league);

  // Defer reply immediately to avoid Discord timeout
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Send round started notification to all participants (with theme phase) - dual notification
  const notification = NotificationTemplates.roundStartedWithThemePhase(league, round);
  const { dmResults, channelSuccess } = await NotificationService.sendDualNotification(
    interaction.client,
    league.participants,
    { embeds: [notification.dm] },
    notification.channel,
    league.channelId,
    {
      guildId: league.guildId,
      notificationType: 'round_started',
      appendJoinBlurb: true
    }
  );

  // Mark notification as sent
  round.notificationsSent.roundStarted = true;
  Storage.saveLeague(league);

  const summary = NotificationService.getNotificationSummary(dmResults);

  await interaction.editReply({
    content: `🎵 **Round ${round.roundNumber}** has started in **${league.name}**!\n\n` +
             `**Theme Submission Phase:** Players have 24 hours to submit theme ideas!\n` +
             `**Theme Deadline:** <t:${Math.floor(toTimestamp(round.themeSubmissionDeadline!) / 1000)}:F>\n\n` +
             `Your fallback theme has been submitted and will be included in the random drawing.\n` +
             `**Themes submitted:** 1/${league.participants.length}\n\n` +
             `**Notifications:** Channel ${channelSuccess ? '✅' : '❌'} | DMs: ${summary.successful}/${summary.total} delivered\n\n` +
             `Players can use \`/submit-theme\` to submit their theme ideas!`
  });

  // Warn the developer early if the bot's Spotify connection needs reconnecting before voting creates the playlist
  const botToken = await SpotifyOAuthService.getBotToken();
  const developerDiscordId = process.env.DEVELOPER_DISCORD_ID;
  if (!botToken && developerDiscordId) {
    console.log('[StartRound] Bot Spotify token unavailable, notifying developer');
    await NotificationService.sendDM(
      interaction.client,
      developerDiscordId,
      { embeds: [NotificationTemplates.spotifyReconnectNeededDeveloper(league, round)] },
      league.guildId,
      'spotify_reconnect_needed'
    );
  }
}
