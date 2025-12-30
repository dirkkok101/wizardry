# Wizardry 1 Complete Spell Reference

**Primary Source**: Thomas William Ewers' reverse-engineered Apple II Pascal source code (2012-2014)
**Cross-referenced**: Snafaru's Wizardry calculations, Data Driven Gamer blog, StrategyWiki
**Last Updated**: 2025-11-30
**Status**: ✅ Complete and validated - 50 total spells (21 Mage + 29 Priest)
**Implementation**: Bug-free version with intended mechanics

---

## Spell System Overview

Wizardry uses a **spell slot system** rather than traditional MP:
- Each spell level (1-7) has its own pool of slots (maximum 9)
- Casting any spell from that level costs exactly **1 slot**
- Slots regenerate **only** at the Adventurer's Inn (Stables restore SP, paid rooms do not)

### Spell Point Formula

```
SP = Character Level - ValueA + ValueB - (ValueB × Spell Circle)
Result clamped to range: 0-9
```

| Class | Spell Type | ValueA | ValueB |
|-------|------------|--------|--------|
| Mage | Mage | 0 | 2 |
| Priest | Priest | 0 | 2 |
| Bishop | Mage | 0 | 4 |
| Bishop | Priest | 3 | 4 |
| Lord | Priest | 3 | 2 |
| Samurai | Mage | 3 | 3 |

**Minimum Guarantee**: Characters receive at least 1 spell point per spell known in each circle.

### Spell Learning

- **Learning chance per spell**: (INT or PIE) / 30
- **First spell of each circle**: Always GUARANTEED when gaining access to that level
- **Starting spells**: Mages/Bishops get HALITO + KATINO; Priests get DIOS + BADIOS

---

## Mage Spells (21 Total)

### Level 1 Mage (4 spells)

**HALITO** ("Little Fire")
- **Target**: Single monster
- **Damage**: 1d8 (1-8) fire
- **Resistance**: Fire-resistant monsters take half damage; no saving throw
- **Notes**: Basic single-target attack spell

**MOGREF** ("Body Iron")
- **Target**: Caster only
- **Effect**: Reduces caster's AC by 2
- **Duration**: Until combat ends
- **Stacking**: Yes, stacks with repeated castings and other AC buffs

**KATINO** ("Bad Air")
- **Target**: Monster group
- **Effect**: Attempts to put all monsters to sleep
- **Resistance**: (20 × Monster Level)% - Level 5+ are immune
- **Recovery**: (20 × Monster Level)% per round, capped at 50%
- **Critical**: Sleeping monsters take **DOUBLE DAMAGE** from all attacks

