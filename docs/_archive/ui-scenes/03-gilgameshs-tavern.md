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

**2-Column Grid Layout:**
- **Header:** Scene title with party gold display
- **Left Column:** Available characters (scrollable grid)
- **Right Column:** Party members with formation sections
- **Footer:** Horizontal navigation menu
- **Messages:** Toast notifications for actions (success/error)

### ASCII Mockup

```
┌─────────────────────────────────────────────────────────┐
│  GILGAMESH'S TAVERN        PARTY GOLD: 150 GP           │  ← Header
├──────────────────────────┬──────────────────────────────┤
│  AVAILABLE CHARACTERS    │  FRONT ROW:                  │
│                          │                              │
│  ┌────────────────────┐  │  ┌────────────────────────┐  │
│  │ Gandalf (Mage 5)   │  │  │ Corak (Fighter 4)      │  │
│  │ STR:12 INT:18      │  │  │ STR:18 INT:10          │  │
│  │ [Inspect] [Add]    │  │  │ [Inspect] [Remove]     │  │
│  └────────────────────┘  │  │ [▲ Move Up] [▼ Down]   │  │
│                          │  └────────────────────────┘  │
│  ┌────────────────────┐  │                              │
│  │ Thief (Thief 3)    │  │  ┌────────────────────────┐  │
│  │ STR:14 INT:12      │  │  │ Gandalf (Mage 5)       │  │
│  │ [Inspect] [Add]    │  │  │ STR:12 INT:18          │  │
│  └────────────────────┘  │  │ [Inspect] [Remove]     │  │
│                          │  │ [▲ Move Up] [▼ Down]   │  │
│  ┌────────────────────┐  │  └────────────────────────┘  │
│  │ PriestBob (Priest) │  │                              │
│  │ Status: DEAD       │  │  BACK ROW:                   │
│  │ [Inspect] [Add ✗]  │  │  (Empty)                     │
│  └────────────────────┘  │                              │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│  L: Return to Castle                                    │  ← Footer
└─────────────────────────────────────────────────────────┘
```

**Visual Notes:**
- Header displays scene title and party gold (shared pool)
- Left column shows all available characters (not in party, status OK)
- Right column shows party members organized by formation (front/back row)
- Each character card shows key stats and available actions
- Actions displayed as buttons (no letter commands)
- Move up/down buttons disabled for first/last positions
- Add button disabled for characters with non-OK status
- Footer provides horizontal navigation menu
- Toast messages appear at top for 3 seconds

---

## Available Actions

### Add Character to Party

**Description:** Recruit available character into party

**User Action:** Click [Add] button on character card in left column

**Requirements:**
- Party not full (< 6 members)
- Character status is OK (not IN MAZE, DEAD, etc.)

**Flow:**
1. User clicks [Add] button on character card
2. Validate character eligibility (alignment, status, party size)
3. Add character to party members array
4. Add to front row if space available (< 3), otherwise back row
5. Update party roster display
6. Show success toast message

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
- `party.members = [...party.members, characterId]`
- `party.formation.frontRow` or `party.formation.backRow` updated
- Immutable state update (new objects created)

**UI Feedback:**
- Success toast: "[Name] joined the party"
- Error toast: "Good and Evil cannot party together"
- Error toast: "Party is full (maximum 6 members)"
- Button disabled if character status is not OK

**Transitions:**
- Remains in Tavern (can add more members)

---

### Remove Character from Party

**Description:** Remove character from party roster

**User Action:** Click [Remove] button on character card in right column

**Requirements:**
- Character exists in party

**Flow:**
1. User clicks [Remove] button on character card
2. Remove character from party members array
3. Remove from formation (front row or back row)
4. Update party roster display
5. Show success toast message

**State Changes:**
- `party.members = party.members.filter(id => id !== characterId)`
- `party.formation.frontRow/backRow` updated (character removed)
- Immutable state update (new objects created)

**UI Feedback:**
- Success toast: "[Name] left the party"

**Transitions:**
- Remains in Tavern (can remove more members)

