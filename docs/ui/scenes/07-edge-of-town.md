# Edge of Town

## Overview

**Description:** Gateway menu providing access to Training Grounds, dungeon entry, utilities, and game exit. Serves as the intermediate navigation hub between Castle and external locations.

**Scene Type:** Safe Zone (auto-saves on certain actions)

**Location in Game Flow:** Navigation gateway - cannot access Training Grounds or Maze directly from Castle

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Castle Menu → (E)dge of Town → Edge of Town
- Training Grounds → (L)eave → Edge of Town
- Utilities Menu → (L)eave → Edge of Town

**Return Pattern:**
- Most external locations return here via (L)eave

### Requirements

**State Requirements:**
- [ ] None (always accessible from Castle)

**Note:** This is a required intermediate screen. Cannot go directly from Castle to Training Grounds or Maze.

### State Prerequisites

```typescript
interface EdgeOfTownEntryState {
  currentParty: Party  // May be empty
  characterRoster: Character[]
  gameState: GameState
}
```

---

## UI Layout

### Screen Regions

- **Header:** "EDGE OF TOWN" title
- **Main:** Menu options
- **Sidebar:** Current party info (if any)
- **Status:** Party status indicators
- **Messages:** Navigation feedback

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  EDGE OF TOWN                       │
├─────────────────────────────────────┤
│                                     │
│  (T)RAINING GROUNDS                 │
│  (M)AZE                             │
│  (C)ASTLE                           │
│  (U)TILITIES                        │
│  (L)EAVE GAME                       │
│                                     │
│                                     │
│                                     │
│  CURRENT PARTY:                     │
│  1. Gandalf   Mage   5              │
│  2. Corak     Fight  4              │
│                                     │
├─────────────────────────────────────┤
│  Select an option...                │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Simple menu interface
- Shows current party roster if formed
- Gateway to dungeon and character management
- Exit point for saving and quitting

---

## Available Actions

### (T) Training Grounds

**Description:** Access character creation and roster management

