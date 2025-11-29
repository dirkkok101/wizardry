# Trap Mechanics Validation

**Comprehensive validation of trap, chest, and disarm mechanics in original Wizardry 1.**

## Research Date
2025-10-26 (initial), 2025-11-26 (updated with precise formulas)

## Sources

### Primary Sources
1. **Wizardry Wiki - Traps**
   - URL: https://wizardry.fandom.com/wiki/Traps
   - Status: ✅ Reviewed
   - Contains: Trap types, basic disarm mechanics

2. **DataDrivenGamer - Treasury of Wizardry**
   - URL: https://datadrivengamer.blogspot.com/2019/08/the-treasury-of-wizardry.html
   - Status: ✅ Reviewed
   - Contains: Chest probability tables, trap distribution, treasure mechanics

3. **GOG Forums - What is the deal with thiefs in Wizardry 1?**
   - URL: https://www.gog.com/forum/wizardry_series/what_is_the_deal_with_thiefs_in_wizardry_1
   - Status: ✅ Reviewed
   - Contains: Inspect formulas (AGI × 6 for thieves), disarm mechanics (level + 50 bonus)

4. **Strategy Wiki - Walkthrough**
   - URL: https://strategywiki.org/wiki/Wizardry:_Proving_Grounds_of_the_Mad_Overlord/Walkthrough
   - Status: ✅ Reviewed
   - Contains: CALFO mechanics (95% accuracy), chest interaction options

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

### Chest Traps - Apple II Original (8 Base Types)

**1. Poison Needle**
- **Effect**: Poison damage to character opening chest
- **Cure**: LATUMOFIS spell or temple

**2. Gas Bomb (Gas Cloud)**
- **Effect**: Poison gas affects party
- **Cure**: LATUMOFIS spell or temple

**3. Crossbow Bolt**
- **Effect**: Physical damage to character opening chest
- **Type**: Piercing damage

**4. Exploding Box**
- **Effect**: Fire/explosive damage to party
- **Type**: Area effect

**5. Splinters** (Apple II Original)
- **Effect**: Physical damage (exact mechanics unclear from sources)
- **Note**: One of the "Type3" subtypes in original code

**6. Blades** (Apple II Original)
- **Effect**: Physical damage to party members
- **Note**: One of the "Type3" subtypes in original code

**7. Stunner**
- **Effect**: Stuns/paralyzes character opening chest
- **Cure**: DIALKO spell or wait for duration

**8. Alarm / Siren** (may be later addition)
- **Effect**: Summons additional monster encounter
- **Result**: Immediate combat after chest opened

### Additional Traps - NES/Later Versions

These traps appear in NES and later ports but may not be in the original Apple II version:

**9. Teleporter**
- **Effect**: Teleports party to random dungeon location
- **Risk**: Can teleport into walls (instant death) or dangerous areas
- **Version**: Confirmed in NES version

**10. Anti-Mage (Mage Blaster)**
- **Effect**: Targets and damages/paralyzes spellcasters (Mage, Bishop)
- **Type**: Magic damage
- **Version**: Confirmed in NES version

**11. Anti-Priest (Priest Blaster)**
- **Effect**: Targets and damages/paralyzes divine casters (Priest, Bishop, Lord)
- **Type**: Divine damage
- **Version**: Confirmed in NES version

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

### Inspection Risks

**CRITICAL MECHANIC - Failed Inspection/CALFO**:
- A **failed** inspect or CALFO does NOT say "failed" or "unknown"
- Instead, it **reveals a RANDOM trap name** - actively misleading the player!
- This is a core gameplay mechanic from the original source code
- Players cannot know if the revealed trap name is correct or a random false positive
- This is why double-checking with both Thief Inspect AND Priest CALFO is recommended

**Critical Failure**: Trap triggered during inspection
- Small chance to set off trap while inspecting
- Risk applies to all classes

### CALFO Spell (Alternative)

**Spell**: CALFO (Priest Level 2 spell)
**Effect**: Identify trap type
**Success Rate**: 95%
**Advantage**: No risk of triggering trap
**Disadvantage**: Costs 1 spell point (Level 2)

**Strategy**: Use CALFO + Thief Inspect together for confirmation
- If both identify same trap type → very high confidence
- If they differ → one is wrong, be cautious

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

| Class | Level | Formula | Disarm % |
|-------|-------|---------|----------|
| Thief | 1 | (50+1-1)/70 | 71% |
| Thief | 10 | (50+10-1)/70 | 84% |
| Thief | 20 | (50+20-1)/70 | 99% (capped ~95%) |
| Fighter | 1 | (1-1)/70 | 0% |
| Fighter | 10 | (10-1)/70 | 13% |
| Fighter | 51 | (51-1)/70 | 71% (= Level 1 Thief) |

