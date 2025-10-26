# Spell System

**Comprehensive overview of spell points, casting, and learning.**

## Overview

Wizardry 1 uses **spell points** (not D&D memorized slots).

**Key Concepts**:
- Separate point pools per spell level (1-7)
- Each spell costs 1 point from its level
- Mage and Priest have separate pools
- Points restore at inn
- Spells learned on level-up (chance = (INT or PIE) / 30)

**Critical Distinction**: Wizardry's spell system is fundamentally different from D&D vancian magic:
- No memorization required
- No spell slots that must be filled before rest
- Simple point-based system with level-based pools

## Architecture

### Services Involved

- **SpellService** - Point management, validation, spell data loading
- **SpellCastingService** - Spell resolution, effect application
- **SpellLearningService** - Learn new spells on level-up
- **CharacterService** - Spell point allocation, class spell access
- **CombatService** - Combat spell effects integration
- **DamageService** - Spell damage calculation

### Commands Involved

- **CastSpellCommand** - Cast spell in combat
- **CastUtilitySpellCommand** - Cast spell in dungeon/town
- **LearnSpellCommand** - Learn spell on level-up
- **RestAtInnCommand** - Restore spell points

### Data

```typescript
// src/data/spells.json
interface SpellData {
  mage: Record<number, Spell[]>    // Levels 1-7
  priest: Record<number, Spell[]>  // Levels 1-7
}

interface Spell {
  id: string                 // Unique identifier (lowercase)
  name: string              // Display name (uppercase)
  level: number             // Spell level 1-7
  type: 'offensive' | 'healing' | 'utility' | 'buff' | 'debuff'
  target: TargetType
  damage?: string           // Damage dice (e.g., "1d8", "4d6")
  healing?: string          // Healing dice
  effect?: string           // Special effect ID
  description: string
  castableIn: ('combat' | 'dungeon' | 'town')[]
}

// Character spell data
interface Character {
  mageSpellPoints: Map<number, number>    // Level → Current points
  priestSpellPoints: Map<number, number>  // Level → Current points
  mageSpellBook: Set<string>              // Learned spell IDs
  priestSpellBook: Set<string>            // Learned spell IDs
}
```

## Spell Point Pools

### Pool Structure

Each character has **14 separate pools**:
- 7 Mage pools (levels 1-7)
- 7 Priest pools (levels 1-7)

**Example Character** (Mage level 5):
```typescript
mageSpellPoints: Map {
  1 → 4,  // 4 level-1 spell points
  2 → 3,  // 3 level-2 spell points
  3 → 2,  // 2 level-3 spell points
  4 → 1,  // 1 level-4 spell point
  5 → 1,  // 1 level-5 spell point
}
// Levels 6-7 not yet accessible
```

### Pool Size Formula

**Validated from Wizardry 1**:
```
Points[level] = max(
  spellsLearned[level],                    // How many spells learned at this level
  1 + firstSpellLevel - currentCharLevel,  // Based on when first learned
  cap at 9                                 // Hard maximum
)
```

**Alternate Formula** (from source code analysis):
```
Points[circle] = clamp(
  circle - valueA + valueB - (valueB × circle),
  0,  // Minimum
  9   // Maximum
)

// valueA and valueB are character record fields
// Set when character learns first spell of level
```

**Practical Distribution**:
- Level 1 spells: 3-6 points (low level characters)
- Level 2 spells: 2-4 points
- Level 3 spells: 2-3 points
- Level 4+ spells: 1-2 points
- Maximum any pool: 9 points

### Class Differences

**Mage**:
- Learns mage spells levels 1-7
- INT determines learning chance
- INT affects pool sizes

**Priest**:
- Learns priest spells levels 1-7
- PIE determines learning chance
- PIE affects pool sizes

**Bishop**:
- Learns BOTH mage and priest spells (levels 1-7)
- **Slower learning** (penalty applied)
- Can identify items (unique ability)
- Learns fewer spells per level-up

**Samurai**:
- Learns mage spells levels 1-6 only
- Functions as secondary caster
- Primary role: fighter

**Lord**:
- Learns priest spells levels 1-6 only
- Functions as secondary caster
- Primary role: fighter

## Spell Casting Flow