**Key Binding:** T (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'T'
2. Validate key (always succeeds)
3. Transition to Training Grounds scene

**Validation:**

```typescript
function canEnterTrainingGrounds(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always available
}
```

**State Changes:**
- `state.currentScene = SceneType.TRAINING_GROUNDS`
- Auto-save before transition

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Training Grounds

---

### (M) Maze (Dungeon Entry)

**Description:** Enter the dungeon (via Camp scene)

**Key Binding:** M (case-insensitive)

**Requirements:**
- Party must be formed (1-6 characters)
- All party members must be OK or WOUNDED (not DEAD, ASHES, or LOST)

**Flow:**
1. User presses 'M'
2. Validate party exists and is healthy
3. If party IN_MAZE: Resume from saved position
4. If new entry: Start at dungeon entrance (Level 1, 0,0,N)
5. Transition to Camp scene

**Validation:**

```typescript
function canEnterMaze(party: Party): { allowed: boolean; reason?: string } {
  if (party.members.length === 0) {
    return { allowed: false, reason: "You need a party to enter the maze (visit Tavern)" }
  }

  const hasDeadMembers = party.members.some(m =>
    m.status === CharacterStatus.DEAD ||
    m.status === CharacterStatus.ASHES ||
    m.status === CharacterStatus.LOST
  )

  if (hasDeadMembers) {
    return { allowed: false, reason: "Some party members are dead (visit Temple)" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.CAMP`
- `party.inMaze = true`
- If new entry: Set starting position (Level 1, 0, 0, North)
- If resuming: Load saved position
- Auto-save before entering (last safe save point)

**UI Feedback:**
- Success: No message (instant transition)
- Failure: "You need a party to enter the maze"
- Failure: "Some party members are dead"

**Transitions:**
- → Camp (dungeon entry)

**Note:** This is the last auto-save before entering dangerous zone. No more auto-saves until returning to Castle.

---

### (C) Castle

**Description:** Return to Castle Menu (hub)

**Key Binding:** C (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'C'
2. Validate key (always succeeds)
3. Transition to Castle Menu

**Validation:**

```typescript
function canReturnToCastle(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always available
}
```

**State Changes:**
- `state.currentScene = SceneType.CASTLE_MENU`
- Auto-save before transition

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Castle Menu

---

### (U) Utilities

**Description:** Access system utilities (rename, restart party, etc.)

**Key Binding:** U (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'U'
2. Validate key (always succeeds)
3. Transition to Utilities Menu

**Validation:**

```typescript
function canEnterUtilities(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always available
}
```

**State Changes:**
- `state.currentScene = SceneType.UTILITIES`
- No save (utilities may modify state)

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Utilities Menu

---

### (L) Leave Game

**Description:** Save game and exit application

**Key Binding:** L (case-insensitive)

**Requirements:**
- Party must NOT be IN_MAZE (must exit dungeon first)

**Flow:**
1. User presses 'L'
2. Validate party is not in dungeon
3. Prompt: "Save and quit? (Y/N)"
4. If Y:
   a. Save game state
   b. Show "Game saved" message
   c. Exit application
5. If N:
   a. Return to Edge of Town menu

**Validation:**

```typescript
function canLeaveGame(party: Party): { allowed: boolean; reason?: string } {
  if (party.inMaze) {
    return {
      allowed: false,
      reason: "Cannot save while in maze. Use (Q)uit in maze to mark party as OUT."
    }
  }

  return { allowed: true }
}
```

**State Changes:**
- Save all game state to disk
- Exit application

**UI Feedback:**
- Prompt: "Save and quit? (Y/N)"
- Success: "Game saved. Goodbye!"
- Failure: "Cannot save while in maze"

**Transitions:**
- → Application Exit (if confirmed)
- → Edge of Town (if cancelled or blocked)

**Note:** This is the proper way to save and exit the game. Party must be safely in Castle (not in dungeon).

---

### Invalid Key

**Description:** User presses any other key

**Behavior:**
- Beep sound (optional)
- Error message: "INVALID SELECTION"
- Remain at Edge of Town

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Training Grounds | (T) | Training Grounds | Always |
| Maze | (M) | Camp | Party formed and healthy |
| Castle | (C) | Castle Menu | Always |
| Utilities | (U) | Utilities Menu | Always |
| Leave Game | (L) | Application Exit | Not IN_MAZE |

### Parent Scene

- Castle Menu → (E) → Edge of Town

### Child Scenes

- Edge of Town → (T) → Training Grounds
- Edge of Town → (M) → Camp
- Edge of Town → (C) → Castle Menu
- Edge of Town → (U) → Utilities Menu
- Edge of Town → (L) → Application Exit

---

## State Management

### Scene State

```typescript
interface EdgeOfTownState {
  mode: 'MAIN_MENU' | 'CONFIRMING_EXIT'
  lastInput: string | null
  errorMessage: string | null
}
```

**Notes:**
- Simple menu state
- Confirmation for exit action
- Gateway to multiple destinations

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.EDGE_OF_TOWN`
- Display current party status
- Auto-save (safe zone)

**On Maze Entry:**
- Set `party.inMaze = true`
- Auto-save (last save before dungeon)
- Transition to Camp

**On Leave Game:**
- Save entire game state
- Exit application

**On Other Transitions:**
- Auto-save before transition
- Update current scene

### Persistence

- **Auto-save:** Yes, on entry and before most transitions
- **Manual save:** Yes, via (L)eave Game
- **Safe zone:** Yes (no risk to party)

---

## Implementation Notes

### Services Used

- `SceneNavigationService.transitionTo(SceneType)`
- `SaveService.autoSave(state)`
- `SaveService.saveAndExit(state)`
- `PartyService.validateMazeEntry(party)`
- `InputService.waitForSingleKeystroke()`

### Commands

- `EnterTrainingGroundsCommand` - Transition to Training Grounds
- `EnterMazeCommand` - Enter dungeon via Camp
- `ReturnToCastleCommand` - Return to Castle Menu
- `EnterUtilitiesCommand` - Access utilities
- `SaveAndExitCommand` - Save game and exit application

### Edge Cases

1. **No party formed:**
   - (M)aze shows error: "You need a party"
   - Direct player to (T)raining Grounds or (C)astle → Tavern
   - Other options still available

2. **Party has dead members:**
   - (M)aze shows error: "Some party members are dead"
   - Direct player to (C)astle → Temple
   - Must resurrect before entering dungeon

3. **Party IN_MAZE:**
   - (L)eave Game blocked
   - Show error: "Cannot save while in maze"
   - Must use (Q)uit in maze or complete dungeon run

4. **Resuming from saved position:**
   - If party.inMaze = true on (M)aze entry
   - Load saved dungeon position
   - Go directly to Camp (not starting position)

5. **Cancel exit:**
   - User selects (L)eave but chooses 'N' on confirmation
   - Return to Edge of Town menu
   - No save performed

### Technical Considerations

- **Gateway pattern:** Required intermediate navigation hub
- **Last save point:** Auto-save before entering maze (critical!)
- **Exit validation:** Prevent save while IN_MAZE
- **Party validation:** Check party health before maze entry
- **Resume functionality:** Load saved position if party IN_MAZE

---

## Testing Scenarios

### Test 1: Navigate to Training Grounds

```
1. From Castle Menu, press (E)
2. Verify Edge of Town loads
3. Press (T)
4. Verify Training Grounds loads
5. Press (L) in Training Grounds
6. Verify returns to Edge of Town
```

### Test 2: Enter Maze with Valid Party

```
1. Form party at Tavern (healthy members)
2. Navigate to Edge of Town
3. Press (M)
4. Verify party validation passes
5. Verify auto-save triggered
6. Verify Camp scene loads
7. Verify party.inMaze = true
```

### Test 3: Enter Maze without Party

```
1. Ensure no party formed
2. Navigate to Edge of Town
3. Press (M)
4. Verify error: "You need a party"
5. Verify remains at Edge of Town
6. Verify Camp does not load
```

### Test 4: Save and Exit

```
1. Navigate to Edge of Town (party not IN_MAZE)
2. Press (L)
3. Verify prompt: "Save and quit? (Y/N)"
4. Press Y
5. Verify game saves
6. Verify application exits
7. Restart application
8. Verify game state restored
```

### Test 5: Cannot Save While IN_MAZE

```
1. Enter dungeon (party.inMaze = true)
2. Return to Castle via LOKTOFEIT spell or death
3. Navigate to Edge of Town
4. Press (L)
5. Verify error: "Cannot save while in maze"
6. Verify exit blocked
```

### Test 6: Return to Castle

```
1. At Edge of Town, press (C)
2. Verify auto-save triggered
3. Verify Castle Menu loads
4. Verify can navigate back to Edge of Town via (E)
```

---

## Related Documentation

- [Castle Menu](./01-castle-menu.md) - Parent scene
- [Training Grounds](./02-training-grounds.md) - Character management
- [Camp](./09-camp.md) - Dungeon entry point
- [Utilities Menu](./08-utilities-menu.md) - System utilities
- [Save System](../../systems/save-system.md) - Save mechanics
- [Navigation Map](../navigation-map.md) - Complete navigation flow
