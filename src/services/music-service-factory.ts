import { MusicService } from './music-service.interface';
import { SpotifyService } from './spotify-service';
import { AppleMusicService } from './apple-music-service';
import { MusicPlatform } from '../types';

export class MusicServiceFactory {
  private static spotifyService: SpotifyService | null = null;
  private static appleMusicService: AppleMusicService | null = null;

  /**
   * Initialize all available music services based on environment variables
   */
  static async initialize(): Promise<void> {
    const services: string[] = [];

    // Initialize Spotify if credentials are provided
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      try {
        this.spotifyService = new SpotifyService(
          process.env.SPOTIFY_CLIENT_ID,
          process.env.SPOTIFY_CLIENT_SECRET
        );
        await this.spotifyService.initialize();
        services.push('Spotify');
      } catch (error) {
        console.error('[MusicServiceFactory] Failed to initialize Spotify:', error);
        this.spotifyService = null;
      }
    } else {
      console.warn('[MusicServiceFactory] Spotify credentials not found in environment');
    }

    // Initialize Apple Music if credentials are provided
    if (
      process.env.APPLE_MUSIC_TEAM_ID &&
      process.env.APPLE_MUSIC_KEY_ID &&
      process.env.APPLE_MUSIC_PRIVATE_KEY_PATH
    ) {
      try {
        this.appleMusicService = new AppleMusicService(
          process.env.APPLE_MUSIC_TEAM_ID,
          process.env.APPLE_MUSIC_KEY_ID,
          process.env.APPLE_MUSIC_PRIVATE_KEY_PATH
        );
        await this.appleMusicService.initialize();
        services.push('Apple Music');
      } catch (error) {
        console.warn('[MusicServiceFactory] Apple Music initialization failed (optional service):', error);
        this.appleMusicService = null;
      }
    }

    if (services.length === 0) {
      console.warn('[MusicServiceFactory] No music services initialized! Bot will not be able to fetch song metadata.');
    } else {
      console.log(`[MusicServiceFactory] Initialized services: ${services.join(', ')}`);
    }
  }

  /**
   * Get the music service for a specific platform
   */
  static getService(platform: MusicPlatform): MusicService | null {
    if (platform === 'spotify') {
      return this.spotifyService;
    }
    if (platform === 'apple-music') {
      return this.appleMusicService;
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
    if (this.appleMusicService) {
      platforms.push('apple-music');
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
