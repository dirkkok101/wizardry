# Input Reference Guide

**Complete keyboard shortcuts and input handling reference for Wizardry 1.**

---

## Overview

Wizardry 1 uses a **single-keystroke interface** philosophy where most actions require only pressing one key without hitting Enter. This provides fast, responsive gameplay that was revolutionary in 1981.

### Core Input Principles

**Single-Keystroke Navigation:**
- Press the first letter of an action (no Enter needed)
- Immediate response to input
- Fast menu navigation
- Reduced typing for common actions

**Case-Insensitive Input:**
- Both uppercase and lowercase accepted
- 'G' and 'g' work identically
- Consistent behavior across all scenes
- User-friendly for all keyboard configurations

**No Enter Required:**
- Menu selections execute immediately
- Single key press for most actions
- Enter only needed for text input (names, amounts)
- Streamlined interface

---

## Universal Keys

These keys work across multiple scenes with consistent behavior.

### (L) Leave / Return to Parent Scene

**Function:** Return to previous scene or parent menu

**Availability:** Most scenes (except Title Screen)

**Behavior:**
- Instantly returns to parent scene
- Auto-saves if in safe zone
- No confirmation required (usually)
- Cannot leave from Title Screen once game started

**Exceptions:**
- Title Screen: No (L)eave option
- Edge of Town: (L)eave exits game (with confirmation)
- Camp: (L)eave enters Maze
- Combat: No (L)eave option (must win or flee)

---

### (#) Inspect Character

**Function:** View detailed character sheet

**Availability:** Tavern, Camp, Training Grounds

**Behavior:**
- Number keys 1-6 for party position
- Opens Character Inspection screen
- Context-sensitive actions based on location
- Returns to parent scene with (L)eave

**Context Modes:**
- **Training Grounds:** Character management (delete, class change)
- **Tavern:** Inventory management (equip, trade, pool gold)
- **Camp:** Full access (spells, items, everything)

---

### (?) Help

**Function:** Context-sensitive help (if implemented)

**Availability:** All scenes (optional feature)

**Behavior:**
- Shows available keys for current scene
- Displays action descriptions
- Context-aware help text
- Press any key to return

**Note:** Not in original game, common modern enhancement

---

## Scene-Specific Keyboard Shortcuts

### Title Screen

| Key | Action | Description |
|-----|--------|-------------|
| S | Start Game | Load existing save or start new game |
| M | Make Scenario Disk | Legacy option (usually disabled in modern versions) |

**Input Notes:**
- Only two options available
- No navigation keys needed
- No way to return once (S)tarted
- Silent rejection of invalid keys

---

### Castle Menu (Central Hub)

| Key | Action | Destination |
|-----|--------|-------------|
| G | Gilgamesh's Tavern | Party formation and management |
| T | Temple of Cant | Healing and resurrection services |
| B | Boltac's Trading Post | Buy/sell equipment |
| A | Adventurer's Inn | Rest and level up |
| E | Edge of Town | Gateway to dungeon and utilities |

**Input Notes:**
- All options always available
- No (L)eave option (hub has no parent)
- Invalid keys show error message
- Auto-saves before each transition

---

### Edge of Town (Gateway)

| Key | Action | Destination |
|-----|--------|-------------|
| T | Training Grounds | Create and manage characters |
| M | Maze (Dungeon) | Enter dungeon via Camp |
| C | Castle | Return to Castle Menu |
| U | Utilities | System utilities (rename, restart party) |
| L | Leave Game | Save and exit application |

**Input Notes:**
- (M)aze requires valid party (healthy members)
- (L)eave blocked if party IN_MAZE
- Confirmation prompt for (L)eave
- Last auto-save before dungeon entry

---

### Training Grounds

| Key | Action | Description |
|-----|--------|-------------|
| C | Create Character | Launch character creation wizard |
| I | Inspect Character | View/edit character (requires name input) |
| R | Roster | Display all characters and statuses |
| L | Leave | Return to Edge of Town |

