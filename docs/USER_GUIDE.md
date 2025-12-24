# Music Leek Bot - User Guide

## Quick Start

### For Players

1. **Join a League**
   - In your server, use `/join-league` (the bot will use the server's league)
   - Each Discord server has one league

2. **Check League Status**
   - Use `/league-status` to see the current round, prompt, and deadlines
   - Use `/leaderboard` to view overall standings across all rounds

3. **Submit a Song**
   - Use `/submit-song` when a round is active
   - A form will pop up - paste a Spotify or Apple Music URL
   - **The bot automatically fills in the song title and artist!**
   - Submissions are private until voting starts

4. **Vote for Songs**
   - Use `/vote` when voting opens
   - **Step 1:** Select up to 10 songs from the dropdown menu
   - **Step 2:** A form appears - assign points to each selected song (you have 10 points total)
   - You cannot vote for your own song
   - **Vote sessions expire after 15 minutes** - complete both steps promptly!

### For League Admins

1. **Create a League**
   - In your server: `/create-league <name>`
   - You're automatically added as the creator/admin

2. **Start a Round**
   - Use `/start-round` to begin a new round
   - Fill out the form with:
     - **Round prompt** (the theme, e.g., "Songs that make you feel nostalgic")
     - **Submission days** (default: 7)
     - **Voting days** (default: 7)

3. **Start Voting**
   - When submissions are in: `/start-voting`
   - This displays all songs and opens voting

4. **End a Round**
   - When voting ends: `/end-round`
   - Results will be posted with rankings and points

5. **Manage Admins**
   - Add helpers: `/add-admin <user>`
   - Remove helpers: `/remove-admin <user>`
   - View all admins: `/list-admins`
   - Maximum 5 admins per league

## Command Reference

### Player Commands

| Command | Description |
|---------|-------------|
| `/join-league` | Join your server's league |
| `/league-status` | Check current round status and deadlines |
| `/leaderboard` | View overall standings across all rounds |
| `/submit-song` | Submit a song (opens modal with auto-fill) |
| `/vote` | Vote for songs (interactive select menu) |

### Admin Commands

| Command | Description |
|---------|-------------|
| `/create-league <name>` | Create a new league |
| `/start-round` | Start a round (opens modal) |
| `/start-voting` | Begin voting phase |
| `/end-round` | End round & show results |
| `/add-admin <user>` | Add an admin (max 5) |
| `/remove-admin <user>` | Remove an admin (creator only) |
| `/list-admins` | View all league admins |
| `/delete-league` | Delete the entire league (creator only) |

## Feature Guide

### Automatic Song Metadata

When you submit a song, the bot automatically fetches the song information from Spotify or Apple Music:

1. Use `/submit-song`
2. Paste a Spotify or Apple Music URL in the form:
   - **Spotify**: `https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp`
   - **Apple Music**: `https://music.apple.com/us/song/song-name/1234567890`
3. The bot automatically fills in:
   - Song title
   - Artist name
   - Album name (if available)

### Interactive Voting System

The voting process has two steps:

**Step 1: Select Songs**
- After typing `/vote`, a dropdown menu appears
- Select up to 10 songs you want to vote for
- You can select as few as 1 song or as many as 10
- Your own submission is automatically filtered out

**Step 2: Assign Points**
- After selecting, a form pops up with your chosen songs
- You have a **budget of 10 points** to distribute
- Assign 0-10 points to each song
- You can give all 10 points to one song, or spread them across multiple songs

**Important:**
- You cannot exceed 10 total points
- You must allocate at least 1 point total
- You cannot vote for your own submission
- Vote sessions expire after **15 minutes** - complete both steps before the timeout
- You can change your vote by using `/vote` again (before voting ends)

**Limitation:** League are limited to 25 participants because if a round has more than 25 submissions, the interactive voting UI won't work due to Discord's select menu limit.

### Round Phases

Each round has three phases:

1. **Submission Phase**
   - Players submit songs using `/submit-song`
   - Default duration: 7 days (configurable by admin)
   - Submissions are private until voting starts
   - One submission per player per round

2. **Voting Phase**
   - Started by admin using `/start-voting`
   - All submissions are revealed
   - Players vote using the interactive `/vote` system
   - Default duration: 7 days (configurable by admin)
   - Votes are always private

3. **Completed**
   - Admin ends round with `/end-round`
   - Results posted publicly with:
     - Rankings (🥇🥈🥉 for top 3)
     - Points for each submission
     - Vote counts
   - Points added to overall leaderboard

### Admin Management

League creators have full control and can:
- Add up to 2 admins using `/add-admin <user>` (3 admins total including the creator)
- Remove non-creator admins using `/remove-admin <user>`
- Delete the entire league using `/delete-league`
- Start/manage rounds and voting

Regular admins can:
- Start new rounds with `/start-round`
- Start voting with `/start-voting`
- End rounds with `/end-round`

The creator cannot be removed and always remains an admin.

### Leaderboard & Scoring

- Use `/leaderboard` to see cumulative scores across all completed rounds
- Scores are calculated by totaling points each submission receives from voters
- The leaderboard shows:
  - Player rankings with medals (🥇🥈🥉)
  - Total points accumulated
  - Number of rounds participated in
- Scores persist across multiple rounds

## Pro Tips

### Viewing Round Information

Use `/league-status` to quickly see:
- Current round number and status
- Round prompt/theme
- Submission deadline (with Discord timestamp)
- Voting deadline (with Discord timestamp)
- Number of submissions received
- Current phase (submission/voting/completed)

### Privacy Features

**Submissions:**
- Private during submission phase
- Revealed when voting starts
- Bot responses are ephemeral (only you see them) when using commands in server channels

**Voting:**
- All votes are completely private
- Only final tallies are shown in results
- No one can see who voted for what

**Commands:**
- Most bot responses in servers are ephemeral (only visible to you)
- Results and announcements are public

### Time Management

- Deadlines are shown as Discord timestamps that auto-update in your timezone
- When creating a round, consider:
  - **7 days for submissions** gives everyone time to participate
  - **7 days for voting** ensures people can review and vote thoughtfully
  - Adjust based on your community's activity patterns

### Spotify/Apple Music Links

Both platforms are supported:

**Spotify:**
- Track URLs: `https://open.spotify.com/track/{id}`
- Spotify URIs also work: `spotify:track:{id}`

**Apple Music:**
- Song URLs: `https://music.apple.com/{country}/song/{name}/{id}`
- Album URLs with track: `https://music.apple.com/{country}/album/{name}/{id}?i={trackId}`

**Note:** Apple Music support requires additional setup by the bot administrator.

## Modal Forms Guide

### Submit Song Modal

- **Song URL**: Paste Spotify or Apple Music link
- **Song Title**: Auto-filled from URL (or enter manually)
- **Artist Name**: Auto-filled from URL (or enter manually)
- **Album Name**: Auto-filled from URL (optional)

### Vote Select Menu + Points Modal

**Select Menu:**
- Shows all submissions except your own
- Select 1-10 songs to vote for

**Points Modal:**
- Shows your selected songs
- Enter points (0-10) for each
- Total cannot exceed 10 points

### Start Round Modal (Admins)

- **Round Prompt**: The theme (e.g., "Songs that make you feel nostalgic")
- **Submission Days**: How long players have to submit (default: 7)
- **Voting Days**: How long voting lasts (default: 7)

## Troubleshooting

**"No league found for this server!"**
- The server doesn't have a league yet
- Ask an admin to create one with `/create-league <name>`

**"You are not in this league!"**
- Use `/join-league` in the server first

**"Voting is not open yet!"**
- The round is still in submission phase
- Wait for admin to start voting with `/start-voting`

**"Voting deadline has passed!"**
- The voting period ended
- Wait for admin to end the round and start a new one

**"Vote session expired! Please start over."**
- You took longer than 15 minutes between selecting songs and assigning points
- Start fresh with `/vote` and complete both steps quickly

**"You allocated X points, but only have 10 available!"**
- Your total points exceed the budget
- Reduce the points assigned to some songs

**"This round has more than 25 submissions"**
- Discord's select menu limit prevents interactive voting
- Contact an admin to handle this (may need to split into multiple rounds)

**"Could not fetch song metadata"**
- The Spotify/Apple Music API couldn't retrieve the song info
- Verify the URL is correct
- Enter song details manually if needed
- Contact bot admin if this persists (API credentials may be missing)
