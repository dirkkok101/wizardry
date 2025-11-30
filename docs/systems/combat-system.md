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

## Surprise Mechanics

When an encounter begins, surprise is determined:

```
// Step 1: Check if party surprises monsters
IF random(1-100) <= 20:  // 20% chance
    PartySurprises = true
    // Party gets a free round of actions
    // Monsters cannot act in round 1

// Step 2: If party didn't surprise, check if monsters surprise party
ELSE IF random(1-100) <= 20:  // 20% chance
    MonstersSurprise = true
    // Monsters get a free round of attacks
    // Party cannot act in round 1

// Step 3: Neither side surprised
ELSE:
    NormalCombat = true
    // Both sides act in round 1
```

**Effects of Surprise**:
- Surprised side cannot act during the first combat round
- Surprising side gets a full round of actions uncontested
- After first round, combat proceeds normally

---

## Combat Flow

### Combat Initiation

**Trigger Points**:
- Random encounter while moving in dungeon (1% per step)
- Kicking doors into flagged rooms (12.5% if no chest, 100% if chest)
- Fixed encounter at specific tile
- Boss encounter (cannot flee)

**Process**:
1. Encounter check (dice roll vs. dungeon level)
2. Select monster groups (1-4 groups, max = MIN(MazeLevel + 1, 4))
3. Roll for surprise (20% party surprises, else 20% monsters surprise)
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

**CRITICAL: Lower initiative acts FIRST** (like D&D, not highest-first)

**Character Initiative Formula**:
```
Base Roll = 1d10 (random 1-10)
Initiative = Base Roll + AgilityModifier
Final Initiative = CLAMP(Initiative, 1, 10)
```

**Monster Initiative Formula**:
```
Monster Initiative = 1d8 + 1 (range: 2-9)
// Monsters do NOT use agility modifiers
```

### Agility Modifiers (Higher AGI = FASTER = Lower Initiative)

| AGI | Modifier | Effect |
|-----|----------|--------|
| 3 | +2 | Slowest (penalty) |
| 4-5 | +1 | Slow |
| 6-7 | 0 | Average |
| 8-14 | -1 | Fast |
| 15 | -2 | Very fast |
| 16 | -3 | Very fast |
| 17 | -4 | Extremely fast |
| 18 | -5 | Fastest |

**Character Example**:
```
Ninja (AGI 18):
  Modifier = -5
  Roll = 1d10 = 7
  Initiative = 7 + (-5) = 2  → Acts EARLY
```

**Monster Example**:
```
Orc:
  Roll = 1d8 + 1 = 6
  Initiative = 6  → Acts in middle
```

### Turn Order

**Sorting**:
- **LOWER initiative acts FIRST**
- **Ties**: Characters act before monsters
- Turn order recalculated each round

**Example Turn Order** (sorted lowest to highest):
```
Round 1 (LOWEST FIRST):
1. Ninja (Init 2) - Attack          [FIRST - fastest]
2. Orc #2 (Init 3) - Attack
3. Priest (Init 5) - Cast KALKI
4. Orc #1 (Init 6) - Attack
5. Mage (Init 7) - Cast MAHALITO
6. Fighter (Init 8) - Attack
7. Orc Leader (Init 9) - Attack     [LAST - slowest]
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

**Action Selection** (Corrected):
```
IF monster.canCastSpells:
    IF random(1-100) <= 75:  // 75% spell cast chance
        CastSpell()
    ELSE:
        PhysicalAttack()
ELSE:
    PhysicalAttack()
```

**Spellcasting Probability**: **75%** (not 50%)

**Mage Spell Level Degradation**:
When a monster casts a mage spell, it may cast at a lower level than its maximum:

| Roll | Effect |
|------|--------|
| 71% | Use max spell level |
| 20.59% | Drop 1 level |
| 5.96% | Drop 2 levels |
| 1.73% | Drop 3 levels |
| 0.5% | Drop 4 levels |
| ... | (Continues geometrically) |

**Priest Spells**: Always use maximum level (no degradation)

**Spell Level Depletion** (per group):
After each spell cast by a group:
```
DepletionChance = 1 / (GroupSize + 2)
IF triggered:
    Group's spell level decreases by 1 for remaining combat
