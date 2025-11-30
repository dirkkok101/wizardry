# Wizardry 1: Proving Grounds of the Mad Overlord
## Character Creation System - Complete Technical Reference

**Source**: Thomas William Ewers' reverse-engineered Apple II source code (2012-2014)
**Cross-referenced**: Snafaru's Wizardry calculations, Data Driven Gamer blog
**Last Updated**: 2025-11-30
**Status**: Authoritative reference for all character creation mechanics

---

## 1. Races

### 1.1 Race Base Attributes

| Race   | STR | IQ  | PIE | VIT | AGI | LUC | Total |
|--------|-----|-----|-----|-----|-----|-----|-------|
| Human  | 8   | 8   | 5   | 8   | 8   | 9   | 46    |
| Elf    | 7   | 10  | 10  | 6   | 9   | 6   | 48    |
| Dwarf  | 10  | 7   | 10  | 10  | 5   | 6   | 48    |
| Gnome  | 7   | 7   | 10  | 8   | 10  | 7   | 49    |
| Hobbit | 5   | 7   | 7   | 6   | 10  | 15  | 50    |

### 1.2 Racial Saving Throw Bonuses

Expressed as negative values (lower is better):

| Race   | Save Category         | Bonus |
|--------|-----------------------|-------|
| Human  | Save vs. Death        | -1    |
| Elf    | Save vs. Wand (unused)| -2    |
| Dwarf  | Save vs. Breath       | -4    |
| Gnome  | Save vs. Petrify      | -2    |
| Hobbit | Save vs. Spell        | -3    |

> **Note:** The Elf's Save vs. Wand bonus is never used in the game code.

### 1.3 Racial Resistances

| Race   | Resistance Type                          | Bonus |
|--------|------------------------------------------|-------|
| Human  | Poison, Paralysis, Critical Hit          | +5%   |
| Elf    | Breath Attacks (half damage)             | +10%  |
| Dwarf  | Poison Gas Trap                          | +20%  |
| Gnome  | Stoning effects                          | +10%  |
| Hobbit | Anti-Mage/Anti-Priest Traps, Silence     | +15%  |

---

## 2. Alignment System

### 2.1 Alignment Rules

- **Good and Evil characters cannot travel together** in the same party
- Neutral characters can travel with anyone
- Fighting friendly monsters: 1/2000 chance (0.05%) for Good characters to turn Evil
- Evil parties never encounter friendly monsters
- If alignment changes to one not allowed by class, character cannot gain levels

---

## 3. Character Classes

### 3.1 Class Requirements

| Class   | Alignment | STR | IQ  | PIE | VIT | AGI | LUC | Total Req |
|---------|-----------|-----|-----|-----|-----|-----|-----|-----------|
| Fighter | Any       | 11  | -   | -   | -   | -   | -   | 11        |
| Mage    | Any       | -   | 11  | -   | -   | -   | -   | 11        |
| Priest  | G/E       | -   | -   | 11  | -   | -   | -   | 11        |
| Thief   | N/E       | -   | -   | -   | -   | 11  | -   | 11        |
| Bishop  | G/E       | -   | 12  | 12  | -   | -   | -   | 24        |
| Samurai | G/N       | 15  | 11  | 10  | 14  | 10  | -   | 60        |
| Lord    | Good only | 15  | 12  | 12  | 15  | 14  | 15  | 83        |
| Ninja   | Evil only | 17  | 17  | 17  | 17  | 17  | 17  | 102       |

### 3.2 Class Hit Dice

| Class              | Hit Die | Notes                       |
|--------------------|---------|----------------------------|
| Fighter, Lord      | d10     | Best HP progression         |
| Priest, Samurai    | d8      | Samurai gets +1 extra roll  |
| Thief, Bishop, Ninja | d6    |                             |
| Mage               | d4      | Lowest HP progression       |

### 3.3 Class Saving Throw Bonuses

| Class   | Death | Petrify | Wand | Breath | Spell |
|---------|-------|---------|------|--------|-------|
| Fighter | -3    | -       | -    | -      | -     |
| Mage    | -     | -       | -    | -      | -3    |
| Priest  | -     | -3      | -    | -      | -     |
| Thief   | -     | -       | -    | -3     | -     |
| Bishop  | -     | -2      | -2   | -      | -2    |
| Samurai | -2    | -       | -    | -      | -2    |
| Lord    | -2    | -2      | -    | -      | -     |
| Ninja   | -3    | -2      | -4   | -3     | -2    |

