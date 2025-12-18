# Music Leek

A Discord bot for music sharing and voting - a game where participants submit songs based on prompts and vote on their favorites!

## 📚 Documentation

- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** - Complete user documentation
- **[docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)** - Comprehensive testing guide

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

### Getting Started

#### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** tab → Add Bot → Copy the bot token
4. Go to **OAuth2** tab → Copy the Application ID
5. In **OAuth2 → URL Generator**:
   - Scopes: `bot` + `applications.commands`
   - Bot Permissions: Send Messages, Embed Links, Read Message History, Use Slash Commands
   - Copy and open the generated URL to invite the bot to your server

#### 2. Configure Environment

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here
```

#### 3. Install and Run

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run deploy       # Register slash commands
npm start            # Start the bot
```

You should see "Ready! Logged in as..." - the bot is now online in your Discord server.

#### 4. Verify It Works

In your Discord server, try:

```
/create-league name:Test League
```

Then test the modal UI:

```
/submit-song
```

A modal form should appear. If it does, everything is working correctly!

## Commands

**Key commands:**

- `/create-league <name>` - Create a league (server only)
- `/submit-song` - Submit a song (opens modal, works in DMs!)
- `/vote` - Vote for songs (opens modal with submission list, works in DMs!)
- `/my-leagues` - See your leagues (works in DMs!)
- `/start-round` - Start a new round (opens modal, works in DMs!)

**Complete command list:** See [docs/USER_GUIDE.md](docs/USER_GUIDE.md#command-reference)

## How to Play

1. Create a league → 2. Join league → 3. Start round → 4. Submit songs → 5. Vote → 6. See results!

**Detailed walkthrough:** See [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

## Project Structure

```
music-leek/
├── src/
│   ├── commands/          # Slash command handlers
│   ├── modals/            # Modal form handlers
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Helper functions and storage
│   ├── index.ts           # Main bot entry point
│   └── deploy-commands.ts # Command registration script
├── docs/                  # Documentation
│   ├── USER_GUIDE.md      # Complete user documentation
│   └── TESTING_GUIDE.md   # Comprehensive testing guide
├── data/                  # League data storage (JSON)
├── dist/                  # Compiled JavaScript (generated)
├── .env                   # Environment variables (not in git)
├── package.json
└── tsconfig.json
```

## Data Storage

League data is stored in `data/leagues.json`. This is a simple JSON file storage system. For production use, consider migrating to a proper database.

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

See [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) for comprehensive testing scenarios and instructions.

Quick test checklist:

- [ ] Commands work in server
- [ ] Commands work in DMs
- [ ] Modals open and submit correctly
- [ ] Data persists after bot restart

## Contributing

Feel free to open issues or submit pull requests!

## License

ISC
