# AI Agent Development Guidelines

> **For human contributors:** Learn more about the AGENTS.md convention at https://agents.md/

## Core Principle
**When in doubt, ask.** Don't make assumptions about architecture, tooling, or implementation details.

## Project Structure

```
music-leek/
├── src/
│   ├── commands/          # Slash command handlers (/join-league, /vote, etc.)
│   ├── components/        # Discord components (vote select menus)
│   ├── modals/            # Modal form handlers (submit-song, vote-points)
│   ├── services/          # External API services (Spotify, Apple Music)
│   ├── utils/             # Core utilities (storage, permissions, helpers)
│   ├── types/             # TypeScript type definitions
│   ├── __tests__/         # Jest test files
│   ├── constants.ts       # App-wide constants
│   ├── index.ts           # Bot entry point
│   └── deploy-commands.ts # Command deployment script
├── data/                  # JSON storage files (leagues.json)
├── docs/                  # Documentation (USER_GUIDE.md, etc.)
└── dist/                  # Compiled JavaScript output
```

### Key Files
- `src/utils/storage.ts` - File-based persistence layer
- `src/types/index.ts` - Core type definitions (League, Round, Submission, etc.)
- `src/utils/permissions.ts` - Admin authorization checks

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
- [ ] Fix any build or test errors before submitting

## This Project
- Discord bot for music sharing/voting leagues
- TypeScript, discord.js
- Testing: Jest
- Storage: JSON file-based (leagues stored by guildId, not a separate id field)
- Ask before adding more tooling or frameworks
