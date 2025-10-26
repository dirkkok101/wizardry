# Utilities Menu

## Overview

**Description:** System utilities for character name changes and party recovery. Provides administrative functions not available elsewhere.

**Scene Type:** Safe Zone (auto-saves after operations)

**Location in Game Flow:** Accessed via Edge of Town - system/admin functions

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Edge of Town → (U)tilities → Utilities Menu

**Access Pattern:**
- Castle Menu → Edge of Town → Utilities
- Cannot access directly from Castle

### Requirements

**State Requirements:**
- [ ] None (always accessible from Edge of Town)

**Note:** Utilities provide critical recovery functions (restart OUT parties) and character management (rename).

### State Prerequisites

```typescript
interface UtilitiesEntryState {
  characterRoster: Character[]  // All characters
  parties: Party[]  // All parties (including OUT)
}
```

---

## UI Layout

### Screen Regions

- **Header:** "UTILITIES" title
- **Main:** Menu options
- **Sidebar:** Context info (characters, parties)
- **Status:** Operation results
- **Messages:** Feedback for operations

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  UTILITIES                          │
├─────────────────────────────────────┤
│                                     │
│  (C)HANGE NAME                      │
│  (R)ESTART AN "OUT" PARTY           │
│  (L)EAVE                            │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  Select an option...                │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Simple two-option menu
- Minimal interface (admin functions)
- Context-specific prompts based on action
- Results displayed in main area

---

## Available Actions

### (C) Change Name

**Description:** Rename any character in the roster

**Key Binding:** C (case-insensitive)

**Requirements:**
- At least one character exists in roster

**Flow:**
1. User presses 'C'
2. Display list of all characters
3. Prompt: "Change name of which character? (Name or letter)"
4. User selects character
5. Prompt: "Enter new name (15 characters max):"
6. User types new name
7. Validate name (length, characters)
8. Update character name
9. Show confirmation
10. Return to Utilities menu

**Character Selection Display:**

```
SELECT CHARACTER TO RENAME:

A. Gandalf      Mage    5   OK
B. Corak        Fight   4   OK
C. Thief        Thief   3   IN MAZE
D. PriestBob    Priest  4   DEAD

Enter letter or name:
```

**Name Validation:**

```typescript
function validateNewName(name: string): { valid: boolean; reason?: string } {
  if (name.length === 0) {
    return { valid: false, reason: "Name cannot be empty" }
  }

  if (name.length > 15) {
    return { valid: false, reason: "Name too long (max 15 characters)" }
  }

  const validChars = /^[A-Za-z0-9 \-']+$/
  if (!validChars.test(name)) {
    return { valid: false, reason: "Name contains invalid characters" }
  }

  return { valid: true }
}
```

**Validation:**

```typescript
function canChangeName(roster: Character[], selection: string): { allowed: boolean; reason?: string } {
  if (roster.length === 0) {
    return { allowed: false, reason: "No characters in roster" }
  }

  const character = findCharacter(roster, selection)
  if (!character) {
    return { allowed: false, reason: "Character not found" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.name = newName`
- Auto-save after rename

**UI Feedback:**
- Success: "[OldName] renamed to [NewName]"
- Failure: "Character not found"
- Failure: "Invalid name"

**Transitions:**
- Remains in Utilities Menu (can rename more characters)

**Use Cases:**
- Fix typos in character names
- Rename characters for roleplay
- Distinguish similar character names
- Personalize character names

---

### (R) Restart an "OUT" Party

**Description:** Recover party that quit in dungeon, moving them back to Castle

**Key Binding:** R (case-insensitive)

**Requirements:**
- At least one party marked as OUT
- Party members marked as IN_MAZE with OUT status

**Flow:**
1. User presses 'R'
2. Check for parties marked OUT
3. If found:
   a. Display OUT party details
   b. Prompt: "Restart this party? (Y/N)"
   c. If Y:
      - Set all party members status to OK
      - Set party.inMaze = false
      - Move party to Castle
      - Clear dungeon position
   d. Show confirmation
4. If not found:
   a. Show "No OUT parties found"
5. Return to Utilities menu

**OUT Party Detection:**

```typescript
function findOutParties(roster: Character[]): Party[] {
  // Find characters marked as IN_MAZE but not in active dungeon run
  const outCharacters = roster.filter(c =>
    c.status === CharacterStatus.OUT ||
    (c.inMaze && !isInActiveDungeon(c))
  )

  // Group by party ID
  return groupIntoParties(outCharacters)
}
```

**OUT Party Display:**

```
OUT PARTY FOUND:

1. Gandalf      Mage    5   OUT
2. Corak        Fight   4   OUT
3. Thief        Thief   3   OUT

Last known position: Level 4 (10, 15)

Restart this party? (Y/N)
```

**Validation:**

```typescript
function canRestartParty(parties: Party[]): { allowed: boolean; reason?: string } {
  const outParties = parties.filter(p => p.status === PartyStatus.OUT)

  if (outParties.length === 0) {
    return { allowed: false, reason: "No OUT parties found" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.status = CharacterStatus.OK` (for each member)
- `party.inMaze = false`
- `party.status = PartyStatus.IN_CASTLE`
- Clear dungeon position (level, x, y, facing)
- Auto-save after restart

**UI Feedback:**
- Success: "Party restarted and returned to Castle"
- Failure: "No OUT parties found"
- Confirmation: "Restart this party? (Y/N)"

**Transitions:**
- Remains in Utilities Menu

