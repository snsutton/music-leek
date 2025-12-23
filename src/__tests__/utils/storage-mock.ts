import { League, LeagueData } from '../../types';

export class MockStorage {
  private static data: LeagueData = { leagues: {} };

  static reset(): void {
    this.data = { leagues: {} };
  }

  static load(): LeagueData {
    return this.data;
  }

  static save(data: LeagueData): void {
    this.data = data;
  }

  static getLeagueByGuild(guildId: string): League | null {
    return this.data.leagues[guildId] || null;
  }

  static saveLeague(league: League): void {
    this.data.leagues[league.guildId] = league;
  }

  static getAllLeagues(): League[] {
    return Object.values(this.data.leagues);
  }

  static getLeaguesByGuild(guildId: string): League[] {
    return this.getAllLeagues().filter(league => league.guildId === guildId);
  }

  static deleteLeague(leagueId: string): boolean {
    if (this.data.leagues[leagueId]) {
      delete this.data.leagues[leagueId];
      return true;
    }
    return false;
  }

  static setMockData(data: LeagueData): void {
    this.data = data;
  }
}
