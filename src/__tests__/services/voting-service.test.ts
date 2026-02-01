import { VotingService } from '../../services/voting-service';
import { NotificationService } from '../../services/notification-service';
import { SpotifyPlaylistService } from '../../services/spotify-playlist-service';
import { Storage } from '../../utils/storage';
import { MockStorage } from '../utils/storage-mock';
import { League, Round } from '../../types';
import * as helpers from '../../utils/helpers';
import * as usernameResolver from '../../utils/username-resolver';

jest.mock('../../utils/storage');
jest.mock('../../utils/helpers');
jest.mock('../../services/notification-service');
jest.mock('../../services/spotify-playlist-service');
jest.mock('../../utils/username-resolver');

describe('VotingService - Playlist Confirmation Flow', () => {
  const mockClient = {
    guilds: { fetch: jest.fn().mockResolvedValue({ name: 'Test Guild' }) },
    users: { fetch: jest.fn().mockResolvedValue({ send: jest.fn().mockResolvedValue({ id: 'msg123' }) }) },
  } as any;

  let testLeague: League;
  let testRound: Round;

  beforeEach(() => {
    MockStorage.reset();
    jest.clearAllMocks();

    // Set up mocks
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId) => MockStorage.getLeagueByGuild(guildId));
    (Storage.saveLeague as jest.Mock) = jest.fn((league) => MockStorage.saveLeague(league));
    (helpers.toISOString as jest.Mock) = jest.fn((ts?: number) => new Date(ts ?? Date.now()).toISOString());
    (helpers.toTimestamp as jest.Mock) = jest.fn((isoString: string) => new Date(isoString).getTime());
    (usernameResolver.resolveUsernames as jest.Mock) = jest.fn().mockResolvedValue(new Map([['creator123', 'TestCreator']]));

    // Create test league with Spotify integration
    testLeague = {
      name: 'Test League',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'creator123',
      admins: ['creator123', 'admin456'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [],
      participants: ['creator123', 'admin456', 'player789'],
      totalRounds: 3,
      isCompleted: false,
      spotifyIntegration: {
        userId: 'spotify-user-123',
        connectedBy: 'creator123',
        connectedAt: new Date().toISOString(),
      },
    };

    testRound = {
      roundNumber: 1,
      prompt: 'Best 80s song',
      status: 'submission',
      startedAt: new Date().toISOString(),
      submissionDeadline: new Date().toISOString(),
      votingDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      submissions: [
        { userId: 'admin456', songUrl: 'https://open.spotify.com/track/abc', songTitle: 'Song A', artist: 'Artist A', submittedAt: new Date().toISOString() },
        { userId: 'player789', songUrl: 'https://open.spotify.com/track/def', songTitle: 'Song B', artist: 'Artist B', submittedAt: new Date().toISOString() },
      ],
      votes: [],
      notificationsSent: {
        roundStarted: true,
        submissionReminder: true,
        votingStarted: false,
        votingReminder: false,
        allVotesReceived: false,
      },
    };

    testLeague.rounds = [testRound];
    MockStorage.saveLeague(testLeague);
  });

  describe('initiateVotingTransition', () => {
    it('should create playlist and request confirmation when Spotify is connected', async () => {
      // Mock successful playlist creation
      (SpotifyPlaylistService.createRoundPlaylist as jest.Mock).mockResolvedValue({
        playlistId: 'playlist123',
        playlistUrl: 'https://open.spotify.com/playlist/playlist123',
        createdAt: new Date().toISOString(),
        trackCount: 2,
        shuffledOrder: [1, 0],
      });

      // Mock successful DM
      (NotificationService.sendDM as jest.Mock).mockResolvedValue({ success: true });
      (NotificationService.sendBulkDM as jest.Mock).mockResolvedValue([{ userId: 'admin456', success: true }]);

      const result = await VotingService.initiateVotingTransition(mockClient, testLeague, testRound);

      // Should indicate confirmation is needed
      expect(result.status).toBe('pending_confirmation');
      expect(result.playlistCreated).toBe(true);

      // Should have set playlistConfirmation state
      expect(testRound.playlistConfirmation).toBeDefined();
      expect(testRound.playlistConfirmation?.requestedFrom).toBe('creator123');

      // Should have sent DM to creator with buttons
      expect(NotificationService.sendDM).toHaveBeenCalledWith(
        mockClient,
        'creator123',
        expect.objectContaining({ embeds: expect.any(Array), components: expect.any(Array) }),
        'guild123',
        'playlist_confirmation_requested'
      );

      // Should have notified other admins
      expect(NotificationService.sendBulkDM).toHaveBeenCalledWith(
        mockClient,
        ['admin456'], // Other admins (not creator)
        expect.objectContaining({ embeds: expect.any(Array) }),
        100,
        'guild123',
        'playlist_confirmation_pending'
      );

      // Should NOT have sent voting notifications yet
      expect(testRound.notificationsSent.votingStarted).toBe(false);
    });

    it('should proceed immediately when Spotify is not connected', async () => {
      // Remove Spotify integration
      delete testLeague.spotifyIntegration;
      MockStorage.saveLeague(testLeague);

      (NotificationService.sendDualNotification as jest.Mock).mockResolvedValue([]);

      const result = await VotingService.initiateVotingTransition(mockClient, testLeague, testRound);

      expect(result.status).toBe('completed');
      expect(result.playlistCreated).toBe(false);
      expect(testRound.playlistConfirmation).toBeUndefined();

      // Should have sent voting notifications immediately
      expect(NotificationService.sendDualNotification).toHaveBeenCalled();
    });

    it('should notify admins and NOT proceed when playlist creation fails', async () => {
      (SpotifyPlaylistService.createRoundPlaylist as jest.Mock).mockRejectedValue(new Error('API error'));
      (NotificationService.sendBulkDM as jest.Mock).mockResolvedValue([]);

      const result = await VotingService.initiateVotingTransition(mockClient, testLeague, testRound);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('API error');

      // Should have notified all admins of failure
      expect(NotificationService.sendBulkDM).toHaveBeenCalledWith(
        mockClient,
        ['creator123', 'admin456'], // All admins
        expect.objectContaining({ embeds: expect.any(Array) }),
        100,
        'guild123',
        'playlist_creation_failed'
      );

      // Should NOT have sent voting notifications
      expect(testRound.notificationsSent.votingStarted).toBe(false);
    });

    it('should still set pending confirmation when creator DM fails', async () => {
      (SpotifyPlaylistService.createRoundPlaylist as jest.Mock).mockResolvedValue({
        playlistId: 'playlist123',
        playlistUrl: 'https://open.spotify.com/playlist/playlist123',
        createdAt: new Date().toISOString(),
        trackCount: 2,
        shuffledOrder: [1, 0],
      });
      (NotificationService.sendDM as jest.Mock).mockResolvedValue({ success: false, error: 'DMs disabled' });
      (NotificationService.sendBulkDM as jest.Mock).mockResolvedValue([]);

      const result = await VotingService.initiateVotingTransition(mockClient, testLeague, testRound);

      // Should still wait for confirmation (the button exists, they just didn't get the DM)
      expect(result.status).toBe('pending_confirmation');
      expect(result.playlistCreated).toBe(true);

      // Should have set playlistConfirmation state
      expect(testRound.playlistConfirmation).toBeDefined();

      // Should have notified other admins about the pending state
      expect(NotificationService.sendBulkDM).toHaveBeenCalled();
    });

    it('should throw error when no submissions', async () => {
      testRound.submissions = [];
      MockStorage.saveLeague(testLeague);

      await expect(VotingService.initiateVotingTransition(mockClient, testLeague, testRound))
        .rejects.toThrow('No submissions available');
    });
  });

  describe('completeVotingTransition', () => {
    beforeEach(() => {
      testRound.playlist = {
        playlistId: 'playlist123',
        playlistUrl: 'https://open.spotify.com/playlist/playlist123',
        createdAt: new Date().toISOString(),
        trackCount: 2,
      };
      testRound.playlistConfirmation = {
        requestedAt: new Date().toISOString(),
        requestedFrom: 'creator123',
      };
      testRound.status = 'voting';
      MockStorage.saveLeague(testLeague);
    });

    it('should send voting notifications and clear confirmation state', async () => {
      (NotificationService.sendDualNotification as jest.Mock).mockResolvedValue([]);

      await VotingService.completeVotingTransition(mockClient, testLeague, testRound);

      expect(testRound.status).toBe('voting');
      expect(testRound.notificationsSent.votingStarted).toBe(true);
      expect(testRound.playlistConfirmation).toBeUndefined();
      expect(NotificationService.sendDualNotification).toHaveBeenCalled();
    });

    it('should skip channel post when option is set', async () => {
      (NotificationService.sendBulkDM as jest.Mock).mockResolvedValue([]);

      await VotingService.completeVotingTransition(mockClient, testLeague, testRound, {
        skipChannelPost: true,
      });

      expect(NotificationService.sendBulkDM).toHaveBeenCalled();
      expect(NotificationService.sendDualNotification).not.toHaveBeenCalled();
    });
  });
});
