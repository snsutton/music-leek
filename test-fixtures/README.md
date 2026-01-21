# Test Fixtures for Weighted Theme Selection

These fixture files let you manually test the weighted theme selection system.

## How to Use

1. Copy a fixture file to `data/leagues.json`
2. Run the bot
3. Use `/start-song-submissions` to trigger theme selection
4. Check `data/leagues.json` to see the updated `themeSelectionTickets`

## Fixtures

### Fixture 1: Round 1 - First Theme Selection

**File:** `fixture-1-round1-theme-submission.json`

A fresh league in Round 1 with 3 theme submissions from Alice, Bob, and Carol.
No `themeSelectionTickets` exists yet.

**Expected after selection:**

- `themeSelectionTickets` is created
- All 3 users get +1 ticket
- Selected user's tickets reset to 0

### Fixture 2: Round 2 - Weighted Selection Test

**File:** `fixture-2-round2-weighted-selection.json`

Round 2 with pre-populated tickets simulating that Alice was selected in Round 1:

- Alice: 0 tickets (was selected)
- Bob: 1 ticket
- Carol: 1 ticket

All 3 have submitted themes again.

**Expected odds:**

- Alice: 1/(1+2+2) = 20%
- Bob: 2/(1+2+2) = 40%
- Carol: 2/(1+2+2) = 40%

**To verify:** Restore this fixture multiple times and run selection. Bob and Carol should be selected more frequently than Alice.

### Fixture 3: Edge Case - Single Submission

**File:** `fixture-3-edge-case-single-submission.json`

Only one theme submitted. Should still work correctly.

**Expected:** Alice's theme is always selected, her tickets reset to 0.

## Inspecting Results

After running `/start-song-submissions`, check `data/leagues.json`:

```json
"themeSelectionTickets": {
  "alice_111111111111111111": 0,  // Was selected, reset to 0
  "bob_222222222222222222": 2,    // Submitted but not selected, +1
  "carol_333333333333333333": 2   // Submitted but not selected, +1
}
```