**Use Cases:**
- Recover party that used (Q)uit in dungeon
- Rescue party after game crash/corruption
- Emergency party recovery
- Move stranded party back to safety

**Note:** This is the only way to recover a party marked OUT. Without this function, characters would be permanently stuck in dungeon.

---

### (L) Leave Utilities

**Description:** Return to Edge of Town

**Key Binding:** L (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'L'
2. Auto-save if changes were made
3. Transition to Edge of Town

**Validation:**

```typescript
function canLeaveUtilities(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always allowed
}
```

**State Changes:**
- `state.currentScene = SceneType.EDGE_OF_TOWN`
- Auto-save before transition (if changes made)

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
- Remain in Utilities Menu

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Change Name | (C) | Name Change Flow | Has characters |
| Restart Party | (R) | Restart Flow | Has OUT party |
| Leave | (L) | Edge of Town | Always |

### Parent Scene

- Edge of Town → (U) → Utilities Menu

### Child Scenes

- Utilities → (C/R) → Utilities (same scene, updated)
- Utilities → (L) → Edge of Town

---

## State Management

### Scene State

```typescript
interface UtilitiesState {
  mode: 'MAIN_MENU' | 'CHANGING_NAME' | 'RESTARTING_PARTY'
  selectedCharacter: Character | null
  selectedParty: Party | null
  lastInput: string | null
  errorMessage: string | null
}
```

**Notes:**
- Simple utility state
- Modal flows for each operation
- Auto-save after changes

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.UTILITIES`
- Load character roster
- Detect OUT parties

**On Change Name:**
- Update character name
- Auto-save

**On Restart Party:**
- Update character statuses
- Clear dungeon state
- Auto-save

**On Exit:**
- Save any pending changes
- Transition to Edge of Town

### Persistence

- **Auto-save:** Yes, after each operation
- **Manual save:** No (auto-saves are sufficient)
- **Safe zone:** Yes (no risk to characters)

---

## Implementation Notes

### Services Used

- `CharacterService.renameCharacter(id, newName)`
- `PartyService.findOutParties(roster)`
- `PartyService.restartParty(party)`
- `SaveService.autoSave(state)`

### Commands

- `ChangeNameCommand` - Rename character
- `RestartPartyCommand` - Recover OUT party
- `LeaveUtilitiesCommand` - Return to Edge of Town

### Edge Cases

1. **No characters in roster:**
   - (C)hange Name shows "No characters to rename"
   - Only (L)eave available
   - Should create characters at Training Grounds first

2. **No OUT parties:**
   - (R)estart shows "No OUT parties found"
   - Normal state (parties in Castle or actively adventuring)

3. **Character in active party:**
   - Can still rename (no restriction)
   - Name change applies immediately
   - Party roster updates

4. **Character in dungeon (not OUT):**
   - Can rename
   - Name change applies
   - Doesn't affect dungeon state

5. **Duplicate names:**
   - Original game allowed duplicates
   - Modern implementation may enforce unique names (design choice)

6. **Multiple OUT parties:**
   - If multiple parties marked OUT
   - Prompt to select which party to restart
   - Or restart all at once (design choice)

7. **OUT party with dead members:**
   - Restart still works
   - Dead characters remain dead (must visit Temple)
   - Only clears OUT status and dungeon position

### Technical Considerations

- **Name validation:** Length limits, character restrictions
- **OUT detection:** Check party status and dungeon state
- **Restart safety:** Clear all dungeon-related state
- **Auto-save timing:** After each successful operation
- **Character list display:** Alphabetical or by creation order

---

## Testing Scenarios

### Test 1: Change Character Name

```
1. From Edge of Town, press (U)
2. Verify Utilities Menu loads
3. Press (C) to change name
4. View character list
5. Select character by letter or name
6. Enter new name (valid)
7. Verify name updated
8. Verify auto-save triggered
9. Verify confirmation message
10. Verify return to Utilities Menu
```

### Test 2: Invalid Name Validation

```
1. At Utilities, press (C)
2. Select character
3. Enter empty name
4. Verify error: "Name cannot be empty"
5. Enter name > 15 characters
6. Verify error: "Name too long"
7. Enter name with special chars (@#$%)
8. Verify error: "Invalid characters"
9. Enter valid name
10. Verify success
```

### Test 3: Restart OUT Party

```
1. Party in dungeon
2. Use (Q)uit in maze
3. Party marked as OUT
4. Navigate to Utilities
5. Press (R) to restart
6. Verify OUT party displayed
7. Confirm restart (Y)
8. Verify party moved to Castle
9. Verify character statuses updated to OK
10. Verify auto-save triggered
```

### Test 4: No OUT Parties

```
1. All parties in Castle or actively adventuring
2. Navigate to Utilities
3. Press (R) to restart
4. Verify message: "No OUT parties found"
5. Verify return to Utilities Menu
6. No changes made
```

### Test 5: Leave Utilities

```
1. At Utilities Menu, press (L)
2. Verify auto-save if changes made
3. Verify Edge of Town loads
4. Verify can return to Utilities via (U)
```

---

## Related Documentation

- [Edge of Town](./07-edge-of-town.md) - Parent scene
- [Training Grounds](./02-training-grounds.md) - Character creation
- [Camp](./09-camp.md) - Where parties can (Q)uit
- [Party System](../../systems/party-system.md) - Party status
- [Save System](../../systems/save-system.md) - OUT party recovery
- [Navigation Map](../navigation-map.md) - Complete navigation flow
