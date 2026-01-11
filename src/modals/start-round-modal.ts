import { ModalSubmitInteraction, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Storage } from '../utils/storage';
import { Round } from '../types';
import { getCurrentRound } from '../utils/helpers';
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

  const submissionHours = submissionDays * 24;
  const votingHours = votingDays * 24;

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

  // Check if this is the first round and Spotify is required
  const isFirstRound = league.rounds.length === 0;
  if (isFirstRound) {
    // Check if Spotify integration exists
    if (!league.spotifyIntegration) {
      try {
        const authUrl = SpotifyOAuthService.generateAuthUrl(league.createdBy, guildId);

        const button = new ButtonBuilder()
          .setLabel('Connect Spotify Account')
          .setStyle(ButtonStyle.Link)
          .setURL(authUrl);

        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(button);

        await interaction.reply({
          content: '🎵 **Spotify Connection Required**\n\n' +
                   'Before starting the first round, you need to connect a Spotify account to enable automatic playlist creation during voting rounds.\n\n' +
                   'Click the button below to connect your Spotify account:',
          components: [row],
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        console.error('[StartRound] Failed to generate Spotify auth URL:', error);
        await interaction.reply({
          content: '❌ **Configuration Error**\n\n' +
                   'Spotify integration is not properly configured on this bot. Please contact the bot administrator.\n\n' +
                   'The first round cannot be started without Spotify integration.',
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    // Check if the token is still valid
    try {
      const validToken = await SpotifyOAuthService.getValidToken(league.createdBy);
      if (!validToken) {
        const authUrl = SpotifyOAuthService.generateAuthUrl(league.createdBy, guildId);

        const button = new ButtonBuilder()
          .setLabel('Reconnect Spotify Account')
          .setStyle(ButtonStyle.Link)
          .setURL(authUrl);

        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(button);

        await interaction.reply({
          content: '🎵 **Spotify Connection Expired**\n\n' +
                   'Your Spotify connection has expired or is no longer valid. Please reconnect your account to start the first round.\n\n' +
                   'Click the button below to reconnect:',
          components: [row],
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    } catch (error) {
      console.error('[StartRound] Error validating Spotify token:', error);
      await interaction.reply({
        content: '❌ **Error Checking Spotify Connection**\n\n' +
                 'An error occurred while validating your Spotify connection. Please try again later or contact the bot administrator.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  }

  const now = Date.now();
  const themeDeadline = now + (24 * 60 * 60 * 1000); // Fixed 24h for theme phase
  const round: Round = {
    roundNumber: nextRoundNumber,
    prompt: '', // Empty initially - will be set when theme is selected
    adminPrompt: prompt, // Store admin's prompt as fallback
    status: 'theme-submission', // Start in theme submission phase
    startedAt: now,
    themeSubmissionDeadline: themeDeadline,
    submissionDeadline: themeDeadline + (submissionHours * 60 * 60 * 1000),
    votingDeadline: themeDeadline + ((submissionHours + votingHours) * 60 * 60 * 1000), // Placeholder - will be recalculated when voting starts
    votingDurationMs: votingHours * 60 * 60 * 1000, // Store voting duration for recalculation
    themeSubmissions: [
      {
        userId: interaction.user.id,
        theme: prompt,
        submittedAt: now
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

  // Send round started notification to all participants (with theme phase)
  const embed = NotificationTemplates.roundStartedWithThemePhase(league, round);
  const results = await NotificationService.sendBulkDM(
    interaction.client,
    league.participants,
    { embeds: [embed] },
    100,
    league.guildId,
    'round_started'
  );

  // Mark notification as sent
  round.notificationsSent.roundStarted = true;
  Storage.saveLeague(league);

  const summary = NotificationService.getNotificationSummary(results);

  // Post round start notification to league channel
  try {
    const channel = await interaction.client.channels.fetch(league.channelId);
    if (channel && channel.isTextBased() && !channel.isDMBased()) {
      await channel.send(
        `🎵 **Round ${round.roundNumber} has started!**\n\n` +
        `**Theme Submission Phase:** Submit your theme ideas for the next 24 hours!\n` +
        `**Theme Deadline:** <t:${Math.floor(round.themeSubmissionDeadline! / 1000)}:F>\n\n` +
        `Use \`/submit-theme\` to submit your theme ideas. One theme will be randomly selected!`
      );
    }
  } catch (error) {
    console.error(`[StartRound] Error posting round start to channel:`, error);
  }

  await interaction.editReply({
    content: `🎵 **Round ${round.roundNumber}** has started in **${league.name}**!\n\n` +
             `**Theme Submission Phase:** Players have 24 hours to submit theme ideas!\n` +
             `**Theme Deadline:** <t:${Math.floor(round.themeSubmissionDeadline! / 1000)}:F>\n\n` +
             `Your fallback theme has been submitted and will be included in the random drawing.\n` +
             `**Themes submitted:** 1/${league.participants.length}\n\n` +
             `Notifications sent to ${summary.successful}/${summary.total} participants.\n\n` +
             `Players can use \`/submit-theme\` to submit their theme ideas!`
  });
}
