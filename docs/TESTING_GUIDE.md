# Testing Guide

> **📖 Setup first?** See [../README.md](../README.md#getting-started) for setup instructions.

## Development Workflow

### Testing Without Affecting Production

To test changes safely before deployment:

1. **Create a separate test bot** in the [Discord Developer Portal](https://discord.developer.com/applications)
   - Create new application (e.g., "Music Leek Dev")
   - Copy the bot token and client ID

2. **Configure local environment**
   - Create `.env.local` in the project root:

     ```text
     DISCORD_TOKEN=your_test_bot_token
     DISCORD_CLIENT_ID=your_test_bot_client_id
     ```

3. **Invite test bot to your Discord server** (both bots can coexist)

4. **Test locally** - `dotenv` automatically uses `.env.local` over `.env`:

   ```bash
   npm run deploy  # Deploy commands for test bot
   npm run dev     # Run test bot locally
   ```

This keeps production running while you test changes with a separate bot instance.

### Backup and Restore Data

To reset data state for repeated testing (e.g., testing `/start-voting` multiple times):

```bash
# Save current state before testing
npm run backup

# Run your tests (e.g., /start-voting in Discord)

# Restore to pre-test state
npm run restore
```

This backs up and restores `leagues.json`, `tokens.json`, and `dm-contexts.json` from `data/backup/`.

## Prerequisites

- Bot is running and online in Discord
- Commands deployed with `npm run deploy`
- Bot has proper permissions in your test server

## Testing Scenarios

### Basic Workflow

1. `/create-league` - Create a league (returns league ID)
2. `/join-league` - Join with the league ID
3. `/start-round` - Opens modal to configure round (prompt, deadlines)
4. `/submit-song` - Opens modal to submit (URL, title, artist)
5. `/start-voting` - Show all submissions
6. `/vote` - Opens modal with submissions list (format: `1:5,2:4`)
7. `/end-round` - Show ranked results
8. `/leaderboard` - Overall standings

## Crib Sheet

To export your production league in railway to your local working directory for experimentation:

```bash
railway ssh "cat data/leagues.json" > data/production/leagues.production.json
```
