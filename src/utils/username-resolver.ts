import { Client } from 'discord.js';

/**
 * Batch resolve usernames for a list of user IDs.
 * Uses Promise.allSettled for robustness against individual failures.
 *
 * @param client - Discord client instance
 * @param userIds - Array of user IDs to resolve
 * @returns Map of userId -> username (or "Unknown User" on failure)
 */
export async function resolveUsernames(
  client: Client,
  userIds: string[]
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(userIds)];
  const results = await Promise.allSettled(
    uniqueIds.map(id => client.users.fetch(id))
  );

  const usernameMap = new Map<string, string>();
  results.forEach((result, index) => {
    const userId = uniqueIds[index];
    usernameMap.set(
      userId,
      result.status === 'fulfilled' ? result.value.username : 'Unknown User'
    );
  });

  return usernameMap;
}

/**
 * Format a user for display using cached username.
 * Falls back to Discord mention syntax if username not in cache.
 *
 * @param userId - The user's Discord ID
 * @param cache - Map of userId -> username from resolveUsernames()
 * @returns Username string or fallback mention
 */
export function formatUser(userId: string, cache: Map<string, string>): string {
  return cache.get(userId) || `<@${userId}>`;
}
