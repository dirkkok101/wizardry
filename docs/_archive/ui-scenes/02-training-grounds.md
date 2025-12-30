# Training Grounds

## Recent Update: Two-Column Wizard Redesign

**Date:** 2025-11-02

The character creation scene has been redesigned with a two-column wizard-state layout:

- **Left Column (50%)**: Step-by-step controls, only current step visible
- **Right Column (50%)**: Progressive character display (builds like a receipt)
- **5 Steps**: SELECT_RACE → SELECT_ALIGNMENT → ROLL_STATS → SELECT_CLASS → NAME_CHARACTER
- **Navigation**: Enter advances, Escape goes back (with data clearing)
- **Reroll**: Available on class selection step, unlimited attempts
- **Auto-advance**: Rolling dice automatically shows class selection
- **Immediate Reset**: No delay after character creation

See `docs/plans/2025-11-02-character-creation-wizard-redesign.md` for complete design details.

---

## Overview

**Description:** Character creation and roster management center. The only place to create new characters, inspect existing ones, and permanently delete characters from the roster.

**Scene Type:** Safe Zone (auto-saves after character changes)

**Location in Game Flow:** Accessed directly from Castle Menu - manages all characters in the game

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Castle Menu → (G) Training Grounds → Training Grounds

**Access Pattern:**
- Castle Menu → (G) Training Grounds
- Direct access from Castle Menu

### Requirements

**State Requirements:**
- [ ] None (always accessible from Castle Menu)

**Note:** Training Grounds can be accessed with or without existing characters.

### State Prerequisites

```typescript
interface TrainingGroundsEntryState {
  characterRoster: Character[]  // May be empty for new game
  maxCharacters: number  // Usually 20
}
```

---

## UI Layout

### Screen Regions

- **Header:** "TRAINING GROUNDS" title
- **Main:** Character roster list or creation wizard
- **Menu:** Action options (C/I/R/L)
- **Status:** Current action context
- **Messages:** Feedback for operations

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  TRAINING GROUNDS                   │
├─────────────────────────────────────┤
│                                     │
│  (C)REATE A CHARACTER               │
│  (I)NSPECT A CHARACTER              │
│  (R)OSTER OF CHARACTERS             │
│  (L)EAVE                            │
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
- Simple menu-driven interface
- Switches to different sub-screens for each action
- Character roster may show in main area when viewing
- Creation wizard takes over main area

---

## Available Actions

### (C) Create a Character

**Description:** Launch character creation wizard to generate new adventurer

**Key Binding:** C (case-insensitive)

**Requirements:**
- Roster not full (max 20 characters)

**Flow:**
1. User presses 'C'
2. Enter creation wizard (multi-step process)
3. Wizard steps:
   a. Select Race (Human, Elf, Dwarf, Gnome, Hobbit)
   b. Select Alignment (Good, Neutral, Evil)
   c. Roll Attributes (STR, IQ, PIE, VIT, AGI, LUK)
   d. Allocate bonus points
   e. Select Class (based on attributes)
   f. Enter character name
   g. Enter password
4. Character created and added to roster
5. Return to Training Grounds menu

**Character Creation Details:**

**Step 1: Race Selection**
```
Select Race:
(H)uman   - No bonuses/penalties, all classes available
(E)lf     - +1 IQ, +1 AGI, -1 STR, -1 VIT
(D)warf   - +1 STR, +1 VIT, -1 IQ, -1 PIE
(G)nome   - +1 IQ, +1 AGI, -1 STR, -1 VIT
(H)obbit  - +1 AGI, +1 LUK, -1 STR, -1 PIE
```

**Step 2: Alignment Selection**
```
Select Alignment:
(G)ood    - Can use good items, can't party with evil
(N)eutral - Can party with anyone
(E)vil    - Can use evil items, can't party with good
```

**Step 3: Attribute Rolling**
```
Roll 3d6 for each attribute:
- STR (Strength)    - Physical power, carry weight, melee damage
- IQ (Intelligence) - Mage spells, learning
- PIE (Piety)       - Priest spells, faith
- VIT (Vitality)    - Hit points, resurrection chance
- AGI (Agility)     - AC, initiative, thief skills
- LUK (Luck)        - Critical hits, treasure

Bonus Points: Random pool (0-20) to distribute
Actions: (R)eroll, (A)llocate bonus points
```

