import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Submission } from '../types';
import { getCurrentRound, getMissingSubmitters, normalizeSongIdentifier, toTimestamp, toISOString } from '../utils/helpers';
import { parseMusicUrl } from '../utils/url-validator';
import { MusicServiceFactory } from '../services/music-service-factory';
import { NotificationTemplates } from '../services/notification-templates';
import { NotificationService } from '../services/notification-service';

export const customId = 'submit-song-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const songUrl = interaction.fields.getTextInputValue('song-url');

  // Defer reply since API calls might take time
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Step 1: Validate URL and extract track info
  const parsedUrl = parseMusicUrl(songUrl);
  if (!parsedUrl || parsedUrl.platform === 'unsupported') {
    await interaction.editReply({
      content: '❌ Invalid URL! Please provide a Spotify track link.\n\n' +
               'Example:\n' +
               '• Spotify: `https://open.spotify.com/track/...`\n'
    });
    return;
  }

  // Step 2: Check if platform is supported
  const service = MusicServiceFactory.getService(parsedUrl.platform);
  if (!service) {
    await interaction.editReply({
      content: `❌ Spotify support is not configured on this bot.\n\nPlease contact the bot administrator to set up API credentials.`
    });
    return;
  }

  // Step 3: Fetch metadata from the music service
  const result = await service.fetchSongMetadata(parsedUrl.trackId);

  // Step 4: Handle API errors
  if ('code' in result) {
    const errorMsg = result.retryable
      ? `⚠️ ${result.message}\n\nPlease try again in a moment.`
      : `❌ ${result.message}`;
    await interaction.editReply({ content: errorMsg });
    return;
  }

  // Step 5: Extract guildId and validate league/round
  const guildId = interaction.customId.split(':')[1];

  if (!guildId) {
    await interaction.editReply({ content: 'Invalid submission! Please try again.' });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);

  if (!league) {
    await interaction.editReply({ content: 'League not found!' });
    return;
  }

  if (!league.participants.includes(interaction.user.id)) {
    await interaction.editReply({ content: 'You are not in this league! Use `/join-league` first.' });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.editReply({ content: 'No active round!' });
    return;
  }

  if (round.status !== 'submission') {
    await interaction.editReply({ content: 'Submission phase has ended!' });
    return;
  }

  if (Date.now() > toTimestamp(round.submissionDeadline)) {
    await interaction.editReply({ content: 'Submission deadline has passed!' });
    return;
  }

  // Step 6: Check for duplicate songs by other players
  const newSongIdentifier = normalizeSongIdentifier(result.title, result.artist);

  const duplicateSubmission = round.submissions.find(s => {
    // Skip the current user's submission (they can change their own song)
    if (s.userId === interaction.user.id) {
      return false;
    }

    // Compare normalized identifiers
    const existingIdentifier = normalizeSongIdentifier(s.songTitle, s.artist);
    return existingIdentifier === newSongIdentifier;
  });

  if (duplicateSubmission) {
    await interaction.editReply({
      content: `❌ This song has already been submitted by another player!\n\n` +
               `**${result.title}**\n` +
               `by **${result.artist}**\n\n` +
               `Please choose a different song.`
    });
    return;
  }

  // Step 7: Find and remove existing submission if it exists (allows resubmission)
  const existingSubmissionIndex = round.submissions.findIndex(s => s.userId === interaction.user.id);
  const isResubmission = existingSubmissionIndex !== -1;

  if (isResubmission) {
    // Remove the old submission so the new one can replace it
    round.submissions.splice(existingSubmissionIndex, 1);
  }

  // Step 8: Create submission with auto-filled metadata
  const submission: Submission = {
    userId: interaction.user.id,
    songUrl: parsedUrl.originalUrl,
    songTitle: result.title,
    artist: result.artist,
    submittedAt: toISOString()
  };

  round.submissions.push(submission);
  Storage.saveLeague(league);

  // Calculate missing submitters
  const missingSubmitterIds = getMissingSubmitters(league, round);

  // Channel message: When 1 player remains (holding up the stage)
  if (missingSubmitterIds.length === 1) {
    try {
      const channel = await interaction.client.channels.fetch(league.channelId);
      if (channel && channel.isTextBased() && !channel.isDMBased()) {
        // Fetch username for the remaining submitter
        const waitingUser = await interaction.client.users.fetch(missingSubmitterIds[0]);
        const waitingUsername = waitingUser?.username || 'Unknown User';

        await channel.send(
          `⏰ **Waiting on 1 player to submit their song!**\n\n` +
          `${waitingUsername}, we're waiting for you!\n\n` +
          `Use \`/submit-song\` to submit your song.`
        );
      }
    } catch (error) {
      console.error('Failed to send final player notification:', error);
    }
  }

  // DM reminder: When ≤3 players remain
  if (missingSubmitterIds.length > 0 && missingSubmitterIds.length <= 3) {
    const reminderEmbed = NotificationTemplates.submissionRunningOut(league, round, missingSubmitterIds.length);
    await NotificationService.sendBulkDM(
      interaction.client,
      missingSubmitterIds,
      { embeds: [reminderEmbed] },
      100,
      league.guildId,
      'submission_reminder'
    );
  }

  // Step 9: Send confirmation with metadata
  await interaction.editReply({
    content: `✅ Your submission has been ${isResubmission ? 'updated' : 'recorded'} for **${league.name}**!\n\n` +
             `**${result.title}**\n` +
             `by **${result.artist}**\n` +
             `${result.albumName ? `from *${result.albumName}*\n` : ''}` +
             `${isResubmission ? '\n*Your previous submission has been replaced.*\n' : ''}` +
             `\nSubmissions: ${round.submissions.length}/${league.participants.length}`
  });
}
