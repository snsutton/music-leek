# Test Fixtures

Test fixtures let you manually test bot features by preloading league state.

## Quick Start

1. Create a new JSON file in this folder (e.g., `my-test.json`)
2. Copy the template below and replace placeholder values with your real Discord IDs
3. Copy to `data/leagues.json`
4. Run the bot and test

## Finding Your Discord IDs

Enable Developer Mode in Discord (Settings → Advanced → Developer Mode), then:

- **Guild ID**: Right-click your server → "Copy Server ID"
- **User ID**: Right-click yourself → "Copy User ID"
- **Channel ID**: Right-click a text channel → "Copy Channel ID"

## Fixture Template

Copy this template and replace the placeholder values:

```json
{
  "leagues": {
    "YOUR_GUILD_ID": {
      "name": "Example Test League",
      "guildId": "YOUR_GUILD_ID",
      "channelId": "YOUR_CHANNEL_ID",
      "createdBy": "YOUR_USER_ID",
      "admins": ["YOUR_USER_ID"],
      "createdAt": "2025-01-20T12:00:00.000Z",
      "currentRound": 1,
      "rounds": [
        {
          "roundNumber": 1,
          "prompt": "Your test prompt here",
          "status": "submission",
          "startedAt": "2025-01-20T12:00:00.000Z",
          "submissionDeadline": "2030-01-26T12:00:00.000Z",
          "votingDeadline": "2030-01-27T12:00:00.000Z",
          "submissions": [
            {
              "userId": "YOUR_USER_ID",
              "songUrl": "https://open.spotify.com/track/TRACK_ID_1",
              "songTitle": "Song Title 1",
              "artist": "Artist 1",
              "submittedAt": "2025-01-21T10:00:00.000Z"
            },
            {
              "userId": "100000000000000002",
              "songUrl": "https://open.spotify.com/track/TRACK_ID_2",
              "songTitle": "Song Title 2",
              "artist": "Artist 2",
              "submittedAt": "2025-01-21T10:05:00.000Z"
            }
          ],
          "votes": [],
          "notificationsSent": {
            "roundStarted": true,
            "submissionReminder": false,
            "votingStarted": false,
            "votingReminder": false,
            "allVotesReceived": false
          }
        }
      ],
      "participants": [
        "YOUR_USER_ID",
        "100000000000000002"
      ],
      "totalRounds": 5,
      "isCompleted": false
    }
  }
}
```

## Placeholders to Replace

| Placeholder         | Description                                        |
| ------------------- | -------------------------------------------------- |
| `YOUR_GUILD_ID`     | Your Discord server ID                             |
| `YOUR_USER_ID`      | Your Discord user ID                               |
| `YOUR_CHANNEL_ID`   | The channel for league announcements               |
| `100000000000000002`| Fake user IDs for simulated players (keep as-is)   |

## Common Test Scenarios

### Testing Theme Selection

Set `status: "theme-submission"` and add `themeSubmissions`:

```json
"themeSubmissions": [
  { "userId": "...", "theme": "Songs about rain", "submittedAt": "2025-01-20T13:00:00.000Z" },
  { "userId": "...", "theme": "80s bangers", "submittedAt": "2025-01-20T14:00:00.000Z" }
]
```

### Testing Voting Phase

Set `status: "submission"` with submissions, then run `/start-voting`.

### Testing Spotify Playlist Confirmation

Add `spotifyIntegration` to the league:

```json
"spotifyIntegration": {
  "userId": "spotify_user_id",
  "connectedBy": "YOUR_USER_ID",
  "connectedAt": "2025-01-20T12:00:00.000Z"
}
```

Make sure you also have valid tokens in `data/spotify-tokens.json`.

## Tips

- Set deadlines far in the future (e.g., 2030) to prevent automatic transitions
- Set deadlines in the past to trigger deadline-based behavior
- Use obviously fake user IDs like `100000000000000002` for simulated players
- The `notificationsSent` object tracks which DMs have been sent
- JSON files in this folder are gitignored - create as many as you need
