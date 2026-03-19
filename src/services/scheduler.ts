import { Client } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, calculateScores, calculateLeagueResults, calculateLeagueStandings, toTimestamp, toISOString, getMissingSubmitters, getMissingVoters } from '../utils/helpers';
import { League, Round } from '../types';
import { NotificationService } from './notification-service';
import { NotificationTemplates } from './notification-templates';
import { DmContextManager } from '../utils/dm-context';
import { VotingService } from './voting-service';
import { selectThemeAndUpdateTickets } from './theme-selection-service';
import { resolveUsernames } from '../utils/username-resolver';

/**
 * Background scheduler that checks for upcoming deadlines every 30 minutes,
 * sends reminder notifications ~2 hours before deadlines,
 * then auto-transitions phases when deadlines pass
 */
export class Scheduler {
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private static readonly REMINDER_WINDOW_MIN = 1 * 60 * 60 * 1000; // 1 hour
  private static readonly REMINDER_WINDOW_MAX = 2.5 * 60 * 60 * 1000; // 2.5 hours
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

    console.log(`[Scheduler] ✓ Scheduler started (checking every 30 minutes)`);
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

      // --- Pre-deadline reminders (DM only to players who haven't acted) ---

      // Submission reminder: ~2h before submission deadline
      if (round.status === 'submission'
        && !round.notificationsSent.submissionReminder
        && this.isInReminderWindow(toTimestamp(round.submissionDeadline), now)
      ) {
        await this.sendSubmissionReminder(client, league, round);
        remindersCount++;
      }

      // Voting reminder: ~2h before voting deadline
      if (round.status === 'voting'
        && !round.notificationsSent.votingReminder
        && this.isInReminderWindow(toTimestamp(round.votingDeadline), now)
      ) {
        await this.sendVotingReminder(client, league, round);
        remindersCount++;
      }

      // --- Auto-transitions (when deadlines have passed) ---

      // Auto-select theme when deadline passes
      if (round.status === 'theme-submission' && round.themeSubmissionDeadline && now > toTimestamp(round.themeSubmissionDeadline)) {
        await this.autoSelectTheme(client, league, round);
        remindersCount++;
      }

      // Auto-start voting if submission deadline has passed
      if (round.status === 'submission' && now > toTimestamp(round.submissionDeadline)) {
        await this.autoStartVoting(client, league, round);
        remindersCount++;
      }

