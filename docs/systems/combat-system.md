# Combat System

**Comprehensive overview of combat initiative, resolution, and damage calculation.**

## Overview

Wizardry 1 uses **round-based combat** with initiative-driven turn order.

**Key Concepts**:
- Random encounters trigger combat state transition
- All combatants (party + monsters) act each round
- Initiative determines action order
- Front row takes melee hits, back row protected
- Combat ends when one side defeated or flees
- Experience and loot awarded on victory

## Architecture

### Services Involved

- **CombatService** - Combat orchestration, round resolution
- **InitiativeService** - Initiative calculation, turn order
- **AttackService** - Attack resolution (hit/miss, critical)
- **DamageService** - Damage calculation, armor reduction
- **DispellService** - Dispel undead (Turn Undead mechanic)
- **SpellCastingService** - Combat spell resolution
- **MonsterService** - Monster stat loading, AI behavior
- **DeathService** - Character death handling
- **LootService** - Experience and treasure distribution

### Commands Involved

- **AttackCommand** - Physical attack action
- **CastSpellCommand** - Cast spell action
- **DispellCommand** - Dispel undead (Priest/Bishop/Lord only)
- **ParryCommand** - Parry incoming attack
- **FleeCommand** - Attempt to flee combat
- **UseItemCommand** - Use item in combat

### Data Structures

```typescript
interface CombatState {
  party: Party                      // Player party
  enemyGroups: MonsterGroup[]       // Enemy groups (A-D)
  round: number                     // Current round number
  phase: CombatPhase                // INPUT, INITIATIVE, RESOLUTION, COMPLETE
  initiatives: Initiative[]         // Sorted turn order
  combatLog: CombatLogEntry[]      // Action history
  canFlee: boolean                  // Flee allowed this round
}

interface MonsterGroup {
  id: string                        // 'A', 'B', 'C', 'D'
  monsters: Monster[]               // 1-9 monsters per group
  formation: 'front' | 'back'       // Row position
}

interface Initiative {
  combatantId: string               // Character or monster ID
  initiative: number                // Initiative value (1-20+)
  action: CombatAction | null       // Selected action
}

interface CombatAction {
  type: 'attack' | 'cast' | 'defend' | 'parry' | 'flee' | 'use_item'
  targetId?: string                 // Target combatant ID
  spellId?: string                  // Spell ID if casting
  itemId?: string                   // Item ID if using
}
```

## Combat Flow

### Combat Initiation

**Trigger Points**:
- Random encounter while moving in dungeon
- Fixed encounter at specific tile
- Boss encounter (cannot flee)

**Process**:
1. Encounter check (dice roll vs. dungeon level)
2. Select monster groups (1-4 groups)
3. Determine monster formations (front/back)
4. Transition game state: NAVIGATION → COMBAT
5. Initialize combat state
6. Display combat UI

### Round Structure

Each combat round has **4 phases**:

**Phase 1: INPUT**
- Party members select actions
- Monsters determine actions (AI)
- All actions queued

**Phase 2: INITIATIVE**
- Calculate initiative for all combatants
- Sort by initiative (highest acts first)
- Build turn order list

**Phase 3: RESOLUTION**
- Execute actions in initiative order
- Apply damage/healing/effects
- Update combatant states
- Generate combat log entries

**Phase 4: COMPLETE**
- Check victory conditions
- Award XP and treasure if victory
- Check flee success if attempted
- Transition to next round or end combat

### Combat End Conditions

**Victory**:
- All enemy groups defeated (0 monsters alive)
- Award experience points (split among party)
- Award treasure (gold + items)
- Return to NAVIGATION state

**Defeat**:
- All party members dead (0 HP)
- Party wipe → bodies remain at location
- Transition to GAME_OVER or body recovery flow

**Flee**:
- Party successfully escapes
- No XP or treasure
- Return to NAVIGATION state
- May lose items/gold (implementation detail)

## Initiative System

### Initiative Calculation

**Formula** (validated from Wizardry 1):
```
Initiative = random(0-9) + AgilityModifier
Minimum = 1  (cannot go below 1)
```

### Agility Modifiers

| AGI | Modifier | Initiative Range |
|-----|----------|------------------|
| 3 | -2 | 1 (min capped) |
| 4-5 | -1 | 1-9 |
| 6-8 | 0 | 1-10 |
| 9-11 | +1 | 2-11 |
| 12-14 | +2 | 3-12 |
| 15-17 | +3 | 4-13 |
| 18+ | +4 | 5-14 |

