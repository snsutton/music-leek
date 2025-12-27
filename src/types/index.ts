export interface League {
  name: string;
  guildId: string;
  channelId: string;
  createdBy: string;
  admins: string[]; // user IDs of league admins (includes createdBy)
  createdAt: number;
  currentRound: number;
  rounds: Round[];
  participants: string[]; // user IDs
  totalRounds: number; // Total number of rounds planned for this league
  isCompleted: boolean; // Whether league has finished all rounds
  completedAt?: number; // Timestamp when league was completed
}

export interface Round {
  roundNumber: number;
  prompt: string;
  status: 'submission' | 'voting' | 'completed';
  startedAt: number;
  submissionDeadline: number;
  votingDeadline: number;
  submissions: Submission[];
  votes: Vote[];
  notificationsSent: {
    roundStarted: boolean;
    submissionReminder: boolean;
    votingStarted: boolean;
    votingReminder: boolean;
    allVotesReceived: boolean;
  };
}

export interface Submission {
  userId: string;
  songUrl: string;
  songTitle: string;
  artist: string;
  submittedAt: number;
}

export interface Vote {
  voterId: string;
  votes: {
    submissionIndex: number; // index in submissions array
    points: number; // points awarded (e.g., 1-5)
  }[];
}

export interface LeagueData {
  leagues: { [leagueId: string]: League };
}

export interface SongMetadata {
  title: string;
  artist: string;
  albumName?: string;
  isExplicit?: boolean;
}

export interface MusicServiceError {
  code: 'INVALID_URL' | 'NOT_FOUND' | 'API_ERROR' | 'RATE_LIMITED' | 'NETWORK_ERROR';
  message: string;
  retryable: boolean;
}

export type MusicPlatform = 'spotify' | 'apple-music' | 'unsupported';

export interface ParsedMusicUrl {
  platform: MusicPlatform;
  trackId: string;
  originalUrl: string;
}

export type NotificationType =
  | 'league_created'
  | 'round_started'
  | 'submission_reminder'
  | 'voting_started'
  | 'voting_reminder'
  | 'league_ended'
  | 'round_ready_to_start';

export interface NotificationResult {
  userId: string;
  success: boolean;
  error?: string;
}

export interface LeagueEndResults {
  winners: Array<{
    userId: string;
    totalScore: number;
    rank: number;
  }>;
  roundResults: Array<{
    roundNumber: number;
    prompt: string;
    winners: Array<{
      userId: string;
      songTitle: string;
      artist: string;
      songUrl: string;
      points: number;
      rank: number;
    }>;
  }>;
}
