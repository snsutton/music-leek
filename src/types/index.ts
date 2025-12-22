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
