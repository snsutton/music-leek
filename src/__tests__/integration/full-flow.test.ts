import { execute as createLeague } from '../../commands/create-league';
import { execute as joinLeague } from '../../commands/join-league';
import { execute as startRoundModal } from '../../modals/start-round-modal';
import { execute as submitSongModal } from '../../modals/submit-song-modal';
import { execute as startVoting } from '../../commands/start-voting';
import { execute as voteModal } from '../../modals/vote-modal';
import { createMockInteraction, createMockModalSubmit, getMockReplies } from '../utils/discord-mocks';
import { MockStorage } from '../utils/storage-mock';
import { Storage } from '../../utils/storage';
import * as helpers from '../../utils/helpers';

jest.mock('../../utils/storage');
jest.mock('../../utils/helpers');

describe('Full Flow Integration Test', () => {
  beforeEach(() => {
    MockStorage.reset();
    (Storage.getLeagueByGuild as jest.Mock) = jest.fn((guildId: string) => MockStorage.getLeagueByGuild(guildId));
    (Storage.saveLeague as jest.Mock) = jest.fn((league) => MockStorage.saveLeague(league));
    (Storage.load as jest.Mock) = jest.fn(() => MockStorage.load());
    (helpers.generateId as jest.Mock) = jest.fn(() => 'league123');
    (helpers.getCurrentRound as jest.Mock) = jest.fn((league) => {
      if (league.rounds.length === 0) return null;
      return league.rounds[league.currentRound - 1] || null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    expect(replies[0].content).toContain('league123');

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
    expect(replies[0].content).toContain('Best guitar solo');

    league = MockStorage.getLeagueByGuild('guild123');
    expect(league?.rounds).toHaveLength(1);
    expect(league?.rounds[0].status).toBe('submission');

    // Step 4: User A submits a song
    const submitAInteraction = createMockModalSubmit({
      userId: 'userA',
      fields: new Map([
        ['league-id', 'league123'],
        ['song-url', 'https://spotify.com/track/A'],
        ['song-title', 'Eruption'],
        ['artist', 'Van Halen'],
      ]),
    });

    await submitSongModal(submitAInteraction);

    replies = getMockReplies(submitAInteraction);
    expect(replies[0].content).toContain('Eruption');
    expect(replies[0].content).toContain('Submissions: 1/2');

    // Step 5: User B submits a song
    const submitBInteraction = createMockModalSubmit({
      userId: 'userB',
      fields: new Map([
        ['league-id', 'league123'],
        ['song-url', 'https://spotify.com/track/B'],
        ['song-title', 'Comfortably Numb'],
        ['artist', 'Pink Floyd'],
      ]),
    });

    await submitSongModal(submitBInteraction);

    replies = getMockReplies(submitBInteraction);
    expect(replies[0].content).toContain('Comfortably Numb');
    expect(replies[0].content).toContain('Submissions: 2/2');

    league = MockStorage.getLeagueByGuild('guild123');
    expect(league?.rounds[0].submissions).toHaveLength(2);

    // Step 6: Start voting phase
    const startVotingInteraction = createMockInteraction({
      userId: 'userA',
      guildId: 'guild123',
      options: new Map([['league-id', 'league123']]),
    });

    await startVoting(startVotingInteraction);

    league = MockStorage.getLeagueByGuild('guild123');
    expect(league?.rounds[0].status).toBe('voting');

    // Step 7: User A votes
    const voteAInteraction = createMockModalSubmit({
      userId: 'userA',
      fields: new Map([
        ['league-id', 'league123'],
        ['votes', '2:5'],
      ]),
    });

    await voteModal(voteAInteraction);

    replies = getMockReplies(voteAInteraction);
    expect(replies[0].content).toContain('✅');
    expect(replies[0].content).toContain('Votes cast: 1/2');

    // Step 8: User B votes
    const voteBInteraction = createMockModalSubmit({
      userId: 'userB',
      fields: new Map([
        ['league-id', 'league123'],
        ['votes', '1:5'],
      ]),
    });

    await voteModal(voteBInteraction);

    replies = getMockReplies(voteBInteraction);
    expect(replies[0].content).toContain('Votes cast: 2/2');

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
