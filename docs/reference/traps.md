# Trap Mechanics Reference

> **📚 SOURCE OF TRUTH**: This document is the authoritative reference for trap mechanics.
> All trap-related implementation should use this as the canonical source.

**Comprehensive validation of trap, chest, and disarm mechanics in original Wizardry 1.**

## Research Date

2025-10-26 (initial), 2025-11-26 (precise formulas), 2025-11-29 (complete source code verification)

## Sources

### Primary Sources

1. **Thomas William Ewers' Reverse-Engineered Pascal Source Code** (2014)
   - Apple Asimov Archive: `ftp://ftp.apple.asimov.net/pub/apple_II/images/games/rpg/wizardry/wizardry_I/`
   - GitHub: [snafaru/Wizardry.Code](https://github.com/snafaru/Wizardry.Code)
   - Status: ✅ DEFINITIVE SOURCE
   - Contains: Complete game logic in compilable Pascal

2. **Sir-Tech Official Manual** (Ultimate Wizardry Archives)
   - Status: ✅ Reviewed
   - Contains: Original game documentation, trap descriptions

3. **DataDrivenGamer Blog**
   - [The not-so-basic mechanics of Wizardry](https://datadrivengamer.blogspot.com/2019/08/the-not-so-basic-mechanics-of-wizardry.html)
   - [The treasury of Wizardry](https://datadrivengamer.blogspot.com/2019/08/the-treasury-of-wizardry.html)
   - Status: ✅ Reviewed
   - Contains: Source code analysis, formula verification

4. **Zimlab Wizardry Fan Page**
   - [Wizardry 1-2-3 Game Calculations](https://www.zimlab.com/wizardry/walk/w123calc.htm)
   - Status: ✅ Reviewed
   - Contains: Comprehensive formula reference

5. **GOG Forums - What is the deal with thiefs in Wizardry 1?**
   - URL: https://www.gog.com/forum/wizardry_series/what_is_the_deal_with_thiefs_in_wizardry_1
   - Status: ✅ Reviewed
   - Contains: Player experience and formula verification

## Summary of Findings

### ✅ Trap System Exists in Wizardry 1

Comprehensive trap system with 8 chest trap types, inspection mechanics, and disarm mechanics.

### 🔍 Key Mechanics Discovered

1. **Trap Inspection** - AGI-based, class-dependent success rate
2. **Trap Disarming** - Level-based, with Thief/Ninja bonus
3. **CALFO Spell** - Priest spell for trap identification (95% accuracy)
4. **Chest Treasures** - Multi-item system with inventory management risk

---

## Trap Types

### Trap Distribution (Original Apple II - FROM SOURCE CODE)

The chest trap selection works as follows:

- **25% chance**: No trap (trapless)
- **25% chance**: Poison Needle
- **25% chance**: Gas Bomb
- **25% chance**: "Type3" trap → then 20% each for:
  - Crossbow Bolt
  - Exploding Box
  - Splinters
  - Blades
  - Stunner

### Complete Trap Type Reference (FROM SOURCE CODE)

Wizardry 1 contains **11 trap types** plus untrapped chests. All trap indices and effects are verified from the reverse-engineered source code:

| Index | Trap Name         | Target           | Damage/Effect                                            |
| ----- | ----------------- | ---------------- | -------------------------------------------------------- |
| 0     | _(No Trap)_       | —                | Chest opens safely                                       |
| 1     | **POISON NEEDLE** | Opener only      | Sets poison status to 1 (stacks with repeated needles)   |
| 2     | **GAS BOMB**      | Entire party     | Each member rolls Save vs. Breath; failure = poisoned    |
| 3     | **CROSSBOW BOLT** | Opener only      | `(MazeLevel)d8` damage                                   |
| 4     | **EXPLODING BOX** | Party (50% each) | Each character has 50% chance of `(MazeLevel)d8` damage  |
| 5     | **SPLINTERS**     | Party (70% each) | Each character has 70% chance of `(MazeLevel)d6` damage  |
| 6     | **BLADES**        | Party (30% each) | Each character has 30% chance of `(MazeLevel)d12` damage |
| 7     | **STUNNER**       | Opener only      | **Immediate paralysis (NO save)**                        |
| 8     | **TELEPORTER**    | Entire party     | Random X,Y coordinates on same maze level, random facing |
| 9     | **ANTI-MAGE**     | Class-specific   | Affects Mages, Samurai, Bishops (see below)              |
| 10    | **ANTI-PRIEST**   | Class-specific   | Affects Priests, Bishops only (**Lords are IMMUNE!**)    |
| 11    | **ALARM**         | Indirect         | Triggers immediate random encounter                      |

### Detailed Trap Effects

**1. POISON NEEDLE** (Index 1)

- **Target**: Opener only
- **Effect**: Sets poison status to 1 (each needle stacks, increasing poison severity)
- **Cure**: LATUMOFIS spell or Temple

**2. GAS BOMB** (Index 2)

- **Target**: Entire party
- **Effect**: Each party member rolls **Save vs. Breath**
- **On Failed Save**: Character becomes poisoned
- **On Successful Save**: No effect
- **Cure**: LATUMOFIS spell or Temple

**3. CROSSBOW BOLT** (Index 3)

- **Target**: Opener only
- **Damage**: `(MazeLevel)d8` (e.g., Level 5 = 5d8 = 5-40 damage)
- **Type**: Physical piercing damage

**4. EXPLODING BOX** (Index 4)

- **Target**: Each party member individually
- **Hit Chance**: 50% per character
- **Damage**: `(MazeLevel)d8` to each affected character
- **Type**: Fire/explosive damage

**5. SPLINTERS** (Index 5)

- **Target**: Each party member individually
- **Hit Chance**: 70% per character
- **Damage**: `(MazeLevel)d6` to each affected character
- **Type**: Physical damage

**6. BLADES** (Index 6)

- **Target**: Each party member individually
- **Hit Chance**: 30% per character
- **Damage**: `(MazeLevel)d12` to each affected character
- **Type**: Physical slashing damage

**7. STUNNER** (Index 7)

- **Target**: Opener only
- **Effect**: **Immediate paralysis with NO saving throw**
- **Cure**: DIALKO spell or Temple

**8. TELEPORTER** (Index 8)

- **Target**: Entire party
- **Effect**: Teleports to random X,Y coordinates on same maze level
- **Facing**: Random direction after teleport
- **Risk**: Can teleport into walls (not in original, but noted in some versions)

**9. ANTI-MAGE** (Index 9)

- **Affected Classes**: Mages, Samurai, Bishops
- **Resolution**: Each affected character rolls **Save vs. Spell**
- **Mages who FAIL**: Paralyzed; if already paralyzed → **TURNED TO STONE**
- **Mages who SUCCEED**: Still paralyzed (reduced effect)
- **Samurai/Bishops who FAIL**: Paralyzed only
- **Samurai/Bishops who SUCCEED**: **NO effect whatsoever**

**10. ANTI-PRIEST** (Index 10)

- **Affected Classes**: Priests, Bishops only
- **IMPORTANT: Lords are IMMUNE** (despite having priest abilities)
- **Resolution**: Each affected character rolls **Save vs. Spell**
- **Priests who FAIL**: Paralyzed; if already paralyzed → **TURNED TO STONE**
- **Priests who SUCCEED**: Still paralyzed (reduced effect)
- **Bishops who FAIL**: Paralyzed only
- **Bishops who SUCCEED**: **NO effect whatsoever**

**11. ALARM** (Index 11)

- **Target**: Indirect
- **Effect**: Triggers immediate random encounter based on current maze level
- **Note**: Party must fight immediately after opening chest

### Dungeon Traps

**Pit Traps**

- **Location**: Floor tiles in dungeon
- **Effect**: Falling damage
- **Cannot be disarmed**: These are environmental hazards, not chest traps
- **Note**: In Wizardry V, LITOFEIT (levitation) avoids pit traps

---

## Trap Inspection

### Inspection Mechanics

**Purpose**: Identify trap type before attempting to disarm

**Inspection Success Formula**:

```
Thieves:  InspectChance% = AGI × 6   (max 95%)
Ninjas:   InspectChance% = AGI × 4   (max 95%)
Others:   InspectChance% = AGI × 1   (max 95%)
```

### Inspection by AGI

**Thieves**:
| AGI | Inspect Chance |
|-----|----------------|
| 3 | 18% |
| 6 | 36% |
| 10 | 60% |
| 16 | 95% (optimal minimum) |
| 18+ | 95% (capped) |

**Recommendation**: Thieves should have at least **AGI 16** for 95% inspect chance.

**Ninjas**:
| AGI | Inspect Chance |
|-----|----------------|
| 3 | 12% |
| 10 | 40% |
| 18 | 72% |
| 24+ | 95% (capped, requires 24 AGI) |

**Ninjas lose inspection ability** compared to thieves (AGI × 4 vs AGI × 6).

**Other Classes**:
| AGI | Inspect Chance |
|-----|----------------|
| 3 | 3% |
| 10 | 10% |
| 18 | 18% |
| 95+ | 95% (capped, unrealistic) |

**Other classes are terrible at inspection** - use CALFO spell instead.

### Inspection Risks (TWO-STAGE RESOLUTION)

**Failed inspection follows a two-stage resolution** (from source code):

**Stage 1 - Trap Trigger Check**:

```
If (RANDOM MOD 20) > Agility: Trap immediately activates!
Otherwise: Proceed to Stage 2
```

**Stage 2 - False Identification**:

- If Stage 1 passed, the game displays a **RANDOM trap type** instead of the actual trap
- This actively misleads subsequent disarm attempts
- The player cannot distinguish a real identification from a false one

**CRITICAL MECHANIC - Failed Inspection/CALFO**:

- A **failed** inspect or CALFO does NOT say "failed" or "unknown"
- Instead, it **reveals a RANDOM trap name** - actively misleading the player!
- This is a core gameplay mechanic from the original source code
- Players cannot know if the revealed trap name is correct or a random false positive
- This is why double-checking with both Thief Inspect AND Priest CALFO is recommended

**Multiple Inspection Attempts**:

- Inspection can be attempted **multiple times** by the same or different characters
- Each attempt carries the risk of triggering the trap (Stage 1 check)
- The original manual describes this: _"Snatch examines the chest and says that he thinks it is a poison needle trap... Derf pushes him aside and inspects the lock. He thinks it's a crossbow bolt trap."_

### CALFO Spell (Alternative)

**Spell**: CALFO (Priest Level 2 spell)
**Effect**: Magically identify trap type
**Success Rate**: 95% (flat rate, no modifiers)
**Cost**: 1 spell point from Level 2 priest spell allocation

**Classes that can cast CALFO**:

- **Priests** — Learn priest spells from level 1
- **Bishops** — Gain priest spells at level 4
- **Lords** — Gain priest spells at level 4

**Advantages**:

- No risk of triggering trap (unlike inspection)
- High success rate (95%)
- Available early (Level 2 spell)

**Disadvantages**:

- Costs spell point
- 5% failure still reveals random trap name (just like failed inspection)

**Original Manual Quote**: CALFO permits the caster _"to determine the nature of a trap on a chest with excellent reliability."_

**Strategy**: Use CALFO + Thief Inspect together for confirmation

- If both identify same trap type → very high confidence
- If they differ → favor CALFO for survivable traps, or leave dangerous chests unopened

---

## Trap Disarming

### Disarm Mechanics

**Who Can Disarm**: Everyone (all classes)

**Disarm Success Formula** (validated from original source code analysis):

```
Thieves/Ninjas: DisarmChance = (50 + CharacterLevel - MazeLevel) / 70
Others:         DisarmChance = (CharacterLevel - MazeLevel) / 70

Result capped at 0% minimum, ~95% practical maximum
```

**Key Insight**: Level 51 Fighter = Level 1 Thief in disarm ability

**Failed Disarm - Avoiding Trap Trigger**:

```
If disarm fails, chance to NOT trigger trap = AGI × 5%
  (i.e., RANDOM(0-19) < AGI means trap doesn't activate)
```

This gives the character another chance to retry the disarm.

**Wrong Trap Name Behavior** (FROM SOURCE CODE):

- **Critical**: If you enter the WRONG trap name, the odds of NOT triggering = Level × 0.1%
- This means at any reasonable level, entering wrong trap name = **99%+ trigger rate**
- Example: Level 10 character = 1% chance to avoid trigger (99% trigger!)
- Example: Level 50 character = 5% chance to avoid trigger (95% trigger!)
- **Bottom line**: Entering wrong trap name almost always triggers the trap

### Disarm by Level (with Maze Level factor)

**Example: Maze Level 1**

| Class   | Level | Formula      | Disarm %              |
| ------- | ----- | ------------ | --------------------- |
| Thief   | 1     | (50+1-1)/70  | 71%                   |
| Thief   | 10    | (50+10-1)/70 | 84%                   |
| Thief   | 20    | (50+20-1)/70 | 99% (capped ~95%)     |
| Fighter | 1     | (1-1)/70     | 0%                    |
| Fighter | 10    | (10-1)/70    | 13%                   |
| Fighter | 51    | (51-1)/70    | 71% (= Level 1 Thief) |

**Example: Maze Level 5**

| Class   | Level | Formula      | Disarm % |
| ------- | ----- | ------------ | -------- |
| Thief   | 1     | (50+1-5)/70  | 66%      |
| Thief   | 10    | (50+10-5)/70 | 79%      |
| Fighter | 10    | (10-5)/70    | 7%       |

### Disarm Process

**1. Inspect or CALFO** to identify trap type

**2. Attempt Disarm**:

- Must enter trap name correctly (e.g., "POISON NEEDLE")
- Roll disarm check based on level and maze level

**3. Possible Outcomes**:

- ✅ **Success**: Trap disarmed, can open chest safely
- ⚠️ **Failure (no trigger)**: "You could not disarm it!" - Can retry (AGI × 5% save)
- ❌ **Failure (triggered)**: "You set it off!" - Trap activates

**4. Multiple Attempts**:

- Can retry as many times as you like
- Each attempt has risk of triggering (unless saved by AGI roll)

**Strategy**:

- If you fail **without** triggering → you chose the **correct** trap type AND got lucky on AGI save
- Keep trying the same trap type
- If you trigger → either wrong type or failed the AGI save

### Disarm Strategy

**Best Case** (High confidence):

1. Thief inspects chest → "POISON NEEDLE"
2. Priest casts CALFO → "POISON NEEDLE"
3. Both agree → very high confidence
4. Thief disarms "POISON NEEDLE" → success

**Medium Case** (Disagree):

1. Thief inspects → "GAS BOMB"
2. CALFO → "CROSSBOW BOLT"
3. Disagree → one is wrong
4. Try Thief's result first (higher AGI = better)
5. If fails without trigger → wrong type, try CALFO's result

**Low Level Party**:

1. No Thief available
2. Priest casts CALFO → "TELEPORTER"
3. High-level Fighter attempts disarm
4. Multiple retries may be needed

---

## Chest Opening Options

### Option 1: Inspect

**Who**: Anyone (best: Thief with AGI 16+)
**Success**: Based on AGI × class multiplier
**Risk**: Small chance to trigger trap during inspection
**Result**: Identifies trap type (or false positive)

### Option 2: CALFO (Spell)

**Who**: Priest, Bishop, Lord (Level 2 spell)
**Success**: 95%
**Risk**: None (spell safely detects)
**Cost**: 1 spell point (Level 2)
**Result**: Identifies trap type

### Option 3: Disarm

**Who**: Anyone (best: Thief/Ninja)
**Requires**: Must know trap type (from Inspect or CALFO)
**Success**: Based on level (+50 for Thief/Ninja)
**Risk**: Can trigger trap on critical failure
**Result**: Trap removed, chest safe to open

### Option 4: Open

**Who**: Anyone
**Risk**: Triggers trap if present (100% if trapped)
**Reward**: Immediate access to treasure
**Strategy**: Only if no trap, or trap is acceptable risk

### Option 5: Leave

**Who**: Anyone
**Risk**: None
**Result**: Abandon chest, no treasure
**Strategy**: If party is low on HP/spells, or trap is too dangerous

---

## Saving Throws Relevant to Trap Effects

### Save vs. Breath (resists GAS BOMB poison)

**Formula** (from source code):

```
SaveChance = (CharLevel/5 + Luck/6 + ClassBonus + RaceBonus) × 5%
```

**Race Bonuses**:
| Race | Bonus | Effect |
|------|-------|--------|
| Dwarves | -4 | Adds 20% resistance |
| Others | 0 | No bonus |

**Class Bonuses**:
| Class | Bonus | Effect |
|-------|-------|--------|
| Thieves | -3 | Adds 15% resistance |
| Ninjas | -3 | Adds 15% resistance |
| Others | 0 | No bonus |

### Save vs. Spell (resists ANTI-MAGE/ANTI-PRIEST)

**Formula**: Same base as Save vs. Breath

**Class Bonuses for Save vs. Spell**:
| Class | Bonus | Effect |
|-------|-------|--------|
| Mages | -3 | Adds 15% resistance |
| Bishops | -2 | Adds 10% resistance |
| Samurai | -2 | Adds 10% resistance |
| Ninjas | -2 | Adds 10% resistance |

**Race Bonuses for Save vs. Spell**:
| Race | Bonus | Effect |
|------|-------|--------|
| Hobbits | -3 | Adds 15% resistance |
| Others | 0 | No bonus |

### Luck Stat Importance

The **Luck stat** contributes to ALL saving throws at approximately **5% per 6 points of Luck**.

Example: A character with 18 Luck gains +15% to all saving throws (18/6 × 5% = 15%).

---

## Chest Treasure Mechanics

### Treasure Chests Appear After Every Combat

Per the original Sir-Tech manual: _"Regrettably, some groups of monsters are security-conscious and like to hide their money and other valuables in... Treasure Chests."_

Treasure chests materialize immediately after combat resolution:

1. Experience points announced for surviving party members
2. Gold piece rewards displayed
3. Chest interaction screen presented

### Treasure Distribution (FROM SOURCE CODE)

**Gold Distribution**:

- Gold pieces are divided **evenly among surviving party members**
- Amount varies by dungeon level and monster difficulty

**Item Distribution**:

- Items are assigned to a **single randomly-selected party member**
- NOT the character who opened the chest!
- Chests may contain multiple items in addition to gold

### Treasure Contents

**Every chest can contain**:

**1. Gold** (100% chance)

- Always present
- Amount varies by dungeon level and reward tier

**2. Item Slot 1** (10-100% chance, tier-dependent)

- Equipment or consumable
- Higher reward tier = higher chance

**3. Item Slot 2** (5-50% chance, tier-dependent)

- Equipment or consumable
- Lower chance than Slot 1

### Reward Tiers

Different chests have different reward tiers affecting:

- Item quality
- Item quantity probability
- Trap types present

### Critical Warning: Inventory Management

**⚠️ CRITICAL BUG**: If character opening chest has **full inventory**, items are **discarded silently**!

**Example**:

- Chest contains: 500 gold, +3 Plate Mail, Healing Potion
- Character has full inventory (8/8 items)
- Result: Gold collected, +3 Plate Mail **LOST**, Healing Potion **LOST**
- **No warning message!**

**Solution**:

- Always ensure character opening chest has empty inventory slots
- Drop items before opening valuable chests
- Plan inventory management carefully

### Item Range Bug

**Known Bug**: Treasure item selection has off-by-one error

- Intended ranges: 1-16, 17-32, 33-51, 52-79, 80-93
- Actual ranges: Shifted values
- Result: Some items unobtainable as chest drops

---

## Trap Distribution by Reward Tier

Based on reward tier, chests can have:

**Low Tier**:

- Trapless (common)
- Poison Needle
- Gas Bomb
- Alarm

**Mid Tier**:

- Type 3 Traps (20% each):
  - Crossbow Bolt
  - Exploding Box
  - Stunner
- Teleporter

**High Tier**:

- Anti-Mage
- Anti-Priest
- All other trap types

**Boss Chests**:

- Always trapped
- High-level traps (Anti-Mage, Anti-Priest, Teleporter)

---

## Class Roles in Trap Management

### Thief

**Primary Role**: Trap inspection and disarming
**Strengths**:

- AGI × 6 inspect chance (95% at AGI 16+)
- +50 level bonus to disarm
- Best trap specialist

**Weaknesses**:

- Low HP
- Poor combat ability
- No spells

**Recommendation**: Essential for early-mid game, optional late game (when fighters reach level 51+)

### Ninja

**Primary Role**: Combat with some trap ability
**Strengths**:

- AGI × 4 inspect chance (95% at AGI 24)
- +50 level bonus to disarm
- Excellent combat (2 base attacks, decapitation)

**Weaknesses**:

- Lower inspect than Thief (AGI × 4 vs AGI × 6)
- Very high XP requirements
- Requires evil alignment + Thieves Dagger

**Recommendation**: Late-game upgrade from Thief if Thieves Dagger obtained

### Priest/Bishop/Lord

**Primary Role**: CALFO spell for trap detection
**Strengths**:

- CALFO: 95% trap identification
- No trigger risk
- Level 2 spell (accessible early)

**Weaknesses**:

- Cannot disarm better than other non-thieves
- Costs spell point

**Recommendation**: Essential backup to Thief inspection

### Other Classes

**Primary Role**: Last resort disarming at high levels
**Strengths**:

- Level 51+ can match Level 1 Thief disarm
- Fighters have high HP to survive trap triggers

**Weaknesses**:

- AGI × 1 inspect (terrible)
- No disarm bonus until very high level

**Recommendation**: Only use for disarming if no Thief/Ninja available

---

## Strategic Considerations

### When to Inspect

✅ **Always** - Inspection is nearly always worth the small risk
✅ High AGI Thief (16+) - Very reliable
✅ After CALFO cast - Double confirmation
⚠️ Low AGI character - High false positive rate
❌ Never rely solely on low AGI inspection

### When to Use CALFO

✅ No Thief in party
✅ Thief is low AGI (<16)
✅ Double-checking Thief's result
✅ Dangerous dungeon level (want certainty)
⚠️ Spell points are limited - use wisely
❌ Don't waste on trapless chests (but you don't know ahead of time)

### When to Disarm

✅ Thief/Ninja: Almost always (best disarm ability)
✅ High confidence in trap type (Inspect + CALFO agree)
✅ Party is healthy (can survive trigger if it fails)
⚠️ Low-level non-Thief: Many retries may be needed
❌ Party is low HP/spells: Consider just leaving chest

### When to Just Open

✅ No trap detected (Inspect or CALFO showed "none")
✅ Trap is low-risk (Poison Needle, party has LATUMOFIS)
✅ High-level party (can tank the damage)
⚠️ Desperate for treasure, willing to risk
❌ Teleporter trap (can teleport into walls = instant death)
❌ Anti-Mage/Anti-Priest (can kill casters)

### When to Leave Chest

✅ Teleporter trap (too risky)
✅ Party is critically low on HP/spells
✅ No Thief, no CALFO, uncertain trap type
✅ Boss fight imminent (save resources)
⚠️ High-value chest (hard choice)

---

## Implementation Status

> **✅ IMPLEMENTED**: All trap mechanics documented below are fully implemented in the codebase.

**Implementation Files**:

- `src/app/services/ChestService.ts` - Chest generation, trap distribution, treasure
- `src/app/services/trap/TrapInspectionService.ts` - Trap detection and inspection
- `src/app/services/trap/TrapDisarmService.ts` - Trap disarming logic
- `src/app/services/trap/TrapEffectService.ts` - Trap effect application
- `data/traps/*.json` - Trap type definitions

**Last Updated**: 2025-12-30

---

## Formulas Summary (FROM SOURCE CODE)

### RNG Implementation Note

The original game uses a linear congruential generator. Key RNG calls:

- `RANDOM MOD 100` for percentage checks
- `RANDOM MOD 70` for disarm calculations
- `RANDOM MOD 20` for trigger avoidance checks

### Trap Inspection

```typescript
function calculateInspectChance(character: Character): number {
  const agi = character.agility;

  let multiplier: number;
  if (character.class === 'Thief') {
    multiplier = 6;
  } else if (character.class === 'Ninja') {
    multiplier = 4;
  } else {
    multiplier = 1;
  }

  const chance = agi * multiplier;
  return Math.min(95, chance);
}

// Original formula: (RANDOM MOD 100) < (AGI × multiplier)
function attemptInspect(character: Character): InspectResult {
  const chance = calculateInspectChance(character);
  const roll = randomMod(100);

  if (roll < chance) {
    return { success: true, trapName: actualTrapName };
  }

  // Failed inspection - two-stage resolution
  // Stage 1: Check for trap trigger
  if (randomMod(20) > character.agility) {
    return { success: false, triggered: true };
  }

  // Stage 2: Return random (false) trap name
  return { success: false, trapName: randomTrapName(), triggered: false };
}
```

### Trap Disarming

```typescript
function calculateDisarmChance(character: Character, mazeLevel: number): number {
  const levelBonus = character.class === 'Thief' || character.class === 'Ninja' ? 50 : 0;
  const effectiveLevel = character.level + levelBonus;

  // Original formula: (RANDOM MOD 70) < (effectiveLevel - mazeLevel)
  const chance = (effectiveLevel - mazeLevel) / 70;
  return Math.max(0, Math.min(0.95, chance)); // Clamp 0% to 95%
}

// If disarm fails, chance to avoid triggering trap
function calculateTriggerAvoidance(character: Character): boolean {
  // Original: (RANDOM MOD 20) < AGI means trap doesn't activate
  return randomMod(20) < character.agility;
}

// Wrong trap name penalty
function wrongTrapNameSurvival(character: Character): boolean {
  // Original: Chance to NOT trigger = Level × 0.1%
  // This is effectively guaranteed to trigger at any reasonable level
  return randomMod(1000) < character.level; // Level × 0.1%
}
```

### CALFO Spell

```typescript
function calfoSuccess(): boolean {
  // Flat 95% success rate
  return randomMod(100) < 95;
}

// On failure, returns random trap name just like failed inspection
```

### Saving Throw Calculation

```typescript
function calculateSaveVsBreath(character: Character): number {
  const classBonus = getBreathClassBonus(character.class); // Thief/Ninja: -3
  const raceBonus = getBreathRaceBonus(character.race); // Dwarf: -4

  return (character.level / 5 + character.luck / 6 + classBonus + raceBonus) * 5;
}

function calculateSaveVsSpell(character: Character): number {
  const classBonus = getSpellClassBonus(character.class); // Mage: -3, Bishop/Samurai/Ninja: -2
  const raceBonus = getSpellRaceBonus(character.race); // Hobbit: -3

  return (character.level / 5 + character.luck / 6 + classBonus + raceBonus) * 5;
}
```

### Trap Damage Calculations

```typescript
function calculateTrapDamage(trapType: TrapType, mazeLevel: number): TrapDamageResult {
  switch (trapType) {
    case TrapType.CROSSBOW_BOLT:
      // Opener only: (MazeLevel)d8
      return { targets: 'opener', damage: rollDice(mazeLevel, 8) };

    case TrapType.EXPLODING_BOX:
      // 50% chance per character: (MazeLevel)d8
      return { targets: 'party', hitChance: 0.5, damage: rollDice(mazeLevel, 8) };

    case TrapType.SPLINTERS:
      // 70% chance per character: (MazeLevel)d6
      return { targets: 'party', hitChance: 0.7, damage: rollDice(mazeLevel, 6) };

    case TrapType.BLADES:
      // 30% chance per character: (MazeLevel)d12
      return { targets: 'party', hitChance: 0.3, damage: rollDice(mazeLevel, 12) };
  }
}
```

---

## Implementation Text Strings

**Text strings to implement** (from original game):

| Event                      | Text String                  |
| -------------------------- | ---------------------------- |
| Successful disarm          | `"DISARMED!"`                |
| Failed disarm (no trigger) | `"You could not disarm it!"` |
| Trap triggered             | `"You set it off!"`          |
| Wrong trap name triggered  | `"Oopps... a [TrapName]!"`   |

**Implementation Notes**:

- When disarm fails but AGI save succeeds: Show "You could not disarm it!" and allow retry
- When disarm fails and AGI save fails: Show "You set it off!" and apply trap damage
- When wrong trap name entered: Show "Oopps... a [actual trap]!" and apply damage
- Spelling of "Oopps" with double 'o' and double 'p' is intentional (original game)

---

## Related

**Research**:

- [Equipment Reference](./equipment-reference.md) - Items found in chests
- [Spell Reference](./spell-reference.md) - CALFO spell
- [Class Reference](./class-reference.md) - Thief, Ninja abilities

**Systems**:

- [Dungeon System](../systems/dungeon-system.md) - Chest placement

**Reference**:

- [Spells Reference](./spells.md) - CALFO spell details

---

## Validation Status

- ✅ **Trap Types**: 11 trap types fully documented with indices and effects
- ✅ **Inspect Formula**: `(RANDOM MOD 100) < (AGI × multiplier)` where multiplier is 6/4/1
- ✅ **Disarm Formula**: `(RANDOM MOD 70) < (EffectiveLevel - MazeLevel)` with +50 Thief/Ninja bonus
- ✅ **Failed Disarm Avoidance**: `(RANDOM MOD 20) < AGI` = retry allowed
- ✅ **CALFO Spell**: 95% flat success rate, Priests/Bishops/Lords only
- ✅ **Chest Contents**: Gold divided evenly, items to random party member
- ✅ **Wrong Trap Name**: `Level × 0.1%` chance to NOT trigger (99%+ trigger rate)
- ✅ **Failed Inspection/CALFO**: Two-stage resolution with trap trigger check then random name
- ✅ **Trap Damage Formulas**: Complete with `(MazeLevel)dX` and hit chances
- ✅ **Splinters**: 70% hit chance, `(MazeLevel)d6` damage
- ✅ **Blades**: 30% hit chance, `(MazeLevel)d12` damage
- ✅ **Anti-Mage/Anti-Priest**: Save vs. Spell with paralysis/petrification mechanics
- ✅ **Lords Immunity**: Lords are IMMUNE to Anti-Priest trap
- ✅ **Saving Throw Formulas**: Complete with class/race bonuses
- ✅ **Implementation Text Strings**: "DISARMED!", "You could not disarm it!", "You set it off!", "Oopps..."

### Intentional Deviations

- **Elf Breath Resistance**: Our implementation gives Elves +10% breath resistance. This is an intentional game balance deviation - original Elves only had the wand save bonus which is never checked in Wizardry 1 (vestigial D&D code). See `data/races/elf.json` for documentation.

**Validation Date**: 2025-11-30
**Validated By**: Claude Code (research compilation with source code verification)

### Primary Sources Used

1. **Reverse-Engineered Pascal Source Code** (Most Authoritative)
   - Thomas William Ewers' reverse-engineered Wizardry code (2012-2014)
   - GitHub: [snafaru/Wizardry.Code](https://github.com/snafaru/Wizardry.Code)
   - Provides definitive formulas from actual game code

2. **DataDrivenGamer Blog** (Source Code Analysis)
   - [The not-so-basic mechanics of Wizardry](https://datadrivengamer.blogspot.com/2019/08/the-not-so-basic-mechanics-of-wizardry.html)
   - [The treasury of Wizardry](https://datadrivengamer.blogspot.com/2019/08/the-treasury-of-wizardry.html)
   - Detailed analysis based on reverse-engineered code

3. **Wizardry Wiki** (Community Reference)
   - [Traps - Fandom Wiki](https://wizardry.fandom.com/wiki/Traps)
   - [Traps - wiki.gg](https://wizardry.wiki.gg/wiki/Traps)
   - Community-compiled information

4. **GOG Forums Discussion**
   - [What is the deal with thiefs in Wizardry 1?](https://www.gog.com/forum/wizardry_series/what_is_the_deal_with_thiefs_in_wizardry_1)
   - Player experience and formula verification

5. **Zimlab Wizardry Fan Page**
   - [Wizardry 1-2-3 Game Calculations](https://www.zimlab.com/wizardry/walk/w123calc.htm)
   - Comprehensive formula reference
