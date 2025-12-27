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
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId: string) => MockStorage.getLeagueByGuild(guildId));
    (Storage.saveLeague as jest.Mock) = jest.fn((league: League) => MockStorage.saveLeague(league));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should allow a new user to join an existing league', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: Date.now(),
      currentRound: 0,
      rounds: [],
      participants: ['user123'],
      totalRounds: 10,
      isCompleted: false,
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
      totalRounds: 10,
      isCompleted: false,
      })
    );
  });

  it('should allow multiple users to join sequentially', async () => {
    const mockLeague: League = {
      name: 'Indie Favorites',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: Date.now(),
      currentRound: 0,
      rounds: [],
      participants: ['user123'],
      totalRounds: 10,
      isCompleted: false,
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

    const finalLeague = MockStorage.getLeagueByGuild('guild123');
    expect(finalLeague?.participants).toEqual(['user123', 'user456', 'user789']);
  });

  it('should reject when league does not exist', async () => {
    const interaction = createMockInteraction({
      userId: 'user456',
      guildId: 'guild999', // Different guild with no league
      options: new Map([]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('No league found for this server! Use `/create-league` to create one.');
    expect(replies[0].flags).toBeDefined();
  });

  it('should reject when user is already in the league', async () => {
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: Date.now(),
      currentRound: 0,
      rounds: [],
      participants: ['user123'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockInteraction({
      userId: 'user123',
      guildId: 'guild123',
      options: new Map([]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('You are already in this league!');
    expect(replies[0].flags).toBeDefined();
  });

  it('should reject when guild has no league', async () => {
    // guild123 has a league but guild999 doesn't
    const mockLeague: League = {
      name: 'Rock Classics',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'user123',
      admins: ['user123'],
      createdAt: Date.now(),
      currentRound: 0,
      rounds: [],
      participants: ['user123'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockInteraction({
      userId: 'user456',
      guildId: 'guild999', // Different server with no league
      options: new Map([]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('No league found for this server! Use `/create-league` to create one.');
    expect(replies[0].flags).toBeDefined();
  });
});