      // Auto-close voting if deadline has passed
      if (round.status === 'voting' && now > toTimestamp(round.votingDeadline)) {
        await this.autoEndRound(client, league, round);
        remindersCount++;
      }
    }

    console.log(`[Scheduler] ✓ Check complete. Sent ${remindersCount} reminders.`);
  }

  /**
   * Automatically start voting when submission deadline passes
   */
  private static async autoStartVoting(
    client: Client,
    league: League,
    round: Round
  ): Promise<void> {
    console.log(`[Scheduler] Auto-starting voting for ${league.name} Round ${round.roundNumber} (submission deadline passed)`);

    if (round.submissions.length === 0) {
      console.log(`[Scheduler] No submissions for round ${round.roundNumber}, skipping voting phase`);
      return;
    }

    try {
      const result = await VotingService.initiateVotingTransition(client, league, round, {
        logPrefix: 'Scheduler',
        anchorTimestamp: toTimestamp(round.submissionDeadline)
      });

      if (result.status === 'pending_confirmation') {
        console.log(`[Scheduler] Playlist created, waiting for creator to confirm it's public`);
      } else if (result.status === 'failed') {
        console.log(`[Scheduler] Playlist creation failed - admins have been notified`);
      } else {
        console.log(`[Scheduler] Voting started immediately (no Spotify integration)`);
      }
    } catch (error) {
      console.error(`[Scheduler] Failed to start voting for round ${round.roundNumber}:`, error);
    }
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

      // Collect all user IDs for username resolution
      const userIds: string[] = [
        ...Array.from(leagueStandings.keys()),
        ...round.submissions.map(s => s.userId)
      ];

      // Resolve usernames in batch
      const usernameCache = await resolveUsernames(client, userIds);

      if (isLastRound) {
        // Mark league as completed
        league.isCompleted = true;
        league.completedAt = toISOString();
        Storage.saveLeague(league);

        // Calculate league-wide results
        const results = calculateLeagueResults(league);

        // Post standard round tally first
        const roundMessage = NotificationTemplates.roundEndedWithLeaderboard(league, round, leagueStandings, usernameCache);
        await channel.send({
          content: roundMessage.content,
          embeds: roundMessage.embeds
        });

        // Then post league fanfare to channel (with join-league blurb)
        const fanfareMessage = NotificationTemplates.leagueEndedWithFanfare(league, round, results, usernameCache);
        const messageContent = typeof fanfareMessage.content === 'string'
          ? fanfareMessage.content + NotificationTemplates.getJoinLeagueBlurb()
          : fanfareMessage.content;

        await channel.send({
          content: messageContent,
          embeds: fanfareMessage.embeds
        });

        console.log(`[Scheduler] League ${league.name} completed!`);
      } else {
        // Post round results + leaderboard to channel (with join-league blurb)
        const roundMessage = NotificationTemplates.roundEndedWithLeaderboard(league, round, leagueStandings, usernameCache);
        const messageContent = typeof roundMessage.content === 'string'
          ? roundMessage.content + NotificationTemplates.getJoinLeagueBlurb()
          : roundMessage.content;

        await channel.send({
          content: messageContent,
          embeds: roundMessage.embeds
        });

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

    // Use weighted random selection
    const selectedTheme = selectThemeAndUpdateTickets(league, round);

    if (selectedTheme) {
      // Resolve username for the theme submitter
      const usernameCache = await resolveUsernames(client, [selectedTheme.userId]);

      // Send dual notifications (channel + DMs)
      const notification = NotificationTemplates.themeSelected(league, round, selectedTheme, usernameCache);
      await NotificationService.sendDualNotification(
        client,
        league.participants,
        { embeds: [notification.dm] },
        notification.channel,
        league.channelId,
        {
          guildId: league.guildId,
          notificationType: 'theme_selected',
          appendJoinBlurb: true
        }
      );

      console.log(`[Scheduler] Theme selected: "${selectedTheme.theme}" by ${selectedTheme.userId}`);
    } else {
      // No themes submitted - use admin's original prompt as fallback
      round.prompt = round.adminPrompt || 'No theme provided';

      // Send dual notifications (channel + DMs)
      const notification = NotificationTemplates.themeSelectedFallback(league, round);
      await NotificationService.sendDualNotification(
        client,
        league.participants,
        { embeds: [notification.dm] },
        notification.channel,
        league.channelId,
        {
          guildId: league.guildId,
          notificationType: 'theme_selected',
          appendJoinBlurb: true
        }
      );

      console.log(`[Scheduler] No themes submitted - using admin prompt: "${round.prompt}"`);
    }

    // Transition to submission phase
    round.status = 'submission';
    round.notificationsSent.themeSelected = true;
    Storage.saveLeague(league);

    console.log(`[Scheduler] Theme selected and transitioned to submission phase`);
  }

  /**
   * Check if the current time is within the reminder window before a deadline.
   */
  private static isInReminderWindow(deadlineTimestamp: number, now: number): boolean {
    const timeUntilDeadline = deadlineTimestamp - now;
    return timeUntilDeadline > this.REMINDER_WINDOW_MIN && timeUntilDeadline <= this.REMINDER_WINDOW_MAX;
  }

  /**
   * Send DM reminders to players who haven't submitted their song yet
   */
  private static async sendSubmissionReminder(
    client: Client,
    league: League,
    round: Round
  ): Promise<void> {
    const missingSubmitters = getMissingSubmitters(league, round);

    if (missingSubmitters.length === 0) {
      console.log(`[Scheduler] All players have submitted for ${league.name} Round ${round.roundNumber}, skipping reminder`);
      round.notificationsSent.submissionReminder = true;
      Storage.saveLeague(league);
      return;
    }

    console.log(`[Scheduler] Sending submission reminders to ${missingSubmitters.length} players for ${league.name} Round ${round.roundNumber}`);

    const reminderEmbed = NotificationTemplates.submissionReminder(league, round);
    await NotificationService.sendBulkDM(
      client,
      missingSubmitters,
      { embeds: [reminderEmbed] },
      100,
      league.guildId,
      'submission_reminder'
    );

    round.notificationsSent.submissionReminder = true;
    Storage.saveLeague(league);

    console.log(`[Scheduler] Submission reminders sent for ${league.name} Round ${round.roundNumber}`);
  }

  /**
   * Send DM reminders to players who haven't voted yet
   */
  private static async sendVotingReminder(
    client: Client,
    league: League,
    round: Round
  ): Promise<void> {
    const missingVoters = getMissingVoters(league, round);

    if (missingVoters.length === 0) {
      console.log(`[Scheduler] All players have voted for ${league.name} Round ${round.roundNumber}, skipping reminder`);
      round.notificationsSent.votingReminder = true;
      Storage.saveLeague(league);
      return;
    }

    console.log(`[Scheduler] Sending voting reminders to ${missingVoters.length} players for ${league.name} Round ${round.roundNumber}`);

    const reminderEmbed = NotificationTemplates.votingReminder(league, round);
    await NotificationService.sendBulkDM(
      client,
      missingVoters,
      { embeds: [reminderEmbed] },
      100,
      league.guildId,
      'voting_reminder'
    );

    round.notificationsSent.votingReminder = true;
    Storage.saveLeague(league);

    console.log(`[Scheduler] Voting reminders sent for ${league.name} Round ${round.roundNumber}`);
  }
}
