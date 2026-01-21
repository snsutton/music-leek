import * as crypto from 'crypto';
import axios from 'axios';
import { SpotifyTokenData } from '../types';
import { TokenStorageService } from './token-storage';
import { toISOString } from '../utils/helpers';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || '';

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const REQUIRED_SCOPES = [
  'playlist-modify-private',
  'user-read-private'
];

interface OAuthState {
  discordUserId: string;
  guildId: string;
  createdAt: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface SpotifyUser {
  id: string; // Spotify user ID
  display_name: string;
}

export class SpotifyOAuthService {
  // In-memory state storage for CSRF protection
  private static stateMap = new Map<string, OAuthState>();

  /**
   * Cleanup expired states (older than 10 minutes)
   */
  private static cleanupExpiredStates(): void {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    for (const [state, data] of this.stateMap.entries()) {
      if (now - data.createdAt > tenMinutes) {
        this.stateMap.delete(state);
      }
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  static generateAuthUrl(discordUserId: string, guildId: string): string {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_REDIRECT_URI) {
      throw new Error('Spotify OAuth not configured. Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI.');
    }

    console.log(`[SpotifyOAuth] Generating auth URL with redirect URI: ${SPOTIFY_REDIRECT_URI}`);

    // Cleanup old states periodically
    this.cleanupExpiredStates();

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');

    // Store state
    this.stateMap.set(state, {
      discordUserId,
      guildId,
      createdAt: Date.now()
    });

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri: SPOTIFY_REDIRECT_URI,
      scope: REQUIRED_SCOPES.join(' '),
      state,
      show_dialog: 'true' // Always show auth dialog
    });

    const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
    console.log(`[SpotifyOAuth] Full auth URL: ${authUrl}`);

    return authUrl;
  }

  /**
   * Handle OAuth callback (exchange code for tokens)
   */
  static async handleCallback(code: string, state: string): Promise<{
    discordUserId: string;
    guildId: string;
    spotifyUserId: string;
  }> {
    // Validate state (CSRF protection)
    const stateData = this.stateMap.get(state);
    if (!stateData) {
      throw new Error('Invalid or expired state parameter');
    }

    // Remove used state
    this.stateMap.delete(state);

    // Exchange authorization code for tokens
    const tokenData = await this.exchangeCodeForTokens(code);

    // Get Spotify user ID
    const spotifyUser = await this.getSpotifyUser(tokenData.access_token);

    // Calculate expiration time
    const expiresAt = toISOString(Date.now() + (tokenData.expires_in * 1000));

    // Store tokens
    const tokenStorage: SpotifyTokenData = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scope: tokenData.scope.split(' '),
      tokenType: 'Bearer'
    };

    await TokenStorageService.saveToken(stateData.discordUserId, tokenStorage);

    console.log(`[SpotifyOAuth] Successfully connected Spotify for user ${stateData.discordUserId}, Spotify ID: ${spotifyUser.id}`);

    return {
      discordUserId: stateData.discordUserId,
      guildId: stateData.guildId,
      spotifyUserId: spotifyUser.id
    };
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  private static async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI
    });

    const authHeader = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    try {
      const response = await axios.post<TokenResponse>(SPOTIFY_TOKEN_URL, params.toString(), {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('[SpotifyOAuth] Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Refresh an expired access token
   */
  static async refreshToken(discordUserId: string): Promise<void> {
    const tokenData = await TokenStorageService.getToken(discordUserId);

    if (!tokenData || !tokenData.refreshToken) {
      throw new Error('No refresh token found for user');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refreshToken
    });

    const authHeader = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

    try {
      const response = await axios.post<Omit<TokenResponse, 'refresh_token'>>(
        SPOTIFY_TOKEN_URL,
        params.toString(),
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Update token storage with new access token
      const updatedToken: SpotifyTokenData = {
        ...tokenData,
        accessToken: response.data.access_token,
        expiresAt: toISOString(Date.now() + (response.data.expires_in * 1000))
      };

      await TokenStorageService.saveToken(discordUserId, updatedToken);

      console.log(`[SpotifyOAuth] Refreshed access token for user ${discordUserId}`);
    } catch (error: any) {
      console.error('[SpotifyOAuth] Failed to refresh token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get a valid access token (auto-refreshes if expired)
   */
  static async getValidToken(discordUserId: string): Promise<string | null> {
    const tokenData = await TokenStorageService.getToken(discordUserId);

    if (!tokenData) {
      return null;
    }

    // Check if token is expired or about to expire
    if (TokenStorageService.isTokenExpired(tokenData)) {
      console.log(`[SpotifyOAuth] Token expired for user ${discordUserId}, refreshing...`);
      await this.refreshToken(discordUserId);

      // Get the refreshed token
      const refreshedToken = await TokenStorageService.getToken(discordUserId);
      return refreshedToken?.accessToken || null;
    }

    return tokenData.accessToken;
  }

  /**
   * Get Spotify user profile
   */
  private static async getSpotifyUser(accessToken: string): Promise<SpotifyUser> {
    try {
      const response = await axios.get<SpotifyUser>(`${SPOTIFY_API_BASE}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('[SpotifyOAuth] Failed to get user profile:', error.response?.data || error.message);
      throw new Error('Failed to get Spotify user profile');
    }
  }

  /**
   * Revoke a user's tokens (disconnect Spotify)
   */
  static async revokeToken(discordUserId: string): Promise<void> {
    await TokenStorageService.deleteToken(discordUserId);
    console.log(`[SpotifyOAuth] Revoked tokens for user ${discordUserId}`);
  }
}
