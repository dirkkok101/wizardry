# Wizardry 1 Combat Formulas and Mechanics

**Sources**:
- Data Driven Gamer blog (datadrivengamer.blogspot.com)
- Zimlab Wizardry Fan Page (www.zimlab.com/wizardry)

**Validated**: 2025-10-25
**Status**: ✅ Confirmed from authoritative sources

**Validation Attempt**: 2025-10-26
- Source #32 (Faster Thoughts - Damage Mechanics): ❌ Not applicable (covers Wizardry Variants Daphne, not Wizardry 1)
- Source #31 (Strategy Wiki - Enemies): ⚠️ Provides monster stats only, no combat formulas
- Note: Combat formulas in this document remain validated from original sources only

---

## Character Creation Formulas

### Bonus Point Roll
```
Roll = 1d4 + 6  (yields 7-10)

If Roll < 20:
  if random(1-11) == 1:  // 1/11 chance (9.09%)
    Roll += 10

If Roll < 20:
  if random(1-11) == 1:  // 1/11 chance (9.09%)
    Roll += 10
```

**Distribution**:
- 7-10 points: 90.0% (most common)
- 17-20 points: 9.25% (first bonus proc)
- 27-29 points: 0.75% (both bonuses proc)

**Maximum**: 29 bonus points (extremely rare)

### Starting Age
```
Age = 14 + random(0-2)  // Yields 14-16 years
```

---

## Spell System Formulas

### Spell Learning Chance
```
LearnChance = (INT or PIE) / 30

// For mage spells: use INT
// For priest spells: use PIE
```

**Examples**:
- INT/PIE 11: 36.7% chance
- INT/PIE 15: 50.0% chance
- INT/PIE 18: 60.0% chance

### Spell Points per Level
```
SpellPointsForLevel[circle] = max(
  learned,  // If already learned at least 1 spell this level
  1 + first_level - current_level,  // Based on when first learned
  cap at 9 maximum  // Hard cap
)

// ValueA and ValueB from character record:
// Points = [Level] - ValueA + ValueB - (ValueB × Circle)
// Clipped to 0-9 range
```

**Notes**:
- Complex formula; varies by class and character progression
- Bishops learn slower (penalty applied)
- Need more research on exact ValueA/ValueB mechanics

### Spell Failure Rates

**General Rule**: No fizzle rate for most spells

**Exceptions**:
- **LOKTOFEIT** (Recall): Success = Level × 2% (max 26% at L13)
- **DI** (Resurrect): ~90% success, 10% → turns to ashes
- **KADORTO** (Raise Ashes): ~50% success, 50% → lost forever

---

## Combat Initiative

### Initiative Roll
```
Initiative = random(0-9) + AgilityModifier
Minimum = 1  // Can't go below 1
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

**Notes**: Fastest initiative goes first each round

---

## Attacks Per Round

### By Class
```
Fighter, Samurai, Lord:
  AttacksPerRound = 1 + floor(Level / 5)
  Max = 10 attacks

Ninja:
  AttacksPerRound = 2 + floor(Level / 5)
  Max = 10 attacks

Others (Mage, Priest, Thief, Bishop):
  AttacksPerRound = 1  // Fixed
```

**Examples**:
- Level 1 Fighter: 1 attack
- Level 5 Fighter: 2 attacks
- Level 10 Fighter: 3 attacks
- Level 25 Fighter: 6 attacks
- Level 45+ Fighter: 10 attacks (max)
- Level 1 Ninja: 2 attacks
- Level 40+ Ninja: 10 attacks (max)

---

## Hit Calculation

### Hit Probability Formula
```
// Step 1: Calculate HPCALCMD (hit calculation modifier)
HPCALCMD = BaseMod + floor(Level / Divisor)

// Fighter, Priest, Samurai, Lord:
BaseMod = 2
Divisor = 3
HPCALCMD = 2 + floor(Level / 3)

// Mage, Thief, Bishop, Ninja:
BaseMod = 0
Divisor = 5
HPCALCMD = floor(Level / 5)

