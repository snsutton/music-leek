import { execute } from '../../modals/vote-modal';
import { createMockModalSubmit, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import { League } from '../../types';

jest.mock('../../utils/storage');

describe('vote-modal', () => {
  beforeEach(() => {
    MockStorage.reset();
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId: string) => MockStorage.getLeagueByGuild(guildId));
    (Storage.saveLeague as jest.Mock) = jest.fn((league: League) => MockStorage.saveLeague(league));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow a participant to vote', async () => {
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
        submissionDeadline: Date.now(),
        votingDeadline: Date.now() + 86400000,
        submissions: [
          { userId: 'user123', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: Date.now() },
          { userId: 'user456', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: Date.now() },
        ],
        votes: [],
      }],
      participants: ['user123', 'user456'],
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([
        ['league-id', 'league123'],
        ['votes', '1:5'],
      ]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('✅');
    expect(replies[0].content).toContain('Votes cast: 1/2');

    const updatedLeague = MockStorage.getLeagueByGuild('guild123');
    expect(updatedLeague?.rounds[0].votes).toHaveLength(1);
    expect(updatedLeague?.rounds[0].votes[0]).toEqual({
      voterId: 'user456',
      votes: [{ submissionIndex: 0, points: 5 }],
    });
  });

  it('should allow voting for multiple songs', async () => {
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
        submissionDeadline: Date.now(),
        votingDeadline: Date.now() + 86400000,
        submissions: [
          { userId: 'user123', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: Date.now() },
          { userId: 'user456', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: Date.now() },
          { userId: 'user789', songUrl: 'url3', songTitle: 'Song 3', artist: 'Artist 3', submittedAt: Date.now() },
        ],
        votes: [],
      }],
      participants: ['user123', 'user456', 'user789'],
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user123',
      fields: new Map([
        ['league-id', 'league123'],
        ['votes', '2:5, 3:3'],
      ]),
    });

    await execute(interaction);

    const updatedLeague = MockStorage.getLeagueByGuild('guild123');
    expect(updatedLeague?.rounds[0].votes[0].votes).toEqual([
      { submissionIndex: 1, points: 5 },
      { submissionIndex: 2, points: 3 },
    ]);
  });

  it('should reject when voting for own song', async () => {
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
        submissionDeadline: Date.now(),
        votingDeadline: Date.now() + 86400000,
        submissions: [
          { userId: 'user123', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: Date.now() },
          { userId: 'user456', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: Date.now() },
        ],
        votes: [],
      }],
      participants: ['user123', 'user456'],
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([
        ['league-id', 'league123'],
        ['votes', '2:5'],
      ]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('You cannot vote for your own song!');
    expect(replies[0].ephemeral).toBe(true);
  });

  it('should reject when voting phase has not started', async () => {
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
      }],
      participants: ['user123', 'user456'],
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['league-id', 'league123']]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('Voting phase has not started or has ended!');
    expect(replies[0].ephemeral).toBe(true);
  });

  it('should reject invalid vote format', async () => {
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
        submissionDeadline: Date.now(),
        votingDeadline: Date.now() + 86400000,
        submissions: [
          { userId: 'user123', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: Date.now() },
        ],
        votes: [],
      }],
      participants: ['user123', 'user456'],
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([
        ['league-id', 'league123'],
        ['votes', 'invalid'],
      ]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('Invalid vote format');
    expect(replies[0].ephemeral).toBe(true);
  });
});