**Step 4: Class Selection**
```
Available classes based on attributes:
- Fighter   - STR 11+
- Mage      - IQ 11+
- Priest    - PIE 11+
- Thief     - AGI 11+
- Bishop    - IQ 12+, PIE 12+
- Samurai   - STR 15+, IQ 11+, PIE 10+, VIT 14+, AGI 10+
- Lord      - STR 15+, IQ 12+, PIE 12+, VIT 15+, AGI 14+, LUK 15+
- Ninja     - STR 17+, IQ 17+, PIE 17+, VIT 17+, AGI 17+, LUK 17+
```

**Step 5: Name and Password**
```
Enter character name (15 characters max)
Enter password (8 characters max, for character deletion protection)
```

**Validation:**

```typescript
function canCreateCharacter(roster: Character[]): { allowed: boolean; reason?: string } {
  if (roster.length >= 20) {
    return { allowed: false, reason: "Roster is full (max 20 characters)" }
  }
  return { allowed: true }
}
```

**State Changes:**
- `state.characterRoster.push(newCharacter)`
- `newCharacter.status = CharacterStatus.OK`
- Auto-save after character creation

**UI Feedback:**
- "Character created successfully!"
- Show final character sheet
- Return to Training Grounds menu

**Transitions:**
- → Character Creation Wizard (sub-flow)
- → Training Grounds menu (after completion)

---

### (I) Inspect a Character

**Description:** View and modify existing character

**Key Binding:** I (case-insensitive)

**Requirements:**
- At least one character in roster

**Flow:**
1. User presses 'I'
2. Prompt: "Inspect which character? (Name)"
3. User types character name (partial match allowed)
4. If found: Transition to Character Inspection screen
5. Available actions in Inspection screen:
   - (D)elete - Permanently remove character (requires password)
   - (C)hange Class - Class change (if eligible)
   - (A)lter Password - Change password
   - (R)ead - View spell book (if caster)
   - (L)eave - Return to Training Grounds

**Validation:**

```typescript
function canInspectCharacter(roster: Character[], name: string): { allowed: boolean; reason?: string } {
  if (roster.length === 0) {
    return { allowed: false, reason: "No characters in roster" }
  }

  const character = findCharacter(roster, name)
  if (!character) {
    return { allowed: false, reason: "Character not found" }
  }

  return { allowed: true }
}
```

**Sub-Actions:**

**Delete Character:**
- Prompt: "Enter password to confirm deletion"
- If password correct: Remove character permanently
- If password incorrect: "Invalid password"
- Cannot be undone (permanent deletion)

**Change Class:**
- Check if character meets requirements for new class
- Must be level 1 or meet elite class requirements
- Resets to level 1 if changing to basic class
- Costs gold (varies by target class)

**Alter Password:**
- Prompt: "Enter old password"
- Prompt: "Enter new password"
- Update password if old password correct

**State Changes:**
- Character data modified based on sub-action
- Auto-save after changes

**UI Feedback:**
- "Character deleted"
- "Class changed successfully"
- "Password updated"
- "Invalid password" (error)

**Transitions:**
- → Character Inspection Screen (Training Grounds mode)
- → Training Grounds menu (after (L)eave)

---

### (R) Roster of Characters

**Description:** Display list of all characters with status

**Key Binding:** R (case-insensitive)

**Requirements:**
- None (works with empty roster)

**Flow:**
1. User presses 'R'
2. Display roster list
3. Show character info: Name, Race, Class, Level, Status
4. Automatically return to Training Grounds menu (or press any key)

**Roster Display Format:**

```
ROSTER OF CHARACTERS

Name          Race   Class   Level  Status
--------------------------------------------
Gandalf       Human  Mage    5      OK
Corak         Dwarf  Fighter 4      IN MAZE
Thief         Hobbit Thief   3      OK
PriestBob     Human  Priest  4      DEAD
WizardX       Elf    Bishop  2      ASHES
```

