import { Client } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, calculateScores, calculateLeagueResults, calculateLeagueStandings } from '../utils/helpers';
import { League, Round } from '../types';
import { NotificationService } from './notification-service';
import { NotificationTemplates } from './notification-templates';
import { DmContextManager } from '../utils/dm-context';

/**
 * Background scheduler that checks for upcoming deadlines every hour
 * and sends reminder notifications 24-36 hours before deadlines
 */
export class Scheduler {
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
  private static readonly REMINDER_WINDOW_MIN = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REMINDER_WINDOW_MAX = 36 * 60 * 60 * 1000; // 36 hours
  private static lastCleanupDate: string = '';

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

    // Then run every hour
    this.intervalId = setInterval(() => {
      this.checkDeadlines(client).catch(err => {
        console.error('[Scheduler] Error checking deadlines:', err);
      });
    }, this.CHECK_INTERVAL);

    console.log(`[Scheduler] ✓ Scheduler started (checking every hour)`);
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
   * Main check logic - called every hour
   */
  private static async checkDeadlines(client: Client): Promise<void> {
    console.log('[Scheduler] Checking deadlines...');

    // Daily DM context cleanup
    const today = new Date().toDateString();
    if (this.lastCleanupDate !== today) {
      DmContextManager.cleanupExpired();
      this.lastCleanupDate = today;
      console.log('[Scheduler] Cleaned up expired DM contexts');
    }

    const leagues = Storage.getAllLeagues();
    const now = Date.now();
    let remindersCount = 0;

    for (const league of leagues) {
      // Skip completed leagues
      if (league.isCompleted) continue;

      const round = getCurrentRound(league);
      if (!round) continue;

      // Check theme submission reminder
      if (round.status === 'theme-submission' && !round.notificationsSent.themeSubmissionReminder && round.themeSubmissionDeadline) {
        const timeUntilDeadline = round.themeSubmissionDeadline - now;

        if (timeUntilDeadline >= this.REMINDER_WINDOW_MIN &&
            timeUntilDeadline <= this.REMINDER_WINDOW_MAX) {
          await this.sendThemeSubmissionReminder(client, league, round);
          remindersCount++;
        }
      }

      // Auto-select theme when deadline passes
      if (round.status === 'theme-submission' && round.themeSubmissionDeadline && now > round.themeSubmissionDeadline) {
        await this.autoSelectTheme(client, league, round);
        remindersCount++;
      }

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

      // Auto-close voting if deadline has passed
      if (round.status === 'voting' && now > round.votingDeadline) {
        await this.autoEndRound(client, league, round);
        remindersCount++;
      }
    }

    console.log(`[Scheduler] ✓ Check complete. Sent ${remindersCount} reminders.`);
  }

  /**
   * Send theme submission deadline reminder
   */
  private static async sendThemeSubmissionReminder(
    client: Client,
    league: League,
    round: Round
  ): Promise<void> {
    console.log(`[Scheduler] Sending theme submission reminder for ${league.name} Round ${round.roundNumber}`);

    const embed = NotificationTemplates.themeSubmissionReminder(league, round);
    const results = await NotificationService.sendBulkDM(
      client,
      league.participants,
      { embeds: [embed] },
      100,
      league.guildId,
      'theme_submission_reminder'
    );

    // Mark as sent
    round.notificationsSent.themeSubmissionReminder = true;
    Storage.saveLeague(league);

    const summary = NotificationService.getNotificationSummary(results);
    console.log(`[Scheduler] Theme submission reminder sent to ${summary.successful}/${summary.total} participants`);
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
      100,
      league.guildId,
      'submission_reminder'
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
      100,
      league.guildId,
      'voting_reminder'
    );

    // Mark as sent
    round.notificationsSent.votingReminder = true;
    Storage.saveLeague(league);

