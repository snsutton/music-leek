import * as fs from 'fs';
import * as path from 'path';
import { LeagueData, League } from '../types';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'leagues.json');

export class Storage {
  private static ensureDataFile(): void {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ leagues: {} }, null, 2));
    }
  }

  static load(): LeagueData {
    this.ensureDataFile();
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  }

  static save(data: LeagueData): void {
    this.ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }

  static getLeagueByGuild(guildId: string): League | null {
    const data = this.load();
    return data.leagues[guildId] || null;
  }

  static saveLeague(league: League): void {
    const data = this.load();
    data.leagues[league.guildId] = league;
    this.save(data);
  }

  static getAllLeagues(): League[] {
    const data = this.load();
    return Object.values(data.leagues);
  }

  static deleteLeague(guildId: string): boolean {
    const data = this.load();
    if (data.leagues[guildId]) {
      delete data.leagues[guildId];
      this.save(data);
      return true;
    }
    return false;
  }
}
