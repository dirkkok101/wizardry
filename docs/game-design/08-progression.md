# Progression

**Character advancement through leveling and class changing.**

## Experience Points (XP)

### Gaining XP

**Combat Victories**: Defeating monsters grants XP
**Amount**: Based on monster difficulty
- Weak enemies (Kobolds): ~50-200 XP
- Mid-tier (Dragons): ~1,000-3,000 XP
- Bosses (Werdna): ~15,000+ XP

**Distribution**: XP split equally among living party members

**Death Penalty**: Dead characters don't receive XP

### XP to Level

**Requirements**: XP needed increases exponentially per level
- Level 1 → 2: ~1,000 XP
- Level 2 → 3: ~2,500 XP
- Level 5 → 6: ~10,000 XP
- Level 10 → 11: ~50,000 XP

**Formula**: `1000 × level^1.5 × class_multiplier`

**XP Requirements by Class (Level 2)**:

| Class | Multiplier | XP for Level 2 | Leveling Speed |
|-------|------------|----------------|----------------|
| Fighter | 0.8 | 2,262 | Fastest |
| Thief | 0.9 | 2,545 | Fast |
| Priest | 1.0 | 2,828 | Medium |
| Samurai | 1.1 | 3,111 | Slow |
| Lord | 1.1 | 3,111 | Slow |
| Mage | 1.2 | 3,394 | Slower |
| Ninja | 1.2 | 3,394 | Slower |
| Bishop | 1.3 | 3,676 | Slowest |

**Example XP Progression (Fighter vs Mage)**:

| Level | Fighter XP | Mage XP | Difference |
|-------|------------|---------|------------|
| 2 | 2,262 | 3,394 | +50% |
| 3 | 4,156 | 6,235 | +50% |
| 5 | 8,944 | 13,416 | +50% |
| 10 | 25,298 | 37,947 | +50% |

**Note**: Bishops level slowest but gain both mage AND priest spells.

## Leveling Up

### At Training Grounds

**Requirements**:
1. Character has enough XP for next level
2. Pay training fee (gold)

**Process**:
1. Go to Training Grounds
2. Select character
3. Choose "Level Up"
4. Pay fee
5. Level up occurs

**Immediate**: Level up immediately, don't delay (XP overflow wasted)

### Level-Up Changes

**HP Calculation** (reroll entire pool, keep better):
1. Roll **Level × Class Hit Die** (e.g., Level 8 Fighter rolls 8d10)
2. Add **Vitality Modifier × Level** to total
3. If new total > current max HP: max HP becomes new value
4. If new total ≤ current max HP: gain only **+1 HP** (consolation prize)

**Vitality Modifiers**:

| Vitality | Per-Die Modifier |
|----------|-----------------|
| 3 | -2 |
| 4-5 | -1 |
| 6-15 | 0 |
| 16 | +1 |
| 17 | +2 |
| 18 | **+3** |

**Hit Dice by Class**:

| Class | Hit Die | Special |
|-------|---------|---------|
| Fighter | d10 | — |
| Lord | d10 | — |
| Priest | d8 | — |
| Samurai | d8 | Rolls **Level+1 dice** (bonus) |
| Thief | d6 | — |
| Bishop | d6 | — |
| Ninja | d6 | — |
| Mage | d4 | Lowest survivability |

**Stat Changes** (75% chance per stat):
```
For each stat:
  75% chance to evaluate for change
    If change occurs:
      Decrease probability = Age in Years / 130
      Increase probability = 1 - (Age / 130)
```

**Stats at 18 have special protection**: If selected for decrease, 5/6 (83.3%) chance to resist.

**Age Impact on Stat Changes**:

| Character Age | Decrease Probability | Increase Probability |
|--------------|---------------------|---------------------|
| 18 years | 13.8% | 86.2% |
| 26 years | 20% | 80% |
| 50 years | 38.5% | 61.5% |
| 65 years | 50% | 50% |
| 130+ years | 100% | 0% |

**Younger = Better Growth**. If Vitality drops to 2, character dies permanently ("old age death").

**Spell Learning**:
- Learn probability: **Relevant Stat / 30** per eligible spell
  - IQ 18 = 60% per Mage spell
  - PIE 15 = 50% per Priest spell
- **First spell of each circle is guaranteed** when you gain access to that spell level
- **Starting spells**:
  - Mages/Bishops: HALITO and KATINO
  - Priests: DIOS and BADIOS
- Failure: Can retry on next level-up

**Spell Point Pools**:
- Recalculate for all spell levels
- Increase based on spells learned and level

**Attacks Per Round** (Fighter/Samurai/Lord/Ninja):
- Increases at levels 5, 10, 15, etc.
- Max 10 attacks per round

## Class Changing

### Requirements

**Meet New Class Requirements**:
- STR, INT, PIE, VIT, AGI, LUC minimums
- Alignment restrictions
- Pay gold fee (expensive)

