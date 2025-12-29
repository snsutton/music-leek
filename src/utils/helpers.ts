import { League, Round, Submission, LeagueEndResults } from '../types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function getCurrentRound(league: League): Round | null {
  if (league.rounds.length === 0) return null;
  return league.rounds[league.currentRound - 1] || null;
}

export function formatLeagueStatus(league: League): string {
  const round = getCurrentRound(league);
  if (!round) {
    return `**${league.name}**\nNo active rounds. Use \`/start-round\` to begin!`;
  }

  const status = round.status === 'submission' ? 'Submission Phase' :
                 round.status === 'voting' ? 'Voting Phase' : 'Completed';

  const deadline = round.status === 'submission' ? round.submissionDeadline : round.votingDeadline;
  const timeLeft = deadline - Date.now();
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const daysLeft = Math.floor(hoursLeft / 24);

  return `**${league.name}** - Round ${round.roundNumber}
**Prompt:** ${round.prompt}
**Status:** ${status}
**Time Remaining:** ${daysLeft}d ${hoursLeft % 24}h
**Submissions:** ${round.submissions.length}/${league.participants.length}`;
}

export function getMissingSubmitters(league: League, round: Round): string[] {
  const submitterIds = new Set(round.submissions.map(s => s.userId));
  return league.participants.filter(id => !submitterIds.has(id));
}

export function getMissingVoters(league: League, round: Round): string[] {
  const voterIds = new Set(round.votes.map(v => v.voterId));
  return league.participants.filter(id => !voterIds.has(id));
}

export function extractSongInfo(url: string): { songTitle: string; artist: string } {
  // Basic parsing - can be enhanced with actual API integration
  return {
    songTitle: 'Song Title',
    artist: 'Artist Name'
  };
}

export function calculateScores(round: Round): Map<string, number> {
  const scores = new Map<string, number>();

  // Get set of user IDs who voted in this round
  const voterIds = new Set(round.votes.map(vote => vote.voterId));

  for (const vote of round.votes) {
    for (const v of vote.votes) {
      const submission = round.submissions[v.submissionIndex];
      // Only award points if the submission owner also voted in this round
      if (submission && voterIds.has(submission.userId)) {
        const currentScore = scores.get(submission.userId) || 0;
        scores.set(submission.userId, currentScore + v.points);
      }
    }
  }

  return scores;
}

export function formatLeaderboard(league: League): string {
  const allScores = new Map<string, number>();

  for (const round of league.rounds) {
    if (round.status === 'completed') {
      const roundScores = calculateScores(round);
      for (const [userId, score] of roundScores) {
        const current = allScores.get(userId) || 0;
        allScores.set(userId, current + score);
      }
    }
  }

  const sorted = Array.from(allScores.entries())
    .sort((a, b) => b[1] - a[1]);

  let leaderboard = `**${league.name} - Leaderboard**\n\n`;
  sorted.forEach(([userId, score], index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    leaderboard += `${medal} <@${userId}>: ${score} points\n`;
  });

  return leaderboard || 'No scores yet!';
}

export function calculateLeagueResults(league: League): LeagueEndResults {
  const leagueScores = new Map<string, number>();
  const roundResults = [];

  for (const round of league.rounds) {
    if (round.status !== 'completed') continue;

    const roundScores = calculateScores(round);
    const sortedRound = Array.from(roundScores.entries())
      .sort((a, b) => b[1] - a[1]);

    // Add to league totals
    for (const [userId, score] of roundScores) {
      leagueScores.set(userId, (leagueScores.get(userId) || 0) + score);
    }

    // Build round results (top 5 per round)
    roundResults.push({
      roundNumber: round.roundNumber,
      prompt: round.prompt,
      winners: sortedRound.slice(0, 5).map(([userId, points], index) => {
        const sub = round.submissions.find(s => s.userId === userId);
        return {
          userId,
          songTitle: sub?.songTitle || 'Unknown',
          artist: sub?.artist || 'Unknown',
          songUrl: sub?.songUrl || '',
          points,
          rank: index + 1
        };
      })
    });
  }

  const sortedLeague = Array.from(leagueScores.entries())
    .sort((a, b) => b[1] - a[1]);

  return {
    winners: sortedLeague.map(([userId, totalScore], index) => ({
      userId,
      totalScore,
      rank: index + 1
    })),
    roundResults
  };
}

export function calculateLeagueStandings(league: League): Map<string, number> {
  const allScores = new Map<string, number>();

  for (const round of league.rounds) {
    if (round.status === 'completed') {
      const roundScores = calculateScores(round);
      for (const [userId, score] of roundScores) {
        const current = allScores.get(userId) || 0;
        allScores.set(userId, current + score);
      }
    }
  }

  return allScores;
}

/**
 * Normalize song title and artist for cross-platform duplicate detection.
 * Handles variations in capitalization, whitespace, special characters, and featured artists.
 *
 * @param title - Song title
 * @param artist - Artist name(s)
 * @returns Normalized identifier string in format "title::artist"
 */
export function normalizeSongIdentifier(title: string, artist: string): string {
  if (!title || !artist) {
    return '';
  }

  // Normalize title: lowercase, remove parenthetical content, special chars, normalize whitespace
  const normalizedTitle = title
    .toLowerCase()
    .trim()
    // Remove content in parentheses/brackets (often features/versions)
    .replace(/\s*[\(\[\{].*?[\)\]\}]\s*/g, ' ')
    // Remove special characters but keep spaces
    .replace(/[^\w\s]/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Normalize artist: lowercase, handle featuring indicators, split and sort
  const normalizedArtist = artist
    .toLowerCase()
    .trim()
    // Remove featuring/feat/ft indicators and replace with comma
    .replace(/\b(feat\.?|ft\.?|featuring|with)\b/gi, ',')
    // Split by common delimiters
    .split(/[,&]/)
    // Clean each artist name
    .map(name => name
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    )
    // Remove empty entries
    .filter(name => name.length > 0)
    // Sort alphabetically for consistent comparison
    .sort()
    .join(' ');

  return `${normalizedTitle}::${normalizedArtist}`;
}
