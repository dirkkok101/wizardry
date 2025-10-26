# Camp

## Overview

**Description:** Pre-dungeon preparation area where party can reorganize, inspect members, equip items, and prepare before entering the maze proper. Serves as the safe entry/exit point for dungeon exploration.

**Scene Type:** Dungeon Zone (no auto-save, but no random encounters)

**Location in Game Flow:** Gateway between town and maze - first screen when entering dungeon, return point from maze

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Edge of Town → (M)aze → Camp
- Maze → (C)amp → Camp
- Combat → Victory → Maze → (C)amp → Camp

**Entry Patterns:**
- **New dungeon run:** From Edge of Town, party enters at default position
- **Return from maze:** Player presses (C) while exploring
- **Load game:** If party was IN_MAZE, loads to Camp

### Requirements

**State Requirements:**
- [ ] Party formed (1-6 members)
- [ ] All party members OK or WOUNDED (not DEAD/ASHES/LOST)
- [ ] Party.inMaze = true

**Note:** Camp is the transition point. Party marked IN_MAZE but not yet actively exploring.

### State Prerequisites

```typescript
interface CampEntryState {
  party: Party  // Must have 1-6 members
  inMaze: boolean  // true
  dungeonPosition: Position | null  // null if new entry, set if returning
  dungeonLevel: number  // 1 if new, current if returning
}
```

---

## UI Layout

### Screen Regions