**Character Example**:
```
Fighter (AGI 10):
  Modifier = +1
  Roll = random(0-9) = 7
  Initiative = 7 + 1 = 8
```

**Monster Example**:
```
Orc (AGI 8):
  Modifier = 0
  Roll = random(0-9) = 5
  Initiative = 5 + 0 = 5
```

### Turn Order

**Sorting**:
- Highest initiative acts first
- Ties broken by random roll
- Turn order recalculated each round

**Example Turn Order**:
```
Round 1:
1. Samurai (Init 12) - Attack
2. Thief (Init 11) - Attack
3. Orc Leader (Init 9) - Attack
4. Fighter (Init 8) - Attack
5. Mage (Init 7) - Cast MAHALITO
6. Orc #1 (Init 6) - Attack
7. Priest (Init 5) - Cast KALKI
8. Orc #2 (Init 3) - Attack
```

## Attack Resolution

### Physical Attack

**Process**:
1. Determine attacker and target
2. Calculate hit chance
3. Roll attack (d20 + modifiers)
4. If hit, calculate damage
5. Apply armor reduction
6. Subtract HP from target
7. Check for critical hit
8. Generate combat log entry

### Hit Chance Formula

**Basic Formula**:
```
AttackRoll = d20 + AttackerLevel + StrengthBonus
DefenseValue = TargetAC + AgilityBonus

Hit if: AttackRoll >= DefenseValue
```

**Modifiers**:
- **Strength Bonus**: +1 per 3 STR above 10 (STR 16 = +2)
- **Agility Penalty**: +1 AC penalty per 3 AGI below 10 (AGI 4 = +2 AC worse)
- **Class Bonus**: Fighters get +level to hit
- **Status Effects**: Blind (-4 to hit), Sleep (auto-hit), Paralyzed (auto-hit)

### Armor Class (AC) System

**Lower AC = Better Defense**

| AC | Description | Typical |
|----|-------------|---------|
| -10 | Exceptional (plate + magic shield) | High-level fighters |
| 0 | Very Good (plate armor) | Mid-level fighters |
| 4 | Good (chain mail) | Low-level fighters |
| 7 | Average (leather armor) | Thieves |
| 10 | Poor (no armor) | Mages |

**AC Calculation**:
```
BaseAC = 10 (unarmored)
AC = BaseAC - ArmorBonus - ShieldBonus - DexBonus - MagicBonus

Example (Fighter with Plate + Shield):
  BaseAC = 10
  Plate Armor = -6
  Large Shield = -2
  DEX bonus (AGI 14) = -1
  Final AC = 10 - 6 - 2 - 1 = 1
```

### Damage Calculation

**Weapon Damage**:
```
BaseDamage = rollDice(weaponDamage)  // e.g., 1d8 for longsword
StrengthBonus = floor(STR / 3)       // +1 per 3 STR
CriticalMultiplier = isCritical ? 2 : 1

TotalDamage = (BaseDamage + StrengthBonus) × CriticalMultiplier
```

**Armor Reduction**:
```
// No armor damage reduction in Wizardry 1
// AC only affects hit chance, not damage
FinalDamage = TotalDamage
```

**Apply to Target**:
```typescript
function applyDamage(target: Combatant, damage: number): Combatant {
  const newHP = Math.max(0, target.hp - damage)
  const isDead = newHP === 0

  return {
    ...target,
    hp: newHP,
    status: isDead ? [...target.status, 'dead'] : target.status
  }
}
```

### Critical Hits

**Critical Roll**:
- Natural 20 on d20 attack roll
- Double damage
- Ignores AC (always hits)

**Decapitation** (Ninja special):
- Ninja class has chance to decapitate
- Instant kill (regardless of HP)
- Higher level = higher chance
- Cannot decapitate bosses

## Multiple Attacks

### Attacks Per Round

**Formula** (validated):
```
AttacksPerRound = 1 + floor(Level / 5)
Maximum = 10 attacks
```

**By Class**:
- **Fighter**: 1 + (level / 5), max 10
- **Lord/Samurai**: 1 + (level / 5), max 10
- **Ninja**: 2 base + (level / 5), max 10 (BEST)
- **Thief**: 1 attack always
- **Mage/Priest/Bishop**: 1 attack always (rarely attack)