**Example**: Mage → Samurai
- Mage starting with STR 7 → must gain STR to 15
- Must gain VIT to 14, AGI to 10, PIE to 10
- Takes many level-ups to build stats

### Class Change Process

**At Training Grounds**:
1. Select character
2. Choose "Change Class"
3. Game displays **only classes you currently qualify for** based on stats and alignment
4. Select new class
5. Class changes

**Results**:
- **Level resets to 1, XP resets to 0**
- **Stats reset to RACIAL MINIMUMS** (not kept!)
- **All learned spells PERMANENTLY RETAINED** (major benefit)
- **HP is FULLY PRESERVED** via MaxLev tracking (major benefit)
- **Equipment unequipped** but remains in inventory
- New class restrictions apply immediately

**MaxLev System**: The game tracks your highest level ever achieved. HP is calculated against MaxLev, not current level. A Level 13 Fighter who becomes a Mage keeps their massive HP pool. HP can never decrease except through level drain.

**Spell Point Guarantee**: If you know at least one spell in a circle, you get **minimum 1 SP per known spell** in that circle, regardless of formula output.

**Critical Mechanic**: If you learned any spell in a circle, you remain eligible to learn MORE spells in that circle forever—even as non-casting classes. A Fighter who was once a Level 13 Mage can still learn new Level 7 spells when leveling as Fighter!

**Aging Penalty**: Each class change adds **1d3+3 years plus 44 weeks** (~5-7 years total). At age 50+, stat decreases become more likely.

### Class Change Strategy

**Why Change Class?**
1. **Build Ultimate Character**: Multi-class for mixed abilities
2. **Access Elite Classes**: Level basic class, gain stats, change to elite
3. **Spell Stacking**: Keep some old spells + learn new ones

**Common Paths**:
1. **Mage → Samurai**: Learn all mage spells, then become fighter-mage hybrid
2. **Priest → Lord**: Learn priest spells, then become fighter-priest hybrid
3. **Fighter → Lord/Samurai**: Build stats, then add magic
4. **Any → Ninja**: Max all stats through aging/items, then ultimate assassin

**Drawbacks**:
- Reset to level 1 (weak temporarily)
- Must level up again (time investment)
- Expensive (gold cost)

### Multi-Classing

**Unlimited**: Can change class multiple times

**Example Path**:
1. Start as Mage (learn all 7 levels of mage spells)
2. Change to Priest (learn all 7 levels of priest spells)
3. Change to Fighter (keep some spells, gain fighter abilities)
4. Change to Lord (gain lord abilities, keep accumulated spells)
5. Change to Ninja (ultimate character with spells + ninja abilities)

**Time Investment**: Hundreds of hours

## Stat Progression

### Stat Increases

**On Level-Up**: Stats can increase or decrease

**Stat Caps**: Usually 18, but can exceed with bonuses

**Methods to Increase**:
1. **Level-up rolls**: Random, age-dependent
2. **Equipment bonuses**: Temporary while equipped
3. **Spell effects**: Temporary buffs

### Optimizing Stat Growth

**Stay Young**:
- Rest at inn ages characters
- Younger = better stat increases
- Balance resting vs. aging

**Early Levels**:
- Level up frequently
- Stats grow faster when young

**Late Levels**:
- Stat growth slows
- Risk of stat decreases at old age

## Spell Progression

### Spell Level Access by Class

**Mage/Priest (Pure Casters):**

| Spell Level | Character Level |
|-------------|-----------------|
| 1 | 1 |
| 2 | 1 |
| 3 | 3 |
| 4 | 5 |
| 5 | 7 |
| 6 | 9 |
| 7 | 11 |

**Hybrid Classes:**

| Spell Level | Bishop (Mage) | Bishop (Priest) | Samurai | Lord |
|-------------|---------------|-----------------|---------|------|
| 1 | 1 | 4 | 4 | 4 |
| 2 | 5 | 8 | 7 | 6 |
| 3 | 9 | 12 | 10 | 8 |
| 4 | 13 | 16 | 13 | 10 |
| 5 | 17 | 20 | 16 | 12 |
| 6 | 21 | 24 | 19 | 14 |
| 7 | 25 | 28 | 22 | **16** |

**Lords reach 7th-level spells at 16**—faster than Samurai at 22.

### Spell Point Formula

**Formula**: `SP = Character Level – A + B – (B × Spell Circle)` (clamped 0-9)

**Constants by Class:**

| Class | A | B | Spell Type |
|-------|---|---|------------|
| Mage | 0 | 2 | Mage |
| Priest | 0 | 2 | Priest |
| Bishop | 0 | 4 | Mage |
| Bishop | 3 | 4 | Priest |
| Lord | 3 | 2 | Priest |
| Samurai | 3 | 3 | Mage |

**Example: Level 9 Mage**
- Circle 1: 9 - 0 + 2 - (2×1) = **9 SP**
- Circle 5: 9 - 0 + 2 - (2×5) = **1 SP**

