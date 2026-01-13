import { Client } from 'discord.js';
import { League, Round } from '../types';
import { Storage } from '../utils/storage';
import { SpotifyPlaylistService } from './spotify-playlist-service';
import { NotificationService } from './notification-service';
import { NotificationTemplates } from './notification-templates';

/**
 * Service for managing voting phase transitions
 */
export class VotingService {
  /**
   * Transition a round from submission to voting phase
   * Creates Spotify playlist, updates status, sends notifications
   */
  static async startVoting(
    client: Client,
    league: League,
    round: Round,
    options?: {
      logPrefix?: string;
      skipChannelPost?: boolean;
    }
  ): Promise<void> {
    const logPrefix = options?.logPrefix || 'VotingService';

    console.log(`[${logPrefix}] Starting voting for ${league.name} Round ${round.roundNumber}`);

    if (round.submissions.length === 0) {
      console.log(`[${logPrefix}] No submissions for round ${round.roundNumber}, cannot start voting`);
      throw new Error('No submissions available');
    }

    // Create Spotify playlist if integration exists
    if (league.spotifyIntegration) {
      try {
        console.log(`[${logPrefix}] Creating Spotify playlist for round ${round.roundNumber}...`);
        const guild = await client.guilds.fetch(league.guildId);
        const playlistData = await SpotifyPlaylistService.createRoundPlaylist(league, round, guild?.name);
        if (playlistData) {
          round.playlist = playlistData;
          console.log(`[${logPrefix}] Playlist created: ${playlistData.playlistUrl}`);
        }
      } catch (error) {
        console.error(`[${logPrefix}] Failed to create playlist:`, error);
        // Continue with voting anyway - playlist creation failure shouldn't block voting
      }
    }

    // Transition to voting
    round.status = 'voting';

    // Recalculate voting deadline based on when voting actually starts (not from round start)
    if (round.votingDurationMs) {
      const now = Date.now();
      round.votingDeadline = now + round.votingDurationMs;
    }

    Storage.saveLeague(league);

    // Post to channel (unless explicitly skipped)
    if (!options?.skipChannelPost) {
      try {
        const channel = await client.channels.fetch(league.channelId);
        if (channel && channel.isTextBased() && !channel.isDMBased()) {
          let message = `🗳️ **Voting has started for Round ${round.roundNumber}!**\n\n` +
            `**Prompt:** ${round.prompt}\n\n`;

          if (round.playlist) {
            message += `🎧 **[Listen to all submissions with this Spotify playlist](${round.playlist.playlistUrl})**\n\n`;
          }

          message += `Review the submissions and use \`/vote\` to rank your favorites!\n\n` +
            `**Voting Deadline:** <t:${Math.floor(round.votingDeadline / 1000)}:F>`;

          await channel.send(message);
        }
      } catch (error) {
        console.error(`[${logPrefix}] Error posting voting start to channel:`, error);
      }
    }

    // Send DM notifications to all participants
    const notificationEmbed = NotificationTemplates.votingStarted(league, round);
    await NotificationService.sendBulkDM(
      client,
      league.participants,
      { embeds: [notificationEmbed] },
      100,
      league.guildId,
      'voting_started'
    );

    // Mark notification as sent
    round.notificationsSent.votingStarted = true;
    Storage.saveLeague(league);

    console.log(`[${logPrefix}] Voting started for round ${round.roundNumber}`);
  }
}
