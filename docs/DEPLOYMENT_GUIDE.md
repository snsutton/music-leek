# Deployment Guide for Music Leek Discord Bot

This guide covers deploying your Discord bot for 24/7 operation.

## Table of Contents
1. [General Deployment Requirements](#general-deployment-requirements)
2. [Prerequisites](#prerequisites)
3. [Railway.app Deployment](#railwayapp-deployment)
4. [Configuration](#configuration)
5. [Updating Your Bot](#updating-your-bot)

---

## General Deployment Requirements

### What Your Bot Needs to Run 24/7

Any hosting platform you choose must provide:

**Runtime Environment:**
- Node.js v16 or higher (v20 recommended)
- Package manager (npm or yarn)
- Ability to run persistent processes

**System Requirements:**
- **Memory:** Minimum 256MB RAM (512MB+ recommended)
- **CPU:** Minimal (bot is event-driven, only active during commands)
- **Storage:** ~100MB for code + dependencies
- **Network:** Stable outbound connection to Discord API (wss://gateway.discord.gg)

**Environment Variables:**
Your bot requires these secrets to be set:
- `DISCORD_TOKEN` - Your Discord bot token
- `DISCORD_CLIENT_ID` - Your Discord application ID

**Build Process:**
1. Install dependencies: `npm install`
2. Compile TypeScript: `npm run build`
3. Register slash commands: `npm run deploy` (one-time or on startup)
4. Start bot: `npm start` (runs `node dist/index.js`)

**Data Persistence:**
- Bot stores league data in `data/leagues.json`
- Requires persistent storage (not ephemeral filesystem)
- Recommend using volumes/mounted storage for production

### Deployment Options

**Platform-as-a-Service (PaaS)** - Recommended for beginners:
- Railway.app ($1/month free tier)
- Fly.io (256MB free tier)
- Render.com (free tier with limitations)
- Pros: Easy setup, auto-deployments, managed infrastructure
- Cons: Less control, potential cost as bot scales

**Virtual Private Server (VPS)** - For advanced users:
- DigitalOcean, Linode, Vultr ($5+/month)
- Oracle Cloud (free tier, poor availability)
- Pros: Full control, predictable costs
- Cons: Manual setup, require server management (SSH, PM2, security)

**Serverless** - Not recommended for Discord bots:
- AWS Lambda, Google Cloud Functions, etc.
- Discord bots need persistent WebSocket connections
- Serverless cold starts cause disconnections

### Pre-Deployment Checklist

Before deploying to any platform:

- [ ] Bot code is in a Git repository (GitHub, GitLab, etc.)
- [ ] `.gitignore` includes `.env`, `node_modules/`, `dist/`, `data/`
- [ ] Discord bot token and client ID obtained from [Discord Developer Portal](https://discord.com/developers/applications)
- [ ] Bot invited to your Discord server with proper permissions
- [ ] Local testing completed (`npm run dev` works)
- [ ] Build succeeds locally (`npm run build` runs without errors)
- [ ] `package.json` has all required dependencies listed

---

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Account** - [github.com/signup](https://github.com/signup)
2. **Discord Bot Token** - Create at [Discord Developer Portal](https://discord.com/developers/applications)
3. **Git Installed** - [git-scm.com/downloads](https://git-scm.com/downloads)
4. **Your bot code in a GitHub repository**

### Creating Your Discord Bot Token

If you haven't already:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** tab → Add Bot → Copy the bot token
4. Go to **OAuth2** tab → Copy the Application ID
5. In **OAuth2 → URL Generator**:
   - Scopes: `bot` + `applications.commands`
   - Bot Permissions: Send Messages, Embed Links, Read Message History, Use Slash Commands
   - Copy and open the generated URL to invite the bot to your server

**IMPORTANT:** Save your bot token and client ID - you'll need them for deployment.

### Pushing Your Code to GitHub

If your bot isn't already on GitHub:

```bash
# Navigate to your project directory
cd music-leek

# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/music-leek.git
git branch -M main
git push -u origin main
```

**Verify `.gitignore` includes:**
```
.env
node_modules/
dist/
data/leagues.json
```

---

## Railway.app Deployment

Railway.app is a Platform-as-a-Service that makes deployment simple with GitHub integration and a generous free tier.

### Why Railway.app?

**Key Benefits:**
- Simple deployment - Deploy directly from GitHub in minutes
- Zero configuration - Automatically detects Node.js and installs dependencies
- Auto-deployments - Push to GitHub, Railway deploys automatically
- Built-in monitoring - Real-time logs and resource metrics
- No server management - No SSH, PM2, or manual setup needed
- Free tier - $1/month in credits (sufficient for small bots)

**Railway.app Pricing (2025):**
- New users: $5 in credits for first 30 days (no credit card required)
- After trial: $1/month in non-rollover credits (free forever)
- Small Discord bots typically stay within the $1/month free tier
- If exceeded: Services stop until you upgrade to Hobby Plan ($5/month)

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click **"Sign Up"** or **"Login"**
3. Choose **"Sign in with GitHub"** (recommended for easier deployments)
4. Authorize Railway to access your GitHub account
5. Verify your email address

**No credit card required for the free tier!**

### Step 2: Create New Project

1. **Login to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Click **"Dashboard"**

2. **Create New Project**
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**

3. **Select Repository**
   - Choose `music-leek` from the list
   - If you don't see it, click **"Configure GitHub App"** to grant access

4. **Railway Starts Deployment**
   - Railway automatically detects Node.js
   - Runs `npm install`
   - Runs `npm run build` (if build script exists)
   - Attempts to start your bot with `npm start`

### Step 3: Configure Environment Variables

Your bot will fail initially because it's missing the Discord token. Let's add it:

1. **In Railway Dashboard:**
   - Click on your project
   - Click on the service (should be named `music-leek` or similar)
   - Go to **"Variables"** tab

2. **Add Environment Variables:**
   - Click **"New Variable"**
   - Add the following:
     - **Name:** `DISCORD_TOKEN`
     - **Value:** `your_bot_token_here`
   - Click **"Add"**
   - Repeat for:
     - **Name:** `DISCORD_CLIENT_ID`
     - **Value:** `your_client_id_here`

3. **Redeploy:**
   - Railway automatically redeploys when you add variables
   - Wait 30-60 seconds for deployment to complete

### Step 4: Deploy Commands to Discord

Railway doesn't run `npm run deploy` automatically. You need to do this once:

**Option 1: Run Locally (Recommended)**
```bash
# On your local machine
npm run deploy
```

**Option 2: Add to package.json Start Script**

Edit [package.json](../package.json):

```json
"scripts": {
  "build": "tsc",
  "start": "npm run deploy-if-needed && node dist/index.js",
  "deploy-if-needed": "node dist/deploy-commands.js || true",
  "dev": "ts-node src/index.ts",
  "deploy": "ts-node src/deploy-commands.ts"
}
```

This ensures commands are registered before the bot starts. Then push to GitHub:

```bash
git add package.json
git commit -m "Auto-deploy commands on start"
git push
```

Railway will automatically redeploy with the new start script.

### Step 5: Verify Deployment

1. **Check Deployment Status:**
   - In Railway Dashboard → Your project → "Deployments" tab
   - Status should show **"Success"** with a green checkmark

2. **View Logs:**
   - Click **"View Logs"** button
   - You should see: `Ready! Logged in as YourBotName#1234`

3. **Test in Discord:**
   - In your Discord server, try:
     ```
     /create-league name:Test League
     ```
   - If it works, your bot is live!

---

## Configuration

### Persistent Data Storage

Railway provides persistent storage, but you need to configure it:

1. **In Railway Dashboard:**
   - Click your service
   - Go to **"Settings"** tab
   - Scroll to **"Volumes"**
   - Click **"Add Volume"**
   - **Mount Path:** `/app/data`
   - Click **"Add"**

2. **Configure Data Directory:**

The bot is already configured to use the `DATA_DIR` environment variable for flexible storage locations.

Add environment variable in Railway:
- Click **"New Variable"**
- **Name:** `DATA_DIR`
- **Value:** `/app/data`
- Click **"Add"**

This ensures league data persists across deployments by storing it in the mounted volume instead of the ephemeral filesystem.

### Environment Variables Reference

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | Your Discord bot token |
| `DISCORD_CLIENT_ID` | Yes | Your Discord application ID |
| `DATA_DIR` | No | Path to data directory (default: `./data`) |
| `NODE_ENV` | No | Set to `production` for production mode |

### Security Best Practices

Even though Railway handles infrastructure security, follow these best practices:

**1. Protect Your Bot Token (HIGH PRIORITY)**

Never:
- Commit `.env` file to git (already in `.gitignore`)
- Share screenshots containing your token
- Log your token in code

Always:
- Use environment variables for secrets
- Regenerate token immediately if compromised:
  - Discord Developer Portal → Bot → Reset Token
  - Update Railway variable

**2. Dependency Security (MEDIUM PRIORITY)**

```bash
# Check for vulnerabilities weekly
npm audit

# Update dependencies
npm update

# For critical vulnerabilities
npm audit fix
```

**3. Code Security (MEDIUM PRIORITY)**

- Validate user input in commands
- Add rate limiting for heavy commands (if needed)
- Implement permission checks for admin commands
- Use TypeScript's type safety (already implemented)

**4. Data Backups (LOW PRIORITY)**

```bash
# Backup league data weekly (local machine)
# Download from Railway or backup local copy
cp data/leagues.json backups/leagues-$(date +%Y%m%d).json
```

**Security Checklist:**

- [ ] `.env` file in `.gitignore`
- [ ] Environment variables set in platform (not hardcoded)
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Bot token regenerated if ever exposed
- [ ] Regular backups of `data/leagues.json`

---

## Updating Your Bot

Railway makes updates incredibly simple - just push to GitHub!

### Method 1: Automatic Deployment (Recommended)

```bash
# Make code changes locally
# Edit files as needed

# Commit and push to GitHub
git add .
git commit -m "Add new feature"
git push

# Railway automatically:
# 1. Detects the push
# 2. Runs npm install
# 3. Runs npm run build
# 4. Restarts your bot
# 5. Usually completes in 30-60 seconds
```

### Method 2: Manual Deployment

If you want to deploy without pushing to GitHub:

1. **In Railway Dashboard:**
   - Click your service
   - Click **"Deploy"** dropdown
   - Select **"Redeploy"**

### Verifying Updates

1. **Check Deployment Status:**
   - Railway Dashboard → "Deployments" tab
   - Latest deployment should show "Success"

2. **View Logs:**
   - Click "View Logs"
   - Confirm bot restarted: `Ready! Logged in as...`

3. **Test in Discord:**
   - Try updated commands/features

### Rollback to Previous Deployment

If an update breaks your bot:

1. **In Railway Dashboard:**
   - Go to **"Deployments"** tab
   - Find the last working deployment
   - Click **"⋮"** (three dots)
   - Select **"Redeploy"**

This instantly reverts to the previous version.

### Common Issues

#### "Invalid Token" Error

**Log Message:** `Error: An invalid token was provided`

**Solution:**
1. Go to Railway Dashboard → Variables
2. Verify `DISCORD_TOKEN` is set correctly
3. Check for extra spaces or missing characters
4. If needed, regenerate token:
   - Discord Developer Portal → Your App → Bot → Reset Token
   - Update Railway variable

#### "Cannot find module" Error

**Log Message:** `Error: Cannot find module 'discord.js'`

**Solution:**
1. Check [package.json](../package.json) includes all dependencies
2. Ensure `package-lock.json` is committed to git
3. Redeploy: Railway Dashboard → Deploy → Redeploy

#### Build Failed

**Log Message:** `Build failed` or `npm run build exited with code 1`

**Solution:**
1. Run `npm run build` locally to identify errors
2. Fix TypeScript errors
3. Commit and push

#### Commands Not Registered

**Symptoms:** Commands don't appear in Discord's slash command menu.

**Solution:**
- Run `npm run deploy` locally, or
- Add to start script (see [Railway Step 4](#step-4-deploy-commands-to-discord))

#### Data Not Persisting

**Symptoms:** League data resets after deployments.

**Solution:**
1. Add Volume (see [Configuration → Persistent Data Storage](#persistent-data-storage))
2. Verify `data/` folder exists in your repo
3. Test persistence by creating a league, redeploying, and checking if it exists

---

## Summary

### What You've Deployed

- **24/7 Discord bot** on Railway.app
- **Automatic deployments** via GitHub push
- **Built-in monitoring** and logs
- **Free tier** ($1/month in credits)
- **Zero maintenance** - no server management needed

### Quick Reference Commands

```bash
# Update bot (local machine)
git add .
git commit -m "Update feature"
git push  # Railway auto-deploys

# Deploy commands to Discord
npm run deploy

# Test locally
npm run dev

# Build locally
npm run build
```

### Railway Dashboard Quick Links

When logged into [railway.app](https://railway.app):

- **View Logs:** Project → Service → "View Logs"
- **Check Metrics:** Project → Service → "Metrics"
- **Environment Variables:** Project → Service → "Variables"
- **Deployments:** Project → Service → "Deployments"
- **Settings:** Project → Service → "Settings"
- **Usage/Billing:** Account Settings → "Usage"

### Monthly Maintenance Checklist

**Every month (5 minutes):**

- [ ] Check Railway usage: Account → Usage (should be < $1)
- [ ] Review logs for errors: Project → View Logs
- [ ] Check Discord bot is responding: Test a command
- [ ] Run `npm audit` locally and update dependencies if needed
- [ ] Backup `data/leagues.json`

### Support Resources

- **Railway Documentation:** [docs.railway.app](https://docs.railway.app)
- **Railway Community:** [Discord](https://discord.gg/railway) | [Help Station](https://help.railway.app/)
- **Discord.js Guide:** [discordjs.guide](https://discordjs.guide/)
- **This Project's Docs:**
  - [User Guide](USER_GUIDE.md)
  - [Testing Guide](TESTING_GUIDE.md)

---

**You're all set!** Your Music Leek Discord bot is now running 24/7 with automatic deployments, monitoring, and minimal maintenance.
