import { execute as createLeague } from '../../commands/create-league';
import { execute as joinLeague } from '../../commands/join-league';
import { execute as startRoundModal } from '../../modals/start-round-modal';
import { execute as startVoting } from '../../commands/start-voting';
import { execute as votePointsModal } from '../../modals/vote-points-modal';
import { createMockInteraction, createMockModalSubmit, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import { VoteSessionManager } from '../../utils/vote-sessions';
import * as helpers from '../../utils/helpers';
import { SpotifyOAuthService } from '../../services/spotify-oauth-service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../utils/storage');
jest.mock('../../utils/helpers');
jest.mock('../../services/spotify-oauth-service');
jest.mock('../../services/spotify-playlist-service');

describe('Full Flow Integration Test', () => {
  let testDataDir: string;

  beforeEach(() => {
    // Set up temp directory for DM context files
    testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'music-leek-test-'));
    process.env.DATA_DIR = testDataDir;

    MockStorage.reset();
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId: string) => MockStorage.getLeagueByGuild(guildId));
    (Storage.saveLeague as jest.Mock) = jest.fn((league) => MockStorage.saveLeague(league));
    (Storage.load as jest.Mock) = jest.fn(() => MockStorage.load());
    (helpers.generateId as jest.Mock) = jest.fn(() => 'league123');
    (helpers.getCurrentRound as jest.Mock) = jest.fn((league) => {
      if (league.rounds.length === 0) return null;
      return league.rounds[league.currentRound - 1] || null;
    });
    (helpers.toISOString as jest.Mock) = jest.fn((ts?: number) => new Date(ts ?? Date.now()).toISOString());
    (helpers.toTimestamp as jest.Mock) = jest.fn((isoString: string) => new Date(isoString).getTime());
    (helpers.getMissingVoters as jest.Mock) = jest.fn(() => []);

    // Mock Spotify OAuth service
    (SpotifyOAuthService.generateAuthUrl as jest.Mock) = jest.fn(() => 'https://example.com/auth');
    (SpotifyOAuthService.getValidToken as jest.Mock) = jest.fn(() => Promise.resolve({ accessToken: 'mock-token' }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up temp directory
    if (testDataDir && fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  it('should complete full flow: create → join → start round → submit → vote', async () => {
    // Step 1: User A creates a league
    const createInteraction = createMockInteraction({
      userId: 'userA',
      guildId: 'guild123',
      channelId: 'channel123',
      options: new Map([['name', 'Rock Legends']]),
    });

    await createLeague(createInteraction);

    let replies = getMockReplies(createInteraction);
    expect(replies[0].content).toContain('Rock Legends');

    let league = MockStorage.getLeagueByGuild('guild123');
    expect(league?.participants).toEqual(['userA']);

    // Step 2: User B joins the league
    const joinInteraction = createMockInteraction({
      userId: 'userB',
      guildId: 'guild123',
      options: new Map([['league-id', 'league123']]),
    });

    await joinLeague(joinInteraction);

    replies = getMockReplies(joinInteraction);
    expect(replies[0].content).toContain('joined');
    expect(replies[0].content).toContain('Total participants: 2');

    league = MockStorage.getLeagueByGuild('guild123');
    expect(league?.participants).toEqual(['userA', 'userB']);

    // Simulate Spotify integration being connected
    if (league) {
      league.spotifyIntegration = {
        userId: 'spotify-user-123',
        connectedBy: 'userA',
        connectedAt: new Date().toISOString(),
      };
      MockStorage.saveLeague(league);
    }

    // Step 3: User A starts a round
    const startRoundInteraction = createMockModalSubmit({
      userId: 'userA',
      fields: new Map([
        ['league-id', 'league123'],
        ['prompt', 'Best guitar solo'],
        ['submission-hours', '72'],
        ['voting-hours', '48'],
      ]),
    });

    await startRoundModal(startRoundInteraction);

    replies = getMockReplies(startRoundInteraction);
    expect(replies[0].content).toContain('Round 1');
    expect(replies[0].content).toContain('Theme Submission Phase');

    league = MockStorage.getLeagueByGuild('guild123');
    expect(league?.rounds).toHaveLength(1);
    // The round starts in 'theme-submission' status now, then transitions to 'submission'
    expect(league?.rounds[0].status).toBe('theme-submission');

    // Manually transition to submission phase with the prompt
    if (league) {
      league.rounds[0].status = 'submission';
      league.rounds[0].prompt = 'Best guitar solo';
      MockStorage.saveLeague(league);
    }

    // Step 4 & 5: Manually add submissions (skipping music service mocking complexity)
    if (league) {
      league.rounds[0].submissions.push({
        userId: 'userA',
        songUrl: 'https://open.spotify.com/track/1234567890abcdef',
        songTitle: 'Eruption',
        artist: 'Van Halen',
        submittedAt: new Date().toISOString()
      });
      league.rounds[0].submissions.push({
        userId: 'userB',
        songUrl: 'https://open.spotify.com/track/abcdef1234567890',
        songTitle: 'Comfortably Numb',
        artist: 'Pink Floyd',
        submittedAt: new Date().toISOString()
      });
      MockStorage.saveLeague(league);

      expect(league.rounds[0].submissions).toHaveLength(2);
    }

    // Step 6: Start voting phase
    const startVotingInteraction = createMockInteraction({
      userId: 'userA',
      guildId: 'guild123',
      options: new Map([['league-id', 'league123']]),
    });

    await startVoting(startVotingInteraction);

    league = MockStorage.getLeagueByGuild('guild123');
    expect(league?.rounds[0].status).toBe('voting');

    // Step 7: User A votes - select song
    VoteSessionManager.createSession('userA', 'guild123', [1]); // Vote for userB's song (index 1)

    const voteAInteraction = createMockModalSubmit({
      userId: 'userA',
      fields: new Map([
        ['points-1', '5'],
      ]),
    });
    voteAInteraction.customId = 'vote-points-modal:guild123';

    await votePointsModal(voteAInteraction);

    replies = getMockReplies(voteAInteraction);
    expect(replies[0].content).toContain('✅');
    expect(replies[0].content).toContain('Total votes in round: 1/2');

    // Step 8: User B votes - select song
    VoteSessionManager.createSession('userB', 'guild123', [0]); // Vote for userA's song (index 0)

    const voteBInteraction = createMockModalSubmit({
      userId: 'userB',
      fields: new Map([
        ['points-0', '5'],
      ]),
    });
    voteBInteraction.customId = 'vote-points-modal:guild123';

    await votePointsModal(voteBInteraction);

    replies = getMockReplies(voteBInteraction);
    expect(replies[0].content).toContain('✅');
    expect(replies[0].content).toContain('Total votes in round: 2/2');

    // Final verification
    league = MockStorage.getLeagueByGuild('guild123');
    expect(league?.rounds[0].votes).toHaveLength(2);
    expect(league?.rounds[0].votes[0]).toEqual({
      voterId: 'userA',
      votes: [{ submissionIndex: 1, points: 5 }],
    });
    expect(league?.rounds[0].votes[1]).toEqual({
      voterId: 'userB',
      votes: [{ submissionIndex: 0, points: 5 }],
    });
  });
});
