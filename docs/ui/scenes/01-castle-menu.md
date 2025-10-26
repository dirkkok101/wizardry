# Castle Menu

## Overview

**Description:** Central hub for all town services and dungeon access. First screen shown after starting a new game or loading a saved game.

**Scene Type:** Safe Zone (auto-saves on entry)

**Location in Game Flow:** Primary navigation hub - all town services branch from here

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Title Screen → (S)tart Game → Castle Menu
- Any Town Service → (L)eave → Castle Menu
- Edge of Town → (C)astle → Castle Menu

**On First Launch:**
- New game starts here
- Load game returns here (if not IN_MAZE)

### Requirements

**State Requirements:**
- [ ] Party must NOT be IN_MAZE status
- [ ] Valid save data (for loaded games)

**Note:** If party is IN_MAZE, game loads to Camp scene instead.

### State Prerequisites

```typescript
interface CastleMenuEntryState {
  partyInMaze: boolean  // Must be false
  gameLoaded: boolean   // True if loading save
  characters: Character[] // May be empty for new game
}
```

---

## UI Layout

### Screen Regions

- **Header:** "CASTLE" title
- **Main:** Empty area (no party display in original)
- **Menu:** Service options (G/T/B/A/E)
- **Status:** Not shown (optional in remake)
- **Messages:** Feedback for invalid selections

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  CASTLE                             │
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  (G)ILGAMESH'S TAVERN               │
│  (T)EMPLE OF CANT                   │
│  (B)OLTAC'S TRADING POST            │
│  (A)DVENTURER'S INN                 │
│  (E)DGE OF TOWN                     │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Minimal design (very clean)
- No party roster shown (unlike Tavern/Camp)
- Menu-only interface
- Single-keystroke selection (no Enter needed)

---

## Available Actions

### (G) Gilgamesh's Tavern

**Description:** Form and manage party roster

**Key Binding:** G (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'G'
2. Validate key (always succeeds)
3. Transition to Tavern scene

**Validation:**

```typescript
function canEnterTavern(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.TAVERN`
- Auto-save before transition

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Gilgamesh's Tavern

---

### (T) Temple of Cant

**Description:** Heal wounds, cure ailments, resurrect dead

**Key Binding:** T (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'T'
2. Validate key (always succeeds)
3. Transition to Temple scene

**Validation:**

```typescript
function canEnterTemple(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.TEMPLE`
- Auto-save before transition

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Temple of Cant

---

### (B) Boltac's Trading Post

**Description:** Buy and sell equipment

**Key Binding:** B (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'B'
2. Validate key (always succeeds)
3. Transition to Shop scene

**Validation:**

```typescript
function canEnterShop(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.SHOP`
- Auto-save before transition

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Boltac's Trading Post

---

### (A) Adventurer's Inn

**Description:** Rest to restore spell points and level up characters

**Key Binding:** A (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'A'
2. Validate key (always succeeds)
3. Transition to Inn scene

**Validation:**

```typescript
function canEnterInn(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.INN`
- Auto-save before transition

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Adventurer's Inn

---

### (E) Edge of Town

**Description:** Gateway to Training Grounds, dungeon, and system utilities

**Key Binding:** E (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'E'
2. Validate key (always succeeds)
3. Transition to Edge of Town scene

**Validation:**

```typescript
function canEnterEdgeOfTown(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.EDGE_OF_TOWN`
- Auto-save before transition

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Edge of Town

---

### Invalid Key

**Description:** User presses any other key

**Behavior:**
- Beep sound (optional)
- Error message: "INVALID SELECTION"
- Remain in Castle Menu

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Gilgamesh's Tavern | (G) | Tavern | Always |
| Temple of Cant | (T) | Temple | Always |
| Boltac's Trading Post | (B) | Shop | Always |
| Adventurer's Inn | (A) | Inn | Always |
| Edge of Town | (E) | Edge of Town | Always |

**Note:** No (L)eave option - Castle Menu has no parent scene except Title Screen (which is one-way)

### Parent Scene

- Title Screen → (S) → Castle Menu (one-way, cannot return to Title)

### Child Scenes

- Castle Menu → (G) → Tavern
- Castle Menu → (T) → Temple
- Castle Menu → (B) → Shop
- Castle Menu → (A) → Inn
- Castle Menu → (E) → Edge of Town

---

## State Management

### Scene State

```typescript
interface CastleMenuState {
  mode: 'MAIN_MENU'  // Only one mode
  lastInput: string | null
  errorMessage: string | null
}
```

**Notes:**
- Very simple state (no sub-menus)
- Only tracks last input for error handling

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.CASTLE_MENU`
- Auto-save triggered
- Clear any temporary dungeon state (if returning from Edge of Town)

**On Exit:**
- Save state before transitioning to child scene

### Persistence

- **Auto-save:** Yes, on entry to Castle Menu
- **Manual save:** No (must use Edge of Town → Leave Game)
- **Safe zone:** Yes (party not at risk)

---

## Implementation Notes

### Services Used

- `SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)`
- `SaveService.autoSave(state)`
- `InputService.waitForSingleKeystroke()`

### Commands

- `NavigateToTavernCommand` - Transition to Tavern
- `NavigateToTempleCommand` - Transition to Temple
- `NavigateToShopCommand` - Transition to Shop
- `NavigateToInnCommand` - Transition to Inn
- `NavigateToEdgeOfTownCommand` - Transition to Edge of Town

### Edge Cases

1. **First time player (no characters):**
   - All options available
   - Most services will show "NO CHARACTERS" message
   - Player should go to Edge of Town → Training Grounds first

2. **Party in maze (should never happen):**
   - State validation prevents entry
   - Game should load to Camp instead

3. **Rapid key presses:**
   - Queue inputs or ignore until transition completes
   - Prevent double-navigation

### Technical Considerations

- **Single keystroke input:** No buffering, immediate response
- **Case-insensitive:** Accept both 'G' and 'g'
- **Auto-save reliability:** Must complete before transition
- **Scene transition animations:** Optional fade/transition effect

---

## Testing Scenarios

### Test 1: New Game Flow
```
1. Start new game
2. Verify Castle Menu appears
3. Verify all 5 options shown (G/T/B/A/E)
4. Verify no characters exist yet
5. Press each key to verify transitions work
```

### Test 2: Return from Services
```
1. From Castle Menu, press (G)
2. Verify Tavern loads
3. Press (L)eave in Tavern
4. Verify returns to Castle Menu
5. Repeat for (T), (B), (A), (E)
```

### Test 3: Auto-save
```
1. Load saved game to Castle Menu
2. Verify save timestamp updates
3. Navigate to Tavern
4. Verify save persists (check save file)
```

### Test 4: Invalid Input
```
1. At Castle Menu, press 'X' (invalid)
2. Verify error message appears
3. Verify remains in Castle Menu
4. Press valid key (G)
5. Verify transitions normally
```

---

## Related Documentation

- [Title Screen](./00-title-screen.md) - Parent scene (one-way)
- [Gilgamesh's Tavern](./03-gilgameshs-tavern.md) - Party formation
- [Temple of Cant](./05-temple-of-cant.md) - Healing services
- [Boltac's Trading Post](./04-boltacs-trading-post.md) - Shopping
- [Adventurer's Inn](./06-adventurers-inn.md) - Rest and level up
- [Edge of Town](./07-edge-of-town.md) - Dungeon gateway
- [Navigation Map](../navigation-map.md) - Complete navigation flow
