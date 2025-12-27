import { Client, EmbedBuilder } from 'discord.js';
import { NotificationResult } from '../types';

/**
 * Service for sending DM notifications to users
 */
export class NotificationService {
  /**
   * Send a DM to a single user with error handling
   * Respects user's Discord DM privacy settings
   */
  static async sendDM(
    client: Client,
    userId: string,
    content: string | { embeds: EmbedBuilder[] }
  ): Promise<NotificationResult> {
    try {
      const user = await client.users.fetch(userId);

      if (typeof content === 'string') {
        await user.send(content);
      } else {
        await user.send(content);
      }

      return { userId, success: true };
    } catch (error: any) {
      // Discord error code 50007: Cannot send messages to this user
      if (error.code === 50007) {
        console.warn(`[Notifications] Cannot DM user ${userId}: DMs disabled`);
        return {
          userId,
          success: false,
          error: 'User has DMs disabled'
        };
      }

      console.error(`[Notifications] Failed to DM user ${userId}:`, error);
      return {
        userId,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send DMs to multiple users in parallel with rate limiting
   * @param delayMs - Delay between sends to avoid rate limits (default: 100ms)
   */
  static async sendBulkDM(
    client: Client,
    userIds: string[],
    content: string | { embeds: EmbedBuilder[] },
    delayMs: number = 100
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];

      // Send DM
      const result = await this.sendDM(client, userId, content);
      results.push(result);

      // Rate limit delay (except for last message)
      if (i < userIds.length - 1) {
        await this.delay(delayMs);
      }
    }

    return results;
  }

  /**
   * Helper to delay execution
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get summary of notification results
   */
  static getNotificationSummary(results: NotificationResult[]): {
    successful: number;
    failed: number;
    total: number;
  } {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      successful,
      failed,
      total: results.length
    };
  }
}