### 3.4 Class Abilities Summary

| Class   | Spellbook       | Swings/Level    | Special        | Dispel              |
|---------|-----------------|-----------------|----------------|---------------------|
| Fighter | None            | (Lvl/5)+1       | -              | -                   |
| Mage    | Mage            | 1               | -              | -                   |
| Priest  | Priest          | 1               | -              | Always (no penalty) |
| Thief   | None            | 1               | Trap skills    | -                   |
| Bishop  | Both            | 1               | ID items       | Lvl 4+ (-20%)       |
| Samurai | Mage (Lvl 4+)   | (Lvl/5)+1       | -              | -                   |
| Lord    | Priest (Lvl 4+) | (Lvl/5)+1       | -              | Lvl 9+ (-40%)       |
| Ninja   | None            | (Lvl/5)+2       | Critical hits  | -                   |

### 3.5 Class Resistances

**Vs. Poison & Paralysis & Critical Hit:**
- Fighter: 15%, Samurai: 10%, Lord: 10%, Ninja: 15%
- Human race: +5%

**Vs. Stoning:**
- Priest: 15%, Bishop: 10%, Lord: 10%, Ninja: 10%
- Gnome race: +10%

**Vs. Breath Attacks:**
- Bishop: 10%, Ninja: 20%
- Elf race: +10% (reduces breath damage by half)

**Vs. Poison Gas Trap:**
- Thief: 15%, Ninja: 15%
- Dwarf race: +20%

**Vs. Anti-Mage/Anti-Priest Trap & Silence:**
- Mage: 15%, Bishop: 10%, Samurai: 10%, Ninja: 10%
- Hobbit race: +15%

---

## 4. Bonus Points System

### 4.1 Bonus Points Algorithm (Apple II)

```
Step 1: Roll 1d4+6 (result: 7-10 points)
Step 2: 1/11 chance (9.09%) to add +10 points
Step 3: IF total < 20, another 1/11 chance to add +10 more
Maximum possible: 29 points
```

### 4.2 Probability Distribution

| Points Range | Probability | Notes                                      |
|--------------|-------------|--------------------------------------------|
| 7-10         | ~90.9%      | Most common - basic classes only           |
| 17-19        | ~6.2%       | Possible to create Samurai (for some races)|
| 20           | ~2.3%       | Guaranteed Samurai for Elf/Dwarf/Gnome     |
| 27-29        | ~0.6%       | Rare - still cannot create Lord or Ninja   |

### 4.3 Implementation

```typescript
function rollBonusPoints(): number {
    let points = random(1, 4) + 6;    // 7-10
    if (random(1, 11) === 1) {        // 9.09% chance
        points += 10;
    }
    if (points < 20 && random(1, 11) === 1) {  // Another 9.09% chance
        points += 10;
    }
    return points;
}
```

### 4.4 Attribute Assignment Rules

- Cannot lower any attribute below race base value
- Cannot raise any attribute above 18
- Must allocate ALL bonus points before proceeding
- Must qualify for at least one class before character can be created

---

## 5. Starting Character Values

### 5.1 Starting Age

```
Age (in weeks) = (18 * 52) + random(0, 299)
Result: 18 years 0 weeks to 23 years 39 weeks
```

### 5.2 Starting Gold

```
Gold = 90 + random(0, 99)
Result: 90 to 189 gold pieces
```

### 5.3 Starting Hit Points

```typescript
function calculateStartingHP(hitDie: number, vitalityMod: number): number {
    let hp: number;
    if (random() < 0.5) {
        hp = hitDie + vitalityMod;
    } else {
        hp = Math.floor(0.9 * (hitDie + vitalityMod));
    }
    return Math.max(hp, 2);  // Minimum HP = 2
}
```

### 5.4 Vitality Modifier Table

| Vitality | HP Modifier | Per Level    |
|----------|-------------|--------------|
| 3        | -2          | -2 HP/level  |
| 4-5      | -1          | -1 HP/level  |
| 6-15     | 0           | No modifier  |
| 16       | +1          | +1 HP/level  |
| 17       | +2          | +2 HP/level  |
| 18       | +3          | +3 HP/level  |