**Character Creation Wizard Keys:**
- H/E/D/G/H | Race | Human, Elf, Dwarf, Gnome, Hobbit |
| G/N/E | Alignment | Good, Neutral, Evil |
| R | Reroll | Reroll attribute scores |
| A | Allocate | Distribute bonus points |

**Character Inspection Sub-Actions:**
- D | Delete | Permanently remove character (password required) |
| C | Change Class | Switch to eligible class |
| A | Alter Password | Update character password |

**Input Notes:**
- Character name input requires typing (15 char max)
- Password input for delete/change (8 char max)
- Roster display is read-only (any key continues)
- Auto-saves after character creation/modification

---

### Gilgamesh's Tavern (Party Formation)

| Key | Action | Description |
|-----|--------|-------------|
| A | Add Character | Recruit character to party |
| R | Remove Character | Remove character from party |
| D | Divvy Gold | Distribute party pool gold equally |
| 1-6 | Inspect | View character at position 1-6 |
| L | Leave | Return to Castle Menu |

**Input Notes:**
- (A)dd requires character name input
- (R)emove accepts position number or name
- (D)ivvy only works with party gold > 0
- Number keys (1-6) for direct character inspection
- Alignment conflicts enforced (Good vs Evil)

---

### Boltac's Trading Post (Shop)

| Key | Action | Description |
|-----|--------|-------------|
| B | Buy | Browse and purchase items |
| S | Sell | Sell items from inventory |
| I | Identify | Reveal unidentified item properties (costs gold) |
| U | Uncurse | Remove curse from item (expensive!) |
| P | Pool Gold | Transfer gold to party pool |
| L | Leave | Return to Castle Menu |

**Item Catalog Navigation:**
- F | Forward | Next page of items |
| B | Backward | Previous page of items |
| # | Purchase | Enter item number to buy |

**Input Notes:**
- Character selection required on entry (name or number)
- Item numbers for purchase (1-N)
- Amount input for (P)ool gold
- Confirmation prompts for expensive actions
- Auto-saves after each transaction

---

### Temple of Cant (Healing)

| Key | Action | Description |
|-----|--------|-------------|
| 1-N | Select Character | Choose character to heal/resurrect |
| 1-N | Select Payer | Choose who pays the tithe |
| L | Leave | Return to Castle Menu (before service) |

**Input Notes:**
- Automatic service type detection (poison, paralysis, dead, ashes)
- Two-step selection: character then payer
- Auto-return to Castle after service
- Shows "No one needs help" if all characters OK
- Confirmation on resurrection (risky, may fail)

---

### Adventurer's Inn (Rest & Level Up)

| Key | Action | Cost | Healing Rate |
|-----|--------|------|--------------|
| S | Stables | 0 gp/week | 0 HP/week |
| B | Barracks | 10 gp/week | 1 HP/week |
| D | Double | 50 gp/week | 3 HP/week |
| P | Private | 200 gp/week | 7 HP/week |
| R | Royal Suite | 500 gp/week | 10 HP/week |
| O | Pool Gold | N/A | Get gold from party pool |
| L | Leave | N/A | Return to Castle Menu |
| SPACE | Early Checkout | N/A | Stop resting, return to Castle |

**Input Notes:**
- Character selection required on entry
- Rest loop continues until HP full or user exits
- Level up triggers automatically at full HP
- Amount input for (O)ool gold request
- SPACE key for early exit during rest

---

### Utilities Menu

| Key | Action | Description |
|-----|--------|-------------|
| C | Change Name | Rename any character |
| R | Restart OUT Party | Recover party marked OUT |
| L | Leave | Return to Edge of Town |

**Input Notes:**
- Character selection for (C)hange name (letter or name)
- New name input (15 char max)
- Confirmation prompt for restart party
- Auto-saves after operations

---

### Camp (Pre-Dungeon Preparation)