```

**Call for Help**:
If group has fewer than 5 monsters:
- **75%** chance monster attempts to call
- Success rate: `MonsterLevel × 5%`
- Success adds more monsters to group

**Target Selection**:
- Targets are selected randomly from available party members
- Front row characters more likely to be hit by melee
- Spells may target specific rows or entire party

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

**Formula** (Corrected):
```
Base = 50% + (5 × CharacterLevel) - (10 × MonsterLevel)

// Class penalties:
Priest: No penalty (available from level 1)
Bishop: -20% penalty (available from level 4)
Lord: -40% penalty (available from level 9)

// Apply penalty and clamp
AdjustedChance = Base - ClassPenalty
FinalChance% = CLAMP(AdjustedChance, 5%, 95%)
```

**Examples**:
- Level 5 Priest vs Level 3 Zombies: 50% + 25% - 30% = **45%**
- Level 10 Priest vs Level 5 Ghouls: 50% + 50% - 50% = **50%**
- Level 8 Bishop vs Level 4 Wraiths: 50% + 40% - 40% - 20% = **30%**
- Level 12 Lord vs Level 6 Vampire: 50% + 60% - 60% - 40% = **10%**
- Level 20 Priest vs Level 12 Vampire Lord: 50% + 100% - 120% = **30%**

**Undead Targets** (See monster-technical-reference.md for complete list):
- **Low-Level**: Undead Kobold (2), Zombie (1), Rotting Corpse (2)
- **Mid-Level**: Grave Mist (4), Shade (3), Lifestealer (5), Nightstalker (5)
- **High-Level**: Murphy's Ghost (10), Vampire (11), Dragon Zombie (12)
- **Boss**: Maelific (25), Vampire Lord (20)

**Success**:
- Each monster in group rolled individually
- Successful dispell removes that monster
- **No XP awarded** for dispelled monsters
- **No treasure drops** from dispelled monsters

**Failure**:
- Monster remains in combat
- Character's action complete (not wasted, just unsuccessful)
- Combat continues normally

**Strategic Trade-offs**:
- ✅ **Pros**: Instant removal, saves resources, avoids level drain
- ❌ **Cons**: No XP, no treasure, class penalties reduce effectiveness
- **Use When**: Party low on resources, facing level-draining undead, quick escape needed
- **Avoid When**: Party needs XP/gold, success chance <20%, weak non-threatening undead

## Fleeing

### Flee Mechanics

**Base Run Formula** (Corrected):
```
BaseChance = 39% - (MazeLevel × 3%)

// Small party bonus (3 or fewer members)
IF PartySize <= 3:
    SmallPartyBonus = 20% - (PartySize × 5%)
    // 1 member = +15%, 2 = +10%, 3 = +5%

// Demoralization bonus
IF MonstersDemoralized:
    DemoralBonus = +20%

// Final calculation
FinalChance = BaseChance + SmallPartyBonus + DemoralBonus
```

**Flee Chance by Dungeon Level**:
| Level | Base | With 2-member party | With demoralized monsters |
|-------|------|---------------------|---------------------------|
| 1 | 36% | 46% | 56% |
| 3 | 30% | 40% | 50% |
| 5 | 24% | 34% | 44% |
| 7 | 18% | 28% | 38% |
| 9 | 12% | 22% | 32% |
| **10** | **0%** | **0%** | **0%** |

**CRITICAL: RUNNING NEVER WORKS ON LEVEL 10!**

**Monster Demoralization Check**:
```
TotalPartyLevel = sum(character.level for all OK characters)
TotalMonsterMorale = sum(monster.level × okCount for each group)

IF TotalPartyLevel > TotalMonsterMorale:
    Monsters are DEMORALIZED (+20% flee chance)