---

### Move Character Up

**Description:** Move character up in party order (swap with previous member)

**User Action:** Click [▲ Move Up] button on character card

**Requirements:**
- Character is not at position 1 (top of party)

**Flow:**
1. User clicks [▲ Move Up] button
2. Swap character with previous member in party.members array
3. Recalculate formation (first 3 → front row, next 3 → back row)
4. Update party roster display

**State Changes:**
- `party.members` array reordered (immutable swap)
- `party.formation` recalculated from new members order

**UI Feedback:**
- Character card moves up visually
- Button disabled if already at top

**Transitions:**
- Remains in Tavern

---

### Move Character Down

**Description:** Move character down in party order (swap with next member)

**User Action:** Click [▼ Move Down] button on character card

**Requirements:**
- Character is not at last position (bottom of party)

**Flow:**
1. User clicks [▼ Move Down] button
2. Swap character with next member in party.members array
3. Recalculate formation (first 3 → front row, next 3 → back row)
4. Update party roster display

**State Changes:**
- `party.members` array reordered (immutable swap)
- `party.formation` recalculated from new members order

**UI Feedback:**
- Character card moves down visually
- Button disabled if already at bottom

**Transitions:**
- Remains in Tavern

---

### Inspect Character

**Description:** View detailed character sheet

**User Action:** Click [Inspect] button on any character card

**Requirements:**
- None (available for any character)

**Flow:**
1. User clicks [Inspect] button on character card
2. Navigate to Character Inspection screen
3. Pass characterId and returnTo='tavern' as query params

**State Changes:**
- Route navigation to `/character-inspection?characterId=X&returnTo=tavern`

**UI Feedback:**
- Page transition to character inspection view

**Transitions:**
- → Character Inspection (with return route)
- → Tavern (via ESC or back button from inspection)

---

### Leave Tavern

**Description:** Return to Castle Menu

**User Action:** Press ESC key

**Requirements:**
- None (always available)

**Flow:**
1. User presses ESC key
2. Navigate to Castle Menu

**State Changes:**
- Route navigation to `/castle-menu`

**UI Feedback:**
- Instant page transition

**Transitions:**
- → Castle Menu

---

## Navigation

### Exits

| Action | Input | Destination | Condition |
|--------|-------|-------------|-----------|
| Add Character | Click [Add] | Tavern (updated) | Party not full, character OK |
| Remove Character | Click [Remove] | Tavern (updated) | Character in party |
| Move Up | Click [▲ Move Up] | Tavern (updated) | Not at top position |
| Move Down | Click [▼ Move Down] | Tavern (updated) | Not at bottom position |
| Inspect | Click [Inspect] | Character Inspection | Always |
| Leave | ESC key | Castle Menu | Always |

### Parent Scene

- Castle Menu → Tavern (via route navigation)

### Child Scenes

- Tavern → [Add/Remove/Move] → Tavern (same scene, updated state)
- Tavern → [Inspect] → Character Inspection (with returnTo='tavern')
- Tavern → ESC → Castle Menu

---

## State Management

### Component State

```typescript
interface TavernComponentState {
  errorMessage: Signal<string | null>
  successMessage: Signal<string | null>
  availableCharacters: Computed<Character[]>  // Not in party, status OK
  frontRowCharacters: Computed<Character[]>   // First 3 party members
  backRowCharacters: Computed<Character[]>    // Next 3 party members
  partyGold: Computed<number>                 // Party's shared gold
}
```

**Notes:**
- All state derived from GameStateService via signals
- No local state mutations (immutable updates)
- Computed properties recalculate on state changes
- Toast messages auto-dismiss after 3 seconds

### Global State Changes

**On Add Character:**
- `party.members = [...party.members, characterId]`
- `party.formation.frontRow` or `backRow` updated (immutable)
- State update triggers signal propagation

**On Remove Character:**
- `party.members = party.members.filter(id => id !== characterId)`
- `party.formation` updated (character removed from row)
- State update triggers signal propagation

