# Music Leek Bot - User Guide

## Quick Start

### For Players

1. **Join a League**
   - In your server, use `/join-league <league-id>`
   - Get the league ID from your server admin or `/my-leagues`

2. **Check Your Leagues**
   - Use `/my-leagues` (works in DMs too!)
   - This shows all leagues you're part of with their IDs and status

3. **Submit a Song**
   - Use `/submit-song` or `/submit-song <league-id>`
   - A form will pop up - fill it out and click Submit
   - **Can be done in DMs for privacy!**

4. **Vote for Songs**
   - Use `/vote` or `/vote <league-id>`
   - You'll see all submissions in the form
   - Enter your votes like: `1:5,2:4,3:3` (song#:points)
   - **Can be done in DMs for privacy!**

### For League Admins

1. **Create a League**
   - In your server: `/create-league <name>`
   - Save the league ID that's displayed

2. **Start a Round**
   - Use `/start-round` or `/start-round <league-id>`
   - Fill out the form with your prompt and timing
   - **Can be done in DMs!**

3. **Start Voting**
   - When submissions are in: `/start-voting <league-id>`
   - This displays all songs and opens voting

4. **End a Round**
   - When voting ends: `/end-round <league-id>`
   - Results will be posted with rankings

## Command Reference

### Player Commands

| Command | Description | Works in DMs? |
|---------|-------------|---------------|
| `/my-leagues` | List your leagues | ✅ Yes |
| `/submit-song [league-id]` | Submit a song (opens modal) | ✅ Yes |
| `/vote [league-id]` | Vote for songs (opens modal) | ✅ Yes |
| `/join-league <league-id>` | Join a league | ❌ Server only |
| `/league-status <league-id>` | Check league status | ✅ Yes |
| `/leaderboard <league-id>` | View leaderboard | ✅ Yes |

### Admin Commands

| Command | Description | Works in DMs? |
|---------|-------------|---------------|
| `/create-league <name>` | Create a new league | ❌ Server only |
| `/start-round [league-id]` | Start a round (opens modal) | ✅ Yes |
| `/start-voting <league-id>` | Begin voting phase | ✅ Yes |
| `/end-round <league-id>` | End round & show results | ✅ Yes |

## Pro Tips

### Using DMs

You can DM the bot to:

- Check your leagues with `/my-leagues`
- Submit songs privately with `/submit-song`
- Vote privately with `/vote`
- Manage leagues as an admin with `/start-round`

**Workflow:**

1. DM the bot
2. Use `/my-leagues` to see your league IDs
3. Use any command with the league ID
4. Fill out the modal form

### Pre-filling League IDs

Most commands accept an optional `league-id` parameter:

- `/submit-song league-id:abc123` - Modal opens with league ID already filled
- `/vote league-id:abc123` - Modal shows submissions for that league
- `/start-round league-id:abc123` - Admin form pre-filled

If you don't provide it, you can type it in the modal!

### Voting Format

When voting, use this format: `submission#:points`

Examples:

- `1:5,2:4,3:3` - Give song #1 five points, song #2 four points, song #3 three points
- `3:10,1:8,4:6` - Any order works!
- You cannot vote for your own song

## Modal Forms Guide

### Submit Song Modal

- **League ID**: The league you're submitting to
- **Song URL**: Spotify or YouTube link
- **Song Title**: Name of the song
- **Artist Name**: Who performs it

### Vote Modal

- **League ID**: The league you're voting in
- **Available Submissions**: Read-only list of songs (for reference)
- **Your Votes**: Enter in format `1:5,2:4,3:3`

### Start Round Modal (Admins)

- **League ID**: The league to start a round in
- **Round Prompt**: The theme (e.g., "Songs that make you feel nostalgic")
- **Submission Hours**: How long players have to submit (default: 72)
- **Voting Hours**: How long voting lasts (default: 48)

## Troubleshooting

**"League not found!"**

- Check the league ID is correct
- Use `/my-leagues` to see your leagues

**"You are not in this league!"**

- Use `/join-league <league-id>` in the server first

**"Submission phase has ended!"**

- The round moved to voting - you can only vote now

**"Voting phase has not started!"**

- Wait for the admin to start voting with `/start-voting`

**"Invalid vote format!"**

- Make sure to use format: `1:5,2:4,3:3`
- No spaces between numbers and colons
- Separate votes with commas

## Privacy

When you use commands in DMs:

- Song submissions are private until voting starts
- Your votes are always private
- Only results are public

When you use commands in a server:

- The bot's responses are ephemeral (only you see them) for submission and voting
- Results and announcements are public