```

**Flee Process**:
1. All party members select "RUN"
2. Roll flee chance
3. If success:
   - Party teleports to random position on same maze level
   - Random facing direction
   - No XP or treasure
4. If failure:
   - Monsters get free round of attacks
   - Party can retry next round

**Flee Restrictions**:
- **Level 10**: Running NEVER works (Werdna's level)
- Boss fights: Cannot flee
- Fixed encounters: Usually cannot flee

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

### Status Hierarchy

Statuses from best to worst (worse always overwrites better):
```
OK → AFRAID → ASLEEP → PARALYZED → STONED → DEAD → ASHES → LOST
```

**Important**: Only one status at a time. **Poison is NOT a status** and can coexist with any status.

### Status Recovery Rates (Per Round)

**CHARACTERS**:
| Status | Recovery Formula | Max | Notes |
|--------|------------------|-----|-------|
| ASLEEP | Level × 10% | 50% | Also wakes on damage |
| AFRAID | Level × 5% | 50% | Rare in Wizardry 1 |
| PARALYZED | **NONE** | 0% | **NO natural recovery in combat!** |

**MONSTERS**:
| Status | Recovery Formula | Max |
|--------|------------------|-----|
| ASLEEP | Level × 20% | 50% |
| AFRAID | Level × 10% | 50% |
| PARALYZED | Level × 7% | 50% |

**CRITICAL**: Characters have **NO natural recovery** from PARALYZE in combat! Must use DIALKO spell or wait until combat ends.

### Poison

**Activation**: 25% chance per combat round AND per maze step
**Effect**: -1 HP per activation
**Stacking**: Does NOT stack from combat (always resets to 1)
**Exception**: Poison Needle trap CAN stack poison
**Cure**: LATUMOFIS spell or temple
**Lethal**: Can kill character if untreated

### Paralysis

**Effect**: Cannot act, auto-hit by enemies, takes 2× damage
**Character Recovery**: **NONE in combat** - must use DIALKO spell
**Monster Recovery**: (Level × 7)% per turn, max 50%
**Cure**: DIALKO spell or temple (100 gold × Level)

### Sleep

**Effect**: Cannot act, auto-hit by enemies, takes 2× damage
**Character Recovery**: (Level × 10)% per turn, max 50% OR any damage wakes
**Monster Recovery**: (Level × 20)% per turn, max 50%
**Cure**: Any damage wakes character

### Silence

**Effect**: Cannot cast spells (melee still works)
**Original Bug**: Characters never recover naturally (missing HEALHEAR routine)
**Our Implementation**: Recovery using Level × 5% per turn (same as AFRAID)
**Cure**: Combat ends or recovery roll succeeds

### Afraid

**Effect**: Cannot act normally, may flee
**Character Recovery**: (Level × 5)% per turn, max 50%
**Monster Recovery**: (Level × 10)% per turn, max 50%
**Note**: Rare status in Wizardry 1

### Petrify (Stone)

**Effect**: Character turned to stone, treated as dead
**Duration**: Permanent (cannot recover in combat)
**Cure**: MADI spell or temple (200 gold × Level)

## Related Documentation

**Research** (Primary Sources):
- [Combat Formulas](../research/combat-formulas.md) - All validated combat formulas with pseudocode
- [Monster Technical Reference](../research/monster-technical-reference.md) - Complete monster stats and abilities
- [Treasure System](../research/treasure-system.md) - Loot generation and distribution

**Game Design**:
- [Combat Mechanics](../game-design/05-combat.md) - Player-facing guide
- [Monsters](../game-design/10-monsters.md) - Monster reference

**Services** (Implementation):
- [CombatService](../services/CombatService.md) - Combat orchestration
- [InitiativeService](../services/InitiativeService.md) - Turn order
- [AttackService](../services/AttackService.md) - Attack resolution
- [MonsterService](../services/MonsterService.md) - Monster AI

---

**Last Updated**: 2025-11-30
**Status**: ✅ Validated against authoritative sources (Ewers' Apple II source code)
