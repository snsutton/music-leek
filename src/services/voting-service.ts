import { Client } from 'discord.js';
import { League, Round } from '../types';
import { Storage } from '../utils/storage';
import { SpotifyPlaylistService } from './spotify-playlist-service';
import { NotificationService } from './notification-service';
import { NotificationTemplates } from './notification-templates';
import { toISOString } from '../utils/helpers';
import { resolveUsernames } from '../utils/username-resolver';

export type VotingTransitionStatus = 'pending_confirmation' | 'failed' | 'completed';

export interface VotingTransitionResult {
  status: VotingTransitionStatus;
  playlistCreated: boolean;
  error?: string;
}

/**
 * Service for managing voting phase transitions
 */
export class VotingService {
  /**
   * Phase 1: Initiate the voting transition
   * Creates Spotify playlist and requests confirmation from league creator before sending notifications
   *
   * Returns:
   * - { status: 'pending_confirmation' } - Playlist created, waiting for creator to confirm it's public
   * - { status: 'failed' } - Playlist creation failed, admins notified
   * - { status: 'completed' } - No Spotify integration, voting started immediately
   */
  static async initiateVotingTransition(
    client: Client,
    league: League,
    round: Round,
    options?: {
      logPrefix?: string;
    }
  ): Promise<VotingTransitionResult> {
    const logPrefix = options?.logPrefix || 'VotingService';

    console.log(`[${logPrefix}] Initiating voting transition for ${league.name} Round ${round.roundNumber}`);

    if (round.submissions.length === 0) {
      console.log(`[${logPrefix}] No submissions for round ${round.roundNumber}, cannot start voting`);
      throw new Error('No submissions available');
    }

    // If no Spotify integration, proceed immediately to voting
    if (!league.spotifyIntegration) {
      console.log(`[${logPrefix}] No Spotify integration, proceeding directly to voting`);
      await this.completeVotingTransition(client, league, round, { logPrefix });
      return { status: 'completed', playlistCreated: false };
    }

    // Try to create Spotify playlist
    let playlistCreated = false;
    let playlistError: string | undefined;

    try {
      console.log(`[${logPrefix}] Creating Spotify playlist for round ${round.roundNumber}...`);
      const guild = await client.guilds.fetch(league.guildId);
      const playlistData = await SpotifyPlaylistService.createRoundPlaylist(league, round, guild?.name);

      if (playlistData) {
        round.playlist = {
          playlistId: playlistData.playlistId,
          playlistUrl: playlistData.playlistUrl,
          createdAt: playlistData.createdAt,
          trackCount: playlistData.trackCount
        };
        round.shuffledOrder = playlistData.shuffledOrder;
        playlistCreated = true;
        console.log(`[${logPrefix}] Playlist created: ${playlistData.playlistUrl}`);
      }
    } catch (error) {
      playlistError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${logPrefix}] Failed to create playlist:`, error);
    }

    // If playlist creation failed, notify admins and don't proceed
    if (!playlistCreated) {
      console.log(`[${logPrefix}] Playlist creation failed, notifying admins`);

      const failedEmbed = NotificationTemplates.playlistCreationFailed(league, round, playlistError);
      await NotificationService.sendBulkDM(
        client,
        league.admins,
        { embeds: [failedEmbed] },
        100,
        league.guildId,
        'playlist_creation_failed'
      );

      return { status: 'failed', playlistCreated: false, error: playlistError };
    }

    // Playlist created successfully - request confirmation from creator
    console.log(`[${logPrefix}] Requesting playlist confirmation from creator`);

    // Set up confirmation tracking
    round.playlistConfirmation = {
      requestedAt: toISOString(),
      requestedFrom: league.createdBy
    };

    // Update round status to voting (but don't send notifications yet)
    round.status = 'voting';
    if (round.votingDurationMs) {
      const now = Date.now();
      round.votingDeadline = toISOString(now + round.votingDurationMs);
    }
    Storage.saveLeague(league);

    // Send DM to creator with confirmation button
    const { embed, components } = NotificationTemplates.playlistConfirmationNeeded(league, round);
    const creatorDmResult = await NotificationService.sendDM(
      client,
      league.createdBy,
      { embeds: [embed], components },
      league.guildId,
      'playlist_confirmation_requested'
    );

    if (!creatorDmResult.success) {
      console.warn(`[${logPrefix}] Could not DM league creator: ${creatorDmResult.error}`);
    }

    // Notify other admins that confirmation is pending
    const otherAdmins = league.admins.filter(id => id !== league.createdBy);
    if (otherAdmins.length > 0) {
      // Resolve creator's username for the pending notification
      const usernameCache = await resolveUsernames(client, [league.createdBy]);
      const pendingEmbed = NotificationTemplates.playlistConfirmationPending(
        league,
        round,
        league.createdBy,
        usernameCache
      );

      await NotificationService.sendBulkDM(
        client,
        otherAdmins,
        { embeds: [pendingEmbed] },
        100,
        league.guildId,
        'playlist_confirmation_pending'
      );
    }

    console.log(`[${logPrefix}] Waiting for playlist confirmation from creator`);
    return { status: 'pending_confirmation', playlistCreated: true };
  }

  /**
   * Phase 2: Complete the voting transition
   * Sends notifications to all players that voting has started
   * Called after creator confirms playlist is public, or immediately if no Spotify
   */
  static async completeVotingTransition(
    client: Client,
    league: League,
    round: Round,
    options?: {
      logPrefix?: string;
      skipChannelPost?: boolean;
    }
  ): Promise<void> {
    const logPrefix = options?.logPrefix || 'VotingService';

    console.log(`[${logPrefix}] Completing voting transition for ${league.name} Round ${round.roundNumber}`);

    // Ensure we're in voting status
    if (round.status !== 'voting') {
      round.status = 'voting';
      if (round.votingDurationMs) {
        const now = Date.now();
        round.votingDeadline = toISOString(now + round.votingDurationMs);
      }
    }

    // Clear confirmation state if present
    delete round.playlistConfirmation;
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

  /**
   * Legacy method - now calls the two-phase flow
   * @deprecated Use initiateVotingTransition instead
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
    // For backward compatibility, initiate the flow
    // Note: If confirmation is needed, notifications are NOT sent yet
    await this.initiateVotingTransition(client, league, round, options);
  }
}
