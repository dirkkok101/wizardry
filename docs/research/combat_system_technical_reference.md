# Wizardry Combat System: Complete Technical Implementation Guide (Validated & Corrected)

The 1981 Apple II original of Wizardry: Proving Grounds of the Mad Overlord uses a **simultaneous declaration, sequential resolution** combat model with descending AC and percentile-based mechanics. This documentation derives from Thomas William Ewers' reverse-engineered Pascal source code (2012-2014), cross-validated against Snafaru's Zimlab documentation and Data Driven Gamer's analysis.

---

## VALIDATION SUMMARY - CORRECTIONS FROM ORIGINAL DOCUMENT

| Item | Original Claim | Corrected Value | Source |
|------|----------------|-----------------|--------|
| Agility Initiative Table | Values inverted | Fixed to match source (higher AGI = negative mod = faster) | Data Driven Gamer |
| Monster Initiative | Range unclear | RANDOM(0-7)+2, produces 2-9 | Zimlab |
| Character PARALYZE Recovery | Level × 7% | **Characters have NO natural PARALYZE recovery in combat** | Code analysis |
| Manifo Effect | Inflicts PARALYZE | Inflicts ASLEEP status (documented bug) | Data Driven Gamer |
| Hide Action | Listed as exists | Does NOT exist in Wiz1 (introduced Wiz5) | Multiple sources |
| Breath Damage Stacking | Either/or 50% | **Multiplicative**: resistance AND save = ~25% damage | Data Driven Gamer |
| Breath Damage Rounding | Unclear | Base damage rounds DOWN, half damage rounds UP | Data Driven Gamer (comments) |
| Naked Ninja AC | 10 - (Level/3) - 2 | 8 - (Level/3) per Data Driven Gamer | Data Driven Gamer |
| TILTOWAIT Damage | 10d10 (manual says) | **10d15** per actual code | Zimlab |
| Unarmed Ninja Damage | 1d4+1d4 | **2d4** (same result, clearer notation) | Zimlab |
| Stone Breath Effect | Petrifies | Does NOT petrify, just element type for protection | Data Driven Gamer |
| Drain Breath Effect | Level drains | Does NOT drain, just element type for protection | Data Driven Gamer |
| Magic Protection | Blocks all spells | Only blocks if YOU are the random target | Data Driven Gamer |
| Physical Protection | Blocks physical damage | Actually blocks paralysis and critical hits | Data Driven Gamer |

---

## 1. Combat Round Structure

Each combat round proceeds through distinct phases:

### Phase 1: Input Collection
All player actions are collected before any execute. The "B" key allows retaking orders. Monster AI simultaneously determines actions (hidden from player).

### Phase 2: Initiative & Resolution
Initiative is rolled for all participants; actions execute sequentially from **lowest initiative to highest** (lower = faster).

### Phase 3: End of Round
Status recovery checks, poison damage, and regeneration effects are processed.

---

## 2. Initiative System

### Character Initiative
Each round, each character has an initiative roll of 1d10. Initiative is further modified by agility.

| Agility | Initiative Modifier |
|---------|---------------------|
| 3 | +2 (slower) |
| 4-5 | +1 |
| 6-7 | 0 |
| 8-14 | -1 |
| 15 | -2 |
| 16 | -3 |
| 17 | -4 |
| 18 | -5 (faster) |

The modified result is clipped to the 1-10 range.

**Source:** Data Driven Gamer - "Each round, each character has an initiative roll of 1d10. Initiative is further modified by agility."

### Monster Initiative
Monsters' initiatives are each set to **1d8+1**. This produces values from 2-9.

Everyone acts in order of initiative, from lowest to highest.

**On equality, characters go before monsters.**

### Target Death Handling
If a target monster dies before your queued attack resolves, **the attack is wasted** with no automatic retargeting. Spells targeting groups continue to affect remaining members.

---

## 3. Player Attack Action

### Hit Probability Base Calculation
Fighter, Priest, Samurai, Lord, Ninja have a naturally higher hit probability than other classes.

**Source code (Zimlab):**
```
IF (CLASS = PRIEST) OR (CLASS = FIGHTER) OR (CLASS >= SAMURAI) THEN
    HPCALCMD := 2 + CHARLEV DIV 3
ELSE
    HPCALCMD := CHARLEV DIV 5
```

### Strength Modifiers
Your characters' Strength has an effect on the hit chance probability and damage per swing:

| Strength | Hit Modifier | Damage Modifier |
|----------|--------------|-----------------|
| 3 | -15% | -3 |
| 4 | -10% | -2 |
| 5 | -5% | -1 |
| 6-15 | 0 | 0 |
| 16 | +5% | +1 |
| 17 | +10% | +2 |
| 18 | +15% | +3 |

**Source:** Zimlab - "So, for example, for each combat turn your Level 10 Ninja with a Strength of 18 can do 12 extra damage points total with his 4 swings, all of it with 15% more chance to hit, this is significant."

### Complete Hit Chance Formula
Each strike's chance of hitting is:
```
(HitCalcMod + MonsterAC + (3*Victim) - 1) * 5%
```

Where "Victim" refers to the monster's position/row in combat (affecting back-row targeting penalties).

This calculated value is then **clamped to the 5% - 95% range**. There is always at least a 5% chance of hitting and at least a 5% chance of missing.

**Source:** Data Driven Gamer - "This calculated value is then clamped to the 5% - 95% range."

### Damage Calculation
HitDam is an invisible stat representing your damage dice. Base value is 2d2, and is overridden when equipping a weapon.

**Double damage conditions:**
- If a character or monster is sleeping or held then they take double damage!
- When your weapon is purposed vs. a certain type of monster you do double damage to it!

### Multiple Attacks Per Round
The Fighter, Samurai, and Lord get 1 extra attack for every 5 levels. The Ninja has one extra swing on top of that which means a **Level 1 Ninja starts with 2 swings**. Other classes have only one swing at all levels.

```
Fighters, Samurai, Lords: (CharacterLevel DIV 5) + 1
Ninjas: (CharacterLevel DIV 5) + 2
All others: 1
Maximum: 10
```

The number of swings is the **maximum** between your weapon's inherent characteristics or what your characters' level provide—they do NOT add up together.

**Source:** Zimlab - "Some weapons inherently provide more swings; this is why getting a Long Sword + 2 early for example is so great because it gives 3 swings by default."

---

## 4. Critical Hits (Ninja Decapitation)

If a Ninja hits with damage, then the Ninja has **(2 × Level)%** chance up to a maximum of **50%** chance to score a Critical Hit. 

Monster resistance: **((Monster Level + 10) < (RANDOM 0 to 34))** chance to avoid it, which means a **monster over Level 23 cannot be Critically Hit**.

Multiple strikes do not grant multiple chances to inflict critical hits. The overall attack gives **one chance** for a critical hit, and only if it inflicted at least one damage point.

**Source:** Zimlab - "If a Ninja hits with damage, then the Ninja has ( 2 * Level )% chance up to a maximum of 50% chance to score a Critical Hit."

### Ninja Equipment Note
Despite what the manual says, **you are better off equipping ninjas**. Unarmed ninjas do 2d4 base damage. That's better than the 2d2 of other classes, but it's not hard to find better weapons! Ninjas can score critical hits just as well and just as frequently with weapons as without.

### Player Defense Against Critical Hits
If a character does not resist a Critical Hit (see Resistances), then the character still has another **(Character Level × 2)%** chance up to a maximum of **50%** chance to avoid being Critically Hit.

**Source:** Zimlab - "If a character does not resist a Critical Hit (see Resistances above), then the character still has another (Character Level * 2)% chance up to a maximum of 50% chance to avoid being Critically Hit."

