import axios from 'axios';
import { ParsedMusicUrl, MusicPlatform } from '../types';

// Spotify URL patterns
// Optional locale segment, e.g. /intl-de/ or /intl-pt-br/, appears in many Spotify share links
const SPOTIFY_TRACK_REGEX = /^https?:\/\/open\.spotify\.com\/(?:intl-[a-zA-Z-]+\/)?track\/([a-zA-Z0-9]+)(\?.*)?$/;
const SPOTIFY_URI_REGEX = /^spotify:track:([a-zA-Z0-9]+)$/;

// Short share links (spotify.link / spotify.app.link) carry no track ID and must be resolved over the network
const SPOTIFY_SHORT_LINK_REGEX = /^https:\/\/spotify\.(?:app\.)?link\/[a-zA-Z0-9_-]+(\?.*)?$/;
const SPOTIFY_TRACK_URL_IN_TEXT_REGEX = /https:\/\/open\.spotify\.com\/(?:intl-[a-zA-Z-]+\/)?track\/[a-zA-Z0-9]+/;

/**
 * Resolve a Spotify short link to its open.spotify.com track URL.
 * Returns null if the URL is not a short link or cannot be resolved.
 */
export async function resolveSpotifyShortLink(url: string): Promise<string | null> {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl || !SPOTIFY_SHORT_LINK_REGEX.test(trimmedUrl)) {
    return null;
  }

  try {
    const response = await axios.get<string>(trimmedUrl, {
      timeout: 5000,
      maxRedirects: 5,
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MusicLeekBot)' }
    });

    // Prefer the final URL after HTTP redirects; fall back to the page body (JS redirect / og:url tag)
    const finalUrl: string = response.request?.res?.responseUrl || '';
    const match = finalUrl.match(SPOTIFY_TRACK_URL_IN_TEXT_REGEX)
      || String(response.data).match(SPOTIFY_TRACK_URL_IN_TEXT_REGEX);

    if (!match) {
      console.warn(`[UrlValidator] Could not find a track URL behind short link: ${trimmedUrl}`);
      return null;
    }

    console.log(`[UrlValidator] Resolved short link ${trimmedUrl} -> ${match[0]}`);
    return match[0];
  } catch (error: any) {
    console.warn(`[UrlValidator] Failed to resolve short link ${trimmedUrl}:`, error.message);
    return null;
  }
}

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
 * Extract Spotify track ID from URL
 */
export function extractSpotifyTrackId(url: string): string | null {
  const parsed = parseMusicUrl(url);
  return parsed && parsed.platform === 'spotify' ? parsed.trackId : null;
}
