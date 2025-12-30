# Wizardry 1 Combat Formulas and Mechanics

**Sources**:
- Thomas William Ewers' reverse-engineered Apple II source code (2012-2014)
- Snafaru's Wizardry #1-2-3 Game Code Calculations (zimlab.com)
- Data Driven Gamer blog (datadrivengamer.blogspot.com)

**Last Updated**: 2025-11-30
**Status**: ✅ Validated against authoritative sources

> **IMPORTANT**: For complete character creation mechanics, see:
> [character-creation-technical-reference.md](./character-creation-technical-reference.md)
>
> This document focuses on combat formulas. The technical reference covers
> all character creation, leveling, spell points, and attribute mechanics.

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

### Overview

Wizardry uses **simultaneous declaration, sequential resolution** combat. All actions are declared before any execute, then resolve in initiative order from **lowest to highest** (lower = faster, similar to D&D).

### Character Initiative Roll

```
Base Roll = 1d10 (random 1-10)
AgilityModifier = lookup from table below
Raw Initiative = Base Roll + AgilityModifier
Final Initiative = CLAMP(Raw Initiative, 1, 10)
```

### Agility Modifiers (Higher AGI = Faster)

| AGI | Modifier | Effect |
|-----|----------|--------|
| 3   | +2       | Slowest (penalty) |
| 4-5 | +1       | Slow |
| 6-7 | 0        | Average |
| 8-14| -1       | Fast |
| 15  | -2       | Very fast |
| 16  | -3       | Very fast |
| 17  | -4       | Extremely fast |
| 18  | -5       | Fastest (acts near start) |

**Source**: Data Driven Gamer - "Each round, each character has an initiative roll of 1d10. Initiative is further modified by agility."

### Monster Initiative Roll

```
Monster Initiative = 1d8 + 1 (range: 2-9)
```

Monsters do NOT use agility modifiers. Their initiative is always in the 2-9 range.

**Source**: Zimlab - "Monsters' initiatives are each set to RANDOM(0-7)+2"

### Turn Order Resolution

1. **Lower initiative acts first**
2. **On ties**: Characters act before monsters
3. Turn order recalculated each round

**Example Turn Order** (sorted lowest to highest):
```
Initiative 2: Ninja (AGI 18, rolled 7, -5 mod = 2) - FIRST
Initiative 3: Orc (rolled 2, +1 = 3)
Initiative 5: Fighter (AGI 14, rolled 6, -1 mod = 5)
Initiative 7: Mage (AGI 10, rolled 8, -1 mod = 7)
Initiative 9: Kobold (rolled 8, +1 = 9) - LAST
```

### Target Death Handling

**CRITICAL**: If a target monster dies before your queued attack resolves, **the attack is wasted** with no automatic retargeting. Plan accordingly when multiple characters target the same enemy.

**Exception**: Spells targeting groups continue to affect remaining members.

---

## Attacks Per Round (Swings)

### By Class

```
Fighter, Samurai, Lord:
  ClassSwings = 1 + (CharacterLevel DIV 5)

Ninja:
  ClassSwings = 2 + (CharacterLevel DIV 5)

Others (Mage, Priest, Thief, Bishop):
  ClassSwings = 1  // Fixed, always 1
```

### Weapon Swings

Some weapons inherently provide multiple swings. For example, Long Sword +2 gives 3 swings.

**IMPORTANT**: Class swings and weapon swings do **NOT** stack!

```
FinalSwings = MAX(ClassSwings, WeaponSwings)
FinalSwings = MIN(FinalSwings, 10)  // Hard cap at 10
```

**Source**: Zimlab - "Some weapons inherently provide more swings; this is why getting a Long Sword + 2 early for example is so great because it gives 3 swings by default. The number of swings is the maximum between your weapon's inherent characteristics or what your characters' level provide—they do NOT add up together."

### Examples

| Level | Fighter | Ninja | Mage | Fighter w/ Long Sword +2 (3 swings) |
|-------|---------|-------|------|-------------------------------------|
| 1 | 1 | 2 | 1 | MAX(1, 3) = **3** |
| 5 | 2 | 3 | 1 | MAX(2, 3) = **3** |
| 10 | 3 | 4 | 1 | MAX(3, 3) = **3** |
| 15 | 4 | 5 | 1 | MAX(4, 3) = **4** |
| 25 | 6 | 7 | 1 | MAX(6, 3) = **6** |
| 45+ | 10 | 10 | 1 | MAX(10, 3) = **10** |

**Strategic Note**: Weapons with high swing counts are extremely valuable early game (before class level catches up). A Level 1 Ninja with a 3-swing weapon gets 3 swings instead of 2.

---

## Hit Calculation

### Hit Probability Formula

```
// Step 1: Calculate HPCALCMD (hit calculation modifier) based on class
IF (class = PRIEST) OR (class = FIGHTER) OR (class >= SAMURAI) THEN
    HPCALCMD = 2 + (CharacterLevel DIV 3)
ELSE
    HPCALCMD = CharacterLevel DIV 5
```

**Source**: Zimlab source code - `IF (CLASS = PRIEST) OR (CLASS = FIGHTER) OR (CLASS >= SAMURAI) THEN HPCALCMD := 2 + CHARLEV DIV 3 ELSE HPCALCMD := CHARLEV DIV 5`

```
// Step 2: Apply strength modifier
HPCALCMD += StrengthHitModifier  // See Strength Modifiers table

// Step 3: Apply weapon bonus
HPCALCMD += Weapon.HitBonus

// Step 4: Calculate hit chance percentage
HitChance% = (HPCALCMD + MonsterAC + (3 × TargetPosition) - 1) × 5%

// Step 5: Clamp to valid range
FinalHitChance% = CLAMP(HitChance%, 5%, 95%)
```

**Source**: Data Driven Gamer - "This calculated value is then clamped to the 5% - 95% range. There is always at least a 5% chance of hitting and at least a 5% chance of missing."

### Target Position (Victim) Explained

The `TargetPosition` value affects hit chance and represents the monster's row/position in combat. The original code uses a value that results in `(3 × Victim) = 30` for standard targeting, giving the `+29` often seen in simplified formulas.

**Simplified formula** (standard case):
```
HitChance% = (HPCALCMD + MonsterAC + 29) × 5%
```

### Class Hit Progression