---

## 5. Parry Action

Parrying has the invisible effect of **reducing your AC by 2** for the round.

The character takes no offensive action. Back row characters (positions 4-6) default to Parry since they cannot melee attack.

**Source:** Data Driven Gamer - "Parrying has the invisible effect of reducing your AC by 2 for the round."

---

## 6. Dispell (Turn Undead)

Priests, Bishops and Lords have the ability to dispel undead monsters back to their plane:

**Base formula:** `((50 + (5 × Character Level)) - (10 × Monster Level))%` chance to succeed on each monster of a group.

**Class modifiers:**
- Priests: No penalty (available from level 1)
- Bishops: -20% penalty, available from level 4
- Lords: -40% penalty, available from level 9

**Source:** Zimlab - "They have ((50 + (5 * Character Level)) - (10 * Monster Level))% chance to succeed on each monster of a group."

### Critical Dispell Bug
**Only undead with OK status may be dispelled.** Monsters with ASLEEP status (from Manifo/Katino) cannot be dispelled!

**Source:** Data Driven Gamer (comments) - "I just realized something odd from reading the dispel code (DODISPEL) carefully. It checks that each monster in the targeted group has OK status before calculating whether the dispel 'hits', so monsters which are not OK are totally unaffected by a dispel."

**No XP Reward:** Dispelled monsters grant no experience points.

---

## 7. Run/Flee Action

When you run, odds of success are:
```
39% – (MazeLevel × 3%)
```

If the party size is 3 or less then add:
```
20% - (PartyCount × 5%)
```

If the monsters are demoralized, add 20% to the odds.

**Running NEVER works in level 10!**

**Source:** Data Driven Gamer - "Running NEVER works in level 10!"

---

## 8. Hide Action

**CORRECTION:** The Hide/Ambush mechanic was introduced in Wizardry V (1988). **There is no Hide action in the original 1981 Apple II version.**

**Source:** Data Driven Gamer - "Your chance to heal AFRAID status per round is Level * 5%, but not more than 50%. As far as I know, no monsters in Wizardry I inflict this status."

---

## 9. Spell Casting

Spells execute on the caster's initiative turn. No spell interruption mechanic exists. Spell points are consumed immediately upon declaration.

### Monster Identification
Each combat round, each character has a chance of:
```
(IQ + Piety + CharacterLevel) / 99
```
to identify a monster group. The monster group identified is randomly chosen from 1-4.

**Source:** Data Driven Gamer - "Each combat round, each character has a chance of (IQ + Piety + CharacterLevel)/99 to identify a monster group."

---

## 10. Monster AI and Actions

### Spell Casting Priority
Spell casting monsters have a **75% chance** to cast instead of attacking.

**Priority order:**
1. If monster has mage spells: 75% chance to cast mage spell
2. If monster has priest spells AND didn't cast mage spell: 75% chance to cast priest spell
3. If monster has breath weapon: 60% chance to use breath
4. Otherwise: melee attack

**Source:** Zimlab - "Spell casting monsters have a 75% chance to do so during their turn."

### Mage Spell Level Selection
The monster selects a random degradation value according to weighted odds:
- 71% → 0 (use max level)
- 20.59% → 1
- 5.97% → 2
- 1.73% → 3
- 0.5% → 4
- 0.15% → 5
- 0.06% → 6

This is subtracted from Mage Level (minimum 1). Then pick spell A (66%) or spell B (34%).

### Monster Mage Spell Table
| Level | Spell A | Spell B |
|-------|---------|---------|
| 1 | Katino | Halito |
| 2 | Dilto | Halito |
| 3 | Molito | Mahalito |
| 4 | Dalto | Lahalito |
| 5 | Lahalito | Madalto |
| 6 | Madalto | Zilwan |
| 7 | Tiltowait | Tiltowait |

**Source:** Data Driven Gamer Bestiary

### Monster Priest Spell Table
When casting a priest spell, monsters always select the **highest value allowed** (no degradation). There is still a 66% chance of selecting spell A and a 34% chance of selecting spell B.

| Level | Spell A | Spell B |
|-------|---------|---------|
| 1 | Badios | Badios |
| 2 | Montino | Montino |
| 3 | Badios | Badial |
| 4 | Badial | Badial |
| 5 | Badialma | Badi |
| 6 | Lorto | Mabadi |
| 7 | Mabadi | Mabadi |

**Source:** Data Driven Gamer Bestiary

### Spell Level Degradation (Permanent per Encounter)
After casting, there is a **1 / (Monster group size + 2)** chance that the group's spell level decreases by one point, affecting all individuals within it. This is **permanent for the encounter**.

**Source:** Data Driven Gamer Bestiary - "There is a 1 / (Monster group size + 2) chance that the group's mage level decreases by one point, affecting all individuals within it."

### Breath Weapons
Monsters with breath weapons have a **60% chance** of using them instead of attacking.

Breath attacks hit **all players** for damage equal to **half of the monster's remaining HP** (rounded down).

**Damage reduction (MULTIPLICATIVE):**
- Elemental resistance: halves damage (rounded up)
- Saving throw vs Breath: halves damage (rounded up)
- **BOTH**: approximately 25% damage

**Source:** Data Driven Gamer Bestiary - "Breath attacks hit all players for damage equal to half of the monster's remaining HP. Characters equipped with an item with that elemental resistance, or who make a saving throw against breath will take half damage."

Data Driven Gamer (comments) - "Actually, the effect is cumulative, so if a character has protection against the breath element *and* makes the saving through, the character only takes about a quarter of the normal damage."

### Calling for Help
Monsters with the Call ability have a **75% chance** to call for help if their group count drops below 5. The chance help actually arrives is:
```
(MonsterLevel × 5)%
```

**Source:** Zimlab - "Some monsters have the capability to call for help. The ones that do so have a 75% chance to call for help if their group count drops below 5."

---

## 11. Monster Special Attacks

### Level Drain
If hit by a draining monster, you lose X levels, and maxHP is reduced to:
```
([newLevel] × [oldMaxHP]) / [MaxLev]
```

Where MaxLev is the highest level you've reached without getting drained.

**You'll be LOST if you drop below level 1!**

Notable drain amounts:
- Shade: 1 level
- Lifestealer: 2 levels
- Vampire: 2 levels
- Nightstalker: 1 level
- Maelific: 3 levels
- Vampire Lord: 4 levels
- Werdna: 4 levels

**Source:** Data Driven Gamer - "If you are hit, you will lose X levels, and your maxHP will be reduced to ([newLevel]* [oldMaxHP])/[MaxLev]"

### Poison
Once poisoned, there is **25% chance** each round during combat or each maze movement that poison deals 1 HP damage.

**QUIRK:** Disbanding your party cures poison! This is because the poison flag shares memory with the X coordinate variable.

**Source:** Zimlab - "Once a character is poisoned, there is 25% chance each round during combat or each maze movement that the poison will take effect."

Data Driven Gamer - "Because of this quirk, disbanding your party cures poison."

### Paralysis
Inflicted on successful hit by creatures with the Paralyze ability. Character cannot act.

### Stone
Inflicted on successful hit by creatures with Stone ability (or Stone breath). Requires Madi to cure (not available in combat).

---

## 11A. Breath Attacks (Comprehensive Detail)

### Breath Attack Mechanics
Monsters with breath weapons have a **60% chance** of using them instead of attacking (checked AFTER spell casting chance).

**Damage Calculation:**
```
Base Damage = Monster's Current HP / 2 (rounded DOWN)
```

The damage is based on the monster's **remaining** HP at time of attack, not maximum HP. This makes weakening dragons with MADALTO/DALTO before they breathe critically important.

