import { execute } from '../../commands/create-league';
import { createMockInteraction, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import * as helpers from '../../utils/helpers';

jest.mock('../../utils/storage');
jest.mock('../../utils/helpers');

describe('create-league command', () => {
  beforeEach(() => {
    MockStorage.reset();
    (Storage.saveLeague as jest.Mock) = jest.fn((league) => MockStorage.saveLeague(league));
    (helpers.generateId as jest.Mock) = jest.fn(() => 'league123');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new league', async () => {
    const interaction = createMockInteraction({
      userId: 'user123',
      guildId: 'guild123',
      channelId: 'channel123',
      options: new Map([['name', 'Rock Classics']]),
    });

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies).toHaveLength(1);
    expect(replies[0].content).toContain('Rock Classics');
    expect(replies[0].content).toContain('league123');
    expect(replies[0].ephemeral).toBe(false);

    expect(Storage.saveLeague).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rock Classics',
        guildId: 'guild123',
        channelId: 'channel123',
        createdBy: 'user123',
        participants: ['user123'],
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
    expect(replies[0].ephemeral).toBe(true);
    expect(Storage.saveLeague).not.toHaveBeenCalled();
  });
});
