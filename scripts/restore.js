const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const backupDir = path.join(dataDir, 'backup');

if (!fs.existsSync(backupDir)) {
  console.error('No backup directory found. Run "npm run backup" first.');
  process.exit(1);
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

let restored = 0;

// Restore flat data files
const flatFiles = ['tokens.json', 'dm-contexts.json', 'leagues.json', 'leagues.json.migrated'];
for (const file of flatFiles) {
  const src = path.join(backupDir, file);
  const dest = path.join(dataDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Restored: ${file}`);
    restored++;
  }
}

// Restore leagues directory (per-guild files + completed archives)
const leaguesSrc = path.join(backupDir, 'leagues');
const leaguesDest = path.join(dataDir, 'leagues');
const leagueFileCount = copyDirRecursive(leaguesSrc, leaguesDest);
if (leagueFileCount > 0) {
  console.log(`Restored leagues directory: ${leagueFileCount} file(s)`);
  restored += leagueFileCount;
}

if (restored === 0) {
  console.log('No backup files found to restore.');
} else {
  console.log(`\nRestore complete: ${restored} file(s) restored from data/backup/`);
}
