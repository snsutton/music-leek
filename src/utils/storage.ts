import * as fs from 'fs';
import * as path from 'path';
import { Mutex } from 'async-mutex';
import { LeagueData, League } from '../types';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const LEAGUES_DIR = path.join(DATA_DIR, 'leagues');
const COMPLETED_DIR = path.join(LEAGUES_DIR, 'completed');
const LEGACY_DATA_FILE = path.join(DATA_DIR, 'leagues.json');

// Per-guild mutexes to serialize concurrent updates
const guildMutexes = new Map<string, Mutex>();

function getGuildMutex(guildId: string): Mutex {
  let mutex = guildMutexes.get(guildId);
  if (!mutex) {
    mutex = new Mutex();
    guildMutexes.set(guildId, mutex);
  }
  return mutex;
}

function getActiveFilePath(guildId: string): string {
  return path.join(LEAGUES_DIR, `${guildId}.json`);
}

function sanitizeTimestamp(iso: string): string {
  return iso.replace(/[:.]/g, '-');
}

function getCompletedFilePath(guildId: string, completedAt: string): string {
  return path.join(COMPLETED_DIR, `${guildId}-${sanitizeTimestamp(completedAt)}.json`);
}

let migrationChecked = false;

function ensureDirectoriesAndMigrate(): void {
  if (migrationChecked) return;
  migrationChecked = true;

  fs.mkdirSync(LEAGUES_DIR, { recursive: true });
  fs.mkdirSync(COMPLETED_DIR, { recursive: true });

  migrateFromLegacyFile();
}

function migrateFromLegacyFile(): void {
  if (!fs.existsSync(LEGACY_DATA_FILE)) return;

  let data: LeagueData;
  try {
    data = JSON.parse(fs.readFileSync(LEGACY_DATA_FILE, 'utf-8'));
  } catch (err) {
    console.error('[Storage] Failed to parse legacy leagues.json during migration:', err);
    return;
  }

  let activeCount = 0;
  let completedCount = 0;

  for (const [guildId, league] of Object.entries(data.leagues)) {
    if (league.isCompleted && league.completedAt) {
      const dest = getCompletedFilePath(guildId, league.completedAt);
      if (!fs.existsSync(dest)) {
        fs.writeFileSync(dest, JSON.stringify(league, null, 2));
        completedCount++;
      }
    } else {
      const dest = getActiveFilePath(guildId);
      if (!fs.existsSync(dest)) {
        fs.writeFileSync(dest, JSON.stringify(league, null, 2));
        activeCount++;
      }
    }
  }

  fs.renameSync(LEGACY_DATA_FILE, `${LEGACY_DATA_FILE}.migrated`);
  console.log(`[Storage] Migrated ${activeCount} active and ${completedCount} completed leagues from legacy leagues.json`);
}

export class Storage {
  static getLeagueByGuild(guildId: string): League | null {
    ensureDirectoriesAndMigrate();

    const activePath = getActiveFilePath(guildId);
    if (fs.existsSync(activePath)) {
      try {
        return JSON.parse(fs.readFileSync(activePath, 'utf-8')) as League;
      } catch (err) {
        console.error(`[Storage] Failed to parse active league file for guild ${guildId}:`, err);
        return null;
      }
    }

    // Fallback: check completed archives (for /leaderboard and similar read-only commands)
    if (!fs.existsSync(COMPLETED_DIR)) return null;
    const entries = fs.readdirSync(COMPLETED_DIR)
      .filter(f => f.startsWith(`${guildId}-`) && f.endsWith('.json'))
      .sort();

    if (entries.length === 0) return null;

    const latestFile = path.join(COMPLETED_DIR, entries[entries.length - 1]);
    try {
      return JSON.parse(fs.readFileSync(latestFile, 'utf-8')) as League;
    } catch (err) {
      console.error(`[Storage] Failed to parse completed league file ${latestFile}:`, err);
      return null;
    }
  }

  static saveLeague(league: League): void {
    ensureDirectoriesAndMigrate();

    if (league.isCompleted && league.completedAt) {
      const completedPath = getCompletedFilePath(league.guildId, league.completedAt);
      fs.writeFileSync(completedPath, JSON.stringify(league, null, 2));

      const activePath = getActiveFilePath(league.guildId);
      if (fs.existsSync(activePath)) {
        fs.unlinkSync(activePath);
      }
    } else {
      fs.writeFileSync(getActiveFilePath(league.guildId), JSON.stringify(league, null, 2));
    }
  }

  static getAllLeagues(): League[] {
    ensureDirectoriesAndMigrate();

    if (!fs.existsSync(LEAGUES_DIR)) return [];

    const leagues: League[] = [];
    for (const entry of fs.readdirSync(LEAGUES_DIR)) {
      if (!entry.endsWith('.json')) continue;
      const fullPath = path.join(LEAGUES_DIR, entry);
      if (fs.statSync(fullPath).isDirectory()) continue;
      try {
        leagues.push(JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as League);
      } catch (err) {
        console.error(`[Storage] Failed to parse league file ${entry}, skipping:`, err);
      }
    }
    return leagues;
  }

  static deleteLeague(guildId: string): boolean {
    ensureDirectoriesAndMigrate();

    const activePath = getActiveFilePath(guildId);
    if (fs.existsSync(activePath)) {
      fs.unlinkSync(activePath);
      return true;
    }
    return false;
  }

  static async atomicUpdate(
    guildId: string,
    updater: (league: League) => League | null
  ): Promise<League | null> {
    const mutex = getGuildMutex(guildId);

    return mutex.runExclusive(() => {
      const league = this.getLeagueByGuild(guildId);
      if (!league) return null;

      const updated = updater(league);
      if (updated === null) return null;

      this.saveLeague(updated);
      return updated;
    });
  }

  // Kept for backward compatibility with tests and any legacy callers
  static load(): LeagueData {
    ensureDirectoriesAndMigrate();
    const leagues: { [guildId: string]: League } = {};
    for (const league of this.getAllLeagues()) {
      leagues[league.guildId] = league;
    }
    return { leagues };
  }

  static save(data: LeagueData): void {
    for (const league of Object.values(data.leagues)) {
      this.saveLeague(league);
    }
  }
}