**Source:** Data Driven Gamer - "Dragons, whose breath attack hits everyone and does damage proportional to how much HP they have left. Target them with Madalto ASAP to reduce their bad breath potential."

### Breath Element Types
| Element | Effect on Hit | Damage Spells (Half Dmg) |
|---------|---------------|--------------------------|
| Fire/Flame | Fire damage to all | Litokan, Mahalito, Lahalito |
| Cold | Cold damage to all | Dalto, Madalto |
| Poison | Poison damage to all | None (breath only) |
| Stone | Stone damage to all | None (breath only) |
| Drain | Level drain to all | None (breath only) |

**CRITICAL:** Stone breath does **NOT** petrify; it merely indicates characters with stone protection take half damage. Similarly, Drain breath does **NOT** level drain; it's just an element type for protection purposes.

**Source:** Data Driven Gamer Bestiary - "Stone breath, for instance, does not petrify; it merely indicates that characters equipped with stone elemental protection will take half damage."

### Monsters with Breath Attacks
| Monster | Breath Type | HP Dice | Max Breath Damage |
|---------|-------------|---------|-------------------|
| Creeping Coin? | Drain | 1d1 (1) | 0 |
| Dragon Fly | Flame | 2d8 (9 avg) | 4 |
| Gas Dragon | Poison | 5d8 (22.5 avg) | 11 |
| Dragon Puppy | Cold | 5d10 (27.5 avg) | 13 |
| Chimera | Flame | 9d6 (31.5 avg) | 15 |
| Gorgon | Stone | 8d8 (36 avg) | 18 |
| Fire Dragon | Flame | 12d8 (54 avg) | 27 |
| Poison Giant | Poison | 1d1+80 (81) | 40 |
| Dragon Zombie | Drain | 12d8 (54 avg) | 27 |
| Flack | Cold | 15d12 (97.5 avg) | 48 |

### Breath Damage Reduction
Damage reduction is **multiplicative**, not either/or:

```
Final Damage = Base Damage
IF character has elemental protection item:
  Final Damage = (Final Damage + 1) DIV 2  // Rounded UP
IF character makes Save vs. Breath:
  Final Damage = (Final Damage + 1) DIV 2  // Rounded UP
```

**Examples:**
- 40 damage breath, no protection, failed save: **40 damage**
- 40 damage breath, has protection, failed save: **20 damage**
- 40 damage breath, no protection, made save: **20 damage**
- 40 damage breath, has protection, made save: **10 damage** (approximately 25%)

**Source:** Data Driven Gamer (comments) - "Actually, the effect is cumulative, so if a character has protection against the breath element *and* makes the saving throw, the character only takes about a quarter of the normal damage. One more picky point: the division in 'half of the monster's remaining HP' is rounded down, while that in 'half damage' (from either saving throw or elemental protection) is rounded *up*."

### Items Providing Breath/Elemental Protection
| Item | Protection |
|------|------------|
| Chain Pro Fire | Fire resistance |
| Ring of Fire | Fire resistance |
| Rod of Flame | Fire resistance |
| Jeweled Amulet | ? |
| Ring Pro Undead | Class protection vs. Undead |
| Shuriken | Resist Poison and Level Drain |

---

## 11B. Item Protection System (Comprehensive)

### Class Protection (vs. Monster Types)
Certain items grant **50% chance** to nullify attacks from specific monster classes when equipped. This protection:
- Applies when a monster of that class targets the equipped character
- Silently causes the monster's attack to fail
- Does **NOT** affect spells or breath weapons
- Works per attack, not per round

**Source:** Data Driven Gamer Bestiary - "Certain items, when equipped, will have a 50% chance of silently nullifying attacks from specific monster classes, should the monster decide to attack the character equipped with such an item. They do not affect spells or breath weapons."

### Items with Class Protection
| Item | Protects Against |
|------|------------------|
| Dragon Slayer | Dragons |
| Were Slayer | Were creatures |
| Mage Masher | Mages |
| Ring Pro Undead | Undead |

### Purposed Weapons (Double Damage)
Certain weapons deal **double damage** against specific monster classes:
| Weapon | Double Damage vs. |
|--------|-------------------|
| Dragon Slayer | Dragons |
| Were Slayer | Were creatures |
| Mage Masher | Mages |

### Elemental Protection
Items with elemental resistance halve damage from:
1. Group-targeting spells of that element
2. Breath attacks of that element

| Element | Protected From (Breath) | Protected From (Spells) |
|---------|------------------------|-------------------------|
| Fire | Fire breath | Litokan, Mahalito, Lahalito |
| Cold | Cold breath | Dalto, Madalto |
| Physical | - | Lorto, Malikto, Molito, Tiltowait |
| Poison | Poison effects from hits | None |
| Drain | Level drain | None |
| Stone | Stone effects from hits | None |
| Magic | Monster spells (special) | All monster-cast spells |

**Magic Protection Special Rule:** When a monster targets you with **any spell**, the spell is silently nullified. However, monster group-affecting spells target a randomly chosen living character - if a non-protected character is targeted, everyone is affected.

**Source:** Data Driven Gamer Treasury - "Magic – When a monster targets you with any spell, the spell is silently nullified. Note that spells cast by monsters always target a randomly chosen living character, even if it's a group-affecting spell like Mahalito. Magic protection will not protect you if a group-affecting spell targets a non-protected character."

### Physical Protection Special Effects
Physical elemental resistance provides special benefits beyond spell resistance:
- **Immune to paralysis** from hits
- **Immune to critical hits** (cannot be decapitated)

**Source:** Data Driven Gamer Treasury - "Physical – You are immune to paralysis effects from hits. You will also never suffer critical hits."

---

## 11C. Complete Monster Abilities Reference

### Ability Definitions
| Ability | Effect |
|---------|--------|
| **Sleep** | Monster is affected by Katino. Monsters WITHOUT this ability are immune to Katino. |
| **Run** | If demoralized, 65% chance to flee each turn |
| **Critical** | On successful hit(s), (Level × 2)% chance (max 50%) to instantly kill |
| **Poison** | Sets target's poison rate to 1 on successful hit |
| **Paralyze** | Inflicts paralysis on successful hit |
| **Call** | If group < 5 monsters, 75% chance to call for help; (Level × 5)% success rate |
| **Stone** | Inflicts stone status on successful hit |

**Source:** Data Driven Gamer Bestiary

### Critical Hit Details
When a monster lands **one or more successful hits**, it has a chance to instantly kill:
```
Critical Hit Chance = MIN(Monster Level × 2, 50)%
```

**Two-Stage Resistance:**
1. First: Saving Throw vs. Death (if failed, proceed to step 2)
2. Second: Character has (Character Level × 2)% chance (max 50%) to avoid death anyway

**Source:** Zimlab - "If a character does not resist a Critical Hit (see Resistances above), then the character still has another (Character Level * 2)% chance up to a maximum of 50% chance to avoid being Critically Hit."

### Monster Critical Hit Resistance
When YOUR character attempts a critical hit on a monster:
```
Monster Resistance = (Monster Level + 10) / 35
```

**Source:** Data Driven Gamer Bestiary - "A monster's chance to resist a successful critical hit is (Level + 10)/35."

### Monsters with Critical Hit Ability
| Monster | Level | Crit Chance |
|---------|-------|-------------|
| Lvl 1 Ninja | 2 | 4% |
| Vorpal Bunny | ~3 | 6% |
| Highwayman | 3 | 6% |
| Lvl 3 Ninja | 3 | 6% |
| Lvl 6 Ninja | 6 | 12% |
| Lvl 8 Ninja | 8 | 16% |
| Master Ninja | 10 | 20% |
| Hatamoto | 12 | 24% |
| High Ninja | 12 | 24% |
| The High Master | 15 | 30% |
| Flack | 15 | 30% |
| Werdna | 10 | 20% |

