# Chest (Treasure Handling)

## Overview

**Description:** Treasure chest interaction interface with trap detection, disarming, and looting. High-risk, high-reward scene requiring strategic decision-making.

**Scene Type:** Dungeon Zone (no auto-save, high risk)

**Location in Game Flow:** Triggered after combat victories (some encounters) or found during maze exploration

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Combat → Victory (if treasure) → Chest
- Maze → Treasure Found → Chest

**Trigger Types:**
- **Post-combat:** Some enemy groups guard treasure chests
- **Random:** Small chance to find chest while exploring
- **Fixed:** Specific locations have guaranteed chests

### Requirements

**State Requirements:**
- [ ] Party in maze
- [ ] Chest discovered (post-combat or exploration)

**Note:** Chests are the primary source of powerful items and large gold rewards, but all chests are potentially trapped.

### State Prerequisites

```typescript
interface ChestEntryState {
  party: Party
  chest: Chest  // Contains trap info, treasure contents
  currentPosition: Position  // Dungeon location
  opener: Character | null  // Who will open/inspect
}

interface Chest {
  trapped: boolean
  trapType: TrapType | null
  trapIdentified: boolean
  contents: TreasureContents
  difficulty: number  // For detection/disarm
}
```

---

## UI Layout

### Screen Regions

- **Header:** "TREASURE CHEST" title
- **Main:** Chest description, trap info (if detected)
- **Actions:** Available options (O/I/C/D/L)
- **Status:** Selected character for action
- **Messages:** Results of actions

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  TREASURE CHEST FOUND!              │
├─────────────────────────────────────┤
│  You discover a treasure chest.     │
│                                     │
│  Who will handle the chest?         │
│  1. Gandalf    (Mage)               │
│  2. Corak      (Fighter)            │
│  3. Thief      (Thief) *RECOMMENDED*│
│  4. PriestBob  (Priest)             │
│                                     │
│  Select character (1-4):            │
│                                     │
├─────────────────────────────────────┤
│  (O)PEN  (I)NSPECT  (C)ALFO         │
│  (D)ISARM  (L)EAVE                  │
│                                     │
│  *Thieves have best trap detection  │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Character selection happens first
- Trap status revealed after inspection
- Clear risk/reward presentation
- Thief characters highlighted for recommendation

---

## Chest Flow

### Overall Process

1. **Chest Appears:** Post-combat or exploration
2. **Character Selection:** Choose who handles chest
3. **Action Selection:** Open, Inspect, CALFO, Disarm, or Leave
4. **Resolution:** Trap check, treasure distribution, or damage
5. **Return:** Back to Maze

---

## Available Actions

### Character Selection (Required First)

**Description:** Choose party member to handle chest

**Flow:**
1. Chest appears
2. Display party roster
3. Prompt: "Who will handle the chest? (1-6)"
4. User selects character number
5. Validate character exists and is alive
6. Set as chest opener
7. Show action menu

**Validation:**

```typescript
function canSelectOpener(party: Party, position: number): { allowed: boolean; reason?: string } {
  if (position < 1 || position > 6) {
    return { allowed: false, reason: "Invalid position" }
  }

  const character = party.members[position - 1]
  if (!character) {
    return { allowed: false, reason: "No character at that position" }
  }

  if (character.status === CharacterStatus.DEAD ||
      character.status === CharacterStatus.PARALYZED) {
    return { allowed: false, reason: "Character cannot act" }
  }

  return { allowed: true }
}
```

**Note:** Thieves and Ninjas have highest trap detection/disarm success rates. Recommended for chest handling.

---

### (O) Open Chest Directly

**Description:** Immediately open chest without checking for traps

**Key Binding:** O (case-insensitive)

**Requirements:**
- Opener selected

**Flow:**
1. User presses 'O'
2. Open chest immediately
3. If trapped: Trigger trap (damage or effects)
4. If not trapped or trap survived: Distribute treasure
5. Return to Maze

**Risk:**
- 100% trigger chance if trapped
- No warning
- Fastest method if confident chest is safe

**Treasure Distribution:**

