# Title Screen

## Overview

**Description:** Application startup screen and entry point to the game. First screen displayed when launching Wizardry.

**Scene Type:** System Screen (no save state)

**Location in Game Flow:** Application entry point - one-way transition to Castle Menu

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Application launch → Title Screen
- Edge of Town → (L)eave Game → Exit application → Title Screen (on next launch)

**On First Launch:**
- New installation starts here
- No save data exists

### Requirements

**State Requirements:**
- [ ] Application initialized
- [ ] No previous scene (entry point)

**Note:** This is the only scene with no parent in active session. Once you start the game, you cannot return to Title Screen without exiting.

### State Prerequisites

```typescript
interface TitleScreenEntryState {
  appInitialized: boolean  // Must be true
  saveDataExists: boolean  // Optional, for load detection
}
```

---

## UI Layout

### Screen Regions

- **Header:** Game title and logo
- **Main:** Copyright/version information
- **Menu:** Start options (S/M)
- **Footer:** Credits or instructions

### ASCII Mockup

```
┌─────────────────────────────────────┐
│                                     │
│         W I Z A R D R Y             │
│                                     │
│   Proving Grounds of the Mad        │
│          Overlord                   │
│                                     │
│                                     │
│  (S)TART THE GAME                   │
│  (M)AKE A SCENARIO DISK             │
│                                     │
│                                     │
│  Copyright 1981 Sir-Tech Software   │
│  Version 1.0                        │
│                                     │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Title displayed prominently (platform-specific font/graphics)
- Minimal interface (only 2 options)
- May include animated logo or title effect (platform-dependent)
- Background may be static or animated

---

## Available Actions

### (S) Start the Game

**Description:** Begin playing or load existing save

**Key Binding:** S (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'S'
2. Check for existing save data
3. If save exists: Load game state
4. Transition to Castle Menu (or Camp if party was IN_MAZE)

**Validation:**

```typescript
function canStartGame(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always allowed
}
```

**State Changes:**
- `state.currentScene = SceneType.CASTLE_MENU` (or CAMP)
- Load save data if exists
- Initialize new game if no save

**UI Feedback:**
- Loading screen (optional)
- "Loading..." message (if save exists)

**Transitions:**
- → Castle Menu (if not IN_MAZE or no save)
- → Camp (if party was IN_MAZE)

---

### (M) Make a Scenario Disk

**Description:** Legacy option for creating game scenario disks (Apple II era)

**Key Binding:** M (case-insensitive)

**Requirements:**
- None (but non-functional in modern versions)

**Flow:**
1. User presses 'M'
2. Show scenario disk creation screen (legacy)
3. Modern implementation: Skip or show informational message

**Validation:**

```typescript
function canMakeScenarioDisk(state: GameState): { allowed: boolean; reason?: string } {
  // Legacy option - may not be implemented in modern versions
  return { allowed: false, reason: "Not available in this version" }
}
```

**State Changes:**
- None (legacy feature)

**UI Feedback:**
- "This feature is not available in this version."
- Return to Title Screen

**Transitions:**
- → Scenario Disk Screen (legacy only)
- → Title Screen (modern - after showing message)

**Note:** In modern implementations, this option can be:
- Removed entirely
- Grayed out
- Replaced with "Options" or "Settings"
- Kept for authenticity but non-functional

---

### Invalid Key

**Description:** User presses any other key

**Behavior:**
- Beep sound (optional)
- No error message (silent rejection)
- Remain on Title Screen

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Start Game | (S) | Castle Menu or Camp | Always |
| Make Scenario Disk | (M) | Scenario Screen (legacy) | Legacy only |

**Note:** This is a one-way screen. Once you (S)tart, you cannot return to Title Screen without exiting the application.

### Parent Scene

- None (application entry point)

### Child Scenes

- Title Screen → (S) → Castle Menu
- Title Screen → (S) → Camp (if party was IN_MAZE)
- Title Screen → (M) → Scenario Disk Screen (legacy)

---

## State Management

### Scene State

```typescript
interface TitleScreenState {
  mode: 'AWAITING_INPUT'
  lastInput: string | null
  saveDataDetected: boolean
}
```

**Notes:**
- Very simple state
- No user data loaded yet
- Only tracks input for menu selection

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.TITLE_SCREEN`
- No game data loaded yet
- Application initialized

**On Exit (Start Game):**
- Load save data if exists
- Initialize new game if no save
- Transition to Castle Menu or Camp

### Persistence

- **Auto-save:** No (nothing to save)
- **Manual save:** No (not available from Title Screen)
- **Safe zone:** Yes (no game state active)

---

## Implementation Notes

### Services Used

- `SceneNavigationService.transitionTo(SceneType.TITLE_SCREEN)`
- `SaveService.checkForSaveData()`
- `SaveService.loadGame()`
- `InputService.waitForSingleKeystroke()`

### Commands

- `StartGameCommand` - Load or initialize game
- `CreateScenarioDiskCommand` - Legacy feature (optional)

### Edge Cases

1. **No save data exists:**
   - Initialize new game
   - Create empty character roster
   - Set starting gold to 0
   - Transition to Castle Menu

2. **Corrupted save data:**
   - Show error message
   - Prompt: "Save data corrupted. Start new game? (Y/N)"
   - If Y: Initialize new game
   - If N: Return to Title Screen or exit

3. **Party was IN_MAZE:**
   - Load to Camp scene instead of Castle Menu
   - Preserve dungeon state (position, facing, level)
   - Allow player to continue or (C)astle to return to town

4. **Multiple save slots (modern enhancement):**
   - Show save slot selection screen
   - Allow player to choose which save to load
   - Display save slot info (date, party level, location)

### Technical Considerations

- **Platform-specific graphics:** Title may use custom fonts, images, or animations
- **Audio:** Title music or sound effects (optional)
- **Load time:** May need loading screen for large save files
- **Error handling:** Robust save data validation required

---

## Testing Scenarios

### Test 1: Fresh Install

```
1. Launch application for first time
2. Verify Title Screen appears
3. Verify no save data detected
4. Press (S) to start
5. Verify new game initialized
6. Verify Castle Menu loads with empty character roster
```

### Test 2: Load Existing Save

```
1. Launch application with existing save
2. Verify Title Screen appears
3. Press (S) to start
4. Verify save data loads
5. Verify Castle Menu loads with characters
6. Verify game state restored correctly
```

### Test 3: Load Save with Party IN_MAZE

```
1. Launch application with save where party is IN_MAZE
2. Press (S) to start
3. Verify Camp scene loads instead of Castle Menu
4. Verify dungeon position/facing preserved
5. Verify (C)astle option available to return to town
```

### Test 4: Corrupted Save Handling

```
1. Launch application with corrupted save data
2. Press (S) to start
3. Verify error message displays
4. Verify option to start new game
5. If start new game: verify clean initialization
```

---

## Related Documentation

- [Castle Menu](./01-castle-menu.md) - Primary destination
- [Camp](./09-camp.md) - Destination if party was IN_MAZE
- [Edge of Town](./07-edge-of-town.md) - Contains (L)eave Game option
- [Save System](../../systems/save-system.md) - Save data handling
- [Navigation Map](../navigation-map.md) - Complete navigation flow
