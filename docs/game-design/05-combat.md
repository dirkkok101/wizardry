# Combat

**Turn-based tactical combat mechanics.**

## Combat Basics

### When Combat Starts

**Random Encounters**: While exploring the dungeon
**Encounter Rate**: Varies by dungeon level (deeper = more frequent)
**No Escape**: Once combat begins, you must fight or flee

### Combat Phases

**1. Input Phase**: Choose actions for each character
**2. Initiative Phase**: Determine action order
**3. Resolution Phase**: Execute actions in initiative order
**4. Repeat**: Until combat ends

## Actions

### Attack
**Effect**: Physical melee attack with equipped weapon
**Damage**: Weapon dice + STR modifier
**Range**: Front row only (back row cannot melee attack)
**Success**: Based on hit chance formula

### Cast Spell
**Effect**: Cast a spell from spell book
**Cost**: 1 spell point from spell's level
**Target**: Varies by spell (single enemy, group, all groups, ally, party)
**Range**: Both rows can cast spells

### Defend
**Effect**: Defensive stance, improves AC temporarily
**Benefit**: Harder for enemies to hit
**Duration**: Current round only

### Parry
**Effect**: Attempt to block incoming attack
**Success**: AGI-based chance
**Benefit**: Negate damage from one attack

### Use Item
**Effect**: Use consumable item (potion, scroll)
**Items**: Healing potions, spell scrolls, buff items
**Limit**: One item per round

### Flee
**Effect**: Attempt to run from combat
**Success**: AGI-based, higher level enemies harder to flee
**Failure**: Lose your turn, combat continues
**Risk**: Back row turns around, vulnerable to attack

## Initiative

### Initiative Roll
```
Initiative = random(0-9) + AGI modifier
Minimum = 1
```

### AGI Modifiers

| AGI | Modifier | Initiative Range |
|-----|----------|------------------|
| 3 | -2 | 1 (min) |
| 4-5 | -1 | 1-9 |
| 6-8 | 0 | 1-10 |
| 9-11 | +1 | 2-11 |
| 12-14 | +2 | 3-12 |
| 15-17 | +3 | 4-13 |
| 18+ | +4 | 5-14 |

**Fastest goes first**: Higher initiative = acts earlier in round

**Strategy**: High AGI characters (Thieves, Ninjas) often act first

## Hit Chance

### Formula
```
Hit Chance % = (HPCALCMD + Monster AC + 29) × 5%
Maximum = 95% (always 5% miss chance)
```

### HPCALCMD by Class

**Fighter, Priest, Samurai, Lord**:
```
HPCALCMD = 2 + floor(Level / 3)
```

**Mage, Thief, Bishop, Ninja**:
```
HPCALCMD = floor(Level / 5)
```

### STR Hit Bonus

| STR | To-Hit Modifier |
|-----|-----------------|
| 3 | -15% |
| 4 | -10% |
| 5 | -5% |
| 6-15 | 0% |
| 16 | +5% |
| 17 | +10% |
| 18+ | +15% |

**Example**: Level 5 Fighter (HPCALCMD 3) vs AC 5 monster
- Base: (3 + 5 + 29) × 5% = 185% → capped at 95%
- High chance to hit

**Example**: Level 5 Fighter vs AC -5 monster (tough)
- Base: (3 + (-5) + 29) × 5% = 135% → capped at 95%
- Still high chance (negative AC makes it harder)

## Damage

### Weapon Damage
```
Damage = Weapon Dice + STR modifier
```

### STR Damage Bonus

| STR | Damage Modifier |
|-----|-----------------|
| 3 | -3 |
| 4 | -2 |
| 5 | -1 |
| 6-15 | 0 |
| 16 | +1 |
| 17 | +2 |
| 18+ | +3 |

**Example Weapons**:
- Dagger: 1d4 + STR (1-4 base)
- Long Sword: 1d8 + STR (1-8 base)
- Murasama Blade: 10d50 + STR (10-50 base, Samurai only)

### Critical Hits

**Critical Chance**: (2 × Level)%, max 50%
**Effect**: Extra damage (formula varies by implementation)

**Examples**:
- Level 1: 2% critical
- Level 10: 20% critical
- Level 25+: 50% critical (max)

### Decapitation (Instant Kill)

**Available To**: Ninjas only (and some monsters)
**Trigger**: On critical hit
**Effect**: Instant death regardless of HP
**Strategy**: High-level Ninjas extremely dangerous

## Attacks Per Round

### By Class

**Fighter, Samurai, Lord**:
```
Attacks = 1 + floor(Level / 5), max 10
```

**Ninja**:
```
Attacks = 2 + floor(Level / 5), max 10
```

**Others** (Mage, Priest, Thief, Bishop):
```
Attacks = 1 (always)
```

### Examples

| Level | Fighter | Ninja | Mage |
|-------|---------|-------|------|
| 1 | 1 | 2 | 1 |
| 5 | 2 | 3 | 1 |
| 10 | 3 | 4 | 1 |
| 25 | 6 | 7 | 1 |
| 45+ | 10 (max) | 10 (max) | 1 |

**Strategy**: High-level warriors become killing machines