| Key | Action | Description |
|-----|--------|-------------|
| 1-6 | Inspect | View character at position (full access mode) |
| R | Reorder | Rearrange party formation |
| E | Equip | Quick equipment management for all members |
| L | Leave Camp | Enter the Maze (exploration mode) |
| Q | Quit | Mark party OUT and return to Edge of Town |

**Reorder Input:**
- Enter 6-digit string representing new order (e.g., "213456")
- All positions must be unique
- Invalid order shows error

**Input Notes:**
- Full character inspection access (includes spell casting)
- (L)eave enters dangerous zone (Maze)
- (Q)uit is emergency exit (saves with OUT status)
- Confirmation prompt for (Q)uit
- NO auto-save (dungeon zone)

---

### Maze (Dungeon Exploration)

| Key | Action | Description |
|-----|--------|-------------|
| W | Forward | Move forward one tile |
| S | Backward | Move backward one tile |
| A | Strafe Left | Move left without turning |
| D | Strafe Right | Move right without turning |
| Q | Turn Left | Rotate 90° counter-clockwise |
| E | Turn Right | Rotate 90° clockwise |
| C | Camp | Return to Camp scene |
| K | Kick Door | Force open locked door ahead |
| I | Inspect | Examine current tile for details |

**Special Location Keys:**
- D | Descend | Go down stairs (to next level) |
| A | Ascend | Go up stairs (to previous level) |

**Input Notes:**
- WASD movement keys (modern FPS-style)
- QE for rotation (no movement)
- Movement triggers 10% encounter chance
- Rotation and inspection do not trigger encounters
- Invalid movement (into walls) shows error
- (C)amp available as emergency escape
- NO auto-save during exploration

---

### Combat (Turn-Based Battle)

| Key | Action | Description |
|-----|--------|-------------|
| F | Fight | Physical melee attack |
| C | Cast Spell | Use magic in combat |
| P | Parry | Defensive stance (+2 AC this round) |
| U | Use Item | Consume item (potion, scroll, etc.) |
| R | Run (Flee) | Attempt to escape combat |
| D | Dispel Undead | Priest/Bishop/Lord special ability |

**Fight Sub-Actions:**
- 1-4 | Target Group | Select which enemy group to attack |

**Cast Spell Sub-Actions:**
- 1-7 | Spell Level | Choose spell level |
| Type spell name | Spell Selection | Enter spell to cast |
| 1-4 or 1-6 | Target | Select enemy group or party member |

**Input Notes:**
- Actions queued for entire party before resolution
- Each character selects action in order
- Number keys for targeting
- Text input for spell names
- Flee blocked for fixed/scripted encounters
- Dispel only works vs undead enemies
- NO auto-save during combat

---

### Chest (Treasure Handling)

| Key | Action | Description |
|-----|--------|-------------|
| 1-6 | Select Opener | Choose who handles chest |
| O | Open | Open chest immediately (risky!) |
| I | Inspect | Attempt to detect trap |
| C | Cast CALFO | Use spell to identify trap (95% success) |
| D | Disarm | Remove identified trap (requires trap name) |
| L | Leave | Abandon chest and return to Maze |

**Disarm Input:**
- Type exact trap name to disarm
- Case-insensitive, whitespace-tolerant
- Wrong name triggers trap (80% chance)

**Input Notes:**
- Character selection first (Thief recommended)
- Text input for trap name (exact match required)
- Confirmation prompt for (L)eave
- Inventory full warning (items lost if no space!)
- NO auto-save during chest interaction

---

### Character Inspection (Multi-Context)

**Available actions depend on context mode (Training Grounds, Tavern, or Camp).**

#### Common Actions (All Modes)

| Key | Action | Description |
|-----|--------|-------------|
| R | Read Spell Book | View known spells (casters only) |
| L | Leave | Return to parent scene |

#### Tavern & Camp Mode Actions