### 5.5 Starting Spells

- New Mages/Bishops start with: **HALITO**, **KATINO**
- New Priests start with: **DIOS**, **BADIOS**
- Characters who class-change to Mage learn: **KATINO**
- Characters who class-change to Priest learn: **DIOS**

---

## 6. Hit Points on Level Up

Wizardry uses a unique HP system where maximum HP is recalculated on each level up based on ALL hit dice rolled from level 1.

### 6.1 Level Up HP Algorithm

```typescript
function calculateNewMaxHP(character: Character): number {
    let newHP = 0;
    let diceCount = character.level;

    if (character.class === 'SAMURAI') {
        diceCount += 1;  // Samurai rolls extra
    }

    for (let i = 0; i < diceCount; i++) {
        newHP += random(1, hitDie) + vitalityMod;
    }

    if (newHP > character.currentMaxHP) {
        return newHP;
    } else {
        return character.maxHP + 1;  // Always gain at least 1
    }
}
```

### 6.2 Key Points

- ALL dice are re-rolled every level (not just new dice)
- If new roll > current max HP, that becomes new max HP
- If new roll <= current max HP, gain only +1 HP
- This causes HP to trend toward statistical high values
- Samurai roll (Level + 1) dice, giving them exceptional HP

---

## 7. Attribute Effects

### 7.1 Strength Effects

| Strength | Hit Probability | Damage per Swing |
|----------|-----------------|------------------|
| 3        | -15%            | -3               |
| 4        | -10%            | -2               |
| 5        | -5%             | -1               |
| 6-15     | +0%             | +0               |
| 16       | +5%             | +1               |
| 17       | +10%            | +2               |
| 18       | +15%            | +3               |

### 7.2 Intelligence and Piety

**Spell Learning Probability:**
```
Chance to learn Mage spell: IQ / 30 (per eligible spell)
Chance to learn Priest spell: PIE / 30 (per eligible spell)

IQ 18 = 60% per eligible Mage spell
Piety 15 = 50% per eligible Priest spell
```

**The first spell of each circle is always GUARANTEED** when you gain access to that spell level—no roll required.

**Starting spells:**
- New Mages/Bishops: HALITO and KATINO
- New Priests: DIOS and BADIOS
- Class-change to Mage: learns KATINO
- Class-change to Priest: learns DIOS

**Critical class-change mechanic:** If you know at least one spell in a circle, you remain eligible to learn all other spells in that circle—even after changing to a non-casting class. A Mage who learns MALOR at level 13, then becomes a Fighter, can still learn TILTOWAIT and MAHAMAN when leveling as a Fighter.

Monster identification chance per round:
```
Chance = (IQ + PIE + Level) / 99
```

### 7.3 Agility Effects (Initiative)

Lower is better in combat (acts first):

| Agility | Initiative Mod |
|---------|----------------|
| 3       | +2 (Slower)    |
| 4-5     | +1             |
| 6-7     | +0 (Base)      |
| 8-14    | -1             |
| 15      | -2             |
| 16      | -3             |
| 17      | -4             |
| 18      | -5 (Faster)    |

Initiative formula:
```
Character: random(1,10) + AgilityMod, clamped to 1-10
Monster: random(0,7) + 2 (range: 2-9)
Lower acts first. Characters win ties vs. monsters.
```

### 7.4 Luck Effects

```
Save chance = (Level/5 + Luck/6 - ClassBonus - RaceBonus) * 5%
```

Level & Luck Bonuses:
- +5% for every 5 character levels
- +5% if Luck >= 6
- +10% if Luck >= 12
- +15% if Luck = 18
- Maximum resistance: 95%

---

## 8. Experience Points Table