```typescript
function distributeTreasure(chest: Chest, opener: Character, party: Party): void {
  // Add gold to party pool
  party.pooledGold += chest.contents.gold

  // Items go to opener's inventory
  chest.contents.items.forEach(item => {
    if (opener.inventory.length < 8) {
      opener.inventory.push(item)
    } else {
      // CRITICAL: If inventory full, item is LOST FOREVER
      logMessage(`${item.name} lost! ${opener.name}'s inventory is full!`)
    }
  })
}
```

**Validation:**

```typescript
function canOpenChest(opener: Character): { allowed: boolean; reason?: string } {
  if (!opener) {
    return { allowed: false, reason: "No opener selected" }
  }

  return { allowed: true }
}
```

**State Changes:**
- If trapped: Trigger trap effects
- Add gold to party pool
- Add items to opener's inventory (or lose if full!)
- Remove chest from game
- Return to Maze

**UI Feedback:**
- Not trapped: "The chest opens safely!"
- Trapped: "[Trap Name] triggered! [Effects]"
- Treasure: "Found [Gold] gold and [Items]!"
- **WARNING**: "Inventory full! [Item] is lost forever!"

**Transitions:**
- → Maze (after treasure collected or trap triggered)

---

### (I) Inspect for Traps

**Description:** Attempt to detect and identify trap type

**Key Binding:** I (case-insensitive)

**Requirements:**
- Opener selected
- Trap not yet identified

**Flow:**
1. User presses 'I'
2. Roll detection check (based on opener's AGI and class)
3. If success: Identify trap type
4. If failure: No information revealed
5. Small chance (1-2%) to accidentally trigger trap
6. Return to action menu

**Detection Chance:**

```typescript
function calculateDetectionChance(opener: Character, chest: Chest): number {
  const baseChance = opener.agility * 6  // AGI × 6%

  // Class bonuses
  const classBonus = {
    [Class.THIEF]: 30,
    [Class.NINJA]: 40,
    [Class.BISHOP]: 10,
    default: 0
  }[opener.class] || 0

  const totalChance = baseChance + classBonus
  const difficulty = chest.difficulty || 1

  return Math.min(totalChance / difficulty, 95)  // Max 95%
}

