#!/bin/bash
# Music Leek - Bot Deployment Script
# Run this in the music-leek directory after cloning
# Usage: ./scripts/deploy-bot.sh

set -e  # Exit on error

echo "================================================"
echo "Music Leek - Bot Deployment Script"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the music-leek directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    echo ""
    echo "Please enter your Discord bot credentials:"
    read -p "Discord Bot Token: " DISCORD_TOKEN
    read -p "Discord Client ID: " DISCORD_CLIENT_ID

    cat > .env << EOF
DISCORD_TOKEN=$DISCORD_TOKEN
DISCORD_CLIENT_ID=$DISCORD_CLIENT_ID
EOF

    chmod 600 .env
    echo "✅ .env file created and secured"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "📡 Deploying commands to Discord..."
npm run deploy

echo ""
echo "🚀 Starting bot with PM2..."
pm2 delete music-leek 2>/dev/null || true  # Delete if exists (ignore error)
pm2 start npm --name "music-leek" -- start

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "🔄 Configuring PM2 to start on boot..."
pm2 startup > /tmp/pm2-startup-cmd.txt 2>&1 || true
STARTUP_CMD=$(grep "sudo" /tmp/pm2-startup-cmd.txt | head -1)

if [ -n "$STARTUP_CMD" ]; then
    echo "Running PM2 startup command..."
    eval "$STARTUP_CMD"
else
    echo "⚠️  Could not auto-configure PM2 startup"
    echo "Please run manually:"
    echo "  pm2 startup"
    echo "  Then copy and run the command it outputs"
fi

echo ""
echo "🔒 Setting file permissions..."
chmod 600 .env
chmod 700 data 2>/dev/null || mkdir -p data && chmod 700 data
[ -f "data/leagues.json" ] && chmod 600 data/leagues.json

echo ""
echo "✅ Deployment complete!"
echo ""
echo "================================================"
echo "Bot Status:"
echo "================================================"
pm2 status

echo ""
echo "================================================"
echo "Useful Commands:"
echo "================================================"
echo "View logs:        pm2 logs music-leek"
echo "Restart bot:      pm2 restart music-leek"
echo "Stop bot:         pm2 stop music-leek"
echo "Bot status:       pm2 status"
echo ""
echo "To view real-time logs, run:"
echo "  pm2 logs music-leek --lines 50"
echo "================================================"