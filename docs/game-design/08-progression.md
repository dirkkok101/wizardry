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

**Formula**: Varies by class
- Fighter/Thief: Fast progression
- Mage/Priest: Medium progression
- Elite classes: Slower progression

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

**HP Increase**:
- Roll hit die (varies by class)
- Add VIT modifier
- Add to max HP

**Stat Changes** (75% chance per stat):
```
For each stat:
  75% chance to roll for change
    If roll ≤ (130 - Age): Stat +1
    Else: Stat -1
```

**Age Impact**:

| Age | Increase Chance | Decrease Chance |
|-----|-----------------|-----------------|
| 15 | 95% (capped) | 5% (min) |
| 30 | 100% | 0% |
| 50 | 80% | 20% |
| 70 | 60% | 40% |
| 90+ | <40% | >60% |

**Younger = Better Growth**

**Spell Learning**:
- Attempt to learn new spells at current level
- Learn chance: (INT or PIE) / 30 per spell
- Success: Spell added to spell book
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
3. Select new class
4. Pay fee (5,000+ gold)
5. Class changes

**Results**:
- **Level resets to 1**
- **All stats kept**
- **Some spells retained**
- HP resets to level 1 values
- New class abilities apply

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

### Learning New Spells

**Spell Access by Level**:

| Character Level | Spell Levels Accessible |
|-----------------|-------------------------|
| 1-2 | 1 |
| 3-4 | 1-2 |
| 5-6 | 1-3 |
| 7-8 | 1-4 |
| 9-10 | 1-5 |
| 11-12 | 1-6 |
| 13+ | 1-7 |

**Learn Attempts**: Each level-up, roll for each unlearned spell

**Retry**: Can attempt again on next level-up if failed

**Bishop Penalty**: Bishops learn slower (both spell types but reduced chance)

### Spell Point Growth

**More Spells Learned**: Larger spell point pools

**Higher Level**: More spell points per level

**Example** (Level 10 Mage):
- Level 1: 5 points (many spells learned)
- Level 2: 4 points
- Level 3: 4 points
- Level 4: 3 points
- Level 5: 2 points

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

**Inn Rest**: All characters age each rest
**Amount**: Small random amount (days/weeks)
**Cumulative**: Age increases throughout game

**Cannot Reverse**: Age only increases (no youth potions)

### Age Effects

**Young (14-30)**:
- Excellent stat growth
- 95-100% chance to increase stats
- Minimal decrease risk

**Middle Age (31-50)**:
- Good stat growth
- 80-90% increase chance
- 10-20% decrease risk

**Old (51-70)**:
- Risky stat growth
- 60-70% increase chance
- 30-40% decrease risk

**Ancient (71+)**:
- Very risky
- <60% increase chance
- >40% decrease risk
- May die of old age

### Managing Age

**Trade-off**: Resting restores HP/spells but ages characters

**Strategies**:
1. **Rest Frequently Early**: Build stats while young
2. **Limit Resting Late**: Preserve age when stats might decrease
3. **Camp in Dungeon**: Alternative to inn (still ages but less frequent)

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