function attemptDetection(opener: Character, chest: Chest): { success: boolean; triggered: boolean } {
  const chance = calculateDetectionChance(opener, chest)
  const roll = random(1, 100)

  // 1-2% chance to trigger trap during inspection
  const triggerRoll = random(1, 100)
  const triggered = triggerRoll <= 2

  return {
    success: roll <= chance,
    triggered
  }
}
```

**Validation:**

```typescript
function canInspect(chest: Chest): { allowed: boolean; reason?: string } {
  if (chest.trapIdentified) {
    return { allowed: false, reason: "Trap already identified" }
  }

  return { allowed: true }
}
```

**State Changes:**
- If success: `chest.trapIdentified = true`
- If triggered: Apply trap effects
- No treasure yet

**UI Feedback:**
- Success: "You detect a [Trap Type] trap!"
- Failure: "You find no traps." (may still be trapped!)
- Triggered: "[Trap Name] triggered! [Effects]"

**Transitions:**
- Remains in Chest scene (can now disarm or open)
- If trap triggered: May return to Maze or trigger combat

---

### (C) Cast CALFO Spell

**Description:** Use CALFO priest spell to magically identify trap

**Key Binding:** C (case-insensitive)

**Requirements:**
- Party has Priest, Bishop, or Lord with CALFO spell
- Caster has spell points available
- Trap not yet identified

**Flow:**
1. User presses 'C'
2. Prompt: "Who will cast CALFO? (1-6)"
3. User selects caster
4. Validate caster has spell and SP
5. Consume spell points (1 SP)
6. Roll CALFO success (95% success rate)
7. If success: Identify trap type
8. If failure: No information, SP still consumed
9. Return to action menu

**CALFO Success:**

```typescript
function castCALFO(caster: Character, chest: Chest): { success: boolean } {
  // Check if caster has CALFO spell
  if (!caster.hasSpell('CALFO')) {
    throw new Error("Caster does not know CALFO")
  }

  // Check spell points
  if (caster.spellPoints < 1) {
    throw new Error("Not enough spell points")
  }

  // Consume spell points
  caster.spellPoints -= 1

  // CALFO has 95% success rate (very reliable)
  const roll = random(1, 100)
  const success = roll <= 95

  if (success) {
    chest.trapIdentified = true
  }

  return { success }
}
```

**Validation:**

```typescript
function canCastCALFO(party: Party, chest: Chest): { allowed: boolean; reason?: string } {
  if (chest.trapIdentified) {
    return { allowed: false, reason: "Trap already identified" }
  }

  const hasCaster = party.members.some(m =>
    m.hasSpell('CALFO') && m.spellPoints >= 1
  )

  if (!hasCaster) {
    return { allowed: false, reason: "No one can cast CALFO" }
  }

  return { allowed: true }
}
```

**State Changes:**
- Consume 1 spell point from caster
- If success: `chest.trapIdentified = true`
- No treasure yet

**UI Feedback:**
- Success: "CALFO reveals a [Trap Type] trap!"
- Failure: "CALFO fails to reveal the trap."
- No caster: "No one can cast CALFO."

**Transitions:**
- Remains in Chest scene (can now disarm or open)

**Advantage:** CALFO is safer than (I)nspect - no trigger risk, high success rate.

---

### (D) Disarm Trap

**Description:** Attempt to disarm identified trap

**Key Binding:** D (case-insensitive)

**Requirements:**
- Trap identified (via Inspect or CALFO)
- User must type exact trap name

**Flow:**
1. User presses 'D'
2. Prompt: "Enter trap name:"
3. User types trap name (must match exactly)
4. If name matches:
   a. Roll disarm check (based on opener level, class, trap difficulty)
   b. If success: Disarm trap, chest safe to open
   c. If failure: Trigger trap
5. If name doesn't match:
   a. High chance to trigger trap
6. Return to action menu or open chest

**Trap Name Matching:**

```typescript
function validateTrapName(input: string, chest: Chest): boolean {
  const normalized = input.trim().toUpperCase().replace(/[\s\-]/g, '')
  const trapName = chest.trapType.toString().replace(/[\s\-]/g, '')
  return normalized === trapName
}
```

**Disarm Chance:**

```typescript
function calculateDisarmChance(opener: Character, chest: Chest): number {
  const baseChance = 50

  // Class bonuses
  const classBonus = {
    [Class.THIEF]: 50,
    [Class.NINJA]: 60,
    [Class.BISHOP]: 20,
    default: 0
  }[opener.class] || 0

  // Level bonus
  const levelBonus = opener.level * 2

  const totalChance = baseChance + classBonus + levelBonus
  const difficulty = chest.difficulty || 1

  return Math.min(totalChance / difficulty, 95)  // Max 95%
}