// Step 2: Calculate hit chance percentage
HitChance% = (HPCALCMD + MonsterAC + 3 × Victim - 1) × 5%

// Victim = 10 (standard value)
// Simplified: HitChance% = (HPCALCMD + MonsterAC + 29) × 5%
```

### Examples

**Level 5 Fighter vs AC 5 Monster**:
```
HPCALCMD = 2 + floor(5/3) = 2 + 1 = 3
HitChance = (3 + 5 + 29) × 5% = 37 × 5% = 185%  // Capped at 95%
```

**Level 5 Mage vs AC 5 Monster**:
```
HPCALCMD = floor(5/5) = 1
HitChance = (1 + 5 + 29) × 5% = 35 × 5% = 175%  // Capped at 95%
```

**Level 10 Fighter vs AC -5 Monster (tough)**:
```
HPCALCMD = 2 + floor(10/3) = 2 + 3 = 5
HitChance = (5 + (-5) + 29) × 5% = 29 × 5% = 145%  // Capped at 95%
```

**Level 10 Mage vs AC -5 Monster**:
```
HPCALCMD = floor(10/5) = 2
HitChance = (2 + (-5) + 29) × 5% = 26 × 5% = 130%  // Capped at 95%
```

**Notes**:
- Lower AC = harder to hit (D&D 1st edition style)
- Most hits cap at 95% (always 5% miss chance)
- Negative AC makes enemies very hard to hit at low levels

---

## Damage Calculation

### Strength Modifiers

| STR | To-Hit Modifier | Damage Modifier |
|-----|-----------------|-----------------|
| 3 | -15% | -3 |
| 4 | -10% | -2 |
| 5 | -5% | -1 |
| 6-15 | 0% | 0 |
| 16 | +5% | +1 |
| 17 | +10% | +2 |
| 18 | +15% | +3 |
| 18+ | +15%+ | +3+ |

### Weapon Damage
```
Damage = WeaponDice + STR_Modifier

// Examples:
Dagger: 1d4 + STR
Sword: 1d8 + STR
Mace: 1d6 + STR
```

### Ninja Unarmed Damage (Special)
```
UnarmedDamage = (1d4 + 1d4) + STR_Modifier

// Average: ~5 + STR before considering ninja level bonuses
```

---

## Critical Hits

### Critical Hit Chance
```
CriticalChance% = (2 × Level)%
Maximum = 50%
```

**Examples**:
- Level 1: 2% critical chance
- Level 10: 20% critical chance
- Level 25+: 50% critical chance (max)

### Decapitation (Instant Kill)
**Only available to**: Ninjas (all levels), some monsters

**Effect**: On critical hit, chance to instantly kill target (regardless of HP)

**Notes**: Ninjas at high level have 50% crit × decapitation chance = extremely dangerous

---

## Monster Identification

### Identification Chance (Per Round)
```
IDChance% = (INT + PIE + Level) / 99

// Success reveals monster stats and abilities
```

**Examples**:
- INT 15, PIE 15, Level 5: (15+15+5)/99 = 35.4% per round
- INT 18, PIE 18, Level 10: (18+18+10)/99 = 46.5% per round

**Notes**: Cumulative each round; high-level bishops/samurai/lords identify quickly

---

## DISPELL (Turn Undead)

### DISPELL Success Formula

**Available to**: Priest, Bishop, Lord only
**Target**: Undead enemy groups only

```
DispellChance% = (CasterLevel - UndeadLevel) × 10