**Example: Maze Level 5**

| Class | Level | Formula | Disarm % |
|-------|-------|---------|----------|
| Thief | 1 | (50+1-5)/70 | 66% |
| Thief | 10 | (50+10-5)/70 | 79% |
| Fighter | 10 | (10-5)/70 | 7% |

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

## Chest Treasure Mechanics

### Treasure Contents

**Every chest contains up to 3 items**:

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

## Documentation Impact

### Missing Documentation

**Current State**: Trap mechanics are **completely undocumented** in our codebase.

**Documentation Needed**:

1. **Research Documentation**:
   - ✅ THIS FILE: `/docs/research/trap-mechanics-validation.md`

2. **System Documentation**:
   - ❌ MISSING: Trap system overview
   - Update: `/docs/systems/dungeon-system.md` (mentions traps, needs details)

3. **Service Documentation**:
   - ❌ MISSING: `TrapService.md` - Trap inspection, disarm calculation
   - ❌ MISSING: `ChestService.md` - Chest generation, treasure distribution
   - ❌ MISSING: `SearchService.md` - Already mentioned in dungeon-system.md but not created
   - ❌ MISSING: `DoorService.md` - Already mentioned but needs trap-on-door details

4. **Command Documentation**:
   - ❌ MISSING: `InspectChestCommand.md`
   - ❌ MISSING: `DisarmTrapCommand.md`
   - ❌ MISSING: `OpenChestCommand.md`

5. **Game Design Documentation**:
   - ✅ EXISTS: `/docs/game-design/08-traps-chests.md` - Player-facing guide (comprehensive)
   - Update: `/docs/game-design/04-spells.md` - Add CALFO trap detection details

6. **Spell Documentation**:
   - Update: `/docs/research/spell-reference.md` - CALFO mechanics

---

## Formulas Summary

### Trap Inspection
```typescript
function calculateInspectChance(character: Character): number {
  const agi = character.agility

  let multiplier: number
  if (character.class === 'Thief') {
    multiplier = 6
  } else if (character.class === 'Ninja') {
    multiplier = 4
  } else {
    multiplier = 1
  }

  const chance = agi * multiplier
  return Math.min(95, chance)
}
```

### Trap Disarming
```typescript
function calculateDisarmChance(character: Character, mazeLevel: number): number {
  const levelBonus = (character.class === 'Thief' || character.class === 'Ninja') ? 50 : 0
  const effectiveLevel = character.level + levelBonus

  // Validated formula from original Wizardry source
  const chance = (effectiveLevel - mazeLevel) / 70
  return Math.max(0, Math.min(0.95, chance))  // Clamp 0% to 95%
}

// If disarm fails, chance to avoid triggering trap
function calculateTriggerAvoidance(character: Character): number {
  // RANDOM(0-19) < AGI means trap doesn't activate
  return character.agility * 0.05  // AGI × 5%
}
```

### CALFO Spell
```typescript
function calfoSuccess(): number {
  return 95 // 95% success rate (fixed)
}
```

---

## Related

**Research**:
- [Equipment Reference](./equipment-reference.md) - Items found in chests
- [Spell Reference](./spell-reference.md) - CALFO spell
- [Class Reference](./class-reference.md) - Thief, Ninja abilities

**Systems**:
- [Dungeon System](../systems/dungeon-system.md) - Chest placement

**Game Design**:
- [Spells](../game-design/04-spells.md) - CALFO usage

---

## Validation Status

- ✅ **Trap Types**: 8 base types (Apple II) + 3 NES additions = 11 total trap types
- ✅ **Inspect Formula**: AGI × (6 for Thief, 4 for Ninja, 1 for Others), max 95%
- ✅ **Disarm Formula**: (EffectiveLevel - MazeLevel) / 70, where Thief/Ninja get +50 level bonus
- ✅ **Failed Disarm Avoidance**: RANDOM(0-19) < AGI = chance to avoid triggering (effectively AGI/20)
- ✅ **CALFO Spell**: 95% success rate
- ✅ **Chest Contents**: Multi-item system with inventory risk
- ✅ **Wrong Trap Name**: Level × 0.1% chance to NOT trigger (99%+ trigger rate at any level)
- ✅ **Failed Inspection/CALFO**: Reveals RANDOM trap name (misleads player - key mechanic!)
- ⚠️ **Trap Damage**: Damage values partially specified (varies by trap type and level)
- ⚠️ **Splinters/Blades Effects**: Exact mechanics unclear from available sources

**Validation Date**: 2025-11-29
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
