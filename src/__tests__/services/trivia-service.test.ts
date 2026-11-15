import axios from 'axios';
import { Client } from 'discord.js';
import { TriviaService } from '../../services/trivia-service';
import { Storage } from '../../utils/storage';
import { League, Round } from '../../types';

jest.mock('axios');
jest.mock('../../utils/storage');

// 10am and 7am Eastern on 2026-11-14 (EST, UTC-5)
const MORNING = Date.parse('2026-11-14T15:00:00.000Z');
const EARLY = Date.parse('2026-11-14T12:00:00.000Z');

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    roundNumber: 1,
    prompt: 'Songs about rain',
    status: 'completed',
    startedAt: '2026-11-01T17:00:00.000Z',
    submissionDeadline: '2026-11-05T17:00:00.000Z',
    votingDeadline: '2026-11-08T17:00:00.000Z',
    submissions: [
      { userId: 'u1', songUrl: 'https://open.spotify.com/track/a', songTitle: 'Song A - Remastered 2011', artist: 'Artist A', submittedAt: '2026-11-02T00:00:00.000Z' },
      { userId: 'u2', songUrl: 'https://open.spotify.com/track/b', songTitle: 'Song B', artist: 'Artist B', submittedAt: '2026-11-02T00:00:00.000Z' }
    ],
    votes: [],
    notificationsSent: {
      roundStarted: true,
      submissionReminder: true,
      votingStarted: true,
      votingReminder: true,
      allVotesReceived: true
    },
    ...overrides
  };
}

function makeLeague(rounds: Round[]): League {
  return {
    name: 'Test League',
    guildId: 'guild1',
    channelId: 'channel1',
    createdBy: 'u1',
    admins: ['u1'],
    createdAt: '2026-10-01T00:00:00.000Z',
    currentRound: rounds.length,
    rounds,
    participants: ['u1', 'u2'],
    totalRounds: 5,
    isCompleted: false
  };
}

function makeClient() {
  const channel = { isTextBased: () => true, isDMBased: () => false, send: jest.fn().mockResolvedValue(undefined) };
  const client = { channels: { fetch: jest.fn().mockResolvedValue(channel) } } as unknown as Client;
  return { client, channel };
}

function lastFmSummary(summary: string) {
  return { data: { track: { wiki: { summary } } } };
}

