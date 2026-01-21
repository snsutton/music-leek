const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const backupDir = path.join(dataDir, 'backup');

const filesToBackup = ['leagues.json', 'tokens.json', 'dm-contexts.json'];

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

let backedUp = 0;
for (const file of filesToBackup) {
  const src = path.join(dataDir, file);
  const dest = path.join(backupDir, file);

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Backed up: ${file}`);
    backedUp++;
  }
}

if (backedUp === 0) {
  console.log('No data files found to backup.');
} else {
  console.log(`\nBackup complete: ${backedUp} file(s) saved to data/backup/`);
}
