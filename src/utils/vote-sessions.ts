export interface VoteSession {
  userId: string;
  guildId: string;
  messageId: string;              // Hub message to update
  channelId: string;              // Channel containing hub message
  votableSongIndices: number[];   // Indices of votable songs (excludes own)
  displayOrder: number[];         // Indices in display order (playlist order)
  pointAllocations: Map<number, number>;  // submissionIndex -> points
  createdAt: number;
  expiresAt: number;
}

export class VoteSessionManager {
  private static sessions = new Map<string, VoteSession>();
  private static readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  static createSession(
    userId: string,
    guildId: string,
    messageId: string,
    channelId: string,
    votableSongIndices: number[],
    displayOrder: number[]
  ): void {
    const key = `${userId}-${guildId}`;
    const now = Date.now();

    this.sessions.set(key, {
      userId,
      guildId,
      messageId,
      channelId,
      votableSongIndices,
      displayOrder,
      pointAllocations: new Map(),
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

  static updatePoints(userId: string, guildId: string, submissionIndex: number, points: number): boolean {
    const session = this.getSession(userId, guildId);
    if (!session) return false;

    if (points === 0) {
      session.pointAllocations.delete(submissionIndex);
    } else {
      session.pointAllocations.set(submissionIndex, points);
    }

    return true;
  }

  static deleteSession(userId: string, guildId: string): boolean {
    const key = `${userId}-${guildId}`;
    return this.sessions.delete(key);
  }

  static hasSession(userId: string, guildId: string): boolean {
    return this.getSession(userId, guildId) !== null;
  }
}