describe('TriviaService', () => {
  beforeEach(() => {
    process.env.LASTFM_API_KEY = 'test-key';
    (Storage.atomicUpdate as jest.Mock).mockImplementation(async (_guildId, updater) => updater({}));
    jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => { fn(); return 0; }) as unknown as typeof setTimeout);
  });

  afterEach(() => {
    delete process.env.LASTFM_API_KEY;
  });

  describe('getTrivia', () => {
    it('uses the Last.fm wiki summary with the read-more link removed', async () => {
      (axios.get as jest.Mock).mockResolvedValue(lastFmSummary(
        'Recorded in one take. <a href="https://www.last.fm/music/x">Read more on Last.fm</a>.'
      ));

      const trivia = await TriviaService.getTrivia('Song A - Remastered 2011', 'Artist A');

      expect(trivia).toEqual({ text: 'Recorded in one take.', source: 'Last.fm' });
      expect((axios.get as jest.Mock).mock.calls[0][1].params.track).toBe('Song A');
    });

    it('falls back to MusicBrainz writers and release year', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { track: {} } })
        .mockResolvedValueOnce({ data: { recordings: [{ id: 'rec1', score: 100, 'first-release-date': '1983-06-01' }] } })
        .mockResolvedValueOnce({ data: { relations: [{ type: 'performance', work: { id: 'work1' } }] } })
        .mockResolvedValueOnce({ data: { relations: [
          { type: 'composer', artist: { name: 'Jane Doe' } },
          { type: 'lyricist', artist: { name: 'Jane Doe' } },
          { type: 'writer', artist: { name: 'John Roe' } }
        ] } });

      const trivia = await TriviaService.getTrivia('Song B', 'Artist B');

      expect(trivia).toEqual({ text: 'Written by Jane Doe and John Roe. First released in 1983.', source: 'MusicBrainz' });
    });

    it('retries MusicBrainz when it is busy', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { track: {} } })
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockRejectedValueOnce({ response: { status: 429 } })
        .mockResolvedValueOnce({ data: { recordings: [{ id: 'rec1', score: 100, 'first-release-date': '1976-03-26' }] } })
        .mockResolvedValueOnce({ data: { relations: [] } });

      const trivia = await TriviaService.getTrivia('Song B', 'Artist B');

      expect(trivia).toEqual({ text: 'First released in 1976.', source: 'MusicBrainz' });
      expect(axios.get).toHaveBeenCalledTimes(5);
    });

    it('gives up after three MusicBrainz retries', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { track: {} } })
        .mockRejectedValue({ response: { status: 503 } });

      await expect(TriviaService.getTrivia('Song B', 'Artist B')).rejects.toEqual({ response: { status: 503 } });
      expect(axios.get).toHaveBeenCalledTimes(5);
    });

    it('does not retry MusicBrainz client errors', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { track: {} } })
        .mockRejectedValue({ response: { status: 400 } });

      await expect(TriviaService.getTrivia('Song B', 'Artist B')).rejects.toEqual({ response: { status: 400 } });
      expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('returns null when MusicBrainz has no confident match', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: { track: {} } })
        .mockResolvedValueOnce({ data: { recordings: [{ id: 'rec1', score: 40 }] } });

      expect(await TriviaService.getTrivia('Song B', 'Artist B')).toBeNull();
    });
  });

  describe('isQuietDay', () => {
    it('is false when a deadline falls on today in Eastern time', () => {
      const league = makeLeague([makeRound(), makeRound({ roundNumber: 2, status: 'submission', submissionDeadline: '2026-11-14T17:00:00.000Z' })]);
      expect(TriviaService.isQuietDay(league, MORNING)).toBe(false);
    });

    it('is true when nothing is scheduled today', () => {
      expect(TriviaService.isQuietDay(makeLeague([makeRound()]), MORNING)).toBe(true);
    });
  });

  describe('postDailyTrivia', () => {
    it('does nothing before 9am Eastern', async () => {
      const { client, channel } = makeClient();
      await TriviaService.postDailyTrivia(client, makeLeague([makeRound()]), EARLY);

      expect(channel.send).not.toHaveBeenCalled();
      expect(Storage.atomicUpdate).not.toHaveBeenCalled();
    });

    it('posts trivia for the first unused song and records it', async () => {
      (axios.get as jest.Mock).mockResolvedValue(lastFmSummary('A fun fact.'));
      const { client, channel } = makeClient();
      const league = makeLeague([makeRound()]);

      await TriviaService.postDailyTrivia(client, league, MORNING);

      expect(channel.send).toHaveBeenCalledTimes(1);
      expect(league.trivia).toEqual({ roundNumber: 1, usedSubmissionIndices: [0], lastRunDate: '2026-11-14' });
    });

    it('only runs once per day', async () => {
      const { client, channel } = makeClient();
      const league = makeLeague([makeRound()]);
      league.trivia = { roundNumber: 1, usedSubmissionIndices: [0], lastRunDate: '2026-11-14' };

      await TriviaService.postDailyTrivia(client, league, MORNING);

      expect(channel.send).not.toHaveBeenCalled();
    });

    it('skips songs with no trivia and songs already used', async () => {
      (axios.get as jest.Mock).mockResolvedValue({ data: {} });
      const { client, channel } = makeClient();
      const league = makeLeague([makeRound()]);
      league.trivia = { roundNumber: 1, usedSubmissionIndices: [0], lastRunDate: '2026-11-13' };

      await TriviaService.postDailyTrivia(client, league, MORNING);

      expect(channel.send).not.toHaveBeenCalled();
      expect(league.trivia.usedSubmissionIndices).toEqual([0, 1]);
    });

    it('leaves a song unused when MusicBrainz keeps erroring so it is retried tomorrow', async () => {
      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: {} })
        .mockRejectedValue({ response: { status: 503 } });
      const { client, channel } = makeClient();
      const league = makeLeague([makeRound()]);

      await TriviaService.postDailyTrivia(client, league, MORNING);

      expect(channel.send).not.toHaveBeenCalled();
      expect(league.trivia).toEqual({ roundNumber: 1, usedSubmissionIndices: [], lastRunDate: '2026-11-14' });
    });

    it('does not post on a day with a deadline', async () => {
      const { client, channel } = makeClient();
      const league = makeLeague([makeRound(), makeRound({ roundNumber: 2, status: 'voting', votingDeadline: '2026-11-14T17:00:00.000Z' })]);

      await TriviaService.postDailyTrivia(client, league, MORNING);

      expect(axios.get).not.toHaveBeenCalled();
      expect(channel.send).not.toHaveBeenCalled();
      expect(league.trivia?.lastRunDate).toBe('2026-11-14');
    });
  });
});
