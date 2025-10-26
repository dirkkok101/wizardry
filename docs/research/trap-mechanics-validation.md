# Trap Mechanics Validation

**Comprehensive validation of trap, chest, and disarm mechanics in original Wizardry 1.**

## Research Date
2025-10-26

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

### Chest Traps (8 Types)

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

**5. Stunner**
- **Effect**: Stuns/paralyzes character opening chest
- **Cure**: LATUMOFIS spell or wait for duration

**6. Teleporter**
- **Effect**: Teleports party to random dungeon location
- **Risk**: Can teleport into walls or dangerous areas

**7. Anti-Mage (Mage Blaster)**
- **Effect**: Targets and damages spellcasters (Mage, Bishop)
- **Type**: Magic damage

**8. Anti-Priest (Priest Blaster)**
- **Effect**: Targets and damages divine casters (Priest, Bishop, Lord)
- **Type**: Divine damage

**9. Alarm / Siren**
- **Effect**: Summons additional monster encounter
- **Result**: Immediate combat after chest opened

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

**Failure**: Wrong trap type identified (false positive)
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

**Disarm Success Formula**:
```
DisarmChance = based on Level
Thieves/Ninjas: Effective Level = ActualLevel + 50
Others: Effective Level = ActualLevel
```

**Key Insight**: Level 51 Fighter = Level 1 Thief in disarm ability

### Disarm by Level

**Thieves/Ninjas**:
| Level | Effective Level | Disarm Chance |
|-------|-----------------|---------------|
| 1 | 51 | High |
| 5 | 55 | Very High |
| 10 | 60 | Excellent |
| 20+ | 70+ | Near certain |

**Other Classes**:
| Level | Effective Level | Disarm Chance |
|-------|-----------------|---------------|
| 1 | 1 | Very Low |
| 10 | 10 | Low |
| 25 | 25 | Moderate |
| 51 | 51 | Same as Level 1 Thief |

### Disarm Process

**1. Inspect or CALFO** to identify trap type

**2. Attempt Disarm**:
- Must enter trap name correctly (e.g., "POISON NEEDLE")
- Roll disarm check based on level

**3. Possible Outcomes**:
- ✅ **Success**: Trap disarmed, can open chest safely
- ⚠️ **Failure (no trigger)**: "You could not disarm it!" - Can retry
- ❌ **Critical Failure**: "You set it off!" - Trap triggers

**4. Multiple Attempts**:
- Can retry as many times as you like
- Each attempt has risk of triggering

**Strategy**:
- If you fail **without** triggering → you chose the **correct** trap type
- Keep trying the same trap type
- If you trigger → either wrong type or critical failure

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
   - ❌ MISSING: `/docs/game-design/XX-traps-chests.md` - Player-facing guide
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
function calculateDisarmChance(character: Character): number {
  let effectiveLevel = character.level

  if (character.class === 'Thief' || character.class === 'Ninja') {
    effectiveLevel += 50
  }

  // Formula not explicitly stated in sources
  // But higher effectiveLevel = higher success rate
  // Exact formula may need empirical testing
  return calculateSuccessFromLevel(effectiveLevel)
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

- ✅ **Trap Types**: 8 chest trap types identified
- ✅ **Inspect Formula**: AGI × (6 for Thief, 4 for Ninja, 1 for Others), max 95%
- ✅ **Disarm Mechanics**: Level-based, +50 for Thief/Ninja
- ✅ **CALFO Spell**: 95% success rate
- ✅ **Chest Contents**: Multi-item system with inventory risk
- ⚠️ **Exact Disarm Formula**: Not explicitly stated (level-based, exact math unknown)
- ⚠️ **Trap Damage**: Damage values not specified in sources

**Validation Date**: 2025-10-26
**Validated By**: Claude Code (research compilation)
**Sources**: 4 authoritative sources (Wizardry Wiki, DataDrivenGamer, GOG Forums, Strategy Wiki)