**DUMAPIC** ("Clarity")
- **Target**: Party (information)
- **Usable**: Camp only (NOT combat)
- **Effect**: Reveals exact party coordinates (X, Y) and dungeon level
- **Restriction**: Does not function on Level 10 (Werdna's lair)
- **Critical**: Essential before MALOR teleportation to avoid death

---

### Level 2 Mage (2 spells)

**DILTO** ("Darkness")
- **Target**: Monster group
- **Effect**: Increases AC of target group by 2 (easier to hit)
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Comparison**: Half as effective as MORLIS (+3 AC)

**SOPIC** ("Glass")
- **Target**: Caster only
- **Effect**: Makes caster transparent, reducing AC by 4
- **Duration**: Until combat ends
- **Stacking**: Yes

---

### Level 3 Mage (2 spells)

**MAHALITO** ("Big Fire")
- **Target**: Monster group
- **Damage**: 4d6 (4-24) fire
- **Resistance**: Fire-resistant take half; Magic Resistance provides save to negate

**MOLITO** ("Spark Storm")
- **Target**: Monster group
- **Damage**: 3d6 (3-18)
- **Element**: Non-elemental
- **Notes**: Lower damage than MAHALITO but not subject to fire resistance

---

### Level 4 Mage (3 spells)

**MORLIS** ("Fear")
- **Target**: Monster group
- **Effect**: Increases monster AC by 3 (fear effect)
- **Resistance**: Subject to monster level-based resistance
- **Recovery**: (10 × Monster Level)% per round, capped at 50%

**DALTO** ("Blizzard")
- **Target**: Monster group
- **Damage**: 6d6 (6-36) cold
- **Resistance**: Cold-resistant take half; Magic Resistance provides save

**LAHALITO** ("Torch")
- **Target**: Monster group
- **Damage**: 6d6 (6-36) fire
- **Resistance**: Fire-resistant take half; Magic Resistance provides save

---

### Level 5 Mage (3 spells)

**MADALTO** ("Frost King")
- **Target**: Monster group
- **Damage**: 8d8 (8-64) cold
- **Resistance**: Cold-resistant take half
- **Notes**: Highest single-group cold damage in game

**MAKANITO** ("Deadly Air")
- **Target**: ALL monsters (all groups)
- **Effect**: Instantly kills all eligible monsters
- **Kill Threshold**: Monsters with ≤7 hit dice (~35-40 HP max)
- **Immunities**: Undead are completely immune; Level 8+ are immune
- **Saving Throw**: NONE for eligible targets

**MAMORLIS** ("Terror")
- **Target**: ALL monsters (all groups)
- **Effect**: Increases AC by 3 for all monsters (fear)
- **Resistance**: Subject to monster level-based resistance
- **Recovery**: (10 × Monster Level)% per round, capped at 50%

---

### Level 6 Mage (4 spells)

**LAKANITO** ("Suffocation")
- **Target**: Monster group
- **Effect**: Instant death by suffocation (air-breathing only)
- **Resistance**: (6 × Monster Level)% - Level 17+ effectively immune
- **Immunities**: Undead, constructs, non-breathing creatures

**ZILWAN** ("Dispel")
- **Target**: Single monster
- **Damage**: 10d200 (10-2000) holy damage
- **Restriction**: ONLY affects UNDEAD - completely useless against living
- **Saving Throw**: None - guaranteed destruction of any undead

**MASOPIC** ("Big Glass")
- **Target**: Entire party
- **Effect**: Reduces AC of all party members by 4
- **Duration**: Until combat ends
- **Stacking**: Yes

**HAMAN** ("Change")
- **Target**: Variable (random effect)
- **Cost**: 1 Level-6 slot + 1 experience level permanently drained
- **Requirement**: Caster must be Level 13+
- **Effects** (randomly selected):
  1. Mass Dialko + Heal (9-72 HP each, cures conditions)
  2. Strip Magic Resistance (first 3 groups treated as Level 1)
  3. Full Party Heal (all HP, cures all conditions except Dead/Ashes)
  4. Shield Party (AC = -10) *[bug-free implementation]*
  5. Resurrect and Heal Party *[bug-free implementation]*
- **Risk**: Spellbook mangling if random(0, CharacterLevel) = 5

---

### Level 7 Mage (3 spells)

**MAHAMAN** ("Great Change")
- **Target**: Variable (random effect)
- **Cost**: 1 Level-7 slot + 1 level + spell is forgotten (must relearn)
- **Requirement**: Caster must be Level 13+
- **Effects** (randomly selected):
  1. Mass Dialko + Heal (same as HAMAN)
  2. Mass Silence (first 3 groups silenced for 5-9 rounds)
  3. Destroy All Monsters (instant win - all monsters killed)
- **Risk**: Same spellbook mangling chance as HAMAN

**MALOR** ("Apport")
- **Target**: Entire party
- **Usable**: Combat OR Camp (different behavior)
- **Camp Mode**: Player inputs coordinates; teleports to specified location
  - **DANGER**: Teleporting into solid rock = INSTANT PERMANENT PARTY DEATH (LOST FOREVER)
  - Cannot teleport INTO Level 10 but CAN teleport out
  - Use DUMAPIC first to determine safe coordinates
- **Combat Mode**: Teleports to RANDOM location on current level (safe, never into rock)

**TILTOWAIT** ("Ka-Blam!")
- **Target**: ALL monsters (all groups)
- **Damage**: 10d15 (10-150) - NOTE: Manual incorrectly states 10d10
- **Element**: Non-elemental/force
- **Resistance**: Only Magic Resistance provides save; no elemental resistances apply
- **Notes**: Most powerful damage spell in the game

---

## Priest Spells (29 Total)

### Level 1 Priest (5 spells)

**DIOS** ("Heal")
- **Target**: Single party member
- **Usable**: Any time (combat and camp)
- **Healing**: 1d8 (1-8) HP
- **Notes**: No level scaling - always 1-8 HP

**BADIOS** ("Harm")
- **Target**: Single monster
- **Damage**: 1d8 (1-8)
- **Resistance**: Subject to Spell Resistance

**KALKI** ("Blessings")
- **Target**: Entire party
- **Effect**: Reduces AC of all party members by 1
- **Duration**: Until combat ends
- **Stacking**: Yes

**MILWA** ("Light")
- **Target**: Party (area)
- **Usable**: Any time
- **Effect**: Creates light, extends vision, reveals secret doors
- **Duration**: 15-29 turns; terminated by darkness zones

**PORFIC** ("Shield")
- **Target**: Caster only
- **Effect**: Reduces caster's AC by 4
- **Duration**: Until combat ends
- **Stacking**: Yes

---

### Level 2 Priest (4 spells)

**MATU** ("Blessing")
- **Target**: Entire party
- **Effect**: Reduces AC of all party members by 2
- **Duration**: Until combat ends
- **Stacking**: Yes

**CALFO** ("X-Ray Vision")
- **Target**: Caster (information)
- **Usable**: Looting only (chest opening)
- **Effect**: Identifies trap type on chest
- **Success Rate**: 95% accurate; 5% chance of wrong trap type

**MANIFO** ("Statue")
- **Target**: Monster group
- **Effect**: Attempts to paralyze all monsters
- **Resistance**: (50 + Monster Level × 10)% - Level 5+ immune
- **Recovery**: (Monster Level × 7)% per round, capped at 50%
- **Critical**: Paralyzed monsters take **DOUBLE DAMAGE**

**MONTINO** ("Still Air")
- **Target**: Monster group
- **Effect**: Silences all monsters (prevents spellcasting)
- **Resistance**: (Monster Level × 10)%
- **Duration**: Permanent for combat (bug-free version allows recovery)
- **Recovery**: (Monster Level × 10)% per round, capped at 50%

---

### Level 3 Priest (4 spells)

**BAMATU** ("Prayer")
- **Target**: Entire party
- **Effect**: Reduces AC of all party members by 4
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Notes**: Maximum party AC buff per cast

**DIALKO** ("Softness")
- **Target**: Single party member
- **Usable**: Any time
- **Effect**: Cures paralysis and sleep status
- **Notes**: Essential for rescuing paralyzed party members

**LATUMAPIC** ("Identification")
- **Target**: Monster groups (information)
- **Usable**: Any time
- **Effect**: Identifies monsters, revealing true name
- **Duration**: Entire expedition
- **Bug-free**: Identifies ALL monster groups (original only identified one random group)

**LOMILWA** ("More Light")
- **Target**: Party (area)
- **Usable**: Any time
- **Effect**: Creates powerful, long-lasting light
- **Duration**: 32,000 turns (effectively permanent)
- **Stacking**: No (unlike MILWA)

---

### Level 4 Priest (4 spells)

**DIAL** ("More Heal")
- **Target**: Single party member
- **Usable**: Any time
- **Healing**: 2d8 (2-16) HP

**BADIAL** ("More Hurt")
- **Target**: Single monster
- **Damage**: 2d8 (2-16)
- **Resistance**: Subject to Spell Resistance

**LATUMOFIS** ("Cure Poison")
- **Target**: Single party member
- **Usable**: Any time
- **Effect**: Neutralizes poison status
- **Notes**: Poisoned characters have 25% chance per round/step to lose 1 HP

**MAPORFIC** ("Big Shield")
- **Target**: Entire party
- **Usable**: Any time
- **Effect**: Reduces AC of all party members by 2
- **Duration**: Entire expedition
- **Stacking**: No (with itself), Yes (with other AC effects)

---

### Level 5 Priest (6 spells)

**DIALMA** ("Great Heal")
- **Target**: Single party member
- **Usable**: Any time
- **Healing**: 3d8 (3-24) HP

**BADIALMA** ("Great Hurt")
- **Target**: Single monster
- **Damage**: 3d8 (3-24)
- **Resistance**: Subject to Spell Resistance

**BADI** ("Death")
- **Target**: Single monster
- **Effect**: Attempts to instantly kill one monster
- **Resistance**: (Monster Level × 10)% - Level 10+ immune
- **Notes**: Binary outcome - instant death or no effect

**DI** ("Life")
- **Target**: Single dead party member
- **Usable**: Camp only (NOT combat)
- **Effect**: Attempts resurrection from DEAD status
- **Success**: (Vitality × 4)% - VIT 18 = 72%, VIT 10 = 40%
- **On Success**: Returns with 1 HP; Vitality permanently -1
- **On Failure**: Character becomes ASHES
- **Warning**: If VIT ≤ 3, failure = permanently LOST

**KANDI** ("Locate Soul")
- **Target**: Caster (information)
- **Usable**: Camp only
- **Effect**: Reveals coordinates of dead/missing party members
- **Notes**: Useful for body recovery expeditions

**LITOKAN** ("Flame Tower")
- **Target**: Monster group
- **Damage**: 3d8 (3-24) fire
- **Resistance**: Fire-resistant take half; Spell Resistance provides save
- **Notes**: Priest's primary group damage spell

---

### Level 6 Priest (4 spells)

**MADI** ("Healing")
- **Target**: Single party member
- **Usable**: Any time
- **Effect**: Fully restores ALL HP + removes all negative status effects
- **Cures**: Poison, Fear, Sleep, Paralysis, Stone, Silence
- **Does NOT Cure**: Dead, Ashes
- **Notes**: Ultimate healing spell - full HP restoration

**MABADI** ("Harming")
- **Target**: Single monster
- **Effect**: Reduces monster's HP to 1d8 (1-8) remaining
- **Saving Throw**: NONE - cannot be resisted, guaranteed to work
- **Notes**: Exceptionally powerful against high-HP bosses

**LORTO** ("Blades")
- **Target**: Monster group
- **Damage**: 6d6 (6-36) physical
- **Resistance**: Subject to Spell Resistance
- **Notes**: Priest's strongest group damage spell

**LOKTOFEIT** ("Recall")
- **Target**: Entire party
- **Usable**: Any time (primarily emergency escape)
- **Effect**: Attempts to teleport party to Castle
- **Success**: (Character Level × 2 + 1)% - Level 13 = 27%
- **On Success**: Party reaches Castle but ALL EQUIPMENT LOST and MOST GOLD LOST
- **On Failure**: Nothing happens, spell wasted
- **Notes**: Absolute last resort - devastating cost even on success

---

### Level 7 Priest (2 spells)

**MALIKTO** ("Word of Death")
- **Target**: ALL monsters (all groups)
- **Damage**: 12d6 (12-72) divine
- **Resistance**: Subject to Spell Resistance
- **Comparison**: Priest's TILTOWAIT equivalent; avg 42 vs 80 damage

**KADORTO** ("Resurrection")
- **Target**: Single dead or ashed party member
- **Usable**: Camp only (NOT combat)
- **Effect**: Attempts resurrection from DEAD or ASHES
- **Success**: (Vitality × 4)% - same as DI
- **On Success**: Returns with FULL HP; Vitality permanently -1
- **On Failure from DEAD**: Character becomes ASHES
- **On Failure from ASHES**: Character permanently LOST FOREVER
- **Warning**: If VIT ≤ 3, failure = permanent loss
- **Comparison**: Superior to DI - works on Ashes and restores full HP

---

## Quick Reference Tables

### Damage Spells by Output

| Rank | Spell | Class | Level | Target | Damage | Average |
|------|-------|-------|-------|--------|--------|---------|
| 1 | ZILWAN | Mage | 6 | 1 Undead | 10d200 | 1005 |
| 2 | TILTOWAIT | Mage | 7 | All | 10d15 | 80 |
| 3 | MALIKTO | Priest | 7 | All | 12d6 | 42 |
| 4 | MADALTO | Mage | 5 | Group | 8d8 | 36 |
| 5 | DALTO | Mage | 4 | Group | 6d6 | 21 |
| 5 | LAHALITO | Mage | 4 | Group | 6d6 | 21 |
| 5 | LORTO | Priest | 6 | Group | 6d6 | 21 |
| 8 | MAHALITO | Mage | 3 | Group | 4d6 | 14 |

### Instant Death Spells

| Spell | Class | Level | Target | Condition | Resistance |
|-------|-------|-------|--------|-----------|------------|
| MAKANITO | Mage | 5 | All | ≤7 HD, not undead | None |
| LAKANITO | Mage | 6 | Group | Breathes air | (6×Level)% |
| BADI | Priest | 5 | Single | Any | (10×Level)% |
| ZILWAN | Mage | 6 | Single | Undead only | None |

### Healing Progression

| Spell | Level | Healing | Notes |
|-------|-------|---------|-------|
| DIOS | 1 | 1d8 | Basic heal |
| DIAL | 4 | 2d8 | Improved |
| DIALMA | 5 | 3d8 | Greater |
| MADI | 6 | Full HP | Ultimate + cures status |

### AC Buffs Comparison

| Spell | Class | Level | Target | AC Bonus | Duration |
|-------|-------|-------|--------|----------|----------|
| KALKI | Priest | 1 | Party | -1 | Combat |
| MOGREF | Mage | 1 | Caster | -2 | Combat |
| MATU | Priest | 2 | Party | -2 | Combat |
| PORFIC | Priest | 1 | Caster | -4 | Combat |
| SOPIC | Mage | 2 | Caster | -4 | Combat |
| BAMATU | Priest | 3 | Party | -4 | Combat |
| MASOPIC | Mage | 6 | Party | -4 | Combat |
| MAPORFIC | Priest | 4 | Party | -2 | Expedition |

---

## Status Effect Mechanics

### Monster Recovery Rates (per combat round)

| Status | Recovery Formula | Maximum |
|--------|-----------------|---------|
| Sleep | (Monster Level × 20)% | 50% |
| Fear | (Monster Level × 10)% | 50% |
| Paralysis | (Monster Level × 7)% | 50% |
| Silence | (Monster Level × 10)% | 50% |

### Damage Modifiers

- **Sleeping targets**: 2× damage from all attacks
- **Paralyzed/Held targets**: 2× damage from all attacks
- **Fire-resistant monsters**: 0.5× damage from fire spells
- **Cold-resistant monsters**: 0.5× damage from cold spells

---

## Bug-Free Implementation Notes

This implementation corrects the following original bugs:

1. **MONTINO Silence Bug**: Original code never decremented silence recovery timer - silenced monsters never recovered. Bug-free version allows recovery per formula.

2. **HAMAN/MAHAMAN Missing Effects**: Two coded effects ("Shields Party" and "Resurrects and Heals Party") never triggered due to CASE statement logic error. Bug-free version includes all 5 intended effects.

3. **LATUMAPIC Single Group Bug**: Original only identified one random monster group instead of all groups. Bug-free version identifies all groups as intended.

4. **TILTOWAIT Damage**: Uses correct 10d15 (verified from source code), not 10d10 as manual stated.

---

## Sources

- Thomas William Ewers' reverse-engineered Apple II Pascal source code (2012-2014)
- Snafaru's Wizardry #1-2-3 Game Code Calculations (zimlab.com)
- Data Driven Gamer's mechanics analysis (datadrivengamer.blogspot.com)
- StrategyWiki Wizardry spell documentation
- Wizardry Wiki (wizardry.fandom.com)