### Monsters with Level Drain
| Monster | Drain Amount | Notes |
|---------|--------------|-------|
| Shade | 1 level | First draining enemy |
| Nightstalker | 1 level | |
| Lifestealer | 2 levels | |
| Vampire | 2 levels | Also paralyzes |
| Greater Demon | Not melee | Has drain breath |
| Maelific | 3 levels | |
| Vampire Lord | 4 levels | |
| Werdna | 4 levels | Also stones, poisons, paralyzes, crits |
| Creeping Coin? | Drain breath only | Does NOT melee drain |
| Dragon Zombie | Drain breath only | Does NOT melee drain |

### Monsters with Poison Ability
| Monster | Notes |
|---------|-------|
| Creeping Crud | |
| Capybara | Also runs |
| Giant Toad | |
| Lvl 3 Priest | |
| Lvl 3 Ninja | Also crits |
| Huge Spider (both) | |
| Spirit | |
| Giant Spider | |
| Weretiger | |
| Wyvern | |
| Greater Demon | Also paralyzes, calls |
| Maelific | Also paralyzes |
| Flack | Also stones, paralyzes, crits |
| Werdna | Also stones, paralyzes, crits, drains |

### Monsters with Paralyze Ability
| Monster | Notes |
|---------|-------|
| Gas Cloud | Also runs |
| Zombie | |
| Rotting Corpse | |
| Were Bear | Also poisons, runs |
| Grave Mist | |
| Gaze Hound | Also runs |
| Weretiger | |
| Vampire | Also drains |
| Greater Demon | Also poisons, calls |
| Maelific | Also poisons |
| Vampire Lord | |
| Flack | Also stones, poisons, crits |
| Werdna | Also stones, poisons, crits, drains |

### Monsters with Stone Ability
| Monster | Notes |
|---------|-------|
| Medusalizard | |
| Flack | Also poisons, paralyzes, crits |
| Werdna | Also poisons, paralyzes, crits, drains |

### Monsters with Call Ability
| Monster | Level | Call Success Rate |
|---------|-------|-------------------|
| Creeping Coin? | 1 | 5% |
| Minor Daimyo | 4 | 20% |
| Bleeb | 10 | 50% |
| Lesser Demon | 10 | 50% |
| Greater Demon | 11 | 55% |

---

## 11D. Monster Classes Reference

Monster class determines:
1. Friendliness chance
2. Which protection items work against them
3. Which weapons deal double damage
4. Combat flavor text (arms vs. claws)

### Monster Class Friendliness
| Class | Friendly Chance |
|-------|-----------------|
| Fighter | 11% |
| Mage | 6% |
| Priest | 16% |
| Thief | 4% |
| Midget (unused) | 31% |
| Dragon | 26% |
| Giant | 1% |
| Mythical | 1% |
| Animal | 1% |
| Were | 1% |
| Undead | 1% |
| Demon | 1% |
| Insect | 1% |
| Enchanted | 1% |

**Source:** Data Driven Gamer Bestiary - Class friendliness table

### Undead-Specific Rules
- **Makanito:** Never affects undead
- **Zilwan:** Only affects undead (10d200 damage)
- **Dispell:** Only affects undead

### Combat Flavor Text by Class
| Class | Attack Style | Verbs Used |
|-------|--------------|------------|
| Fighter, Mage, Priest, Thief, Midget, Giant, Undead, Demon | Arms | SWINGS, THRUSTS, STABS, SLASHES, CHOPS |
| Mythical, Animal, Insect, Enchanted | Claws | TEARS, RIPS, GNAWS, BITES, CLAWS |
| Dragon, Were | Both | Any of the above |

---

## 12. Armor Class System

### AC Calculation (Lower is Better)
Base of 10, reduced by armor and magic. All magic effects stack, except for multiple casts of Maporfic.

### Monster Hit Chance Against Players
```
(MonsterLevel + CharacterAC) × 5%
```

**Clamped to 5% - 95% range.**

### Naked Ninja AC Bonus
```
AC = 8 – (CharacterLevel DIV 3)
```

A naked ninja would need to be **level 21** to match the effect of wearing just Evil Plate +3.

**Source:** Data Driven Gamer - "As for armor, a naked ninja's AC is: 8 – [Character Level]/3. Not really worth it, I think!"

---

## 13. Saving Throws

Saving throws are a nearly invisible game mechanic, never listed on character sheets.

### Five Save Types
- **Save vs. Death:** Resists poison, paralysis, critical hits in combat (NOT from traps)
- **Save vs. Petrify:** Resists stoning in combat (NOT from traps)
- **Save vs. Wand:** Does nothing at all! (unused)
- **Save vs. Breath:** Halves breath damage, resists gas traps
- **Save vs. Spell:** Resists Montino, anti-priest/anti-mage traps

### Save Chance Formula
```
(CharacterLevel/5 + Luck/6 – ClassBonus – RaceBonus) × 5%
```

(Negative bonuses = better saves)

### Class Save Bonuses
| Class | Death | Petrify | Wand | Breath | Spell |
|-------|-------|---------|------|--------|-------|
| Fighter | -3 | 0 | 0 | 0 | 0 |
| Mage | 0 | 0 | 0 | 0 | -3 |
| Priest | 0 | -3 | 0 | 0 | 0 |
| Thief | 0 | 0 | 0 | -3 | 0 |
| Bishop | 0 | -2 | -2 | 0 | -2 |
| Samurai | -2 | 0 | 0 | 0 | -2 |
| Lord | -2 | -2 | 0 | 0 | 0 |
| Ninja | -3 | -2 | -4 | -3 | -2 |

### Race Save Bonuses
| Race | Bonus |
|------|-------|
| Human | -1 to Death |
| Elf | -2 to Wand (useless!) |
| Dwarf | -4 to Breath |
| Gnome | -2 to Petrify |
| Hobbit | -3 to Spell |

**Source:** Data Driven Gamer - full tables provided

---

## 14. Resistance System (Alternative to Saves)

**Source:** Zimlab

Resistances:
- **Vs. Poison & Paralysis & Critical Hit:** Fighter 15%, Samurai 10%, Lord 10%, Ninja 15%, Human +5%
- **Vs. Stoning:** Priest 15%, Bishop 10%, Lord 10%, Ninja 10%, Gnome +10%
- **Vs. Breath Attacks:** Bishop 10%, Ninja 20%, Elf +10%
- **Vs. Poison Gas trap:** Thief 15%, Ninja 15%, Dwarf +20%
- **Vs. Anti-Mage/Anti-Priest trap and Silence:** Mage 15%, Bishop 10%, Samurai 10%, Ninja 10%, Hobbit +15%

**Additional modifiers:**
- Add 5% for every 5 Levels
- Add 5% if Luck is 6, 10% if Luck is 12, 15% if Luck is 18
- **Maximum: 95%**

---

## 15. Status Effects

Statuses from best to worst:
```
OK → AFRAID → ASLEEP → PLYZE → STONED → DEAD → ASHES → LOST
```

Only one status at a time. Worse status always overwrites better. **Poison is NOT a status** and can coexist.

### Recovery Rates Per Round

**Characters:**
- ASLEEP: Level × 10% (max 50%)
- AFRAID: Level × 5% (max 50%)
- **PARALYZE: NO natural recovery in combat!**

**Monsters:**
- ASLEEP: Level × 20% (max 50%)
- AFRAID: Level × 10% (max 50%)
- PARALYZE: Level × 7% (max 50%)

