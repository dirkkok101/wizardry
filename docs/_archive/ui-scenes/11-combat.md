# Combat

## Overview

**Description:** Turn-based combat interface where the party fights monsters using physical attacks, spells, and special abilities.

**Scene Type:** Dungeon Zone (no auto-save, high risk)

**Location in Game Flow:** Triggered by random or fixed encounters in the Maze

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Maze → Random Encounter → Combat
- Maze → Fixed Encounter → Combat

**Trigger Types:**
- **Random:** 10% chance per movement action
- **Fixed:** Entering specific coordinates
- **Scripted:** Story encounters (e.g., Werdna boss fight)

### Requirements

**State Requirements:**
- [ ] Party in Maze
- [ ] Encounter triggered (random or fixed)
- [ ] At least one party member alive

**If all party members dead:**
- Game over or return to town (bodies remain in dungeon)

### State Prerequisites

```typescript
interface CombatEntryState {
  party: Party
  encounterType: 'RANDOM' | 'FIXED' | 'SCRIPTED'
  enemyGroups: EnemyGroup[]  // 1-4 groups
  surpriseRound: 'PARTY' | 'ENEMY' | 'NONE'
  canFlee: boolean  // False for fixed/scripted encounters
}
```

---

## UI Layout

### Screen Regions

- **Header:** Combat round number, surprise status
- **Enemy Display:** Enemy groups with names and counts
- **Party Display:** Character names, HP, status, position (front/back)
- **Action Menu:** Combat options per character
- **Message Log:** Combat results, damage, effects
- **Prompt:** Current character's turn

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  COMBAT - ROUND 1                   │
├─────────────────────────────────────┤
│  ENEMIES:                           │
│  Group 1: 3 ORCS        [FIGHTING] │
│  Group 2: 1 ORC SHAMAN  [FIGHTING] │
│                                     │
├─────────────────────────────────────┤
│  YOUR PARTY:            HP    ST    │
│  1. Gandalf (FRONT)    15/15  OK   │
│  2. Corak (FRONT)      28/30  OK   │
│  3. Thief (BACK)        8/10  OK   │
│  4. Priest (BACK)      12/12  OK   │
│                                     │
├─────────────────────────────────────┤
│  Gandalf's Turn:                    │
│  (F)ight  (C)ast  (P)arry           │
│  (U)se Item  (R)un                  │
│                                     │
├─────────────────────────────────────┤
│  > Corak attacks Group 1!           │
│  > Corak hits ORC for 8 damage!     │
│  > ORC dies!                        │
└─────────────────────────────────────┘
```

---

## Combat Flow

### Round Structure

**1. Initiative Phase:**
- Determine action order (surprise > speed > random)

**2. Player Actions Phase:**
- Each party member selects action
- Actions queue until all selected

**3. Resolution Phase:**
- Resolve all actions in initiative order
- Display results
- Check for victory/defeat

**4. Enemy Actions Phase:**
- Enemy AI selects actions
- Resolve enemy attacks/spells
- Display results

**5. End of Round:**
- Check for victory/defeat/flee
- If combat continues, start new round

---

## Available Actions

### (F) Fight

**Description:** Physical melee attack against enemy group

**Key Binding:** F

**Requirements:**
- Character alive (not dead/ashes)
- At least one enemy alive

**Flow:**
1. User presses 'F'
2. Prompt: "ATTACK WHICH GROUP? (1-4)"
3. User selects target group number
4. Queue attack action
5. Resolve during Resolution Phase

**Attack Resolution:**
```typescript
function resolveAttack(attacker: Character, targetGroup: EnemyGroup): AttackResult {
  const toHit = calculateToHit(attacker.level, attacker.class, targetGroup.ac)
  const roll = rollD20()

  if (roll >= toHit) {
    const damage = rollWeaponDamage(attacker.weapon)
    const target = selectRandomEnemy(targetGroup)
    target.hp -= damage
    return { hit: true, damage, target }
  }

  return { hit: false }
}
```

**UI Feedback:**
- Hit: "[Name] hits [Enemy] for [X] damage!"
- Miss: "[Name] swings and misses!"
- Kill: "[Enemy] dies!"

---

### (C) Cast Spell

**Description:** Cast mage or priest spell in combat

**Key Binding:** C

**Requirements:**
- Character is Mage/Priest/Bishop/Lord/Samurai
- Has spell points remaining
- Has learned spells

**Flow:**
1. User presses 'C'
2. Prompt: "WHICH SPELL? (MAGE 1-7 or PRIEST 1-7)"
3. User selects spell level
4. Show available spells for that level
5. User selects spell
6. Prompt for target (if needed)
7. Queue spell action

**Spell Categories:**
- **Offensive:** HALITO, MAHALITO, LAHALITO, TILTOWAIT, etc.
- **Defensive:** MOGREF, KALKI, BAMATU, PORFIC, etc.
- **Control:** KATINO (sleep), MORLIS (paralyze), MANIFO (silence)
- **Utility:** LATUMAPIC (identify), ZILWAN (dispel)

**UI Feedback:**
- Success: "[Name] casts [Spell]! [Effect]"
- Failure: "[Spell] has no effect!"
- Resisted: "[Enemy] resists [Spell]!"

---

### (P) Parry

**Description:** Defensive stance, improves AC for this round

**Key Binding:** P

**Requirements:**
- Character alive
- Not already defending

**Flow:**
1. User presses 'P'
2. Queue parry action
3. Resolve immediately: AC -= 2 for this round

**Effect:**
- Lowers AC by 2 (better defense)
- Lasts only current round
- Cannot attack while parrying

**UI Feedback:**
- "[Name] defends!"

---

### (U) Use Item

**Description:** Use consumable item (potion, scroll, etc.)

**Key Binding:** U

**Requirements:**
- Character alive
- Has usable item in inventory

**Flow:**
1. User presses 'U'
2. Show character's inventory
3. User selects item
4. Prompt for target (if needed)
5. Queue item use action

**Usable Items:**
- Healing Potions
- Scrolls (cast spells without spell points)
- Special items (quest items with combat effects)

**UI Feedback:**
- "[Name] uses [Item]! [Effect]"

---

### (R) Run (Flee)

**Description:** Attempt to flee combat

**Key Binding:** R

**Requirements:**
- Combat is not scripted/fixed encounter
- Party not surrounded

**Flow:**
1. User presses 'R'
2. All party members attempt to flee
3. Roll flee check (based on party speed vs enemy speed)
4. On success: Return to Maze (same position)
5. On failure: Enemy gets free round of attacks

**Flee Chance:**
```typescript
function calculateFleeChance(party: Party, enemies: EnemyGroup[]): number {
  const partySpeed = getAverageSpeed(party)
  const enemySpeed = getAverageSpeed(enemies)

  const baseChance = 50
  const speedMod = (partySpeed - enemySpeed) * 5

  return clamp(baseChance + speedMod, 10, 90)
}
```

**UI Feedback:**
- Success: "THE PARTY FLEES!"
- Failure: "UNABLE TO FLEE!"

**Restrictions:**
- Cannot flee from fixed encounters (e.g., Werdna)
- Cannot flee if surrounded (4+ enemy groups)

---

### (D) Dispel Undead (Priest/Bishop/Lord only)

**Description:** Attempt to destroy or banish undead enemies

**Key Binding:** D

**Requirements:**
- Character is Priest/Bishop/Lord
- Enemy group contains undead

**Flow:**
1. User presses 'D'
2. Prompt: "DISPEL WHICH GROUP? (1-4)"
3. User selects target group
4. Roll dispel check (based on character level vs undead level)
5. On success: Undead group destroyed or flees

**Dispel Chance:**
```typescript
function calculateDispelChance(caster: Character, undeadLevel: number): number {
  const levelDiff = caster.level - undeadLevel
  const baseChance = 50 + (levelDiff * 10)

  return clamp(baseChance, 5, 95)
}
```

**UI Feedback:**
- Success: "[Name] dispels [Undead]! They flee in terror!"
- Failure: "[Name]'s prayer has no effect!"

---

## Navigation

### Exits

| Outcome | Destination | Condition |
|---------|-------------|-----------|
| Victory (no treasure) | Maze | All enemies dead |
| Victory (with treasure) | Chest | All enemies dead + treasure |
| Party Wiped | Game Over / Town | All party members dead |
| Flee Success | Maze | Flee check succeeds |

### Parent Scene

- Maze → Encounter → Combat

### Child Scenes

- Combat → Chest (if treasure)
- Combat → Maze (no treasure or flee)

---

## State Management

### Scene State

```typescript
interface CombatState {
  mode: 'SELECTING_ACTIONS' | 'RESOLVING' | 'ENEMY_TURN' | 'VICTORY' | 'DEFEAT'
  round: number
  initiative: InitiativeOrder[]
  pendingActions: Action[]
  currentCharacterIndex: number
  enemyGroups: EnemyGroup[]
  messageLog: CombatMessage[]
  canFlee: boolean
}
```

### Global State Changes

**During Combat:**
- Character HP changes
- Character status changes (poisoned, paralyzed, etc.)
- Spell point consumption
- Item consumption

**On Victory:**
- Gain XP
- Gain gold
- Possible treasure (→ Chest scene)

**On Defeat:**
- Party wipe (game over or return to town)
- Character death (dead → ashes)

### Persistence

- **Auto-save:** NO (dungeon zone)
- **State preservation:** Combat state lost on defeat (no save-scumming)

---

## Combat Mechanics

### Initiative Order

**Surprise Round:**
- If party surprises enemies: party acts first, enemies skip round
- If enemies surprise party: enemies act first, party skip round
- If no surprise: normal initiative

**Normal Initiative:**
1. Fastest to slowest (AGI-based)
2. Ties broken randomly
3. Actions resolve in initiative order

### Attack Resolution

**To-Hit Calculation:**
```typescript
function calculateToHit(attackerLevel: number, attackerClass: Class, targetAC: number): number {
  const baseToHit = 10
  const levelBonus = attackerLevel
  const classBonus = getClassAttackBonus(attackerClass)

  return baseToHit + levelBonus + classBonus - targetAC
}
```

**Critical Hits:**
- Roll 20: Automatic hit, double damage
- Roll 1: Automatic miss

**Damage Calculation:**
```typescript
function calculateDamage(weapon: Weapon, attacker: Character): number {
  const baseDamage = rollWeaponDice(weapon)
  const strBonus = getStrengthBonus(attacker.strength)

  return baseDamage + strBonus
}
```

### Spell Resistance

**Magic Resistance:**
- Some enemies have magic resistance (%)
- Roll vs resistance for each spell
- Resistance applies to offensive spells only

**Saving Throws:**
- Enemies roll saving throw vs spell level
- Success: half damage or no effect (depends on spell)

---

## Enemy AI

**Basic AI Behavior:**
1. **Weak enemies:** Attack nearest target
2. **Smart enemies:** Target weakest party member (lowest HP)
3. **Casters:** Prioritize offensive spells
4. **Undead:** May attempt to level drain

**Special Abilities:**
- Breath weapons (dragons)
- Level drain (undead)
- Paralyze (ghouls)
- Poison (giant spiders)

---

## Implementation Notes

### Services Used

- `CombatService.startCombat(party, enemies)`
- `CombatService.resolveRound(state)`
- `AttackService.calculateToHit(attacker, target)`
- `SpellService.castCombatSpell(caster, spell, targets)`
- `LootService.generateTreasure(enemies, level)`

### Commands

- `AttackCommand` - Physical attack
- `CastSpellCommand` - Cast combat spell
- `ParryCommand` - Defend
- `UseItemCommand` - Use consumable
- `FleeCommand` - Attempt to flee
- `DispellCommand` - Dispel undead (Priest only)

### Edge Cases

1. **All enemies of one group dead:**
   - Remove group from combat
   - Retarget attacks to next group

2. **Character dies during combat:**
   - Skip their turn
   - Body remains (can be resurrected later)

3. **Party flees mid-combat:**
   - Drop all treasure
   - Return to Maze at same position
   - Enemies may still be there (respawn logic)

4. **Spell fizzles (not enough SP):**
   - Show error message
   - Allow re-selection of action

### Technical Considerations

- **Action queuing:** All party actions selected before resolution
- **Initiative calculation:** Speed-based with randomization
- **Animation timing:** Smooth transitions between actions
- **Message log:** Scrolling combat log for long battles

---

## Testing Scenarios

### Test 1: Basic Combat Flow
```
1. Trigger random encounter in Maze
2. Select (F)ight for all party members
3. Target different enemy groups
4. Resolve round
5. Verify damage applied correctly
6. Continue until victory
7. Verify XP and gold awarded
```

### Test 2: Spell Casting
```
1. Enter combat
2. Select (C)ast for Mage
3. Choose HALITO (level 1 fire spell)
4. Target enemy group
5. Verify damage rolls (1d8 per enemy in group)
6. Verify spell points decrease
```

### Test 3: Fleeing
```
1. Enter combat (random encounter)
2. Select (R)un
3. Roll flee check
4. On success: verify return to Maze
5. On failure: verify enemy free attack
```

### Test 4: Character Death
```
1. Enter combat with wounded characters
2. Allow enemy to attack and kill character
3. Verify character status changes to DEAD
4. Verify dead character skips turns
5. Win combat
6. Verify dead character remains dead
7. Return to town
8. Visit Temple for resurrection
```

---

## Related Documentation

- [Maze](./10-maze.md) - Parent scene
- [Chest](./12-chest.md) - Post-combat treasure
- [Combat System](../../systems/combat-system.md) - Complete combat mechanics
- [Spell Reference](../../research/spell-reference.md) - All combat spells
- [Character Classes](../../systems/character-system.md) - Class abilities