**Status Indicators:**
- **OK** - Available for recruitment, in castle
- **IN PARTY** - Currently in active party (at Tavern)
- **IN MAZE** - Currently adventuring in dungeon
- **OUT** - Party quit in dungeon, needs restart
- **DEAD** - Needs resurrection
- **ASHES** - Failed resurrection, needs advanced resurrection
- **LOST** - Permanent death (cannot be recovered)

**Validation:**

```typescript
function canShowRoster(roster: Character[]): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always allowed, even if empty
}
```

**State Changes:**
- None (read-only display)

**UI Feedback:**
- Show roster list
- If empty: "No characters in roster"
- Press any key to continue

**Transitions:**
- → Training Grounds menu (after viewing)

---

### (L) Leave

**Description:** Return to Castle Menu

**Key Binding:** L (case-insensitive) or ESC

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'L' or ESC
2. Validate no unsaved changes
3. Transition to Castle Menu

**Validation:**

```typescript
function canLeaveTrainingGrounds(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }
}
```

**State Changes:**
- `state.currentScene = SceneType.CASTLE_MENU`
- Auto-save before transition (if changes made)

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
- Remain in Training Grounds

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Create Character | (C) | Creation Wizard | Roster not full |
| Inspect Character | (I) | Character Inspection | Character exists |
| Roster | (R) | Roster Display | Always |
| Leave | (L) or ESC | Castle Menu | Always |

### Parent Scene

- Castle Menu → (G) → Training Grounds

### Child Scenes

- Training Grounds → (C) → Character Creation Wizard
- Training Grounds → (I) → Character Inspection (Training Grounds mode)
- Training Grounds → (R) → Roster Display (sub-screen)
- Training Grounds → (L) → Castle Menu

---

## State Management

### Scene State

```typescript
interface TrainingGroundsState {
  mode: 'MAIN_MENU' | 'CREATING' | 'INSPECTING' | 'ROSTER'
  selectedCharacter: Character | null
  creationWizardStep: number | null
  lastInput: string | null
  errorMessage: string | null
}
```

