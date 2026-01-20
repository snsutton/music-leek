/**
 * One-time migration script to convert numeric timestamps to ISO 8601 strings.
 *
 * Run with: node dist/scripts/migrate-timestamps.js
 *
 * After verifying the migration, this script can be deleted.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const LEAGUES_FILE = path.join(DATA_DIR, 'leagues.json');
const DM_CONTEXTS_FILE = path.join(DATA_DIR, 'dm-contexts.json');

function toISOString(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function isNumericTimestamp(value: any): value is number {
  return typeof value === 'number' && value > 1000000000000; // After year 2001 in ms
}

function migrateLeagues(): void {
  if (!fs.existsSync(LEAGUES_FILE)) {
    console.log('No leagues.json found, skipping.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(LEAGUES_FILE, 'utf-8'));
  let migrated = false;

  for (const leagueId in data.leagues) {
    const league = data.leagues[leagueId];

    // Migrate league-level timestamps
    if (isNumericTimestamp(league.createdAt)) {
      league.createdAt = toISOString(league.createdAt);
      migrated = true;
    }
    if (isNumericTimestamp(league.completedAt)) {
      league.completedAt = toISOString(league.completedAt);
      migrated = true;
    }
    if (league.spotifyIntegration && isNumericTimestamp(league.spotifyIntegration.connectedAt)) {
      league.spotifyIntegration.connectedAt = toISOString(league.spotifyIntegration.connectedAt);
      migrated = true;
    }

    // Migrate rounds
    for (const round of league.rounds || []) {
      if (isNumericTimestamp(round.startedAt)) {
        round.startedAt = toISOString(round.startedAt);
        migrated = true;
      }
      if (isNumericTimestamp(round.themeSubmissionDeadline)) {
        round.themeSubmissionDeadline = toISOString(round.themeSubmissionDeadline);
        migrated = true;
      }
      if (isNumericTimestamp(round.submissionDeadline)) {
        round.submissionDeadline = toISOString(round.submissionDeadline);
        migrated = true;
      }
      if (isNumericTimestamp(round.votingDeadline)) {
        round.votingDeadline = toISOString(round.votingDeadline);
        migrated = true;
      }

      // Migrate playlist timestamp
      if (round.playlist && isNumericTimestamp(round.playlist.createdAt)) {
        round.playlist.createdAt = toISOString(round.playlist.createdAt);
        migrated = true;
      }

      // Migrate theme submissions
      for (const theme of round.themeSubmissions || []) {
        if (isNumericTimestamp(theme.submittedAt)) {
          theme.submittedAt = toISOString(theme.submittedAt);
          migrated = true;
        }
      }

      // Migrate song submissions
      for (const submission of round.submissions || []) {
        if (isNumericTimestamp(submission.submittedAt)) {
          submission.submittedAt = toISOString(submission.submittedAt);
          migrated = true;
        }
      }
    }
  }

  if (migrated) {
    // Backup original file
    const backupFile = LEAGUES_FILE.replace('.json', '.backup.json');
    fs.copyFileSync(LEAGUES_FILE, backupFile);
    console.log(`Backed up original to ${backupFile}`);

    // Write migrated data
    fs.writeFileSync(LEAGUES_FILE, JSON.stringify(data, null, 2));
    console.log('Migrated leagues.json timestamps to ISO 8601 format.');
  } else {
    console.log('No numeric timestamps found in leagues.json (already migrated or empty).');
  }
}

function migrateDmContexts(): void {
  if (!fs.existsSync(DM_CONTEXTS_FILE)) {
    console.log('No dm-contexts.json found, skipping.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(DM_CONTEXTS_FILE, 'utf-8'));
  let migrated = false;

  for (const userId in data.contexts || {}) {
    const context = data.contexts[userId];
    if (isNumericTimestamp(context.lastNotificationAt)) {
      context.lastNotificationAt = toISOString(context.lastNotificationAt);
      migrated = true;
    }
  }

  if (migrated) {
    // Backup original file
    const backupFile = DM_CONTEXTS_FILE.replace('.json', '.backup.json');
    fs.copyFileSync(DM_CONTEXTS_FILE, backupFile);
    console.log(`Backed up original to ${backupFile}`);

    // Write migrated data
    fs.writeFileSync(DM_CONTEXTS_FILE, JSON.stringify(data, null, 2));
    console.log('Migrated dm-contexts.json timestamps to ISO 8601 format.');
  } else {
    console.log('No numeric timestamps found in dm-contexts.json (already migrated or empty).');
  }
}

// Note: tokens.json stores encrypted data, so we cannot migrate it directly.
// Tokens will be re-encrypted with ISO timestamps when they are next refreshed.

console.log('Starting timestamp migration...\n');
migrateLeagues();
migrateDmContexts();
console.log('\nMigration complete!');
