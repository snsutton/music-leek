# Modal Components UX Improvements

This document describes the modal-based user experience improvements implemented for the Music Leek Discord bot.

## Overview

The bot now uses Discord's Modal Components to provide a better user experience for both admins and players. Users can interact with the bot via DMs or in server channels.

## Key Features

### 1. Modal-Based Input Forms

Instead of requiring multiple command parameters, the bot now presents interactive modal forms that guide users through the submission process.

**Commands with Modals:**

- `/submit-song` - Opens a modal for submitting songs
- `/vote` - Opens a modal showing available submissions and a voting input field
- `/start-round` - Opens a modal for admins to configure a new round

### 2. DM Support

All commands now work in Direct Messages with the bot, making it easier for users to:

- Submit songs privately
- Vote without others seeing their choices
- Check their league status
- Admins can manage leagues from DMs

**Enabled Intents:**

- `DirectMessages` - Allows bot to receive DMs
- Partials: `Channel` and `Message` - Required for DM support

### 3. Enhanced Commands

#### `/submit-song [league-id]`

Opens a modal with:

- League ID (pre-filled if provided)
- Song URL input
- Song Title input
- Artist Name input

**Benefits:**

- Better UX with labeled fields and placeholders
- Validation happens on submit
- Works in both servers and DMs

#### `/vote [league-id]`

Opens a modal with:

- League ID (pre-filled if provided)
- Submissions list (read-only, shows available songs)
- Vote input field (format: "1:5,2:4,3:3")

**Benefits:**

- See all submissions in the modal
- No need to scroll back to find song numbers
- Private voting in DMs

#### `/start-round [league-id]`

Opens a modal with:

- League ID (pre-filled if provided)
- Round prompt (paragraph input)
- Submission hours (default: 72)
- Voting hours (default: 48)

**Benefits:**

- Clearer input for multi-line prompts
- Default values pre-filled
- Admin can manage from DMs

#### `/my-leagues`

Enhanced to work in both servers and DMs:

- In server: Shows leagues in that server you're part of
- In DMs: Shows all leagues you're part of across all servers
- Displays league ID, status, and participant count

## Technical Implementation

### Modal Handlers

Created a new `src/modals/` directory containing:

1. **submit-song-modal.ts** - Handles song submission form data
2. **vote-modal.ts** - Handles voting form data
3. **start-round-modal.ts** - Handles round creation form data

### Event Handling

Updated [src/index.ts](src/index.ts:1-122) to handle both:

- `ChatInputCommand` interactions (slash commands)
- `ModalSubmit` interactions (form submissions)

### Type Safety

All command handlers updated to use `ChatInputCommandInteraction` for proper TypeScript type checking.

## User Workflow

### For Players

**Joining a League:**

1. Use `/join-league` with the league ID (in server)

**Checking Your Leagues:**

1. Use `/my-leagues` (works in DMs and servers)
2. Copy the league ID you want to interact with

**Submitting a Song:**

1. Use `/submit-song` (optionally with league ID)
2. Fill out the modal form
3. Submit

**Voting:**

1. Use `/vote` (optionally with league ID)
2. Review submissions in the modal
3. Enter votes in format: "1:5,2:4,3:3"
4. Submit

### For Admins

**Starting a Round:**

1. Use `/start-round` (optionally with league ID)
2. Fill out the prompt and timing
3. Submit

**Managing from DMs:**

- All admin commands work in DMs
- Use `/my-leagues` to get league IDs
- Manage multiple leagues across servers from one DM conversation

## Benefits

1. **Better UX**: Interactive forms instead of command parameters
2. **Privacy**: Submit and vote via DMs
3. **Clarity**: See all options and inputs in one place
4. **Flexibility**: Pre-fill league IDs or enter them in the modal
5. **Accessibility**: Works from anywhere (server or DM)
6. **Error Prevention**: Clear labels and placeholders guide users

## Deployment

To deploy the updated commands:

```bash
npm run build
npm run deploy
npm start
```

The bot will load modal handlers automatically from the `src/modals/` directory.

## References

- [Discord Modal Components Documentation](https://discord.com/developers/docs/interactions/message-components#text-inputs)
- [discord.js Modal Guide](https://discordjs.guide/legacy/interactions/modals)