### In Combat

**Process**:
1. Player selects caster character
2. Player selects spell from learned spells
3. Player selects target (ally/enemy/group)
4. **CastSpellCommand.execute()** validates:
   - Character has spell in spell book
   - Character has ≥1 point in spell's level pool
   - Spell can target selected target type
   - Character not silenced/paralyzed
5. **SpellCastingService.cast()** executes:
   - Deduct 1 point from appropriate pool
   - Apply spell effect (damage/healing/buff/debuff)
   - Generate combat log entry
6. Return new game state + combat result

**Validation Example**:
```typescript
function canCastSpell(
  character: Character,
  spell: Spell,
  target: Target
): boolean {
  // Check spell in book
  const book = spell.type === 'mage'
    ? character.mageSpellBook
    : character.priestSpellBook
  if (!book.has(spell.id)) return false

  // Check points available
  const pool = spell.type === 'mage'
    ? character.mageSpellPoints
    : character.priestSpellPoints
  if ((pool.get(spell.level) || 0) < 1) return false

  // Check target valid
  if (!isValidTarget(spell, target)) return false

  // Check status effects
  if (character.status.includes('silenced')) return false
  if (character.status.includes('paralyzed')) return false

  return true
}
```

### In Dungeon

**Utility Spells Only**:
- DUMAPIC (show coordinates)
- MILWA (light)
- MALOR (teleport)
- LOKTOFEIT (recall to town)
- DIAL (healing)
- DI (resurrect)

**Process**:
1. Player opens spell menu
2. Player selects caster
3. Player selects spell
4. **CastUtilitySpellCommand.execute()** validates:
   - Same validation as combat
   - Check spell castable in dungeon (not combat-only)
5. Apply effect (update state)

## Spell Learning Flow

### On Level-Up

**Process**:
1. Character levels up (via **LevelUpCharacterCommand**)
2. Determine accessible spell levels:
   - Classes access spells based on character level
   - Mage/Priest: All levels based on char level
   - Bishop: All levels (slower)
   - Samurai/Lord: Limited to 1-6
3. For each accessible spell level:
   - Get all spells of that level
   - Filter to unlearned spells
   - For each unlearned spell:
     - Roll d100
     - If roll ≤ (INT or PIE) / 30 × 100, learn spell
4. Update character's spell book
5. Recalculate spell point pools

**Learning Chance Formula**:
```
LearnChance = (INT or PIE) / 30

Examples:
- INT/PIE 11: 36.7% per spell
- INT/PIE 15: 50.0% per spell
- INT/PIE 18: 60.0% per spell
```

**Example Learning Session**:
```
Mage (INT 15, level 3 → 4)
Now can access Level 2 spells

Level 2 Mage Spells:
- DILTO: Roll 45 ≤ 50% → LEARNED
- MELITO: Roll 67 > 50% → NOT LEARNED
- SOPIC: Roll 23 ≤ 50% → LEARNED

Result: Learned 2/3 spells
Can retry MELITO on next level-up
```

### Spell Access by Class and Level

| Char Level | Mage/Priest | Bishop | Samurai/Lord |
|------------|-------------|---------|--------------|
| 1 | Level 1 | Level 1 | Level 1 |
| 2 | Level 2 | Level 1-2 | Level 2 |
| 3 | Level 1-2 | Level 1-2 | Level 1-2 |
| 4 | Level 1-3 | Level 1-3 | Level 1-3 |
| 5 | Level 1-3 | Level 1-3 | Level 1-3 |
| 7 | Level 1-4 | Level 1-4 | Level 1-4 |
| 9 | Level 1-5 | Level 1-5 | Level 1-5 |
| 11 | Level 1-6 | Level 1-6 | Level 1-6 |
| 13 | Level 1-7 | Level 1-7 | (Max L6) |

## Spell Categories

### Mage Spells (35 total across 7 levels)

**Offensive Spells**:
- Level 1: HALITO (1d8 fire, group)
- Level 2: MELITO (1d8 each, group)
- Level 3: MAHALITO (4d6 fire, group), MOLITO (3d6 each)
- Level 4: DALTO (6d6 cold, group), LAHALITO (6d6 fire, group)
- Level 5: MADALTO (8d6 cold, group), LAKANITO (6d6 each, group)
- Level 6: ZILWAN (10d6 to all groups), MASOPIC (poison cloud)
- Level 7: TILTOWAIT (8d8+ group destruction)

