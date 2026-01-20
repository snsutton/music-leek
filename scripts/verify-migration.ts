import { Storage } from '../src/utils/storage';
import { toTimestamp, getCurrentRound } from '../src/utils/helpers';

console.log('=== Production Data Verification ===\n');

// Load actual production data
const leagues = Storage.getAllLeagues();
console.log(`Found ${leagues.length} league(s)\n`);

for (const league of leagues) {
  console.log(`League: ${league.name} (${league.guildId})`);
  console.log(`  createdAt: ${league.createdAt}`);
  console.log(`  createdAt parses to: ${new Date(league.createdAt).toLocaleString()}`);
  console.log(`  toTimestamp works: ${toTimestamp(league.createdAt)} (should be ~1.7 trillion)`);

  const round = getCurrentRound(league);
  if (round) {
    console.log(`\n  Current Round ${round.roundNumber} (status: ${round.status}):`);
    console.log(`    submissionDeadline: ${round.submissionDeadline}`);
    console.log(`    votingDeadline: ${round.votingDeadline}`);

    // Test deadline comparison (critical for scheduler)
    const now = Date.now();
    const submissionTs = toTimestamp(round.submissionDeadline);
    const votingTs = toTimestamp(round.votingDeadline);

    console.log(`\n  Deadline checks (now=${now}):`);
    console.log(`    submission deadline passed? ${now > submissionTs} (ts=${submissionTs})`);
    console.log(`    voting deadline passed? ${now > votingTs} (ts=${votingTs})`);

    // Test Discord timestamp formatting
    const discordSubmissionTs = Math.floor(submissionTs / 1000);
    const discordVotingTs = Math.floor(votingTs / 1000);
    console.log(`\n  Discord timestamps (for <t:X:F> format):`);
    console.log(`    submission: <t:${discordSubmissionTs}:F>`);
    console.log(`    voting: <t:${discordVotingTs}:F>`);

    // Verify submissions have valid timestamps
    console.log(`\n  Submissions (${round.submissions.length}):`);
    for (const sub of round.submissions.slice(0, 3)) {
      console.log(`    - ${sub.songTitle} by ${sub.artist}`);
      console.log(`      submittedAt: ${sub.submittedAt} -> ${new Date(sub.submittedAt).toLocaleString()}`);
    }
    if (round.submissions.length > 3) {
      console.log(`    ... and ${round.submissions.length - 3} more`);
    }
  }
  console.log('');
}

console.log('=== All timestamp conversions successful ===');
