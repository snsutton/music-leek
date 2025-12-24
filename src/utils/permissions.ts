import { League } from '../types';

export const MAX_ADMINS = 3;
export const MAX_PARTICIPANTS = 25;

/**
 * Check if a user is an admin of a league
 */
export function isAdmin(league: League, userId: string): boolean {
  return league.admins.includes(userId);
}

/**
 * Check if a user is the creator/owner of a league
 */
export function isCreator(league: League, userId: string): boolean {
  return league.createdBy === userId;
}

/**
 * Check if a user can manage admins (creator only)
 */
export function canManageAdmins(league: League, userId: string): boolean {
  return isCreator(league, userId);
}

/**
 * Check if a new admin can be added (not at max limit)
 */
export function canAddAdmin(league: League): boolean {
  return league.admins.length < MAX_ADMINS;
}

/**
 * Check if a user is a participant in a league
 */
export function isParticipant(league: League, userId: string): boolean {
  return league.participants.includes(userId);
}

/**
 * Check if a new participant can be added (not at max limit)
 */
export function canAddParticipant(league: League): boolean {
  return league.participants.length < MAX_PARTICIPANTS;
}
