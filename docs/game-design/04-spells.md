# Spells

**Complete spell system and spell reference.**

## Spell System

### Spell Points (Not Slots!)

Wizardry uses **spell points**, not D&D-style memorized slots.

**How it Works**:
- Each character has separate point pools for each spell level (1-7)
- Casting a spell costs **1 point** from that spell's level pool
- Points restore completely when resting at the inn
- Pool size determined by INT (Mage) or PIE (Priest) and character level

**Example**: A level 5 Mage might have:
- Level 1: 4 points (cast level 1 spells 4 times)
- Level 2: 3 points (cast level 2 spells 3 times)
- Level 3: 2 points (cast level 3 spells 2 times)

### Spell Classes

**Mage Spells**: Offensive magic, utility, transformations
- Requires INT ≥ 11
- Available to: Mage, Bishop, Samurai (levels 1-6)

**Priest Spells**: Healing, buffs, holy magic, resurrection
- Requires PIE ≥ 11
- Available to: Priest, Bishop, Lord (levels 1-6)

### Learning Spells

**On Level-Up**: Character attempts to learn new spells

**Learn Chance**: (INT or PIE) / 30
- INT 11: 36.7% chance per spell
- INT 15: 50% chance per spell
- INT 18: 60% chance per spell

**Process**:
1. Character levels up
2. For each spell level now accessible
3. Roll for each unlearned spell at that level
4. If roll succeeds, spell added to spell book
5. Can retry failed spells on next level-up

**Bishops Learn Slower**: Penalty applied (tradeoff for having both spell types)

### Spell Levels

**7 Mage Levels** + **7 Priest Levels** = 14 total spell levels

**Access by Character Level**:
- Character Level 1: Access spell level 1
- Character Level 3: Access spell level 2
- Character Level 5: Access spell level 3
- Character Level 7: Access spell level 4
- Etc.

## Mage Spells (21 Total)

### Level 1 Mage Spells (4 spells)

**HALITO** (Little Fire)
- **Effect**: 1d8 fire damage
- **Target**: Single monster
- **Resistance**: Fire-resistant monsters take half damage
- **Cost**: 1 level-1 point

**MOGREF** (Body Iron)
- **Effect**: -2 AC to caster (improves armor class)
- **Target**: Caster only
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Cost**: 1 level-1 point

**KATINO** (Bad Air)
- **Effect**: Attempts to put all monsters in group to sleep
- **Target**: Monster group
- **Resistance**: (20 × Monster Level)% - Level 5+ immune
- **Critical**: Sleeping monsters take DOUBLE damage
- **Cost**: 1 level-1 point

**DUMAPIC** (Clarity)
- **Effect**: Reveals exact party coordinates (X, Y) and dungeon level
- **Target**: Party (information)
- **Usable**: Camp only (NOT combat)
- **Restriction**: Does not function on Level 10
- **Cost**: 1 level-1 point

### Level 2 Mage Spells (2 spells)

**DILTO** (Darkness)
- **Effect**: Increases AC of target group by 2 (easier to hit)
- **Target**: Monster group
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Cost**: 1 level-2 point

**SOPIC** (Glass)
- **Effect**: Makes caster transparent, -4 AC
- **Target**: Caster only
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Cost**: 1 level-2 point

### Level 3 Mage Spells (2 spells)

**MAHALITO** (Big Fire)
- **Effect**: 4d6 fire damage
- **Target**: Monster group
- **Resistance**: Fire-resistant take half; Magic Resistance provides save
- **Cost**: 1 level-3 point

**MOLITO** (Spark Storm)
- **Effect**: 3d6 non-elemental damage
- **Target**: Monster group
- **Notes**: Not subject to fire/cold resistance
- **Cost**: 1 level-3 point

### Level 4 Mage Spells (3 spells)

**MORLIS** (Fear)
- **Effect**: Increases monster AC by 3 (fear effect)
- **Target**: Monster group
- **Recovery**: (10 × Monster Level)% per round, capped at 50%
- **Cost**: 1 level-4 point

**DALTO** (Blizzard)
- **Effect**: 6d6 cold damage
- **Target**: Monster group
- **Resistance**: Cold-resistant take half; Magic Resistance provides save
- **Cost**: 1 level-4 point

**LAHALITO** (Torch)
- **Effect**: 6d6 fire damage
- **Target**: Monster group
- **Resistance**: Fire-resistant take half; Magic Resistance provides save
- **Cost**: 1 level-4 point

### Level 5 Mage Spells (3 spells)

**MADALTO** (Frost King)
- **Effect**: 8d8 cold damage (highest single-group cold damage)
- **Target**: Monster group
- **Resistance**: Cold-resistant take half
- **Cost**: 1 level-5 point

