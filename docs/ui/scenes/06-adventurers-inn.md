# Adventurer's Inn

## Overview

**Description:** Rest and recuperation center where characters heal and gain levels. The only place in the game where characters can level up after gaining experience.

**Scene Type:** Safe Zone (auto-saves after level up)

**Location in Game Flow:** Essential for character progression - must rest to heal and level up

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Castle Menu → (A)dventurer's Inn → Inn

**Direct Access:**
- Accessible directly from Castle Menu
- One of the primary town services

### Requirements

**State Requirements:**
- [ ] None (always accessible from Castle)
- [ ] Prompts for character selection immediately on entry

**Note:** Characters rest individually, not as a party. Each character pays their own room costs.

### State Prerequisites

```typescript
interface InnEntryState {
  characterRoster: Character[]  // All characters
  selectedCharacter: Character | null  // For rest session
}
```

---

## UI Layout

### Screen Regions

- **Header:** "ADVENTURER'S INN" title
- **Main:** Room type menu and rest progress
- **Sidebar:** Character info (HP, gold, level)
- **Status:** Days rested, HP recovered
- **Messages:** Level up notifications

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  ADVENTURER'S INN                   │
├─────────────────────────────────────┤
│  Resting: Gandalf                   │
│  HP: 12/15  Gold: 500  Level: 5     │
│                                     │
│  SELECT ROOM TYPE:                  │
│  (S)TABLES        - 0 gp/week       │
│    Recovery: 0 HP/week              │
│  (B)ARRACKS       - 10 gp/week      │
│    Recovery: 1 HP/week              │
│  (D)OUBLE         - 50 gp/week      │
│    Recovery: 3 HP/week              │
│  (P)RIVATE        - 200 gp/week     │
│    Recovery: 7 HP/week              │
│  (R)OYAL SUITE    - 500 gp/week     │
│    Recovery: 10 HP/week             │
│                                     │
│  (O)OL GOLD  (L)EAVE                │
├─────────────────────────────────────┤
│  > Select room type...              │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Character selection happens first
- Room types shown with costs and healing rates
- Rest progress animated (days passing)
- Level up notification displayed when achieved

---

## Available Actions

### Character Selection (Entry)

**Description:** Select which character to rest

**Flow:**
1. Enter Inn from Castle Menu
2. Prompt: "Rest which character? (Name or number)"
3. User types character name or roster number
4. Validate character exists and is alive
5. Load character's HP and gold
6. Show room type menu

**Validation:**

```typescript
function canSelectCharacter(roster: Character[], nameOrNumber: string): { allowed: boolean; reason?: string } {
  const character = findCharacter(roster, nameOrNumber)

  if (!character) {
    return { allowed: false, reason: "Character not found" }
  }

  if (character.status === CharacterStatus.DEAD ||
      character.status === CharacterStatus.ASHES ||
      character.status === CharacterStatus.LOST) {
    return { allowed: false, reason: "Dead characters cannot rest (visit Temple first)" }
  }

  return { allowed: true }
}
```

---

## Room Types

### (S) Stables

**Description:** Free accommodation with no healing

**Key Binding:** S (case-insensitive)

**Cost:** 0 gp per week

**Healing Rate:** 0 HP per week

**Use Case:** Time passage only (for level up check)

**Requirements:**
- None (always affordable)

**Flow:**
1. User selects Stables
2. Character rests for 1 week
3. No HP recovery
4. Check for level up
5. Repeat until level up or manual exit

**Note:** Use Stables when character has full HP but needs to level up.

---

### (B) Barracks

**Description:** Basic shared accommodation

**Key Binding:** B (case-insensitive)

**Cost:** 10 gp per week

**Healing Rate:** 1 HP per week

**Use Case:** Budget healing for low-level characters

**Requirements:**
- Character has 10+ gold (or can pool)

**Flow:**
1. User selects Barracks
2. Deduct 10 gp per week
3. Restore 1 HP per week
4. Check for level up
5. Repeat until full HP or manual exit

---

### (D) Double Occupancy

**Description:** Shared room with moderate comfort

**Key Binding:** D (case-insensitive)

