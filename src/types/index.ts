export interface ThemeSubmission {
  userId: string;
  theme: string;
  submittedAt: number;
}

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
  spotifyIntegration?: {
    userId: string; // Spotify user ID (e.g., "abc123xyz")
    connectedBy: string; // Discord user ID who connected
    connectedAt: number; // Unix timestamp
  };
}

export interface Round {
  roundNumber: number;
  prompt: string;
  adminPrompt?: string; // Admin's original prompt (used as fallback if no themes submitted)
  status: 'theme-submission' | 'submission' | 'voting' | 'completed';
  startedAt: number;
  themeSubmissionDeadline?: number; // 24h from round start
  submissionDeadline: number;
  votingDeadline: number;
  votingDurationMs?: number; // Duration of voting phase in milliseconds (for recalculating deadline when voting starts early)
  themeSubmissions?: ThemeSubmission[]; // Theme ideas submitted by players
  submissions: Submission[];
  votes: Vote[];
  notificationsSent: {
    roundStarted: boolean;
    themeSubmissionReminder?: boolean; // 24h before theme deadline
    themeSelected?: boolean; // When theme is selected (auto or manual)
    submissionReminder: boolean;
    votingStarted: boolean;
    votingReminder: boolean;
    allVotesReceived: boolean;
  };
  playlist?: {
    playlistId: string; // Spotify playlist ID
    playlistUrl: string; // Full URL to playlist
    createdAt: number; // Unix timestamp
    trackCount: number; // Number of tracks added
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
  | 'theme_submission_reminder'
  | 'theme_selected'
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

export interface SpotifyTokenData {
  accessToken: string; // OAuth access token for Spotify API
  refreshToken: string; // Used to get new access token when expired
  expiresAt: number; // Unix timestamp (tokens expire after 1 hour)
  scope: string[]; // Permissions granted by user
  tokenType: 'Bearer';
}

export interface TokenStorage {
  spotify: {
    [discordUserId: string]: SpotifyTokenData;
  };
}

export interface DmContext {
  userId: string;
  guildId: string;
  lastNotificationAt: number;
  notificationType: string;
}

export interface DmContextStorage {
  contexts: { [userId: string]: DmContext };
}