### Critical Bug: MANIFO
The spell claims to "hold" monsters but **actually inflicts ASLEEP status internally**, not PARALYZE. Monsters recover using the faster sleep rate (20 × Level)% instead of (7 × Level)%.

**Source:** Data Driven Gamer (comments) - "The MANIFO spell claims to 'hold' monsters in its visible output, but under the hood it turns out that it inflicts ASLEEP status."

### Critical Bug: MONTINO (Silence)
**Silenced characters NEVER recover during battle** due to broken code.

---

## 16. Death and Resurrection

DI or KADORTO success: **(4 × Vitality)%**

The recipient permanently loses 1 Vitality point. If Vitality is only 3 when cast, character is **Lost forever**.

**Progression:**
- DEAD → DI spell → Success = revived with 1 HP; Failure = ASHES
- ASHES → KADORTO spell → Success = revived with full HP; Failure = LOST

**Source:** Zimlab - "DI or KADORTO: The resurrect chance is (4 x Vitality)% of the recipient."

---

## 17. Group Combat Mechanics

### Party Formation
- Positions 1-3 (front row): Can melee attack and be targeted by enemy melee
- Positions 4-6 (back row): Cannot attack or be targeted by melee; vulnerable to spells and breath

### Monster Groups
- Level 1: max 2 groups, max 5 monsters per group
- Level 2: max 3 groups, max 6 per group
- Level 3: max 3 groups, max 7 per group
- Level 4+: max 4 groups, max 8+ per group (MazeLevel + 4)

**Source:** Zimlab - "You will encounter a maximum of 2 monster groups on maze level 1, a maximum of 3 on level 2, and up to 4 on level 4 and beyond."

### Target Selection
- **Melee attacks:** Can only target Group 1 (front group). Individual target selected randomly.
- **Group spells:** Affect all monsters in one selected group.
- **All-enemy spells:** Hit all groups (Tiltowait, Malikto).

### Group Advancement
Each monster has a "strength" value:
```
[Remaining HP] - 3 × (MageLevel + PriestLevel)
```

Group strength = sum of all OK monsters' strength.

Advancement probability:
```
20% × [Rear Group Strength] / [Front Group Strength] + 31%
```

---

## 18. Surprise Mechanics

When an encounter occurs, you have a **20% chance** of surprising the monsters.

If you have not surprised them, then the monsters get a **20% chance** of surprising you.

**Note:** Data Driven Gamer reports slightly different values (19% / 15.4%) but recommends using 20%/20% for simplicity.

---

## 19. Key Spell Formulas

| Spell | Formula |
|-------|---------|
| MANIFO | (50 + (10 × Level))% to resist |
| MONTINO | (10 × Monster Level)% to resist |
| KATINO | (20 × Level)% to resist |
| MAKANITO | Undead immune; Level 8+ immune |
| LAKANITO | (6 × Level)% to resist |
| ZILWAN | 10d200 damage to Undead only |
| TILTOWAIT | **10d15** damage (manual incorrectly says 10d10) |
| BADI | (10 × Level)% to resist |
| LOKTOFEIT | (2 × Character Level)% success |

**Source:** Zimlab - "*TILTOWAIT: Does (10d15) damages to all monsters (the game manual wrongly lists it as (10d10) damages)."

---

## 20. Complete Combat Round Pseudo Code

```
PROCEDURE CombatRound:
  // ============================================
  // PHASE 1: INPUT COLLECTION
  // ============================================
  FOR each PartyMember in Party:
    IF PartyMember.Status == OK:
      CollectAction(PartyMember)  // FIGHT, PARRY, SPELL, DISPELL, USE, RUN
    ELSE:
      PartyMember.Action = NONE  // Cannot act
  
  DetermineMonsterActions()  // AI for all monster groups
  
  // ============================================
  // PHASE 2: INITIATIVE ROLL
  // ============================================
  FOR each Character in Party:
    IF Character.Status == OK:
      BaseRoll = RANDOM(1, 10)
      AgiMod = GetAgilityModifier(Character.Agility)
      Character.Initiative = CLAMP(BaseRoll + AgiMod, 1, 10)
  
  FOR each Monster in AllMonsters:
    IF Monster.Status == OK:
      Monster.Initiative = RANDOM(0, 7) + 2  // Range 2-9
  
  // Build action queue sorted by initiative (ascending)
  // Characters win ties against monsters
  SortByInitiativeAscending(AllCombatants)
  
  // ============================================
  // PHASE 3: ACTION RESOLUTION
  // ============================================
  FOR each Combatant in SortedCombatants:
    IF Combatant.Status != OK: CONTINUE
    
    IF Combatant.IsCharacter:
      ExecutePlayerAction(Combatant)
    ELSE:
      ExecuteMonsterAction(Combatant)
  
  // ============================================
  // PHASE 4: END OF ROUND
  // ============================================
  FOR each PartyMember in Party:
    ProcessStatusRecovery(PartyMember)
    ProcessPoison(PartyMember)
    ProcessRegeneration(PartyMember)
  
  FOR each Monster in AllMonsters:
    ProcessMonsterStatusRecovery(Monster)
    ProcessMonsterRegeneration(Monster)
  
  CheckCombatEnd()

// ============================================
// PLAYER ATTACK EXECUTION
// ============================================
PROCEDURE ExecuteAttack(Attacker, TargetGroup):
  Swings = CalculateSwings(Attacker)
  CritChecked = FALSE
  DamageDealt = FALSE
  
  FOR i = 1 TO Swings:
    Target = SelectRandomLivingMonster(TargetGroup)
    IF Target == NULL: RETURN  // No valid targets - attack wasted
    
    // Calculate hit chance
    HitCalcMod = GetBaseHitMod(Attacker.Class, Attacker.Level)
    HitCalcMod += GetStrengthHitMod(Attacker.Strength)
    HitCalcMod += Attacker.Weapon.HitBonus
    
    HitChance = (HitCalcMod + Target.AC + (3 * Target.Position) - 1) * 5
    HitChance = CLAMP(HitChance, 5, 95)
    
    IF RANDOM(1, 100) <= HitChance:
      // Calculate damage
      Damage = RollDice(Attacker.Weapon.DamageDice)
      Damage += Attacker.Weapon.DamageBonus
      Damage += GetStrengthDamageMod(Attacker.Strength)
      
      // Double damage conditions
      IF Target.Status == ASLEEP:
        Damage *= 2
      
      IF Attacker.Weapon.IsPurposed AND MatchesType(Target, Attacker.Weapon.Purpose):
        Damage *= 2
      
      Target.HP -= Damage
      DamageDealt = TRUE
      
      IF Target.HP <= 0:
        Target.Status = DEAD
        RemoveFromGroup(Target)
  
  // Critical hit check - ONCE per round, only if damage was dealt
  IF DamageDealt AND NOT CritChecked AND Attacker.HasCriticalHit:
    CritChecked = TRUE
    CritChance = MIN(Attacker.Level * 2, 50)
    IF RANDOM(1, 100) <= CritChance:
      // Monster resistance check
      // Monster level 24+ cannot be crit (24+10=34, always >= random 0-34)
      IF (Target.Level + 10) < RANDOM(0, 34):
        Target.HP = 0
        Target.Status = DEAD

FUNCTION CalculateSwings(Character):
  ClassSwings = 1
  IF Character.Class IN [FIGHTER, SAMURAI, LORD]:
    ClassSwings = (Character.Level DIV 5) + 1
  ELSE IF Character.Class == NINJA:
    ClassSwings = (Character.Level DIV 5) + 2
  
  WeaponSwings = Character.Weapon.Swings
  RETURN MIN(MAX(ClassSwings, WeaponSwings), 10)

// ============================================
// MONSTER AI DECISION
// ============================================
PROCEDURE ExecuteMonsterAction(Monster):
  // Mage spell check (75% chance if has mage spells)
  IF Monster.MageLevel > 0 AND RANDOM(1, 100) <= 75:
    CastMonsterMageSpell(Monster)
    RETURN
  
  // Priest spell check (75% chance if has priest spells)
  IF Monster.PriestLevel > 0 AND RANDOM(1, 100) <= 75:
    CastMonsterPriestSpell(Monster)
    RETURN
  
  // Breath weapon check (60% chance if has breath)
  IF Monster.HasBreath AND RANDOM(1, 100) <= 60:
    UseBreathWeapon(Monster)
    RETURN
  
  // Default: melee attack
  PerformMonsterAttack(Monster)

// ============================================
// STATUS RECOVERY PROCEDURES
// ============================================
PROCEDURE ProcessStatusRecovery(Character):
  // Characters only recover from ASLEEP and AFRAID
  IF Character.Status == ASLEEP:
    RecoveryChance = MIN(Character.Level * 10, 50)
    IF RANDOM(1, 100) <= RecoveryChance:
      Character.Status = OK
  
  IF Character.Status == AFRAID:
    RecoveryChance = MIN(Character.Level * 5, 50)
    IF RANDOM(1, 100) <= RecoveryChance:
      Character.Status = OK
  
  // NOTE: Characters have NO natural PARALYZE recovery in combat!

PROCEDURE ProcessMonsterStatusRecovery(Monster):
  IF Monster.Status == ASLEEP:
    RecoveryChance = MIN(Monster.Level * 20, 50)
    IF RANDOM(1, 100) <= RecoveryChance:
      Monster.Status = OK
  
  IF Monster.Status == AFRAID:
    RecoveryChance = MIN(Monster.Level * 10, 50)
    IF RANDOM(1, 100) <= RecoveryChance:
      Monster.Status = OK
  
  IF Monster.Status == PARALYZED:
    RecoveryChance = MIN(Monster.Level * 7, 50)
    IF RANDOM(1, 100) <= RecoveryChance:
      Monster.Status = OK

PROCEDURE ProcessPoison(Character):
  IF Character.IsPoisoned:
    IF RANDOM(1, 100) <= 25:  // 25% chance each round
      Character.HP -= 1
```