| Key | Action | Description |
|-----|--------|-------------|
| D | Drop Item | Permanently remove item |
| P | Pool Gold | Transfer gold to party pool |
| I | Identify | Reveal item properties (Bishops only) |
| E | Equip | Change equipped items |
| T | Trade | Transfer item to party member |

#### Camp Mode Only Actions

| Key | Action | Description |
|-----|--------|-------------|
| S | Cast Spell | Use preparation/utility spells |
| U | Use Item | Consume items (potions, scrolls) |

#### Training Grounds Mode Only Actions

| Key | Action | Description |
|-----|--------|-------------|
| D | Delete | Permanently remove character (password required) |
| C | Change Class | Switch to eligible class (costs gold) |
| A | Alter Password | Update character password |

**Input Notes:**
- Text input for spell names (S)pell action
- Number keys (1-8) for item selection
- Partner selection (1-6) for (T)rade
- Amount input for (P)ool gold
- Password input for (D)elete and (A)lter
- Confirmation prompts for destructive actions

---

## Input Handling Patterns

### Single Keystroke Pattern

**Behavior:**
- Press key once
- Immediate action execution
- No Enter key needed
- No input buffering (prevents double actions)

**Implementation:**
```
User presses 'G' → Instant transition to Tavern
User presses 'F' in combat → Fight action selected
User presses '1' → Inspect character at position 1
```

**Error Handling:**
- Invalid key → Beep sound (optional)
- Invalid key → Error message displayed
- Invalid key → Remain in current scene
- Valid key → Immediate response

---

### Numeric Input (Selection)

**Usage:**
- Character selection (1-6 for party positions)
- Item selection (1-8 for inventory slots)
- Enemy group targeting (1-4 in combat)
- Page selection in lists

**Behavior:**
- Single digit press for positions
- No Enter needed
- Immediate validation
- Out-of-range shows error

**Examples:**
```
Tavern: Press '3' → Inspect character at position 3
Combat: Press '2' → Attack enemy group 2
Shop: Press '5' → Purchase item 5 from catalog
```

---

### Text Input (Names, Amounts, Passwords)

**Usage:**
- Character names (creation, selection)
- Spell names (casting)
- Trap names (disarming)
- Gold amounts (pooling, divvying)
- Passwords (delete, alter)

**Behavior:**
- Type text and press Enter
- Character limits enforced (15 for names, 8 for passwords)
- Partial matching allowed (character selection by name)
- Case-insensitive (usually)

**Input Validation:**
- Length limits
- Character restrictions (alphanumeric, some punctuation)
- Existence checks (character must exist)
- Password verification

**Examples:**
```
Training Grounds: Type "Gandalf" → Select character named Gandalf
Combat: Type "HALITO" → Cast HALITO spell
Shop: Type "ALL" → Pool all gold
```

---

### Confirmation Dialogs (Y/N)

**Usage:**
- Destructive actions (delete character, drop item)
- Expensive actions (uncurse, class change)
- Game exit (save and quit)
- Risky actions (open chest, flee combat)

**Behavior:**
- Two options: (Y)es or (N)o
- Single keystroke response
- Default to safe option on invalid input (usually No)
- Clear consequences displayed

**Examples:**
```
Training Grounds: "Delete Gandalf? (Y/N)"
Shop: "Uncurse cursed sword for 500 gp? (Y/N)"
Edge of Town: "Save and quit? (Y/N)"
Chest: "Leave chest unopened? (Y/N)"
```

---

## Special Keys

### Escape Key

**Function:** Cancel or go back

**Availability:** Most scenes (modern enhancement)

**Behavior:**
- Equivalent to (L)eave in most contexts
- Cancel current operation
- Return to previous menu
- No confirmation required (usually)

**Note:** Not in original game, common modern addition

---

### Number Keys (1-9)

**Primary Uses:**
1. **Party Position Selection (1-6)**
   - Character inspection in Tavern/Camp
   - Target selection for trade
   - Payer selection at Temple

