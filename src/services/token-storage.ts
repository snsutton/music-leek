import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { SpotifyTokenData, TokenStorage } from '../types';

const TOKEN_FILE = path.join(__dirname, '../../data/tokens.json');
const ALGORITHM = 'aes-256-cbc';

// Encryption key from environment variable (32 bytes for AES-256)
const getEncryptionKey = (): Buffer => {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  // Ensure key is exactly 32 bytes
  return crypto.scryptSync(key, 'salt', 32);
};

export class TokenStorageService {
  /**
   * Load token storage from disk
   */
  private static load(): TokenStorage {
    if (!fs.existsSync(TOKEN_FILE)) {
      return { spotify: {} };
    }

    try {
      const data = fs.readFileSync(TOKEN_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load token storage:', error);
      return { spotify: {} };
    }
  }

  /**
   * Save token storage to disk
   */
  private static save(storage: TokenStorage): void {
    const dataDir = path.dirname(TOKEN_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(TOKEN_FILE, JSON.stringify(storage, null, 2), 'utf-8');
  }

  /**
   * Encrypt sensitive data
   */
  private static encrypt(data: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (IV needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  private static decrypt(encrypted: string): string {
    const key = getEncryptionKey();
    const parts = encrypted.split(':');

    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Save a user's Spotify token (encrypted)
   */
  static async saveToken(discordUserId: string, token: SpotifyTokenData): Promise<void> {
    const storage = this.load();

    // Encrypt sensitive token data and store in a wrapper object
    const encryptedToken = this.encrypt(JSON.stringify(token));

    (storage.spotify as any)[discordUserId] = {
      encrypted: encryptedToken
    };

    this.save(storage);
    console.log(`[TokenStorage] Saved encrypted token for user ${discordUserId}`);
  }

  /**
   * Get a user's Spotify token (decrypted)
   */
  static async getToken(discordUserId: string): Promise<SpotifyTokenData | null> {
    const storage = this.load();
    const encryptedData = (storage.spotify as any)[discordUserId];

    if (!encryptedData || !encryptedData.encrypted) {
      return null;
    }

    try {
      const decrypted = this.decrypt(encryptedData.encrypted);
      return JSON.parse(decrypted) as SpotifyTokenData;
    } catch (error) {
      console.error(`[TokenStorage] Failed to decrypt token for user ${discordUserId}:`, error);
      return null;
    }
  }

  /**
   * Delete a user's Spotify token
   */
  static async deleteToken(discordUserId: string): Promise<void> {
    const storage = this.load();
    delete storage.spotify[discordUserId];
    this.save(storage);
    console.log(`[TokenStorage] Deleted token for user ${discordUserId}`);
  }

  /**
   * Check if a token is expired
   */
  static isTokenExpired(token: SpotifyTokenData): boolean {
    // Add 60 second buffer to refresh before actual expiration
    return Date.now() >= (token.expiresAt - 60000);
  }
}