---

## 21. Fleeing Mechanics (Detailed)

### Base Run Formula
When a party attempts to flee, the success chance is:
```
Base Chance = 39% - (MazeLevel × 3%)
```

**Example calculations:**
| Dungeon Level | Base Chance |
|---------------|-------------|
| Level 1 | 36% |
| Level 2 | 33% |
| Level 3 | 30% |
| Level 4 | 27% |
| Level 5 | 24% |
| Level 6 | 21% |
| Level 7 | 18% |
| Level 8 | 15% |
| Level 9 | 12% |
| Level 10 | **0% (NEVER works)** |

**Source:** Data Driven Gamer - "Running NEVER works in level 10!"

### Small Party Bonus
If the party size is 3 or less, add a bonus:
```
Small Party Bonus = 20% - (PartyCount × 5%)
```

| Party Size | Bonus |
|------------|-------|
| 1 member | +15% |
| 2 members | +10% |
| 3 members | +5% |
| 4+ members | +0% |

### Demoralization Bonus
If the monsters are **demoralized**, add **+20%** to run odds.

Monsters become demoralized when:
```
Total Party Level > Total Monster Morale
```

Where Monster Morale = Monster Level × Number of OK monsters in group (summed across all groups).

When monsters are demoralized, those with the "Run" ability have a 65% chance to flee each turn.

**Source:** Data Driven Gamer - "If the monsters are demoralized (e.g. some of them want to run), then add 20% to the odds."

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

### Consequences of Running
- **Success:** Party escapes combat and appears at a random location on the same maze level
- **Failure:** Monsters get one free round of attacks before you can try again
- **No XP or treasure:** Fleeing grants no rewards

---

## 22. Experience Points System

### Eligibility Requirements
- Each character gets experience points after a fight **only if their status is "OK"**
- **Dead characters do not get gold nor experience points** when the party defeats monsters

**Source:** Zimlab - "*Each character gets experience points after a fight only if their status is 'OK'."

### No XP Conditions
You do **NOT** get experience points for monsters that have been:
- **Dispelled** (turned undead)
- **Ran away** (fled the battle)

**Source:** Zimlab - "*You do not get experience points for monsters that have been dispelled or have ran away."

### XP Calculation Formula
The XP value of a monster is **calculated from the monster's stats**, not stored as a direct value.

Each line item is added up (skip lines where the governing stat is zero, except AC):

```
XP = 0

// Base HP contribution
XP += [Hit dice count] × [Hit dice sides] × 20 × [1 + HasBreath]
// HasBreath = 0 normally, 1 if monster has breath attack

// Mage spells
IF MageLevel > 0:
  XP += 35 × 2^(MageLevel - 1)

// Priest spells
IF PriestLevel > 0:
  XP += 35 × 2^(PriestLevel - 1)

// Level drain
IF DrainLevel > 0:
  XP += 200 × 2^(DrainLevel - 1)

// Regeneration
IF HealLevel > 0:
  XP += 90 × 2^(HealLevel - 1)

// Armor Class (always counted, negative AC adds more XP)
XP -= 40 × (ArmorClass - 11)

// Multiple attacks (only if 2+ attacks)
IF AttackCount >= 2:
  XP += 30 × 2^(AttackCount - 1)

// Spell Resistance
IF SpellResistance > 0:
  XP += 40 × 2^(SpellResistance / 10)
  // Bug bonus for high resistance
  IF SpellResistance >= 80:
    XP += 10000 × 2^((SpellResistance / 10) - 8)

// Elemental Resistances (count all EXCEPT physical)
IF ElementalResistanceCount > 0:
  XP += 35 × 2^(ElementalResistanceCount - 1)

// Special Abilities (including sleep vulnerability)
IF AbilityCount > 0:
  XP += 40 × 2^(AbilityCount - 1)
```

**Source:** Data Driven Gamer - "Interestingly, the XP value of a monster is not actually part of the monster tables, but is calculated from the monster's stats!"

### Example: Greater Demon XP Calculation
```
HP: 11d8, HasBreath: No
  11 × 8 × 20 × 1 = 1760

MageLevel: 5
  35 × 2^4 = 35 × 16 = 560

HealLevel: 1
  90 × 2^0 = 90 × 1 = 90

ArmorClass: -3
  -40 × (-3 - 11) = -40 × -14 = +560

AttackCount: 5
  30 × 2^4 = 30 × 16 = 480

SpellResistance: 95
  40 × 2^9 = 40 × 512 = 20480
  + 10000 × 2^1 = 20000 (high resist bug bonus)

AbilityCount: 3 (Poison, Paralyze, Call)
  40 × 2^2 = 40 × 4 = 160

TOTAL: 1760 + 560 + 90 + 560 + 480 + 20480 + 20000 + 160 = 44,090 XP
```

**Source:** Data Driven Gamer provided this exact calculation breakdown.

### XP Bug: Spell Resistance Overflow
Due to a bug in how Wizardry calculates multiplication of large numbers (using a hacky implementation of long integers), monsters with 80+ Spell Resistance gain massive bonus XP. This is why Murphy's Ghost (40% SR, 4,450 XP), Will O' Wisp (95% SR, 42,840 XP), and Frost Giant (95% SR, 40,875 XP) have disproportionately high XP values.

### XP Distribution
Experience is divided **equally** among all surviving party members with OK status.

