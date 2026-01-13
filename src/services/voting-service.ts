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

    // Send dual notifications (channel + DMs) unless channel post is explicitly skipped
    if (!options?.skipChannelPost) {
      const notification = NotificationTemplates.votingStarted(league, round);
      await NotificationService.sendDualNotification(
        client,
        league.participants,
        { embeds: [notification.dm] },
        notification.channel,
        league.channelId,
        {
          guildId: league.guildId,
          notificationType: 'voting_started',
          appendJoinBlurb: true
        }
      );
    } else {
      // If channel post is skipped, still send DMs
      const notification = NotificationTemplates.votingStarted(league, round);
      await NotificationService.sendBulkDM(
        client,
        league.participants,
        { embeds: [notification.dm] },
        100,
        league.guildId,
        'voting_started'
      );
    }

    // Mark notification as sent
    round.notificationsSent.votingStarted = true;
    Storage.saveLeague(league);

    console.log(`[${logPrefix}] Voting started for round ${round.roundNumber}`);
  }
}
