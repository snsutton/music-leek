import { execute } from '../../components/playlist-confirm-button';
import { VotingService } from '../../services/voting-service';
import { Storage } from '../../utils/storage';
import { MockStorage } from '../utils/storage-mock';
import { createMockButton, getMockEditReplies, getMockReplies } from '../utils/discord-mocks';
import * as helpers from '../../utils/helpers';
import { League } from '../../types';

jest.mock('../../utils/storage');
jest.mock('../../services/voting-service');
jest.mock('../../utils/helpers');

describe('playlist-confirm-button', () => {
  beforeEach(() => {
    MockStorage.reset();
    jest.clearAllMocks();
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId) => MockStorage.getLeagueByGuild(guildId));
    (Storage.saveLeague as jest.Mock) = jest.fn((league) => MockStorage.saveLeague(league));
    (helpers.getCurrentRound as jest.Mock) = jest.fn((league) => {
      if (league.rounds.length === 0) return null;
      return league.rounds[league.currentRound - 1] || null;
    });
  });

  it('should complete voting transition when creator confirms', async () => {
    // Set up league with pending confirmation
    const league: League = {
      name: 'Test League',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'creator123',
      admins: ['creator123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Test',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date().toISOString(),
        submissions: [{ userId: 'user1', songUrl: 'url', songTitle: 'Song', artist: 'Artist', submittedAt: new Date().toISOString() }],
        votes: [],
        notificationsSent: { roundStarted: true, submissionReminder: false, votingStarted: false, votingReminder: false, allVotesReceived: false },
        playlist: { playlistId: 'p123', playlistUrl: 'https://spotify.com/p123', createdAt: new Date().toISOString(), trackCount: 1 },
        playlistConfirmation: { requestedAt: new Date().toISOString(), requestedFrom: 'creator123' },
      }],
      participants: ['creator123', 'user1'],
      totalRounds: 3,
      isCompleted: false,
    };
    MockStorage.saveLeague(league);

    (VotingService.completeVotingTransition as jest.Mock).mockResolvedValue(undefined);

    const interaction = createMockButton({
      userId: 'creator123',
      guildId: 'guild123',
      customId: 'playlist-confirm:guild123',
    });

    await execute(interaction);

    expect(VotingService.completeVotingTransition).toHaveBeenCalled();
    const editReplies = getMockEditReplies(interaction);
    expect(editReplies[0].content).toContain('Playlist confirmed');
  });

  it('should allow any admin to confirm', async () => {
    const league: League = {
      name: 'Test League',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'creator123',
      admins: ['creator123', 'admin456'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Test',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date().toISOString(),
        submissions: [{ userId: 'user1', songUrl: 'url', songTitle: 'Song', artist: 'Artist', submittedAt: new Date().toISOString() }],
        votes: [],
        notificationsSent: { roundStarted: true, submissionReminder: false, votingStarted: false, votingReminder: false, allVotesReceived: false },
        playlist: { playlistId: 'p123', playlistUrl: 'https://spotify.com/p123', createdAt: new Date().toISOString(), trackCount: 1 },
        playlistConfirmation: { requestedAt: new Date().toISOString(), requestedFrom: 'creator123' },
      }],
      participants: ['creator123', 'admin456', 'user1'],
      totalRounds: 3,
      isCompleted: false,
    };
    MockStorage.saveLeague(league);

    (VotingService.completeVotingTransition as jest.Mock).mockResolvedValue(undefined);

    // admin456 (not the creator) clicks confirm
    const interaction = createMockButton({
      userId: 'admin456',
      guildId: 'guild123',
      customId: 'playlist-confirm:guild123',
    });

    await execute(interaction);

    // Should still work since admin456 is an admin
    expect(VotingService.completeVotingTransition).toHaveBeenCalled();
  });

  it('should reject non-admin users', async () => {
    const league: League = {
      name: 'Test League',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'creator123',
      admins: ['creator123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Test',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date().toISOString(),
        submissions: [],
        votes: [],
        notificationsSent: { roundStarted: true, submissionReminder: false, votingStarted: false, votingReminder: false, allVotesReceived: false },
        playlistConfirmation: { requestedAt: new Date().toISOString(), requestedFrom: 'creator123' },
      }],
      participants: ['creator123', 'random-user'],
      totalRounds: 3,
      isCompleted: false,
    };
    MockStorage.saveLeague(league);

    const interaction = createMockButton({
      userId: 'random-user', // Not an admin
      guildId: 'guild123',
      customId: 'playlist-confirm:guild123',
    });

    await execute(interaction);

    expect(VotingService.completeVotingTransition).not.toHaveBeenCalled();
    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('Only league admins');
  });

  it('should handle missing league', async () => {
    const interaction = createMockButton({
      userId: 'creator123',
      guildId: 'nonexistent-guild',
      customId: 'playlist-confirm:nonexistent-guild',
    });

    await execute(interaction);

    expect(VotingService.completeVotingTransition).not.toHaveBeenCalled();
    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('League not found');
  });

  it('should handle no pending confirmation', async () => {
    const league: League = {
      name: 'Test League',
      guildId: 'guild123',
      channelId: 'channel123',
      createdBy: 'creator123',
      admins: ['creator123'],
      createdAt: new Date().toISOString(),
      currentRound: 1,
      rounds: [{
        roundNumber: 1,
        prompt: 'Test',
        status: 'voting',
        startedAt: new Date().toISOString(),
        submissionDeadline: new Date().toISOString(),
        votingDeadline: new Date().toISOString(),
        submissions: [],
        votes: [],
        notificationsSent: { roundStarted: true, submissionReminder: false, votingStarted: true, votingReminder: false, allVotesReceived: false },
        // No playlistConfirmation - already confirmed
      }],
      participants: ['creator123'],
      totalRounds: 3,
      isCompleted: false,
    };
    MockStorage.saveLeague(league);

    const interaction = createMockButton({
      userId: 'creator123',
      guildId: 'guild123',
      customId: 'playlist-confirm:guild123',
    });

    await execute(interaction);

    expect(VotingService.completeVotingTransition).not.toHaveBeenCalled();
    const replies = getMockReplies(interaction);
    expect(replies[0].content).toContain('No pending playlist confirmation');
  });
});