**On Move Up/Down:**
- `party.members` array reordered (immutable swap)
- `party.formation` recalculated (first 3 → front, next 3 → back)
- State update triggers signal propagation

**On Navigation:**
- Route change via Angular Router
- No state mutations on exit

### Persistence

- **Auto-save:** No explicit auto-save (state managed by GameStateService)
- **Manual save:** Available via Utilities scene
- **Safe zone:** Yes (town location, no combat risk)

---

## Implementation Notes

### Header and Footer Components

**Header:**
- Uses `<app-scene-title>` with `title="GILGAMESH'S TAVERN"` and `[showPartyGold]="true"`
- Displays party's shared gold pool (not individual character gold)
- Gold format: "PARTY GOLD: X GP"

**Footer:**
- Uses `<app-scene-footer>` with horizontal menu
- Single action: "L: Return to Castle"
- Future: Could add contextual actions (e.g., "I: Inspect" when character selected)

**Party Gold System:**
- The game uses a **shared gold pool** for all party members
- All transactions affect the party total directly
- There is no individual character gold or "divvy gold" functionality

### Services Used

- `PartyService.canAddCharacterToParty(party, character, roster)` - Validate add
- `PartyService.divvyGold(party, roster)` - Distribute gold (not used in UI yet)
- `moveCharacterUp(state, characterId)` - Move character up (pure function)
- `moveCharacterDown(state, characterId)` - Move character down (pure function)
- `GameStateService.updateState(updater)` - Immutable state updates

### Components

- `TavernComponent` - Main tavern scene component
- `SceneTitleComponent` - Header with title and party gold display
- `SceneFooterComponent` - Footer with horizontal navigation menu
- `CharacterCardWrapperComponent` - Wraps CharacterCard with actions
- `CharacterCardComponent` - Base character display (reusable)
- `CharacterCardActionsComponent` - Action buttons for cards

### Architecture Pattern

**Component Composition:**
```
TavernComponent
├── CharacterCardWrapperComponent (left column)
│   ├── CharacterCardComponent
│   └── CharacterCardActionsComponent (inspect, add)
└── CharacterCardWrapperComponent (right column)
    ├── CharacterCardComponent
    └── CharacterCardActionsComponent (inspect, remove, moveUp, moveDown)
```

**Benefits:**
- CharacterCard is reusable across scenes
- Wrapper configures actions per context
- Actions emit events to parent component
- Parent handles state updates immutably

### Edge Cases

1. **Party full (6 members):**
   - [Add] button disabled on all available characters
   - Error toast: "Party is full (maximum 6 members)"
   - Must remove member before adding new one

2. **Empty party:**
   - "Front row is empty" and "Back row is empty" placeholders shown
   - No characters in right column
   - Available characters still shown in left column

3. **No available characters:**
   - "No characters available to join the party" message in left column
   - All characters may be IN PARTY or have non-OK status
   - Can still inspect/remove party members

4. **Alignment conflict:**
   - Cannot add Evil to party with Good members (validation prevents)
   - Cannot add Good to party with Evil members (validation prevents)
   - Neutral can mix with either alignment
   - Error toast shows reason

5. **Character status filtering:**
   - Only characters with CharacterStatus.OK shown as available
   - DEAD, ASHES, IN_MAZE characters filtered out
   - Prevents invalid additions at UI level

6. **Formation recalculation:**
   - First 3 party members always in front row
   - Next 3 party members always in back row
   - Move up/down triggers automatic formation recalc
   - No manual row assignment needed

7. **Move button disabling:**
   - [▲ Move Up] disabled for first character in party
   - [▼ Move Down] disabled for last character in party
   - Prevents invalid array operations

### Technical Considerations

- **Party position:** Position matters for combat (front row 1-3, back row 4-6)
- **Alignment validation:** PartyService checks before allowing add
- **Immutable updates:** All state changes create new objects (no mutations)
- **Signal propagation:** Computed properties auto-update on state changes
- **Character availability:** Filtered by status (OK only)
- **Formation auto-calculation:** Formation derived from members array order

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