**Example Progression** (Fighter):
- Level 1-4: 1 attack
- Level 5-9: 2 attacks
- Level 10-14: 3 attacks
- Level 15-19: 4 attacks
- Level 20+: 5 attacks

### Attack Distribution

**Multiple Targets**:
- Each attack can target different enemy
- Player selects target for each attack
- AI randomizes targets

**Same Target**:
- Multiple attacks on same target
- Roll separately for each attack
- Damage accumulates

## Monster Combat

### Monster Groups

**Group IDs**: A, B, C, D (up to 4 groups)

**Group Composition**:
- 1-9 monsters per group
- Same monster type per group
- Groups can have different formations

**Example Encounter**:
```
Group A: 3 Orcs (front row)
Group B: 5 Kobolds (front row)
Group C: 2 Orc Shamans (back row)
```

### Monster AI

**Action Selection**:
1. **Spellcasters**: 50% cast spell, 50% attack
2. **Melee**: 90% attack, 10% defend
3. **Ranged**: 70% ranged attack, 30% defend
4. **Fleeing**: If >75% of group dead, 25% chance flee

**Target Selection**:
- **Front Row Preference**: 80% target front row
- **Back Row**: 20% target back row
- **Low HP Preference**: 30% bonus to target wounded
- **Random**: Otherwise random party member

### Special Monster Abilities

**Breath Attacks**:
- Hits entire party (not just front row)
- Damage: 4d6 to 10d6 (varies by monster)
- Type: Fire, cold, poison, lightning

**Poison Attack**:
- Normal damage + poison status
- Poison: -1 HP per turn (even after combat)
- Cure: LATUMOFIS spell or temple

**Paralysis**:
- Melee hit can paralyze
- Paralyzed: Cannot act, auto-hit by enemies
- Cure: LATUMOFIS spell or temple

**Drain Level**:
- Vampire/Undead special
- Reduces character level permanently
- Restore: Temple (expensive)

**Petrify**:
- Medusa/Basilisk gaze
- Character turns to stone
- Cannot act, treated as dead
- Cure: Temple only

## Combat Spells

### Offensive Spells

**Targeting**:
- **Single Enemy**: Direct damage to one
- **Enemy Group**: Damage all in group
- **All Enemies**: Damage all groups

**Damage Types**:
- **Fire**: HALITO, MAHALITO, LAHALITO
- **Cold**: DALTO, MADALTO
- **Holy**: BADIOS, BADIAL, BADI
- **Magic**: ZILWAN, TILTOWAIT

**Spell Damage**:
```typescript
function calculateSpellDamage(
  spell: Spell,
  caster: Character,
  target: Combatant
): number {
  const baseDamage = rollDice(spell.damage)

  // Apply resistance
  let damage = baseDamage
  if (target.resistances.includes(spell.damageType)) {
    damage = Math.floor(damage / 2)
  }

  return Math.max(0, damage)
}
```

### Healing Spells

**In Combat**:
- DIOS (1d8 to single ally)
- DIAL (2d8 to party)
- MADI (3d8 to party)

**Targeting**:
- Can heal any party member (front or back)
- Cannot heal enemy
- Can heal dead characters to 1 HP (resurrection spell only)

### Status Effect Spells

**Sleep** (KATINO):
- Affects: Enemy group
- Effect: Cannot act, auto-hit
- Duration: Until hit or combat ends
- Resistance: High-level monsters resist

**Blind** (DILTO):
- Affects: Enemy group
- Effect: -4 to hit
- Duration: Rest of combat

**Paralyze** (MANIFO):
- Affects: Enemy group
- Effect: Cannot act, turned to stone
- Duration: Permanent (needs cure)

**Silence**:
- Prevents spellcasting
- Duration: Rest of combat
- Rare (only certain monsters cast)

### DISPELL (Turn Undead)

**Class Restriction**: Priest, Bishop, Lord only

**Effect**: Attempt to instantly destroy undead enemy group

**Formula**:
```
DispellChance% = (CasterLevel - UndeadLevel) × 10
FinalChance% = max(5, min(95, DispellChance))
```

**Examples**:
- Level 5 Priest vs Level 3 Zombies: (5-3) × 10 = **20%**
- Level 10 Lord vs Level 5 Ghouls: (10-5) × 10 = **50%**
- Level 8 Priest vs Level 12 Vampire: (8-12) × 10 = -40 → **5%** (minimum)
- Level 20 Bishop vs Level 2 Zombies: (20-2) × 10 = 180 → **95%** (maximum)

