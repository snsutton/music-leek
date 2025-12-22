import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { MusicService } from './music-service.interface';
import { SongMetadata, MusicServiceError, MusicPlatform } from '../types';

export class SpotifyService implements MusicService {
  private client: SpotifyApi | null = null;
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async initialize(): Promise<void> {
    try {
      // Use client credentials flow - no user authentication needed
      this.client = SpotifyApi.withClientCredentials(
        this.clientId,
        this.clientSecret
      );
      console.log('[SpotifyService] Initialized successfully');
    } catch (error) {
      console.error('[SpotifyService] Failed to initialize:', error);
      throw new Error('Failed to initialize Spotify service');
    }
  }

  async fetchSongMetadata(trackId: string): Promise<SongMetadata | MusicServiceError> {
    if (!this.client) {
      return {
        code: 'API_ERROR',
        message: 'Spotify service not initialized',
        retryable: false
      };
    }

    try {
      console.log(`[SpotifyService] Fetching metadata for track: ${trackId}`);
      const track = await this.client.tracks.get(trackId);

      const metadata: SongMetadata = {
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        albumName: track.album.name,
        isExplicit: track.explicit
      };

      console.log(`[SpotifyService] Successfully fetched: ${metadata.title} by ${metadata.artist}`);
      return metadata;
    } catch (error: any) {
      console.error('[SpotifyService] Error fetching metadata:', error);
      return this.handleError(error);
    }
  }

  getServiceName(): string {
    return 'Spotify';
  }

  getPlatform(): MusicPlatform {
    return 'spotify';
  }

  private handleError(error: any): MusicServiceError {
    // Rate limiting (429)
    if (error.status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: 'Too many requests to Spotify. Please try again in a moment.',
        retryable: true
      };
    }

    // Track not found (404)
    if (error.status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Song not found on Spotify. Check the URL and try again.',
        retryable: false
      };
    }

    // Authentication error (401)
    if (error.status === 401) {
      return {
        code: 'API_ERROR',
        message: 'Spotify authentication error. Contact bot admin.',
        retryable: false
      };
    }

    // Network/timeout errors
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error connecting to Spotify. Try again shortly.',
        retryable: true
      };
    }

    // Generic error
    return {
      code: 'API_ERROR',
      message: 'Spotify API error. Please try again.',
      retryable: true
    };
  }
}
