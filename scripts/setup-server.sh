#!/bin/bash
# Music Leek - Oracle Cloud Server Setup Script
# Run this after creating your VM instance
# Usage: bash <(curl -s https://raw.githubusercontent.com/YOUR_USERNAME/music-leek/main/scripts/setup-server.sh)

set -e  # Exit on error

echo "================================================"
echo "Music Leek - Server Setup Script"
echo "================================================"
echo ""

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    echo "⚠️  Warning: This script is designed to run as the 'ubuntu' user"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Step 1/6: Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo ""
echo "📦 Step 2/6: Installing Node.js 20 (LTS)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo ""
echo "📦 Step 3/6: Installing PM2 process manager..."
sudo npm install -g pm2

echo ""
echo "📦 Step 4/6: Installing Git..."
sudo apt install -y git

echo ""
echo "🔒 Step 5/6: Installing fail2ban for SSH protection..."
sudo apt install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

echo ""
echo "🔒 Step 6/6: Installing unattended-upgrades for automatic security updates..."
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

echo ""
echo "✅ Base system setup complete!"
echo ""
echo "================================================"
echo "Next steps:"
echo "================================================"
echo "1. Clone your repository:"
echo "   git clone https://github.com/YOUR_USERNAME/music-leek.git"
echo ""
echo "2. Navigate to the directory:"
echo "   cd music-leek"
echo ""
echo "3. Run the bot setup script:"
echo "   ./scripts/deploy-bot.sh"
echo ""
echo "================================================"
