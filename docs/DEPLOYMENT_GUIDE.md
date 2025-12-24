# Deployment Guide for Music Leek Discord Bot

This guide covers setting up your Discord bot for local development testing and production deployment.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Deployment (Railway)](#production-deployment-railway)
4. [Configuration](#configuration)
5. [Updating Your Bot](#updating-your-bot)

---

## Prerequisites

Before starting, ensure you have:

1. **Node.js** - v16 or higher (v20 recommended) - [nodejs.org](https://nodejs.org)
2. **Git** - [git-scm.com/downloads](https://git-scm.com/downloads)
3. **Discord Bot Token** - Create at [Discord Developer Portal](https://discord.com/developers/applications)
4. **GitHub Account** - (for production deployment) - [github.com/signup](https://github.com/signup)

### Creating Your Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** tab → Add Bot → Copy the bot token
4. Go to **OAuth2** tab → Copy the Application ID
5. In **OAuth2 → URL Generator**:
   - Scopes: `bot` + `applications.commands`
   - Bot Permissions: Send Messages, Embed Links, Read Message History, Use Slash Commands
   - Copy and open the generated URL to invite the bot to your server

**IMPORTANT:** Save your bot token and client ID - you'll need them for setup.

---

## Local Development Setup

This section covers running the bot on your local machine for development and testing.

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/music-leek.git
cd music-leek

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Required
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# Optional - Spotify support
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Optional - Apple Music support (requires $99/year Apple Developer account)
APPLE_MUSIC_TEAM_ID=your_apple_team_id
APPLE_MUSIC_KEY_ID=your_musickit_key_id
APPLE_MUSIC_PRIVATE_KEY=your_private_key_content
```

**Important:** The `.env` file is already in `.gitignore` and will never be committed to git.

### Step 3: Build and Deploy Commands

```bash
# Build TypeScript
npm run build

# Deploy slash commands to Discord (one-time setup)
npm run deploy
```

### Step 4: Run the Bot

```bash
# Development mode (with hot reload)
npm run dev

# Or production mode (uses compiled JavaScript)
npm start
```

You should see: `Ready! Logged in as YourBotName#1234`

### Step 5: Test in Discord

In your Discord server, try:
```
/create-league name:Test League
```

If it works, your local setup is complete!

### Local Development Commands

```bash
# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Deploy commands to Discord
npm run deploy

# Start bot (production mode)
npm start

# Run tests
npm test
npm run test:watch
npm run test:coverage
```

---

## Production Deployment (Railway)

This section covers deploying your bot to Railway for 24/7 operation.

Railway.app is a Platform-as-a-Service that makes deployment simple with GitHub integration and a generous free tier.

### Prerequisites for Railway Deployment

Before deploying to Railway:
1. Complete the [Local Development Setup](#local-development-setup) first
2. Your code must be pushed to a GitHub repository
3. Ensure `.gitignore` includes: `.env`, `node_modules/`, `dist/`, `data/leagues.json`

### Why Railway.app?

**Key Benefits:**
- Config-as-code deployment using `railway.toml`
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
   - Railway automatically detects the `railway.toml` configuration
   - Runs `npm install`
   - Runs `npm run build` (as configured in railway.toml)
   - Runs `npm start` (auto-deploys commands, then starts the bot)
   - Configures health check at `/health` endpoint

### Step 3: Configure Environment Variables

Your bot will fail initially because it's missing the Discord token. Let's add it:

1. **In Railway Dashboard:**
   - Click on your project
   - Click on the service (should be named `music-leek` or similar)
   - Go to **"Variables"** tab

2. **Add Required Environment Variables:**

   Click **"New Variable"** and add each of the following:

   **Discord Credentials (Required):**
   - **Name:** `DISCORD_TOKEN`
     - **Value:** `your_bot_token_here`
   - **Name:** `DISCORD_CLIENT_ID`
     - **Value:** `your_client_id_here`

   **Spotify API (Required for Spotify URL support):**
   - **Name:** `SPOTIFY_CLIENT_ID`
     - **Value:** `your_spotify_client_id`
   - **Name:** `SPOTIFY_CLIENT_SECRET`
     - **Value:** `your_spotify_client_secret`

   **Apple Music API (Optional - requires $99/year Apple Developer account):**
   - **Name:** `APPLE_MUSIC_TEAM_ID`
     - **Value:** `your_apple_team_id`
   - **Name:** `APPLE_MUSIC_KEY_ID`
     - **Value:** `your_musickit_key_id`
   - **Name:** `APPLE_MUSIC_PRIVATE_KEY`
     - **Value:** `your_private_key_content` (paste the full .p8 file content)

   > **Note:** If you skip the Spotify credentials, users will see "Spotify support is not configured on this bot" when submitting Spotify URLs. Apple Music credentials are optional.

3. **Redeploy:**
   - Railway automatically redeploys when you add variables
   - Wait 30-60 seconds for deployment to complete

### Step 4: Verify Deployment

Commands are automatically deployed on startup (configured in package.json).

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

**Pushing your code to GitHub triggers a new Railway deployment.** 

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
| `SPOTIFY_CLIENT_ID` | Yes* | Spotify API client ID (required for Spotify URL support) |
| `SPOTIFY_CLIENT_SECRET` | Yes* | Spotify API client secret (required for Spotify URL support) |
| `APPLE_MUSIC_TEAM_ID` | No | Apple Developer Team ID (optional, for Apple Music support) |
| `APPLE_MUSIC_KEY_ID` | No | Apple MusicKit Key ID (optional, for Apple Music support) |
| `APPLE_MUSIC_PRIVATE_KEY` | No | Apple MusicKit private key content from .p8 file (optional) |
| `DATA_DIR` | No | Path to data directory (default: `./data`) |
| `NODE_ENV` | No | Set to `production` for production mode |

\* Required if you want users to be able to submit Spotify URLs. Without these, users will see "Spotify support is not configured on this bot" error.

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

---

**You're all set!** Your Music Leek Discord bot is configured for both local development and production deployment with Railway.
