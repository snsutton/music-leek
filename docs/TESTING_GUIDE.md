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
     ```
     DISCORD_TOKEN=your_test_bot_token
     DISCORD_CLIENT_ID=your_test_bot_client_id
     ```

3. **Invite test bot to your Discord server** (both bots can coexist)

4. **Test locally** - `dotenv` automatically uses `.env.local` over `.env`:
   ```bash
   npm run deploy  # Deploy commands for test bot
   npm run dev     # Run test bot locally
   ```

5. **When satisfied**, delete or rename `.env.local` and deploy to production
   - Bot will fall back to `.env` (production credentials)

This keeps production running while you test changes with a separate bot instance.

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

### Key Features to Test

- **Pre-filled league IDs**: Commands can take league ID as parameter or ask via modal
- **Vote format**: Must be `songNumber:points,songNumber:points` (no spaces)
- **Cannot vote for own song**: Validation prevents self-voting
- **Multi-user testing**: Use alt account or invite friend to test full workflow
- **Data persistence**: Stop/restart bot and verify data survives in `data/leagues.json`

## Testing Checklist

- [ ] Create and join league
- [ ] Start round with modal
- [ ] Submit song with modal
- [ ] Pre-filled league ID works
- [ ] Manual league ID entry works
- [ ] Start voting phase
- [ ] Vote with modal
- [ ] Cannot vote for own song
- [ ] End round and see results
- [ ] View leaderboard
- [ ] Check league status
- [ ] Admin commands (add/remove/list admins)
- [ ] Admin-only commands restricted properly
