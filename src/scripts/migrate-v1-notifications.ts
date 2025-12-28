import { Storage } from '../utils/storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration v1: Add notification system fields
 *
 * Changes:
 * - Add admins array to old leagues (if missing)
 * - Add totalRounds to leagues (default: 10 for existing)
 * - Add isCompleted to leagues (default: false)
 * - Add notificationsSent to all rounds (default: all true for past events)
 *
 * ROLLBACK:
 * 1. Stop bot
 * 2. Restore backup: cp data/leagues.backup.XXXXX.json data/leagues.json
 * 3. Deploy previous code version (before notification system)
 * 4. Start bot
 */
async function migrate() {
  console.log('🔄 Starting migration: notification-system-v1');
  console.log('   Date:', new Date().toISOString());
  console.log();

  // Paths
  const dataPath = path.join(__dirname, '../../data/leagues.json');
  const backupPath = path.join(__dirname, '../../data/leagues.backup.' + Date.now() + '.json');

  // Verify data file exists
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Error: data/leagues.json not found!');
    process.exit(1);
  }

  // Create backup
  console.log('📦 Creating backup...');
  fs.copyFileSync(dataPath, backupPath);
  console.log(`✓ Backup created: ${backupPath}`);
  console.log();

  // Load data
  console.log('📖 Loading data...');
  const data = Storage.load();
  let migratedLeagues = 0;
  let migratedRounds = 0;
  const issues: string[] = [];

  console.log(`Found ${Object.keys(data.leagues).length} league(s)`);
  console.log();

  // Migrate each league
  for (const leagueId in data.leagues) {
    const league = data.leagues[leagueId];
    console.log(`🔧 Migrating league: "${league.name}" (ID: ${leagueId})`);
    let leagueModified = false;

    // Fix missing admins array (old schema issue)
    if (!league.admins) {
      league.admins = [league.createdBy];
      console.log(`  ✓ Added admins array: [${league.createdBy}]`);
      leagueModified = true;
      issues.push(`League "${league.name}" was missing admins array (old schema)`);
    }

    // Add totalRounds if missing
    if (!league.totalRounds) {
      league.totalRounds = 10; // Default for existing leagues
      console.log(`  ✓ Added totalRounds: 10`);
      leagueModified = true;
    }

    // Add isCompleted if missing
    if (league.isCompleted === undefined) {
      league.isCompleted = false;
      console.log(`  ✓ Added isCompleted: false`);
      leagueModified = true;
    }

    // Migrate rounds
    if (league.rounds && league.rounds.length > 0) {
      console.log(`  📝 Migrating ${league.rounds.length} round(s)...`);

      for (const round of league.rounds) {
        if (!round.notificationsSent) {
          // For existing rounds, mark notifications as sent based on round status
          // This prevents retroactive notifications from spamming users
          round.notificationsSent = {
            roundStarted: true, // Always mark as sent for existing rounds
            submissionReminder: round.status !== 'submission', // Only if past submission phase
            votingStarted: round.status === 'voting' || round.status === 'completed',
            votingReminder: round.status === 'completed',
            allVotesReceived: round.status === 'completed'
          };

          console.log(`    Round ${round.roundNumber} (${round.status}): ` +
                     `roundStarted=true, submissionReminder=${round.notificationsSent.submissionReminder}, ` +
                     `votingStarted=${round.notificationsSent.votingStarted}, ` +
                     `votingReminder=${round.notificationsSent.votingReminder}, ` +
                     `allVotesReceived=${round.notificationsSent.allVotesReceived}`);

          migratedRounds++;
          leagueModified = true;
        }
      }
    }

    if (leagueModified) {
      migratedLeagues++;
      console.log(`  ✅ League migration complete`);
    } else {
      console.log(`  ⏭️  League already up to date`);
    }
    console.log();
  }

  // Save migrated data
  console.log('💾 Saving migrated data...');
  Storage.save(data);
  console.log('✓ Data saved successfully');
  console.log();

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Migration complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Leagues migrated: ${migratedLeagues}/${Object.keys(data.leagues).length}`);
  console.log(`   Rounds migrated:  ${migratedRounds}`);
  console.log(`   Backup location:  ${backupPath}`);

  if (issues.length > 0) {
    console.log();
    console.log('⚠️  Issues found and fixed:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }

  console.log();
  console.log('Next steps:');
  console.log('1. Verify migrated data: cat data/leagues.json');
  console.log('2. Deploy new code: npm run build && npm run deploy');
  console.log('3. Restart bot: npm start');
  console.log();
  console.log('If issues occur, rollback with:');
  console.log(`   cp ${backupPath} ${dataPath}`);
}

// Run migration
migrate().catch(err => {
  console.error('\n❌ Migration failed!');
  console.error(err);
  console.error('\nData has NOT been modified.');
  console.error('Review the error above and fix the migration script.');
  process.exit(1);
});