2. **Item Selection (1-8)**
   - Inventory management
   - Drop/equip/use actions
   - Shop catalog selection

3. **Enemy Group Targeting (1-4)**
   - Combat attack selection
   - Spell targeting
   - Dispel undead selection

**Behavior:**
- Single digit input
- Immediate validation
- Context-aware (party vs inventory vs enemies)
- Out-of-range rejected with error

---

### Letter Keys (A-Z)

**Primary Uses:**
1. **Menu Navigation**
   - First letter of action ((G)ilgamesh, (T)emple, etc.)
   - Consistent across all menus
   - Case-insensitive

2. **Movement (WASD)**
   - W: Forward
   - A: Strafe Left
   - S: Backward
   - D: Strafe Right

3. **Rotation (QE)**
   - Q: Turn Left
   - E: Turn Right

4. **Text Input**
   - Character names
   - Spell names
   - Trap names
   - Passwords

**Behavior:**
- Context-dependent
- Single press for menu actions
- Multi-letter for text input
- Case-insensitive (except passwords in some implementations)

---

### Function Keys

**Usage:** Not used in original Wizardry 1

**Modern Implementations:**
- F1: Help/Tutorial
- F5: Quick Save
- F9: Quick Load
- ESC: Cancel/Menu

**Note:** Function keys are optional modern enhancements

---

## Input Validation

### Invalid Key Handling

**Behavior:**
- Beep sound (optional, platform-dependent)
- Error message: "INVALID SELECTION" or "INVALID KEY"
- Remain in current scene/screen
- No state changes
- Clear error on next valid input

**Examples:**
```
Castle Menu: Press 'X' → "INVALID SELECTION" → Remain at Castle Menu
Combat: Press 'Z' → "INVALID ACTION" → Remain at action selection
```

---

### Context Validation

**Rules:**
- Keys only work in appropriate scenes
- Same key may have different meanings in different contexts
- Context checked before action execution
- Clear error messages for wrong context

**Examples:**
```
(L)eave:
  - Castle Menu: Not available (no parent)
  - Tavern: Return to Castle
  - Camp: Enter Maze (different from other scenes!)
  - Edge of Town: Exit game (with confirmation)

(D):
  - Combat: Dispel undead
  - Shop: Drop item
  - Character Inspection (Training): Delete character
  - Maze: Descend stairs (at staircase only)
```

---

### Error Feedback

**Visual Feedback:**
- Error message displayed in message area
- Red text (if color supported)
- Message persists until next input
- Clear indication of problem

**Audio Feedback (Optional):**
- Beep/buzz sound for invalid input
- Different tones for different error types
- Platform-dependent (PC speaker, sound card)

**Error Message Examples:**
```
"INVALID SELECTION"
"CHARACTER NOT FOUND"
"NOT ENOUGH GOLD"
"CANNOT DO THAT NOW"
"YOU NEED A PARTY TO ENTER THE MAZE"
"SOME PARTY MEMBERS ARE DEAD"
"INVENTORY FULL"
"CANNOT UNEQUIP CURSED ITEM"
```

---

## Accessibility

### Keyboard-Only Navigation

**Philosophy:** 100% keyboard accessible, no mouse required

**Benefits:**
- Fast navigation (no mouse movement)
- Accessible to vision-impaired users (with screen reader)
- Works on all platforms (no mouse dependency)
- Original Apple II design (no mouse)

**Implementation:**
- All actions have keyboard shortcuts
- No mouse-only features
- Consistent key mappings
- Logical key assignments (first letter of action)

---

### Visual Feedback

**Input Confirmation:**
- Highlight selected option
- Show cursor position
- Indicate active input field
- Clear state changes

**Menu States:**
- Current selection highlighted
- Available vs disabled options
- Active vs inactive states
- Focus indicators

**Examples:**
```
Castle Menu:
  > (G)ILGAMESH'S TAVERN     ← Active selection
    (T)EMPLE OF CANT
    (B)OLTAC'S TRADING POST
```

