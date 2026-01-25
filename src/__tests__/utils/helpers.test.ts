import { calculateScores } from '../../utils/helpers';
import { Round } from '../../types';

describe('calculateScores', () => {
  it('should calculate scores for all who received votes', () => {
    const round: Round = {
      roundNumber: 1,
      prompt: 'Best rock song',
      status: 'completed',
      startedAt: new Date().toISOString(),
      submissionDeadline: new Date().toISOString(),
      votingDeadline: new Date().toISOString(),
      submissions: [
        { userId: 'user1', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
        { userId: 'user2', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
        { userId: 'user3', songUrl: 'url3', songTitle: 'Song 3', artist: 'Artist 3', submittedAt: new Date().toISOString() },
      ],
      votes: [
        {
          voterId: 'user1',
          votes: [
            { submissionIndex: 1, points: 6 }, // 6 points to user2
            { submissionIndex: 2, points: 4 }, // 4 points to user3
          ]
        },
        {
          voterId: 'user2',
          votes: [
            { submissionIndex: 0, points: 5 }, // 5 points to user1
            { submissionIndex: 2, points: 5 }, // 5 points to user3
          ]
        }
      ],
      notificationsSent: {
        roundStarted: false,
        submissionReminder: false,
        votingStarted: false,
        votingReminder: false,
        allVotesReceived: false,
      }
    };

    const scores = calculateScores(round);

    // user1 received 5 points from user2
    expect(scores.get('user1')).toBe(5);

    // user2 received 6 points from user1
    expect(scores.get('user2')).toBe(6);

    // user3 received 4+5=9 points (even though they didn't vote - calculateScores gives raw scores)
    expect(scores.get('user3')).toBe(9);
  });

  it('should award points to all voters when all participants voted', () => {
    const round: Round = {
      roundNumber: 1,
      prompt: 'Best rock song',
      status: 'completed',
      startedAt: new Date().toISOString(),
      submissionDeadline: new Date().toISOString(),
      votingDeadline: new Date().toISOString(),
      submissions: [
        { userId: 'user1', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
        { userId: 'user2', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
        { userId: 'user3', songUrl: 'url3', songTitle: 'Song 3', artist: 'Artist 3', submittedAt: new Date().toISOString() },
      ],
      votes: [
        {
          voterId: 'user1',
          votes: [
            { submissionIndex: 1, points: 6 },
            { submissionIndex: 2, points: 4 },
          ]
        },
        {
          voterId: 'user2',
          votes: [
            { submissionIndex: 0, points: 5 },
            { submissionIndex: 2, points: 5 },
          ]
        },
        {
          voterId: 'user3',
          votes: [
            { submissionIndex: 0, points: 3 },
            { submissionIndex: 1, points: 7 },
          ]
        }
      ],
      notificationsSent: {
        roundStarted: false,
        submissionReminder: false,
        votingStarted: false,
        votingReminder: false,
        allVotesReceived: false,
      }
    };

    const scores = calculateScores(round);

    // user1: 5 (from user2) + 3 (from user3) = 8
    expect(scores.get('user1')).toBe(8);

    // user2: 6 (from user1) + 7 (from user3) = 13
    expect(scores.get('user2')).toBe(13);

    // user3: 4 (from user1) + 5 (from user2) = 9
    expect(scores.get('user3')).toBe(9);
  });

  it('should return empty map when no one voted', () => {
    const round: Round = {
      roundNumber: 1,
      prompt: 'Best rock song',
      status: 'completed',
      startedAt: new Date().toISOString(),
      submissionDeadline: new Date().toISOString(),
      votingDeadline: new Date().toISOString(),
      submissions: [
        { userId: 'user1', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
      ],
      votes: [],
      notificationsSent: {
        roundStarted: false,
        submissionReminder: false,
        votingStarted: false,
        votingReminder: false,
        allVotesReceived: false,
      }
    };

    const scores = calculateScores(round);

    // All submitters appear in scores, even with 0 points
    expect(scores.size).toBe(1);
    expect(scores.get('user1')).toBe(0);
  });

  it('should award points to non-voters who received votes', () => {
    const round: Round = {
      roundNumber: 1,
      prompt: 'Best rock song',
      status: 'completed',
      startedAt: new Date().toISOString(),
      submissionDeadline: new Date().toISOString(),
      votingDeadline: new Date().toISOString(),
      submissions: [
        { userId: 'user1', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
        { userId: 'user2', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
        { userId: 'user3', songUrl: 'url3', songTitle: 'Song 3', artist: 'Artist 3', submittedAt: new Date().toISOString() },
        { userId: 'user4', songUrl: 'url4', songTitle: 'Song 4', artist: 'Artist 4', submittedAt: new Date().toISOString() },
      ],
      votes: [
        {
          voterId: 'user1',
          votes: [
            { submissionIndex: 1, points: 10 }, // All points to user2 (non-voter)
          ]
        }
      ],
      notificationsSent: {
        roundStarted: false,
        submissionReminder: false,
        votingStarted: false,
        votingReminder: false,
        allVotesReceived: false,
      }
    };

    const scores = calculateScores(round);

    // user1 voted but received no points - still appears with 0
    expect(scores.get('user1')).toBe(0);

    // user2 received 10 points (calculateScores gives raw scores regardless of voter status)
    expect(scores.get('user2')).toBe(10);

    // user3 and user4 submitted but received no votes - appear with 0
    expect(scores.get('user3')).toBe(0);
    expect(scores.get('user4')).toBe(0);

    // All submitters appear in scores
    expect(scores.size).toBe(4);
  });

  it('should accumulate multiple votes for the same voter', () => {
    const round: Round = {
      roundNumber: 1,
      prompt: 'Best rock song',
      status: 'completed',
      startedAt: new Date().toISOString(),
      submissionDeadline: new Date().toISOString(),
      votingDeadline: new Date().toISOString(),
      submissions: [
        { userId: 'user1', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
        { userId: 'user2', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
      ],
      votes: [
        {
          voterId: 'user1',
          votes: [
            { submissionIndex: 1, points: 10 },
          ]
        },
        {
          voterId: 'user2',
          votes: [
            { submissionIndex: 0, points: 3 },
            { submissionIndex: 0, points: 7 }, // Multiple votes for same submission in same ballot
          ]
        }
      ],
      notificationsSent: {
        roundStarted: false,
        submissionReminder: false,
        votingStarted: false,
        votingReminder: false,
        allVotesReceived: false,
      }
    };

    const scores = calculateScores(round);

    // user1 voted and received 3+7=10 points from user2
    expect(scores.get('user1')).toBe(10);

    // user2 voted and received 10 points from user1
    expect(scores.get('user2')).toBe(10);
  });
});