| Level | Fighter/Priest/Samurai/Lord/Ninja | Mage/Thief/Bishop |
|-------|-----------------------------------|-------------------|
| 1 | 2 + 0 = 2 | 0 |
| 3 | 2 + 1 = 3 | 0 |
| 5 | 2 + 1 = 3 | 1 |
| 10 | 2 + 3 = 5 | 2 |
| 15 | 2 + 5 = 7 | 3 |
| 20 | 2 + 6 = 8 | 4 |

### Examples

**Level 5 Fighter (HPCALCMD 3) vs AC 5 Monster**:
```
HitChance = (3 + 5 + 29) × 5% = 37 × 5% = 185% → Capped at 95%
```

**Level 5 Mage (HPCALCMD 1) vs AC 5 Monster**:
```
HitChance = (1 + 5 + 29) × 5% = 35 × 5% = 175% → Capped at 95%
```

**Level 10 Fighter (HPCALCMD 5) vs AC -5 Monster (tough)**:
```
HitChance = (5 + (-5) + 29) × 5% = 29 × 5% = 145% → Capped at 95%
```

**Level 3 Mage (HPCALCMD 0) vs AC -5 Monster**:
```
HitChance = (0 + (-5) + 29) × 5% = 24 × 5% = 120% → Capped at 95%
```

