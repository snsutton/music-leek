import { ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { Submission } from '../types';
import { getCurrentRound } from '../utils/helpers';
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

  // Find and remove existing submission if it exists (allows resubmission)
  const existingSubmissionIndex = round.submissions.findIndex(s => s.userId === interaction.user.id);
  const isResubmission = existingSubmissionIndex !== -1;

  if (isResubmission) {
    // Remove the old submission so the new one can replace it
    round.submissions.splice(existingSubmissionIndex, 1);
  }

  // Step 6: Create submission with auto-filled metadata
  const submission: Submission = {
    userId: interaction.user.id,
    songUrl: parsedUrl.originalUrl,
    songTitle: result.title,
    artist: result.artist,
    submittedAt: Date.now()
  };

  round.submissions.push(submission);
  Storage.saveLeague(league);

  // Step 7: Send confirmation with metadata
  await interaction.editReply({
    content: `✅ Your submission has been ${isResubmission ? 'updated' : 'recorded'} for **${league.name}**!\n\n` +
             `**${result.title}**\n` +
             `by **${result.artist}**\n` +
             `${result.albumName ? `from *${result.albumName}*\n` : ''}` +
             `${isResubmission ? '\n*Your previous submission has been replaced.*\n' : ''}` +
             `\nSubmissions: ${round.submissions.length}/${league.participants.length}`
  });
}
