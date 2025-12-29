# Music Leek

A Discord bot for music sharing and voting - a game where participants submit songs based on prompts and vote on their favorites!

## 📚 Documentation

- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** - Complete user documentation
- **[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** - Deploy to Railway.app for 24/7 hosting
- **[docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md)** - Comprehensive testing guide

## Features

- 🎵 Create and manage music leagues
- 🎯 Start themed rounds with custom prompts
- 📝 Submit songs using interactive modal forms
- 🎼 Automatic song metadata from Spotify Music URLs
- 🗳️ Vote on submissions with visual submission lists
- 📊 Automatic scoring and leaderboards

## Setup

### Prerequisites

- Node.js (v16 or higher)
- A Discord bot token

### Getting Started

#### 1. Create Discord Bot & Invite to Server

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** tab → Add Bot → Copy the bot token
4. Go to **OAuth2** tab → Copy the Application ID
5. **Invite the bot to your server:**
   - Go to **OAuth2 → URL Generator**
   - Select scopes: `bot` + `applications.commands`
   - Select bot permissions:
     - Send Messages
     - Embed Links
     - Read Message History
     - Use Slash Commands
   - Copy the generated URL and open it in your browser
   - Select your Discord server and click **Authorize**

#### 2. Set Up Spotify API (Required)

The bot automatically fetches song metadata from Spotify URLs. You'll need a free Spotify API account:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (or create one)
3. Click **Create App**
4. Fill in:
   - **App name**: Music Leek Bot (or any name)
   - **App description**: Discord bot for music sharing
   - **Redirect URIs**: Leave blank or use `http://localhost` (not needed for this bot)
   - **APIs to use**: Check only **Web API**
5. Click **Settings** → Copy your **Client ID** and **Client Secret**

#### 3. Configure Environment

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_application_id_here

# Spotify API (required for automatic song metadata)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

#### 4. Install and Run

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run deploy       # Register slash commands
npm start            # Start the bot
```

You should see:
- "Music services initialized: spotify" (or "none" if credentials are missing)
- "Ready! Logged in as..." - the bot is now online in your Discord server

#### 5. Verify It Works

In your Discord server, try:

```
/create-league name:Test League
```

Then test song submission with a Spotify link:

```
/submit-song
```

A modal should appear asking for a song URL. Paste a Spotify link like:
```
https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp
```

The bot should automatically fetch the song title and artist. If it does, everything is working correctly!

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

MIT - see [LICENSE](LICENSE) file for details