**Debuff Spells**:
- KATINO (sleep enemy group)
- DILTO (blind enemy group)
- MANIFO (paralyze/petrify)
- MAKANITO (kill enemies)

**Utility Spells**:
- DUMAPIC (show coordinates)
- HAMAN (defensive, reduces damage)
- MALOR (teleport to location)

**Buff Spells**:
- MOGREF (-2 AC to ally)

### Priest Spells (30 total across 7 levels)

**Healing Spells**:
- DIOS (1d8 HP to single ally)
- DIAL (2d8 HP to party)
- MADI (3d8 HP to party)
- MADI (4d8+ HP to party)

**Buff Spells**:
- KALKI (reduce AC, party)
- PORFIC (defense against magic)
- BAMATU (reduce AC, better)
- LATUMOFIS (cure poison/paralyze)

**Offensive Spells**:
- BADIOS (2d6+ holy damage)
- BADIAL (3d6+ holy damage to group)
- BADI (6d6+ holy damage)

**Utility Spells**:
- MILWA (light in darkness)
- LATUMAPIC (identify trap type)
- LOKTOFEIT (recall to town, level × 2% success)

**Resurrection Spells**:
- DI (resurrect dead, ~90% success)
- KADORTO (raise ashes, ~50% success)

See [Spell Reference](../research/spell-reference.md) for complete spell list with effects.

## Spell Targeting

### Target Types

**Single Ally**:
- Spells: DIOS, MOGREF
- Player selects one party member
- Affects only that character

**All Allies (Party)**:
- Spells: DIAL, KALKI, BAMATU
- Automatically targets entire party
- No selection needed

**Single Enemy**:
- Spells: BADIOS
- Player selects one enemy
- Affects only that enemy

**Enemy Group**:
- Spells: HALITO, MAHALITO, BADIAL
- Player selects one group (A-D)
- Affects all enemies in group
- Damage split or individual (depends on spell)

**All Enemy Groups**:
- Spells: ZILWAN, TILTOWAIT
- Automatically targets all groups
- Affects every enemy in combat

**Self Only**:
- Spells: DUMAPIC
- Caster only, no selection

**Location**:
- Spells: MALOR
- Player enters coordinates (X, Y, level)
- Teleports party to location

### Target Validation

```typescript
function isValidTarget(spell: Spell, target: Target): boolean {
  switch (spell.target) {
    case 'single_ally':
      return target.type === 'ally' && target.count === 1
    case 'party':
      return target.type === 'party'
    case 'single_enemy':
      return target.type === 'enemy' && target.count === 1
    case 'enemy_group':
      return target.type === 'enemy_group'
    case 'all_enemies':
      return target.type === 'all_enemies'
    case 'self':
      return target.id === spell.casterId
    case 'location':
      return target.type === 'location' &&
             target.x >= 0 && target.x <= 19 &&
             target.y >= 0 && target.y <= 19
  }
}
```

## Spell Failure

### General Rule

**Most spells NEVER fail** (validated against Wizardry 1).

Once cast, effect always applies (unless target has resistance).

### Exceptions

**LOKTOFEIT (Recall to Castle)**:
```
Success Rate = Character Level × 2%

Examples:
- Level 1: 2% success (very risky)
- Level 5: 10% success
- Level 10: 20% success
- Level 13: 26% success (maximum)
```
Failure: Party stays in dungeon, spell point consumed

**DI (Resurrect Dead)**:
```
Success Rate: ~90%
Failure: Character turns to ashes (needs KADORTO)
```

**KADORTO (Raise Ashes)**:
```
Success Rate: ~50%
Failure: Character lost forever (permanent death)
```

**Resistance-Based Failure**:
- Some monsters resist certain spells
- Death spells (MAKANITO) often resisted by bosses
- Sleep spells (KATINO) less effective on high-level enemies
- Resistance is monster property, not spell failure

## Spell Point Restoration

### At Inn

