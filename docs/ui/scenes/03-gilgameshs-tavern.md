# Gilgamesh's Tavern

## Overview

**Description:** Party formation and management hub. The place to recruit characters into your adventuring party, remove members, redistribute gold, and inspect party members.

**Scene Type:** Safe Zone (auto-saves on party changes)

**Location in Game Flow:** Central party management - must form party here before adventuring

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Castle Menu → (G)ilgamesh's Tavern → Tavern

**Direct Access:**
- Accessible directly from Castle Menu
- One of the primary town services

### Requirements

**State Requirements:**
- [ ] None (always accessible from Castle)

**Note:** Can enter with or without existing party. Empty party is valid state.

### State Prerequisites

```typescript
interface TavernEntryState {
  currentParty: Party  // May be empty (0 members)
  characterRoster: Character[]  // All available characters
  maxPartySize: number  // Always 6
}
```

---

## UI Layout

### Screen Regions

- **Header:** "GILGAMESH'S TAVERN" title
- **Main:** Current party roster (6 slots)
- **Sidebar:** Available characters list
- **Menu:** Action options (A/R/D/#/L)
- **Status:** Party gold total
- **Messages:** Feedback for operations

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  GILGAMESH'S TAVERN                 │
├─────────────────────────────────────┤
│  CURRENT PARTY:          GOLD: 150  │
│  1. Gandalf    Mage   5   OK        │
│  2. Corak      Fight  4   OK        │
│  3. (Empty)                         │
│  4. (Empty)                         │
│  5. (Empty)                         │
│  6. (Empty)                         │
│                                     │
│  AVAILABLE CHARACTERS:              │
│  - Thief      (Thief 3, OK)         │
│  - PriestBob  (Priest 4, DEAD)      │
│  - WizardX    (Bishop 2, ASHES)     │
│                                     │
├─────────────────────────────────────┤
│  (A)DD  (R)EMOVE  (D)IVVY GOLD      │
│  (#)INSPECT  (L)EAVE                │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Party roster always visible (6 numbered slots)
- Available characters shown separately
- Party gold displayed prominently
- Character status indicators for each member

---

## Available Actions

### (A) Add Character to Party

**Description:** Recruit available character into party

**Key Binding:** A (case-insensitive)

**Requirements:**
- Party not full (< 6 members)
- At least one character available in roster
- Character status is OK (not IN MAZE, DEAD, etc.)

**Flow:**
1. User presses 'A'
2. Show list of available characters
3. Prompt: "Add which character? (Name)"
4. User types character name (partial match allowed)
5. Validate character eligibility
6. Check alignment compatibility
7. Add character to first empty slot
8. Update party roster display

**Alignment Rules:**
```
Good + Evil = INCOMPATIBLE (cannot party together)
Good + Neutral = COMPATIBLE
Evil + Neutral = COMPATIBLE
Neutral + Neutral = COMPATIBLE
Good + Good = COMPATIBLE
Evil + Evil = COMPATIBLE
```

**Validation:**

```typescript
function canAddCharacter(party: Party, character: Character): { allowed: boolean; reason?: string } {
  if (party.members.length >= 6) {
    return { allowed: false, reason: "Party is full" }
  }

  if (character.status !== CharacterStatus.OK) {
    return { allowed: false, reason: `${character.name} is ${character.status}` }
  }

  // Check alignment compatibility
  const hasGood = party.members.some(m => m.alignment === Alignment.GOOD)
  const hasEvil = party.members.some(m => m.alignment === Alignment.EVIL)

  if (hasGood && character.alignment === Alignment.EVIL) {
    return { allowed: false, reason: "Good and Evil cannot party together" }
  }

  if (hasEvil && character.alignment === Alignment.GOOD) {
    return { allowed: false, reason: "Good and Evil cannot party together" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `party.members.push(character)`
- `character.status = CharacterStatus.IN_PARTY`
- Auto-save after adding

**UI Feedback:**
- Success: "[Name] joins the party!"
- Failure: "Good and Evil cannot party together"
- Failure: "[Name] is not available (IN MAZE, DEAD, etc.)"

**Transitions:**
- Remains in Tavern (can add more members)

---

### (R) Remove Character from Party

**Description:** Remove character from party roster

**Key Binding:** R (case-insensitive)

**Requirements:**
- At least one character in party

**Flow:**
1. User presses 'R'
2. Prompt: "Remove which character? (1-6 or Name)"
3. User enters position number or name
4. Validate character exists at position
5. Remove character from party
6. Character status changes to OK
7. Update party roster display

**Validation:**

```typescript
function canRemoveCharacter(party: Party, positionOrName: string): { allowed: boolean; reason?: string } {
  if (party.members.length === 0) {
    return { allowed: false, reason: "Party is empty" }
  }

  const character = findCharacterByPositionOrName(party, positionOrName)
  if (!character) {
    return { allowed: false, reason: "Character not found in party" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `party.members.splice(index, 1)`
- `character.status = CharacterStatus.OK`
- Auto-save after removal

**UI Feedback:**
- Success: "[Name] leaves the party"
- Failure: "Character not found"
- Failure: "Party is empty"

**Transitions:**
- Remains in Tavern (can remove more members)

---

### (D) Divvy Gold

**Description:** Distribute party's pooled gold equally among all members

**Key Binding:** D (case-insensitive)

**Requirements:**
- At least one character in party
- Party gold > 0

**Flow:**
1. User presses 'D'
2. Calculate equal share: totalGold / partySize
3. Distribute gold to each member
4. Remainder distributed randomly or to first members
5. Clear party pool
6. Update display

**Calculation:**

```typescript
function divvyGold(party: Party): void {
  const totalGold = party.pooledGold
  const partySize = party.members.length
  const sharePerMember = Math.floor(totalGold / partySize)
  const remainder = totalGold % partySize

  party.members.forEach((member, index) => {
    member.gold += sharePerMember
    if (index < remainder) {
      member.gold += 1  // Distribute remainder
    }
  })

  party.pooledGold = 0
}
```

**Validation:**

```typescript
function canDivvyGold(party: Party): { allowed: boolean; reason?: string } {
  if (party.members.length === 0) {
    return { allowed: false, reason: "No party members to distribute to" }
  }

  if (party.pooledGold === 0) {
    return { allowed: false, reason: "No gold to distribute" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `party.pooledGold = 0`
- `character.gold += share` (for each member)
- Auto-save after distribution

**UI Feedback:**
- Success: "Gold distributed: [X] gold per member"
- Failure: "No gold to distribute"
- Failure: "No party members"

**Transitions:**
- Remains in Tavern

---

### (#) Inspect Party Member

**Description:** View detailed character sheet for party member

**Key Binding:** 1-6 (position number)

**Requirements:**
- Character exists at specified position

**Flow:**
1. User presses number key (1-6)
2. Validate character exists at position
3. Transition to Character Inspection screen (Tavern mode)
4. Available actions in Inspection:
   - (R)ead - View spell book
   - (D)rop - Drop item permanently
   - (P)ool Gold - Add gold to party pool
   - (I)dentify - Identify items (Bishops only)
   - (E)quip - Change equipment
   - (T)rade - Trade items with party member
   - (L)eave - Return to Tavern

**Validation:**

```typescript
function canInspectPartyMember(party: Party, position: number): { allowed: boolean; reason?: string } {
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
- `state.inspectionMode = InspectionMode.TAVERN`
- `state.selectedCharacter = party.members[position - 1]`

**UI Feedback:**
- Transition to Character Inspection screen
- Show full character details

**Transitions:**
- → Character Inspection (Tavern mode)
- → Tavern (after (L)eave from inspection)

---

### (L) Leave Tavern

**Description:** Return to Castle Menu

**Key Binding:** L (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'L'
2. Auto-save party state
3. Transition to Castle Menu

**Validation:**

```typescript
function canLeaveTavern(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always allowed
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

### Invalid Key

**Description:** User presses any other key

**Behavior:**
- Beep sound (optional)
- Error message: "INVALID SELECTION"
- Remain in Tavern

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Add Character | (A) | Tavern (updated) | Party not full |
| Remove Character | (R) | Tavern (updated) | Party not empty |
| Divvy Gold | (D) | Tavern (updated) | Party has gold |
| Inspect Member | 1-6 | Character Inspection | Character at position |
| Leave | (L) | Castle Menu | Always |

### Parent Scene

- Castle Menu → (G) → Tavern

### Child Scenes

- Tavern → (A/R/D) → Tavern (same scene, updated)
- Tavern → (#) → Character Inspection (Tavern mode)
- Tavern → (L) → Castle Menu

---

## State Management

### Scene State

```typescript
interface TavernState {
  mode: 'MAIN_MENU' | 'ADDING' | 'REMOVING' | 'INSPECTING'
  selectedCharacter: Character | null
  lastInput: string | null
  errorMessage: string | null
}
```

**Notes:**
- Mode changes based on action
- Character inspection is separate scene
- Party state persists globally

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.TAVERN`
- Load current party
- Load available characters

**On Add Character:**
- Update party members
- Update character status
- Auto-save

**On Remove Character:**
- Update party members
- Update character status
- Auto-save

**On Divvy Gold:**
- Distribute pooled gold
- Auto-save

**On Exit:**
- Save party state
- Transition to Castle Menu

### Persistence

- **Auto-save:** Yes, after party changes
- **Manual save:** No (auto-saves are sufficient)
- **Safe zone:** Yes (no risk to party)

---

## Implementation Notes

### Services Used

- `PartyService.addCharacter(party, character)`
- `PartyService.removeCharacter(party, character)`
- `PartyService.divvyGold(party)`
- `CharacterService.getAvailableCharacters(roster)`
- `SaveService.autoSave(state)`

### Commands

- `AddCharacterCommand` - Add to party
- `RemoveCharacterCommand` - Remove from party
- `DivvyGoldCommand` - Distribute gold
- `InspectPartyMemberCommand` - View character
- `LeaveTavernCommand` - Return to Castle

### Edge Cases

1. **Party full (6 members):**
   - Disable (A)dd option
   - Show "Party is full" message
   - Must remove member to add new one

2. **Empty party:**
   - (R)emove shows "Party is empty"
   - (D)ivvy shows "No party members"
   - (#)Inspect shows "No character at that position"

3. **No available characters:**
   - (A)dd shows "No characters available"
   - All characters may be IN MAZE, DEAD, or IN PARTY

4. **Alignment conflict:**
   - Cannot add Evil to party with Good members
   - Cannot add Good to party with Evil members
   - Neutral can mix with either

5. **Character in dungeon:**
   - Character marked IN MAZE cannot be added
   - Must wait for party to return or use Restart

6. **Dead character:**
   - Character with DEAD/ASHES status cannot be added
   - Must resurrect at Temple first

7. **Zero pooled gold:**
   - (D)ivvy shows "No gold to distribute"
   - Pooled gold accumulated from treasure, (P)ool action

### Technical Considerations

- **Party position:** Position matters for combat (front row 1-3, back row 4-6)
- **Alignment validation:** Must check before adding to party
- **Gold distribution:** Integer division with remainder handling
- **Auto-save timing:** After each party change
- **Character availability:** Real-time status check

---

## Testing Scenarios

### Test 1: Form New Party

```
1. From Castle Menu, press (G)
2. Verify Tavern loads with empty party
3. Press (A) to add character
4. Enter character name
5. Verify character added to position 1
6. Repeat to add more characters
7. Verify party roster updates
8. Verify auto-save after each addition
```

### Test 2: Alignment Conflict

```
1. Add Good character to empty party
2. Verify successful
3. Attempt to add Evil character
4. Verify error: "Good and Evil cannot party together"
5. Verify Evil character not added
6. Add Neutral character
7. Verify successful (Neutral compatible with Good)
```

### Test 3: Remove and Divvy Gold

```
1. Form party with 3 characters
2. Set party pooled gold to 100
3. Press (D) to divvy
4. Verify each character receives 33 gold
5. Verify 1 gold remainder distributed
6. Verify pooled gold now 0
7. Press (R) to remove character
8. Verify character removed
9. Verify character status changed to OK
```

### Test 4: Inspect Party Member

```
1. Form party with characters
2. Press (1) to inspect position 1
3. Verify Character Inspection screen loads
4. Verify Tavern mode actions available
5. Press (L) to leave inspection
6. Verify return to Tavern
```

### Test 5: Party Full

```
1. Add 6 characters to party
2. Verify party full
3. Press (A) to add character
4. Verify error: "Party is full"
5. Verify cannot add more characters
6. Press (R) to remove one
7. Verify can now add new character
```

---

## Related Documentation

- [Castle Menu](./01-castle-menu.md) - Parent scene
- [Character Inspection](./13-character-inspection.md) - Detail view
- [Training Grounds](./02-training-grounds.md) - Character creation
- [Party System](../../systems/party-system.md) - Party mechanics
- [Character Alignment](../../systems/character-system.md) - Alignment rules
- [Navigation Map](../navigation-map.md) - Complete navigation flow
