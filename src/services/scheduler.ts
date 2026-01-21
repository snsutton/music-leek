import { Client } from 'discord.js';
import { Storage } from '../utils/storage';
import { getCurrentRound, calculateScores, calculateLeagueResults, calculateLeagueStandings, toTimestamp, toISOString } from '../utils/helpers';
import { League, Round } from '../types';
import { NotificationService } from './notification-service';
import { NotificationTemplates } from './notification-templates';
import { DmContextManager } from '../utils/dm-context';
import { VotingService } from './voting-service';
import { selectThemeAndUpdateTickets } from './theme-selection-service';

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
      await VotingService.startVoting(client, league, round, { logPrefix: 'Scheduler' });
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

      if (isLastRound) {
        // Mark league as completed
        league.isCompleted = true;
        league.completedAt = toISOString();
        Storage.saveLeague(league);

        // Calculate league-wide results
        const results = calculateLeagueResults(league);

        // Post final round results + league fanfare to channel (with join-league blurb)
        const fanfareMessage = NotificationTemplates.leagueEndedWithFanfare(league, round, results);
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
        const roundMessage = NotificationTemplates.roundEndedWithLeaderboard(league, round, leagueStandings);
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

      // Send dual notifications (channel + DMs)
      const notification = NotificationTemplates.themeSelected(league, round, selectedTheme);
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
}