- **Header:** "CAMP" title, dungeon level indicator
- **Main:** Party roster (6 positions)
- **Menu:** Action options (#/R/E/L/Q)
- **Status:** Character HP, status, equipment summary
- **Messages:** Feedback for operations

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  CAMP - DUNGEON LEVEL 1             │
├─────────────────────────────────────┤
│  PARTY:                             │
│  1. Gandalf    Mage   5   15/15 HP │
│  2. Corak      Fight  4   28/30 HP │
│  3. Thief      Thief  3    8/10 HP │
│  4. PriestBob  Priest 4   12/12 HP │
│  5. (Empty)                         │
│  6. (Empty)                         │
│                                     │
│  (#)INSPECT  (R)EORDER  (E)QUIP     │
│  (L)EAVE CAMP  (Q)UIT               │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  Ready to enter the maze...         │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Party roster always visible
- Position numbers (1-6) clearly marked
- HP and status for each member
- Clear indication of front row (1-3) vs back row (4-6)

---

## Available Actions

### (#) Inspect Party Member

**Description:** View detailed character sheet and perform actions

**Key Binding:** 1-6 (position number)

**Requirements:**
- Character exists at specified position

**Flow:**
1. User presses number key (1-6)
2. Validate character exists at position
3. Transition to Character Inspection screen (Camp mode)
4. Available actions in Inspection (full access):
   - (R)ead - View spell book
   - (S)pell - Cast spells (preparation spells like DUMAPIC, MALOR)
   - (U)se - Use items
   - (D)rop - Drop item permanently
   - (P)ool Gold - Add gold to party pool
   - (I)dentify - Identify items (Bishops only)
   - (E)quip - Change equipment
   - (T)rade - Trade items with party member
   - (L)eave - Return to Camp

**Validation:**

```typescript
function canInspectMember(party: Party, position: number): { allowed: boolean; reason?: string } {
  if (position < 1 || position > 6) {
    return { allowed: false, reason: "Invalid position (must be 1-6)" }
  }

  if (!party.members[position - 1]) {
    return { allowed: false, reason: "No character at that position" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.CHARACTER_INSPECTION`
- `state.inspectionMode = InspectionMode.CAMP`
- `state.selectedCharacter = party.members[position - 1]`

**UI Feedback:**
- Transition to Character Inspection screen
- Full action set available

**Transitions:**
- → Character Inspection (Camp mode - full access)
- → Camp (after (L)eave from inspection)

**Note:** Camp mode has FULL access to all character actions, including spell casting (for preparation spells).

---

### (R) Reorder Party

**Description:** Rearrange party formation for combat effectiveness

**Key Binding:** R (case-insensitive)

**Requirements:**
- At least one character in party

**Flow:**
1. User presses 'R'
2. Display current party order
3. Prompt: "Enter new order (e.g., 123456 or 321456):"
4. User enters 6 numbers (positions 1-6)
5. Validate input (6 unique numbers, 1-6 range)
6. Rearrange party members
7. Display new order
8. Return to Camp menu

**Reorder Input:**

```
CURRENT ORDER:
1. Gandalf    (Mage)
2. Corak      (Fighter)
3. Thief      (Thief)
4. PriestBob  (Priest)
5. (Empty)
6. (Empty)

Enter new order (1-4 for current members):
Example: 2143 (swap Gandalf and Corak)
```

**Validation:**

```typescript
function validateReorder(input: string, partySize: number): { valid: boolean; reason?: string } {
  // Remove spaces/dashes
  const cleaned = input.replace(/[\s\-]/g, '')

  // Must have exactly partySize digits
  if (cleaned.length !== partySize) {
    return { valid: false, reason: `Must specify ${partySize} positions` }
  }

  // All must be valid position numbers
  const positions = cleaned.split('').map(Number)
  const validRange = positions.every(p => p >= 1 && p <= partySize)
  if (!validRange) {
    return { valid: false, reason: "Invalid position number" }
  }

  // All must be unique (no duplicates)
  const unique = new Set(positions).size === positions.length
  if (!unique) {
    return { valid: false, reason: "Duplicate positions not allowed" }
  }

  return { valid: true }
}

function reorderParty(party: Party, newOrder: number[]): void {
  const originalMembers = [...party.members]
  newOrder.forEach((oldPos, newIndex) => {
    party.members[newIndex] = originalMembers[oldPos - 1]
  })
}
```

**State Changes:**
- `party.members` rearranged according to input
- No save (in dungeon zone)

**UI Feedback:**
- Success: "Party reordered"
- Display new order
- Failure: "Invalid order"

**Transitions:**
- Remains in Camp

**Tactical Considerations:**
- **Front row (1-3):** Can attack and be attacked in melee
- **Back row (4-6):** Cannot melee attack (unless using reach weapons), protected from melee
- **Optimal formation:**
  - Front: Fighters, Lords, Samurai (high HP, good AC)
  - Back: Mages, Priests, Bishops (spellcasters, support)
  - Thieves: Either row (depends on build)

---

### (E) Equip Party

**Description:** Quick equipment management for all party members

**Key Binding:** E (case-insensitive)

**Requirements:**
- At least one character in party

**Flow:**
1. User presses 'E'
2. For each party member:
   a. Display character name and current equipment
   b. Show unequipped items
   c. Allow equip/unequip actions
   d. Move to next character
3. Return to Camp menu

**Equipment Display:**

```
EQUIPPING: Gandalf

EQUIPPED:
1. Staff (Weapon)
2. Robe (Armor)

UNEQUIPPED:
3. Dagger
4. Potion of Healing

(E)quip item  (U)nequip item  (N)ext character  (D)one
```

**Validation:**

```typescript
function canEquip(character: Character, item: Item): { allowed: boolean; reason?: string } {
  if (item.equipped) {
    return { allowed: false, reason: "Item already equipped" }
  }

  if (!item.canBeUsedBy(character.class)) {
    return { allowed: false, reason: "Cannot use this item" }
  }

  if (!item.canBeUsedBy(character.alignment)) {
    return { allowed: false, reason: "Alignment prevents using this item" }
  }

  // Check if slot occupied
  const slot = item.equipmentSlot
  if (character.equipment[slot] && !character.equipment[slot].cursed) {
    return { allowed: true, warning: "Will unequip current item in this slot" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `item.equipped` toggled
- `character.equipment[slot]` updated
- Recalculate character AC, damage, stats
- No save (in dungeon zone)

**UI Feedback:**
- Success: "[Item] equipped"
- Success: "[Item] unequipped"
- Failure: "Cannot equip cursed item"
- Failure: "Cannot use this item"

**Transitions:**
- Remains in Camp (cycles through party members)

---

### (L) Leave Camp (Enter Maze)

**Description:** Exit Camp and enter the maze proper for exploration

**Key Binding:** L (case-insensitive)

**Requirements:**
- Party ready (at least 1 member)
- All members OK or WOUNDED (not DEAD)

**Flow:**
1. User presses 'L'
2. Validate party readiness
3. If new entry: Set starting position (Level 1, 0, 0, North)
4. If returning: Load saved position
5. Transition to Maze (exploration mode)

**Validation:**

```typescript
function canEnterMaze(party: Party): { allowed: boolean; reason?: string } {
  if (party.members.length === 0) {
    return { allowed: false, reason: "Party is empty" }
  }

  const hasDeadMembers = party.members.some(m =>
    m.status === CharacterStatus.DEAD ||
    m.status === CharacterStatus.ASHES ||
    m.status === CharacterStatus.LOST
  )

  if (hasDeadMembers) {
    return { allowed: false, reason: "Some party members are dead" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.MAZE`
- If new entry: `state.position = {level: 1, x: 0, y: 0, facing: 'N'}`
- If returning: Load saved position
- `party.inMaze = true` (already set)
- No save (entering dangerous zone)

**UI Feedback:**
- Success: Transition to maze exploration
- Failure: "Some party members are dead"

**Transitions:**
- → Maze (exploration mode)

**Note:** This is the point of no return. Entering maze means no auto-saves until returning to town.

---

### (Q) Quit and Mark OUT

**Description:** Emergency exit - save party as OUT and return to town

**Key Binding:** Q (case-insensitive)

**Requirements:**
- None (always available - emergency function)

**Flow:**
1. User presses 'Q'
2. Prompt: "Quit and mark party OUT? (Y/N)"
3. Warning: "Party will be stranded. Use Utilities to restart."
4. If Y:
   a. Mark party as OUT
   b. Set character statuses to OUT
   c. Save current dungeon position
   d. Transition to Edge of Town
5. If N:
   a. Return to Camp menu

**Validation:**

```typescript
function canQuit(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always allowed (emergency exit)
}
```

**State Changes:**
- `party.status = PartyStatus.OUT`
- `character.status = CharacterStatus.OUT` (for each member)
- Save dungeon position (level, x, y, facing)
- `state.currentScene = SceneType.EDGE_OF_TOWN`
- **Save game state** (only save during dungeon run)

**UI Feedback:**
- Prompt: "Quit and mark party OUT? (Y/N)"
- Warning: "Party will be stranded in dungeon"
- Success: "Party marked OUT. Use Utilities to restart."

**Transitions:**
- → Edge of Town (if confirmed)
- → Camp (if cancelled)

**Use Cases:**
- Emergency exit when party in trouble
- Save progress mid-dungeon run
- Quit game while in dungeon

**Recovery:**
- Must use Utilities → Restart OUT Party
- Moves party back to Castle
- Clears OUT status
- Loses dungeon progress

**Note:** This is the ONLY way to save while in dungeon. But it comes with a penalty (party marked OUT).

---

### Invalid Key

**Description:** User presses any other key

**Behavior:**
- Beep sound (optional)
- Error message: "INVALID SELECTION"
- Remain in Camp

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Inspect Member | 1-6 | Character Inspection | Character at position |
| Reorder | (R) | Camp (updated) | Has members |
| Equip | (E) | Equipment Flow | Has members |
| Leave Camp | (L) | Maze | Party ready |
| Quit | (Q) | Edge of Town | Always (emergency) |

### Parent Scene

- Edge of Town → (M) → Camp
- Maze → (C) → Camp

### Child Scenes

- Camp → (#) → Character Inspection (Camp mode)
- Camp → (R/E) → Camp (same scene, updated)
- Camp → (L) → Maze
- Camp → (Q) → Edge of Town (marks OUT)

---

## State Management

### Scene State

```typescript
interface CampState {
  mode: 'MAIN_MENU' | 'INSPECTING' | 'REORDERING' | 'EQUIPPING' | 'CONFIRMING_QUIT'
  selectedCharacter: Character | null
  equipmentIndex: number  // For (E)quip flow
  lastInput: string | null
  errorMessage: string | null
}
```

**Notes:**
- Multiple modes for different flows
- Character inspection is separate scene
- No auto-save (dungeon zone)

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.CAMP`
- `party.inMaze = true`
- Load or initialize dungeon position

**On Inspect:**
- Transition to Character Inspection (full access mode)

**On Reorder:**
- Update party member positions
- No save

**On Equip:**
- Update character equipment
- Recalculate stats
- No save

**On Leave (Enter Maze):**
- Transition to Maze exploration
- No save (entering dangerous zone)

**On Quit:**
- Mark party OUT
- Save game state
- Transition to Edge of Town

### Persistence

- **Auto-save:** NO (dungeon zone - no auto-saves)
- **Manual save:** YES, via (Q)uit only (marks party OUT)
- **Safe zone:** Partially (no random encounters, but no saves)

---

## Implementation Notes

### Services Used

- `PartyService.reorderParty(party, newOrder)`
- `EquipmentService.equipItem(character, item)`
- `EquipmentService.unequipItem(character, item)`
- `DungeonService.initializePosition(party)` (for new entry)
- `SaveService.saveWithOUTStatus(state)` (for Quit)

### Commands

- `InspectMemberCommand` - View character details
- `ReorderPartyCommand` - Rearrange formation
- `EquipPartyCommand` - Manage equipment
- `EnterMazeCommand` - Start exploration
- `QuitAndMarkOUTCommand` - Emergency exit

### Edge Cases

1. **Empty party:**
   - Should never happen (validated at Edge of Town)
   - If somehow occurs, block (L)eave
   - Force (Q)uit to exit

2. **Dead party members:**
   - Block (L)eave to maze
   - Must (Q)uit and resurrect at Temple
   - Or continue with fewer members (if removed)

3. **First time in dungeon:**
   - Initialize starting position (Level 1, 0, 0, North)
   - Show tutorial messages (optional)

4. **Returning from maze:**
   - Load saved position
   - Party formation preserved
   - HP/status preserved

5. **Quit from Camp (not maze):**
   - Marks party OUT even if at entrance
   - Still requires Utilities → Restart
   - Design decision: consistent behavior

6. **Character inspection spell casting:**
   - Can cast preparation spells (DUMAPIC, MALOR)
   - Cannot cast combat spells (no targets)
   - Spell points consumed

7. **Trading between members:**
   - Available via (T)rade in Character Inspection
   - Useful for redistributing items before entering maze

### Technical Considerations

- **Formation validation:** Front/back row positions
- **Equipment recalculation:** AC, damage, stats updated immediately
- **Quit safety:** Always available (escape hatch)
- **Position initialization:** Default starting point for new entries
- **State preservation:** Save position when quitting

---

## Testing Scenarios

### Test 1: Enter Maze for First Time

```
1. Form party at Tavern
2. Navigate to Edge of Town
3. Press (M) to enter maze
4. Verify Camp loads
5. Verify party displayed
6. Verify starting position (Level 1, 0, 0, North)
7. Press (L) to leave camp
8. Verify Maze loads with starting position
```

### Test 2: Reorder Party Formation

```
1. At Camp, press (R)
2. View current order
3. Enter new order (e.g., 2143)
4. Verify party reordered
5. Verify positions updated
6. Press (L) to enter maze
7. Verify formation applied in combat
```

### Test 3: Inspect and Equip

```
1. At Camp, press (1) to inspect first member
2. Verify Character Inspection loads (Camp mode)
3. Press (E) to equip
4. Change equipment
5. Press (L) to return to Camp
6. Verify equipment changes applied
7. Press (E) at Camp for quick equip
8. Verify all members can be equipped
```

### Test 4: Quit and Mark OUT

```
1. At Camp, press (Q)
2. Verify warning prompt
3. Confirm (Y)
4. Verify party marked OUT
5. Verify saved position
6. Verify return to Edge of Town
7. Navigate to Utilities
8. Press (R) to restart party
9. Verify party recovered
```

### Test 5: Return to Camp from Maze

```
1. Enter maze from Camp
2. Move around (W/A/D)
3. Press (C) to return to camp
4. Verify Camp loads
5. Verify position saved
6. Press (L) to re-enter maze
7. Verify same position restored
```

---

## Related Documentation

- [Edge of Town](./07-edge-of-town.md) - Entry point
- [Maze](./10-maze.md) - Exploration scene
- [Character Inspection](./13-character-inspection.md) - Detail view
- [Utilities Menu](./08-utilities-menu.md) - OUT party restart
- [Party System](../../systems/party-system.md) - Formation mechanics
- [Navigation Map](../navigation-map.md) - Complete navigation flow