| Level | Fighter  | Mage     | Priest   | Thief    | Bishop   | Samurai  | Lord     | Ninja    |
|-------|----------|----------|----------|----------|----------|----------|----------|----------|
| 1     | 1,000    | 1,100    | 1,050    | 900      | 1,200    | 1,200    | 1,300    | 1,450    |
| 2     | 1,724    | 1,896    | 1,810    | 1,551    | 2,105    | 2,105    | 2,280    | 2,543    |
| 3     | 2,972    | 3,268    | 3,120    | 2,674    | 3,677    | 3,677    | 4,000    | 4,461    |
| 4     | 5,124    | 5,634    | 5,379    | 4,610    | 6,477    | 6,477    | 7,017    | 7,826    |
| 5     | 8,834    | 9,713    | 9,274    | 7,948    | 11,363   | 11,363   | 12,310   | 13,729   |
| 6     | 15,231   | 16,746   | 15,989   | 13,703   | 19,935   | 19,935   | 21,596   | 24,085   |
| 7     | 26,260   | 28,872   | 27,567   | 23,625   | 34,973   | 34,973   | 37,887   | 42,254   |
| 8     | 45,275   | 49,779   | 47,529   | 40,732   | 61,356   | 61,356   | 66,468   | 74,129   |
| 9     | 78,060   | 85,825   | 81,946   | 70,227   | 107,642  | 107,642  | 116,610  | 130,050  |
| 10    | 134,586  | 147,974  | 141,286  | 121,081  | 188,845  | 188,845  | 204,578  | 228,157  |
| 11    | 232,044  | 255,127  | 243,596  | 208,760  | 331,307  | 331,307  | 358,908  | 400,275  |
| 12    | 400,075  | 439,874  | 419,993  | 359,931  | 581,240  | 581,240  | 629,663  | 702,236  |
| 13+   | +289,709 | +318,529 | +304,132 | +260,639 | +428,479 | +428,479 | +475,008 | +529,756 |

---

## 9. Combat Formulas

### 9.1 Hit Probability Calculation Modifier

```
For Fighter, Priest, Samurai, Lord, Ninja:
    HitCalcMod = 2 + (Level / 3)
For Mage, Thief, Bishop:
    HitCalcMod = Level / 5
Plus Strength modifier (see section 7.1)
```

### 9.2 Chance to Hit Formula

```
HitChance = (HitCalcMod + MonsterAC + (3 * VictimPosition) - 1) * 5%
Clamped to range: 5% to 95%
```

### 9.3 Swing Count Formula

```
Fighter, Samurai, Lord: (Level / 5) + 1
Ninja: (Level / 5) + 2
Others: 1
Maximum: 10 swings
```

### 9.4 Damage Formula

```
Base unarmed damage:
    All classes: 2d2
    Ninja: 2d4
Per swing: WeaponDamage + StrengthMod
Sleeping/Held targets: x2 damage
Weapon purposed vs monster type: x2 damage
```

### 9.5 Critical Hit (Ninja)

```
Chance to crit: min(Level * 2%, 50%)
Monster resist: (MonsterLevel + 10) < random(0, 34)
```

> Monsters level 24+ cannot be critically hit

### 9.6 Naked Ninja AC

```
AC = 10 - (Level / 3) - 2
```

---

## 10. Thief/Ninja Skills

### 10.1 Trap Inspection

```
Thief: min(Agility * 6%, 95%)
Ninja: min(Agility * 4%, 95%)
Others: Agility * 1%
CALFO spell: 95%
```

### 10.2 Trap Disarm

```
Thief/Ninja: (50 + Level - MazeLevel) / 70
Others: (Level - MazeLevel) / 70
```

### 10.3 Failed Inspection/Disarm

```
Chance to NOT trigger trap: random(0, 19) < Agility
```

---

## 11. Dispel Undead

### 11.1 Dispel Success Rate

```
Base: 50% + (5 * CharacterLevel) - (10 * MonsterLevel)
Bishop: Base - 20% (available at level 4+)
Lord: Base - 40% (available at level 9+)
Priest: Base (no penalty, always available)
```

---

## 12. Spell Points System

### 12.1 Spell Points Formula

Each spellcasting class has two values (A and B) that determine spell point progression:

| Class            | Value A | Value B | Spell Type |
|------------------|---------|---------|------------|
| Mage             | 0       | 2       | Mage       |
| Priest           | 0       | 2       | Priest     |
| Bishop (Mage)    | 0       | 4       | Mage       |
| Bishop (Priest)  | 3       | 4       | Priest     |
| Lord             | 3       | 2       | Priest     |
| Samurai          | 3       | 3       | Mage       |

