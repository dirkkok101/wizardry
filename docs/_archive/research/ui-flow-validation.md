# UI Flow Validation

**Comprehensive validation of user interface structure, scenes, and navigation flow in original Wizardry 1.**

## Research Date
2025-10-26

## Sources

### Primary Sources
1. **Wizardry Manual (tk421.net)**
   - URL: https://www.tk421.net/wizardry/wiz1manual.shtml
   - Status: ✅ Reviewed
   - Contains: Complete interface documentation, all menus, actions, navigation

2. **Wizardry Documentation (zimlab.com)**
   - URL: https://www.zimlab.com/wizardry/recovered/jh/wizardry/realdoc.html
   - Status: ✅ Reviewed
   - Contains: Detailed UI flow, screen descriptions, menu structure

3. **Strategy Wiki Walkthrough**
   - URL: https://strategywiki.org/wiki/Wizardry:_Proving_Grounds_of_the_Mad_Overlord/Walkthrough
   - Status: ✅ Reviewed
   - Contains: Navigation flow, screen transitions, gameplay structure

## Summary of Findings

### ✅ Complete UI Structure Identified
Text-based menu system with 14 distinct scenes/screens, single-keystroke navigation, hierarchical menu structure.

### 🔍 Key Discoveries
1. **Castle Hub Model** - All town services radiate from central Castle menu
2. **Edge of Town Gateway** - Required intermediate screen for Training Grounds and Maze
3. **Context-Sensitive Inspection** - Same character screen with different actions based on location
4. **Single-Keystroke Interface** - Press first letter of action (no Enter needed except for text input)
5. **Hierarchical Navigation** - Clear parent/child relationships between screens

---

## Game Flow Architecture

### Application States

Wizardry 1 has **14 primary screens/scenes**:

1. **Title Screen** - Application entry point
2. **Castle Menu** - Central hub
3. **Training Grounds** - Character creation/management
4. **Gilgamesh's Tavern** - Party formation
5. **Boltac's Trading Post** - Shop
6. **Temple of Cant** - Healing/resurrection
7. **Adventurer's Inn** - Rest and level up
8. **Edge of Town** - Navigation gateway
9. **Utilities Menu** - System functions
10. **Camp** - Party preparation before dungeon
11. **Maze** - Dungeon exploration (3D view)
12. **Combat** - Battle interface
13. **Chest** - Treasure interaction
14. **Character Inspection** - Detail view (context-sensitive)

### State Hierarchy

```
Title Screen
  └─ Castle Menu (hub)
      ├─ Training Grounds (via Edge of Town)
      ├─ Gilgamesh's Tavern
      ├─ Boltac's Trading Post
      ├─ Temple of Cant
      ├─ Adventurer's Inn
      ├─ Edge of Town
      │   ├─ Training Grounds
      │   ├─ Maze → Camp → Maze (exploring)
      │   │                  ├─ Combat → Chest (optional)
      │   │                  └─ Camp (return via C key)
      │   ├─ Utilities
      │   └─ Leave Game (exit)
      └─ Character Inspection (from multiple locations)
```

---

## Scene Details

### 1. Title Screen

**Description**: Application startup screen

**Entry Conditions**: Application launch

**Actions**:
- **(S)TART THE GAME** - Begin playing
- **(M)AKE A SCENARIO DISK** - Legacy option (non-functional in modern versions)

**UI Elements**:
- Game title
- Menu options with highlighted first letters
- Copyright/version information

**Navigation**:
- (S) → Castle Menu
- (M) → Scenario disk creation (skip in modern version)

**Exit Conditions**: Select an option

---

### 2. Castle Menu

**Description**: Central hub for all town services

**Entry Conditions**:
- From Title Screen (S)
- From any Castle location (L)eave
- From Edge of Town (C)astle

**Actions**:
- **(G)ILGAMESH'S TAVERN** - Party formation
- **(T)EMPLE OF CANT** - Healing services
- **(B)OLTAC'S TRADING POST** - Shop
- **(A)DVENTURER'S INN** - Rest and level up
- **(E)DGE OF TOWN** - External access

