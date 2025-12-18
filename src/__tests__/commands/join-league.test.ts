import { execute } from '../../commands/join-league';
import { createMockInteraction, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import { League } from '../../types';

// Mock the Storage module
jest.mock('../../utils/storage');

describe('join-league command', () => {
  beforeEach(() => {
    // Reset the mock storage before each test
    MockStorage.reset();

    // Set up Storage mock methods
    (Storage.getLeague as jest.Mock) = jest.fn((leagueId: string) => MockStorage.getLeague(leagueId));
    (Storage.saveLeague as jest.Mock) = jest.fn((league: League) => MockStorage.saveLeague(league));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow a new user to join an existing league', async () => {
    const mockLeague: League = {
      id: 'league123',
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      createdAt: Date.now(),
      currentRound: 0,
      rounds: [],
      participants: ['user123'],
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockInteraction({
      userId: 'user456',
      guildId: 'guild123',
      options: new Map([['league-id', 'league123']]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('joined');
    expect(replies[0].content).toContain('Total participants: 2');

    expect(Storage.saveLeague).toHaveBeenCalledWith(
      expect.objectContaining({
        participants: ['user123', 'user456'],
      })
    );
  });

  it('should allow multiple users to join sequentially', async () => {
    const mockLeague: League = {
      id: 'league123',
      name: 'Indie Favorites',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      createdAt: Date.now(),
      currentRound: 0,
      rounds: [],
      participants: ['user123'],
    };

    MockStorage.saveLeague(mockLeague);

    const interaction2 = createMockInteraction({
      userId: 'user456',
      guildId: 'guild123',
      options: new Map([['league-id', 'league123']]),
    });
    await execute(interaction2);

    const interaction3 = createMockInteraction({
      userId: 'user789',
      guildId: 'guild123',
      options: new Map([['league-id', 'league123']]),
    });
    await execute(interaction3);

    const finalLeague = MockStorage.getLeague('league123');
    expect(finalLeague?.participants).toEqual(['user123', 'user456', 'user789']);
  });

  it('should reject when league does not exist', async () => {
    const interaction = createMockInteraction({
      userId: 'user456',
      guildId: 'guild123',
      options: new Map([['league-id', 'nonexistent']]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('League not found!');
    expect(replies[0].ephemeral).toBe(true);
  });

  it('should reject when user is already in the league', async () => {
    const mockLeague: League = {
      id: 'league123',
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      createdAt: Date.now(),
      currentRound: 0,
      rounds: [],
      participants: ['user123'],
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockInteraction({
      userId: 'user123',
      guildId: 'guild123',
      options: new Map([['league-id', 'league123']]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('You are already in this league!');
    expect(replies[0].ephemeral).toBe(true);
  });

  it('should reject when league is in a different server', async () => {
    const mockLeague: League = {
      id: 'league123',
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      createdAt: Date.now(),
      currentRound: 0,
      rounds: [],
      participants: ['user123'],
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockInteraction({
      userId: 'user456',
      guildId: 'guild999',
      options: new Map([['league-id', 'league123']]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('This league is in a different server!');
    expect(replies[0].ephemeral).toBe(true);
  });
});
