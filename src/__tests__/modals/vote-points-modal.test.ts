import { execute } from '../../modals/vote-points-modal';
import { createMockModalSubmit, getMockReplies, getMockUpdates } from '../utils/discord-mocks';
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
    // Clean up any sessions
    VoteSessionManager.deleteSession('user456', 'guild123');
    VoteSessionManager.deleteSession('user789', 'guild123');
  });

  function createTestLeague(): League {
    return {
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
  }

  it('should update session points when valid points entered', async () => {
    const mockLeague = createTestLeague();
    MockStorage.saveLeague(mockLeague);

    // Create session for user456 (can vote for songs 0 and 2, not their own song 1)
    VoteSessionManager.createSession(
      'user456',
      'guild123',
      'msg123',
      'channel123',
      [0, 2], // votable indices
      [0, 1, 2] // display order
    );

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['points', '5']]),
    });
    interaction.customId = 'vote-points-modal:guild123:0'; // Assigning 5 points to song index 0

    await execute(interaction);

    // Check session was updated
    const session = VoteSessionManager.getSession('user456', 'guild123');
    expect(session?.pointAllocations.get(0)).toBe(5);
  });

  it('should reject invalid points (negative)', async () => {
    const mockLeague = createTestLeague();
    MockStorage.saveLeague(mockLeague);

    VoteSessionManager.createSession(
      'user456',
      'guild123',
      'msg123',
      'channel123',
      [0, 2],
      [0, 1, 2]
    );

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['points', '-1']]),
    });
    interaction.customId = 'vote-points-modal:guild123:0';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('between 0 and 10');
  });

  it('should reject invalid points (greater than 10)', async () => {
    const mockLeague = createTestLeague();
    MockStorage.saveLeague(mockLeague);

    VoteSessionManager.createSession(
      'user456',
      'guild123',
      'msg123',
      'channel123',
      [0, 2],
      [0, 1, 2]
    );

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['points', '11']]),
    });
    interaction.customId = 'vote-points-modal:guild123:0';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('between 0 and 10');
  });

  it('should reject when session expired', async () => {
    const mockLeague = createTestLeague();
    MockStorage.saveLeague(mockLeague);
    // No session created

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['points', '5']]),
    });
    interaction.customId = 'vote-points-modal:guild123:0';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('session has expired');
  });

  it('should handle setting points to 0 (removing allocation)', async () => {
    const mockLeague = createTestLeague();
    MockStorage.saveLeague(mockLeague);

    VoteSessionManager.createSession(
      'user456',
      'guild123',
      'msg123',
      'channel123',
      [0, 2],
      [0, 1, 2]
    );

    // First set some points
    VoteSessionManager.updatePoints('user456', 'guild123', 0, 5);

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['points', '0']]),
    });
    interaction.customId = 'vote-points-modal:guild123:0';

    await execute(interaction);

    // Check points were removed
    const session = VoteSessionManager.getSession('user456', 'guild123');
    expect(session?.pointAllocations.has(0)).toBe(false);
  });

  it('should reject when voting is not open', async () => {
    const mockLeague = createTestLeague();
    mockLeague.rounds[0].status = 'submission';
    MockStorage.saveLeague(mockLeague);

    VoteSessionManager.createSession(
      'user456',
      'guild123',
      'msg123',
      'channel123',
      [0, 2],
      [0, 1, 2]
    );

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['points', '5']]),
    });
    interaction.customId = 'vote-points-modal:guild123:0';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('not currently open');
  });
});
