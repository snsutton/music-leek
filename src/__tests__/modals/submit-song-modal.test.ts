import { execute } from '../../modals/submit-song-modal';
import { createMockModalSubmit, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import { League } from '../../types';
import * as urlValidator from '../../utils/url-validator';
import { MusicServiceFactory } from '../../services/music-service-factory';

jest.mock('../../utils/storage');
jest.mock('../../utils/url-validator');
jest.mock('../../services/music-service-factory');

describe('submit-song-modal', () => {
  const mockMusicService = {
    fetchSongMetadata: jest.fn(),
  };

  beforeEach(() => {
    MockStorage.reset();
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId: string) => MockStorage.getLeagueByGuild(guildId));
    (Storage.saveLeague as jest.Mock) = jest.fn((league: League) => MockStorage.saveLeague(league));

    // Mock URL validator to accept test URLs
    (urlValidator.parseMusicUrl as jest.Mock) = jest.fn((url: string) => ({
      platform: 'spotify',
      trackId: '123',
      originalUrl: url
    }));

    // Mock music service factory
    (MusicServiceFactory.getService as jest.Mock) = jest.fn(() => mockMusicService);

    // Mock music service to return song metadata
    mockMusicService.fetchSongMetadata.mockResolvedValue({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      durationMs: 354000,
      previewUrl: null,
      externalUrl: 'https://open.spotify.com/track/123'
    });
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

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([
        ['song-url', 'https://open.spotify.com/track/123'],
      ]),
    });
    interaction.customId = 'submit-song-modal:guild123';

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
      songUrl: 'https://open.spotify.com/track/123',
      songTitle: 'Bohemian Rhapsody',
      artist: 'Queen',
      submittedAt: expect.any(String),
    });
  });

  it('should reject when league not found', async () => {
    const interaction = createMockModalSubmit({
      fields: new Map([['song-url', 'https://open.spotify.com/track/123']]),
    });
    interaction.customId = 'submit-song-modal:nonexistent';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('League not found!');
  });

  it('should reject when user is not in the league', async () => {
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
      participants: ['user123'],
      totalRounds: 10,
      isCompleted: false,
    };

    MockStorage.saveLeague(mockLeague);

    const interaction = createMockModalSubmit({
      userId: 'user999',
      fields: new Map([['song-url', 'https://open.spotify.com/track/123']]),
    });
    interaction.customId = 'submit-song-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('You are not in this league!');
  });

  it('should allow user to update their submission', async () => {
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
        submissions: [{
          userId: 'user456',
          songUrl: 'https://spotify.com/track/123',
          songTitle: 'Existing Song',
          artist: 'Artist',
          submittedAt: new Date().toISOString(),
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
      fields: new Map([['song-url', 'https://open.spotify.com/track/456']]),
    });
    interaction.customId = 'submit-song-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('✅');
    expect(replies[0].content).toContain('updated');
    expect(replies[0].content).toContain('previous submission has been replaced');
  });

  it('should reject when submission phase has ended', async () => {
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

    const interaction = createMockModalSubmit({
      userId: 'user456',
      fields: new Map([['song-url', 'https://open.spotify.com/track/123']]),
    });
    interaction.customId = 'submit-song-modal:guild123';

    await execute(interaction);

    const replies = getMockReplies(interaction);
    expect(replies[0].content).toBe('Submission phase has ended!');
  });
});
