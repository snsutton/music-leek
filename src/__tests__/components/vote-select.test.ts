import { execute } from '../../components/vote-select';
import { createMockSelectMenu, getMockModals, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import { VoteSessionManager } from '../../utils/vote-sessions';
import { League } from '../../types';

jest.mock('../../utils/storage');

describe('vote-select component', () => {
  beforeEach(() => {
    MockStorage.reset();
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId: string) =>
      MockStorage.getLeagueByGuild(guildId)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create vote session and show modal when songs selected', async () => {
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

    const interaction = createMockSelectMenu({
      userId: 'user456',
      guildId: 'guild123',
      customId: 'vote-select:guild123',
      values: ['1', '2'],
    });

    await execute(interaction);

    const modals = getMockModals(interaction);
    expect(modals).toHaveLength(1);
    expect(modals[0].data.title).toBe('Assign Points (Budget: 10)');

    // Verify session created
    const session = VoteSessionManager.getSession('user456', 'guild123');
    expect(session).toBeTruthy();
    expect(session?.selectedSongIndices).toEqual([1, 2]);
  });

  it('should reject when league not found', async () => {
    const interaction = createMockSelectMenu({
      userId: 'user456',
      guildId: 'guild999',
      customId: 'vote-select:guild999',
      values: ['1'],
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('League not found!');
    expect(replies[0].flags).toBeDefined();
  });

  it('should reject when voting is not open', async () => {
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
        status: 'submission',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date(Date.now() + 86400000).toISOString(),
        votingDeadline: new Date(Date.now() + 172800000).toISOString(),
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

    const interaction = createMockSelectMenu({
      userId: 'user456',
      guildId: 'guild123',
      customId: 'vote-select:guild123',
      values: ['0'],
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('Voting is not currently open!');
  });
});