**Cost:** 50 gp per week

**Healing Rate:** 3 HP per week

**Use Case:** Moderate healing for mid-level characters

**Requirements:**
- Character has 50+ gold per week

**Flow:**
1. User selects Double
2. Deduct 50 gp per week
3. Restore 3 HP per week
4. Check for level up
5. Repeat until full HP or manual exit

---

### (P) Private Room

**Description:** Private room with good comfort

**Key Binding:** P (case-insensitive)

**Cost:** 200 gp per week

**Healing Rate:** 7 HP per week

**Use Case:** Fast healing for high-level characters with gold

**Requirements:**
- Character has 200+ gold per week

**Flow:**
1. User selects Private
2. Deduct 200 gp per week
3. Restore 7 HP per week
4. Check for level up
5. Repeat until full HP or manual exit

---

### (R) Royal Suite

**Description:** Luxury accommodation with maximum healing

**Key Binding:** R (case-insensitive)

**Cost:** 500 gp per week

**Healing Rate:** 10 HP per week

**Use Case:** Fastest healing for wealthy characters

**Requirements:**
- Character has 500+ gold per week

**Flow:**
1. User selects Royal Suite
2. Deduct 500 gp per week
3. Restore 10 HP per week
4. Check for level up
5. Repeat until full HP or manual exit

**Note:** Most efficient for high-level characters with lots of HP damage.

---

## Rest Process

### Rest Flow

1. **Select Room Type**
2. **Validate Gold:** Check character has enough for one week
3. **Week Passes:** Time advances by 7 days
4. **Deduct Cost:** Remove gold from character
5. **Heal HP:** Add healing rate to current HP (up to max)
6. **Check Level Up:** If HP = max HP, check for level up
7. **Level Up Process:** If XP sufficient, level up character
8. **Repeat or Exit:** Continue resting or return to Castle

### Rest Loop

```typescript
function restOneWeek(character: Character, roomType: RoomType): void {
  const cost = getRoomCost(roomType)
  const healRate = getRoomHealRate(roomType)

  // Validate gold
  if (character.gold < cost) {
    throw new Error("Not enough gold for this room")
  }

  // Deduct gold
  character.gold -= cost

  // Heal HP
  character.hp = Math.min(character.hp + healRate, character.maxHp)

  // Advance time
  character.daysRested += 7

  // Check for level up if fully healed
  if (character.hp === character.maxHp) {
    checkForLevelUp(character)
  }
}
```

### Early Checkout

**Key Binding:** SPACE or (L)eave

**Description:** Stop resting before fully healed

**Use Case:** Character leveled up or ran out of gold

**Flow:**
1. User presses SPACE during rest
2. Stop rest loop
3. Return to Castle Menu

**Note:** Can leave at any time, useful if gold runs out or level up achieved.

---

## Level Up Process

### Level Up Check

**Trigger:** Character reaches max HP during rest

**Condition:** Character has enough XP for next level

**Flow:**
1. Character HP = max HP
2. Check: currentXP >= requiredXP(nextLevel)
3. If true: Initiate level up
4. If false: Continue resting or allow exit

**XP Requirements:**

```typescript
function getXPRequirement(level: number, characterClass: Class): number {
  // Varies by class (Fighters level faster than Mages)
  const baseXP = 1000
  const multiplier = getClassXPMultiplier(characterClass)
  return Math.floor(baseXP * Math.pow(level, 1.5) * multiplier)
}
```

### Level Up Steps

**When level up triggered:**

1. **Increment Level:** `character.level += 1`
2. **Roll HP Increase:**
   - Roll hit die for class (d4-d10)
   - Add Vitality bonus
   - Add to max HP
3. **Increase Stats (chance-based):**
   - Each stat has small chance to increase (1-5%)
   - Based on race and class
4. **Learn New Spells (for casters):**
   - Gain access to higher spell levels
   - Randomly learn new spells
5. **Display Summary:**
   - Show new level
   - Show HP increase
   - Show stat increases (if any)
   - Show new spells (if any)

**HP Increase:**

