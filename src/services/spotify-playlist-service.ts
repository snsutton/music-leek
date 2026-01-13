import axios from 'axios';
import { League, Round } from '../types';
import { SpotifyOAuthService } from './spotify-oauth-service';
import { parseMusicUrl } from '../utils/url-validator';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface PlaylistData {
  playlistId: string;
  playlistUrl: string;
  createdAt: number;
  trackCount: number;
}

export class SpotifyPlaylistService {
  /**
   * Create a playlist for a voting round
   */
  static async createRoundPlaylist(league: League, round: Round, guildName?: string): Promise<PlaylistData | null> {
    if (!league.spotifyIntegration) {
      console.log('[SpotifyPlaylist] No Spotify integration for league, skipping playlist creation');
      return null;
    }

    // Get valid access token (auto-refreshes if expired)
    const accessToken = await SpotifyOAuthService.getValidToken(league.createdBy);
    if (!accessToken) {
      console.error('[SpotifyPlaylist] No valid access token available');
      return null;
    }

    // Extract Spotify track IDs from submissions
    const trackUris: string[] = [];
    const invalidTracks: string[] = [];

    for (const submission of round.submissions) {
      const trackId = this.extractSpotifyTrackId(submission.songUrl);
      if (trackId) {
        trackUris.push(`spotify:track:${trackId}`);
      } else {
        invalidTracks.push(submission.songUrl);
        console.warn(`[SpotifyPlaylist] Invalid Spotify URL: ${submission.songUrl}`);
      }
    }

    if (trackUris.length === 0) {
      console.log('[SpotifyPlaylist] No valid Spotify tracks found in submissions');
      return null;
    }

    if (invalidTracks.length > 0) {
      console.log(`[SpotifyPlaylist] Skipped ${invalidTracks.length} invalid track(s)`);
    }

    try {
      // Create playlist - sanitize name and description for Spotify API
      // Spotify limits: name max 100 chars, description max 300 chars
      const playlistName = `${round.prompt}`.substring(0, 100);
      const rawDescription = guildName
        ? `Music Leek - ${guildName} - ${league.name} - Round ${round.roundNumber} - https://github.com/snsutton/music-leek`
        : `Music Leek - ${league.name} - Round ${round.roundNumber} - https://github.com/snsutton/music-leek`;
      const playlistDescription = rawDescription.substring(0, 300);

      console.log(`[SpotifyPlaylist] Creating playlist "${playlistName}" with ${trackUris.length} tracks`);
      console.log(`[SpotifyPlaylist] Description: "${playlistDescription}"`);

      const playlistId = await this.createPlaylist(
        accessToken,
        league.spotifyIntegration.userId,
        playlistName,
        playlistDescription,
        false // private playlist
      );

      // Add tracks to playlist
      await this.addTracks(accessToken, playlistId, trackUris);

      const playlistUrl = `https://open.spotify.com/playlist/${playlistId}`;

      console.log(`[SpotifyPlaylist] Created playlist: ${playlistUrl} with ${trackUris.length} tracks`);

      return {
        playlistId,
        playlistUrl,
        createdAt: Date.now(),
        trackCount: trackUris.length
      };
    } catch (error: any) {
      console.error('[SpotifyPlaylist] Failed to create playlist:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Create a Spotify playlist
   */
  private static async createPlaylist(
    accessToken: string,
    spotifyUserId: string,
    name: string,
    description: string,
    isPublic: boolean
  ): Promise<string> {
    const response = await axios.post(
      `${SPOTIFY_API_BASE}/users/${spotifyUserId}/playlists`,
      {
        name,
        description,
        public: isPublic
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.id;
  }

  /**
   * Add tracks to a Spotify playlist
   */
  private static async addTracks(
    accessToken: string,
    playlistId: string,
    trackUris: string[]
  ): Promise<void> {
    // Spotify allows max 100 tracks per request
    const batchSize = 100;

    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);

      await axios.post(
        `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`,
        {
          uris: batch
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }

  /**
   * Extract Spotify track ID from a URL
   */
  private static extractSpotifyTrackId(url: string): string | null {
    try {
      const parsed = parseMusicUrl(url);
      if (parsed && parsed.platform === 'spotify') {
        return parsed.trackId;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
