# AI Agent Development Guidelines

> **For human contributors:** Learn more about the AGENTS.md convention at <https://agents.md/>

## Table of Contents

- [Core Principle](#core-principle)
- [Project Structure](#project-structure)
  - [Key Files](#key-files)
- [Required Questions Before Action](#required-questions-before-action)
- [Default Behavior](#default-behavior)
- [Testing Requirements](#testing-requirements)
- [This Project](#this-project)
- [Decision Record](#decision-record)

## Core Principle

**When in doubt, ask.** Don't make assumptions about architecture, tooling, or implementation details.

## Project Structure

```text
music-leek/
├── src/
│   ├── commands/          # Slash command handlers (20 commands)
│   ├── components/        # Discord components (vote-song-select, vote-submit-button)
│   ├── modals/            # Modal form handlers (5 modals)
│   ├── services/          # External API services (Spotify, notifications, scheduler)
│   ├── utils/             # Core utilities (storage, permissions, helpers, vote-sessions, vote-embed-builder)
│   ├── types/             # TypeScript type definitions
│   ├── __tests__/         # Jest test suite (commands, modals, components, integration)
│   ├── constants.ts       # App-wide constants (POINTS_BUDGET)
│   ├── env.ts             # Environment configuration (loaded first)
│   ├── index.ts           # Bot entry point with dynamic handler loading
│   └── deploy-commands.ts # Command deployment script
├── data/                  # JSON storage (leagues.json, tokens.json, dm-contexts.json)
├── docs/                  # Documentation (USER_GUIDE.md, DEPLOYMENT_GUIDE.md, TESTING_GUIDE.md)
├── scripts/               # Backup/restore scripts
└── dist/                  # Compiled JavaScript output
```

### Key Files

**Core:**

- `src/index.ts` - Bot entry point; dynamically loads commands, modals, components from directories
- `src/types/index.ts` - Core type definitions (League, Round, Submission, Vote, etc.)
- `src/env.ts` - Environment variables loaded before other imports

**Storage & Data:**

- `src/utils/storage.ts` - File-based persistence layer (JSON)
- `src/services/token-storage.ts` - OAuth token persistence
- `src/utils/dm-context.ts` - DM context tracking for guild resolution

**Services:**

- `src/services/notification-service.ts` - DM notifications with error handling
- `src/services/notification-templates.ts` - Embed templates for all notification types
- `src/services/scheduler.ts` - Hourly background task for deadline reminders
- `src/services/spotify-oauth-service.ts` - OAuth2 flow for Spotify
- `src/services/spotify-playlist-service.ts` - Playlist creation from submissions
- `src/services/voting-service.ts` - Vote validation and score calculation

**Utilities:**

- `src/utils/helpers.ts` - ID generation, timestamps, status formatting, scoring
- `src/utils/permissions.ts` - Admin authorization checks
- `src/utils/vote-sessions.ts` - Session state for voting hub (tracks point allocations, display order)
- `src/utils/vote-embed-builder.ts` - Builds voting hub embed and components

## Required Questions Before Action

### Tooling & Setup

- Which libraries or patterns should I follow?
- What's the preferred file structure?
- Do you want comprehensive mocks or minimal test setup?

### Implementation Choices

- If there are multiple valid approaches, present options and ask which to use
- If a feature could be implemented multiple ways, describe the tradeoffs and ask for preference
- If adding new dependencies, ask first

### Complexity & Scope

- Start simple and ask before adding complexity
- Ask if you want full test coverage or just specific scenarios
- Confirm the scope before building comprehensive solutions

## Default Behavior

- Prefer simple over complex
- Prefer minimal over comprehensive
- Prefer asking over assuming
- Only add what's explicitly requested
- Don't use emojis

## Testing Requirements

### Before Writing Tests

1. **Read the actual implementation first** - Never assume API signatures, method names, or interfaces
2. **Check type definitions** - Read `src/types/index.ts` to ensure test objects include all required properties
3. **Verify mocks match reality** - If creating mocks, they must exactly mirror the real implementation's API

### After Writing Tests

1. **Always run `npm run build`** - TypeScript compilation will catch:
   - API mismatches between mocks and real code
   - Missing required properties in test objects
   - Non-existent methods being called
2. **Fix ALL build errors before claiming completion** - Don't exclude test files from compilation to hide errors
3. **Run `npm test`** - Ensure tests actually pass, not just compile

### Common Test Mistakes to Avoid

- Inventing API methods that don't exist (e.g., `Storage.getLeague()` when only `Storage.getLeagueByGuild()` exists)
- Using non-existent properties (e.g., `league.id` when the interface uses `guildId` as the identifier)
- Forgetting required fields in test data objects (check the TypeScript interface for all required fields)
- Creating mocks that don't match the real implementation's method signatures

### Test Writing Checklist

- [ ] Read the source file being tested
- [ ] Read relevant type definitions
- [ ] Ensure mocks use correct method names and signatures
- [ ] Include all required properties in test data
- [ ] Run `npm run build` to verify TypeScript compilation
- [ ] Run `npm test` to verify tests pass
- [ ] Fix any build errors, test errors, or console errors before submitting

## This Project

- Discord bot for music sharing/voting leagues
- TypeScript, discord.js
- Testing: Jest
- Storage: JSON file-based (leagues stored by guildId, not a separate id field)
- Ask before adding more tooling or frameworks

---

## Decision Record

Architectural and design decisions that should be preserved. Do not change these without explicit discussion and a compelling reason.

### DR-001: Guild-Based Storage with guildId as Primary Key

**Decision:** Leagues are stored and retrieved using `guildId` as the primary identifier, not a separate `id` field.

**Rationale:** One league per Discord server simplifies the data model and aligns with how users interact with the bot. The guild ID is always available in Discord interactions.

**Implications:** Use `Storage.getLeagueByGuild(guildId)` for lookups. Do not add a separate league ID field.

### DR-002: Dynamic Handler Loading Pattern

**Decision:** Commands, modals, and components are dynamically loaded from their respective directories at startup.

**Rationale:** Adding new handlers requires only creating a new file with the correct exports (`data`/`customId` and `execute`). No manual registration needed.

**Implications:** All handlers must export the expected interface. File naming conventions matter for discovery.

### DR-003: ISO 8601 Timestamps

**Decision:** All timestamps (deadlines, creation times, completion times) use ISO 8601 strings, not Unix timestamps.

**Rationale:** ISO strings are human-readable in JSON files, making manual testing and debugging easier.

**Implications:** Use `new Date().toISOString()` for timestamps. Parse with `new Date(isoString)`.

### DR-004: Round Status State Machine

**Decision:** Rounds progress through a defined state machine: `theme-submission` -> `submission` -> `voting` -> `completed`.

**Rationale:** Clear phase boundaries prevent invalid operations and guide the user experience.

**Implications:** Commands must check round status before allowing actions. Phase transitions are explicit.

### DR-005: Modal Data Passing via customId

**Decision:** Pass context data through modal `customId` using colon-delimited format (e.g., `vote-points-modal:guildId`).

**Rationale:** Discord modals don't support arbitrary data passing. The customId field is the only reliable way to maintain context between interaction steps.

**Implications:** Extract parameters with `interaction.customId.split(':')`. Keep customId under Discord's 100-character limit.

### DR-006: Graceful DM Failure Handling

**Decision:** DM notifications silently fail when users have DMs disabled (Discord error 50007).

**Rationale:** Users who disable DMs have made a deliberate choice. Logging errors without user-facing failures provides a better experience.

**Implications:** NotificationService catches and logs DM failures. Critical information should also appear in channel announcements.

### DR-007: Spotify-Only Music Service (Current)

**Decision:** Only Spotify is supported for music metadata and playlist creation. Apple Music support was removed.

**Rationale:** Maintaining multiple music service integrations adds complexity. Spotify has the best API for our use case.

**Implications:** MusicServiceFactory exists for future expansion but currently only returns SpotifyService.

### DR-008: Submission Required for Voting Eligibility

**Decision:** Users must submit a song to the current round before they can vote.

**Rationale:** Encourages participation and prevents vote manipulation by non-participants.

**Implications:** Vote command checks for user's submission before allowing vote access.

### DR-009: Points-Based Voting with Hub UI

**Decision:** Voters distribute a 10-point budget across any number of songs using a persistent voting hub UI with dropdown selection.

**Rationale:** Forces voters to make meaningful choices. The hub pattern allows voting for any number of songs (up to 25, Discord's select menu limit) while providing live budget tracking and the ability to adjust allocations before submitting.

**Implications:**

- `POINTS_BUDGET` constant in `src/constants.ts` defines the budget (10)
- VoteSessionManager tracks point allocations in-memory during voting
- Songs display in Spotify playlist order (`round.shuffledOrder`) for anonymity
- Users can edit any song's points before clicking Submit
- Vote is only saved when user clicks the Submit button
