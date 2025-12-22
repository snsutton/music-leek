import { SongMetadata, MusicServiceError, MusicPlatform } from '../types';

export interface MusicService {
  /**
   * Initialize the service (authenticate, set up clients, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Fetch song metadata from the service
   * @param trackId - The track ID specific to this platform
   * @returns SongMetadata on success, MusicServiceError on failure
   */
  fetchSongMetadata(trackId: string): Promise<SongMetadata | MusicServiceError>;

  /**
   * Get the name of this music service
   */
  getServiceName(): string;

  /**
   * Get the platform identifier
   */
  getPlatform(): MusicPlatform;
}