```
EachCharacterXP = TotalXP / NumberOfOKCharacters
```

### Notable Monster XP Values
| Monster | XP Each |
|---------|---------|
| Murphy's Ghost | 4,450 |
| Greater Demon | 44,090 |
| Will O' Wisp | 42,840 |
| Frost Giant | 40,875 |
| Poison Giant | 40,840 |
| Werdna | 15,880 |
| Vampire Lord | 7,320 |

### Special XP Awards
- Returning Werdna's Amulet: **250,000 XP** (Apple II) or **50,000 XP** (Wizardry Archives)

**Source:** Wizardry walkthrough - "You will be rewarded 250,000 experience points"

---

## 23. Gold Rewards

### Reward Type Selection
Each monster has two reward values:
- **Reward 1:** Loose gold (random encounters, no chest)
- **Reward 2:** Treasure chest (room encounters with chest)

The **front rank monster type** determines rewards for the entire encounter.

**Source:** Data Driven Gamer - "This is always based on the monster type that was initially selected for the encounter. Monsters types that populated the rear ranks are irrelevant."

### Reward Selection Logic
```
IF encounter in room with treasure chest:
  Use Reward 2 (chest with gold and possible items)
ELSE IF encounter in room WITHOUT chest:
  Use Reward 1 gold × 2 (doubled loose gold)
ELSE:
  Use Reward 1 (standard loose gold)
```

### Loose Gold Tables (Reward 0-9)
| Reward Type | Gold Formula | Range |
|-------------|--------------|-------|
| 0 | 2d5 × 10 | 20-100 |
| 1 | 4d5 × 10 | 40-200 |
| 2 | 6d5 × 10 | 60-300 |
| 4 | 8d5 × 10 | 80-400 |
| 5 | 12d5 × 10 | 120-600 |
| 6 | 10d10 × 10 | 100-1000 |
| 7 | 10d10 × 1d2 × 10 | 100-2000 |
| 8 | 10d10 × 1d4 × 10 | 100-4000 |
| 9 | 10d10 × 1d8 × 10 | 100-8000 |

**Source:** Data Driven Gamer Treasury article - complete reward tables.

### Gold Distribution
Gold is evenly distributed among all party members who are **in a condition to collect gold** (OK status, conscious).

**Source:** Zimlab - "*Dead characters do not get gold nor experience points rewards when the party defeats monsters."

---

## 24. Treasure Chest System

### Chest Encounter Mechanics
Upon entering a dungeon level, the map is seeded with **nine treasure chests**, distributed in regions flagged as "rooms."

- Entering a room with a treasure chest **guarantees an encounter**
- Defeating the monsters in a room with a chest uses **Reward 2** (chest contents)

**Source:** Data Driven Gamer - "Entering a room with a treasure chest guarantees an encounter"

### Chest Trap Types
Chests can have various traps (equal probability unless specified):

**Standard Traps:**
- Trapless (safe)
- Poison Needle
- Gas Bomb
- Type3 Trap (subdivided below)

**Type3 Subtypes (20% each):**
- Crossbow Bolt
- Exploding Box
- Splinters
- Blades
- Stunner

**Special Traps (higher reward tiers):**
- Teleporter
- Anti-Mage
- Anti-Priest
- Alarm

### Trap Effects
| Trap | Effect |
|------|--------|
| Poison Needle | Character opening is Poisoned (stacks if repeated) |
| Gas Bomb | Each character: saving throw or Poisoned |
| Crossbow Bolt | (MazeLevel)d8 damage to opener |
| Exploding Box | 50% chance: (MazeLevel)d8 damage to each |
| Splinters | 70% chance: (MazeLevel)d6 damage to each |
| Blades | 30% chance: (MazeLevel)d12 damage to each |
| Stunner | Opener is Paralyzed |
| Teleporter | Party teleported to random location/direction on same level |
| Anti-Mage | Mages/Samurai: save or Paralyzed (if already Paralyzed → Stoned) |
| Anti-Priest | Priests/Bishops: save or Paralyzed (if already Paralyzed → Stoned) |
| Alarm | Immediate new encounter; still get Reward 2 from new fight |

**Source:** Zimlab - complete trap effect breakdown.

### Trap Identification
```
Thief: (6 × Agility)% to identify, max 95%
Ninja: (4 × Agility)% to identify, max 95%
Others: (1 × Agility)%
Calfo spell: 95% accurate
```

Failed identification reveals a **random trap name** (may be wrong).

**Source:** Zimlab - "*The Thief has ((RANDOM 0 to 99) < (6 * Agility)) chance to identify a trap"

### Trap Disarm
```
Thief/Ninja: (50 + CharacterLevel - MazeLevel) / 70
Others: (CharacterLevel - MazeLevel) / 70
```

If disarm fails: **(Agility × 5%)** chance to avoid setting it off (get another try).

**Source:** Data Driven Gamer - "If disarming fails, the chance to avoid setting off the trap is Agility * 5%."

---

## 25. Item Rewards

### Chest Contents Structure
Treasure chests can contain **multiple independent rewards**:
1. **Gold** (almost always 100% chance)
2. **First item tier** (varies by chest type)
3. **Second item tier** (lower chance)
4. **Third item tier** (rare, high-level chests only)

Each item roll is independent—you may receive any combination.

**Source:** Data Driven Gamer - "The chest may contain one of them, or two of them, or all of them."

### Treasure Chest Tables (Reward 10-19)
| Reward | Traps | Gold | Item Tier 1 | Item Tier 2 | Item Tier 3 |
|--------|-------|------|-------------|-------------|-------------|
| 10 | Trapless/Needle/Type3 | 2d5×10 | 10%: 3-17 | — | — |
| 11 | Trapless/Needle/Gas/Type3 | 4d5×10 | 20%: 3-17 | 10%: 19-33 | — |
| 12 | Trapless/Needle/Type3/Teleporter | 6d5×10 | 30%: 3-17 | 15%: 19-33 | — |
| 13 | Trapless/Needle/Gas/Type3/Teleporter | 8d5×10 | 40%: 3-17 | 20%: 19-33 | — |
| 14 | Trapless/Needle/Gas/Type3/AntiMage | 10d5×10 | 50%: 3-17 | 30%: 19-33 | 10%: 35-52 |
| 15 | Trapless/Needle/Gas/Type3/Alarm | 12d5×10 | 100%: 3-17 | 50%: 19-33 | 20%: 35-52 |
| 16 | Trapless/Type3/Teleporter/AntiMage/AntiPriest | 10d10×10 | 75%: 19-33 | 25%: 35-52 | 10%: 54-80 |
| 17 | Trapless/Needle/Gas/Teleporter/Alarm | 10d10×1d2×10 | 100%: 19-33 | 50%: 35-52 | 15%: 54-80 |
| 18 | Needle/Gas/AntiMage/AntiPriest | 10d10×1d4×10 | 70%: 35-52 | 25%: 54-80 | 5%: 81-93 |
| 19 | All trap types | 10d10×1d8×10 | 100%: 35-52 | 50%: 54-80 | 10%: 80-92 |

### Item Index Ranges Bug
**CRITICAL BUG:** The item range selector has an off-by-two error on minimums and off-by-one on maximums.

**Intended ranges → Actual ranges:**
```
1-16  → 3-17
17-32 → 19-33
33-51 → 35-52
52-79 → 54-80
80-93 → 81-93 (Reward 18) / 80-92 (Reward 19)
```

This creates **gaps in the treasure table**, making some items unobtainable as chest drops:
- **Unobtainable from chests:** Long Sword (1), Short Sword (2), Short Sword+1 (18), Helm+1 (34), Potion of Dial (53)
- Of these, only **Helm+1** and **Potion of Dial** are also not sold at Boltac's, making them **completely unobtainable** in the Apple II version.

