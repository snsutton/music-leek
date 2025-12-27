import { Client } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound } from '../utils/helpers';
import { League, Round } from '../types';
import { NotificationService } from './notification-service';
import { NotificationTemplates } from './notification-templates';

/**
 * Background scheduler that checks for upcoming deadlines every 12 hours
 * and sends reminder notifications 24-36 hours before deadlines
 */
export class Scheduler {
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours
  private static readonly REMINDER_WINDOW_MIN = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REMINDER_WINDOW_MAX = 36 * 60 * 60 * 1000; // 36 hours

  /**
   * Start the scheduler
   */
  static start(client: Client): void {
    if (this.intervalId) {
      console.warn('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting background scheduler...');

    // Run immediately on start
    this.checkDeadlines(client).catch(err => {
      console.error('[Scheduler] Error in initial check:', err);
    });

    // Then run every 12 hours
    this.intervalId = setInterval(() => {
      this.checkDeadlines(client).catch(err => {
        console.error('[Scheduler] Error checking deadlines:', err);
      });
    }, this.CHECK_INTERVAL);

    console.log(`[Scheduler] ✓ Scheduler started (checking every 12 hours)`);
  }

  /**
   * Stop the scheduler
   */
  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Scheduler] Stopped');
    }
  }

  /**
   * Main check logic - called every 12 hours
   */
  private static async checkDeadlines(client: Client): Promise<void> {
    console.log('[Scheduler] Checking deadlines...');

    const leagues = Storage.getAllLeagues();
    const now = Date.now();
    let remindersCount = 0;

    for (const league of leagues) {
      // Skip completed leagues
      if (league.isCompleted) continue;

      const round = getCurrentRound(league);
      if (!round) continue;

      // Check submission reminder
      if (round.status === 'submission' && !round.notificationsSent.submissionReminder) {
        const timeUntilDeadline = round.submissionDeadline - now;

        if (timeUntilDeadline >= this.REMINDER_WINDOW_MIN &&
            timeUntilDeadline <= this.REMINDER_WINDOW_MAX) {
          await this.sendSubmissionReminder(client, league, round);
          remindersCount++;
        }
      }

      // Check voting reminder
      if (round.status === 'voting' && !round.notificationsSent.votingReminder) {
        const timeUntilDeadline = round.votingDeadline - now;

        if (timeUntilDeadline >= this.REMINDER_WINDOW_MIN &&
            timeUntilDeadline <= this.REMINDER_WINDOW_MAX) {
          await this.sendVotingReminder(client, league, round);
          remindersCount++;
        }
      }
    }

    console.log(`[Scheduler] ✓ Check complete. Sent ${remindersCount} reminders.`);
  }

  /**
   * Send submission deadline reminder
   */
  private static async sendSubmissionReminder(
    client: Client,
    league: League,
    round: Round
  ): Promise<void> {
    console.log(`[Scheduler] Sending submission reminder for ${league.name} Round ${round.roundNumber}`);

    const embed = NotificationTemplates.submissionReminder(league, round);
    const results = await NotificationService.sendBulkDM(
      client,
      league.participants,
      { embeds: [embed] },
      100
    );

    // Mark as sent
    round.notificationsSent.submissionReminder = true;
    Storage.saveLeague(league);

    const summary = NotificationService.getNotificationSummary(results);
    console.log(`[Scheduler] Submission reminder sent to ${summary.successful}/${summary.total} participants`);
  }

  /**
   * Send voting deadline reminder
   */
  private static async sendVotingReminder(
    client: Client,
    league: League,
    round: Round
  ): Promise<void> {
    console.log(`[Scheduler] Sending voting reminder for ${league.name} Round ${round.roundNumber}`);

    const embed = NotificationTemplates.votingReminder(league, round);
    const results = await NotificationService.sendBulkDM(
      client,
      league.participants,
      { embeds: [embed] },
      100
    );

    // Mark as sent
    round.notificationsSent.votingReminder = true;
    Storage.saveLeague(league);

    const summary = NotificationService.getNotificationSummary(results);
    console.log(`[Scheduler] Voting reminder sent to ${summary.successful}/${summary.total} participants`);
  }
}
