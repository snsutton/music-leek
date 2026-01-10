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

  // Check if this is the first round and Spotify is required
  const isFirstRound = league.rounds.length === 0;
  if (isFirstRound) {
    // Check if Spotify integration exists
    if (!league.spotifyIntegration) {
      try {
        const authUrl = SpotifyOAuthService.generateAuthUrl(league.createdBy, interaction.guildId);

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
        const authUrl = SpotifyOAuthService.generateAuthUrl(league.createdBy, interaction.guildId);

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
  const round: Round = {
    roundNumber: nextRoundNumber,
    prompt,
    status: 'submission',
    startedAt: now,
    submissionDeadline: now + (submissionHours * 60 * 60 * 1000),
    votingDeadline: now + ((submissionHours + votingHours) * 60 * 60 * 1000), // Placeholder - will be recalculated when voting starts
    votingDurationMs: votingHours * 60 * 60 * 1000, // Store voting duration for recalculation
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