## Armor Class (AC)

### How AC Works

**Lower AC = Better Defense** (D&D 1st edition style)

**Range**: 10 (worst) to -10 (best)

**Sources**:
- Armor (Plate Mail +2 = AC 7)
- Shield (Shield +3 = AC 6)
- Helmet (Helm +2 = AC 3)
- Gauntlets (Silver Gloves = AC 3)
- Spells (PORFIC = -4 AC, BAMATU = -4 AC)
- Ninja unarmored bonus

**Stacking**: All AC bonuses stack

**Example**: Character with:
- Plate Mail +2 (AC 7)
- Shield +3 (AC 6)
- Helm +2 (AC 3)
- PORFIC spell (-4 AC)
- BAMATU spell (-4 AC)
- **Total AC**: 7 + 6 + 3 - 4 - 4 = AC -2 (excellent defense)

## Enemy Groups

### Multiple Groups

Encounters can have **multiple enemy groups** (1-4 groups)

**Example**: 3 groups of Orcs + 1 group of Kobolds

### Targeting

**Spells**: Some hit one group, some hit all groups
- HALITO: Single group
- TILTOWAIT: All groups

**Melee**: Can only attack front-most enemy group

**Strategy**: Use group-targeting spells to hit multiple groups efficiently

## Special Combat Mechanics

### Status Effects

**Sleep** (KATINO spell):
- Affected enemies cannot act
- Easy to hit while sleeping
- Damage may wake them

**Paralyze** (MORLIS spell, some monsters):
- Cannot act
- Stays paralyzed until combat ends or cured

**Blind** (DILTO spell):
- Reduced hit chance
- Less effective in combat

**Silence** (MANIFO, MONTINO spells):
- Cannot cast spells
- Critical vs enemy spellcasters

**Poison**:
- Takes damage each round
- Continues after combat
- Can be cured

**Petrify**:
- Turned to stone
- Effectively dead
- Can be cured at temple

### Level Drain

**Effect**: Permanently lose character levels
**Sources**: Vampires, Lifestealer, some high-level undead
**Drain Amount**: 1-4 levels depending on monster
**Recovery**: Only by gaining XP to level up again (slow)

**Strategy**: Avoid level-draining enemies when possible, very dangerous

### Regeneration

**Effect**: Restore HP each round
**Sources**:
- Ring of Healing (player item, +1/round)
- Lords Garb (player armor, +1/round)
- Some monsters (Trolls +3/round, Werdna +5/round)

**Strategy**: Regenerating enemies must be killed quickly or they outlast you

## Combat Strategy

### Formation Matters

**Front Row**:
- Takes most melee hits
- Can melee attack
- Needs high HP + AC

**Back Row**:
- Mostly safe from melee
- Cannot melee attack
- Perfect for spellcasters

**If Front Row Dies**: Back row becomes vulnerable

### Spell Priority

**Early Rounds**:
1. Crowd control (KATINO sleep, MORLIS paralyze)
2. Defense buffs (BAMATU, PORFIC)
3. Offensive spells (MAHALITO, LAHALITO)

**Mid Combat**:
1. Healing (DIOS, DIAL)
2. Continue damage
3. Silence enemy casters (MANIFO)

**Boss Fights**:
1. All buffs active
2. Maximum damage spells (TILTOWAIT)
3. Emergency healing ready

### Healing During Combat

**DIOS** (1d8): Early combat, small damage
**DIAL** (2d8 or full HP): Mid/late combat, serious damage

**Strategy**: Heal before character HP reaches 0 (dead)

### Fleeing

**When to Flee**:
- Party severely damaged
- No spell points left
- Encounter too difficult
- Front row dead/paralyzed

**Flee Success**: Based on AGI and enemy level
**Risk**: Turns back row around (vulnerable)

### Monster Identification

**Automatic**: Each round, chance to identify enemy
**Formula**: (INT + PIE + Level) / 99 per round

**Why Identify**:
- See enemy HP
- See enemy abilities
- Plan tactics accordingly

**High INT/PIE characters**: Identify quickly

## Combat Rewards

### Experience Points (XP)

**Earned**: Upon defeating all enemy groups
**Shared**: Split among all living party members
**Scaling**: Harder enemies = more XP

### Gold

**Earned**: Upon victory
**Shared**: All gold goes to party pool
**Scaling**: Harder enemies = more gold

### Items

**Sometimes**: Enemies drop equipment
**Quality**: Varies (can be cursed!)
**Strategy**: Identify before using

## Death in Combat

**When HP Reaches 0**: Character dies

**Consequences**:
1. Character becomes inactive
2. Body remains on battlefield
3. If entire party dies → GAME OVER
4. If party wins → can retrieve body to town
5. Must resurrect at temple (costs gold)

**See**: [Death & Recovery](./09-death-recovery.md) for full details

## Related

- [Spells](./04-spells.md) - All spells for combat
- [Party Formation](./03-party-formation.md) - Formation tactics
- [Items & Equipment](./11-items-equipment.md) - Weapons and armor
- [Monsters](./10-monsters.md) - Enemy reference
- [Combat Formulas](../research/combat-formulas.md) - Detailed math