**MAKANITO** (Deadly Air)
- **Effect**: Instantly kills all eligible monsters
- **Target**: ALL monsters (all groups)
- **Kill Threshold**: Monsters with ≤7 hit dice
- **Immunities**: Undead immune; Level 8+ immune
- **Saving Throw**: NONE for eligible targets
- **Cost**: 1 level-5 point

**MAMORLIS** (Terror)
- **Effect**: Increases AC by 3 for all monsters (fear)
- **Target**: ALL monsters (all groups)
- **Recovery**: (10 × Monster Level)% per round, capped at 50%
- **Cost**: 1 level-5 point

### Level 6 Mage Spells (4 spells)

**LAKANITO** (Suffocation)
- **Effect**: Instant death by suffocation (air-breathing only)
- **Target**: Monster group
- **Resistance**: (6 × Monster Level)% - Level 17+ immune
- **Immunities**: Undead, constructs, non-breathing creatures
- **Cost**: 1 level-6 point

**ZILWAN** (Dispel)
- **Effect**: 10d200 holy damage (10-2000)
- **Target**: Single monster
- **Restriction**: ONLY affects UNDEAD - useless against living
- **Saving Throw**: None - guaranteed undead destruction
- **Cost**: 1 level-6 point

**MASOPIC** (Big Glass)
- **Effect**: -4 AC to all party members
- **Target**: Entire party
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Cost**: 1 level-6 point

**HAMAN** (Change)
- **Effect**: Random powerful effect (5 possibilities)
- **Target**: Variable
- **Cost**: 1 level-6 point + 1 experience level permanently drained
- **Requirement**: Caster must be Level 13+
- **Effects**: Mass heal, strip magic resistance, full party heal, shield party, resurrect party
- **Risk**: Spellbook mangling possible
- **Cost**: 1 level-6 point

### Level 7 Mage Spells (3 spells)

**MAHAMAN** (Great Change)
- **Effect**: Random powerful effect (3 possibilities)
- **Target**: Variable
- **Cost**: 1 level-7 point + 1 level + spell forgotten (must relearn)
- **Requirement**: Caster must be Level 13+
- **Effects**: Mass heal, mass silence, destroy all monsters
- **Risk**: Spellbook mangling possible
- **Cost**: 1 level-7 point

**MALOR** (Apport)
- **Effect**: Teleport party to specified coordinates
- **Target**: Party
- **Usable**: Combat OR Camp (different behavior)
- **Camp Mode**: Player inputs coordinates - DANGER: solid rock = instant party death
- **Combat Mode**: Random safe location on current level
- **Cost**: 1 level-7 point

**TILTOWAIT** (Ka-Blam!)
- **Effect**: 10d15 damage (10-150) - most powerful damage spell
- **Target**: ALL monsters (all groups)
- **Element**: Non-elemental/force
- **Resistance**: Only Magic Resistance provides save
- **Cost**: 1 level-7 point

## Priest Spells (29 Total)

### Level 1 Priest Spells (5 spells)

**DIOS** (Heal)
- **Effect**: Restore 1d8 HP
- **Target**: Single party member
- **Usable**: Combat and Camp
- **Cost**: 1 level-1 point

**BADIOS** (Harm)
- **Effect**: 1d8 damage
- **Target**: Single monster
- **Resistance**: Subject to Spell Resistance
- **Cost**: 1 level-1 point

**KALKI** (Blessings)
- **Effect**: -1 AC to entire party
- **Target**: Party
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Cost**: 1 level-1 point

**MILWA** (Light)
- **Effect**: Creates light, extends vision, reveals secret doors
- **Target**: Party
- **Duration**: 15-29 turns; terminated by darkness zones
- **Cost**: 1 level-1 point

**PORFIC** (Shield)
- **Effect**: -4 AC to caster
- **Target**: Caster only
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Cost**: 1 level-1 point

### Level 2 Priest Spells (4 spells)

**MATU** (Blessing)
- **Effect**: -2 AC to entire party
- **Target**: Party
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Cost**: 1 level-2 point

**CALFO** (X-Ray Vision)
- **Effect**: Identifies trap type on chest
- **Target**: Chest
- **Success Rate**: 95% accurate; 5% wrong trap type
- **Usable**: Looting only (chest opening)
- **Cost**: 1 level-2 point

**MANIFO** (Statue)
- **Effect**: Attempts to paralyze all monsters in group
- **Target**: Monster group
- **Resistance**: (50 + Monster Level × 10)% - Level 5+ immune
- **Critical**: Paralyzed monsters take DOUBLE damage
- **Cost**: 1 level-2 point