**Source:** Data Driven Gamer - "The range values are almost certainly bugged. I am almost positive that Sir-Tech meant for the ranges here to be 1-16 and 17-32."

### Item Tiers Summary
| Item Range | Contents | Rarity |
|------------|----------|--------|
| 3-17 | Basic equipment, +1 items, consumables | Common |
| 19-33 | Better +1 items, Dragon Slayer, scrolls | Uncommon |
| 35-52 | +2 items, Copper Gloves, cursed gear | Rare |
| 54-80 | Special weapons (Blade Cusinart'), elite armor | Very Rare |
| 81-93 | Best items (Murasama Blade, Lord's Garb, Shield+3) | Legendary |

### Key Elite Items (Range 81-93)
| ID | Name | Type |
|----|------|------|
| 81 | Evil Sword +3 | Weapon |
| 82 | Evil Short Sword +3 | Weapon |
| 83 | Thieves Dagger | Weapon (invoke: become Ninja) |
| 84 | Breast Plate +3 | Armor |
| 85 | Lord's Garb | Armor (AC 10, Heals 1/step) |
| 86 | Murasama Blade | Weapon (10d5, invoke: +1 STR) |
| 87 | Shuriken | Weapon (crit hits) |
| 88 | Chain Pro Fire | Armor |
| 89 | Evil Plate +3 | Armor (AC 9) |
| 90 | Shield +3 | Armor |
| 91 | Ring of Healing | Misc (Heals 1/step) |
| 92 | Ring Pro Undead | Misc (class protection) |
| 93 | Deadly Ring | Misc (cursed, supposed to hurt) |

### Item Distribution
When an item drops, it is **randomly given to one conscious party member**.

**CRITICAL:** If that character's inventory is full (8 items max), **the item is discarded** and the game won't tell you!

**Source:** Data Driven Gamer - "If that character's inventory is full, then the item will be discarded, and the game won't even tell you that you would have gotten something!"

### Special Treasures
| Reward | Source | Contents |
|--------|--------|----------|
| 20 | Werdna | Werdna's Amulet (100%) |
| 21 | Lvl 7 Fighters | Latumofis Potion, Deadly Ring, Rod of Flame (all 100%) |

### Monster-Reward Mapping
| Monster Level | Reward 1 | Reward 2 |
|---------------|----------|----------|
| Very Low (1-2) | 0-1 | 10-11 |
| Low (3-5) | 1-4 | 11-14 |
| Mid (6-8) | 4-6 | 14-16 |
| High (9-11) | 6-8 | 16-18 |
| Very High (12+) | 8-9 | 18-19 |

---

## 26. Combat Victory Rewards Summary

### Post-Combat Distribution Flow
```
1. Calculate total XP from all killed monsters
   - Exclude dispelled monsters
   - Exclude fled monsters
   
2. Divide XP equally among OK-status characters

3. Determine reward type:
   - Room with chest → Reward 2 (chest)
   - Room without chest → Reward 1 × 2 (doubled gold)
   - Corridor/other → Reward 1 (standard gold)

4. If chest (Reward 2):
   a. Present trap (if any)
   b. Allow inspect/disarm
   c. Open chest
   d. Roll gold
   e. Roll each item tier independently
   f. Distribute items to random conscious party members

5. If loose gold (Reward 1):
   a. Roll gold amount
   b. Double if room without chest
   c. Distribute evenly to conscious party members
```

### Alarm Trap Special Case
If an Alarm trap triggers:
- New encounter begins immediately
- After defeating new monsters, you receive Reward 2 from the **new** encounter
- You do NOT need to re-open a chest

**Source:** Data Driven Gamer - "If you set off an alarm trap, then you'll still get a 'Reward 2' prize after winning the resulting encounter, without having to re-open the treasure chest, but the prize will be determined from the resulting encounter rather than from the initial one."

---

## 27. Documented Bugs Summary

| Bug | Description | Impact |
|-----|-------------|--------|
| Item Range Bug | Off-by-two minimum, off-by-one maximum in treasure tables | Some items unobtainable (Long Sword, Short Sword, Short Sword+1, Helm+1, Potion of Dial) |
| XP Overflow Bug | Long integer multiplication bug gives bonus XP at 80+ spell resist | Giants/Wisps worth massive XP (Will O' Wisp: 42,840 XP) |
| MANIFO Inflicts Sleep | Claims to "hold" but actually inflicts ASLEEP | Monsters recover faster (20 × Level)% instead of (7 × Level)% |
| Silence Never Recovers | HEALHEAR/DECINAUD procedures broken | Silenced characters stuck until combat ends |
| Save vs. Wand Unused | Code exists but never called | Elf racial bonus (-2) completely useless |
| HAMAN/MAHAMAN Missing | Programming error `(CASE RANDOM (MOD 3) * MAHAMFLG)` instead of `(CASE RANDOM MOD (3 * MAHAMFLG))` | Two effects never trigger: "SHIELDS PARTY" (AC=-10) and "RESURRECTS AND HEALS PARTY!" |
| Dispell Status Check | Only OK monsters can be dispelled | Sleeping/held undead immune to dispel |
| Deadly Ring Doesn't Hurt | Logic selects "larger" value, 0 > -3 | Cursed ring is harmless |
| Healing Doesn't Stack | Multiple healing items don't combine | Only highest value applies |
| NES AC Bug | AC modifiers don't work | Players effectively unarmored (NES only) |
| Poison/Disband Bug | Poison flag shares memory with X coordinate (LostXYL) | Disbanding party clears poison |
| No AFRAID Status | No monsters inflict AFRAID in Wizardry 1 | Recovery code exists but never used |
| No Monster PARALYZE | Nothing inflicts PARALYZE on monsters | Monster paralysis recovery code never executes |
| Stone Breath Misnomer | Stone breath doesn't petrify | Only indicates stone protection halves damage |
| Drain Breath Misnomer | Drain breath doesn't level drain | Only indicates drain protection halves damage |
| Creeping Coin Drain | Listed as having drain ability | Actually only has drain breath (doesn't drain on melee hit) |
| Lvl 7 Fighters Extinct | Unique counter already 0 on all Asimov disk images | Cannot encounter intended unique fight |
| Murphy's Ghost Partner | Partner is itself (100% recursion) | Can cause infinite loop crash if made extinct via hack |

### HAMAN/MAHAMAN Missing Effects Detail
Due to the bug, these effects **never occur** even though coded:
- **SHIELDS PARTY:** Would set each character's AC to -10 (unless already better)
- **RESURRECTS AND HEALS PARTY:** Would cure Afraid, Asleep, Paralysis, Stoning, Death, Ashes and restore all HP

**Source:** Zimlab - "*HAMAN and MAHAMAN for Wizardry 1 had 2 more possible effects in the programming code but due to what seems to be a programming error (CASE RANDOM (MOD 3) * MAHAMFLG) instead of (CASE RANDOM MOD (3 * MAHAMFLG)) they are never showing up in the game."

---

## Sources

- **Thomas William Ewers** - Reverse-engineered Pascal source code (2012-2014), available at ftp://ftp.apple.asimov.net/pub/apple_II/images/games/rpg/wizardry/wizardry_I/
- **Snafaru/Zimlab** - Wizardry #1-2-3 Game Code Calculations and Formulas, https://www.zimlab.com/wizardry/walk/wizardry-123-game-calculations.htm
- **Data Driven Gamer** - The not-so-basic mechanics of Wizardry, The bestiary of Wizardry, The treasury of Wizardry, https://datadrivengamer.blogspot.com/
    