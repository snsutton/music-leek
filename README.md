# Music Leek

A Discord bot for music sharing and voting - a game where participants submit songs based on prompts and vote on their favorites!

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get running in 5 minutes
- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user documentation
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing guide
- **[MODAL_UX_IMPROVEMENTS.md](MODAL_UX_IMPROVEMENTS.md)** - Technical implementation details

## Features

- 🎵 Create and manage music leagues
- 🎯 Start themed rounds with custom prompts
- 📝 Submit songs using interactive modal forms
- 🗳️ Vote on submissions with visual submission lists
- 📊 Automatic scoring and leaderboards
- 💬 Full DM support - submit and vote privately!
- 🎨 Modern modal-based UI for better user experience
- 🌐 Support for multiple leagues per server and across servers

## Setup

### Prerequisites

- Node.js (v16 or higher)
- A Discord bot token

### Quick Setup

**5-minute setup:** See [QUICK_START.md](QUICK_START.md)

**Detailed setup:** See [TESTING_GUIDE.md](TESTING_GUIDE.md)

**TL;DR:**

```bash
# 1. Create bot at discord.com/developers
# 2. Get bot token and application ID
# 3. Create .env file:
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_id

# 4. Run:
npm install
npm run build
npm run deploy
npm start
```

## Commands

**Key commands:**

- `/create-league <name>` - Create a league (server only)
- `/submit-song` - Submit a song (opens modal, works in DMs!)
- `/vote` - Vote for songs (opens modal with submission list, works in DMs!)
- `/my-leagues` - See your leagues (works in DMs!)
- `/start-round` - Start a new round (opens modal, works in DMs!)

**Complete command list:** See [USER_GUIDE.md](USER_GUIDE.md#command-reference)

## How to Play

1. Create a league → 2. Join league → 3. Start round → 4. Submit songs → 5. Vote → 6. See results!

**Detailed walkthrough:** See [USER_GUIDE.md](USER_GUIDE.md)

## Project Structure

```
music-leek-claude/
├── src/
│   ├── commands/          # Slash command handlers
│   ├── modals/            # Modal form handlers (NEW!)
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Helper functions and storage
│   ├── index.ts           # Main bot entry point
│   └── deploy-commands.ts # Command registration script
├── data/                  # League data storage (JSON)
├── dist/                  # Compiled JavaScript (generated)
├── .env                   # Environment variables (not in git)
├── TESTING_GUIDE.md       # How to test the bot locally
├── USER_GUIDE.md          # Complete user documentation
├── MODAL_UX_IMPROVEMENTS.md # Technical implementation details
├── package.json
└── tsconfig.json
```

## Data Storage

League data is stored in `data/leagues.json`. This is a simple JSON file storage system. For production use, consider migrating to a proper database.

## What's New: Modal Components & DM Support

The bot now uses Discord's modern modal components for a better user experience:

- **Interactive Forms**: Instead of command parameters, users fill out modal forms
- **Better UX**: Labeled fields, placeholders, and visual submission lists
- **DM Support**: Submit and vote privately through Direct Messages
- **Pre-filled Fields**: League IDs can be pre-filled or entered manually

See [MODAL_UX_IMPROVEMENTS.md](MODAL_UX_IMPROVEMENTS.md) for technical details.

## Development

### Adding New Commands

1. Create a new file in `src/commands/`
2. Export `data` (SlashCommandBuilder) and `execute` (async function)
3. Use `ChatInputCommandInteraction` type for the interaction parameter
4. Run `npm run deploy` to register the new command
5. Restart the bot

### Adding New Modals

1. Create a new file in `src/modals/`
2. Export `customId` (string) and `execute` (async function)
3. Use `ModalSubmitInteraction` type for the interaction parameter
4. Modal handlers are auto-loaded on bot startup
5. Restart the bot

## Testing

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive local testing instructions.

Quick test checklist:

- [ ] Commands work in server
- [ ] Commands work in DMs
- [ ] Modals open and submit correctly
- [ ] Data persists after bot restart

## Contributing

Feel free to open issues or submit pull requests!

## License

ISC
