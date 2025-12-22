import axios, { AxiosError } from 'axios';
import { MusicService } from './music-service.interface';
import { SongMetadata, MusicServiceError, MusicPlatform } from '../types';

export class AppleMusicService implements MusicService {
  private developerToken: string | null = null;
  private teamId: string;
  private keyId: string;
  private privateKeyPath: string;

  constructor(teamId: string, keyId: string, privateKeyPath: string) {
    this.teamId = teamId;
    this.keyId = keyId;
    this.privateKeyPath = privateKeyPath;
  }

  async initialize(): Promise<void> {
    try {
      // For Apple Music, we would need to generate a JWT token
      // This requires the 'jsonwebtoken' package and reading the private key
      // For now, we'll throw an error indicating setup is required
      console.warn('[AppleMusicService] Apple Music requires additional setup (JWT token generation)');
      console.warn('[AppleMusicService] Install jsonwebtoken package: npm install jsonwebtoken @types/jsonwebtoken');

      // Placeholder - would generate JWT here
      throw new Error('Apple Music service requires JWT token generation - not yet implemented');
    } catch (error) {
      console.error('[AppleMusicService] Failed to initialize:', error);
      throw error;
    }
  }

  async fetchSongMetadata(trackId: string): Promise<SongMetadata | MusicServiceError> {
    if (!this.developerToken) {
      return {
        code: 'API_ERROR',
        message: 'Apple Music service not initialized',
        retryable: false
      };
    }

    try {
      console.log(`[AppleMusicService] Fetching metadata for track: ${trackId}`);

      const response = await axios.get(
        `https://api.music.apple.com/v1/catalog/us/songs/${trackId}`,
        {
          headers: {
            Authorization: `Bearer ${this.developerToken}`,
          },
          timeout: 5000
        }
      );

      const song = response.data.data[0].attributes;

      const metadata: SongMetadata = {
        title: song.name,
        artist: song.artistName,
        albumName: song.albumName,
        isExplicit: song.contentRating === 'explicit'
      };

      console.log(`[AppleMusicService] Successfully fetched: ${metadata.title} by ${metadata.artist}`);
      return metadata;
    } catch (error: any) {
      console.error('[AppleMusicService] Error fetching metadata:', error);
      return this.handleError(error);
    }
  }

  getServiceName(): string {
    return 'Apple Music';
  }

  getPlatform(): MusicPlatform {
    return 'apple-music';
  }

  private handleError(error: any): MusicServiceError {
    const axiosError = error as AxiosError;

    // Rate limiting (429)
    if (axiosError.response?.status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: 'Too many requests to Apple Music. Please try again in a moment.',
        retryable: true
      };
    }

    // Track not found (404)
    if (axiosError.response?.status === 404) {
      return {
        code: 'NOT_FOUND',
        message: 'Song not found on Apple Music. Check the URL and try again.',
        retryable: false
      };
    }

    // Authentication error (401, 403)
    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      return {
        code: 'API_ERROR',
        message: 'Apple Music authentication error. Contact bot admin.',
        retryable: false
      };
    }

    // Network/timeout errors
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error connecting to Apple Music. Try again shortly.',
        retryable: true
      };
    }

    // Generic error
    return {
      code: 'API_ERROR',
      message: 'Apple Music API error. Please try again.',
      retryable: true
    };
  }
}