```typescript
function rollHPIncrease(character: Character): number {
  const hitDie = getClassHitDie(character.class)  // d4-d10
  const roll = rollDice(1, hitDie)
  const vitalityBonus = getVitalityBonus(character.vitality)
  return Math.max(1, roll + vitalityBonus)  // Minimum 1 HP
}
```

**Stat Increase:**

```typescript
function rollStatIncreases(character: Character): StatChanges {
  const changes = {}
  const stats = ['str', 'iq', 'pie', 'vit', 'agi', 'luk']

  stats.forEach(stat => {
    const chance = getStatIncreaseChance(character.class, stat)  // 1-5%
    const roll = random(1, 100)
    if (roll <= chance) {
      changes[stat] = 1  // +1 to stat
    }
  })

  return changes
}
```

**UI Feedback:**

```
LEVEL UP!

Gandalf has reached level 6!

HP: 15 → 20 (+5)
STR: 14 → 15 (+1)

New spells learned:
- MAHALITO (Mage 4)

Press any key to continue...
```

**State Changes:**
- `character.level += 1`
- `character.maxHp += hpIncrease`
- `character.hp = character.maxHp` (fully healed)
- `character.stats` updated (if rolled increases)
- `character.spells` updated (new spells learned)
- Auto-save after level up

---

## Additional Actions

### (O) Pool Gold

**Description:** Request gold from party pool to continue resting

**Key Binding:** O (case-insensitive)

**Requirements:**
- Character in party
- Party pool has gold
- Character needs gold for room

**Flow:**
1. User presses 'O' during rest
2. Show party pool gold balance
3. Prompt: "Take how much gold? (Enter amount or 'ALL')"
4. Transfer gold from party pool to character
5. Resume resting

**Validation:**

