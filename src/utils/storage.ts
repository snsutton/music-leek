import * as fs from 'fs';
import * as path from 'path';
import { LeagueData, League } from '../types';

const DATA_FILE = path.join(__dirname, '../../data/leagues.json');

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

  static getLeague(leagueId: string): League | null {
    const data = this.load();
    return data.leagues[leagueId] || null;
  }

  static saveLeague(league: League): void {
    const data = this.load();
    data.leagues[league.id] = league;
    this.save(data);
  }

  static getAllLeagues(): League[] {
    const data = this.load();
    return Object.values(data.leagues);
  }

  static getLeaguesByGuild(guildId: string): League[] {
    return this.getAllLeagues().filter(league => league.guildId === guildId);
  }

  static deleteLeague(leagueId: string): boolean {
    const data = this.load();
    if (data.leagues[leagueId]) {
      delete data.leagues[leagueId];
      this.save(data);
      return true;
    }
    return false;
  }
}
