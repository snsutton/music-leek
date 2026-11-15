import axios from 'axios';
import { Client } from 'discord.js';
import { League, Submission } from '../types';
import { Storage } from '../utils/storage';
import { NotificationTemplates } from './notification-templates';

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const MUSICBRAINZ_API_URL = 'https://musicbrainz.org/ws/2';
// MusicBrainz requires an identifying User-Agent and allows 1 request per second
const MUSICBRAINZ_USER_AGENT = 'MusicLeek/1.0.0 ( https://github.com/snsutton/music-leek-claude )';
const MUSICBRAINZ_DELAY_MS = 1100;
const MUSICBRAINZ_MIN_SCORE = 90;
const MAX_TRIVIA_LENGTH = 1000;
const POST_HOUR_EASTERN = 9;

export interface SongTrivia {
  text: string;
  source: 'Last.fm' | 'MusicBrainz';
}

/**
 * Get the YYYY-MM-DD date in Eastern Time for a timestamp
 */
export function easternDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function easternHour(timestamp: number): number {
  return Number(new Date(timestamp).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hourCycle: 'h23'
  }));
}

/**
 * Strip Spotify-style suffixes ("- Remastered 2011", "(feat. X)") that break lookups
 */
function cleanTitle(title: string): string {
  return title.replace(/\s+-\s+.*$/, '').replace(/\s*[([].*?[)\]]/g, '').trim() || title;
}

function sanitizeLastFmSummary(summary: string): string {
  let text = summary;
  let previous: string;
  do {
    previous = text;
    text = text
      .replace(/<a [^>]*>Read more on Last\.fm<\/a>\.?/i, '')
      .replace(/<[^>]+>/g, '');
  } while (text !== previous);
  return text.trim();
}

function escapeLucene(value: string): string {
  return value.replace(/[\\"]/g, '\\$&');
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Waits before each retry when MusicBrainz is busy (503), rate limiting (429), or unreachable
const MUSICBRAINZ_RETRY_DELAYS_MS = [5000, 15000, 30000];

async function musicBrainzGet(url: string, params: Record<string, unknown>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await axios.get(url, {
        params: { ...params, fmt: 'json' },
        headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT },
        timeout: 10000
      });
    } catch (error) {
      const status: number | undefined = (error as { response?: { status?: number } })?.response?.status;
      const retryable = status === undefined || status === 429 || status === 503;
      if (!retryable || attempt >= MUSICBRAINZ_RETRY_DELAYS_MS.length) throw error;

      const delay = MUSICBRAINZ_RETRY_DELAYS_MS[attempt];
      console.warn(`[Trivia] MusicBrainz request failed (${status ?? 'no response'}), retrying in ${delay / 1000}s`);
      await sleep(delay);
    }
  }
}

export class TriviaService {
  /**
   * Look up a piece of trivia for a song: the Last.fm wiki summary when one exists,
   * otherwise a fact built from MusicBrainz songwriter and release data.
   */
  static async getTrivia(songTitle: string, artist: string): Promise<SongTrivia | null> {
    const title = cleanTitle(songTitle);
    return (await this.getLastFmTrivia(title, artist)) ?? (await this.getMusicBrainzTrivia(title, artist));
  }

  private static async getLastFmTrivia(title: string, artist: string): Promise<SongTrivia | null> {
    const apiKey = process.env.LASTFM_API_KEY;
    if (!apiKey) return null;

    try {
      const response = await axios.get(LASTFM_API_URL, {
        params: { method: 'track.getInfo', api_key: apiKey, artist, track: title, autocorrect: 1, format: 'json' },
        timeout: 10000
      });

      const summary: string | undefined = response.data?.track?.wiki?.summary;
      if (!summary) return null;

      // Summaries end with a "Read more on Last.fm" link; drop it and any other markup
      const text = sanitizeLastFmSummary(summary);
      if (!text) return null;

      return { text: text.length > MAX_TRIVIA_LENGTH ? text.slice(0, MAX_TRIVIA_LENGTH - 3) + '...' : text, source: 'Last.fm' };
    } catch (error) {
      console.error(`[Trivia] Last.fm lookup failed for "${title}" by ${artist}:`, error);
      return null;
    }
  }

