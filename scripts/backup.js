const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const backupDir = path.join(dataDir, 'backup');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src)) {
    const srcEntry = path.join(src, entry);
    const destEntry = path.join(dest, entry);
    if (fs.statSync(srcEntry).isDirectory()) {
      count += copyDirRecursive(srcEntry, destEntry);
    } else {
      fs.copyFileSync(srcEntry, destEntry);
      count++;
    }
  }
  return count;
}

let backedUp = 0;

// Back up flat data files
const flatFiles = ['tokens.json', 'dm-contexts.json', 'leagues.json', 'leagues.json.migrated'];
for (const file of flatFiles) {
  const src = path.join(dataDir, file);
  const dest = path.join(backupDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Backed up: ${file}`);
    backedUp++;
  }
}

// Back up leagues directory (per-guild files + completed archives)
const leaguesSrc = path.join(dataDir, 'leagues');
const leaguesDest = path.join(backupDir, 'leagues');
const leagueFileCount = copyDirRecursive(leaguesSrc, leaguesDest);
if (leagueFileCount > 0) {
  console.log(`Backed up leagues directory: ${leagueFileCount} file(s)`);
  backedUp += leagueFileCount;
}

if (backedUp === 0) {
  console.log('No data files found to backup.');
} else {
  console.log(`\nBackup complete: ${backedUp} file(s) saved to data/backup/`);
}