**Stables Rest** (free):
- Restores ALL spell points (all 14 pools)
- Restores ALL HP
- Ages characters (1d10 weeks)
- Risk of random encounters in dungeon

**Cot/Room** (gold cost):
- Restores ALL spell points
- Restores ALL HP
- Ages characters (minimal)
- Safe (no random encounters)

**Process**:
```typescript
function restoreSpellPoints(character: Character): Character {
  const maxMagePoints = calculateMaxSpellPoints(character, 'mage')
  const maxPriestPoints = calculateMaxSpellPoints(character, 'priest')

  return {
    ...character,
    mageSpellPoints: new Map(maxMagePoints),
    priestSpellPoints: new Map(maxPriestPoints),
    hp: character.maxHP
  }
}
```

### In Dungeon

**Cannot Restore Spell Points**:
- No rest action in dungeon (unlike HP recovery)
- Must return to town
- Spell management critical for deep expeditions

## Spell Effects

### Damage Spells

**Damage Calculation**:
```typescript
function calculateSpellDamage(
  spell: Spell,
  caster: Character,
  target: Combatant
): number {
  // Roll damage dice
  const baseDamage = rollDice(spell.damage) // e.g., "4d6"

  // Apply resistances
  let damage = baseDamage
  if (target.resistances.includes(spell.damageType)) {
    damage = Math.floor(damage / 2)
  }

  // Minimum 0
  return Math.max(0, damage)
}
```

**Damage Types**:
- Fire (HALITO, MAHALITO, LAHALITO)
- Cold (DALTO, MADALTO)
- Holy (BADIOS, BADIAL, BADI)
- Magic (ZILWAN, TILTOWAIT)

### Healing Spells

**Healing Calculation**:
```typescript
function calculateHealing(spell: Spell, target: Character): number {
  const healAmount = rollDice(spell.healing) // e.g., "2d8"
  const newHP = Math.min(target.hp + healAmount, target.maxHP)
  return newHP - target.hp // Actual healing
}
```

**Healing Spells**:
- DIOS: 1d8 (single target)
- DIAL: 2d8 (party)
- MADI: 3d8 (party)
- Highest level: 4d8+ (party)

### Buff/Debuff Spells

**AC Modification**:
```typescript
// KALKI, BAMATU (improve ally AC)
function applyACBuff(character: Character, amount: number): Character {
  return {
    ...character,
    combatAC: character.ac - amount // Lower AC = better
  }
}

// Duration: Until end of combat
```

**Status Effects**:
- Sleep (KATINO): Enemy can't act, auto-hit
- Blind (DILTO): Enemy hit chance reduced
- Paralyze (MANIFO): Enemy can't act
- Silence: Prevents spellcasting

### Utility Spell Effects

**DUMAPIC (Coordinates)**:
- Shows: X, Y, Level, Facing
- No combat use
- Essential for mapping

**MILWA (Light)**:
- Reveals walls in darkness zones
- Duration: Until darkness zone exited
- No effect in normal areas

**MALOR (Teleport)**:
- Input: X, Y, Level
- Validation: Coordinates in bounds (0-19)
- Effect: Instant transport (even through walls)
- Risk: Can teleport into rock (party death)

**LOKTOFEIT (Recall)**:
- Success: Party returns to town entrance
- Failure: Nothing happens, point consumed
- Use: Emergency escape from deep dungeon

## Related Documentation

**Services**:
- [SpellService](../services/SpellService.md) - Point management API
- [SpellCastingService](../services/SpellCastingService.md) - Casting resolution
- [SpellLearningService](../services/SpellLearningService.md) - Learning mechanics

**Commands**:
- [CastSpellCommand](../commands/CastSpellCommand.md) - Combat casting
- [CastUtilitySpellCommand](../commands/CastUtilitySpellCommand.md) - Dungeon/town casting
- [LearnSpellCommand](../commands/LearnSpellCommand.md) - Level-up learning

**Game Design**:
- [Spells Game Design](../game-design/04-spells.md) - Player-facing spell guide

**Research**:
- [Spell Reference](../research/spell-reference.md) - All 65+ spells with full data
- [Combat Formulas](../research/combat-formulas.md) - Spell learning formula validation

**Data Files**:
- [spells.json Format](../data-format/spells-json.md) - JSON structure specification
