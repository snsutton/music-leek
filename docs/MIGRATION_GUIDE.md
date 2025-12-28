# Migration Guide

This guide provides step-by-step instructions for deploying schema changes using the Railway CLI.

---

## Table of Contents

- [Local Testing](#local-testing)
- [Production Deployment](#production-deployment)
- [Rollback](#rollback)

---

## Local Testing

### Prerequisites
```bash
# 1. Ensure you're on the latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Build TypeScript
npm run build
```

### Step 1: Backup Local Data
```bash
# Backup your local leagues data
cp data/leagues.json data/leagues.backup.$(date +%s).json

# Or test with production data copy
railway ssh --run "cat data/leagues.json" > data/leagues.production.json
cp data/leagues.production.json data/leagues.json
```

### Step 2: Run Migration Locally
```bash
# Run migration script (adjust path to your migration)
node dist/scripts/migrate-*.js
```

### Step 3: Verify Migrated Data
```bash
# Verify JSON is valid
node -e "JSON.parse(require('fs').readFileSync('data/leagues.json'))"

# Inspect the migrated data
cat data/leagues.json | head -50
```

### Step 4: Test Bot Locally
```bash
# Start bot locally
npm start

# Verify in Discord:
# - Bot comes online without errors
# - Existing commands work
# - New features function correctly
# - Existing leagues still load
```

### Step 5: Deploy Slash Commands (if needed)
```bash
# Deploy updated slash commands to Discord
npm run deploy
```

---

## Production Deployment

### Prerequisites
```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Log in to Railway
railway login --browserless

# Link to your project
railway link
```

### Step 1: Backup Production Data
```bash
# Connect to production and create backup BEFORE deploying
railway ssh

# Inside production container:
cd data
cp leagues.json leagues.backup.$(date +%s).json
ls -la leagues.backup.*
exit

# Also download a local backup copy
railway ssh "cat data/leagues.json" > data/leagues.production.backup.json

# Verify backup was downloaded
cat data/leagues.production.backup.json | head -20
```

### Step 2: Deploy Everything Together
```bash
# Commit ALL changes (schema + migration script + new features)
git add .
git commit -m "Add [feature name] with migration"
git push origin main

# Watch deployment to ensure it builds successfully
railway logs --follow
```

**Wait for build to complete** (~2-3 minutes)

### Step 3: Run Migration in Production
```bash
# Connect to production
railway ssh

# Inside production container, run the migration:
node dist/scripts/migrate-*.js

# Verify the migration succeeded before exiting
cat data/leagues.json | head -50
exit
```

### Step 4: Restart the Bot (if needed)
```bash
# If the bot doesn't automatically pick up changes, restart it
# via Railway Dashboard: Deployments → Current deployment → Restart
# Or trigger a redeploy:
git commit --allow-empty -m "Trigger restart"
git push origin main
```

### Step 5: Deploy Slash Commands (if needed)
```bash
# If you added/modified slash commands, deploy them
npm run deploy
```

### Step 6: Verify Production
```bash
# Check logs for any errors
railway logs --follow

# Verify migration applied correctly
railway ssh --run "cat data/leagues.json" | grep "[expected-field]"

# Test in Discord:
# - Bot is online
# - New commands appear (if applicable)
# - Existing features work
# - New features work
```

---

## Rollback

If something goes wrong:

### Step 1: Restore Data
```bash
# Connect to production
railway ssh

# Inside production container:
cd data
ls -la leagues.backup.*
cp leagues.backup.[TIMESTAMP].json leagues.json
exit
```

### Step 2: Redeploy Previous Code
```bash
# Option A: Via Railway Dashboard
# Go to Deployments → Find previous successful deployment → Redeploy

# Option B: Via Git revert
git log --oneline
git revert [commit-hash]
git push origin main
```

### Step 3: Verify
```bash
# Check logs
railway logs --follow

# Test in Discord to ensure rollback was successful
```

---

## Important Notes

- **Always test migrations locally first** before running in production
- **Always create backups** before running migrations
- **Verify each step** before proceeding to the next
- **Have a rollback plan** ready before starting

Remember: **Always backup before migrating!**
