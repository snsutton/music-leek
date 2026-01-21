import { execute } from '../../modals/vote-points-modal';
import { createMockModalSubmit, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import { VoteSessionManager } from '../../utils/vote-sessions';
import { League } from '../../types';

jest.mock('../../utils/storage');

describe('vote-points-modal', () => {
  beforeEach(() => {
    MockStorage.reset();
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId: string) =>
      MockStorage.getLeagueByGuild(guildId)
    );
    (Storage.saveLeague as jest.Mock) = jest.fn((league: League) =>
      MockStorage.saveLeague(league)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save vote when points sum to exactly 10', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date(Date.now() + 86400000).toISOString(),
        submissions: [
          { userId: 'user123', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
          { userId: 'user456', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
          { userId: 'user789', songUrl: 'url3', songTitle: 'Song 3', artist: 'Artist 3', submittedAt: new Date().toISOString() },
        ],
        votes: [],
        notificationsSent: {
          roundStarted: false,
          submissionReminder: false,
          votingStarted: false,
          votingReminder: false,
          allVotesReceived: false
        },
      }],
      participants: ['user123', 'user456', 'user789'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);
    // user456 voting for indices 0 (user123's song) and 2 (user789's song)
    VoteSessionManager.createSession('user456', 'guild123', [0, 2]);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([
        ['points-0', '6'],
        ['points-2', '4'],
      ]),
    });
    interaction.customId = 'vote-points-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('✅');
    expect(replies[0].content).toContain('10/10');

    const updatedLeague = MockStorage.getLeagueByGuild('guild123');
    expect(updatedLeague?.rounds[0].votes).toHaveLength(1);
    expect(updatedLeague?.rounds[0].votes[0].voterId).toBe('user456');
    expect(updatedLeague?.rounds[0].votes[0].votes).toEqual([
      { submissionIndex: 0, points: 6 },
      { submissionIndex: 2, points: 4 },
    ]);
  });

  it('should save vote when points sum to less than 10', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date(Date.now() + 86400000).toISOString(),
        submissions: [
          { userId: 'user123', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
          { userId: 'user456', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
        ],
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
    // user456 voting for index 0 (user123's song)
    VoteSessionManager.createSession('user456', 'guild123', [0]);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['points-0', '7']]),
    });
    interaction.customId = 'vote-points-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('✅');
    expect(replies[0].content).toContain('7/10');

    const updatedLeague = MockStorage.getLeagueByGuild('guild123');
    expect(updatedLeague?.rounds[0].votes).toHaveLength(1);
    expect(updatedLeague?.rounds[0].votes[0].votes).toEqual([
      { submissionIndex: 0, points: 7 },
    ]);
  });

  it('should reject when points exceed budget', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date(Date.now() + 86400000).toISOString(),
        submissions: [
          { userId: 'user123', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
          { userId: 'user456', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
          { userId: 'user789', songUrl: 'url3', songTitle: 'Song 3', artist: 'Artist 3', submittedAt: new Date().toISOString() },
        ],
        votes: [],
        notificationsSent: {
          roundStarted: false,
          submissionReminder: false,
          votingStarted: false,
          votingReminder: false,
          allVotesReceived: false
        },
      }],
      participants: ['user123', 'user456', 'user789'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);
    // user456 voting for indices 0 and 2 (not their own song)
    VoteSessionManager.createSession('user456', 'guild123', [0, 2]);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([
        ['points-0', '6'],
        ['points-2', '5'],
      ]),
    });
    interaction.customId = 'vote-points-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('❌');
    expect(replies[0].content).toContain('11 points');
    expect(replies[0].content).toContain('only have **10**');

    const updatedLeague = MockStorage.getLeagueByGuild('guild123');
    expect(updatedLeague?.rounds[0].votes).toHaveLength(0);
  });

  it('should reject when total points is zero', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date(Date.now() + 86400000).toISOString(),
        submissions: [
          { userId: 'user123', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
          { userId: 'user456', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
        ],
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
    VoteSessionManager.createSession('user456', 'guild123', [1]);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['points-1', '0']]),
    });
    interaction.customId = 'vote-points-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('You must allocate at least 1 point!');
  });

  it('should reject self-voting', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date(Date.now() + 86400000).toISOString(),
        submissions: [
          { userId: 'user456', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
          { userId: 'user789', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
        ],
        votes: [],
        notificationsSent: {
          roundStarted: false,
          submissionReminder: false,
          votingStarted: false,
          votingReminder: false,
          allVotesReceived: false
        },
      }],
      participants: ['user456', 'user789'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);
    VoteSessionManager.createSession('user456', 'guild123', [0, 1]);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([
        ['points-0', '5'],
        ['points-1', '5'],
      ]),
    });
    interaction.customId = 'vote-points-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('You cannot vote for your own song!');
  });

  it('should reject when session expired', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date(Date.now() + 86400000).toISOString(),
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
      fields: new Map([['points-0', '5']]),
    });
    interaction.customId = 'vote-points-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('Vote session expired!');
  });

  it('should replace existing vote when user votes again', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Best rock song',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date(Date.now() + 86400000).toISOString(),
        submissions: [
          { userId: 'user123', songUrl: 'url1', songTitle: 'Song 1', artist: 'Artist 1', submittedAt: new Date().toISOString() },
          { userId: 'user456', songUrl: 'url2', songTitle: 'Song 2', artist: 'Artist 2', submittedAt: new Date().toISOString() },
          { userId: 'user789', songUrl: 'url3', songTitle: 'Song 3', artist: 'Artist 3', submittedAt: new Date().toISOString() },
        ],
        votes: [
          {
            voterId: 'user789',
            votes: [{ submissionIndex: 0, points: 10 }],
          },
        ],
        notificationsSent: {
          roundStarted: false,
          submissionReminder: false,
          votingStarted: false,
          votingReminder: false,
          allVotesReceived: false,
        },
      }],
      participants: ['user123', 'user456', 'user789'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);
    VoteSessionManager.createSession('user789', 'guild123', [1]);

    const interaction = createMockModalSubmit({
      userId: 'user789',
      fields: new Map([['points-1', '8']]),
    });
    interaction.customId = 'vote-points-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('✅');

    const updatedLeague = MockStorage.getLeagueByGuild('guild123');
    expect(updatedLeague?.rounds[0].votes).toHaveLength(1);
    expect(updatedLeague?.rounds[0].votes[0].votes).toEqual([
      { submissionIndex: 1, points: 8 },
    ]);
  });
});
