# Character Inspection

## Overview

**Description:** Detailed character view with context-sensitive actions. The same screen appears in multiple locations (Training Grounds, Tavern, Camp) with different available actions based on context.

**Scene Type:** Context-dependent (inherits from parent scene)

**Location in Game Flow:** Multi-context detail view - accessed from Training Grounds, Tavern, and Camp

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Training Grounds → (I)nspect → Character Inspection (Training Grounds mode)
- Tavern → (#)Inspect → Character Inspection (Tavern mode)
- Camp → (#)Inspect → Character Inspection (Camp mode)

**Context Modes:**
- **Training Grounds:** Limited actions (Read, Leave, Delete, Change Class, Alter Password)
- **Tavern:** Medium actions (Read, Drop, Pool, Identify, Equip, Trade, Leave)
- **Camp:** Full actions (Read, Spell, Use, Drop, Pool, Identify, Equip, Trade, Leave)

### Requirements

**State Requirements:**
- [ ] Character must exist
- [ ] Character selected from parent scene

**Note:** Available actions depend on entry context. Camp mode has full access, Training Grounds mode has minimal access.

### State Prerequisites

```typescript
interface CharacterInspectionEntryState {
  character: Character  // Selected character
  mode: InspectionMode  // TRAINING_GROUNDS, TAVERN, or CAMP
  parentScene: SceneType  // To return to correct scene
}

enum InspectionMode {
  TRAINING_GROUNDS = 'TRAINING_GROUNDS',  // Limited: delete, class change, password
  TAVERN = 'TAVERN',                      // Medium: inventory management
  CAMP = 'CAMP'                           // Full: spells, items, everything
}
```

---

## UI Layout

### Screen Regions

- **Header:** Character name, race, alignment, class
- **Stats:** Level, XP, STR, IQ, PIE, VIT, AGI, LUK
- **Status:** HP, AC, Status conditions, Gold
- **Equipment:** 8 equipment slots with equipped items
- **Spells:** Spell points and spell list (for casters)
- **Actions:** Context-sensitive menu

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  GANDALF  (Human, Good, Mage)       │
├─────────────────────────────────────┤
│  Level: 5       XP: 12,450          │
│  Next Level: 15,000 XP              │
│                                     │
│  STR: 10  IQ: 18  PIE: 12           │
│  VIT: 11  AGI: 14  LUK: 13          │
│                                     │
│  HP: 15/15      AC: 4               │
│  Status: OK     Gold: 500           │
│                                     │
│  EQUIPMENT:                         │
│  1. Staff (Equipped)                │
│  2. Robe (Equipped)                 │
│  3. Potion of Healing               │
│  4. Scroll of MAHALITO              │
│  5-8. (Empty)                       │
│                                     │
│  SPELLS: (Mage)                     │
│  L1: 3/3  L2: 2/2  L3: 1/1          │
├─────────────────────────────────────┤
│  (R)EAD  (S)PELL  (U)SE  (D)ROP     │
│  (P)OOL  (I)D  (E)QUIP  (T)RADE     │
│  (L)EAVE                            │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Complete character sheet displayed
- Equipment slots numbered 1-8
- Equipped items marked clearly
- Cursed items indicated (if identified)
- Action menu changes based on context mode

---

## Display Information

### Character Header

```
[Name]  ([Race], [Alignment], [Class])
```

**Example:** `GANDALF  (Human, Good, Mage)`

### Stats Block

```
Level: [X]       XP: [Current]
Next Level: [Required] XP

STR: [X]  IQ: [X]  PIE: [X]
VIT: [X]  AGI: [X]  LUK: [X]

HP: [Current]/[Max]      AC: [X]
Status: [OK/WOUNDED/POISONED/etc.]
Gold: [X] gp
```

### Equipment Display

```
EQUIPMENT:
1. [Item Name] (Equipped) [*Cursed if applicable]
2. [Item Name] (Equipped)
3. [Item Name]
4. [Item Name]
5. (Empty)
6. (Empty)
7. (Empty)
8. (Empty)
```

**Notes:**
- Max 8 items per character
- Equipped items marked
- Cursed items marked with asterisk (if identified)
- Unidentified items show as "Unknown Item"

### Spell Display (Casters Only)

```
SPELLS: (Mage/Priest)
L1: [Current]/[Max]  L2: [Current]/[Max]  L3: [Current]/[Max]
L4: [Current]/[Max]  L5: [Current]/[Max]  L6: [Current]/[Max]
L7: [Current]/[Max]
```

**Example:** `L1: 3/3  L2: 2/2  L3: 1/1`

---

## Available Actions by Mode

### Training Grounds Mode

**Available Actions:**
- (R)ead - View spell book
- (D)elete - Permanently delete character (requires password)
- (C)hange Class - Change to eligible class
- (A)lter Password - Update password
- (L)eave - Return to Training Grounds

**Restricted:** No inventory management, no spell casting, no item use

### Tavern Mode

**Available Actions:**
- (R)ead - View spell book
- (D)rop - Drop item permanently
- (P)ool Gold - Add gold to party pool
- (I)dentify - Identify items (Bishops only)
- (E)quip - Change equipped items
- (T)rade - Trade items with party member
- (L)eave - Return to Tavern

**Restricted:** No spell casting, no item use (safe zone)

### Camp Mode (Full Access)

**Available Actions:**
- (R)ead - View spell book
- (S)pell - Cast spells (preparation spells)
- (U)se - Use items
- (D)rop - Drop item permanently
- (P)ool Gold - Add gold to party pool
- (I)dentify - Identify items (Bishops only)
- (E)quip - Change equipped items
- (T)rade - Trade items with party member
- (L)eave - Return to Camp

**Full access:** All character management actions available

---

## Common Actions (All Modes)

### (R) Read Spell Book

**Description:** View character's known spells

**Key Binding:** R (case-insensitive)

**Requirements:**
- Character is spellcaster (Mage, Priest, Bishop, Lord, Samurai)

**Flow:**
1. User presses 'R'
2. Display spell list by level
3. Show known spells for each level
4. Press any key to return

**Spell Book Display:**

```
MAGE SPELLS:

Level 1: (3/3 SP)
- HALITO (Fire Breath)
- DUMAPIC (Map Location)
- KATINO (Sleep)

Level 2: (2/2 SP)
- DILTO (Bright Light)
- SOPIC (Wizard Eye)

Level 3: (1/1 SP)
- MAHALITO (Big Fireball)

Press any key to continue...
```

**Validation:**

```typescript
function canReadSpellBook(character: Character): { allowed: boolean; reason?: string } {
  if (!character.isSpellcaster()) {
    return { allowed: false, reason: "Character is not a spellcaster" }
  }

  if (character.knownSpells.length === 0) {
    return { allowed: false, reason: "No spells learned yet" }
  }

  return { allowed: true }
}
```

**State Changes:**
- None (read-only display)

**UI Feedback:**
- Display spell list
- Show spell points for each level
- Show spell names and descriptions

**Transitions:**
- Remains in Character Inspection

---

### (L) Leave Inspection

**Description:** Return to parent scene

**Key Binding:** L (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'L'
2. Save any changes
3. Return to parent scene

**Validation:**

```typescript
function canLeave(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always allowed
}
```

**State Changes:**
- `state.currentScene = parentScene` (Training Grounds, Tavern, or Camp)
- Auto-save if changes made (depends on parent scene type)

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Training Grounds (if mode = TRAINING_GROUNDS)
- → Tavern (if mode = TAVERN)
- → Camp (if mode = CAMP)

---

## Tavern & Camp Mode Actions

### (D) Drop Item

**Description:** Permanently remove item from inventory

**Key Binding:** D (case-insensitive)

**Requirements:**
- Character has items in inventory

**Flow:**
1. User presses 'D'
2. Display inventory
3. Prompt: "Drop which item? (1-8)"
4. User selects item number
5. Prompt: "Drop [Item]? (Y/N)"
6. If Y: Remove item permanently
7. Update display

**Validation:**

```typescript
function canDropItem(character: Character, itemIndex: number): { allowed: boolean; reason?: string } {
  if (character.inventory.length === 0) {
    return { allowed: false, reason: "No items to drop" }
  }

  if (itemIndex < 0 || itemIndex >= character.inventory.length) {
    return { allowed: false, reason: "Invalid item number" }
  }

  const item = character.inventory[itemIndex]
  if (item.equipped && item.cursed) {
    return { allowed: false, reason: "Cannot drop equipped cursed item (uncurse first)" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.inventory.splice(itemIndex, 1)`
- Auto-save (if in safe zone)

**UI Feedback:**
- Prompt: "Drop [Item]? (Y/N)"
- Success: "[Item] dropped"
- Failure: "Cannot drop cursed item"

**Transitions:**
- Remains in Character Inspection

**Warning:** Dropped items are lost forever! No recovery possible.

---

### (P) Pool Gold

**Description:** Transfer character's gold to party pool

**Key Binding:** P (case-insensitive)

**Requirements:**
- Character has gold > 0
- Character in party

**Flow:**
1. User presses 'P'
2. Prompt: "Pool how much gold? (Enter amount or 'ALL')"
3. User enters amount
4. Validate character has that much gold
5. Transfer gold to party pool
6. Update display

**Validation:**

```typescript
function canPoolGold(character: Character, amount: number): { allowed: boolean; reason?: string } {
  if (character.gold === 0) {
    return { allowed: false, reason: "No gold to pool" }
  }

  if (amount > character.gold) {
    return { allowed: false, reason: "Not enough gold" }
  }

  if (!character.inParty) {
    return { allowed: false, reason: "Character must be in a party" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.gold -= amount`
- `party.pooledGold += amount`
- Auto-save (if in safe zone)

**UI Feedback:**
- Success: "[X] gold pooled"
- Failure: "Not enough gold"

**Transitions:**
- Remains in Character Inspection

---

### (I) Identify Item (Bishops Only)

**Description:** Use Bishop's special ability to identify items for free

**Key Binding:** I (case-insensitive)

**Requirements:**
- Character is Bishop
- Character has unidentified items

**Flow:**
1. User presses 'I'
2. Display unidentified items
3. Prompt: "Identify which item? (1-8)"
4. User selects item
5. Reveal item properties
6. Update display

**Validation:**

```typescript
function canIdentify(character: Character): { allowed: boolean; reason?: string } {
  if (character.class !== Class.BISHOP) {
    return { allowed: false, reason: "Only Bishops can identify items" }
  }

  const hasUnidentified = character.inventory.some(item => !item.identified)
  if (!hasUnidentified) {
    return { allowed: false, reason: "No unidentified items" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `item.identified = true`
- Reveal item name, properties, curse status
- Auto-save (if in safe zone)

**UI Feedback:**
- Success: "This is a [Item Name]!"
- If cursed: "This is a [Item Name]! IT'S CURSED!"

**Transitions:**
- Remains in Character Inspection

**Note:** Bishop identification is free (unlike shop identification which costs gold).

---

### (E) Equip Item

**Description:** Change equipped items

**Key Binding:** E (case-insensitive)

**Requirements:**
- Character has items in inventory

**Flow:**
1. User presses 'E'
2. Display equipment and inventory
3. Prompt: "Equip which item? (1-8) or Unequip (U)"
4. User selects item to equip/unequip
5. Validate can equip
6. Update equipment
7. Recalculate stats (AC, damage, bonuses)
8. Update display

**Equip Display:**

```
EQUIPMENT:

EQUIPPED:
- Staff (Weapon)
- Robe (Armor)

INVENTORY:
1. Staff (Equipped)
2. Robe (Equipped)
3. Dagger
4. Potion of Healing

(E)quip item  (U)nequip item  (L)eave
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

  return { allowed: true }
}

function canUnequip(character: Character, item: Item): { allowed: boolean; reason?: string } {
  if (!item.equipped) {
    return { allowed: false, reason: "Item is not equipped" }
  }

  if (item.cursed) {
    return { allowed: false, reason: "Cannot unequip cursed item (uncurse at shop)" }
  }

  return { allowed: true }
}
```

**State Changes:**
- Toggle `item.equipped`
- Recalculate character stats (AC, attack, bonuses)
- Auto-save (if in safe zone)

**UI Feedback:**
- Success: "[Item] equipped"
- Success: "[Item] unequipped"
- Failure: "Cannot equip cursed item"
- Failure: "Cannot use this item"

**Transitions:**
- Remains in Character Inspection

---

### (T) Trade Items

**Description:** Trade items with another party member

**Key Binding:** T (case-insensitive)

**Requirements:**
- Character in party
- At least one other party member
- Character has items

**Flow:**
1. User presses 'T'
2. Display other party members
3. Prompt: "Trade with whom? (1-6)"
4. User selects trade partner
5. Prompt: "Give which item? (1-8)"
6. User selects item
7. Validate trade partner has inventory space
8. Transfer item
9. Update displays

**Trade Display:**

```
TRADE ITEMS

Trading from: Gandalf
Select partner:
1. Corak (Fighter) - 3/8 items
2. Thief (Thief) - 8/8 items (FULL!)
3. PriestBob (Priest) - 5/8 items

Enter number:
```

**Validation:**

```typescript
function canTrade(character: Character, partner: Character, item: Item): { allowed: boolean; reason?: string } {
  if (!character.inParty || !partner.inParty) {
    return { allowed: false, reason: "Both characters must be in party" }
  }

  if (partner.inventory.length >= 8) {
    return { allowed: false, reason: "Partner's inventory is full" }
  }

  if (item.equipped && item.cursed) {
    return { allowed: false, reason: "Cannot trade equipped cursed item" }
  }

  return { allowed: true }
}
```

**State Changes:**
- Remove item from character inventory
- Add item to partner inventory
- Update both displays
- Auto-save (if in safe zone)

**UI Feedback:**
- Success: "Traded [Item] to [Partner]"
- Failure: "Partner's inventory is full"
- Failure: "Cannot trade cursed item"

**Transitions:**
- Remains in Character Inspection

---

## Camp Mode Only Actions

### (S) Cast Spell

**Description:** Cast preparation or utility spells

**Key Binding:** S (case-insensitive)

**Requirements:**
- Character is spellcaster
- Character has spell points
- Not in combat (preparation spells only)

**Flow:**
1. User presses 'S'
2. Prompt: "Cast which spell? (Type name)"
3. User types spell name (e.g., "DUMAPIC")
4. Validate spell known and has SP
5. If target needed: Prompt for target
6. Cast spell
7. Consume spell points
8. Apply effects
9. Update display

**Castable Spells (Camp/Maze):**
- **DUMAPIC** - Show current position (X, Y, Level)
- **MALOR** - Teleport to known location
- **MILWA** - Light (improves visibility)
- **LOMILWA** - Darkness (reduces visibility, stealth)
- **LATUMAPIC** - Identify party position and facing
- **DIALKO** - Cure paralysis
- **DIOS** - Heal wounds (1-8 HP)
- **PORFIC** - Shield (improve AC)

**Validation:**

```typescript
function canCastSpell(character: Character, spellName: string): { allowed: boolean; reason?: string } {
  if (!character.isSpellcaster()) {
    return { allowed: false, reason: "Character is not a spellcaster" }
  }

  const spell = character.getSpell(spellName)
  if (!spell) {
    return { allowed: false, reason: "Spell not known" }
  }

  const spellCost = spell.level
  if (character.getSpellPoints(spell.type) < spellCost) {
    return { allowed: false, reason: "Not enough spell points" }
  }

  if (!spell.canCastInCamp) {
    return { allowed: false, reason: "Cannot cast this spell here (combat only)" }
  }

  return { allowed: true }
}
```

**State Changes:**
- Consume spell points
- Apply spell effects (heal, buff, teleport, etc.)
- Update character/party state
- No save (in dungeon)

**UI Feedback:**
- Success: "[Spell] cast successfully! [Effects]"
- Failure: "Not enough spell points"
- Failure: "Cannot cast this spell here"

**Transitions:**
- Remains in Character Inspection
- If MALOR: May teleport party (return to Maze)

---

### (U) Use Item

**Description:** Use consumable or magical items

**Key Binding:** U (case-insensitive)

**Requirements:**
- Character has usable items

**Flow:**
1. User presses 'U'
2. Display usable items
3. Prompt: "Use which item? (1-8)"
4. User selects item
5. If target needed: Prompt for target
6. Use item
7. Apply effects
8. Remove item if consumable
9. Update display

**Usable Items:**
- **Potions** - Healing, stat buffs
- **Scrolls** - One-time spell casts
- **Wands** - Limited-use magical effects
- **Special items** - Quest items with effects

**Validation:**

```typescript
function canUseItem(character: Character, item: Item): { allowed: boolean; reason?: string } {
  if (!item.isUsable) {
    return { allowed: false, reason: "This item cannot be used" }
  }

  if (item.requiresCombat && !inCombat) {
    return { allowed: false, reason: "Can only use in combat" }
  }

  return { allowed: true }
}
```

**State Changes:**
- Apply item effects (heal, buff, damage, etc.)
- If consumable: Remove from inventory
- Update character/party state
- No save (in dungeon)

**UI Feedback:**
- Success: "[Item] used! [Effects]"
- Failure: "Cannot use this item here"

**Transitions:**
- Remains in Character Inspection

---

## Training Grounds Mode Only Actions

### (D) Delete Character

**Description:** Permanently remove character from roster

**Key Binding:** D (case-insensitive)

**Requirements:**
- Character not in party
- Character not IN_MAZE

**Flow:**
1. User presses 'D'
2. Prompt: "Delete [Name]? This cannot be undone!"
3. Prompt: "Enter password to confirm:"
4. User enters password
5. Validate password
6. If correct: Delete character permanently
7. Return to Training Grounds

**Validation:**

```typescript
function canDeleteCharacter(character: Character, password: string): { allowed: boolean; reason?: string } {
  if (character.inParty) {
    return { allowed: false, reason: "Cannot delete character in party (remove from party first)" }
  }

  if (character.inMaze) {
    return { allowed: false, reason: "Cannot delete character in maze (restart party first)" }
  }

  if (character.password !== password) {
    return { allowed: false, reason: "Invalid password" }
  }

  return { allowed: true }
}
```

**State Changes:**
- Remove character from roster permanently
- Free up roster slot
- Auto-save

**UI Feedback:**
- Prompt: "Delete [Name]? This cannot be undone!"
- Prompt: "Enter password:"
- Success: "[Name] deleted"
- Failure: "Invalid password"
- Failure: "Cannot delete character in party"

**Transitions:**
- → Training Grounds (after deletion)

**Warning:** This is permanent and cannot be undone!

---

### (C) Change Class

**Description:** Change character's class (if eligible)

**Key Binding:** C (case-insensitive)

**Requirements:**
- Character meets new class requirements
- Character has gold (costs money)

**Flow:**
1. User presses 'C'
2. Display available classes based on stats
3. Prompt: "Change to which class?"
4. User selects new class
5. Show cost
6. Prompt: "Pay [Cost] gold? (Y/N)"
7. If Y: Change class, reset to level 1 (if basic class)
8. Update display

**Class Change Rules:**
- **To basic class:** Reset to level 1, lose XP
- **To elite class:** Must meet stat requirements, keep level
- **Cost:** Based on target class (elite classes more expensive)

**Validation:**

```typescript
function canChangeClass(character: Character, newClass: Class): { allowed: boolean; reason?: string } {
  const requirements = getClassRequirements(newClass)

  if (!character.meetsRequirements(requirements)) {
    return { allowed: false, reason: "Does not meet class requirements" }
  }

  const cost = getClassChangeCost(newClass)
  if (character.gold < cost) {
    return { allowed: false, reason: "Not enough gold" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.class = newClass`
- If basic class: `character.level = 1`, `character.xp = 0`
- `character.gold -= cost`
- Recalculate all stats, HP, spells
- Auto-save

**UI Feedback:**
- Success: "[Name] is now a [New Class]!"
- If reset: "Level reset to 1"
- Failure: "Does not meet requirements"
- Failure: "Not enough gold"

**Transitions:**
- Remains in Character Inspection

---

### (A) Alter Password

**Description:** Change character's password

**Key Binding:** A (case-insensitive)

**Requirements:**
- Know current password

**Flow:**
1. User presses 'A'
2. Prompt: "Enter current password:"
3. User enters current password
4. Validate password
5. Prompt: "Enter new password:"
6. User enters new password
7. Update password
8. Confirm change

**Validation:**

```typescript
function canAlterPassword(character: Character, oldPassword: string): { allowed: boolean; reason?: string } {
  if (character.password !== oldPassword) {
    return { allowed: false, reason: "Invalid password" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.password = newPassword`
- Auto-save

**UI Feedback:**
- Prompt: "Enter current password:"
- Prompt: "Enter new password:"
- Success: "Password updated"
- Failure: "Invalid password"

**Transitions:**
- Remains in Character Inspection

---

## Navigation

### Exits

| Action | Key | Destination | Condition | Mode |
|--------|-----|-------------|-----------|------|
| Read | (R) | Spell Book | Is caster | All |
| Leave | (L) | Parent Scene | Always | All |
| Drop | (D) | Inspection | Has items | Tavern, Camp |
| Pool | (P) | Inspection | Has gold | Tavern, Camp |
| Identify | (I) | Inspection | Is Bishop | Tavern, Camp |
| Equip | (E) | Inspection | Has items | Tavern, Camp |
| Trade | (T) | Inspection | In party | Tavern, Camp |
| Spell | (S) | Inspection | Is caster | Camp |
| Use | (U) | Inspection | Has items | Camp |
| Delete | (D) | Training Grounds | Not in party | Training |
| Change Class | (C) | Inspection | Meets reqs | Training |
| Alter Password | (A) | Inspection | Know password | Training |

### Parent Scenes

- Training Grounds → (I) → Character Inspection (Training mode)
- Tavern → (#) → Character Inspection (Tavern mode)
- Camp → (#) → Character Inspection (Camp mode)

### Child Scenes

- Character Inspection → (R) → Spell Book Display → Inspection
- Character Inspection → (L) → Parent Scene
- Character Inspection → (Actions) → Inspection (updated)

---

## State Management

### Scene State

```typescript
interface CharacterInspectionState {
  character: Character
  mode: InspectionMode
  parentScene: SceneType
  subMode: 'VIEW' | 'SPELL_BOOK' | 'EQUIPPING' | 'TRADING' | null
  selectedItem: Item | null
  tradePartner: Character | null
}
```

**Notes:**
- Context mode determines available actions
- Sub-modes for complex interactions
- Parent scene tracked for return navigation

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.CHARACTER_INSPECTION`
- `state.inspectionMode = mode` (from parent)
- Load character data

**On Actions:**
- Update character data based on action
- Recalculate stats if equipment changed
- Auto-save if in safe zone (Training, Tavern)
- No save if in dungeon (Camp)

**On Exit:**
- Save changes if in safe zone
- Return to parent scene

### Persistence

- **Auto-save:** Yes, if in safe zone (Training Grounds, Tavern)
- **Auto-save:** No, if in dungeon (Camp)
- **Manual save:** No

---

## Implementation Notes

### Services Used

- `CharacterService.getCharacterData(id)`
- `InventoryService.equipItem(character, item)`
- `InventoryService.tradeItem(from, to, item)`
- `SpellService.castSpell(character, spell, target)`
- `ItemService.useItem(character, item, target)`
- `CharacterService.deleteCharacter(id, password)`
- `CharacterService.changeClass(id, newClass)`
- `CharacterService.alterPassword(id, oldPassword, newPassword)`

### Commands

- `ReadSpellBookCommand` - View spells
- `DropItemCommand` - Remove item
- `PoolGoldCommand` - Transfer gold
- `IdentifyItemCommand` - Reveal item (Bishop)
- `EquipItemCommand` - Change equipment
- `TradeItemCommand` - Transfer to party member
- `CastSpellCommand` - Use spell (Camp mode)
- `UseItemCommand` - Consume item (Camp mode)
- `DeleteCharacterCommand` - Remove character (Training mode)
- `ChangeClassCommand` - Change class (Training mode)
- `AlterPasswordCommand` - Update password (Training mode)
- `LeaveInspectionCommand` - Return to parent

### Edge Cases

1. **Context mode validation:**
   - Ensure actions only available in correct mode
   - Block combat spells in Camp mode
   - Block item use in Tavern mode

2. **Cursed item handling:**
   - Cannot unequip cursed items
   - Cannot drop equipped cursed items
   - Cannot trade equipped cursed items

3. **Inventory full:**
   - Cannot trade to character with full inventory
   - Warn before receiving items

4. **Class change reset:**
   - Changing to basic class resets level to 1
   - Changing to elite class keeps level
   - Confirm before reset

5. **Password protection:**
   - Delete requires password
   - Alter password requires old password
   - No recovery if forgotten

6. **Bishop identification:**
   - Free (unlike shop)
   - Only Bishops can use
   - Instant identification

7. **Spell casting restrictions:**
   - Combat spells blocked in Camp
   - Preparation spells allowed
   - Spell point consumption

### Technical Considerations

- **Context sensitivity:** Action availability based on mode
- **Stats recalculation:** Equipment changes trigger stat updates
- **Spell validation:** Check SP, spell knowledge, context
- **Item validation:** Check usability, requirements, context
- **Save timing:** Depends on parent scene zone type
- **Display refresh:** Update after every action

---

## Testing Scenarios

### Test 1: View Character (All Modes)

```
1. From parent scene, inspect character
2. Verify all stats displayed correctly
3. Verify equipment shown
4. Verify spells shown (if caster)
5. Verify actions match mode
6. Press (L) to leave
7. Verify return to parent scene
```

### Test 2: Equip/Unequip Items

```
1. Inspect character (Tavern or Camp mode)
2. Press (E) to equip
3. Select unequipped item
4. Verify item equipped
5. Verify stats recalculated
6. Select equipped item
7. Verify item unequipped
8. Verify stats recalculated
```

### Test 3: Trade Items

```
1. Inspect character (Tavern or Camp mode)
2. Press (T) to trade
3. Select trade partner
4. Verify partner has inventory space
5. Select item to trade
6. Verify item transferred
7. Verify both inventories updated
```

### Test 4: Cast Spell (Camp Mode)

```
1. Inspect caster (Camp mode)
2. Press (S) to cast spell
3. Type spell name (e.g., DUMAPIC)
4. Verify spell cast
5. Verify SP consumed
6. Verify spell effect applied
```

### Test 5: Delete Character (Training Mode)

```
1. Inspect character (Training Grounds mode)
2. Verify character not in party
3. Press (D) to delete
4. Enter password
5. Confirm deletion
6. Verify character removed from roster
7. Verify return to Training Grounds
```

---

## Related Documentation

- [Training Grounds](./02-training-grounds.md) - Parent scene (Training mode)
- [Tavern](./03-gilgameshs-tavern.md) - Parent scene (Tavern mode)
- [Camp](./09-camp.md) - Parent scene (Camp mode)
- [Equipment System](../../systems/equipment-system.md) - Item mechanics
- [Spell System](../../systems/spell-system.md) - Spell mechanics
- [Character System](../../systems/character-system.md) - Character data
- [Navigation Map](../navigation-map.md) - Complete navigation flow
