# Music Leek Bot - User Guide

**Music Leek** is a Discord bot for music discovery leagues. Submit songs based on prompts, vote for your favorites, and compete on the leaderboard!

## Table of Contents

- [How to Play](#how-to-play)
- [For League Admins](#for-league-admins)
- [Common Questions](#common-questions)

### Joining a League

1. Use `/join-league` in your Discord server
2. That's it! You're now part of the league

### Playing a Round

1. **Submit a song** - Use `/submit-song` and paste a Spotify or Apple Music link
2. **Vote** - When voting opens, use `/vote` to pick your favorites (you get 10 points to distribute)
3. **Check results** - See who won and view the leaderboard

## How to Play

### Submitting Songs

When a round is active, submit your song:

1. Type `/submit-song`
2. Paste a Spotify or Apple Music link
3. The bot fills in the song details automatically - just click submit!

**Tips:**
- You can only submit one song per round
- Your submission stays private until voting starts

### Voting for Songs

When voting opens, choose your favorites:

1. Type `/vote`
2. **Pick songs** - Select up to 10 songs from the list (your own is hidden)
3. **Give points** - Distribute 10 points across your picks however you like
   - Give all 10 to one song, or spread them out
   - Must use at least 1 point total
4. Click submit

**Important:**
- You have 15 minutes to complete voting once you start
- You can change your vote by using `/vote` again
- Votes are completely private

### Checking Standings

- `/league-status` - See the current round, theme, and deadlines
- `/leaderboard` - View overall scores across all rounds

## For League Admins

### Setting Up

Create a league in your server:
- `/create-league <name>` - You become the league creator

Add helpers to manage rounds:
- `/add-admin <user>` - Add an admin (max 3 total)
- `/remove-admin <user>` - Remove an admin
- `/list-admins` - See all admins

### Running Rounds

**1. Start a Round**
- `/start-round`
- Set the theme (e.g., "Songs that make you cry")
- Set how many days for submissions (default: 7)
- Set how many days for voting (default: 7)

**2. Open Voting**
- `/start-voting` when you're ready
- All submissions get revealed and voting begins

**3. End the Round**
- `/end-round` when voting closes
- Results get posted with winners and points

### Managing Your League

- `/delete-league` - Delete the entire league (creator only)
- League creators have full control and cannot be removed
- Each server can only have one league

## Common Questions

### How do I join?

Just type `/join-league` in your server. That's it!

### What kind of music links work?

Only Spotify links work. Just copy the link from the app and paste it when submitting.

### Can I change my vote?

Yes! Just use `/vote` again before the voting period ends. Your new vote replaces the old one.

### When can I see other people's submissions?

Submissions stay hidden until the admin opens voting. Once voting opens, you'll see everyone's songs.

### Can I vote for my own song?

Nope! Your submission is automatically hidden from your voting choices.

### How does scoring work?

When you vote, you distribute 10 points across the songs you like. The songs with the most points win the round. Points accumulate on the leaderboard across all rounds.

### What happens after voting ends?

The admin uses `/end-round` to post the results, showing the winners and everyone's scores. Then they can start a new round with a new theme!

### How many people can be in a league?

Up to 25 players per league. This is a limitation of the discord.js library used to implement the voting interface.

### Help! I got an error message

Common fixes:
- **"No league found"** - Your server needs a league. Use `/create-league` to start one
- **"You are not in this league"** - Use `/join-league` first
- **"Voting is not open yet"** - Wait for the admin to open voting
- **"Vote session expired"** - You took too long to submit your votes. Try `/vote` again and complete it within 15 minutes
- **"Too many points"** - You can only use 10 points total when voting
