# Oracle Cloud Deployment Guide for Music Leek Discord Bot

This guide covers deploying your Discord bot for **truly free 24/7 operation** on Oracle Cloud's Always Free tier.

## Table of Contents
1. [Why Oracle Cloud?](#why-oracle-cloud)
2. [Security Considerations](#security-considerations)
3. [Billing Protection](#billing-protection)
4. [Account Setup](#account-setup)
5. [VM Instance Creation](#vm-instance-creation)
6. [Security Configuration](#security-configuration)
7. [Bot Deployment](#bot-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Why Oracle Cloud?

### Always Free Benefits
- **Truly free forever** - not a trial, no expiration
- **Generous resources**: Up to 4 ARM CPU cores + 24GB RAM
- **Built-in safeguards**: Cannot accidentally incur charges on Always Free resources
- **24/7 uptime**: No sleep or shutdown
- **Full VPS control**: SSH access, root privileges, install anything

### Hosting Requirements Met
- **Runtime**: Node.js v20 ✓
- **Memory**: 256MB minimum (we get up to 24GB!) ✓
- **Storage**: 100GB+ available ✓
- **Network**: Persistent connection to Discord API ✓
- **Cost**: $0 forever ✓

---

## Security Considerations

### Threat Model for Discord Bots

**What attackers might target:**
1. **Bot Token Theft** → Hijack your bot, spam servers, get banned
2. **Server Compromise** → Use your VM for cryptomining, DDoS attacks
3. **Data Breach** → Steal league data, user IDs, voting history
4. **Resource Abuse** → Max out CPU/memory to disable your bot
5. **Supply Chain** → Compromise npm packages in your dependencies

**Likelihood for a small Discord bot:** Low, but basic security is essential.

### Security Risks & Mitigations

#### 1. Bot Token Exposure (HIGH RISK)

**Risk:** If your Discord bot token leaks, attackers can control your bot completely.

**Mitigation:**
- ✅ Never commit `.env` file to git (already in `.gitignore`)
- ✅ Use environment variables, not hardcoded tokens
- ✅ Restrict SSH access to your IP only (see Security Configuration)
- ✅ Use SSH keys instead of passwords
- ❌ Never log your token or print it in error messages
- ❌ Never share screenshots containing your token
- 🔄 Rotate token immediately if compromised (Discord Developer Portal)

**Detection:** If your bot starts sending messages you didn't program, regenerate token immediately.

#### 2. SSH Brute Force Attacks (MEDIUM RISK)

**Risk:** Attackers scan for open SSH ports and try common passwords.

**Mitigation (we'll configure this):**
- ✅ Use SSH keys only (disable password authentication)
- ✅ Change default SSH port from 22 to non-standard port (e.g., 2222)
- ✅ Install `fail2ban` to auto-block repeated failed login attempts
- ✅ Restrict SSH to your IP address via Oracle Cloud security lists
- ✅ Use strong SSH key (4096-bit RSA or Ed25519)

#### 3. Unnecessary Open Ports (MEDIUM RISK)

**Risk:** Exposed services create attack surface.

**Mitigation:**
- ✅ Discord bots only need **outbound** connections (no open ports needed)
- ✅ Close all inbound ports except SSH
- ✅ Use Oracle Cloud Network Security Groups to whitelist only your IP for SSH
- ❌ Don't install unnecessary services (web servers, databases, etc.)

**Default Setup:** Oracle Cloud blocks all inbound traffic by default (good!).

#### 4. Outdated Software Vulnerabilities (MEDIUM RISK)

**Risk:** Unpatched OS or Node.js vulnerabilities.

**Mitigation:**
- 🔄 Run `sudo apt update && sudo apt upgrade -y` monthly
- 🔄 Update Node.js when security patches released
- 🔄 Run `npm audit` and update dependencies regularly
- ✅ Enable automatic security updates (Ubuntu unattended-upgrades)

#### 5. Malicious npm Packages (LOW-MEDIUM RISK)

**Risk:** Compromised npm packages could steal your token or data.

**Mitigation:**
- ✅ Only use well-known packages (discord.js, dotenv)
- ✅ Check package downloads/stars before installing new dependencies
- 🔄 Run `npm audit` to detect known vulnerabilities
- ✅ Use `package-lock.json` to lock dependency versions

**Current dependencies:** discord.js (10M+ downloads/week) and dotenv (50M+ downloads/week) are safe.

#### 6. Data Storage Security (LOW RISK)

**Risk:** League data in `data/leagues.json` could be read if server compromised.

**Mitigation:**
- ✅ Set proper file permissions: `chmod 600 data/leagues.json`
- ✅ Regular backups (in case of corruption or ransomware)
- ℹ️ Data is not sensitive (just song submissions and scores)
- 🔜 For production: Consider encrypting sensitive data or using a database

#### 7. DDoS or Resource Exhaustion (LOW RISK)

**Risk:** Malicious users spam your bot to exhaust resources.

**Mitigation:**
- ✅ Discord.js has built-in rate limiting
- ✅ Oracle Cloud ARM VM has plenty of resources (12GB RAM for a simple bot)
- 🔜 Implement command cooldowns if needed (e.g., 1 submission per minute)
- 🔜 Add user permission checks for admin commands

### Security Best Practices Summary

| Security Measure | Priority | Effort | When to Apply |
|-----------------|----------|--------|---------------|
| SSH key authentication | HIGH | Low | Account setup |
| Restrict SSH to your IP | HIGH | Low | VM creation |
| Never commit .env | HIGH | None | Always (already done) |
| Install fail2ban | MEDIUM | Low | Post-deployment |
| Change SSH port | MEDIUM | Low | Post-deployment |
| Regular OS updates | MEDIUM | Low | Monthly |
| npm audit | MEDIUM | Low | Weekly |
| Enable auto security updates | LOW | Low | Post-deployment |
| File permissions | LOW | Low | Post-deployment |
| Backup league data | LOW | Low | Weekly |

---

## Billing Protection

### Oracle Cloud's Built-in Safeguards

**Good news:** Oracle Cloud Always Free has **hard limits** that prevent accidental charges.

**How it works:**
1. Always Free resources have guardrails that prevent using paid resources
2. Your credit card **will not be charged** unless you manually upgrade your account
3. If you try to exceed Always Free limits, the system blocks you (won't let you proceed)

**Quote from Oracle:**
> "OCI Always Free has guardrails in place that prevent you from using resources that cost money, so you can't make a mistake."

### Always Free Resource Limits (What You Get for $0)

| Resource | Free Limit | What We'll Use | Cost Risk |
|----------|------------|----------------|-----------|
| **Compute (ARM)** | 4 OCPUs + 24GB RAM total | 2 OCPUs + 12GB RAM | ✅ ZERO |
| **Compute (AMD)** | 2 VMs (1/8 OCPU, 1GB each) | Not using | ✅ ZERO |
| **Block Storage** | 200GB total | ~20GB | ✅ ZERO |
| **Bandwidth** | 10TB/month outbound | <1GB/month | ✅ ZERO |
| **Public IPs** | 2 IPv4 addresses | 1 address | ✅ ZERO |

**For our Discord bot:** We'll use 2 ARM OCPUs + 12GB RAM, well within free limits.

### Setting Up Billing Alarms (Defense in Depth)

Even though Always Free has safeguards, let's set up billing alerts as extra protection:

#### Step 1: Create a Budget

1. **Login to Oracle Cloud Console**
2. **Navigate to Billing:**
   - Click hamburger menu (☰) → Billing & Cost Management → Budgets
3. **Create Budget:**
   - Click "Create Budget"
   - **Name:** `music-leek-zero-budget`
   - **Target:** Select your compartment (usually "root")
   - **Budget Amount:** `$1.00` (we expect $0, so $1 triggers alert)
   - **Alert Rule:**
     - **Type:** Actual Spend
     - **Threshold:** 100% of budget ($1.00)
     - **Email Recipients:** Your email address

4. **Create Another Alert at 50%:**
   - Add second alert rule at 50% ($0.50) for early warning

#### Step 2: Monitor Usage Dashboard

1. **Navigate to:** Hamburger menu (☰) → Billing & Cost Management → Cost Analysis
2. **Bookmark this page** and check weekly
3. **What to watch:**
   - Current month cost should be **$0.00**
   - If you see any charges, investigate immediately

#### Step 3: Set Up Email Alerts for Resource Changes

Oracle automatically sends emails when:
- You approach Always Free limits
- Resources are created or modified
- Billing changes occur

**Make sure these emails aren't filtered as spam!**

### How to Verify You're on Always Free

Before creating resources, verify Always Free status:

1. **Check during VM creation:**
   - When selecting shape, look for "Always Free-eligible" label
   - VM.Standard.A1.Flex (ARM) with ≤4 OCPUs and ≤24GB RAM is Always Free
   - If you see "Always Free-eligible" badge, you're safe

2. **Check your account type:**
   - Go to hamburger menu (☰) → Billing & Cost Management → Payment Method
   - Should show "Pay As You Go" but with Always Free resources active
   - "Promotional Credits" section may show $300 trial credit if new account

3. **Monthly cost check:**
   - Check Cost Analysis dashboard
   - Should consistently show $0.00 for Always Free resources

### What Could Cause Charges? (And How to Avoid)

| Action | Risk | Prevention |
|--------|------|------------|
| **Upgrade account manually** | You'd have to confirm multiple times | Don't click "Upgrade" buttons |
| **Create non-ARM VMs beyond limit** | System blocks you | Stick to 1 ARM VM (VM.Standard.A1.Flex) |
| **Exceed 200GB storage** | System warns you | We only use ~20GB |
| **Use paid services** (load balancers, etc.) | System requires confirmation | Don't add extra services |
| **Exceed 10TB bandwidth** | Highly unlikely | Discord bot uses <1GB/month |

**Bottom line:** You'd have to intentionally ignore multiple warnings to incur charges.

### Emergency: How to Shut Everything Down

If you see unexpected charges:

1. **Terminate VM Instance:**
   - Compute → Instances → Click your instance → "Terminate"
   - This stops all charges immediately

2. **Contact Oracle Support:**
   - Hamburger menu (☰) → Support → Create Support Request
   - Explain you only want Always Free resources

3. **Check for unexpected resources:**
   - Review all services in the hamburger menu
   - Delete anything you don't recognize

### Monthly Monitoring Checklist

**Every 1st of the month (5 minutes):**

- [ ] Check Cost Analysis dashboard: Should show $0.00
- [ ] Check VM is still running: `pm2 status` via SSH
- [ ] Check for billing emails from Oracle
- [ ] Run `sudo apt update && sudo apt upgrade -y` for security patches
- [ ] Backup `data/leagues.json` to your local machine

---

## Account Setup

### Step 1: Create Oracle Cloud Account

1. Go to [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
2. Click "Start for free"
3. Fill out registration form:
   - **Email**: Use a valid email (you'll receive important alerts here)
   - **Country/Region**: Select your location
   - **Account Type**: Personal or Company
4. **Credit card required** but never charged for Always Free resources
   - Oracle uses this for identity verification only
   - You can set up billing alerts (see Billing Protection section)
5. Verify email and complete phone verification
6. Wait for account activation (usually instant, sometimes up to 24 hours)

**After activation:**
- Login to [cloud.oracle.com](https://cloud.oracle.com)
- Set up billing budget (see [Billing Protection](#billing-protection))
- Note your home region (cannot be changed later)

---

## VM Instance Creation

### Step 1: Navigate to Compute Instances

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

## Security Configuration

After deploying your bot, implement these security hardening steps:

### Step 1: Restrict SSH Access to Your IP

1. **Get your public IP:**
   - Visit [whatismyip.com](https://www.whatismyip.com/)
   - Note your IPv4 address

2. **Update Oracle Cloud Security List:**
   - In Oracle Cloud Console: Networking → Virtual Cloud Networks
   - Click your VCN → Security Lists → Default Security List
   - Find the SSH rule (port 22, source 0.0.0.0/0)
   - Click "Edit"
   - Change **Source CIDR** from `0.0.0.0/0` to `YOUR_IP/32`
   - Example: `203.0.113.45/32` (replace with your actual IP)
   - Click "Save"

**Result:** Only your IP can attempt SSH connections.

### Step 2: Install fail2ban (Auto-Block Attackers)

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Start and enable fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-status
```

**What this does:** Automatically bans IPs after 5 failed login attempts for 10 minutes.

### Step 3: Change SSH Port (Optional but Recommended)

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Find line: #Port 22
# Change to: Port 2222 (or any port between 1024-65535)

# Save and exit (Ctrl+X, Y, Enter)

# Restart SSH
sudo systemctl restart sshd
```

**Update Oracle Security List:**
- Add ingress rule for port 2222 (YOUR_IP/32)
- Remove port 22 rule after testing

**Connect with new port:**
```bash
ssh -i music-leek-key.key -p 2222 ubuntu@YOUR_PUBLIC_IP
```

### Step 4: Enable Automatic Security Updates

```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades

# Enable automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
# Select "Yes" when prompted

# Verify configuration
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
# Ensure security updates are enabled
```

**Result:** Ubuntu automatically installs security patches.

### Step 5: Set File Permissions

```bash
# Secure .env file
chmod 600 ~/music-leek/.env

# Secure data directory
chmod 700 ~/music-leek/data
chmod 600 ~/music-leek/data/leagues.json  # If exists

# Secure SSH key (on your local machine)
# Windows: already done via icacls
# Mac/Linux: chmod 400 music-leek-key.key
```

### Step 6: Disable Password Authentication (Enforce Keys Only)

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Find and set these values:
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM no

# Save and exit

# Restart SSH
sudo systemctl restart sshd
```

**IMPORTANT:** Test SSH key login works BEFORE logging out!

### Security Checklist

After configuration, verify:

- [ ] SSH restricted to your IP only
- [ ] fail2ban installed and running
- [ ] SSH port changed (optional)
- [ ] Automatic security updates enabled
- [ ] `.env` file permissions set to 600
- [ ] Password authentication disabled
- [ ] Can still login via SSH key
- [ ] Bot is still running (`pm2 status`)

---

## Bot Deployment

See [VM Instance Creation](#vm-instance-creation) section above for complete deployment steps.

**Quick reference:**
1. Connect to VM via SSH
2. Install Node.js, PM2, Git
3. Clone repository
4. Create `.env` file with tokens
5. `npm install && npm run build`
6. `npm run deploy` (register commands)
7. `pm2 start npm --name "music-leek" -- start`
8. `pm2 save && pm2 startup`

---

## Monitoring & Maintenance

### Daily Monitoring (automated via PM2)

PM2 automatically:
- Restarts bot if it crashes
- Restarts bot on server reboot
- Logs all output

**Check bot health:**
```bash
pm2 status
pm2 logs music-leek --lines 50
```

### Weekly Tasks (5 minutes)

```bash
# Check for security updates
sudo apt update
sudo apt list --upgradable

# Check npm vulnerabilities
cd ~/music-leek
npm audit

# Check disk space
df -h

# Backup league data
scp -i music-leek-key.key ubuntu@YOUR_IP:~/music-leek/data/leagues.json ./backup-$(date +%Y%m%d).json
```

### Monthly Tasks (10 minutes)

```bash
# Apply security updates
sudo apt update && sudo apt upgrade -y

# Check Oracle Cloud billing (should be $0.00)
# Visit: cloud.oracle.com → Billing & Cost Management → Cost Analysis

# Review PM2 logs for errors
pm2 logs music-leek --lines 1000 | grep -i error

# Restart bot (apply any updates)
cd ~/music-leek
git pull
npm install
npm run build
pm2 restart music-leek
```

### Updating Your Bot

When you make code changes:

```bash
# On your local machine: commit and push to GitHub
git add .
git commit -m "Update feature"
git push

# On the Oracle Cloud VM:
cd ~/music-leek
git pull
npm install  # If package.json changed
npm run build
pm2 restart music-leek

# Verify it's running
pm2 logs music-leek --lines 20
```

### Setting Up Monitoring Alerts (Optional)

**Option 1: Simple Email Alerts via PM2**

```bash
# Install PM2 Plus (free tier)
pm2 install pm2-server-monit

# Link to PM2 Plus dashboard
pm2 link YOUR_SECRET_KEY YOUR_PUBLIC_KEY
```

Visit [app.pm2.io](https://app.pm2.io) to get keys and set up email alerts.

**Option 2: Discord Webhook Notifications**

Add a health check endpoint to your bot and use a cron job to ping it, sending Discord webhooks on failure (implement as needed).

---

## Troubleshooting

### Bot Not Responding

```bash
# Check if bot is running
pm2 status

# Check logs for errors
pm2 logs music-leek

# View last 100 lines
pm2 logs music-leek --lines 100

# Restart bot
pm2 restart music-leek
```

### Common Errors

#### "Invalid Token" Error

**Cause:** Discord bot token is incorrect or missing.

**Solution:**
```bash
# Check .env file
cat ~/music-leek/.env

# Verify token is correct (no spaces, complete)
# Regenerate token if needed:
# 1. Go to Discord Developer Portal
# 2. Your Application → Bot → Reset Token
# 3. Update .env file
nano ~/music-leek/.env

# Restart bot
pm2 restart music-leek
```

#### "Out of Memory" Error

**Cause:** Bot is using too much RAM (unlikely with 12GB).

**Solution:**
```bash
# Check memory usage
free -h
pm2 monit

# If memory is low, increase VM RAM:
# Oracle Cloud Console → Compute → Instances → Edit → Change Shape
# Can allocate up to 24GB for free

# Restart bot
pm2 restart music-leek
```

#### Bot Stops After Server Reboot

**Cause:** PM2 not configured to start on boot.

**Solution:**
```bash
# Configure PM2 startup
pm2 startup

# Copy and run the command it outputs (starts with sudo)
# Example: sudo env PATH=$PATH:/usr/bin...

# Save PM2 configuration
pm2 save

# Test by rebooting
sudo reboot

# After reboot, check bot status
pm2 status  # Should show bot running
```

#### Cannot Connect to VM via SSH

**Cause:** IP changed, SSH key permissions, or security list misconfigured.

**Solution:**
```bash
# 1. Verify public IP hasn't changed
# Oracle Cloud Console → Compute → Instances → Your instance
# Note the public IP

# 2. Check SSH key permissions (on your local machine)
# Windows: already set via icacls
# Mac/Linux:
chmod 400 music-leek-key.key

# 3. Verify security list allows your IP
# Oracle Cloud Console → Networking → VCN → Security Lists
# Ensure ingress rule exists for port 22 (or custom port) from your IP

# 4. Try connecting with verbose output
ssh -v -i music-leek-key.key ubuntu@YOUR_PUBLIC_IP

# 5. If using custom SSH port:
ssh -i music-leek-key.key -p 2222 ubuntu@YOUR_PUBLIC_IP
```

#### "Module not found" or "Cannot find module" Error

**Cause:** Dependencies not installed or build failed.

**Solution:**
```bash
cd ~/music-leek

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild TypeScript
npm run build

# Restart bot
pm2 restart music-leek
```

#### Commands Not Working in Discord

**Cause:** Commands not registered with Discord.

**Solution:**
```bash
cd ~/music-leek

# Re-deploy commands
npm run deploy

# Wait 1-2 minutes for Discord to update
# Then try commands again
```

### Performance Monitoring

**Check resource usage:**
```bash
# Memory usage
free -h

# CPU usage (press 'q' to exit)
top

# Disk space
df -h

# Bot-specific stats
pm2 monit  # Interactive monitor (press Ctrl+C to exit)
```

**Review logs:**
```bash
# Real-time logs
pm2 logs music-leek -f

# Last 200 lines
pm2 logs music-leek --lines 200

# Search for errors
pm2 logs music-leek --lines 1000 | grep -i error

# Search for specific text
pm2 logs music-leek --lines 1000 | grep "create-league"
```

### Network Issues

**Bot can't connect to Discord:**
```bash
# Test internet connectivity
ping -c 4 discord.com

# Test DNS resolution
nslookup discord.com

# Check firewall rules (shouldn't block outbound)
sudo iptables -L OUTPUT -v -n

# Restart bot
pm2 restart music-leek
```

### Emergency: Complete Reset

If everything is broken:

```bash
# 1. Stop bot
pm2 stop music-leek
pm2 delete music-leek

# 2. Re-clone repository
cd ~
rm -rf music-leek
git clone https://github.com/YOUR_USERNAME/music-leek.git
cd music-leek

# 3. Reinstall everything
npm install
npm run build

# 4. Recreate .env
nano .env
# Paste tokens

# 5. Redeploy commands
npm run deploy

# 6. Start bot
pm2 start npm --name "music-leek" -- start
pm2 save

# 7. Check status
pm2 status
pm2 logs music-leek --lines 50
```

---

## Summary

### What You've Deployed

- **Free 24/7 Discord bot** hosting on Oracle Cloud Always Free tier
- **Automatic restarts** via PM2 if bot crashes or server reboots
- **Security hardening**: SSH restricted to your IP, fail2ban, automatic updates
- **Billing protection**: $1 budget alert, $0 expected monthly cost
- **Scalable**: Up to 24GB RAM available if needed

### Quick Reference Commands

```bash
# SSH connect
ssh -i music-leek-key.key ubuntu@YOUR_PUBLIC_IP

# Bot status
pm2 status

# View logs
pm2 logs music-leek --lines 50

# Restart bot
pm2 restart music-leek

# Update bot
cd ~/music-leek && git pull && npm install && npm run build && pm2 restart music-leek

# Monthly maintenance
sudo apt update && sudo apt upgrade -y

# Check billing (should be $0.00)
# Visit: cloud.oracle.com → Billing & Cost Management → Cost Analysis
```

### Support Resources

- **Oracle Cloud Docs**: [docs.oracle.com/iaas](https://docs.oracle.com/en-us/iaas/Content/home.htm)
- **Discord.js Guide**: [discordjs.guide](https://discordjs.guide/)
- **PM2 Docs**: [pm2.keymetrics.io/docs](https://pm2.keymetrics.io/docs/usage/quick-start/)
- **Oracle Support**: cloud.oracle.com → Support → Create Support Request

---

**Sources:**
- [Oracle Cloud Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Oracle Cloud Free Tier FAQ](https://www.oracle.com/cloud/free/faq/)
- [Oracle Cloud Security Best Practices](https://docs.oracle.com/en-us/iaas/Content/Security/Reference/configuration_security.htm)
- [Managing Budget Alert Rules](https://docs.oracle.com/en-us/iaas/Content/Billing/Tasks/managingalertrules.htm)
- [Set an Alert for Your Account Balance](https://docs.oracle.com/en/cloud/get-started/subscriptions-cloud/mmocs/set-alert-your-account-balance.html)
- [Oracle Cloud Security Tips 2025](https://www.sentinelone.com/cybersecurity-101/cloud-security/oracle-cloud-security/)
- [Always Free Oracle Cloud Services Guide 2025](https://topuser.pro/free-oracle-cloud-services-guide-oracle-cloud-free-tier-2025/)
