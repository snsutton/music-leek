import { execute } from '../../modals/submit-song-modal';
import { createMockModalSubmit, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import { League } from '../../types';

jest.mock('../../utils/storage');

describe('submit-song-modal', () => {
  beforeEach(() => {
    MockStorage.reset();
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId: string) => MockStorage.getLeagueByGuild(guildId));
    (Storage.saveLeague as jest.Mock) = jest.fn((league: League) => MockStorage.saveLeague(league));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow a participant to submit a song', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: Date.now(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'submission',
        startedAt: Date.now(),
        submissionDeadline: Date.now() + 86400000,
        votingDeadline: Date.now() + 172800000,
        submissions: [],
        votes: [],
        notificationsSent: {
          roundStarted: false,
          submissionReminder: false,
          votingStarted: false,
          votingReminder: false,
          allVotesReceived: false
        },
      }],
      participants: ['user123', 'user456'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([
        ['league-id', 'league123'],
        ['song-url', 'https://spotify.com/track/123'],
        ['song-title', 'Bohemian Rhapsody'],
        ['artist', 'Queen'],
      ]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('✅');
    expect(replies[0].content).toContain('Bohemian Rhapsody');
    expect(replies[0].content).toContain('Queen');
    expect(replies[0].content).toContain('Submissions: 1/2');

    const updatedLeague = MockStorage.getLeagueByGuild('guild123');
    expect(updatedLeague?.rounds[0].submissions).toHaveLength(1);
    expect(updatedLeague?.rounds[0].submissions[0]).toEqual({
      userId: 'user456',
      songUrl: 'https://spotify.com/track/123',
      songTitle: 'Bohemian Rhapsody',
      artist: 'Queen',
      submittedAt: expect.any(Number),
    });
  });

  it('should reject when league not found', async () => {
    const interaction = createMockModalSubmit({
      fields: new Map([['league-id', 'nonexistent']]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('League not found!');
    expect(replies[0].ephemeral).toBe(true);
  });

  it('should reject when user is not in the league', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: Date.now(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'submission',
        startedAt: Date.now(),
        submissionDeadline: Date.now() + 86400000,
        votingDeadline: Date.now() + 172800000,
        submissions: [],
        votes: [],
        notificationsSent: {
          roundStarted: false,
          submissionReminder: false,
          votingStarted: false,
          votingReminder: false,
          allVotesReceived: false
        },
      }],
      participants: ['user123'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user999',
      fields: new Map([['league-id', 'league123']]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('You are not in this league!');
    expect(replies[0].ephemeral).toBe(true);
  });

  it('should reject when user already submitted', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: Date.now(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'submission',
        startedAt: Date.now(),
        submissionDeadline: Date.now() + 86400000,
        votingDeadline: Date.now() + 172800000,
        submissions: [{
          userId: 'user456',
          songUrl: 'https://spotify.com/track/123',
          songTitle: 'Existing Song',
          artist: 'Artist',
          submittedAt: Date.now(),
        }],
        votes: [],
        notificationsSent: {
          roundStarted: false,
          submissionReminder: false,
          votingStarted: false,
          votingReminder: false,
          allVotesReceived: false
        },
      }],
      participants: ['user123', 'user456'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([
        ['league-id', 'league123'],
        ['song-title', 'New Song'],
      ]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('already submitted');
    expect(replies[0].ephemeral).toBe(true);
  });

  it('should reject when submission phase has ended', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: Date.now(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'voting',
        startedAt: Date.now(),
        submissionDeadline: Date.now() + 86400000,
        votingDeadline: Date.now() + 172800000,
        submissions: [],
        votes: [],
        notificationsSent: {
          roundStarted: false,
          submissionReminder: false,
          votingStarted: false,
          votingReminder: false,
          allVotesReceived: false
        },
      }],
      participants: ['user123', 'user456'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['league-id', 'league123']]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('Submission phase has ended!');
    expect(replies[0].ephemeral).toBe(true);
  });
});
