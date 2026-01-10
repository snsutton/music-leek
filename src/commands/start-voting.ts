import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { isAdmin } from '../utils/permissions';
import { NotificationService } from '../services/notification-service';
import { NotificationTemplates } from '../services/notification-templates';
import { SpotifyPlaylistService } from '../services/spotify-playlist-service';
import { resolveGuildContext } from '../utils/dm-context';

export const data = new SlashCommandBuilder()
  .setName('start-voting')
  .setDescription('Start the voting phase (admin only)')
  .setDMPermission(true);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Resolve guild context (server or DM)
  const { guildId } = resolveGuildContext(interaction);

  if (!guildId) {
    await interaction.reply({
      content: '❌ This command requires league context.\n\n' +
               'Please run this command from the server where your league is hosted, ' +
               'or wait for a notification from your league.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const league = Storage.getLeagueByGuild(guildId);

  if (!league) {
    await interaction.reply({ content: 'No league found for this server!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (!isAdmin(league, interaction.user.id)) {
    await interaction.reply({ content: 'Only league admins can start voting!', flags: MessageFlags.Ephemeral });
    return;
  }

  const round = getCurrentRound(league);

  if (!round) {
    await interaction.reply({ content: 'No active round!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.status !== 'submission') {
    await interaction.reply({ content: 'Voting has already started or round is complete!', flags: MessageFlags.Ephemeral });
    return;
  }

  if (round.submissions.length === 0) {
    await interaction.reply({ content: 'No submissions yet!', flags: MessageFlags.Ephemeral });
    return;
  }

  // Create Spotify playlist if integration exists
  if (league.spotifyIntegration) {
    try {
      console.log(`[StartVoting] Creating Spotify playlist for round ${round.roundNumber}...`);
      const playlistData = await SpotifyPlaylistService.createRoundPlaylist(league, round);
      if (playlistData) {
        round.playlist = playlistData;
        console.log(`[StartVoting] Playlist created: ${playlistData.playlistUrl}`);
      }
    } catch (error) {
      console.error('[StartVoting] Failed to create playlist:', error);
      // Continue with voting anyway - playlist creation failure shouldn't block voting
    }
  }

  round.status = 'voting';

  // Recalculate voting deadline based on when voting actually starts (not from round start)
  if (round.votingDurationMs) {
    const now = Date.now();
    round.votingDeadline = now + round.votingDurationMs;
  }

  Storage.saveLeague(league);

  // Send voting started notification to all participants
  const notificationEmbed = NotificationTemplates.votingStarted(league, round);
  const results = await NotificationService.sendBulkDM(
    interaction.client,
    league.participants,
    { embeds: [notificationEmbed] },
    100,
    league.guildId,
    'voting_started'
  );

  // Mark notification as sent
  round.notificationsSent.votingStarted = true;
  Storage.saveLeague(league);

  const summary = NotificationService.getNotificationSummary(results);

  const embed = new EmbedBuilder()
    .setColor(0x1DB954)
    .setTitle(`🎵 Round ${round.roundNumber} - Voting Phase`)
    .setDescription(
      `**Prompt:** ${round.prompt}\n\n` +
      (round.playlist
        ? `🎧 **[Listen to all submissions with this Spotify playlist](${round.playlist.playlistUrl})**\n\n`
        : ''
      ) +
      `**Submissions:**\n`
    )
    .setFooter({ text: `Use /vote to cast your votes! Deadline: ${new Date(round.votingDeadline).toLocaleString()}` });

  let submissionList = '';
  round.submissions.forEach((sub, index) => {
    submissionList += `\n**${index + 1}.** ${sub.songTitle} - ${sub.artist}\n${sub.songUrl}\n`;
  });

  embed.setDescription(embed.data.description + submissionList);

  await interaction.reply({
    content: `🗳️ **Voting has started for Round ${round.roundNumber}!**\n\n` +
             `Review the submissions and use \`/vote\` to rank your favorites!\n\n` +
             `Notifications sent to ${summary.successful}/${summary.total} participants.`,
    embeds: [embed]
  });
}