**UI Elements**:
- List of available locations
- Single-keystroke menu
- Castle illustration (platform-dependent)

**Navigation**:
- (G) → Gilgamesh's Tavern
- (T) → Temple of Cant
- (B) → Boltac's Trading Post
- (A) → Adventurer's Inn
- (E) → Edge of Town

**Exit Conditions**: Select destination

**Notes**: This is the "safe zone" - no random encounters, permanent save point

---

### 3. Training Grounds

**Description**: Character creation and roster management

**Entry Conditions**:
- From Edge of Town (T)raining Grounds
- Must navigate: Castle → Edge of Town → Training Grounds

**Actions**:
- **(C)REATE A CHARACTER** - Generate new adventurer
- **(I)NSPECT A CHARACTER** - View/modify character
  - Sub-actions: (D)elete, (C)hange Class, (A)lter Password
- **(R)OSTER OF CHARACTERS** - List all characters with status
- **(L)EAVE** - Return to Edge of Town

**UI Elements**:
- Character creation wizard (race, alignment, stats, class)
- Roster list with character names and statuses
- Stat rolling interface with bonus point allocation

**Navigation**:
- (C) → Character Creation Flow
- (I) → Character Inspection Screen (Training Grounds mode)
- (R) → Character Roster Display
- (L) → Edge of Town

**Exit Conditions**: (L)eave

**Character Status Indicators**:
- **OK** - Available for recruitment
- **IN MAZE** - Currently adventuring
- **OUT** - Stranded in dungeon (needs rescue)
- **ASHES/LOST** - Dead, needs resurrection

---

### 4. Gilgamesh's Tavern

**Description**: Party formation and management

**Entry Conditions**:
- From Castle Menu (G)
- Must have at least one character created

**Actions**:
- **(A)DD** - Add character to party (max 6)
  - Alignment restrictions enforced (good/evil cannot mix, neutral can mix with either)