```
SP = CharacterLevel - ValueA + ValueB - (ValueB × Circle)
Clamped to range: 0-9
```

**Example**: Level 9 Mage calculating spell points:
- Circle 1: 9 - 0 + 2 - (2×1) = **9 SP**
- Circle 5: 9 - 0 + 2 - (2×5) = **1 SP**

The formula explains why Bishops progress at half-speed (B=4 vs B=2 doubles the per-circle penalty) and why Lords outpace Samurai despite similar descriptions.

### 12.2 Known Spells Guarantee Minimum SP

The game compares formula results against spells known per circle, taking the **higher value**. A class-changed character retaining 6 known spells in Circle 5 gets at least 6 SP there, regardless of formula output. Since **spells are never forgotten**, this preserves viability after class changes.

### 12.3 Spell Level Access by Class

Pure casters (Mage and Priest) gain spell levels every two character levels:

| Spell Level | Mage/Priest | Bishop (Mage) | Bishop (Priest) | Samurai | Lord |
|------------|-------------|---------------|-----------------|---------|------|
| 1 | Level 1 | Level 1 | Level 4 | Level 4 | Level 4 |
| 2 | Level 1 | Level 5 | Level 8 | Level 7 | Level 6 |
| 3 | Level 3 | Level 9 | Level 12 | Level 10 | Level 8 |
| 4 | Level 5 | Level 13 | Level 16 | Level 13 | Level 10 |
| 5 | Level 7 | Level 17 | Level 20 | Level 16 | Level 12 |
| 6 | Level 9 | Level 21 | Level 24 | Level 19 | Level 14 |
| 7 | Level 11 | Level 25 | Level 28 | Level 22 | **Level 16** |

**Lords reach 7th-level Priest spells at level 16**—significantly faster than Samurai reach 7th-level Mage spells at level 22.

### 12.4 Complete Spell Point Progression Tables

**Mage/Priest progression (A=0, B=2):**

| Level | L1 | L2 | L3 | L4 | L5 | L6 | L7 |
|-------|----|----|----|----|----|----|-----|
| 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | 5 | 3 | 1 | 0 | 0 | 0 | 0 |
| 9 | 9 | 7 | 5 | 3 | 1 | 0 | 0 |
| 13 | 9 | 9 | 9 | 7 | 5 | 3 | 1 |
| 21+ | 9 | 9 | 9 | 9 | 9 | 9 | 9 |

**Maximum 9 SP per spell level** caps progression, reached at level 21 for pure casters.

**Lord (Priest spells, A=3, B=2):**
- Begins at level 4 with 1/0/0/0/0/0/0
- Reaches 9/9/9/9/7/5/3 by level 18+

**Samurai (Mage spells, A=3, B=3):**
- Begins at level 4 with 1/0/0/0/0/0/0
- Reaches 9/9/9/9/9/7/4 by level 25+

**Bishop:** Manages two separate progression tracks—Mage spells start immediately with slower B=4 scaling, Priest spells begin at level 4 with even slower A=3, B=4 scaling.

### 12.5 Spell Point Recovery

The **only** method to restore spell points is resting at the Adventurer's Inn:

| Room Type | Cost | HP Recovery | SP Recovery |
|-----------|------|-------------|-------------|
| Stables | Free | None | **ALL restored** |
| Paid rooms | Varies | Yes (varies by room) | None |

**Optimal strategy:** Rest at Stables (free) to restore spell points, cast healing spells, rest again—repeat until party is fully restored without spending gold.

---

## 13. Saving Throws

### 13.1 Save Categories and Usage

| Save Type | Resists                                                |
|-----------|--------------------------------------------------------|
| Death     | Poison, Paralysis, Critical hits (combat only)         |
| Petrify   | Stoning effects (combat only)                          |
| Wand      | Nothing (unused in game code)                          |
| Breath    | Breath attacks (half damage), gas traps (nullify)      |
| Spell     | Montino, anti-priest/anti-mage traps                   |

---

## 14. Class Changing

Class changes occur exclusively at the **Training Grounds** (Castle → Edge of Town → Training Grounds). The Adventurer's Inn serves different purposes (resting, spell recovery, leveling up).

> **Important**: Visiting Training Grounds with an assembled party causes automatic disbanding.