```typescript
function canPoolGold(character: Character, party: Party): { allowed: boolean; reason?: string } {
  if (!character.inParty) {
    return { allowed: false, reason: "Character must be in party" }
  }

  if (party.pooledGold === 0) {
    return { allowed: false, reason: "No gold in party pool" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `party.pooledGold -= amount`
- `character.gold += amount`
- Auto-save

**UI Feedback:**
- Success: "Took [X] gold from party pool"
- Failure: "No gold in party pool"

**Transitions:**
- Remains in rest loop (can continue resting)

---

### (L) Leave Inn

**Description:** Exit rest and return to Castle Menu

**Key Binding:** L (case-insensitive) or SPACE

**Requirements:**
- None (always available)

**Flow:**
1. User presses 'L' or SPACE
2. Stop rest loop
3. Auto-save character state
4. Return to Castle Menu

**Validation:**

```typescript
function canLeaveInn(state: GameState): { allowed: boolean; reason?: string } {
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
- Error message: "INVALID ROOM TYPE"
- Remain at room selection

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Stables | (S) | Rest Loop | Always |
| Barracks | (B) | Rest Loop | Has 10+ gp |
| Double | (D) | Rest Loop | Has 50+ gp |
| Private | (P) | Rest Loop | Has 200+ gp |
| Royal Suite | (R) | Rest Loop | Has 500+ gp |
| Pool Gold | (O) | Inn (continue rest) | In party, pool has gold |
| Leave | (L)/SPACE | Castle Menu | Always |

### Parent Scene

- Castle Menu → (A) → Inn

### Child Scenes

- Inn → (Room Type) → Rest Loop → Inn or Castle Menu
- Inn → (L) → Castle Menu

---

## State Management

### Scene State

```typescript
interface InnState {
  mode: 'CHARACTER_SELECT' | 'ROOM_SELECT' | 'RESTING' | 'LEVEL_UP'
  selectedCharacter: Character | null
  selectedRoom: RoomType | null
  weeksRested: number
  levelUpData: LevelUpData | null
}
```

**Notes:**
- Rest loop runs until HP full or user exits
- Level up interrupts rest loop
- Auto-save after level up

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.INN`
- Prompt for character selection

**On Rest:**
- Update character HP and gold
- Track weeks rested
- Check for level up

**On Level Up:**
- Update character level, stats, HP, spells
- Auto-save

**On Exit:**
- Save character state
- Return to Castle Menu

### Persistence

- **Auto-save:** Yes, after level up
- **Manual save:** No (auto-saves after level up only)
- **Safe zone:** Yes (no risk to characters)

---

## Implementation Notes

### Services Used

- `InnService.restCharacter(character, roomType, weeks)`
- `LevelService.checkForLevelUp(character)`
- `LevelService.performLevelUp(character)`
- `StatService.rollStatIncreases(character)`
- `SpellService.learnNewSpells(character)`
- `SaveService.autoSave(state)`

### Commands

- `SelectCharacterCommand` - Choose character to rest
- `SelectRoomCommand` - Choose room type
- `RestCommand` - Execute rest for one week
- `LevelUpCommand` - Perform level up
- `PoolGoldCommand` - Transfer gold from party
- `LeaveInnCommand` - Return to Castle

### Edge Cases

1. **Not enough gold:**
   - Cannot select expensive room
   - Show "Not enough gold" error
   - Can pool gold from party or select cheaper room

2. **Already max HP:**
   - Can still rest (for level up check)
   - Use Stables (free) if just checking for level up
   - No HP gained if already full

3. **Ran out of gold mid-rest:**
   - Cannot continue resting
   - Must pool gold or exit
   - Progress saved (HP already gained)

4. **Level up without full HP:**
   - Level up only triggers at full HP
   - Must heal completely before level check
   - Prevents level up without rest

5. **Multiple level ups:**
   - Only one level per rest session
   - Must exit and re-enter to level up again
   - Prevents accidental over-leveling

6. **Dead character:**
   - Cannot rest
   - Must resurrect at Temple first
   - Show error message

### Technical Considerations

- **Rest animation:** Show days passing, HP increasing
- **Gold tracking:** Deduct per week, check before each week
- **Level up calculation:** XP requirements vary by class
- **HP roll:** Different hit dice per class (Fighter d10, Mage d4)
- **Stat increases:** Random, low chance, class-dependent
- **Spell learning:** Automatic for casters when reaching new spell level
- **Auto-save timing:** After level up only (not after each week)

---

## Testing Scenarios

### Test 1: Basic Rest and Heal

```
1. From Castle Menu, press (A)
2. Select character with damaged HP
3. Select room type (Barracks)
4. Verify gold sufficient
5. Verify rest begins
6. Verify HP increases per week
7. Verify gold deducted per week
8. Continue until HP full
9. Verify auto-return to room selection or Castle
```

### Test 2: Level Up

```
1. Character has enough XP for level up
2. Character HP < max HP
3. Rest until HP = max HP
4. Verify level up check triggers
5. Verify level up screen displays
6. Verify HP increases (roll + VIT bonus)
7. Verify stats may increase
8. Verify new spells learned (if caster)
9. Verify auto-save triggered
10. Verify can continue resting or exit
```

### Test 3: Ran Out of Gold

```
1. Character has limited gold (e.g., 30 gp)
2. Select expensive room (Private, 200 gp)
3. Verify error: "Not enough gold"
4. Select cheaper room (Barracks, 10 gp)
5. Rest for 3 weeks (30 gp total)
6. Gold = 0
7. Verify cannot continue
8. Press (O) to pool gold
9. Verify gold transferred from party pool
10. Continue resting
```

### Test 4: Early Checkout

```
1. Start resting character
2. After a few weeks, press SPACE
3. Verify rest stops
4. Verify HP gains saved
5. Verify gold deductions saved
6. Verify return to Castle Menu
```

### Test 5: Stables for Level Up Only

```
1. Character HP = max HP
2. Character has XP for level up
3. Select Stables (free)
4. Verify no gold deducted
5. Verify no HP gained
6. Verify level up check triggers
7. Verify level up occurs
8. Verify auto-save triggered
```

---

## Related Documentation

- [Castle Menu](./01-castle-menu.md) - Parent scene
- [Level System](../../systems/level-system.md) - Level up mechanics
- [Experience System](../../systems/experience-system.md) - XP requirements
- [Character Classes](../../systems/character-classes.md) - Class hit dice
- [Navigation Map](../navigation-map.md) - Complete navigation flow
