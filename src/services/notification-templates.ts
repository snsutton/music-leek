import { EmbedBuilder } from 'discord.js';
import { League, Round, LeagueEndResults, ThemeSubmission } from '../types';
import { calculateScores, toTimestamp } from '../utils/helpers';

/**
 * Templates for all notification messages
 */
export class NotificationTemplates {
  /**
   * DM Notification: League created
   */
  static leagueCreated(league: League): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🎵 Welcome to ' + league.name + '!')
      .setDescription(
        `You've joined a new music league!\n\n` +
        `**Total Rounds:** ${league.totalRounds}\n\n` +
        `The league admin will start the first round soon. ` +
        `When a round begins, you'll submit a song based on the prompt and vote on others' submissions.`
      )
      .setFooter({ text: 'You can leave the league anytime with /leave-league' })
      .setTimestamp();
  }

  /**
   * DM Notification: Round started
   */
  static roundStarted(league: League, round: Round): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`🎵 Round ${round.roundNumber} Started in ${league.name}!`)
      .setDescription(
        `**Prompt:** ${round.prompt}\n\n` +
        `**Submission Deadline:** <t:${Math.floor(toTimestamp(round.submissionDeadline) / 1000)}:F>\n\n` +
        `Submit your song using \`/submit-song\`!`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Round started with theme submission phase
   */
  static roundStartedWithThemePhase(league: League, round: Round): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle(`🎵 Round ${round.roundNumber} Started in ${league.name}!`)
      .setDescription(
        `**Theme Submission Phase**\n\n` +
        `For the next 24 hours, submit your theme ideas using \`/submit-theme\`!\n\n` +
        `**Theme Deadline:** <t:${Math.floor(toTimestamp(round.themeSubmissionDeadline!) / 1000)}:F>\n\n` +
        `After the deadline, one theme will be randomly selected and you'll submit songs based on that theme.`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Theme submission reminder (24h notice)
   */
  static themeSubmissionReminder(league: League, round: Round): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle(`⏰ Reminder: Theme Submissions Due Soon!`)
      .setDescription(
        `You have approximately 24 hours left to submit a theme idea for **${league.name}**!\n\n` +
        `**Deadline:** <t:${Math.floor(toTimestamp(round.themeSubmissionDeadline!) / 1000)}:F>\n\n` +
        `Don't miss out! Use \`/submit-theme\` to submit your idea.`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Theme selected (random)
   */
  static themeSelected(league: League, round: Round, selectedTheme: ThemeSubmission): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`🎲 Theme Selected for Round ${round.roundNumber}!`)
      .setDescription(
        `The theme has been randomly selected from all submissions!\n\n` +
        `**"${round.prompt}"**\n\n` +
        `Submitted by <@${selectedTheme.userId}>\n\n` +
        `Now it's time to submit your song! Use \`/submit-song\`.\n\n` +
        `**Song Submission Deadline:** <t:${Math.floor(toTimestamp(round.submissionDeadline) / 1000)}:F>`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Theme selected (fallback - admin's original)
   */
  static themeSelectedFallback(league: League, round: Round): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xE67E22)
      .setTitle(`📋 Theme Set for Round ${round.roundNumber}`)
      .setDescription(
        `No themes were submitted during the theme phase.\n\n` +
        `Using admin's original prompt:\n**"${round.prompt}"**\n\n` +
        `Now it's time to submit your song! Use \`/submit-song\`.\n\n` +
        `**Song Submission Deadline:** <t:${Math.floor(toTimestamp(round.submissionDeadline) / 1000)}:F>`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Submission deadline reminder (24h notice)
   */
  static submissionReminder(league: League, round: Round): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xF39C12)
      .setTitle(`⏰ Reminder: Submissions Due Soon!`)
      .setDescription(
        `You have approximately 24 hours left to submit your song for **${league.name}**!\n\n` +
        `**Prompt:** "${round.prompt}"\n` +
        `**Deadline:** <t:${Math.floor(toTimestamp(round.submissionDeadline) / 1000)}:F>\n\n` +
        `Don't miss out! Use \`/submit-song\`.`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Voting started
   */
  static votingStarted(league: League, round: Round): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`🗳️ Voting Open for Round ${round.roundNumber}!`)
      .setDescription(
        `Submissions are in! It's time to vote in **${league.name}**.\n\n` +
        `**Prompt:** ${round.prompt}\n` +
        `**Voting Deadline:** <t:${Math.floor(toTimestamp(round.votingDeadline) / 1000)}:F>\n\n` +
        (round.playlist
          ? `🎧 **[Listen to all submissions with this Spotify playlist](${round.playlist.playlistUrl})**\n\n`
          : ''
        ) +
        `Review the submissions and use \`/vote\` to rank your favorites!`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Voting deadline reminder (24h notice)
   */
  static votingReminder(league: League, round: Round): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`⏰ Reminder: Voting Ends Soon!`)
      .setDescription(
        `You have approximately 24 hours left to vote in **${league.name}**!\n\n` +
        `**Prompt:** "${round.prompt}"\n` +
        `**Deadline:** <t:${Math.floor(toTimestamp(round.votingDeadline) / 1000)}:F>\n\n` +
        (round.playlist
          ? `🎧 **[Listen to all submissions with this Spotify playlist](${round.playlist.playlistUrl})**\n\n`
          : ''
        ) +
        `Make sure to cast your votes using \`/vote\`!`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Submission running out reminder (when few people left)
   */
  static submissionRunningOut(league: League, round: Round, missingSubmittersCount: number): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`⚠️ Submissions Closing Soon!`)
      .setDescription(
        `Only **${missingSubmittersCount}** ${missingSubmittersCount === 1 ? 'person is' : 'people are'} left to submit in **${league.name}**!\n\n` +
        `**Prompt:** "${round.prompt}"\n` +
        `**Deadline:** <t:${Math.floor(toTimestamp(round.submissionDeadline) / 1000)}:F>\n\n` +
        `Don't forget to submit your song using \`/submit-song\`!`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Admin - new round can be started
   */
  static roundReadyToStart(league: League): EmbedBuilder {
    const nextRound = league.currentRound + 1;
    return new EmbedBuilder()
      .setColor(0x2ECC71)
      .setTitle(`✅ Ready for Round ${nextRound}`)
      .setDescription(
        `The current round in **${league.name}** has ended!\n\n` +
        `You can now start Round ${nextRound} using \`/start-round\` when you're ready.\n\n` +
        `**Rounds:** ${nextRound} of ${league.totalRounds}`
      )
      .setFooter({ text: 'Admin notification' })
      .setTimestamp();
  }

  /**
   * DM Notification: Voting running out reminder (when few people left)
   */
  static votingRunningOut(league: League, round: Round, missingVotersCount: number): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle(`⚠️ Voting Closing Soon!`)
      .setDescription(
        `Only **${missingVotersCount}** ${missingVotersCount === 1 ? 'person is' : 'people are'} left to vote in **${league.name}**!\n\n` +
        `**Prompt:** "${round.prompt}"\n` +
        `**Deadline:** <t:${Math.floor(toTimestamp(round.votingDeadline) / 1000)}:F>\n\n` +
        (round.playlist
          ? `🎧 **[Listen to all submissions with this Spotify playlist](${round.playlist.playlistUrl})**\n\n`
          : ''
        ) +
        `Don't forget to cast your votes using \`/vote\`!`
      )
      .setFooter({ text: `Round ${round.roundNumber} of ${league.totalRounds}` })
      .setTimestamp();
  }

  /**
   * DM Notification: Admin - all votes received
   */
  static allVotesReceived(league: League, round: Round): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(`🎉 All Votes Received for Round ${round.roundNumber}!`)
      .setDescription(
        `All ${league.participants.length} participants have submitted their votes in **${league.name}**.\n\n` +
        `You can now end the round using \`/end-round\` when you're ready to announce results.`
      )
      .setFooter({ text: `Round ${round.roundNumber} | Admin notification` })
      .setTimestamp();
  }

  /**
   * Channel Message: Round ended with leaderboard
   */
  static roundEndedWithLeaderboard(
    league: League,
    round: Round,
    leagueStandings: Map<string, number>
  ): { content: string; embeds: EmbedBuilder[] } {
    const scores = calculateScores(round);
    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);

    // Get set of voters to identify disqualified players
    const voterIds = new Set(round.votes.map(v => v.voterId));

    // Round results embed
    const roundEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🏆 Round ${round.roundNumber} Results`)
      .setDescription(`**Prompt:** ${round.prompt}\n\n**Final Standings:**\n`);

    let resultsText = '';
    sortedScores.forEach(([userId, score], index) => {
      const submission = round.submissions.find(s => s.userId === userId);
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const didNotVote = !voterIds.has(userId);

      if (submission) {
        resultsText += `\n${medal} **${submission.songTitle}** by ${submission.artist}\n`;
        resultsText += `   Submitted by <@${userId}> - **${score} points**${didNotVote ? ' ⚠️ (DQ - did not vote)' : ''}\n`;
        resultsText += `   ${submission.songUrl}\n`;
      }
    });

    roundEmbed.setDescription(roundEmbed.data.description + resultsText);
    roundEmbed.setFooter({ text: `Votes cast: ${round.votes.length}/${league.participants.length}` });

    // Leaderboard embed
    const leaderboardEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('📊 Current Leaderboard')
      .setDescription(this.formatLeaderboard(leagueStandings))
      .setFooter({ text: `After Round ${round.roundNumber} of ${league.totalRounds}` });

    return {
      content: `🎉 **Round ${round.roundNumber} has ended!**`,
      embeds: [roundEmbed, leaderboardEmbed]
    };
  }

  /**
   * Channel Message: League ended with fanfare and spoilers
   */
  static leagueEndedWithFanfare(
    league: League,
    round: Round,
    results: LeagueEndResults
  ): { content: string; embeds: EmbedBuilder[] } {
    const scores = calculateScores(round);
    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);

    // Get set of voters to identify disqualified players
    const voterIds = new Set(round.votes.map(v => v.voterId));

    // Final round results embed
    const roundEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`🏆 Round ${round.roundNumber} Results`)
      .setDescription(`**Prompt:** ${round.prompt}\n\n**Final Standings:**\n`);

    let resultsText = '';
    sortedScores.forEach(([userId, score], index) => {
      const submission = round.submissions.find(s => s.userId === userId);
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const didNotVote = !voterIds.has(userId);

      if (submission) {
        resultsText += `\n${medal} **${submission.songTitle}** by ${submission.artist}\n`;
        resultsText += `   Submitted by <@${userId}> - **${score} points**${didNotVote ? ' ⚠️ (DQ - did not vote)' : ''}\n`;
        resultsText += `   ${submission.songUrl}\n`;
      }
    });

    roundEmbed.setDescription(roundEmbed.data.description + resultsText);

    // League end fanfare with spoilers
    const fanfareEmbed = new EmbedBuilder()
      .setColor(0xFF1493)
      .setTitle(`🎉 ${league.name} Has Concluded! 🎉`)
      .setDescription(
        `Congratulations to all participants! The league lasted **${league.totalRounds} rounds**.\n\n` +
        `Click the spoilers below to reveal the final standings:`
      );

    // Add spoiler champion section
    let spoilerText = '\n';
    const top3 = results.winners.slice(0, 3);

    if (top3.length > 0) {
      spoilerText += `||🏆 **LEAGUE CHAMPION** 🏆||\n`;
      spoilerText += `||🥇 <@${top3[0].userId}> - **${top3[0].totalScore} total points**||\n\n`;

      if (top3.length > 1) {
        spoilerText += `||🥈 Runner-up: <@${top3[1].userId}> - **${top3[1].totalScore} points**||\n`;
      }
      if (top3.length > 2) {
        spoilerText += `||🥉 Third Place: <@${top3[2].userId}> - **${top3[2].totalScore} points**||\n\n`;
      }

      // Add round-by-round results
      spoilerText += `||**📜 Round-by-Round Results**||\n\n`;

      for (const roundResult of results.roundResults) {
        spoilerText += `||**Round ${roundResult.roundNumber}: ${roundResult.prompt}**||\n`;

        for (const winner of roundResult.winners.slice(0, 3)) {
          const medal = winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : '🥉';
          spoilerText += `||  ${medal} ${winner.songTitle} - <@${winner.userId}> (${winner.points} pts)||\n`;
        }
        spoilerText += '\n';
      }
    } else {
      spoilerText = '\nNo standings to display - no completed rounds with votes.';
    }

    fanfareEmbed.addFields({
      name: '\u200B',
      value: spoilerText
    });

    return {
      content: `━━━━━━━━━━━━━━━━━━━━\n\n🎵 **${league.name}** has concluded! 🎵`,
      embeds: [roundEmbed, fanfareEmbed]
    };
  }

  /**
   * Channel Message: League ended early (via /end-league command)
   */
  static leagueEndedEarlyWithFanfare(
    league: League,
    results: LeagueEndResults
  ): { content: string; embeds: EmbedBuilder[] } {
    // League end fanfare with spoilers
    const fanfareEmbed = new EmbedBuilder()
      .setColor(0xFF1493)
      .setTitle(`🎉 ${league.name} Has Concluded! 🎉`)
      .setDescription(
        `The league has been ended early by an admin after **${league.rounds.filter(r => r.status === 'completed').length} completed round${league.rounds.filter(r => r.status === 'completed').length === 1 ? '' : 's'}**.\n\n` +
        `Click the spoilers below to reveal the final standings:`
      );

    // Add spoiler champion section
    let spoilerText = '\n';
    const top3 = results.winners.slice(0, 3);

    if (top3.length > 0) {
      spoilerText += `||🏆 **LEAGUE CHAMPION** 🏆||\n`;
      spoilerText += `||🥇 <@${top3[0].userId}> - **${top3[0].totalScore} total points**||\n\n`;

      if (top3.length > 1) {
        spoilerText += `||🥈 Runner-up: <@${top3[1].userId}> - **${top3[1].totalScore} points**||\n`;
      }
      if (top3.length > 2) {
        spoilerText += `||🥉 Third Place: <@${top3[2].userId}> - **${top3[2].totalScore} points**||\n\n`;
      }

      // Add round-by-round results
      spoilerText += `||**📜 Round-by-Round Results**||\n\n`;

      for (const roundResult of results.roundResults) {
        spoilerText += `||**Round ${roundResult.roundNumber}: ${roundResult.prompt}**||\n`;

        for (const winner of roundResult.winners.slice(0, 3)) {
          const medal = winner.rank === 1 ? '🥇' : winner.rank === 2 ? '🥈' : '🥉';
          spoilerText += `||  ${medal} ${winner.songTitle} - <@${winner.userId}> (${winner.points} pts)||\n`;
        }
        spoilerText += '\n';
      }
    } else {
      spoilerText = '\nNo standings to display - no completed rounds with votes.';
    }

    fanfareEmbed.addFields({
      name: '\u200B',
      value: spoilerText
    });

    return {
      content: `━━━━━━━━━━━━━━━━━━━━\n\n🎵 **${league.name}** has concluded! 🎵`,
      embeds: [fanfareEmbed]
    };
  }

  /**
   * Helper: Format leaderboard standings
   */
  private static formatLeaderboard(standings: Map<string, number>): string {
    const sorted = Array.from(standings.entries()).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 0) {
      return 'No scores yet!';
    }

    let text = '';
    sorted.forEach(([userId, score], index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      text += `${medal} <@${userId}> - **${score} points**\n`;
    });

    return text;
  }
}
