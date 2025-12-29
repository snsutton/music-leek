import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Submission } from '../types';
import { getCurrentRound, getMissingSubmitters, normalizeSongIdentifier } from '../utils/helpers';
import { parseMusicUrl } from '../utils/url-validator';
import { MusicServiceFactory } from '../services/music-service-factory';

export const customId = 'submit-song-modal';

export async function execute(interaction: ModalSubmitInteraction) {
  const songUrl = interaction.fields.getTextInputValue('song-url');

  // Defer reply since API calls might take time
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Step 1: Validate URL and extract track info
  const parsedUrl = parseMusicUrl(songUrl);
  if (!parsedUrl || parsedUrl.platform === 'unsupported') {
    await interaction.editReply({
      content: '❌ Invalid URL! Please provide a Spotify or Apple Music track link.\n\n' +
               'Examples:\n' +
               '• Spotify: `https://open.spotify.com/track/...`\n' +
               '• Apple Music: `https://music.apple.com/us/song/...`'
    });
    return;
  }

  // Step 2: Check if platform is supported
  const service = MusicServiceFactory.getService(parsedUrl.platform);
  if (!service) {
    await interaction.editReply({
      content: `❌ ${parsedUrl.platform === 'spotify' ? 'Spotify' : 'Apple Music'} support is not configured on this bot.\n\nPlease contact the bot administrator to set up API credentials.`
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

  if (Date.now() > round.submissionDeadline) {
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
    submittedAt: Date.now()
  };

  round.submissions.push(submission);
  Storage.saveLeague(league);

  // Send public confirmation message to the channel
  try {
    const channel = await interaction.client.channels.fetch(league.channelId);
    if (channel && channel.isTextBased() && !channel.isDMBased()) {
      // Calculate missing submitters
      const missingSubmitterIds = getMissingSubmitters(league, round);

      // Fetch usernames for missing submitters
      const usernameResults = await Promise.allSettled(
        missingSubmitterIds.map(id => interaction.client.users.fetch(id))
      );

      const missingUsernames = usernameResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value.username;
        }
        return `Unknown User`;
      });

      // Build confirmation message
      let confirmationMessage = `✅ **${interaction.user.username}** just submitted their song!\n\n`;
      confirmationMessage += `**Submissions received:** ${round.submissions.length}/${league.participants.length}\n`;

      if (missingSubmitterIds.length > 0) {
        // Handle Discord's 2000 char limit
        const maxLength = 1500;
        let usernameList = missingUsernames.join(', ');

        if (usernameList.length > maxLength) {
          // Truncate and show count
          const truncated = [];
          let currentLength = 0;

          for (const username of missingUsernames) {
            if (currentLength + username.length + 2 > maxLength) break;
            truncated.push(username);
            currentLength += username.length + 2;
          }

          const remaining = missingUsernames.length - truncated.length;
          usernameList = truncated.join(', ') + ` ... and ${remaining} more`;
        }

        confirmationMessage += `\n**Still waiting for:** ${usernameList}`;
      } else {
        confirmationMessage += `\n🎉 **All submissions are in!**`;
      }

      await channel.send(confirmationMessage);
    }
  } catch (error) {
    console.error('Failed to send public confirmation:', error);
    // Don't block user's ephemeral confirmation
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
