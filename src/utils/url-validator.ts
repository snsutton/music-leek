import { ParsedMusicUrl, MusicPlatform } from '../types';

// Spotify URL patterns
const SPOTIFY_TRACK_REGEX = /^https?:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)(\?.*)?$/;
const SPOTIFY_URI_REGEX = /^spotify:track:([a-zA-Z0-9]+)$/;

// Apple Music URL patterns
// Format: https://music.apple.com/{country}/album/{album-name}/{album-id}?i={track-id}
// Or: https://music.apple.com/{country}/song/{song-name}/{track-id}
const APPLE_MUSIC_REGEX = /^https?:\/\/music\.apple\.com\/([a-z]{2})\/(?:album\/[^/]+\/\d+\?i=|song\/[^/]+\/)(\d+)$/;

/**
 * Parse a music URL and extract platform and track ID
 */
export function parseMusicUrl(url: string): ParsedMusicUrl | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  // Try Spotify track URL
  const spotifyMatch = trimmedUrl.match(SPOTIFY_TRACK_REGEX);
  if (spotifyMatch) {
    return {
      platform: 'spotify',
      trackId: spotifyMatch[1],
      originalUrl: trimmedUrl
    };
  }

  // Try Spotify URI format
  const spotifyUriMatch = trimmedUrl.match(SPOTIFY_URI_REGEX);
  if (spotifyUriMatch) {
    return {
      platform: 'spotify',
      trackId: spotifyUriMatch[1],
      originalUrl: trimmedUrl
    };
  }

  // Try Apple Music URL
  const appleMusicMatch = trimmedUrl.match(APPLE_MUSIC_REGEX);
  if (appleMusicMatch) {
    return {
      platform: 'apple-music',
      trackId: appleMusicMatch[2],
      originalUrl: trimmedUrl
    };
  }

  // URL doesn't match any supported pattern
  return {
    platform: 'unsupported',
    trackId: '',
    originalUrl: trimmedUrl
  };
}

/**
 * Check if a URL is a valid Spotify track URL
 */
export function isValidSpotifyUrl(url: string): boolean {
  const parsed = parseMusicUrl(url);
  return parsed !== null && parsed.platform === 'spotify';
}

/**
 * Check if a URL is a valid Apple Music track URL
 */
export function isValidAppleMusicUrl(url: string): boolean {
  const parsed = parseMusicUrl(url);
  return parsed !== null && parsed.platform === 'apple-music';
}

/**
 * Extract Spotify track ID from URL
 */
export function extractSpotifyTrackId(url: string): string | null {
  const parsed = parseMusicUrl(url);
  return parsed && parsed.platform === 'spotify' ? parsed.trackId : null;
}

/**
 * Extract Apple Music track ID from URL
 */
export function extractAppleMusicTrackId(url: string): string | null {
  const parsed = parseMusicUrl(url);
  return parsed && parsed.platform === 'apple-music' ? parsed.trackId : null;
}