**MONTINO** (Still Air)
- **Effect**: Silences all monsters (prevents spellcasting)
- **Target**: Monster group
- **Resistance**: (Monster Level × 10)%
- **Recovery**: (Monster Level × 10)% per round, capped at 50%
- **Cost**: 1 level-2 point

### Level 3 Priest Spells (4 spells)

**BAMATU** (Prayer)
- **Effect**: -4 AC to entire party
- **Target**: Party
- **Duration**: Until combat ends
- **Stacking**: Yes
- **Cost**: 1 level-3 point

**DIALKO** (Softness)
- **Effect**: Cures paralysis and sleep status
- **Target**: Single party member
- **Usable**: Any time
- **Cost**: 1 level-3 point

**LATUMAPIC** (Identification)
- **Effect**: Identifies monsters, revealing true name
- **Target**: All monster groups
- **Duration**: Entire expedition
- **Bug-free**: Identifies ALL groups (original only identified one)
- **Cost**: 1 level-3 point

**LOMILWA** (More Light)
- **Effect**: Creates powerful, long-lasting light
- **Target**: Party
- **Duration**: 32,000 turns (effectively permanent)
- **Stacking**: No
- **Cost**: 1 level-3 point

### Level 4 Priest Spells (4 spells)

**DIAL** (More Heal)
- **Effect**: Restore 2d8 HP
- **Target**: Single party member
- **Usable**: Any time
- **Cost**: 1 level-4 point

**BADIAL** (More Hurt)
- **Effect**: 2d8 damage
- **Target**: Single monster
- **Resistance**: Subject to Spell Resistance
- **Cost**: 1 level-4 point

**LATUMOFIS** (Cure Poison)
- **Effect**: Neutralizes poison status
- **Target**: Single party member
- **Usable**: Any time
- **Notes**: Poisoned characters have 25% chance per round/step to lose 1 HP
- **Cost**: 1 level-4 point

**MAPORFIC** (Big Shield)
- **Effect**: -2 AC to entire party
- **Target**: Party
- **Duration**: Entire expedition
- **Stacking**: No (with itself), Yes (with other AC effects)
- **Cost**: 1 level-4 point

### Level 5 Priest Spells (6 spells)

**DIALMA** (Great Heal)
- **Effect**: Restore 3d8 HP
- **Target**: Single party member
- **Usable**: Any time
- **Cost**: 1 level-5 point

**BADIALMA** (Great Hurt)
- **Effect**: 3d8 damage
- **Target**: Single monster
- **Resistance**: Subject to Spell Resistance
- **Cost**: 1 level-5 point

**BADI** (Death)
- **Effect**: Attempts to instantly kill one monster
- **Target**: Single monster
- **Resistance**: (Monster Level × 10)% - Level 10+ immune
- **Notes**: Binary outcome - instant death or no effect
- **Cost**: 1 level-5 point

**DI** (Life)
- **Effect**: Attempts resurrection from DEAD status
- **Target**: Single dead party member
- **Usable**: Camp only (NOT combat)
- **Success**: (Vitality × 4)% - VIT 18 = 72%, VIT 10 = 40%
- **On Success**: Returns with 1 HP; Vitality permanently -1
- **On Failure**: Character becomes ASHES
- **Cost**: 1 level-5 point

**KANDI** (Locate Soul)
- **Effect**: Reveals coordinates of dead/missing party members
- **Target**: Caster (information)
- **Usable**: Camp only
- **Notes**: Useful for body recovery expeditions
- **Cost**: 1 level-5 point

**LITOKAN** (Flame Tower)
- **Effect**: 3d8 fire damage
- **Target**: Monster group
- **Resistance**: Fire-resistant take half; Spell Resistance provides save
- **Notes**: Priest's primary group damage spell
- **Cost**: 1 level-5 point

### Level 6 Priest Spells (4 spells)

**MADI** (Healing)
- **Effect**: Fully restores ALL HP + removes all negative status effects
- **Target**: Single party member
- **Usable**: Any time
- **Cures**: Poison, Fear, Sleep, Paralysis, Stone, Silence
- **Does NOT Cure**: Dead, Ashes
- **Cost**: 1 level-6 point

**MABADI** (Harming)
- **Effect**: Reduces monster's HP to 1d8 (1-8) remaining
- **Target**: Single monster
- **Saving Throw**: NONE - cannot be resisted
- **Notes**: Exceptionally powerful against high-HP bosses
- **Cost**: 1 level-6 point

**LORTO** (Blades)
- **Effect**: 6d6 physical damage
- **Target**: Monster group
- **Resistance**: Subject to Spell Resistance
- **Notes**: Priest's strongest group damage spell
- **Cost**: 1 level-6 point