---

### Audio Feedback (Optional)

**Sound Types:**
- Keypress confirmation (soft click)
- Menu navigation (gentle beep)
- Error indication (buzz)
- Action success (pleasant chime)
- Action failure (descending tone)

**Implementation Notes:**
- Optional feature (can be disabled)
- Platform-dependent (PC speaker, sound card)
- Not in original game (Apple II silent)
- Common modern enhancement

---

### Screen Reader Considerations

**Modern Enhancements:**
- Announce current menu options
- Read error messages aloud
- Indicate state changes
- Describe visual elements

**Implementation:**
- ARIA labels for web versions
- Text-to-speech for desktop versions
- Structured navigation
- Meaningful error messages

**Note:** Not in original 1981 game, modern accessibility feature

---

## Platform Considerations

### Terminal/Console Input

**Original Platform:** Apple II (1981)

**Characteristics:**
- Direct keyboard input
- No mouse support
- 40-column text display
- Immediate key response
- No input buffering

**Modern Terminal:**
- Same single-keystroke philosophy
- Works in SSH/telnet
- No special dependencies
- Cross-platform (ncurses, termbox)

---

### Web Browser Input

**Implementation:**
- JavaScript keyboard event listeners
- Prevent default browser shortcuts
- Handle key codes vs key values
- Cross-browser compatibility
- Mobile touch input mapping (see below)

**Challenges:**
- Browser shortcuts (Ctrl+W, etc.)
- Focus management
- Input method editors (IME)
- Virtual keyboards

**Best Practices:**
- Use `keydown` events
- Prevent default on game keys
- Clear focus handling
- Accessible keyboard traps

---

### Mobile Touch Input Mapping

**Challenge:** No physical keyboard on mobile devices

**Solutions:**

**1. On-Screen Button Grid:**
```
┌─────────────────────────────────────┐
│ [G]   [T]   [B]   [A]   [E]         │
│ Tavern Temple Shop  Inn  Edge       │
└─────────────────────────────────────┘
```

**2. Context-Aware Buttons:**
- Show only valid actions for current scene
- Large touch targets (44x44pt minimum)
- Clear labels
- Haptic feedback

**3. Virtual Keyboard:**
- Show keyboard for text input
- Hide keyboard for menu navigation
- Auto-dismiss after selection

**4. Gesture Support (Optional):**
- Swipe up/down: Navigate menus
- Swipe left/right: Turn in maze
- Tap: Select option
- Long press: Inspect

---

## Quick Reference Tables

### Complete Key Bindings by Scene

#### Title Screen
| Key | Action |
|-----|--------|
| S | Start Game |
| M | Make Scenario Disk (legacy) |

#### Castle Menu
| Key | Action |
|-----|--------|
| G | Gilgamesh's Tavern |
| T | Temple of Cant |
| B | Boltac's Trading Post |
| A | Adventurer's Inn |
| E | Edge of Town |

#### Edge of Town
| Key | Action |
|-----|--------|
| T | Training Grounds |
| M | Maze (Dungeon Entry) |
| C | Castle |
| U | Utilities |
| L | Leave Game |

#### Training Grounds
| Key | Action |
|-----|--------|
| C | Create Character |
| I | Inspect Character |
| R | Roster |
| L | Leave |

#### Gilgamesh's Tavern
| Key | Action |
|-----|--------|
| A | Add Character |
| R | Remove Character |
| D | Divvy Gold |
| 1-6 | Inspect Character |
| L | Leave |

#### Boltac's Trading Post
| Key | Action |
|-----|--------|
| B | Buy Items |
| S | Sell Items |
| I | Identify Item |
| U | Uncurse Item |
| P | Pool Gold |
| L | Leave |

#### Temple of Cant
| Key | Action |
|-----|--------|
| 1-N | Select Character |
| 1-N | Select Payer |
| L | Leave (before service) |