**Level 1 Thief (HPCALCMD 0) vs AC -8 Monster (Will O' Wisp)**:
```
HitChance = (0 + (-8) + 29) × 5% = 21 × 5% = 105% → Capped at 95%
```

**Notes**:
- Lower AC = harder to hit (D&D 1st edition style)
- **Always 5% minimum hit chance** (can always land a lucky blow)
- **Always 5% minimum miss chance** (can always fumble)
- Negative AC makes enemies very hard to hit at low levels

### Monster Hit Chance vs Characters

**Source**: Data Driven Gamer, Zimlab Game Calculations

```
MonsterHitChance% = (MonsterLevel + CharacterAC) × 5%

// Clamped to 5%-95% range
FinalChance% = max(5, min(95, MonsterHitChance%))
```

**Examples**:

**Level 5 Orc vs AC 4 Fighter**:
```
HitChance = (5 + 4) × 5% = 9 × 5% = 45%
```

**Level 10 Dragon vs AC -2 Fighter (plate + shield)**:
```
HitChance = (10 + (-2)) × 5% = 8 × 5% = 40%
```

**Level 3 Kobold vs AC 8 Mage**:
```
HitChance = (3 + 8) × 5% = 11 × 5% = 55%
```

**Notes**:
- Simpler formula than player attacks (no HPCALCMD)
- Lower AC significantly reduces monster hit chance
- High-level monsters with low AC targets still need reasonable AC for defense

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

### Unarmed Damage

```
// Default unarmed for most classes
UnarmedDamage = 2d2

// Ninja unarmed (better than default)
NinjaUnarmedDamage = 2d4
```

**Source**: Zimlab - "HitDam is an invisible stat representing your damage dice. Base value is 2d2, and is overridden when equipping a weapon."

**Note on Ninja Equipment**: Despite what the manual suggests, **you are better off equipping ninjas**. Unarmed ninjas do 2d4 (avg 5) which is better than 2d2 (avg 3), but many weapons surpass this. Ninjas score critical hits equally well with or without weapons.

**Source**: Zimlab - "Despite what the manual says, you are better off equipping ninjas. Unarmed ninjas do 2d4 base damage. That's better than the 2d2 of other classes, but it's not hard to find better weapons!"

### Double Damage Conditions

**Asleep or Held Targets**:
```
IF target.status == ASLEEP OR target.status == PARALYZED:
    FinalDamage = BaseDamage × 2
```

**Source**: Data Driven Gamer - "If a character or monster is sleeping or held then they take double damage!"

**Purposed Weapons** (vs. matching monster class):
```
IF weapon.purpose == target.monsterClass:
    FinalDamage = BaseDamage × 2

// Examples:
// Dragon Slayer vs Dragons: 2× damage
// Were Slayer vs Were creatures: 2× damage
// Mage Masher vs Mages: 2× damage
```

**Source**: Data Driven Gamer - "When your weapon is purposed vs. a certain type of monster you do double damage to it!"

### Damage Stacking

Double damage conditions do NOT stack multiplicatively:
```
// Sleep + Purposed weapon = 2× (not 4×)
// The game applies the higher multiplier, not both
```

**Strategic Notes**:
- Use KATINO (sleep) → then melee attacks for double damage
- Dragon Slayer is critical for dragon fights (halves effective dragon HP)
- Sleep/hold status makes even weak party members effective

---

## Critical Hits (Ninja Decapitation)

### Player Critical Hit Mechanics

**Who can critical**: Ninjas (all levels), or any character equipped with a critical-hit-granting item.

**Trigger**: If a Ninja (or character with crit item) deals at least 1 damage in an attack.

```
CriticalChance% = MIN(CharacterLevel × 2, 50)

// Examples:
Level 1:  2% critical chance
Level 10: 20% critical chance
Level 25: 50% critical chance (max)
```

**IMPORTANT**: Multiple swings do NOT grant multiple critical checks. The overall attack gives **ONE chance** for a critical hit, and only if at least one swing dealt damage.

**Source**: Zimlab - "Multiple strikes do not grant multiple chances to inflict critical hits. The overall attack gives one chance for a critical hit, and only if it inflicted at least one damage point."

### Monster Resistance to Critical Hits

```
MonsterResistChance = (MonsterLevel + 10) / 35

// Monsters level 24+ CANNOT be critically hit
// (24 + 10 = 34, which is always >= random(0-34))
```

**Source**: Data Driven Gamer - "A monster's chance to resist a successful critical hit is (Level + 10)/35."

| Monster Level | Resist Chance | Notes |
|---------------|---------------|-------|
| 1 | 31% | Easy to crit |
| 5 | 43% | Moderate resistance |
| 10 | 57% | Hard to crit |
| 15 | 71% | Very hard to crit |
| 20 | 86% | Almost immune |
| 24+ | 100% | **IMMUNE** to crits |

### Player Resistance to Monster Critical Hits

Players have a **two-stage** defense against monster critical hits:

```
// Stage 1: Saving Throw vs. Death
IF SaveVsDeath succeeds:
    Critical is negated

// Stage 2: Level-based resistance (if save failed)
ResistChance% = MIN(CharacterLevel × 2, 50)
IF random(1-100) <= ResistChance:
    Critical is negated anyway
```

**Source**: Zimlab - "If a character does not resist a Critical Hit (see Resistances above), then the character still has another (Character Level × 2)% chance up to a maximum of 50% chance to avoid being Critically Hit."

### Physical Protection Immunity

Characters equipped with items providing **Physical elemental resistance** are **IMMUNE** to critical hits from monster attacks!

**Source**: Data Driven Gamer Treasury - "Physical – You are immune to paralysis effects from hits. You will also never suffer critical hits."

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
Base = 50% + (5 × CharacterLevel) - (10 × MonsterLevel)

// Class penalties:
Priest: No penalty (available from level 1)
Bishop: -20% penalty (available from level 4)
Lord: -40% penalty (available from level 9)

// Apply class penalty
AdjustedBase = Base - ClassPenalty

// Clamp to valid range
FinalChance% = CLAMP(AdjustedBase, 5%, 95%)
```

**Source**: Zimlab - "Priests, Bishops and Lords have the ability to dispel undead monsters back to their plane. They have ((50 + (5 * Character Level)) - (10 * Monster Level))% chance to succeed on each monster of a group."

### DISPELL Examples

**Level 5 Priest vs Level 3 Zombies**:
```
Base = 50% + (5×5) - (10×3) = 50% + 25% - 30% = 45%
Penalty = 0%
Final = 45%
```

**Level 10 Priest vs Level 5 Ghouls**:
```
Base = 50% + (5×10) - (10×5) = 50% + 50% - 50% = 50%
Penalty = 0%
Final = 50%
```

**Level 8 Bishop vs Level 4 Wraiths**:
```
Base = 50% + (5×8) - (10×4) = 50% + 40% - 40% = 50%
Penalty = -20%
Final = 30%
```

**Level 12 Lord vs Level 6 Vampire**:
```
Base = 50% + (5×12) - (10×6) = 50% + 60% - 60% = 50%
Penalty = -40%
Final = 10%
```

**Level 20 Priest vs Level 12 Vampire Lord**:
```
Base = 50% + (5×20) - (10×12) = 50% + 100% - 120% = 30%
Final = 30%
```

### DISPELL Effects

**On Success**:
- Each monster in the undead group is checked individually
- Successful dispell removes that monster from combat
- **No XP awarded** for dispelled monsters
- **No treasure dropped** (bodies vanish)
- Combat ends if all enemies dispelled

**On Failure**:
- Monster remains in combat
- Character's action is complete (not "wasted" - it just didn't work)

### Undead Monster List (Dispell/Zilwan Targets)

| Monster | ID | Level | Notes |
|---------|----|----|-------|
| Undead Kobold | 3 | 2 | Easy target |
| Zombie | 7 | 1 | Easiest |
| Rotting Corpse | 23 | 2 | Paralyzes |
| Grave Mist | 34 | 4 | Paralyzes |
| Shade | 37 | 3 | Level drains |
| Lifestealer | 59 | 5 | Level drains ×2 |
| Nightstalker | 60 | 5 | Level drains |
| Murphy's Ghost | 77 | 10 | Fixed encounter |
| Vampire | 86 | 11 | Level drains ×2, paralyzes |
| Dragon Zombie | 89 | 12 | Drain breath |
| Maelific | 94 | 25 | Level drains ×3 |
| Vampire Lord | 95 | 20 | Level drains ×4 |

**Not Affected**: Living, demonic, dragon, or any non-Undead class monsters

### Strategic Notes

- **Use DISPELL when**: Party is damaged, facing level-draining undead, need to conserve spell points
- **Skip DISPELL when**: Farming XP/gold, high success chance makes killing faster, low chance vs high-level undead
- **Priests are best**: No penalty, available early (Bishop -20%, Lord -40%)
- **Level draining undead**: Always consider DISPELL - getting drained is devastating

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

## Parry Action

### Effect

Parrying reduces your AC by 2 for the combat round. The character takes no offensive action.

```
ParryAC = BaseAC - 2
```

**Source**: Data Driven Gamer - "Parrying has the invisible effect of reducing your AC by 2 for the round."

### When Parry is Useful

- Back row characters (positions 4-6) default to Parry since they cannot melee attack
- Front row characters can choose to Parry when low on HP
- Stacks with existing AC buffs (PORFIC, BAMATU, etc.)

---

## Flee/Run Mechanics

### Base Run Formula

```
BaseChance = 39% - (MazeLevel × 3%)
```

| Dungeon Level | Base Flee Chance |
|---------------|------------------|
| Level 1 | 36% |
| Level 2 | 33% |
| Level 3 | 30% |
| Level 4 | 27% |
| Level 5 | 24% |
| Level 6 | 21% |
| Level 7 | 18% |
| Level 8 | 15% |
| Level 9 | 12% |
| **Level 10** | **0% (NEVER works!)** |

**Source**: Data Driven Gamer - "Running NEVER works in level 10!"

### Small Party Bonus

If the party has 3 or fewer members:

```
SmallPartyBonus = 20% - (PartyCount × 5%)
```

| Party Size | Bonus |
|------------|-------|
| 1 member | +15% |
| 2 members | +10% |
| 3 members | +5% |
| 4+ members | +0% |

### Demoralization Bonus

If monsters are **demoralized**, add **+20%** to flee odds.

Monsters become demoralized when:
```
TotalPartyLevel > TotalMonsterMorale

// Where:
MonsterMorale = MonsterLevel × NumberOfOKMonstersInGroup
TotalMonsterMorale = Sum across all groups
```

**Source**: Data Driven Gamer - "If the monsters are demoralized (e.g. some of them want to run), then add 20% to the odds."

### Complete Run Formula

```
RunChance = 39% - (MazeLevel × 3%)

IF PartySize <= 3:
    RunChance += 20% - (PartySize × 5%)

IF MonstersDemoralized:
    RunChance += 20%

IF MazeLevel == 10:
    RunChance = 0%  // NEVER succeeds on Level 10
```

### Run Consequences

- **Success**: Party escapes and appears at random location/direction on same maze level
- **Failure**: Monsters get one free round of attacks, then party can try again
- **No rewards**: Fleeing grants no XP or treasure
- **Cannot run**: From Level 10 (Werdna's level)

---

## Thievery Formulas

### Trap Identification

```
// Thief identification
ThiefIdentifyChance = (6 × Agility)%
MaxChance = 95%

// Ninja identification
NinjaIdentifyChance = (4 × Agility)%
MaxChance = 95%

// Other classes
OtherIdentifyChance = (1 × Agility)%
```

**Source**: Zimlab - "The Thief has ((RANDOM 0 to 99) < (6 * Agility)) chance to identify a trap"

**Failed identification**: Reveals a **random trap name** (may be wrong!)

### Trap Disarm

```
// Thief/Ninja disarm chance
DisarmChance = (50 + CharacterLevel - MazeLevel) / 70

// Other classes
OtherDisarmChance = (CharacterLevel - MazeLevel) / 70
```

**If disarm fails**: `(Agility × 5%)` chance to avoid triggering the trap and get another try.

**Source**: Data Driven Gamer - "If disarming fails, the chance to avoid setting off the trap is Agility * 5%."

### CALFO Spell

The CALFO spell provides **95% accurate** trap identification.

**Source**: Zimlab - "Calfo spell: 95% accurate"

---

## Resurrection Mechanics

### DI and KADORTO Success Rate

```
SuccessRate = (4 × Vitality)%

// Examples:
VIT 3:  12% success
VIT 10: 40% success
VIT 15: 60% success
VIT 18: 72% success
```

**Source**: Zimlab - "DI or KADORTO: The resurrect chance is (4 x Vitality)% of the recipient."

### Vitality Loss

**CRITICAL**: Each resurrection attempt (success or failure) **permanently reduces Vitality by 1**.

```
// After resurrection attempt:
Character.Vitality -= 1

// If Vitality was 3 before casting:
// Character is LOST FOREVER (cannot resurrect with VIT < 3)
```

**Source**: Zimlab - "The recipient permanently loses 1 Vitality point. If Vitality is only 3 when cast, character is Lost forever."

### Death Progression

```
DEAD → DI spell →
  Success: Revived with 1 HP, VIT -1
  Failure: Status becomes ASHES, VIT -1

ASHES → KADORTO spell →
  Success: Revived with FULL HP, VIT -1
  Failure: Status becomes LOST (permanent deletion), VIT -1
```

### Temple Resurrection Costs

```
DeadCost = 200 × Level
AshesCost = 500 × Level
ParalysisCure = 100 × Level
StoneCure = 200 × Level

// Examples:
Level 5 dead: 1,000 gold
Level 5 ashes: 2,500 gold
Level 10 dead: 2,000 gold
Level 10 ashes: 5,000 gold
```

**Temple Success Rate**: Uses the same `(4 × Vitality)%` formula. Temple priests don't have better odds, just guaranteed availability.

### Strategic Implications

- **High VIT is critical** for resurrection insurance
- **VIT 18 character**: 72% success rate, can survive ~15 resurrections before reaching VIT 3
- **VIT 10 character**: 40% success rate, can survive ~7 resurrections before reaching VIT 3
- **Never attempt resurrection** on a character with VIT 3 - they will be permanently lost on failure

---

## Town Services & Costs

### Inn Room Costs

**Source**: Strategy Wiki - Trebor's Castle

| Room Type | HP Restored/Stay | Cost (gold) |
|-----------|------------------|-------------|
| Stables | 0 | Free |
| Barracks | 1 | 10 |
| Double Occupancy | 3 | 50 |
| Private | 7 | 200 |
| Royal Suite | 10 | 500 |

**Inn Mechanics**:
- Characters rest until fully healed OR gold runs out
- Party can pool gold to pay for one character's room
- Each rest cycle ages characters slightly (~0.1 years)
- Spell points fully restored
- Vitality (VIM) decreases slightly per rest (~0.05)

### Boltac's Trading Post

**Buying**: Items available in rotating inventory
**Selling**: Boltac pays 50% of shop price

**Restrictions**:
- Won't buy cursed items (must UNCURSE first)
- Won't buy unidentified items (must IDENTIFY first)
- Boltac never sells cursed items (only found in dungeon)

### Training Grounds

**Level-Up Process**:
1. Gain required XP for next level
2. Visit Training Grounds
3. Attributes may increase or decrease (random)
4. HP increases by at least 1 (class HD + VIT modifier)
5. Spell casters may learn new spells

**Stat Changes**:
- Generally increase
- Possible to decrease (rare)
- Higher level = better chance of increases

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

**Combat Actions**:

**Parrying** (Source: Data Driven Gamer)
```
// When character chooses to parry/defend
TemporaryAC = BaseAC - 2

// AC reduction applies only for that combat round
// Character cannot attack when parrying
```

**Notes**:
- Parrying is a defensive action (trade attack for better defense)
- Reduces AC by 2 for one round
- Does NOT stack with multiple MAPORFIC (max one MAPORFIC effect)
- Useful when low on HP and need to survive

---

## Experience and Leveling

### XP Requirements

**Source**: Realm Millennium Group (WizExpLevs.html, WizExpLevs2.html)

XP progression follows class-based tables. Elite classes require significantly more XP than basic classes.

#### Basic Classes

**Fighter**
| Level | XP Required | Δ XP |
|-------|-------------|------|
| 1 | 0 | - |
| 2 | 1,000 | 1,000 |
| 3 | 1,724 | 724 |
| 4 | 2,972 | 1,248 |
| 5 | 5,124 | 2,152 |
| 6 | 8,834 | 3,710 |
| 7 | 15,231 | 6,397 |
| 8 | 26,260 | 11,029 |
| 9 | 45,275 | 19,015 |
| 10 | 78,060 | 32,785 |
| 11 | 134,586 | 56,526 |
| 12 | 232,044 | 97,458 |
| 13 | 400,075 | 168,031 |

**Thief**
| Level | XP Required | Δ XP |
|-------|-------------|------|
| 1 | 0 | - |
| 2 | 900 | 900 |
| 3 | 1,551 | 651 |
| 4 | 2,674 | 1,123 |
| 5 | 4,610 | 1,936 |
| 6 | 7,948 | 3,338 |
| 7 | 13,703 | 5,755 |
| 8 | 23,625 | 9,922 |
| 9 | 40,732 | 17,107 |
| 10 | 70,227 | 29,495 |
| 11 | 121,081 | 50,854 |
| 12 | 208,760 | 87,679 |
| 13 | 359,931 | 151,171 |

**Mage**
| Level | XP Required | Δ XP |
|-------|-------------|------|
| 1 | 0 | - |
| 2 | 1,100 | 1,100 |
| 3 | 1,896 | 796 |
| 4 | 3,268 | 1,372 |
| 5 | 5,634 | 2,366 |
| 6 | 9,713 | 4,079 |
| 7 | 16,746 | 7,033 |
| 8 | 28,872 | 12,126 |
| 9 | 49,779 | 20,907 |
| 10 | 85,825 | 36,046 |
| 11 | 147,974 | 62,149 |
| 12 | 255,127 | 107,153 |
| 13 | 439,967 | 184,840 |

**Priest**
| Level | XP Required | Δ XP |
|-------|-------------|------|
| 1 | 0 | - |
| 2 | 1,050 | 1,050 |
| 3 | 1,810 | 760 |
| 4 | 3,120 | 1,310 |
| 5 | 5,379 | 2,259 |
| 6 | 9,274 | 3,895 |
| 7 | 15,989 | 6,715 |
| 8 | 27,567 | 11,578 |
| 9 | 47,529 | 19,962 |
| 10 | 81,946 | 34,417 |
| 11 | 141,286 | 59,340 |
| 12 | 243,596 | 102,310 |
| 13 | 419,993 | 176,397 |

#### Elite Classes

**Bishop**
| Level | XP Required | Δ XP |
|-------|-------------|------|
| 1 | 0 | - |
| 2 | 1,200 | 1,200 |
| 3 | 2,105 | 905 |
| 4 | 3,692 | 1,587 |
| 5 | 6,477 | 2,785 |
| 6 | 11,363 | 4,886 |
| 7 | 19,935 | 8,572 |
| 8 | 34,973 | 15,038 |
| 9 | 61,356 | 26,383 |
| 10 | 107,642 | 46,286 |
| 11 | 188,845 | 81,203 |
| 12 | 331,307 | 142,462 |
| 13 | 581,240 | 249,933 |

**Samurai**
| Level | XP Required | Δ XP |
|-------|-------------|------|
| 1 | 0 | - |
| 2 | 1,100 | 1,100 |
| 3 | 2,192 | 1,092 |
| 4 | 3,845 | 1,653 |
| 5 | 6,745 | 2,900 |
| 6 | 11,833 | 5,088 |
| 7 | 20,759 | 8,926 |
| 8 | 36,419 | 15,660 |
| 9 | 63,892 | 27,473 |
| 10 | 112,091 | 48,199 |
| 11 | 196,650 | 84,559 |
| 12 | 345,000 | 148,350 |
| 13 | 605,263 | 260,263 |

**Lord**
- XP requirements similar to Samurai (hybrid fighter/priest)
- Limited data in source: Level 13 requires 407,346 XP

**Ninja**
- XP requirements highest of all classes
- Limited data in source: Level 15 requires 1,761,748 XP

#### XP Progression Pattern

Classes ranked by XP requirement (fastest to slowest):
1. Thief (fastest - base 900 XP to level 2)
2. Fighter (base 1,000 XP to level 2)
3. Priest (base 1,050 XP to level 2)
4. Mage (base 1,100 XP to level 2)
5. Samurai (base 1,100 XP to level 2, but higher than Mage at later levels)
6. Bishop (base 1,200 XP to level 2 - slowest of listed classes)
7. Lord (limited data)
8. Ninja (slowest overall)

### HP Gain on Level-Up
```
HP_Gain = HitDice + VIT_Modifier + random_factor

// HitDice varies by class:
Fighter: 1d10
Mage: 1d4
Priest: 1d8
Thief: 1d6
Bishop: 1d6
Samurai: 1d8 (gets +1 extra die roll per level)
Lord: 1d10
Ninja: 1d6

VIT_Modifier:
VIT 3: -2 HP
VIT 4-5: -1 HP
VIT 6-15: 0 HP
VIT 16: +1 HP
VIT 17: +2 HP
VIT 18: +3 HP

Minimum HP gain: 1 (can't go below)
```

---

## Saving Throws and Resistances

### Saving Throw Formula

**Source**: Data Driven Gamer (reverse-engineered source code)

```
SavingThrowChance% = (Level ÷ 5 + Luck ÷ 6 - ClassBonus - RaceBonus) × 5%

// Clamped to 5%-95% range
FinalChance% = max(5, min(95, SavingThrowChance%))
```

**Class Bonuses** (lower is better):
- Fighter, Samurai, Lord: Lower bonus (better saves)
- Mage, Priest, Bishop: Medium bonus
- Thief, Ninja: Higher bonus (worse saves)

**Race Bonuses** (exact values need research):
- Dwarf: Bonus vs poison/magic
- Elf: Bonus vs charm
- Human/Gnome/Hobbit: Standard

**Example Calculations**:

**Level 10 Fighter, Luck 12**:
```
Base = (10 ÷ 5 + 12 ÷ 6) = 2 + 2 = 4
// Assuming ClassBonus = 0, RaceBonus = 0
SavingThrow = 4 × 5% = 20%
```

**Level 15 Bishop, Luck 18**:
```
Base = (15 ÷ 5 + 18 ÷ 6) = 3 + 3 = 6
// Assuming ClassBonus = 1, RaceBonus = 0
SavingThrow = (6 - 1) × 5% = 5 × 5% = 25%
```

### Resistance Mechanics

**Source**: Zimlab Game Calculations

**Base Resistance Formula**:
```
TotalResistance% = BaseResistance + LevelBonus + LuckBonus

// Level bonus: Add 5% for every 5 character levels
LevelBonus = floor(Level / 5) × 5%

// Luck bonus
LuckBonus:
  Luck 6: +5%
  Luck 12: +10%
  Luck 18: +15%

// Maximum resistance: 95% (always 5% chance of effect)
FinalResistance% = min(95, TotalResistance%)
```

**Base Resistance by Class/Race**:
- Varies by specific effect type (poison, magic, breath, etc.)
- Dwarves: Higher poison resistance
- Elves: Higher charm/sleep resistance
- Exact base values need research

**Examples**:

**Level 20 Dwarf with Luck 12, Base Poison Resistance 25%**:
```
LevelBonus = floor(20 / 5) × 5% = 4 × 5% = 20%
LuckBonus = 10% (Luck 12)
TotalResistance = 25% + 20% + 10% = 55%
```

**Level 10 Elf with Luck 18, Base Sleep Resistance 30%**:
```
LevelBonus = floor(10 / 5) × 5% = 2 × 5% = 10%
LuckBonus = 15% (Luck 18)
TotalResistance = 30% + 10% + 15% = 55%
```

**Notes**:
- Higher level characters resist status effects better
- Luck is valuable defensive stat
- Can never achieve 100% resistance (95% cap)
- Different resistance types for different effects (poison, magic, breath, etc.)

---

## Status Effects

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
| ASLEEP | Level × 10% | 50% | Wakes on damage too |
| AFRAID | Level × 5% | 50% | Rare in Wizardry 1 |
| PARALYZED | **NONE** | 0% | **NO natural recovery in combat!** |

**MONSTERS**:
| Status | Recovery Formula | Max |
|--------|------------------|-----|
| ASLEEP | Level × 20% | 50% |
| AFRAID | Level × 10% | 50% |
| PARALYZED | Level × 7% | 50% |

**Source**: Data Driven Gamer - "Your chance to heal AFRAID status per round is Level * 5%, but not more than 50%."

**CRITICAL**: Characters have **NO natural recovery** from PARALYZE in combat! Must use DIALKO spell or wait until combat ends.

### Poison

**Activation**: 25% chance per combat round AND per maze step.

**Damage**: -1 HP per activation.

**Stacking**: Does NOT stack from combat hits (always sets to 1).
- **Exception**: Poison Needle trap CAN stack poison

**Source**: Zimlab - "Once a character is poisoned, there is 25% chance each round during combat or each maze movement that the poison will take effect."

**Cure**: LATUMOFIS spell or Temple service.

### Paralyze

**Effect**: Character cannot act; auto-hit by enemies; takes 2× damage.

**Character Recovery**: **NONE in combat** - must use DIALKO spell.

**Monster Recovery**: `(MonsterLevel × 7)%` per turn, max 50%.

**Temple Cost**: 100 gold × Character Level.

### Sleep

**Effect**: Cannot act; auto-hit by enemies; takes 2× damage; wakes when damaged.

**Caused by**: KATINO spell, some monster abilities.

**Recovery**: Damage wakes immediately, OR natural recovery per round.

### Petrify (Stone)

**Effect**: Character turned to stone, cannot act.

**Caused by**: Medusalizard, Flack, Werdna (on successful hit with stone ability).

**Cure**: MADI spell or Temple (cannot cure in combat!).

**Temple Cost**: 200 gold × Character Level.

### Silence

**Effect**: Cannot cast spells (melee still works).

**Caused by**: MONTINO spell.

**Recovery**: Silenced characters should recover, but **due to a bug in the original game, they never do during combat**.

**NOTE (Implementation Decision)**: We are **FIXING** this bug - silenced characters will recover properly using a reasonable formula.

### Level Drain

**Effect**: Permanently lose X levels from a draining monster's attack.

**HP Recalculation**:
```
NewMaxHP = OldMaxHP × (NewLevel / MaxLev)
// MaxLev = highest level ever achieved without being drained
```

**Death**: Character is **permanently LOST** if drained below level 1.

**Draining Monsters**:
| Monster | Drain Amount |
|---------|-------------|
| Shade | 1 level |
| Nightstalker | 1 level |
| Lifestealer | 2 levels |
| Vampire | 2 levels |
| Maelific | 3 levels |
| Vampire Lord | 4 levels |
| Werdna | 4 levels |

**Source**: Data Driven Gamer - "If you are hit, you will lose X levels, and your maxHP will be reduced to ([newLevel]* [oldMaxHP])/[MaxLev]"

---

## Encounter Mechanics

### Random Encounter Rate

```
// Corridor/hallway movement
EncounterChance = 1% per step

// Kicking doors into flagged rooms (without treasure chest)
RoomEncounterChance = 12.5%

// Rooms with treasure chests
ChestRoomEncounter = 100% (guaranteed)
```

**Source**: Data Driven Gamer - "Entering a room with a treasure chest guarantees an encounter"

### Monster Group Limits

```
MaxGroups = MIN(MazeLevel + 1, 4)
MaxMonstersPerGroup = MazeLevel + 4
```

| Maze Level | Max Groups | Max per Group |
|------------|-----------|---------------|
| 1 | 2 | 5 |
| 2 | 3 | 6 |
| 3 | 4 | 7 |
| 4+ | 4 | Level + 4 |

**Source**: Zimlab - "You will encounter a maximum of 2 monster groups on maze level 1, a maximum of 3 on level 2, and up to 4 on level 4 and beyond."

### Surprise Mechanics

```
// Step 1: Check if party surprises monsters
IF random(1-100) <= 20:
    PartySuprises = true
    // Party gets a free round of actions
    // Monsters cannot act in round 1

// Step 2: If party didn't surprise, check if monsters surprise party
ELSE IF random(1-100) <= 20:
    MonstersSurprise = true
    // Monsters get a free round of attacks
    // Party cannot act in round 1

// Step 3: Neither side surprised
ELSE:
    NormalCombat = true
    // Both sides act in round 1
```

**Source**: Data Driven Gamer - "When an encounter occurs, you have a 20% chance of surprising the monsters. If you have not surprised them, then the monsters get a 20% chance of surprising you."

### Friendly Monster Encounters

Only **Good-aligned parties** can encounter friendly monsters.

```
FriendlyChance = varies by monster class (see Monster Classes)

IF party.alignment == GOOD AND random(1-100) <= FriendlyChance:
    // Monster is friendly
    // Party can choose to fight or leave

IF party.alignment == GOOD AND ChooseToFight:
    // 1/2000 chance each Good member turns Evil
```

| Monster Class | Friendly % |
|---------------|-----------|
| Fighter | 11% |
| Mage | 6% |
| Priest | 16% |
| Thief | 4% |
| Dragon | 26% |
| Giant | 1% |
| Most others | 1% |

**Source**: Data Driven Gamer Bestiary

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

## XP and Gold Distribution

### XP Distribution Rules

**IMPORTANT**: Only **OK-status** characters receive XP and gold!

```
// After combat victory
FOR each character in party:
    IF character.status == OK:
        character.XP += TotalMonsterXP / OKCharacterCount
    ELSE:
        // Dead, paralyzed, stoned, etc. get NOTHING
        character.XP += 0

// Dispelled or fled monsters award NO XP
IF monster.wasDispelled OR monster.fled:
    XP_from_monster = 0
```

**Source**: Data Driven Gamer - "Only OK-status characters get XP and gold. Dead characters get nothing."

### Gold Distribution

Gold follows the same rules as XP:
```
// Gold is divided equally among OK-status party members
GoldPerCharacter = TotalGold / OKCharacterCount

// Dead/incapacitated characters receive nothing
```

### XP Overflow Bug (Authentic Quirk - REPLICATED)

**BUG DESCRIPTION**: High spell-resistance monsters (≥80%) can receive bonus XP due to an integer overflow in the ADDLONGS routine when calculating XP awards.

```
// Original code bug (we replicate this for authenticity):
IF monster.spellResist >= 80:
    // ADDLONGS overflow adds ~40,000+ XP to award
    EffectiveXP = BaseXP + overflow_bonus
```

**Affected Monsters**:
| Monster | Spell Resist | XP with Bug |
|---------|-------------|-------------|
| Will O' Wisp | 100% | ~42,000+ XP |
| Greater Demon | 100% | ~45,000+ XP |
| High Priest | 80% | ~40,000+ XP |

**Why We Replicate**: This bug creates a fun "farming incentive" - players discover that certain monsters are unusually rewarding. It adds authenticity and doesn't break game balance (these monsters are very dangerous).

**Source**: Zimlab - "There's an overflow bug in ADDLONGS that causes high spell-resist monsters to award significantly more XP than intended."

---

## Complete Combat Round Pseudocode

```
PROCEDURE CombatRound:
    // Phase 1: Input
    CollectAllCharacterActions()
    DetermineMonsterActions()  // AI selects actions

    // Phase 2: Initiative
    FOR each participant:
        IF participant.isCharacter:
            initiative = 1d10 + AgilityModifier
            initiative = CLAMP(initiative, 1, 10)
        ELSE:  // Monster
            initiative = 1d8 + 1  // Range 2-9

    // Sort by initiative (LOWEST first = fastest)
    // On ties: characters act before monsters
    SortByInitiative(allParticipants)

    // Phase 3: Resolution
    FOR each actor IN turnOrder:
        IF actor.status != OK:
            SKIP  // Dead/paralyzed/etc. can't act

        IF actor.target.isDead AND actor.action == ATTACK:
            // Queued melee attack wasted if target died
            SKIP

        ExecuteAction(actor)

        // Check for status recovery
        IF actor.status == ASLEEP:
            IF random(1-100) <= MIN(actor.level × 10, 50):
                actor.status = OK

        IF actor.status == AFRAID:
            IF random(1-100) <= MIN(actor.level × 5, 50):
                actor.status = OK

        // Note: Characters have NO natural PARALYZE recovery!
        IF actor.isMonster AND actor.status == PARALYZED:
            IF random(1-100) <= MIN(actor.level × 7, 50):
                actor.status = OK

    // Phase 4: Poison
    FOR each participant:
        IF participant.isPoisoned:
            IF random(1-100) <= 25:  // 25% activation
                participant.HP -= 1
                IF participant.HP <= 0:
                    participant.status = DEAD

    // Phase 5: Combat End Check
    IF AllMonstersDefeated():
        AwardXPAndGold()  // Only to OK-status characters
        CheckForTreasure()
        END_COMBAT

    IF AllCharactersIncapacitated():
        GAME_OVER

    NextRound()
```

### Attack Resolution Pseudocode

```
PROCEDURE ResolveAttack(attacker, targetGroup):
    // Select random victim from group
    victim = targetGroup.randomOKMember()

    swings = MAX(attacker.classSwings, attacker.weapon.swings)
    swings = MIN(swings, 10)  // Hard cap

    FOR i = 1 TO swings:
        // Hit check
        HPCALCMD = CalculateHPCALCMD(attacker)
        hitChance = (HPCALCMD + victim.AC + 29) × 5%
        hitChance = CLAMP(hitChance, 5%, 95%)

        IF random(1-100) <= hitChance:
            // Calculate damage
            damage = RollWeaponDice(attacker.weapon)
            damage += attacker.strengthDamageBonus

            // Double damage conditions
            IF victim.status IN [ASLEEP, PARALYZED]:
                damage = damage × 2
            ELSE IF attacker.weapon.purpose == victim.class:
                damage = damage × 2

            victim.HP -= damage
            damageDealt = true

            // Wake sleeping targets
            IF victim.status == ASLEEP:
                victim.status = OK

            IF victim.HP <= 0:
                victim.status = DEAD
                BREAK  // Stop attacking dead monster

    // Critical hit check (Ninjas only, once per attack)
    IF attacker.canCritical AND damageDealt AND victim.HP > 0:
        critChance = MIN(attacker.level × 2, 50)
        IF random(1-100) <= critChance:
            // Monster resist check
            resistChance = (victim.level + 10) / 35
            IF random(0-34) >= (victim.level + 10):
                // Critical success!
                victim.status = DEAD
                victim.HP = 0
```

### Monster AI Pseudocode

```
PROCEDURE DetermineMonsterAction(monster):
    // 75% chance to cast spell if able
    IF monster.canCastSpells AND random(1-100) <= 75:
        IF monster.hasMageSpells:
            spellLevel = DetermineMageSpellLevel(monster)
            spell = SelectMageSpell(spellLevel)
            RETURN CastSpell(spell)

        IF monster.hasPriestSpells:
            // Priest spells: always use max level (no degradation)
            spell = SelectPriestSpell(monster.maxPriestLevel)
            RETURN CastSpell(spell)

    // Otherwise: physical attack
    RETURN PhysicalAttack()

PROCEDURE DetermineMageSpellLevel(monster):
    // Mage spell level degradation table
    // Roll determines actual spell level used
    roll = random(1-100)
    maxLevel = monster.maxMageLevel

    IF roll <= 71:        RETURN maxLevel      // 71% use max
    ELSE IF roll <= 91.59: RETURN maxLevel - 1  // 20.59% drop 1
    ELSE IF roll <= 97.55: RETURN maxLevel - 2  // 5.96% drop 2
    ELSE IF roll <= 99.28: RETURN maxLevel - 3  // 1.73% drop 3
    ELSE IF roll <= 99.78: RETURN maxLevel - 4  // 0.5% drop 4
    ELSE IF roll <= 99.93: RETURN maxLevel - 5  // 0.15% drop 5
    ELSE:                  RETURN maxLevel - 6  // 0.07% drop 6+

PROCEDURE MonsterCallForHelp(group):
    // Monsters can call for reinforcements if group is small
    IF group.count < 5 AND random(1-100) <= 75:  // 75% attempt
        successChance = monster.level × 5
        IF random(1-100) <= successChance:
            // Add reinforcements to group
            AddMonstersToGroup(group)
```

---

## Formulas Needing More Research

1. **Exact spell point calculation** (ValueA/ValueB system)
2. ~~**Precise trap disarm rates**~~ ✅ **DOCUMENTED** (See Thievery section)
3. ~~**Exact flee success formula**~~ ✅ **DOCUMENTED** (See Flee/Run section)
4. ~~**Encounter rate per tile**~~ ✅ **DOCUMENTED** (See Encounter Mechanics)
5. ~~**Surprise round mechanics**~~ ✅ **DOCUMENTED** (See Encounter Mechanics)
6. ~~**Exact resurrection VIM/age penalties**~~ ✅ **DOCUMENTED** (See Resurrection)
7. **Critical hit damage multiplier** - Confirmed: **No multiplier, instant kill only**
8. ~~**Exact XP tables per class**~~ ✅ **DOCUMENTED** (6 of 8 classes)
9. **HP gain random factors** (need exact die roll mechanics)
10. **Equipment stat bonuses** (per-item basis)
11. **Class/Race bonuses for saving throws** (partial formula, exact values needed)
12. **Base resistance values by class/race** (formula documented, base values needed)

---

## Known Bugs and Implementation Decisions

### Bugs We REPLICATE (Authentic Quirks)

**XP Overflow Bug** - See "XP and Gold Distribution" section above.
- Adds ~40,000+ XP to high spell-resist monsters
- Creates fun farming incentive
- Doesn't break balance (affected monsters are dangerous)

### Bugs We FIX (Broken/Frustrating)

**1. Save vs. Wand (Unused)**
- **Original Bug**: The Elf race bonus for "Save vs. Wand" does nothing - the save type is never called.
- **Our Fix**: Remove the unused save type entirely. Elf gets a different meaningful bonus.

**2. Silence Recovery**
- **Original Bug**: Characters inflicted with Silence never recover naturally in combat due to missing HEALHEAR routine.
- **Our Fix**: Implement proper recovery using formula: `RecoveryChance = Level × 5%` (same as AFRAID).

**3. HAMAN/MAHAMAN Missing Effects**
- **Original Bug**: Due to `CASE RANDOM MOD (3 * MAHAMFLG)` bug, two effects never trigger:
  - "SHIELDS PARTY" (damage reduction)
  - "RESURRECTS PARTY" (mass resurrection)
- **Our Fix**: Implement all intended effects with proper random selection.

**4. Deadly Ring (Harmless)**
- **Original Bug**: The Deadly Ring curse is supposed to drain HP but has a logic error making it harmless.
- **Our Fix**: Implement actual curse damage as intended (-1 HP per step while equipped).

### Bugs We DON'T Replicate (Use Correct Behavior)

**1. MANIFO Effect**
- **Original Bug**: MANIFO inflicts ASLEEP instead of PARALYZE as manual states.
- **Our Implementation**: Correct PARALYZE effect (matches player expectations from manual).

**2. Item Range Bug (Off-by-Two)**
- **Original Bug**: Item reward ranges have off-by-two errors making some items unobtainable.
- **Our Implementation**: Correct ranges (1-16, 17-32, etc.) so all items are obtainable.

**3. Poison/Disband Bug**
- **Original Bug**: Disbanding party cures poison (poison flag shares memory with X coordinate).
- **Our Implementation**: Poison persists correctly through party changes.

**4. DISPELL Status Check**
- **Original Bug**: Only OK-status monsters can be dispelled (sleeping/held undead are immune!).
- **Our Implementation**: DISPELL works on undead regardless of their status.

---

## Recently Added Formulas

### 2025-11-30 Update (Major Validation Pass)

From Thomas William Ewers' reverse-engineered source, Data Driven Gamer, and Zimlab:

✅ **Initiative System**: Corrected to lower = faster (not higher = faster)
✅ **Monster Initiative**: 1d8+1 (range 2-9), not random(0-9)
✅ **DISPELL Formula**: 50% + (5×Level) - (10×MonsterLevel) with class penalties
✅ **Weapon Swings**: MAX(class, weapon), not additive
✅ **Character PARALYZE Recovery**: None in combat (critical correction)
✅ **Flee Formula**: 39% - (MazeLevel×3%) with bonuses, never works on Level 10
✅ **Resurrection**: (4 × Vitality)% success rate
✅ **Status Recovery Rates**: Complete tables for characters and monsters
✅ **Surprise Mechanics**: 20% party surprises, else 20% monsters surprise
✅ **Monster AI**: 75% spell cast chance with mage spell degradation table
✅ **XP Distribution**: Only OK-status characters receive rewards
✅ **Complete Combat Pseudocode**: Full round, attack, and monster AI

### 2025-10-26 Update

From Perplexity research validation:

✅ **Monster Hit Chance vs Characters**: `(Monster Level + Character AC) × 5%`
✅ **Saving Throws**: `(Level ÷ 5 + Luck ÷ 6 - ClassBonus - RaceBonus) × 5%`
✅ **Resistances**: Base + (Level ÷ 5) × 5% + Luck bonuses, max 95%
✅ **Parrying**: -2 AC for one round (defensive action)
✅ **Damage Doubling**: Sleep/held targets and type-effective weapons deal 2× damage

---

**Last Updated**: 2025-11-30 (Major validation pass from authoritative sources)
**Previous Update**: 2025-10-26 (Perplexity research)
**Status**: ✅ Combat formulas validated against reverse-engineered Apple II source