**LOKTOFEIT** (Recall)
- **Effect**: Attempts to teleport party to Castle
- **Target**: Party
- **Success**: (Character Level × 2 + 1)% - Level 13 = 27%
- **On Success**: Party reaches Castle but ALL EQUIPMENT LOST and MOST GOLD LOST
- **On Failure**: Nothing happens, spell wasted
- **Notes**: Absolute last resort - devastating cost
- **Cost**: 1 level-6 point

### Level 7 Priest Spells (2 spells)

**MALIKTO** (Word of Death)
- **Effect**: 12d6 divine damage (12-72)
- **Target**: ALL monsters (all groups)
- **Resistance**: Subject to Spell Resistance
- **Comparison**: Priest's TILTOWAIT equivalent; avg 42 vs 80 damage
- **Cost**: 1 level-7 point

**KADORTO** (Resurrection)
- **Effect**: Attempts resurrection from DEAD or ASHES
- **Target**: Single dead or ashed party member
- **Usable**: Camp only (NOT combat)
- **Success**: (Vitality × 4)% - same as DI
- **On Success**: Returns with FULL HP; Vitality permanently -1
- **On Failure from DEAD**: Character becomes ASHES
- **On Failure from ASHES**: Character permanently LOST FOREVER
- **Comparison**: Superior to DI - works on Ashes and restores full HP
- **Cost**: 1 level-7 point

## Spell Strategy

### Essential Spells to Learn

**Mage Must-Haves**:
1. HALITO (damage, level 1) - basic attack
2. KATINO (sleep, level 1) - crowd control, double damage setup
3. MAHALITO (area damage, level 3)
4. DALTO/LAHALITO (big damage, level 4)
5. TILTOWAIT (ultimate damage, level 7)
6. DUMAPIC (mapping, level 1) - essential before MALOR

**Priest Must-Haves**:
1. DIOS (basic heal, level 1)
2. DIAL (better heal, level 4)
3. DIALMA (great heal, level 5)
4. DI (resurrect from dead, level 5)
5. MADI (full heal + cure, level 6)
6. BAMATU (party defense, level 3)
7. MILWA/LOMILWA (light, levels 1/3)

### Spell Combos

**Sleep + Damage**: KATINO (sleep) → MAHALITO/TILTOWAIT (sleeping enemies take 2× damage)
**Paralyze + Damage**: MANIFO (paralyze) → physical attacks (paralyzed enemies take 2× damage)
**Defense Stack**: KALKI + MATU + BAMATU + MASOPIC = massive AC boost
**Boss Killer**: MABADI (reduce HP to 1-8) → any damage finisher
**Emergency Escape**: LOKTOFEIT (risky, loses equipment) or MALOR (risky, can die in rock)

### Spell Point Management

**Early Combat**: Use low-level spells to conserve high-level points
**Boss Fights**: Unload MABADI + high-level damage spells
**Exploration**: Save priest spells for healing, not combat
**Before Returning**: Use remaining spell points before inn rest (they reset anyway)

## Spell Limitations

### Spell Failure

**Most spells never fail** - if you have the points, the spell works.

**Exceptions**:
- LOKTOFEIT: (Level × 2 + 1)% success rate (max 27% at level 13), loses all equipment on success
- DI: (Vitality × 4)% success - VIT 18 = 72%; failure turns body to ashes
- KADORTO: (Vitality × 4)% success; failure from ashes = lost forever

### Castable Locations

**Combat Only**:
- All offensive spells (HALITO, MAHALITO, TILTOWAIT, etc.)
- All debuffs (KATINO, MORLIS, MANIFO, MONTINO, etc.)
- Combat buffs (MOGREF, SOPIC, MASOPIC, etc.)

**Any time** (Combat and Camp):
- Healing spells (DIOS, DIAL, DIALMA, MADI)
- Light spells (MILWA, LOMILWA)
- Status cures (DIALKO, LATUMOFIS)

**Camp Only**:
- DUMAPIC (coordinates)
- DI, KADORTO (resurrection)
- MALOR (teleport - can also be used in combat for random escape)
- LOKTOFEIT (recall to castle)

### Class Restrictions

**Mage Spells**: Mage, Bishop, Samurai
**Priest Spells**: Priest, Bishop, Lord
**Bishop**: Both spell types, but learns slower (penalty applied)
**Samurai/Lord**: Only levels 1-6 (cannot learn level 7 spells)

## Related

- [Spell Reference](../research/spell-reference.md) - Complete spell database
- [Character Creation](./02-character-creation.md) - Spell class requirements
- [Combat](./05-combat.md) - Using spells in combat
- [Progression](./08-progression.md) - Learning new spells