    const summary = NotificationService.getNotificationSummary(results);
    console.log(`[Scheduler] Voting reminder sent to ${summary.successful}/${summary.total} participants`);
  }

  /**
   * Automatically end round when voting deadline passes
   */
  private static async autoEndRound(
    client: Client,
    league: League,
    round: Round
  ): Promise<void> {
    console.log(`[Scheduler] Auto-ending round ${round.roundNumber} for ${league.name} (voting deadline passed)`);

    // Mark round as completed
    round.status = 'completed';
    Storage.saveLeague(league);

    // Calculate current league standings
    const leagueStandings = calculateLeagueStandings(league);

    // Check if this is the last round
    const isLastRound = league.currentRound >= league.totalRounds;

    // Get the league channel
    try {
      const channel = await client.channels.fetch(league.channelId);

      if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        console.error(`[Scheduler] Could not find league channel for ${league.name}`);
        return;
      }

      if (isLastRound) {
        // Mark league as completed
        league.isCompleted = true;
        league.completedAt = Date.now();
        Storage.saveLeague(league);

        // Calculate league-wide results
        const results = calculateLeagueResults(league);

        // Post final round results + league fanfare to channel
        const fanfareMessage = NotificationTemplates.leagueEndedWithFanfare(league, round, results);
        await channel.send(fanfareMessage);

        console.log(`[Scheduler] League ${league.name} completed!`);
      } else {
        // Post round results + leaderboard to channel
        const roundMessage = NotificationTemplates.roundEndedWithLeaderboard(league, round, leagueStandings);
        await channel.send(roundMessage);

        // Notify admins that next round can start
        const adminEmbed = NotificationTemplates.roundReadyToStart(league);
        await NotificationService.sendBulkDM(
          client,
          league.admins,
          { embeds: [adminEmbed] },
          100,
          league.guildId,
          'round_ready_to_start'
        );

        console.log(`[Scheduler] Round ${round.roundNumber} ended for ${league.name}`);
      }
    } catch (error) {
      console.error(`[Scheduler] Error auto-ending round for ${league.name}:`, error);
    }
  }

  /**
   * Automatically select theme when deadline passes
   */
  private static async autoSelectTheme(
    client: Client,
    league: League,
    round: Round
  ): Promise<void> {
    console.log(`[Scheduler] Auto-selecting theme for ${league.name} Round ${round.roundNumber}`);

    if (round.themeSubmissions && round.themeSubmissions.length > 0) {
      // Random selection from submitted themes
      const randomIndex = Math.floor(Math.random() * round.themeSubmissions.length);
      const selectedTheme = round.themeSubmissions[randomIndex];
      round.prompt = selectedTheme.theme;

      // Post to channel
      try {
        const channel = await client.channels.fetch(league.channelId);
        if (channel && channel.isTextBased() && !channel.isDMBased()) {
          await channel.send(
            `🎲 **Theme selected for Round ${round.roundNumber}!**\n\n` +
            `**"${selectedTheme.theme}"**\n\n` +
            `Submitted by <@${selectedTheme.userId}>\n\n` +
            `Get ready to submit your songs! Deadline: <t:${Math.floor(round.submissionDeadline / 1000)}:F>`
          );
        }
      } catch (error) {
        console.error(`[Scheduler] Error posting theme selection to channel:`, error);
      }

      // Send DM notifications
      const embed = NotificationTemplates.themeSelected(league, round, selectedTheme);
      await NotificationService.sendBulkDM(
        client,
        league.participants,
        { embeds: [embed] },
        100,
        league.guildId,
        'theme_selected'
      );

      console.log(`[Scheduler] Theme selected: "${selectedTheme.theme}" by ${selectedTheme.userId}`);
    } else {
      // No themes submitted - use admin's original prompt as fallback
      round.prompt = round.adminPrompt || 'No theme provided';

      // Post to channel
      try {
        const channel = await client.channels.fetch(league.channelId);
        if (channel && channel.isTextBased() && !channel.isDMBased()) {
          await channel.send(
            `⚠️ **No themes were submitted!**\n\n` +
            `Using admin's original prompt:\n**"${round.prompt}"**\n\n` +
            `Get ready to submit your songs! Deadline: <t:${Math.floor(round.submissionDeadline / 1000)}:F>`
          );
        }
      } catch (error) {
        console.error(`[Scheduler] Error posting theme fallback to channel:`, error);
      }

      // Send DM notifications
      const embed = NotificationTemplates.themeSelectedFallback(league, round);
      await NotificationService.sendBulkDM(
        client,
        league.participants,
        { embeds: [embed] },
        100,
        league.guildId,
        'theme_selected'
      );

      console.log(`[Scheduler] No themes submitted - using admin prompt: "${round.prompt}"`);
    }

    // Transition to submission phase
    round.status = 'submission';
    round.notificationsSent.themeSelected = true;
    Storage.saveLeague(league);

    console.log(`[Scheduler] Theme selected and transitioned to submission phase`);
  }
}
