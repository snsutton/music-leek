import { MusicService } from './music-service.interface';
import { SpotifyService } from './spotify-service';
import { MusicPlatform } from '../types';

export class MusicServiceFactory {
  private static spotifyService: SpotifyService | null = null;

  /**
   * Initialize all available music services based on environment variables
   */
  static async initialize(): Promise<void> {
    // Initialize Spotify if credentials are provided
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      try {
        this.spotifyService = new SpotifyService(
          process.env.SPOTIFY_CLIENT_ID,
          process.env.SPOTIFY_CLIENT_SECRET
        );
        await this.spotifyService.initialize();
        console.log('[MusicServiceFactory] Initialized services: Spotify');
      } catch (error) {
        console.error('[MusicServiceFactory] Failed to initialize Spotify:', error);
        this.spotifyService = null;
      }
    } else {
      console.warn('[MusicServiceFactory] Spotify credentials not found in environment');
    }

    if (!this.spotifyService) {
      console.warn('[MusicServiceFactory] No music services initialized! Bot will not be able to fetch song metadata.');
    }
  }

  /**
   * Get the music service for a specific platform
   */
  static getService(platform: MusicPlatform): MusicService | null {
    if (platform === 'spotify') {
      return this.spotifyService;
    }
    return null;
  }

  /**
   * Get a list of supported platforms (platforms that are initialized)
   */
  static getSupportedPlatforms(): MusicPlatform[] {
    const platforms: MusicPlatform[] = [];
    if (this.spotifyService) {
      platforms.push('spotify');
    }
    return platforms;
  }

  /**
   * Check if a specific platform is supported
   */
  static isPlatformSupported(platform: MusicPlatform): boolean {
    return this.getSupportedPlatforms().includes(platform);
  }
}