#### Adventurer's Inn
| Key | Action |
|-----|--------|
| S | Stables (0 gp, 0 HP) |
| B | Barracks (10 gp, 1 HP) |
| D | Double (50 gp, 3 HP) |
| P | Private (200 gp, 7 HP) |
| R | Royal Suite (500 gp, 10 HP) |
| O | Pool Gold |
| L | Leave |
| SPACE | Early Checkout |

#### Utilities Menu
| Key | Action |
|-----|--------|
| C | Change Name |
| R | Restart OUT Party |
| L | Leave |

#### Camp
| Key | Action |
|-----|--------|
| 1-6 | Inspect Character |
| R | Reorder Party |
| E | Equip Party |
| L | Leave Camp (Enter Maze) |
| Q | Quit (Mark OUT) |

#### Maze
| Key | Action |
|-----|--------|
| W | Move Forward |
| S | Move Backward |
| A | Strafe Left |
| D | Strafe Right |
| Q | Turn Left |
| E | Turn Right |
| C | Camp |
| K | Kick Door |
| I | Inspect Tile |
| D | Descend (at stairs) |
| A | Ascend (at stairs) |

#### Combat
| Key | Action |
|-----|--------|
| F | Fight |
| C | Cast Spell |
| P | Parry |
| U | Use Item |
| R | Run (Flee) |
| D | Dispel Undead |

#### Chest
| Key | Action |
|-----|--------|
| 1-6 | Select Opener |
| O | Open Chest |
| I | Inspect for Traps |
| C | Cast CALFO |
| D | Disarm Trap |
| L | Leave Chest |

#### Character Inspection
| Key | Action | Mode |
|-----|--------|------|
| R | Read Spell Book | All |
| L | Leave | All |
| D | Drop Item | Tavern, Camp |
| P | Pool Gold | Tavern, Camp |
| I | Identify (Bishop) | Tavern, Camp |
| E | Equip Item | Tavern, Camp |
| T | Trade Item | Tavern, Camp |
| S | Cast Spell | Camp Only |
| U | Use Item | Camp Only |
| D | Delete Character | Training Only |
| C | Change Class | Training Only |
| A | Alter Password | Training Only |

---

### Action-to-Key Mapping

**Navigation:**
- Leave/Return → L
- Inspect Character → 1-6 (position number) or # key
- Help → ? (if implemented)

**Party Management:**
- Add to Party → A (Tavern)
- Remove from Party → R (Tavern)
- Reorder Party → R (Camp)
- Divvy Gold → D (Tavern)
- Pool Gold → P (Multiple scenes)

**Commerce:**
- Buy → B (Shop)
- Sell → S (Shop)
- Identify Item → I (Shop, Character Inspection)
- Uncurse Item → U (Shop)

**Healing:**
- Rest → S/B/D/P/R (Inn room types)
- Temple Services → Auto-detected (Cure, Resurrect, Restore)

**Dungeon:**
- Enter Maze → M (Edge of Town)
- Leave Camp → L (Camp, enters Maze)
- Camp → C (Maze)
- Move → W/A/S/D (Maze)
- Turn → Q/E (Maze)
- Kick Door → K (Maze)

**Combat:**
- Fight → F
- Cast Spell → C
- Parry → P
- Use Item → U
- Run → R
- Dispel Undead → D

**Character Management:**
- Create Character → C (Training Grounds)
- Delete Character → D (Character Inspection, Training mode)
- Change Class → C (Character Inspection, Training mode)
- Alter Password → A (Character Inspection, Training mode)

**Inventory:**
- Drop Item → D (Character Inspection)
- Equip Item → E (Character Inspection, Camp)
- Trade Item → T (Character Inspection)
- Use Item → U (Character Inspection, Camp mode)

**Utilities:**
- Change Name → C (Utilities)
- Restart Party → R (Utilities)

**Chest:**
- Open → O
- Inspect → I
- CALFO → C
- Disarm → D