- **(#)INSPECT** - View party member by position number (1-6)
- **(R)EMOVE** - Remove character from party
- **(D)IVVY GOLD** - Distribute pooled gold equally among party
- **(L)EAVE** - Return to Castle

**UI Elements**:
- Current party roster (6 slots)
- Available characters list
- Party gold total
- Character position numbers

**Navigation**:
- (A) → Character selection list
- (#) → Character Inspection Screen (Tavern mode)
- (R) → Character removal
- (D) → Gold distribution
- (L) → Castle Menu

**Exit Conditions**: (L)eave

**Party Composition Rules**:
- Maximum 6 characters
- Good and Evil cannot coexist
- Neutral can mix with either alignment
- No class restrictions

---

### 5. Boltac's Trading Post

**Description**: Equipment shop - buy, sell, identify, uncurse

**Entry Conditions**:
- From Castle Menu (B)
- Prompts for character selection immediately

**Actions**:
- **(B)UY** - Browse inventory
  - Sub-actions: (F)orward, (B)ackward (navigation), (P)urchase by number
  - Shows item compatibility warnings
- **(S)ELL** - Sell equipment (reduced value)
- **(I)DENTIFY** - Identify unknown items (costs gold)
- **(U)NCURSE** - Remove cursed items (costs gold)
- **(P)OOL GOLD** - Consolidate party funds
- **(L)EAVE** - Return to Castle

**UI Elements**:
- Item list with numbers, names, prices
- Character inventory display
- Gold balance
- Item compatibility indicators

**Navigation**:
- (B) → Shopping catalog
- (S) → Sell interface
- (I) → Identify interface
- (U) → Uncurse interface
- (P) → Pool gold
- (L) → Castle Menu

**Exit Conditions**: (L)eave

**Shopping Details**:
- Items numbered 1-N
- Pagination with (F)orward/(B)ackward
- Purchase by typing item number
- Compatibility warnings if character can't use item
- Prices fixed (no haggling)

---

### 6. Temple of Cant

**Description**: Healing and resurrection services

**Entry Conditions**:
- From Castle Menu (T)
- Displays list of characters needing help

**Actions**:
- **Select Character** - Choose from list of afflicted
- **View Tithe** - See required gold payment
- **Select Payer** - Choose who pays from party
- **Confirm Service** - Process healing/resurrection

**UI Elements**:
- List of afflicted characters with conditions
- Tithe amount display
- Party member selection for payment
- Success/failure messages

**Navigation**:
- Select character → Tithe display → Payer selection → Result
- Automatic return to Castle Menu after service

**Exit Conditions**: Service completed or cancelled

**Services**:
- **Cure Poison** - Remove poison status
- **Cure Paralysis** - Remove paralysis
- **Resurrect** - Restore dead character
  - Success rate based on Vitality
  - Failure can result in ASHES (permanent death risk)
- **Restore from Ashes** - Last chance resurrection
  - Very expensive
  - Low success rate
  - Failure = LOST (permanent death)

**Tithe Costs**: Scale with character level and service type

---

### 7. Adventurer's Inn

**Description**: Rest, heal, and level up

**Entry Conditions**:
- From Castle Menu (A)
- Prompts for character selection

**Actions**:
- **Select Room Type** - Choose accommodation
  - Stables (0 HP/week, 0 gp)
  - Barracks (1 HP/week, 10 gp)
  - Double Occupancy (3 HP/week, 50 gp)
  - Private (7 HP/week, 200 gp)
  - Royal Suite (10 HP/week, 500 gp)
- **(P)OOL GOLD** - Add party funds
- **[SPACE]** - Early checkout
- **Wait** - Automatic healing and level check

**UI Elements**:
- Room type menu with costs
- Character HP display (current/max)
- Gold balance
- Days rested counter
- Level up notification

**Navigation**:
- Select room → Pay → Rest → Level check → Castle Menu
- (P) during rest → Pool gold

**Exit Conditions**: Fully healed or early checkout

**Level Up Process**:
1. Upon full HP recovery, experience check
2. If XP ≥ required for next level → Level up!
3. Stats may increase
4. New spells available (for casters)
5. HP increased
6. Display new level stats

**Notes**: Only way to gain levels (can't level up in dungeon)

---

### 8. Edge of Town

**Description**: Gateway to external locations and utilities

**Entry Conditions**:
- From Castle Menu (E)

**Actions**:
- **(T)RAINING GROUNDS** - Character creation
- **(M)AZE** - Enter dungeon
- **(C)ASTLE** - Return to Castle
- **(U)TILITIES** - System functions
- **(L)EAVE GAME** - Save and exit

**UI Elements**:
- Simple menu list
- Current party indicator

**Navigation**:
- (T) → Training Grounds
- (M) → Camp (dungeon entry)
- (C) → Castle Menu
- (U) → Utilities Menu
- (L) → Title Screen (with save)

**Exit Conditions**: Select destination

**Notes**: Required intermediate screen, cannot go directly from Castle to Training Grounds or Maze

---

### 9. Utilities Menu

**Description**: System functions and party recovery

**Entry Conditions**:
- From Edge of Town (U)

**Actions**:
- **(C)HANGE NAME** - Rename character
  - Select character by letter
  - Type new name + Enter
- **(R)ESTART AN "OUT" PARTY** - Rescue stranded party
  - Moves party from dungeon back to Castle
  - Used when party marked "OUT"
- **(L)EAVE** - Return to Edge of Town

**UI Elements**:
- Simple menu
- Character selection list for rename

**Navigation**:
- (C) → Name change flow
- (R) → Party recovery
- (L) → Edge of Town

**Exit Conditions**: (L)eave

**Notes**: Critical for recovering parties that quit in dungeon (Q command)

---

### 10. Camp

**Description**: Party preparation before entering dungeon proper

**Entry Conditions**:
- From Edge of Town (M)aze
- From Maze (C)amp
- First screen when entering dungeon

**Actions**:
- **(#)INSPECT** - View character by position (1-6)
  - Full action set: (R)ead, (S)pell, (U)se, (D)rop, (P)ool, (I)dentify, (E)quip, (T)rade, (L)eave
- **(R)EORDER** - Arrange party formation
  - Enter numbers 1-6 for positions
  - Front row (1-3): Can attack and be attacked
  - Back row (4-6): Cannot melee attack, protected from melee
- **(E)QUIP** - Outfit all party members
- **(L)EAVE** - Enter maze proper

**UI Elements**:
- Party roster with positions
- Character status summary
- Equipment lists

**Navigation**:
- (#) → Character Inspection (Camp mode - full actions)
- (R) → Reorder interface
- (E) → Equip party
- (L) → Maze (exploration mode)

**Exit Conditions**: (L)eave to Maze

**Formation Strategy**:
- Position 1-3 (front): High HP, good AC (Fighters, Lords, Samurai)
- Position 4-6 (back): Spellcasters, support (Mages, Priests, Thieves)

---

### 11. Maze (Exploration)

**Description**: 3D dungeon exploration with first-person view

**Entry Conditions**:
- From Camp (L)eave
- Return from Combat (after victory)

**Actions**:
- **Movement**:
  - (W) or ↑ - Move forward
  - (A) or ← - Turn left 90°
  - (D) or → - Turn right 90°
  - (X) - Turn around 180°
  - (F) - Forward (alternate)
  - (L) - Left (alternate)
  - (R) - Right (alternate)
- **Commands**:
  - (C) - Return to Camp
  - (O) - Toggle info windows
  - (I) - Inspect for lost parties
  - (S) - Update status display
  - (T) - Adjust message speed (1-99)
  - (Q) - Quit and save (party marked "OUT")

**UI Elements**:
- **3D View Window**: First-person dungeon view
  - Shows walls, doors, corridors ahead
  - 3 tiles deep visibility
  - Wire-frame or filled graphics (platform-dependent)
- **Status Window**: Party member list
  - Name, HP, Status
  - Position indicator
- **Message Window**: Events and encounters
- **Compass**: Current facing direction (N/S/E/W)
- **Coordinates**: Current position (X, Y, Level)

**Navigation**:
- Movement keys → New position in Maze
- (C) → Camp
- (Q) → Edge of Town (party saved as "OUT")
- Random encounters → Combat
- Chest found → Chest interface
- Stairs → Level transition prompt

**Exit Conditions**:
- (Q)uit - Party saved in dungeon
- Stairs up from Level 1 - Return to Castle
- Party wipe - Game over

**Special Tiles**:
- **Doors**: Block passage, can be opened
- **Stairs Up**: Return to previous level or Castle
- **Stairs Down**: Descend to next level
- **Teleporters**: Instant transport
- **Spinners**: Rotate party direction
- **Darkness**: No visibility
- **Anti-Magic**: Spells suppressed

**Random Encounters**: Chance per step based on dungeon level

---

### 12. Combat

**Description**: Turn-based battle interface

**Entry Conditions**:
- Random encounter during Maze exploration
- Fixed encounter at specific locations
- Boss fight

**Actions** (per character, per round):
- **(F)IGHT** - Physical attack
  - Only positions 1-3 can use
  - Select target enemy group (A-D)
- **(P)ARRY** - Defensive stance
  - Improves AC temporarily
  - Anyone can use
- **(D)ISPELL** - Turn undead
  - Priest, Bishop, Lord only
  - Select undead group
  - Success chance: (Level difference × 10%)
- **(S)PELL** - Cast spell
  - Type first letters of spell name + Enter
  - Select target if needed (enemy group or party member)
- **(U)SE** - Use item
  - Select item from inventory
  - Type item name or number
- **(R)UN** - Attempt escape
  - All party members must choose RUN
  - Success chance based on AGI and enemy level
- **(T)AKE BACK** - Revise action selection

**UI Elements**:
- **Monster Window**: Enemy groups A-D
  - Monster type, quantity
  - Visual representation
- **Party Status**: Character HP, conditions
- **Command Prompt**: Action selection for each character
- **Message Log**: Combat results

**Combat Flow**:
1. **Input Phase**: Select action for each character
2. **Confirmation**: (T)ake Back or Enter to proceed
3. **Initiative Phase**: Determine action order (AGI-based)
4. **Resolution Phase**: Execute actions in order
5. **Result Display**: Damage, effects, deaths
6. **Round Check**: Continue or end combat

**Navigation**:
- Victory → Treasure check → Maze (exploration)
- Victory with chest → Chest interface
- Defeat (party wipe) → Game over
- Successful flee → Maze (previous position)

**Exit Conditions**:
- All enemies defeated (victory)
- All party members dead (defeat)
- Successful flee

**Post-Combat**:
- XP awarded to living characters
- Gold added to party pool
- Treasure chest may appear

---

### 13. Chest

**Description**: Treasure chest interaction with trap handling

**Entry Conditions**:
- After combat victory (some encounters)
- Found during Maze exploration

**Actions**:
- **(O)PEN** - Open chest directly
  - Triggers trap if present
  - Immediate treasure collection
- **(I)NSPECT** - Examine for traps
  - Success based on Thief AGI × 6%
  - Identifies trap type if successful
  - Small chance to trigger trap (1-2%)
- **(C)ALFO** - Cast CALFO spell
  - Requires Priest with spell available
  - 95% success rate
  - No trigger risk
  - Identifies trap type
- **(D)ISARM** - Attempt to disarm trap
  - Must know trap type (from Inspect or CALFO)
  - Type exact trap name
  - Success based on level (+50 for Thief/Ninja)
  - Wrong trap type → high trigger chance
- **(L)EAVE** - Abandon chest

**UI Elements**:
- Chest description
- Trap detection results
- Disarm success/failure messages
- Treasure contents display

**Chest Flow**:
1. Chest appears
2. Select action (O/I/C/D/L)
3. If Inspect/CALFO → Trap identified (or not)
4. If Disarm → Enter trap name → Success/failure
5. If Open or triggered → Collect treasure or take damage
6. Return to Maze or Combat (if Alarm trap)

**Navigation**:
- (O) → Treasure collection → Maze
- (I) → Result → Chest actions
- (C) → Result → Chest actions
- (D) → Result → Treasure or Chest actions (retry)
- (L) → Maze
- Trap triggered → Damage/effects → Maze or Combat (Alarm)

**Exit Conditions**: Chest opened, abandoned, or trap triggered

**Treasure Collection**:
- Gold added to party pool
- Items go to opener's inventory
- **⚠️ Critical**: If inventory full (8/8), items LOST FOREVER (no warning)

**Trap Types**: POISON_NEEDLE, GAS_BOMB, CROSSBOW_BOLT, EXPLODING_BOX, STUNNER, TELEPORTER, MAGE_BLASTER, PRIEST_BLASTER, ALARM

---

### 14. Character Inspection

**Description**: Detailed character view with context-sensitive actions

**Entry Conditions**:
- From Training Grounds (I)nspect
- From Tavern (#)Inspect
- From Camp (#)Inspect
- From Maze via Camp

**Display**:
- Character name, race, alignment, class
- Level, Experience, Next Level XP
- Attributes (STR, IQ, PIE, VIT, AGI, LUK)
- Hit Points (current/max)
- Armor Class
- Status conditions
- Gold
- Spell points by level (for casters)
- Equipment (8 slots):
  - Equipped items marked
  - Cursed items marked

**Actions** (context-dependent):

**Training Grounds Mode**:
- (R)EAD - View spell book
- (L)EAVE - Exit inspection

**Tavern Mode**:
- (R)EAD - View spell book
- (D)ROP - Drop item permanently
- (P)OOL GOLD - Add gold to party pool
- (I)DENTIFY - Identify unknown items (Bishops only)
- (E)QUIP - Change equipped items
- (T)RADE - Trade with other party members
- (L)EAVE - Exit inspection

**Camp/Maze Mode** (full access):
- (R)EAD - View spell book
- (S)PELL - Cast spells
- (U)SE - Use magical items
- (D)ROP - Drop item permanently
- (P)OOL GOLD - Add gold to party pool
- (I)DENTIFY - Identify unknown items (Bishops only)
- (E)QUIP - Change equipped items
- (T)RADE - Trade with other party members
- (L)EAVE - Exit inspection

**UI Elements**:
- Character portrait (platform-dependent)
- Stat block
- Equipment list with slot indicators
- Spell book (if caster)
- Available actions list

**Navigation**:
- (R) → Spell book display → Character Inspection
- (S) → Spell selection → Cast → Character Inspection
- (U) → Item selection → Use → Character Inspection
- (D) → Item selection → Drop → Character Inspection
- (E) → Equipment screen → Select → Character Inspection
- (T) → Trade partner selection → Items → Character Inspection
- (L) → Return to calling screen

**Exit Conditions**: (L)eave

**Notes**:
- Same screen template used in multiple contexts
- Available actions change based on location
- Critical for party management throughout game

---

## Navigation Patterns

### Hub-and-Spoke Model

**Castle Menu** = Central hub
- All town services accessible from Castle
- Safe zone (no random encounters)
- Always return here between dungeon runs

**Spoke Services**:
- Tavern (party management)
- Shop (equipment)
- Temple (healing)
- Inn (level up)
- Edge of Town (gateway)

### Linear Flows

**Dungeon Entry**: Castle → Edge of Town → Training Grounds/Maze
**Shopping**: Castle → Shop → Transaction → Castle
**Healing**: Castle → Temple → Service → Castle

### State Transitions

**Safe States** (can save and quit):
- Title Screen
- Castle Menu
- Edge of Town (L)eave Game

**Dungeon States** (must quit with Q):
- Camp
- Maze
- Combat

**Automatic Transitions**:
- Combat victory → Maze
- Chest opened → Maze
- Service completed → Castle
- Party wipe → Game over

---

## UI Conventions

### Input Methods

**Single Keystroke**: Most actions (F, P, S, etc.)
**Text Entry**: Character names, spell names, trap names
**Numeric Entry**: Item numbers, character positions
**Confirmation**: Enter key for multi-step actions
**Cancel**: Space bar or L)eave

### Visual Patterns

**Highlighted First Letters**: (A)ction, (B)uy, (C)amp
**Number Signs**: (#)Inspect = enter character number
**Parentheses**: (F)orward indicates single-key command
**Capital Letters**: First letter always capitalized in option

### Feedback

**Immediate**: Most actions execute immediately
**Confirmation Prompts**: "Do you want to...? (Y/N)"
**Error Messages**: "You can't do that here"
**Success/Failure**: "Success!" or "Failed!"

---

## Critical Flow Requirements

### Session Management

**Save Points**:
- (L)eave Game from Edge of Town - Saves all
- (Q)uit from Maze - Saves party as "OUT"
- Inn/Temple transactions - Auto-save

**No Mid-Dungeon Save**: Must quit to save location

### Party State Tracking

**OK**: Available at Training Grounds
**IN PARTY**: At Tavern, ready to adventure
**IN MAZE**: Currently adventuring
**OUT**: Quit from dungeon, can be restarted
**DEAD/ASHES/LOST**: Needs resurrection

### Level Progression

**Required Flow**: Dungeon → Castle → Inn → Level Up
- Cannot level up in dungeon
- Must rest at Inn to gain levels
- Must return to Castle to access Inn

---

## Recommendations for Documentation

Based on the research, I recommend creating:

### 1. Scene Documentation (14 files)
One file per scene with:
- Description
- Entry conditions
- Available actions
- UI layout specification
- Navigation options
- Exit conditions
- State data requirements

### 2. UI Flow Diagram
Visual state machine showing all scene transitions

### 3. Navigation Reference
Quick-reference table:
```
From         | Action  | To
-------------|---------|------------
Castle       | (G)     | Tavern
Castle       | (E)     | Edge of Town
Edge of Town | (M)     | Camp
etc.
```

### 4. UI/UX Guidelines
- Input patterns
- Visual conventions
- Feedback mechanisms
- Error handling

### 5. State Management Spec
- Application state structure
- Scene state requirements
- Persistence requirements
- Transition rules

---

## Validation Status

- ✅ **All 14 scenes identified**
- ✅ **Navigation flow validated**
- ✅ **Action lists complete**
- ✅ **UI conventions documented**
- ✅ **State transitions mapped**
- ✅ **Input methods cataloged**

**Validation Date**: 2025-10-26
**Validated By**: Claude Code (research compilation)
**Sources**: 3 authoritative sources (Manual, Documentation, Strategy Wiki)
