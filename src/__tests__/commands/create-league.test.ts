import { execute } from '../../commands/create-league';
import { createMockInteraction, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import * as helpers from '../../utils/helpers';
import { SpotifyOAuthService } from '../../services/spotify-oauth-service';

jest.mock('../../utils/storage');
jest.mock('../../utils/helpers');
jest.mock('../../services/spotify-oauth-service');

describe('create-league command', () => {
  beforeEach(() => {
    MockStorage.reset();
    (Storage.saveLeague as jest.Mock) = jest.fn((league) => MockStorage.saveLeague(league));
    (helpers.generateId as jest.Mock) = jest.fn(() => 'league123');
    (helpers.toISOString as jest.Mock) = jest.fn(() => new Date().toISOString());
    (SpotifyOAuthService.generateAuthUrl as jest.Mock) = jest.fn(() => 'https://example.com/auth');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new league', async () => {
    const interaction = createMockInteraction({
      userId: 'user123',
      guildId: 'guild123',
      channelId: 'channel123',
      options: new Map<string, string | number>([
        ['name', 'Rock Classics'],
        ['total-rounds', 10],
      ]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies).toHaveLength(1);
    expect(replies[0].content).toContain('Rock Classics');
    expect(replies[0].content).toContain('has been created');

    expect(Storage.saveLeague).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rock Classics',
        guildId: 'guild123',
        channelId: 'channel123',
        createdBy: 'user123',
        participants: ['user123'],
        totalRounds: 10,
        isCompleted: false,
      })
    );
  });

  it('should reject when not in a server', async () => {
    const interaction = createMockInteraction({
      userId: 'user123',
      options: new Map([['name', 'Rock Classics']]),
    });
    interaction.guildId = null;

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('This command can only be used in a server!');
    expect(replies[0].flags).toBeDefined();
    expect(Storage.saveLeague).not.toHaveBeenCalled();
  });
});