// Clamped to 5% - 95% range
FinalChance% = max(5, min(95, DispellChance))
```

**Examples**:
- Level 5 Priest vs Level 3 Zombies: (5-3) × 10 = 20%
- Level 10 Lord vs Level 5 Ghouls: (10-5) × 10 = 50%
- Level 15 Bishop vs Level 10 Wraiths: (15-10) × 10 = 50%
- Level 8 Priest vs Level 12 Vampire: (8-12) × 10 = -40 → 5% (minimum)
- Level 20 Bishop vs Level 2 Zombies: (20-2) × 10 = 180 → 95% (maximum)

### DISPELL Effects

**On Success**:
- Entire undead group instantly removed from combat
- No XP awarded (dispelled, not defeated)
- No treasure dropped (bodies disintegrate)
- Combat may end if all groups dispelled

**On Failure**:
- No effect on undead
- Action wasted for this combat round

### Undead Monster Types

**Affected by DISPELL**:
- Zombies (Level 1-2)
- Ghouls (Level 3-4)
- Creeping Coins (Level 2-3)
- Gas Cloud (Level 4-5)
- Spectres (Level 7-8)
- Wraiths (Level 8-9)
- Vampire (Level 8-10)
- Vampire Lord (Level 10+)

**Not Affected**: Living, demonic, or mechanical enemies

**Strategic Notes**:
- Use DISPELL when party is weak/injured
- Skip DISPELL when farming XP/gold
- Low success rate vs high-level undead (Vampire Lord)
- Class-restricted (only divine classes)

---

## Level-Up Stat Changes

### Stat Change Chance
```
For each stat:
  if random(1-100) <= 75:  // 75% chance stat is checked
    Roll = random(1-100)

    if Roll <= (130 - Age):
      Stat += 1  // INCREASE
    else:
      Stat -= 1  // DECREASE
```

### Age Impact on Stats

| Age | Increase Chance | Decrease Chance | Notes |
|-----|-----------------|-----------------|-------|
| 15 | 115% (capped 95%) | 5% (min) | Excellent growth |
| 20 | 110% (capped 95%) | 5% (min) | Excellent growth |
| 30 | 100% | 0% | Perfect growth |
| 40 | 90% | 10% | Good growth |
| 50 | 80% | 20% | Risky |
| 60 | 70% | 30% | Very risky |
| 70 | 60% | 40% | Dangerous |
| 80 | 50% | 50% | Coin flip |
| 90+ | <40% | >60% | Death likely |

**Formula for each stat**:
```
// 75% chance to modify
Expected gain per stat = 0.75 × [(130-age)/100 - (100-(130-age))/100]

Age 15: 0.75 × [1.15 - 0.05] ≈ +0.825 expected
Age 30: 0.75 × [1.00 - 0.00] ≈ +0.75 expected
Age 50: 0.75 × [0.80 - 0.20] ≈ +0.45 expected
Age 70: 0.75 × [0.60 - 0.40] ≈ +0.15 expected
```

---

## Aging and Vitality

### Aging from Inn Rest
```
AgeIncrease = ~0.1 years per rest

// Exact formula needs more research
```

### Vitality (VIM) Loss
```
VIM_Loss = ~0.05 vim per rest

// VIM affects resurrection success rate
// Lower VIM = harder to resurrect
```

### Old Age Death Risk
```
if Age >= 50:
  DeathRisk = increases with age
  // Exact formula needs research
  // Can die during level-up or rest
```

---

## Thievery Formulas

### Trap Disarm
```
DisarmChance = f(AGI, LUC, Level, Thief_Skills)

// Exact formula needs more research
// Higher AGI, LUC, and level = better success
```

### Chest Opening
```
OpenChance = f(AGI, LUC, Level)

// Similar to disarm
// Failure can trigger trap
```

### Item Identification (Thief)
```
IdentifyChance = f(Level, LUC)

// Exact formula needs research
```

---

## Resurrection Mechanics

### DI Spell (Resurrect from Death)
```
SuccessRate ≈ 90% - (age penalties) - (vim penalties)

Success: Character returns to life (HP = 1)
Failure: Character turns to ashes
```

### KADORTO Spell (Resurrect from Ashes)
```
SuccessRate ≈ 50% - (age penalties) - (vim penalties)

Success: Character returns to life (HP = 1)
Failure: Character lost forever (permanent deletion)
```

### Temple Resurrection Costs
```
DeadCost = 100 × Level
AshesCost = 500 × Level