**Mage/Priest Spell Point Progression:**

| Level | L1 | L2 | L3 | L4 | L5 | L6 | L7 |
|-------|----|----|----|----|----|----|-----|
| 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 5 | 5 | 3 | 1 | 0 | 0 | 0 | 0 |
| 9 | 9 | 7 | 5 | 3 | 1 | 0 | 0 |
| 13 | 9 | 9 | 9 | 7 | 5 | 3 | 1 |
| 21+ | 9 | 9 | 9 | 9 | 9 | 9 | 9 |

**Maximum 9 SP per spell level**, reached at level 21 for pure casters.

**Spell Point Guarantee**: Known spells guarantee minimum SP. If you know 6 spells in Circle 5, you get at least 6 SP there regardless of formula.

**Restoration**: Spell points restore **only at the Inn**:
- **Stables (free)**: Restores SP only, no HP recovery
- **Paid rooms**: Restore both HP and SP

## Combat Progression

### Attacks Per Round

**Fighter/Samurai/Lord**:
```
Level 1-4: 1 attack
Level 5-9: 2 attacks
Level 10-14: 3 attacks
Level 15-19: 4 attacks
...
Level 45+: 10 attacks (max)
```

**Ninja**:
```
Level 1-4: 2 attacks
Level 5-9: 3 attacks
Level 10-14: 4 attacks
...
Level 40+: 10 attacks (max)
```

**Others**: Always 1 attack

### Hit Chance Progression

**Formula**: HPCALCMD increases with level
- Fighter/Priest/Samurai/Lord: 2 + floor(Level/3)
- Others: floor(Level/5)

**Higher Level**: Easier to hit enemies

### Critical Hit Chance

**Formula**: (2 × Level)%, max 50%
- Level 1: 2%
- Level 10: 20%
- Level 25+: 50% (max)

**Decapitation**: Ninjas can instant-kill on critical

## Aging

### How Characters Age

**Age increases from specific activities, NOT from time or leveling:**

| Activity | Age Increase |
|----------|-------------|
| Class change | **1d3+3 years + 44 weeks** (~5-7 years) |
| Temple services | 1-52 weeks per visit |
| Disbanding party | 25 weeks per character |
| Inn resting | **0** (Apple II bug—manual says otherwise) |

**Starting Age**: 18 years + 0-299 random weeks (so 18-23+ years)

**Cannot Reverse**: Age only increases (no youth potions)

### Age Effects

**Young (18-30)**:
- Excellent stat growth
- ~80-86% chance to increase stats
- ~14-20% decrease risk

**Middle Age (31-50)**:
- Good stat growth
- ~60-76% increase chance
- ~24-40% decrease risk

**Old (51-70)**:
- Risky stat growth
- ~46-60% increase chance
- ~40-54% decrease risk

**Ancient (71+)**:
- Very risky
- <46% increase chance
- >54% decrease risk

**Death Threshold**: If Vitality drops to **2 or below**, the character dies permanently with "YOU HAVE DIED OF OLD AGE."

### Managing Age

**Key Insight**: Inn resting is FREE due to Apple II bug. Main aging sources are class changes and Temple visits.

**Strategies**:
1. **Minimize class changes**: Each costs 5-7 years
2. **Use DI/KADORTO spells** instead of Temple for resurrection (costs VIT, not age)
3. **Level quickly while young**: Best stat growth in early years
4. **Build high Vitality**: Protects against old age death

## Power Curves

### Early Game (Levels 1-5)

**Weak**: Few HP, limited spells, low damage
**Strategy**: Careful exploration, frequent retreats
**Focus**: Survival, basic equipment

### Mid Game (Levels 6-10)

**Competent**: Decent HP, good spells, multiple attacks
**Strategy**: Explore deeper levels, tackle harder enemies
**Focus**: Efficiency, upgraded equipment

### Late Game (Levels 11-15)

**Powerful**: High HP, strong spells, many attacks
**Strategy**: Boss fights, endgame content
**Focus**: Optimization, legendary equipment

### Endgame (Levels 16+)

**Godlike**: Maximum HP, all spells, 6-10 attacks
**Strategy**: Werdna, hardest enemies
**Focus**: Perfect builds, ultimate equipment

## Progression Tips

1. **Level Up ASAP**: Don't delay when XP available
2. **Learn Spells Early**: More attempts = more spells
3. **Stay Young**: Level up while young for best stat growth
4. **Plan Class Changes**: Build stats for target class
5. **Balance Party Levels**: Don't leave members behind
6. **Multi-Class Late**: After learning all desired spells
7. **Save Gold**: Training fees increase with level

## Related

- [Character Creation](./02-character-creation.md) - Starting stats and classes
- [Town](./07-town.md) - Training Grounds for leveling
- [Spells](./04-spells.md) - Spell learning
- [Combat](./05-combat.md) - Combat scaling with level
- [Combat Formulas](../research/combat-formulas.md) - Exact progression formulas