  private static async getMusicBrainzTrivia(title: string, artist: string): Promise<SongTrivia | null> {
    try {
      const search = await musicBrainzGet(`${MUSICBRAINZ_API_URL}/recording`, {
        query: `recording:"${escapeLucene(title)}" AND artist:"${escapeLucene(artist)}"`,
        limit: 1
      });

      const recording = search.data?.recordings?.[0];
      if (!recording || (recording.score ?? 0) < MUSICBRAINZ_MIN_SCORE) return null;

      const facts: string[] = [];

      // Songwriters live on the work the recording is a performance of
      await sleep(MUSICBRAINZ_DELAY_MS);
      const recordingDetail = await musicBrainzGet(`${MUSICBRAINZ_API_URL}/recording/${recording.id}`, { inc: 'work-rels' });
      const workId: string | undefined = recordingDetail.data?.relations
        ?.find((rel: { type: string }) => rel.type === 'performance')?.work?.id;

      if (workId) {
        await sleep(MUSICBRAINZ_DELAY_MS);
        const work = await musicBrainzGet(`${MUSICBRAINZ_API_URL}/work/${workId}`, { inc: 'artist-rels' });
        const writers: string[] = Array.from(new Set(
          (work.data?.relations ?? [])
            .filter((rel: { type: string }) => ['writer', 'composer', 'lyricist'].includes(rel.type))
            .map((rel: { artist?: { name: string } }) => rel.artist?.name)
            .filter(Boolean)
        ));
        if (writers.length > 0) facts.push(`Written by ${joinNames(writers)}.`);
      }

      const firstReleaseDate: string | undefined = recording['first-release-date'];
      if (firstReleaseDate) facts.push(`First released in ${firstReleaseDate.slice(0, 4)}.`);

      return facts.length > 0 ? { text: facts.join(' '), source: 'MusicBrainz' } : null;
    } catch (error) {
      // Rethrow so the caller retries this song tomorrow instead of marking it used
      console.error(`[Trivia] MusicBrainz lookup failed for "${title}" by ${artist}:`, error);
      throw error;
    }
  }

  /**
   * True when the bot posts nothing else to the channel today: no round started
   * and no theme, submission, or voting deadline (deadlines fire at noon Eastern).
   */
  static isQuietDay(league: League, now: number): boolean {
    const round = league.rounds[league.currentRound - 1];
    if (!round) return true;

    const today = easternDate(now);
    const eventDates = [round.startedAt, round.themeSubmissionDeadline, round.submissionDeadline, round.votingDeadline];
    return !eventDates.some(date => date && easternDate(new Date(date).getTime()) === today);
  }

  /**
   * Post one piece of trivia about a song from the most recently completed round,
   * once per day after 9am Eastern, on days with no other channel prompt.
   */
  static async postDailyTrivia(client: Client, league: League, now: number = Date.now()): Promise<void> {
    const today = easternDate(now);
    if (easternHour(now) < POST_HOUR_EASTERN || league.trivia?.lastRunDate === today) return;

    const round = [...league.rounds].reverse().find(r => r.status === 'completed');
    const used = league.trivia?.roundNumber === round?.roundNumber ? league.trivia!.usedSubmissionIndices : [];
    const newlyUsed: number[] = [];
    let posted: { submission: Submission; trivia: SongTrivia } | null = null;

    if (round && this.isQuietDay(league, now)) {
      const order = round.shuffledOrder ?? round.submissions.map((_, i) => i);
      for (const index of order.filter(i => !used.includes(i))) {
        const submission = round.submissions[index];
        if (!submission) continue;

        let trivia: SongTrivia | null;
        try {
          trivia = await this.getTrivia(submission.songTitle, submission.artist);
        } catch {
          break;
        }

        newlyUsed.push(index);
        if (trivia) {
          posted = { submission, trivia };
          break;
        }
      }
    }

    if (posted && round) {
      try {
        const channel = await client.channels.fetch(league.channelId);
        if (channel && channel.isTextBased() && !channel.isDMBased()) {
          await channel.send({ embeds: [NotificationTemplates.dailyTrivia(round, posted.submission, posted.trivia)] });
          console.log(`[Trivia] Posted trivia for "${posted.submission.songTitle}" in ${league.name}`);
        }
      } catch (error) {
        console.error(`[Trivia] Failed to post trivia for ${league.name}:`, error);
      }
    }

    const triviaState = {
      roundNumber: round?.roundNumber ?? 0,
      usedSubmissionIndices: [...used, ...newlyUsed],
      lastRunDate: today
    };

    // Update the caller's copy too, since the scheduler may save it again after this
    league.trivia = triviaState;

    // Re-read under the guild lock so the network calls above don't clobber newer changes
    await Storage.atomicUpdate(league.guildId, latest => {
      latest.trivia = triviaState;
      return latest;
    });
  }
}