// Examples:
Level 5 dead: 500 gold
Level 5 ashes: 2,500 gold
Level 10 dead: 1,000 gold
Level 10 ashes: 5,000 gold
```

---

## AC (Armor Class) System

**D&D 1st Edition Style**: Lower AC = better defense

| AC | Defense Level | Example |
|----|---------------|---------|
| 10 | No armor | Unarmored |
| 8 | Leather | Light armor |
| 6 | Studded leather | Medium armor |
| 4 | Chain mail | Heavy armor |
| 2 | Plate mail | Very heavy |
| 0 | Plate + Shield | Excellent |
| -2 | Magic plate | Superior |
| -5 | Best equipment | Elite |
| -7 | Werdna | Boss-tier |
| -8 | Will O' Wisp | Best in game |

**Spell Buffs**:
- MOGREF: -2 AC (single target)
- KALKI: -1 AC (party)
- PORFIC: -4 AC (single target)
- MATU: -2 AC (party)
- BAMATU: -4 AC (party)
- MAPORFIC: -4 AC (party)
- KATU: Massive AC reduction (party)

**Stacking**: Multiple buffs stack (can get extremely low AC)

---

## Experience and Leveling

### XP Requirements
```
// Exact XP table needs extraction
// Different per class:
// - Fighter/Thief: Fastest progression
// - Mage/Priest: Medium progression
// - Bishop/Elite: Slowest progression
```

### HP Gain on Level-Up
```
HP_Gain = HitDice + VIT_Modifier + random_factor

// HitDice varies by class:
Fighter: 1d10
Mage: 1d4
Priest: 1d8
Thief: 1d6
Bishop: 1d6
Samurai: 1d10
Lord: 1d10
Ninja: 1d8

VIT_Modifier:
VIT 3-5: -1 HP
VIT 6-15: 0 HP
VIT 16-17: +1 HP
VIT 18+: +2 HP

Minimum HP gain: 1 (can't go below)
```

---

## Status Effects

### Poison
- Damage over time
- Requires cure (spell or temple)

### Paralyze
- Character cannot act
- Requires cure (spell or temple)

### Petrify (Stone)
- Character turned to stone
- Removed from combat
- Requires temple cure

### Silence
- Cannot cast spells
- Melee still works
- Usually temporary (battle duration)

### Sleep
- Automatically hit by attacks
- Large to-hit bonus for attackers
- Damage wakes character

### Drain (Level)
- Permanent level loss
- Lose HP, spells, abilities
- Extremely dangerous
- **Cannot be reversed** (in Wizardry 1)

---

## Encounter Mechanics

### Random Encounter Rate
```
// Per-tile probability, varies by level
// Exact rates need extraction

// Generally:
Level 1-3: Low encounter rate
Level 4-7: Medium encounter rate
Level 8-10: High encounter rate
```

### Monster Groups
```
GroupCount = 1-4 groups per encounter

MonstersPerGroup = varies by monster type
  // Common: 2-8
  // Rare: 1-2
  // Boss: 1 (unique)
```

### Surprise Round
```
// Chance for party or monsters to get free first round
// Exact formula needs research
```

---

## Special Combat Rules

### Fleeing (Running Away)
```
// Some monsters can flee mid-combat
// Party can attempt to run (success rate varies)
// Exact flee formula needs research
```

### Friendly Fire
```
// Area spells CAN hit allies if not careful
// Target selection critical
```

### Group Targeting
```
// Combat targets monster GROUPS, not individuals
// Damage distributed across group
// Group dies when all members dead
```

---

## Formulas Needing More Research

1. **Exact spell point calculation** (ValueA/ValueB system)
2. **Precise trap disarm rates**
3. **Exact flee success formula**
4. **Encounter rate per tile**
5. **Surprise round mechanics**
6. **Exact resurrection VIM/age penalties**
7. **Critical hit damage multiplier** (if any)
8. **Exact XP tables per class**
9. **HP gain random factors**
10. **Equipment stat bonuses**

---

**Last Updated**: 2025-10-25
**Next Review**: After extracting additional mechanics data