---

### Key-to-Action Mapping

**Context-dependent keys (same key, different actions):**

**A:**
- Castle Menu → Adventurer's Inn
- Tavern → Add Character
- Character Inspection (Training) → Alter Password
- Maze (at stairs) → Ascend
- Strafe Left → (invalid in most scenes)

**B:**
- Castle Menu → Boltac's Trading Post
- Shop → Buy
- Inn → Barracks

**C:**
- Training Grounds → Create Character
- Shop → (invalid)
- Chest → Cast CALFO
- Combat → Cast Spell
- Maze → Camp
- Edge of Town → Castle
- Utilities → Change Name
- Character Inspection (Training) → Change Class

**D:**
- Maze (at stairs) → Descend
- Maze (strafe) → Strafe Right
- Inn → Double Room
- Tavern → Divvy Gold
- Combat → Dispel Undead
- Character Inspection → Drop Item (Tavern/Camp) or Delete (Training)
- Chest → Disarm

**E:**
- Castle Menu → Edge of Town
- Maze → Turn Right
- Character Inspection → Equip
- Camp → Equip Party

**F:**
- Combat → Fight
- Shop (catalog) → Forward page

**G:**
- Castle Menu → Gilgamesh's Tavern

**I:**
- Training Grounds → Inspect Character
- Shop → Identify
- Maze → Inspect Tile
- Chest → Inspect for Traps
- Character Inspection → Identify (Bishop)

**K:**
- Maze → Kick Door

**L:**
- Most scenes → Leave/Return to parent
- Edge of Town → Leave Game
- Camp → Leave Camp (Enter Maze)
- Chest → Leave Chest

**M:**
- Title Screen → Make Scenario Disk
- Edge of Town → Maze

**O:**
- Inn → Pool Gold (take from party)
- Chest → Open

**P:**
- Inn → Private Room
- Combat → Parry
- Character Inspection → Pool Gold (give to party)

**Q:**
- Maze → Turn Left
- Camp → Quit (Mark OUT)

**R:**
- Training Grounds → Roster
- Tavern → Remove Character
- Inn → Royal Suite
- Camp → Reorder Party
- Utilities → Restart OUT Party
- Combat → Run
- Character Inspection → Read Spell Book

**S:**
- Title Screen → Start Game
- Shop → Sell
- Inn → Stables
- Maze → Move Backward
- Character Inspection (Camp) → Cast Spell

**T:**
- Castle Menu → Temple of Cant
- Edge of Town → Training Grounds
- Character Inspection → Trade

**U:**
- Edge of Town → Utilities
- Shop → Uncurse
- Combat → Use Item
- Character Inspection (Camp) → Use Item

**W:**
- Maze → Move Forward

**Numbers (1-6):**
- Party position selection (multiple scenes)
- Character inspection (Tavern, Camp, Training)
- Combat targeting (1-4 for enemy groups)

**Numbers (1-8):**
- Inventory item selection
- Equipment slots

**Numbers (1-N):**
- Shop catalog items
- Temple character/payer selection
- Roster selection (Training)

---

## Summary

**Total Unique Keys:** ~30 (A-Z letter keys + 1-9 number keys + SPACE + ESC)

**Primary Input Methods:**
1. Single-keystroke menu navigation (most common)
2. Numeric selection (characters, items, targets)
3. Text input (names, spells, amounts)
4. Confirmation dialogs (Y/N)

**Design Philosophy:**
- Fast, responsive input
- Minimal keystrokes required
- Context-aware key mappings
- Consistent patterns across scenes
- No mouse dependency

**Modern Enhancements:**
- ESC key for cancel
- Arrow keys for navigation (optional)
- Function keys for quick actions (optional)
- Touch input mapping for mobile
- Screen reader support

This input reference provides complete documentation of all keyboard shortcuts and input handling patterns in Wizardry 1, organized for easy lookup by developers, QA testers, and players.
