# Quick Start - 5 Minute Setup

Get the Music Leek bot running locally in 5 minutes.

> **📖 Need detailed instructions?** See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive setup and testing scenarios.

## Prerequisites

- Node.js 16+ installed
- Discord account
- Test Discord server (where you're admin)

## 1. Discord Bot Setup (2 minutes)

**Create & invite bot:**

1. Go to <https://discord.com/developers/applications> → "New Application"
2. Bot tab → "Add Bot" → Copy token
3. OAuth2 → Copy Application ID
4. OAuth2 → URL Generator:
   - Scopes: `bot` + `applications.commands`
   - Permissions: Send Messages, Embed Links, Read Message History
   - Copy URL → Invite to your test server

## 2. Local Setup (2 minutes)

```bash
cd "c:\Users\Owner\Git Repos\music-leek-claude"
npm install

# Create .env with your credentials
echo DISCORD_TOKEN=your_token_here > .env
echo DISCORD_CLIENT_ID=your_app_id_here >> .env

# Build, deploy, and start
npm run build
npm run deploy
npm start
```

✅ **Success:** You should see "Ready! Logged in as..."

## 3. Quick Test (1 minute)

**In Discord server:**

```
/create-league name:Test League
```

Copy the league ID, then:

```
/submit-song
```

🎨 **Modal opens!** Fill it out to test the new UI.

**Test DM support:**

1. DM the bot
2. `/my-leagues` → See your league
3. `/submit-song` → Submit privately!

✅ **It works!** Modals and DMs are functioning.

## What to Test

**Essential features:**

- ✅ Modal forms open and submit
- ✅ DM commands work
- ✅ Data persists after restart

**Full test flow:** See [TESTING_GUIDE.md](TESTING_GUIDE.md#test-5-complete-round-flow)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot offline | Check token in `.env`, restart bot |
| Commands not appearing | Run `npm run deploy`, wait 30 seconds |
| Modal doesn't open | Update Discord client |
| Changes not reflecting | `npm run build` then restart |

**More help:** See [TESTING_GUIDE.md](TESTING_GUIDE.md#troubleshooting)

## Next Steps

- **Full testing:** [TESTING_GUIDE.md](TESTING_GUIDE.md) - Complete test scenarios
- **User docs:** [USER_GUIDE.md](USER_GUIDE.md) - All commands and features
- **Technical:** [MODAL_UX_IMPROVEMENTS.md](MODAL_UX_IMPROVEMENTS.md) - Implementation details

---

**You're all set!** The bot is running with modal components and DM support. 🎉