**Undead Targets**:
- **Low-Level**: Zombies (1-2), Creeping Coins (2-3)
- **Mid-Level**: Ghouls (3-4), Gas Cloud (4-5)
- **High-Level**: Spectres (7-8), Wraiths (8-9)
- **Boss**: Vampire (8-10), Vampire Lord (10+)

**Success**:
- Entire undead group instantly destroyed
- No counterattack or damage calculation
- Combat log shows dispell success

**Failure**:
- Character's turn is wasted (no action)
- Undead group unaffected
- Combat continues normally

**Strategic Trade-offs**:
- ✅ **Pros**: Instant group removal, no risk, fast combat
- ❌ **Cons**: No XP awarded, no treasure drops, fails waste turn
- **Use When**: Party low on resources, dangerous undead (level drain), quick escape needed
- **Avoid When**: Party needs XP/gold, low success chance (<20%), weak undead

## Fleeing

### Flee Mechanics

**Flee Attempt**:
```
FleeChance = 50% base
Modifiers:
  - Boss fight: 0% (cannot flee)
  - Party all alive: +0%
  - Party >50% dead: +20%
  - Enemy surprised: +30%

Success: Party returns to previous position
Failure: Lose turn, combat continues
```

**Flee Process**:
1. All party members select "Flee"
2. Roll flee chance
3. If success:
   - Combat ends immediately
   - Party returns to previous tile
   - No XP or treasure
4. If failure:
   - Party loses turn (enemies act)
   - Can retry next round

**Flee Restrictions**:
- Boss fights: Cannot flee
- Fixed encounters: Cannot flee
- First round: Usually can flee
- Subsequent rounds: Flee chance may decrease

## Victory and Rewards

### Experience Points

**XP Award Formula**:
```
TotalXP = sum(monster.xp for each killed monster)
XPPerCharacter = TotalXP / numberOfLivingCharacters

// Dead characters get NO XP
```

**Level Up**:
- XP accumulates
- Check if XP ≥ required for next level
- If yes, level up automatically
- Can level up multiple times in one combat

### Treasure

**Gold**:
```
Gold = random(monsterLevel × 10, monsterLevel × 100)
Example: Level 5 monsters = 50-500 gold
```

**Items**:
```
ItemChance = 10% per monster killed
ItemQuality = based on dungeon level
```

**Special Loot**:
- Boss monsters: Guaranteed special items
- Unique items: One-time drops
- Cursed items: 5% chance (disguised as good items)

### Distribution

**Gold**: Shared by entire party
**Items**: Added to party inventory
**XP**: Divided among living characters only

## Combat Status Effects

### Poison

**Effect**: -1 HP per turn (even after combat)
**Cure**: LATUMOFIS spell, temple
**Lethal**: Can kill character if untreated

### Paralysis

**Effect**: Cannot act, auto-hit by enemies
**Duration**: Until cured
**Cure**: LATUMOFIS spell, temple

### Silence

**Effect**: Cannot cast spells
**Duration**: Rest of combat
**Cure**: Automatic after combat

### Sleep

**Effect**: Cannot act, auto-hit, wakes when hit
**Duration**: Until hit
**Cure**: Any damage wakes character

### Blind

**Effect**: -4 to attack rolls
**Duration**: Rest of combat
**Cure**: Automatic after combat

## Related Documentation

**Services**:
- [CombatService](../services/CombatService.md) - Combat orchestration
- [InitiativeService](../services/InitiativeService.md) - Turn order
- [AttackService](../services/AttackService.md) - Attack resolution
- [DamageService](../services/DamageService.md) - Damage calculation
- [MonsterService](../services/MonsterService.md) - Monster AI

**Commands**:
- [AttackCommand](../commands/AttackCommand.md) - Physical attack
- [CastSpellCommand](../commands/CastSpellCommand.md) - Combat spell
- [FleeCommand](../commands/FleeCommand.md) - Flee attempt

**Game Design**:
- [Combat Mechanics](../game-design/05-combat.md) - Player guide
- [Monsters](../game-design/10-monsters.md) - Monster reference

**Research**:
- [Combat Formulas](../research/combat-formulas.md) - Validated formulas
- [Monster Reference](../research/monster-reference.md) - All 96 monsters

**Diagrams**:
- [Combat Flow](../diagrams/combat-flow.md) - Combat round phases