function attemptDisarm(opener: Character, chest: Chest, trapName: string): { success: boolean; triggered: boolean } {
  const nameMatches = validateTrapName(trapName, chest)

  if (!nameMatches) {
    // Wrong trap name: 80% chance to trigger
    return {
      success: false,
      triggered: random(1, 100) <= 80
    }
  }

  const chance = calculateDisarmChance(opener, chest)
  const roll = random(1, 100)

  return {
    success: roll <= chance,
    triggered: roll > chance  // Failed disarm triggers trap
  }
}
```

**Validation:**

```typescript
function canDisarm(chest: Chest): { allowed: boolean; reason?: string } {
  if (!chest.trapIdentified) {
    return { allowed: false, reason: "Must identify trap first (use Inspect or CALFO)" }
  }

  if (!chest.trapped) {
    return { allowed: false, reason: "Chest is not trapped" }
  }

  return { allowed: true }
}
```

**State Changes:**
- If success: `chest.trapped = false` (safe to open)
- If triggered: Apply trap effects
- If disarmed: Chest can be opened safely

**UI Feedback:**
- Success: "Trap disarmed! Chest is safe to open."
- Failure: "Failed to disarm! [Trap] triggered!"
- Wrong name: "That's not the right trap! [Trap] triggered!"
- Not identified: "You must identify the trap first."

**Transitions:**
- If disarmed: Remains in Chest scene, can now (O)pen safely
- If triggered: May return to Maze or trigger combat

---

### (L) Leave Chest

**Description:** Abandon chest and return to maze

**Key Binding:** L (case-insensitive)

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'L'
2. Prompt: "Leave chest unopened? (Y/N)"
3. If Y:
   a. Abandon treasure
   b. Return to Maze
4. If N:
   a. Return to action menu

**Validation:**

```typescript
function canLeaveChest(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always allowed
}
```

**State Changes:**
- Remove chest from game (cannot return)
- No treasure gained
- Return to Maze

**UI Feedback:**
- Prompt: "Leave chest unopened? (Y/N)"
- Confirm: "You leave the chest behind."

**Transitions:**
- → Maze

**Use Cases:**
- Party low on HP, can't risk trap
- Inventory full (would lose items)
- Playing cautiously
- Unsure about trap type

---

### Invalid Key

**Description:** User presses any other key

**Behavior:**
- Beep sound (optional)
- Error message: "INVALID ACTION"
- Remain in Chest scene

---

## Trap Types

### Trap Catalog

```typescript
enum TrapType {
  POISON_NEEDLE = 'POISON NEEDLE',      // Poisons opener
  GAS_BOMB = 'GAS BOMB',                // Damage to all party
  CROSSBOW_BOLT = 'CROSSBOW BOLT',      // Damage to opener
  EXPLODING_BOX = 'EXPLODING BOX',      // Heavy damage to opener
  STUNNER = 'STUNNER',                  // Paralyzes opener
  TELEPORTER = 'TELEPORTER',            // Teleports party randomly
  MAGE_BLASTER = 'MAGE BLASTER',        // Drains mage spell points
  PRIEST_BLASTER = 'PRIEST BLASTER',    // Drains priest spell points
  ALARM = 'ALARM'                       // Triggers combat encounter
}
```

### Trap Effects

**POISON_NEEDLE:**
- Opener becomes poisoned
- Takes 1 HP damage per round until cured
- Requires Temple cure

**GAS_BOMB:**
- 2d6 damage to all party members
- No save
- Area effect

**CROSSBOW_BOLT:**
- 1d8 damage to opener
- Single target

**EXPLODING_BOX:**
- 3d6 damage to opener
- High damage trap

**STUNNER:**
- Opener becomes paralyzed
- Cannot act until cured
- Requires Temple cure or DIALKO spell

**TELEPORTER:**
- Entire party teleported to random location
- May be different dungeon level
- May be dangerous area
- Disorienting

**MAGE_BLASTER:**
- Drains all spell points from mages in party
- Affects Mages, Bishops, Samurai
- Very punishing for casters

**PRIEST_BLASTER:**
- Drains all spell points from priests in party
- Affects Priests, Bishops, Lords
- Very punishing for healers

**ALARM:**
- Summons monsters
- Triggers immediate combat encounter
- Enemies based on dungeon level
- Most dangerous trap

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Open | (O) | Maze | Always (after treasure/trap) |
| Inspect | (I) | Chest | Trap not identified |
| CALFO | (C) | Chest | Has caster |
| Disarm | (D) | Chest or Maze | Trap identified |
| Leave | (L) | Maze | Always |

### Parent Scene

- Combat → Victory → Chest
- Maze → Treasure Found → Chest

### Child Scenes

- Chest → (O/D success) → Treasure → Maze
- Chest → (L) → Maze
- Chest → (ALARM trap) → Combat → Chest or Maze

---

## State Management

### Scene State

```typescript
interface ChestState {
  mode: 'CHARACTER_SELECT' | 'ACTION_SELECT' | 'INSPECTING' | 'DISARMING' | 'OPENING'
  opener: Character | null
  chest: Chest
  trapRevealed: boolean
  actionResult: ActionResult | null
}
```

**Notes:**
- Chest state is temporary (single-use)
- Trap identification persists during chest interaction
- No save during chest interaction

### Global State Changes

**On Inspect/CALFO Success:**
- `chest.trapIdentified = true`

**On Disarm Success:**
- `chest.trapped = false`

**On Open (with treasure):**
- `party.pooledGold += chest.gold`
- `opener.inventory.push(...chest.items)` (if space!)
- Remove chest from game

**On Trap Trigger:**
- Apply trap effects to opener or party
- May trigger combat (ALARM)
- May teleport party

**On Leave:**
- Remove chest from game
- No treasure gained

### Persistence

- **Auto-save:** NO (dungeon zone)
- **Manual save:** NO (mid-action)
- **Safe zone:** NO (dangerous interaction)

---

## Implementation Notes

### Services Used

- `ChestService.detectTrap(opener, chest)`
- `ChestService.disarmTrap(opener, chest, trapName)`
- `ChestService.triggerTrap(chest, opener, party)`
- `ChestService.distributeTreasure(chest, opener, party)`
- `SpellService.castCALFO(caster, chest)`

### Commands

- `SelectOpenerCommand` - Choose character
- `OpenChestCommand` - Open directly
- `InspectChestCommand` - Detect trap
- `CastCALFOCommand` - Magical detection
- `DisarmTrapCommand` - Remove trap
- `LeaveChestCommand` - Abandon treasure

### Edge Cases

1. **Inventory full:**
   - **CRITICAL:** Items lost forever if opener inventory full (8/8)
   - No warning in original game
   - Modern implementation should warn
   - Consider auto-dropping least valuable item

2. **Trap triggers during inspect:**
   - 1-2% chance
   - Apply trap effects immediately
   - May prevent further interaction

3. **Wrong trap name:**
   - 80% chance to trigger trap
   - Punishes guessing
   - Requires exact spelling

4. **ALARM trap:**
   - Triggers combat immediately
   - After combat, return to chest or maze (design choice)
   - Treasure may still be available post-combat

5. **Teleporter trap:**
   - Party moved to random location
   - Treasure lost (chest left behind)
   - Very disruptive

6. **No trap:**
   - Inspection shows "No trap detected"
   - May still be trapped (failed roll)
   - Or genuinely untrapped

7. **Multiple party members with CALFO:**
   - Allow selection of who casts
   - Different spell point costs per caster

### Technical Considerations

- **Trap generation:** Based on dungeon level and chest type
- **Treasure contents:** Gold and item quality based on enemy level
- **Detection rolls:** AGI-based with class bonuses
- **Disarm rolls:** Level and class-based
- **Trap name input:** Case-insensitive, whitespace-tolerant
- **Inventory overflow:** Critical issue - warn or prevent

---

## Testing Scenarios

### Test 1: Open Untrapped Chest

```
1. Defeat enemies
2. Chest appears
3. Select opener (Thief recommended)
4. Press (O) to open
5. Chest not trapped
6. Verify treasure distributed
7. Verify gold added to party pool
8. Verify items added to opener inventory
9. Return to Maze
```

### Test 2: Inspect and Disarm

```
1. Chest appears
2. Select opener (Thief)
3. Press (I) to inspect
4. Roll detection (success)
5. Verify trap type revealed
6. Press (D) to disarm
7. Enter exact trap name
8. Roll disarm (success)
9. Verify trap disarmed
10. Press (O) to open safely
11. Collect treasure
```

### Test 3: CALFO Detection

```
1. Chest appears
2. Select opener
3. Press (C) to cast CALFO
4. Select priest/bishop caster
5. Verify spell points consumed
6. CALFO succeeds (95% chance)
7. Verify trap type revealed
8. Disarm or open as needed
```

### Test 4: Trap Triggered

```
1. Chest appears
2. Select opener
3. Press (O) to open directly
4. Chest is trapped
5. Trap triggers (e.g., POISON NEEDLE)
6. Verify opener poisoned
7. Verify treasure still collected (if survived)
8. Return to Maze
9. Opener takes poison damage
```

### Test 5: Inventory Full

```
1. Opener has 8/8 items
2. Chest contains multiple items
3. Open chest
4. Verify first items added
5. Verify overflow items LOST
6. Verify warning message (if implemented)
7. Return to Maze
```

### Test 6: Leave Chest

```
1. Chest appears
2. Select opener
3. Press (L) to leave
4. Confirm (Y)
5. Verify chest abandoned
6. Verify no treasure gained
7. Return to Maze
8. Chest is gone (cannot return)
```

---

## Related Documentation

- [Combat](./11-combat.md) - Parent scene (post-victory)
- [Maze](./10-maze.md) - Return destination
- [Trap System](../../systems/trap-system.md) - Trap mechanics
- [Treasure System](../../systems/treasure-system.md) - Loot generation
- [Spell Reference](../../research/spell-reference.md) - CALFO spell
- [Navigation Map](../navigation-map.md) - Complete navigation flow
