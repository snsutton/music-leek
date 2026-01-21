import { Client, EmbedBuilder } from 'discord.js';
import { NotificationResult } from '../types';
import { DmContextManager } from '../utils/dm-context';

/**
 * Service for sending DM notifications to users
 */
export class NotificationService {
  /**
   * Send a DM to a single user with error handling
   * Respects user's Discord DM privacy settings
   * @param guildId - Optional guild context to enable DM commands
   * @param notificationType - Type of notification being sent
   */
  static async sendDM(
    client: Client,
    userId: string,
    content: string | { embeds: EmbedBuilder[] },
    guildId?: string,
    notificationType?: string
  ): Promise<NotificationResult> {
    try {
      const user = await client.users.fetch(userId);

      if (typeof content === 'string') {
        await user.send(content);
      } else {
        await user.send(content);
      }

      // Record DM context for future command resolution
      if (guildId && notificationType) {
        DmContextManager.recordContext(userId, guildId, notificationType);
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
   * @param guildId - Optional guild context to enable DM commands
   * @param notificationType - Type of notification being sent
   */
  static async sendBulkDM(
    client: Client,
    userIds: string[],
    content: string | { embeds: EmbedBuilder[] },
    delayMs: number = 100,
    guildId?: string,
    notificationType?: string
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];

      // Send DM
      const result = await this.sendDM(client, userId, content, guildId, notificationType);
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
   * Send notification to both channel and DMs
   * Channel send happens first, then DMs (with rate limiting)
   * Channel failures don't block DM delivery
   */
  static async sendDualNotification(
    client: Client,
    userIds: string[],
    dmContent: { embeds: EmbedBuilder[] },
    channelContent: string,
    channelId: string,
    options?: {
      guildId?: string;
      notificationType?: string;
      appendJoinBlurb?: boolean;
    }
  ): Promise<{
    dmResults: NotificationResult[];
    channelSuccess: boolean;
  }> {
    // Send to channel first (less time-sensitive)
    let channelSuccess = false;
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel && channel.isTextBased() && !channel.isDMBased()) {
        let message = channelContent;

        // Append join-league blurb if requested
        if (options?.appendJoinBlurb) {
          // Import at runtime to avoid circular dependency
          const { NotificationTemplates } = await import('./notification-templates');
          message += NotificationTemplates.getJoinLeagueBlurb();
        }

        await channel.send(message);
        channelSuccess = true;
      }
    } catch (error) {
      console.error('[NotificationService] Failed to send channel message:', error);
      // Don't throw - continue with DMs
    }

    // Send DMs (with rate limiting)
    const dmResults = await this.sendBulkDM(
      client,
      userIds,
      dmContent,
      100,
      options?.guildId,
      options?.notificationType
    );

    return { dmResults, channelSuccess };
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
