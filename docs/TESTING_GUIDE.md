# Testing Guide - Music Leek Bot

Comprehensive testing scenarios for the Music Leek Discord bot.

> **📖 Setup first?** See [../README.md](../README.md#getting-started) for setup instructions.

This guide covers:

- All testing scenarios and test cases
- Troubleshooting common issues
- Advanced testing techniques
- Performance and edge case testing

## Prerequisites

Before testing, ensure you have:

- ✅ Completed setup instructions (see [README.md](../README.md#getting-started))
- ✅ Bot is running (`npm start` shows "Ready! Logged in as...")
- ✅ Commands are deployed (`npm run deploy` completed successfully)
- ✅ Bot is invited to your test Discord server and shows as online

## Testing Scenarios

### Test 1: Create a League (Server Only)

1. In your Discord test server, type `/create-league`
2. Enter a name: "Test League"
3. Click "Send"
4. **Expected Result**: Bot responds with league ID and instructions

### Test 2: Join the League

1. Copy the league ID from the previous step
2. Type `/join-league` and paste the league ID
3. Click "Send"
4. **Expected Result**: Confirmation message with participant count

### Test 3: Check Your Leagues in Server

1. Type `/my-leagues`
2. Click "Send"
3. **Expected Result**: List of leagues you're in with IDs and status

### Test 4: Check Your Leagues in DMs

1. Open a DM with the bot (click on the bot's name and "Message")
2. Type `/my-leagues`
3. Click "Send"
4. **Expected Result**: Same list, proving DM support works

### Test 5: Start a Round (Modal Test)

1. In server or DM, type `/start-round`
2. Optionally provide the league ID as a parameter, or leave it blank
3. **Expected Result**: A modal form pops up
4. Fill out the form:
   - League ID: (paste your league ID if not pre-filled)
   - Round Prompt: "Songs that make you happy"
   - Submission Hours: 72 (default)
   - Voting Hours: 48 (default)
5. Click "Submit"
6. **Expected Result**: Announcement of new round with deadline

### Test 6: Submit a Song (Modal Test in DM)

1. Open DM with the bot
2. Type `/submit-song` (optionally with `league-id:your_league_id`)
3. **Expected Result**: Modal form opens
4. Fill out the form:
   - League ID: (paste if not pre-filled)
   - Song URL: `https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp`
   - Song Title: "Mr. Blue Sky"
   - Artist Name: "Electric Light Orchestra"
5. Click "Submit"
6. **Expected Result**: Confirmation message with submission count

### Test 7: Test Multiple Submissions

1. Invite another user to your test server (or use an alt account)
2. Have them join the league with `/join-league`
3. Have them submit a song
4. **Expected Result**: Both submissions recorded

### Test 8: Start Voting Phase

1. Type `/start-voting` with your league ID
2. **Expected Result**: Embed showing all submissions with song numbers
3. Note the song numbers for voting

### Test 9: Vote (Modal Test)

1. In DM or server, type `/vote` (optionally with league ID)
2. **Expected Result**: Modal opens with submissions list
3. Fill out:
   - League ID: (paste if needed)
   - Your Votes: `1:5,2:4` (don't vote for your own song!)
4. Click "Submit"
5. **Expected Result**: Confirmation with vote count

### Test 10: End Round and View Results

1. Type `/end-round` with your league ID
2. **Expected Result**: Embed with ranked results showing:
   - Song rankings (🥇🥈🥉)
   - Points per song
   - Song URLs

### Test 11: View Leaderboard

1. Type `/leaderboard` with your league ID
2. **Expected Result**: Overall leaderboard across all completed rounds

### Test 12: Check League Status

1. Type `/league-status` with your league ID
2. **Expected Result**: Current round info, status, and time remaining

## Testing Checklist

Use this checklist to ensure all features work:

- [ ] Create league in server
- [ ] Join league
- [ ] View leagues in server (`/my-leagues`)
- [ ] View leagues in DM (`/my-leagues`)
- [ ] Start round with modal (server)
- [ ] Start round with modal (DM)
- [ ] Submit song with modal (server)
- [ ] Submit song with modal (DM)
- [ ] Pre-filled league ID works
- [ ] Manual league ID entry works
- [ ] Start voting phase
- [ ] Vote with modal showing submissions
- [ ] Cannot vote for own song
- [ ] End round and see results
- [ ] View leaderboard
- [ ] Check league status

## Troubleshooting

### Bot doesn't respond to commands

**Check:**

- Is the bot online? (Green status in Discord)
- Did you run `npm run deploy`?
- Check console for errors
- Ensure bot has proper permissions in the channel

### Modal doesn't appear

**Check:**

- Are you using a recent version of Discord (desktop or mobile)?
- Modals require discord.js v14+ (check `package.json`)
- Check browser console for errors (if using Discord in browser)

### "League not found" error

**Check:**

- Did you copy the full league ID?
- League IDs are case-sensitive
- Use `/my-leagues` to verify the ID

### Bot can't read DMs

**Check:**

- Did you enable DirectMessages intent in [src/index.ts](src/index.ts:25)?
- Did you add Partials.Channel in [src/index.ts](src/index.ts:28)?
- Restart the bot after changes

### Commands not updating

**Fix:**

```bash
npm run build
npm run deploy
# Wait a few seconds, then test
```

Discord can take up to 1 hour to update global commands, but usually it's instant.

## Common Testing Errors

### "Interaction failed"

- Usually means the bot crashed while processing
- Check your terminal/console for stack traces
- Verify all modal handlers are in `src/modals/`

### Modal submissions not working

- Ensure modal `customId` matches handler filename
- Example: `submit-song-modal` (modal) → `submit-song-modal.ts` (handler)
- Check that handlers are exported with `customId` and `execute`

### Vote format errors

- Use exact format: `1:5,2:4,3:3`
- No spaces: `1: 5` ❌, `1:5` ✅
- Comma-separated: `1:5,2:4` ✅

## Advanced Testing

### Test with Multiple Leagues

1. Create 2-3 leagues
2. Join all of them
3. Test `/my-leagues` shows all
4. Test filtering by server vs DM
5. Test switching between leagues using different IDs

### Test Error Handling

1. Try voting for your own song (should fail)
2. Try submitting twice (should fail)
3. Try invalid league ID (should show error)
4. Try invalid vote format (should show error message)

### Test Persistence

1. Create a league and submit songs
2. Stop the bot (`Ctrl+C`)
3. Restart the bot
4. Check if data persisted (in `data/leagues.json`)
5. Use `/league-status` to verify data is intact

## Performance Testing

For production readiness:

1. Create a league with 10+ participants (use alt accounts or friends)
2. Have everyone submit songs
3. Start voting and have everyone vote
4. Monitor bot response times
5. Check for any lag or errors

## Data Location

All league data is stored in:

```
c:\Users\Owner\Git Repos\music-leek-claude\data\leagues.json
```

You can inspect this file to verify data persistence.

## Clean Up After Testing

To reset all data:

```bash
# Delete test data
del "c:\Users\Owner\Git Repos\music-leek-claude\data\leagues.json"

# Restart the bot
npm start
```

The bot will create a fresh `leagues.json` file.

## Next Steps

Once testing is complete:

1. Fix any bugs found during testing
2. Consider adding more features
3. Deploy to a production environment
4. Invite real users to your music league!

## Getting Help

If you encounter issues:

1. Check the console logs
2. Review the [MODAL_UX_IMPROVEMENTS.md](MODAL_UX_IMPROVEMENTS.md) documentation
3. Verify your Discord.js version: `npm list discord.js`
4. Ensure all dependencies are installed: `npm install`
