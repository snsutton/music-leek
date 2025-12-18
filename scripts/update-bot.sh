#!/bin/bash
# Music Leek - Bot Update Script
# Run this to update the bot after making code changes
# Usage: ./scripts/update-bot.sh

set -e  # Exit on error

echo "================================================"
echo "Music Leek - Bot Update Script"
echo "================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please run this script from the music-leek directory"
    exit 1
fi

echo "📥 Pulling latest changes from git..."
git pull

echo ""
echo "📦 Installing/updating dependencies..."
npm install

echo ""
echo "🔨 Rebuilding TypeScript..."
npm run build

echo ""
echo "📡 Redeploying commands to Discord (if needed)..."
read -p "Redeploy Discord slash commands? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run deploy
    echo "✅ Commands redeployed"
else
    echo "⏭️  Skipping command deployment"
fi

echo ""
echo "🔄 Restarting bot..."
pm2 restart music-leek

echo ""
echo "⏳ Waiting for bot to start..."
sleep 3

echo ""
echo "✅ Update complete!"
echo ""
echo "================================================"
echo "Bot Status:"
echo "================================================"
pm2 status

echo ""
echo "Recent logs:"
pm2 logs music-leek --lines 20 --nostream

echo ""
echo "To view real-time logs, run:"
echo "  pm2 logs music-leek -f"
echo "================================================"