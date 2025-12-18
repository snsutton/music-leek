# Deployment Guide for Music Leek Discord Bot

This guide covers deploying your Discord bot for 24/7 operation on various platforms.

## Table of Contents
1. [Overview](#overview)
2. [Docker Setup](#docker-setup)
3. [Oracle Cloud Free Tier (Recommended)](#oracle-cloud-free-tier)
4. [Fly.io Deployment](#flyio-deployment)
5. [Alternative Platforms](#alternative-platforms)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### Hosting Requirements
- **Runtime**: Node.js v16+
- **Memory**: 256MB minimum (512MB recommended)
- **Storage**: ~100MB for application + dependencies
- **Network**: Persistent connection to Discord API
- **Environment Variables**: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`

### Platform Comparison

| Platform | Cost | RAM | CPU | Uptime | Ease of Setup |
|----------|------|-----|-----|--------|---------------|
| **Oracle Cloud** | **FREE forever** | 1-24GB | 1-4 cores | 24/7 | Medium |
| Fly.io | Free trial → $0-5/mo | 256MB | Shared | 24/7 | Easy |
| Railway | $5 credit/mo (~12 days) | 512MB | Shared | Limited | Very Easy |
| Google Cloud | FREE e2-micro | 1GB | 0.25 vCPU | 24/7 | Medium |

**Recommendation**: Oracle Cloud for truly free 24/7 hosting with generous resources.

---

## Docker Setup

### Why Docker?
- Consistent environment across platforms
- Easy deployment and updates
- Portable between hosting providers
- Simplified dependency management

### Files Created
You'll need these files (instructions below):
- `Dockerfile` - Container build instructions
- `.dockerignore` - Files to exclude from container
- `docker-compose.yml` - Local testing (optional)

### What Docker Does
1. Creates a clean Linux environment
2. Installs Node.js and dependencies
3. Builds your TypeScript code
4. Runs your bot with proper error handling

---

## Oracle Cloud Free Tier

### Why Oracle Cloud?
- **Truly free forever** (not a trial)
- Generous resources (up to 24GB RAM!)
- No credit card charges
- Full VPS control
- 24/7 uptime guaranteed

### Step 1: Create Oracle Cloud Account

1. Go to [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. Click "Start for free"
3. Fill out registration form
4. **Credit card required** but never charged for free tier resources
5. Verify email and complete setup

### Step 2: Create a VM Instance

1. **Navigate to Instances**
   - Login to Oracle Cloud Console
   - Click hamburger menu (☰) → Compute → Instances
   - Click "Create Instance"

2. **Configure Instance** (recommended settings)
   - **Name**: `music-leek-bot`
   - **Image**: Ubuntu 22.04 (or latest LTS)
   - **Shape**:
     - Click "Change Shape"
     - Select "Ampere" (ARM-based)
     - Choose: VM.Standard.A1.Flex
     - **OCPUs**: 2
     - **Memory**: 12GB (or up to 24GB - it's free!)
   - **Networking**: Leave defaults (creates new VCN)
   - **SSH Keys**: Download the private key (IMPORTANT - save this!)

3. **Launch Instance**
   - Click "Create"
   - Wait 2-3 minutes for provisioning
   - Note the **Public IP Address**

### Step 3: Connect to Your VM

**Windows (PowerShell):**
```powershell
# Save your private key as music-leek-key.key
# Set proper permissions
icacls music-leek-key.key /inheritance:r
icacls music-leek-key.key /grant:r "%username%":"(R)"

# Connect via SSH
ssh -i music-leek-key.key ubuntu@YOUR_PUBLIC_IP
```

**Mac/Linux:**
```bash
# Save your private key and set permissions
chmod 400 music-leek-key.key

# Connect via SSH
ssh -i music-leek-key.key ubuntu@YOUR_PUBLIC_IP
```

### Step 4: Install Dependencies on VM

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x

# Install PM2 (process manager for keeping bot running)
sudo npm install -g pm2

# Install Git (if not already installed)
sudo apt install -y git
```

### Step 5: Deploy Your Bot

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/music-leek.git
cd music-leek

# Install dependencies
npm install

# Create .env file
nano .env
```

**In the nano editor, paste:**
```
DISCORD_TOKEN=your_actual_token_here
DISCORD_CLIENT_ID=your_actual_client_id_here
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

```bash
# Build the project
npm run build

# Deploy commands to Discord
npm run deploy

# Start bot with PM2
pm2 start npm --name "music-leek" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
# Follow the command it outputs (copy/paste and run it)
```

### Step 6: Manage Your Bot

```bash
# View bot status
pm2 status

# View bot logs
pm2 logs music-leek

# Restart bot
pm2 restart music-leek

# Stop bot
pm2 stop music-leek

# Update bot after code changes
cd music-leek
git pull
npm install
npm run build
pm2 restart music-leek
```

### Step 7: Open Firewall (If Needed)

Oracle Cloud has strict firewall rules. If your bot needs to accept incoming connections:

```bash
# Allow HTTP/HTTPS (only if you add a web dashboard later)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

For Discord bots (outbound only), no firewall changes needed.

---

## Fly.io Deployment

### Important: Pricing Update
**Fly.io no longer has a free tier** (as of 2025). They offer:
- Free trial credit (doesn't expire)
- Pay-as-you-go after trial credit runs out
- Invoices under $5 are waived
- Small Discord bot might stay under $5/month, but not guaranteed

### Step 1: Install Fly CLI

**Windows:**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Mac:**
```bash
brew install flyctl
```

**Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Sign Up and Login

```bash
# Sign up (or login if you have account)
flyctl auth signup

# Login
flyctl auth login
```

### Step 3: Prepare Your App

Create `fly.toml` in your project root:

```toml
app = "music-leek-YOUR_NAME"  # Must be globally unique
primary_region = "iad"  # Change to your nearest region

[build]

[env]
  NODE_ENV = "production"

[processes]
  app = "node dist/index.js"

[[services]]
  protocol = "tcp"
  internal_port = 8080
  processes = ["app"]

[[services.ports]]
  port = 80
  handlers = ["http"]

[[services.ports]]
  port = 443
  handlers = ["tls", "http"]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false  # IMPORTANT: Keep bot running
  auto_start_machines = true
  min_machines_running = 1    # IMPORTANT: Always have 1 machine

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256  # Free tier limit
```

### Step 4: Set Environment Variables

```bash
# Set secrets (these are encrypted and never logged)
flyctl secrets set DISCORD_TOKEN=your_token_here
flyctl secrets set DISCORD_CLIENT_ID=your_client_id_here
```

### Step 5: Deploy

```bash
# Initialize fly app
flyctl launch --no-deploy

# Deploy
flyctl deploy

# Check status
flyctl status

# View logs
flyctl logs
```

### Step 6: Monitoring and Updates

```bash
# View real-time logs
flyctl logs -f

# SSH into container
flyctl ssh console

# Update deployment
git commit -am "Update bot"
flyctl deploy

# Scale machines (if needed - costs more)
flyctl scale vm shared-cpu-1x --memory 512
```

---

## Alternative Platforms

### Railway.dev
**Pros**: Extremely easy deployment, Git integration
**Cons**: Only $5 credit/month (~12-16 days uptime)

1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add environment variables in dashboard
4. Auto-deploys on git push

### Google Cloud Platform (GCP)
**Pros**: Free e2-micro instance forever (US regions)
**Cons**: More complex setup than Oracle

Similar process to Oracle Cloud:
1. Create GCP account
2. Create e2-micro instance (US region only for free tier)
3. Install Node.js and dependencies
4. Deploy with PM2

### Render.com
**Pros**: Very easy deployment
**Cons**: Free tier instances spin down after 15 minutes of inactivity (NOT suitable for Discord bots)

---

## Troubleshooting

### Bot Not Responding
```bash
# Check if bot is running
pm2 status              # On Oracle/GCP
flyctl status           # On Fly.io

# Check logs for errors
pm2 logs music-leek     # On Oracle/GCP
flyctl logs             # On Fly.io
```

### Common Errors

**"Invalid Token" Error**
- Verify `.env` file or secrets are set correctly
- Ensure token is copied exactly (no spaces)
- Regenerate token in Discord Developer Portal if needed

**"Out of Memory" Error**
- Increase VM memory (Oracle Cloud free tier allows up to 24GB)
- Check for memory leaks in code
- Restart bot: `pm2 restart music-leek`

**Bot Stops After Server Reboot**
```bash
# On Oracle/GCP, ensure PM2 startup is configured
pm2 startup
# Then run the command it outputs
pm2 save
```

**Cannot Connect to VM**
- Verify public IP address
- Check SSH key permissions (should be 400)
- Ensure security group allows SSH (port 22)

### Performance Monitoring

**On Oracle/GCP:**
```bash
# Check memory usage
free -h

# Check CPU usage
top

# Check disk space
df -h

# Check bot logs
pm2 logs music-leek --lines 100
```

**On Fly.io:**
```bash
# Monitor resources
flyctl vm status

# Check logs
flyctl logs -f
```

---

## Next Steps

1. **Choose your platform** (Oracle Cloud recommended for free 24/7)
2. **Set up Docker** (see main README for Dockerfile creation)
3. **Deploy your bot** (follow platform-specific guide above)
4. **Monitor for 24-48 hours** to ensure stability
5. **Set up monitoring alerts** (optional - see monitoring guide)

---

## Additional Resources

- [Discord.js Guide](https://discordjs.guide/)
- [Oracle Cloud Docs](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- [Fly.io Docs](https://fly.io/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

## Cost Estimates

| Platform | Month 1 | Month 2-12 | Annual Cost |
|----------|---------|------------|-------------|
| Oracle Cloud | $0 | $0 | **$0** |
| Fly.io | $0 (trial) | ~$0-5 | ~$0-60 |
| Railway | ~$15 (need to add $10) | ~$15 | ~$180 |
| GCP | $0 | $0 | **$0** |

**Note**: Oracle Cloud and GCP e2-micro (US regions) are permanently free, not trials.