**Notes:**
- Mode switches based on action selected
- Creation wizard has multiple steps
- Inspection mode has sub-actions

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.TRAINING_GROUNDS`
- Load character roster

**On Character Creation:**
- Add new character to roster
- Auto-save after creation

**On Character Modification:**
- Update character data (delete, class change, password)
- Auto-save after changes

**On Exit:**
- Save any pending changes
- Clear selected character

### Persistence

- **Auto-save:** Yes, after character creation or modification
- **Manual save:** No (auto-saves are sufficient)
- **Safe zone:** Yes (no risk to characters)

---

## Implementation Notes

### Services Used

- `CharacterService.createCharacter(race, alignment, attributes, class, name, password)`
- `CharacterService.deleteCharacter(id, password)`
- `CharacterService.changeClass(id, newClass)`
- `CharacterService.alterPassword(id, oldPassword, newPassword)`
- `RosterService.getCharacterList()`
- `SaveService.autoSave(state)`

### Commands

- `CreateCharacterCommand` - Launch creation wizard
- `InspectCharacterCommand` - View character details
- `ShowRosterCommand` - Display roster list
- `DeleteCharacterCommand` - Remove character (requires password)
- `ChangeClassCommand` - Change character class
- `AlterPasswordCommand` - Update password
- `LeaveTrainingGroundsCommand` - Return to Castle Menu

### Edge Cases

1. **Roster full (20 characters):**
   - Disable (C)reate option
   - Show "Roster is full" message
   - Must delete characters to create new ones

2. **No characters exist:**
   - (I)nspect shows "No characters to inspect"
   - (R)oster shows "No characters in roster"
   - (C)reate is the only useful action

3. **Character name conflict:**
   - Allow duplicate names (distinguished by password or ID)
   - Or enforce unique names (design choice)

4. **Password forgotten:**
   - No recovery mechanism in original game
   - Modern implementation may add recovery option

5. **Character in party or dungeon:**
   - Cannot delete character while IN PARTY or IN MAZE
   - Must remove from party first
   - Or implement safety check

6. **Elite class requirements:**
   - Samurai/Lord/Ninja require high stats
   - May need many rerolls to qualify
   - Bonus points help but may not be sufficient

### Technical Considerations

- **Attribute rolling:** Random number generation (3d6 per stat)
- **Bonus points:** Random pool (0-20), distributed one at a time
- **Class eligibility:** Real-time calculation as stats change
- **Password security:** Simple text password (no hashing in original)
- **Name validation:** Length limits, character restrictions
- **Auto-save timing:** Immediately after character creation/modification

---

## Testing Scenarios

### Test 1: Create New Character

```
1. From Castle Menu, press (G)
2. Verify Training Grounds loads
3. Press (C) to create character
4. Select race: Human
5. Select alignment: Good
6. Roll attributes until satisfied
7. Allocate bonus points
8. Select class: Fighter
9. Enter name: "TestHero"
10. Enter password: "test123"
11. Verify character created
12. Verify auto-save triggered
13. Verify return to Training Grounds menu
```

### Test 2: Inspect and Delete Character

```
1. At Training Grounds, press (I)
2. Enter character name
3. Verify character sheet displays
4. Press (D) to delete
5. Enter password
6. Verify character deleted
7. Verify auto-save triggered
8. Verify return to Training Grounds menu
```

### Test 3: View Roster

```
1. At Training Grounds, press (R)
2. Verify roster displays all characters
3. Verify status indicators correct
4. Press any key to continue
5. Verify return to Training Grounds menu
```

### Test 4: Roster Full

```
1. Create 20 characters
2. Verify roster full
3. Press (C) to create
4. Verify error message: "Roster is full"
5. Verify cannot create new character
6. Delete one character
7. Verify can now create new character
```

---

## Related Documentation

- [Castle Menu](./01-castle-menu.md) - Parent scene
- [Character Inspection](./13-character-inspection.md) - Detail view
- [Character System](../../systems/character-system.md) - Character mechanics
- [Character Classes](../../systems/character-classes.md) - Class requirements
- [Navigation Map](../navigation-map.md) - Complete navigation flow

---

## Current Implementation (Card-Based UI)

### Architecture
- **Smart Component**: TrainingGrounds orchestrates workflows
- **Presentational Component**: CharacterCard displays character data
- **Event-Driven**: Cards emit events, parent handles state updates
- **Immutable State**: All updates via CharacterService pure functions

### UI Layout
```
┌─────────────────────────────────────┐
│       TRAINING GROUNDS       [TITLE]│
├─────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐        │
│  │Character │  │Character │  [GRID]│
│  │  Card 1  │  │  Card 2  │        │
│  └──────────┘  └──────────┘        │
├─────────────────────────────────────┤
│ [Create] [Return to Castle]  [NAV] │
└─────────────────────────────────────┘
```

### Character Card
- **Display**: Name, Race, Class, Level, Status Badge
- **Actions**: Inspect button, Delete button
- **Status Colors**:
  - Green (OK) - Available for recruitment
  - Yellow (IN_MAZE) - Currently in party
  - Red (DEAD) - Needs resurrection
  - Dark Red (ASHES) - Critical state

### Workflows
1. **Create Character**: Navigate to /character-creation wizard
2. **Inspect Character**: Navigate to /character-inspection with returnTo param
3. **Delete Character**: Show confirmation dialog → Call CharacterService → Update state
4. **Return to Castle**: Navigate to /castle-menu

### Keyboard Shortcuts
- **C** - Create new character (transitions to Character Creation scene)
- **L** - Leave (return to castle menu)

For detailed character creation keyboard shortcuts, see: [Character Creation Keyboard Shortcuts](../keyboard-shortcuts-character-creation.md)

### Component Responsibilities
- **TrainingGrounds**: Filter roster, compute status, handle events, coordinate navigation
- **CharacterCard**: Display data, emit user actions
- **CharacterService**: Delete character (validation, immutable update)
- **GameStateService**: State management and persistence

### Reactivity
- Uses Angular computed signals for `availableCharacters`
- Automatically updates when GameState changes
- New characters appear immediately after creation
- Deleted characters disappear immediately from grid
