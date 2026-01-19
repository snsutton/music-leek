const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const backupDir = path.join(dataDir, 'backup');

const filesToRestore = ['leagues.json', 'tokens.json', 'dm-contexts.json'];

if (!fs.existsSync(backupDir)) {
  console.error('No backup directory found. Run "npm run backup" first.');
  process.exit(1);
}

let restored = 0;
for (const file of filesToRestore) {
  const src = path.join(backupDir, file);
  const dest = path.join(dataDir, file);

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Restored: ${file}`);
    restored++;
  }
}

if (restored === 0) {
  console.log('No backup files found to restore.');
} else {
  console.log(`\nRestore complete: ${restored} file(s) restored from data/backup/`);
}
