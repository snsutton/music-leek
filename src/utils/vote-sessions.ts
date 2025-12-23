interface VoteSession {
  userId: string;
  guildId: string;
  selectedSongIndices: number[];
  createdAt: number;
  expiresAt: number;
}

export class VoteSessionManager {
  private static sessions = new Map<string, VoteSession>();
  private static readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  static createSession(userId: string, guildId: string, selectedSongs: number[]): void {
    const key = `${userId}-${guildId}`;
    const now = Date.now();

    this.sessions.set(key, {
      userId,
      guildId,
      selectedSongIndices: selectedSongs,
      createdAt: now,
      expiresAt: now + this.SESSION_TIMEOUT
    });

    // Cleanup after timeout (unref to prevent hanging in tests)
    const timer = setTimeout(() => this.deleteSession(userId, guildId), this.SESSION_TIMEOUT);
    timer.unref();
  }

  static getSession(userId: string, guildId: string): VoteSession | null {
    const key = `${userId}-${guildId}`;
    const session = this.sessions.get(key);

    if (!session) return null;

    // Check if expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(key);
      return null;
    }

    return session;
  }

  static deleteSession(userId: string, guildId: string): boolean {
    const key = `${userId}-${guildId}`;
    return this.sessions.delete(key);
  }

  static hasSession(userId: string, guildId: string): boolean {
    return this.getSession(userId, guildId) !== null;
  }
}