### 14.1 Training Grounds Menu Flow

1. **Training Grounds main menu**: (C)reate, (I)nspect, (R)oster, (L)eave
2. Press **(I)** to inspect a character, then type character's name + RETURN
3. Enter password if set (displays as X's for privacy)
4. **Character options submenu**: (I)nspect, (D)elete, **(C)hange Class**, (A)lter Password
5. Press **(C)** to initiate class change
6. Game displays **only classes you currently qualify for** based on stats and alignment
7. Select desired class letter, or remain in current class

### 14.2 Class Change Effects

**What Resets:**
- Level resets to 1
- Experience points reset to 0
- Attributes reset to racial base values (see Section 1.1)

**What is Preserved:**
- **HP is fully preserved** via the MaxLev hidden variable
- **All learned spells remain permanently known**
- Equipment remains in inventory (but becomes unequipped)

**Spell Point Minimums After Class Change:**
- Minimum of **1 spell point per known spell per circle** is guaranteed
- If character learned at least one spell in any circle, they remain **eligible to learn more spells in that circle forever**, even as non-casting classes
- A Fighter who was once a Level 13 Mage can learn new Level 7 spells at Fighter level-ups

**Equipment:**
- All equipment becomes unequipped but remains in inventory
- New class restrictions apply immediately
- A Priest who was a Fighter can no longer wield swords

### 14.3 The MaxLev Hidden Variable

HP preservation works through the **MaxLev** field in the character record, which tracks the highest level ever achieved:

```pascal
MAXLEV : INTEGER;  (* Highest level achieved - HP preservation key *)
```

- When class changes occur, HP remains tied to this historical maximum
- HP can **never decrease** except through level drain
- After class change, HP gains appear slow because current HP exceeds what the new class would normally have
- When level-drained: `newMaxHP = OldMaxHP × NewLevel / OldMaxLev`

**HP "Stickiness"**: Because HP recalculates each level-up and can never decrease, HP values trend toward the high end of possible values over time.

### 14.4 Age Increase on Class Change

```
Age increase = (1d3 + 3) years + 44 weeks
Equivalent: (52 × random(0,2)) + 252 weeks
Minimum: ~4.85 years (252 weeks)
Maximum: ~6.85 years (356 weeks)
```

**Age-Related Death Risk:**
- At age 50+, vitality may decline during level-ups
- If vitality reaches 2, the character dies permanently

### 14.5 Thieves Dagger (Special Item)

The **Thieves Dagger** provides a critical shortcut for creating Ninjas:

- **Bypasses ALL stat requirements** for Ninja class
- **Preserves current level, stats, and XP** - NO reset occurs
- Only requirement is Evil alignment (Thieves can be Neutral or Evil)
- Allows creating a Level 50 Thief → Ninja with full stats intact

This is the primary method for achieving the Ninja class, since the 102 total stat points required (17×6) exceeds the maximum rollable bonus points (+29).

### 14.6 Optimal Class Change Strategies

**Super-Fighter Route:**
1. Start as Evil Priest → level to 11-13 (learn MADI and full priest spells)
2. Switch to Mage → level to 13 (learn TILTOWAIT, MALOR, all mage spells)
3. Switch to Fighter (or eventually Lord/Ninja)
4. Result: Fighter with all spells, massive accumulated HP, and full combat prowess

**Optimal Timing:**
- Mage at Level 13 (for TILTOWAIT and MALOR)
- Priest at Level 11-13 (for MADI or MALIKTO)
- Fighter as high as desired for HP accumulation

**Lord Farming:**
- Requires building a Good character with STR 15, IQ 12, PIE 12, VIT 15, AGI 14, LUC 15
- Strategy: start as Mage with 17-20 bonus points, level ~13 times to gain stats through natural progression, then switch to Lord

### 14.7 No Previous Class Tracking

The game does **not** store previous class information. The character record only tracks:
- Current level (CHARLEV)
- Current class (CLASS)
- MaxLev for HP preservation
- Permanently learned spells (MAGESP/PRIESTSP arrays)

---

## 15. Attribute Changes on Level Up

When a character levels up, each of the six attributes is evaluated independently for potential modification.

### 15.1 Level Up Attribute Algorithm

```typescript
for (each attribute) {
    if (random(0, 99) < 75) {  // 75% chance to modify (25% no change)
        // Core formula: Age in Years / 130 = probability of decrease
        if (ageInYears < random(0, 129)) {
            // Young - will increase
            if (attribute < 18) {
                attribute++;
            }
        } else {
            // Old - will decrease
            if (attribute === 18) {
                if (random(0, 5) !== 0) {  // 5/6 (83.3%) resist decrease
                    // Stay at 18 - protected!
                } else {
                    attribute = 17;
                }
            } else {
                attribute--;
                if (vitality < 3) {
                    // CHARACTER_DIES ("DIED OF OLD AGE")
                }
            }
        }
    }
}
```

### 15.2 Age-Based Probability Table

The core formula `Age in Years / 130` creates a sliding scale:

| Character Age | Decrease Probability | Increase Probability | Notes |
|--------------|---------------------|---------------------|-------|
| 18 years | 13.8% | 86.2% | New characters |
| 26 years | 20% | 80% | Still favorable |
| 50 years | 38.5% | 61.5% | Starting to decline |
| 65 years | 50% | 50% | Even odds |
| 100 years | 76.9% | 23.1% | High risk |
| 130+ years | 100% | 0% | Always decrease |

### 15.3 Key Observations

- **75% chance** each attribute is evaluated (25% chance nothing happens)
- Younger characters are more likely to gain stats (~86% at age 18)
- **Attributes at 18 have 5/6 (83.3%) chance to resist decrease** - this makes maxed stats valuable
- Vitality dropping to **2 or below** causes permanent death ("DIED OF OLD AGE")
- **Stats never force class removal** - dropping below requirements won't kick you out of your current class, only prevents future class changes

---

## 16. Temple of Cant Costs

### 16.1 Resurrection Costs

| Condition  | Cost                      |
|------------|---------------------------|
| Paralyzed  | 100 * Character Level     |
| Stoned     | 200 * Character Level     |
| Dead       | 250 * Character Level     |
| Ashes      | 500 * Character Level     |

### 16.2 Temple Resurrection Success Rate

```
Dead: (50 + (3 * Vitality))%
Ashes: (40 + (3 * Vitality))%
Character ages 1-52 weeks on any temple service
```

### 16.3 DI/KADORTO Spell Success

```
Success rate: (4 * Vitality)%
On success: Target permanently loses 1 Vitality
If Vitality = 3 when spell cast: Character is LOST forever
```

---

## 17. Trap Effects Reference

| Trap Type      | Effect                                           |
|----------------|--------------------------------------------------|
| Poison Needle  | Character is Poisoned                            |
| Gas Bomb       | Each character: save vs. Poison or Poisoned      |
| Crossbow Bolt  | (MazeLevel)d8 damage to opener                   |
| Exploding Box  | Each character: 50% chance of (MazeLevel)d8      |
| Splinters      | Each character: 70% chance of (MazeLevel)d6      |
| Blades         | Each character: 30% chance of (MazeLevel)d12     |
| Stunner        | Opener is Paralyzed                              |
| Teleporter     | Party teleports to random location on same level |
| Anti-Mage      | Mages/Samurai: Paralyzed (Stoned if already)     |
| Anti-Priest    | Priests/Bishops: Paralyzed (Stoned if already)   |
| Alarm          | Immediate new encounter                          |

---

## 18. Aging Mechanics

### 18.1 What Causes Aging

Despite manual claims, **resting at the Inn does NOT age characters**. Age only increases through:

| Action | Age Increase |
|--------|--------------|
| Class Change | 4-7 years ((1d3+3) years + 44 weeks) |
| Disbanding Party | 25 weeks |
| Temple of Cant Services | 1-52 weeks (random) |

### 18.2 Age Effects

- At age 50+, vitality may decline during level-ups
- If vitality drops to 2, character dies permanently ("DIED OF OLD AGE")
- Younger characters have higher chance to gain stats on level-up (~86% at age 18)

---

## 19. Character Record Structure

Based on Thomas William Ewers' reverse-engineered Pascal source code:

```pascal
TYPE
  TCHARACTER = RECORD
    NAME         : STRING[15];    (* Character name, 1-15 chars *)
    PASSWORD     : STRING[8];     (* Optional password *)
    CHARLEV      : INTEGER;       (* Current level *)
    CLASS        : INTEGER;       (* 0=Fighter, 1=Mage, 2=Priest, 3=Thief,
                                     4=Bishop, 5=Samurai, 6=Lord, 7=Ninja *)
    RACE         : INTEGER;       (* 0=Human, 1=Elf, 2=Dwarf, 3=Gnome, 4=Hobbit *)
    ALIGNMENT    : INTEGER;       (* 0=Good, 1=Neutral, 2=Evil *)
    MAXLEV       : INTEGER;       (* Highest level achieved - HP key *)
    CURHP        : INTEGER;       (* Current hit points *)
    MAXHP        : INTEGER;       (* Maximum hit points *)
    STR, IQ, PIE : INTEGER;       (* Attributes *)
    VIT, AGI, LUC: INTEGER;
    GOLD         : LONGINT;       (* Gold pieces *)
    EXP          : LONGINT;       (* Experience points *)
    AGE          : INTEGER;       (* Age in weeks *)
    STATUS       : INTEGER;       (* OK, AFRAID, ASLEEP, etc. *)
    MAGESP       : ARRAY[1..7] OF INTEGER;   (* Mage spell points per circle *)
    PRIESTSP     : ARRAY[1..7] OF INTEGER;   (* Priest spell points per circle *)
    LUCKSKIL     : ARRAY[1..5] OF INTEGER;   (* Saving throws *)
    INVENTORY    : ARRAY[1..8] OF INTEGER;   (* Equipment slots *)
    (* ... additional fields ... *)
  END;
```

**Key Design Notes:**
- No "previous class" field - game doesn't track class history
- MaxLev enables HP preservation across class changes
- Spell points stored per circle, not per spell
- Character data stored in SCENARIO.DATA using UCSD Pascal's GETREC/PUTREC

---

## 20. Known Bugs and Quirks

### 20.1 LostXYL Poison Cure Bug

The X coordinate field is repurposed during expeditions to store poison value. Disbanding the party resets coordinates, **inadvertently curing poison**.

### 20.2 Haman/Mahaman Bug

Due to a precedence error in the code:
```
RANDOM (MOD 3) * MAHAMFLG   // What was written
RANDOM MOD (3 * MAHAMFLG)   // What was intended
```

Two spell effects—"Shields Party" (AC=-10) and "Resurrects and Heals Party"—**never trigger**. Only 3 of 5 intended effects work.

### 20.3 Save vs. Wand is Unused

The LUCKSKIL[2] saving throw (Save vs. Wand) is **never referenced anywhere in code**. Elves receive a -2 bonus to this stat for no benefit.

### 20.4 Bishop Identify Exploit

Typing an item number not on the list during Bishop identification grants **massive XP** (up to 100,000,000). PC developers intentionally preserved this bug "to be fair."

### 20.5 NES Version AC Bug

A critical implementation error in the NES version means armor class modifiers are **not used in combat calculations**—characters are effectively unarmored regardless of equipment. The NES version also has different dungeon layouts for floors 6-8 and is a complete rewrite rather than a port.

---

## 21. Implementation Notes

### 21.1 Random Number Generation

- `random(0, N)` = inclusive range from 0 to N
- `random(1, N)` = inclusive range from 1 to N (for dice rolls)
- All division uses integer division (floor/truncate toward zero)

### 21.2 Status Priority

From best to worst:
```
OK -> AFRAID -> ASLEEP -> PLYZE -> STONED -> DEAD -> ASHES -> LOST
```

A character can only have one status. If inflicted with a new status, the **worse** status is kept. Poison is tracked separately.

### 21.3 Character Name Length

1 to 15 characters.

### 21.4 Class ID Values

```
0 = Fighter
1 = Mage
2 = Priest
3 = Thief
4 = Bishop
5 = Samurai
6 = Lord
7 = Ninja
```

---

## Sources

- Thomas William Ewers' reverse-engineered Pascal source code (2012-2014)
- Snafaru's Wizardry #1-2-3 Game Code Calculations (zimlab.com)
- Data Driven Gamer's mechanics analysis (datadrivengamer.blogspot.com)
- Community discussions and verification (Steam, GOG forums)
