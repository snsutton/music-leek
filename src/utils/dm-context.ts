import * as fs from 'fs';
import * as path from 'path';
import { ChatInputCommandInteraction } from 'discord.js';
import { DmContext, DmContextStorage } from '../types';
import { Storage } from './storage';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'dm-contexts.json');
const CONTEXT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Manages DM context tracking for users to enable slash commands in DMs
 */
export class DmContextManager {
  private static ensureDataFile(): void {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ contexts: {} }, null, 2));
    }
  }

  private static load(): DmContextStorage {
    this.ensureDataFile();
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[DmContext] Error loading dm-contexts.json:', error);
      return { contexts: {} };
    }
  }

  private static save(data: DmContextStorage): void {
    this.ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  }

  /**
   * Record which league last sent a DM to a user
   */
  static recordContext(userId: string, guildId: string, notificationType: string): void {
    const data = this.load();
    data.contexts[userId] = {
      userId,
      guildId,
      lastNotificationAt: Date.now(),
      notificationType
    };
    this.save(data);
  }

  /**
   * Get the most recent DM context for a user
   */
  static getContext(userId: string): DmContext | null {
    const data = this.load();
    const context = data.contexts[userId];

    if (!context) {
      return null;
    }

    // Check if context has expired
    const age = Date.now() - context.lastNotificationAt;
    if (age > CONTEXT_TTL) {
      // Context expired, clean it up
      delete data.contexts[userId];
      this.save(data);
      return null;
    }

    return context;
  }

  /**
   * Clean up expired contexts (called by scheduler)
   */
  static cleanupExpired(): void {
    const data = this.load();
    const now = Date.now();
    let removedCount = 0;

    for (const userId in data.contexts) {
      const context = data.contexts[userId];
      const age = now - context.lastNotificationAt;

      if (age > CONTEXT_TTL) {
        delete data.contexts[userId];
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.save(data);
      console.log(`[DmContext] Cleaned up ${removedCount} expired context(s)`);
    }
  }

  /**
   * Clear all contexts for a specific guild (e.g., when league is deleted)
   */
  static clearGuildContexts(guildId: string): void {
    const data = this.load();
    let removedCount = 0;

    for (const userId in data.contexts) {
      if (data.contexts[userId].guildId === guildId) {
        delete data.contexts[userId];
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.save(data);
      console.log(`[DmContext] Cleared ${removedCount} context(s) for guild ${guildId}`);
    }
  }
}

/**
 * Resolve guild context for a command interaction
 * Works for both server commands and DM commands
 */
export function resolveGuildContext(interaction: ChatInputCommandInteraction): {
  guildId: string | null;
  source: 'server' | 'dm-context' | 'none';
} {
  // 1. If in server, use server's guildId
  if (interaction.guildId) {
    return { guildId: interaction.guildId, source: 'server' };
  }

  // 2. If in DMs, lookup cached context
  const dmContext = DmContextManager.getContext(interaction.user.id);
  if (dmContext) {
    // Validate league still exists and user is participant
    const league = Storage.getLeagueByGuild(dmContext.guildId);
    if (league && league.participants.includes(interaction.user.id)) {
      return { guildId: dmContext.guildId, source: 'dm-context' };
    }
  }

  // 3. No context available
  return { guildId: null, source: 'none' };
}
