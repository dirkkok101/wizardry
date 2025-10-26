# Traps & Chests

**Player guide to finding, disarming, and looting treasure chests.**

## Overview

Treasure chests contain gold and valuable items, but most are protected by dangerous traps. Learning to safely handle trapped chests is essential for survival and acquiring the best equipment.

## Finding Chests

### Where Chests Appear

**After Combat**: Some monster encounters drop treasure chests
**Hidden Locations**: Use Search action to find hidden chests
**Boss Rewards**: Boss monsters always drop high-tier chests
**Special Rooms**: Treasure rooms contain multiple chests

### Searching for Chests

**Search Command**: Press 'S' to search current tile
**Success Rate**: (INT + PIE) / 2 + class bonus
- Thieves/Ninjas: +10% bonus
- Mages/Bishops: +5% bonus
- Others: No bonus

**Best Searchers**:
- Thief with INT 18, PIE 18: 28% find chance
- Mage with INT 18, PIE 16: 22% find chance

## Trap Types

### Damage Traps

**POISON NEEDLE** - Low threat
- Damage: 1d6 to opener
- Status: Poison (continues after combat)
- Cure: LATUMOFIS spell or Temple

**CROSSBOW BOLT** - Medium threat
- Damage: 2d8 to opener
- Status: None
- Risk: Moderate damage

**GAS BOMB** - Medium threat
- Damage: 2d6 to entire party
- Status: Poison to all party members
- Risk: Party-wide damage + poison

**EXPLODING BOX** - High threat
- Damage: 3d6 to entire party
- Status: None
- Risk: Heavy party-wide damage

**STUNNER** - Medium threat
- Damage: 1d4 to opener
- Status: Paralysis
- Risk: Disables character (can't act in combat)

### Class-Specific Traps

**MAGE BLASTER (Anti-Mage)** - High threat
- Damage: 4d6 to Mages and Bishops
- Other classes: Immune
- Risk: Can one-shot low-level mages

**PRIEST BLASTER (Anti-Priest)** - High threat
- Damage: 4d6 to Priests, Bishops, Lords
- Other classes: Immune
- Risk: Can one-shot low-level priests

### Special Traps

**TELEPORTER** - CRITICAL THREAT ⚠️
- Effect: Teleports entire party to random location
- Risk: Can teleport INTO WALLS = instant party death
- Risk: Can teleport to very dangerous dungeon level
- **NEVER trigger this trap** - always disarm first

**ALARM** - Medium threat
- Effect: Triggers immediate monster encounter
- Risk: Forced combat when party may be unprepared

## Handling Trapped Chests

### Option 1: Inspect (Thief/Ninja Best)

**Who Can Inspect**: Anyone
**How It Works**: Character examines chest for traps

**Success Rate**:
- Thieves: AGI × 6% (max 95%)
- Ninjas: AGI × 4% (max 95%)
- Others: AGI × 1% (max 95%)

**Recommended AGI**:
- Thieves: AGI 16+ for 95% success
- Ninjas: AGI 24 for 95% success

**Results**:
- ✅ Success: Identifies trap type
- ❌ Failure: No information (can retry)
- ⚠️ Critical Failure: Triggers trap (1-2% chance)

**Example**:
```
> Inspect chest
"Lockpick detects a POISON NEEDLE trap!"
```

### Option 2: CALFO Spell (Priest Alternative)

**Who Can Cast**: Priests, Bishops, Lords (Level 2 spell)
**Success Rate**: 95% (very reliable)
**Cost**: 1 spell point (Level 2)
**Risk**: None (cannot trigger trap)

**Advantage**: No trigger risk, high success
**Disadvantage**: Costs spell point

**Example**:
```
> Cast CALFO on chest
"Your vision reveals a GAS BOMB trap!"
```

### Option 3: Disarm Trap

**Who Can Disarm**: Anyone (Thieves/Ninjas best)
**Requires**: Must know trap type (from Inspect or CALFO)

**Success Rate**:
```
Effective Level = Your Level + Bonus
- Thieves/Ninjas: +50 bonus
- Others: No bonus

Success% = (Effective Level - Trap Difficulty) × 5
Minimum: 5%, Maximum: 95%
```

**Key Insight**: **Level 1 Thief = Level 51 Fighter** in disarm ability!

**Results**:
- ✅ Success: Trap disarmed, chest safe to open
- ❌ Failed (right trap): Can retry
- ⚠️ Failed (wrong trap): Likely triggers
- ⚠️ Critical Failure: Triggers trap (even if right type)

**Example**:
```
> Disarm POISON_NEEDLE trap
"Lockpick successfully disarmed the trap!"
```

**Retry Strategy**:
- If failed **without triggering** → You chose CORRECT trap type, keep trying!
- If triggered → Trap was wrong type or critical failure

### Option 4: Just Open It

**Risk**: Triggers trap if present (100% if trapped)
**Reward**: Immediate treasure access

**When to Risk**:
- Trap is low-damage (POISON NEEDLE)
- High-level party can tank damage
- Desperate for treasure

**When NOT to Risk**:
- TELEPORTER identified (instant death risk)
- Party is low HP
- Class-specific trap matches your party composition

## Safe Chest Opening Workflow

### Recommended Sequence

**1. Inspect or CALFO**
- Thief inspects: 95% success if AGI 16+
- OR Priest casts CALFO: 95% success

**2. Double-Check (Optional but Recommended)**
- Thief inspects → "POISON NEEDLE"
- Priest casts CALFO → "POISON NEEDLE"
- Both agree? Very high confidence!

**3. Disarm Trap**
- Thief disarms with correct trap type
- 95% success for Level 1+ Thief
- Can retry if failed without triggering

**4. Check Inventory**
- ⚠️ **CRITICAL**: Ensure character has empty inventory slots
- Drop 2-3 items on ground if needed
- Chests can contain 0-2 items

**5. Open Chest**
- Character collects gold (always works)
- Character collects items (if inventory space)
- ⚠️ Items discarded silently if inventory full!

**6. Pick Up Dropped Items**
- Retrieve items you dropped earlier

## Critical: Inventory Management

### The Silent Discard Problem

**⚠️ GAME-BREAKING BUG**: If character opening chest has **full inventory** (8/8 items), treasure items are **LOST FOREVER** with **NO WARNING**.

**Example of What Can Go Wrong**:
```
> Fighter opens chest
> Fighter's inventory: 8/8 items (FULL)
> Chest contains: 500 gold, Murasama Blade +5, Shield +3

Result:
✅ 500 gold collected
❌ Murasama Blade +5 LOST (no message)
❌ Shield +3 LOST (no message)
```

**You'll never even know you lost priceless items!**

### Safe Inventory Strategy

**Before Opening Any Chest**:
1. Check opener's inventory count
2. If 6-8 items → **DROP 2-3 items on ground**
3. Open chest
4. Collect treasure
5. Pick up dropped items

**Best Practice**: Always maintain 2-3 empty slots before opening chests

## Party Roles

### Thief - Trap Specialist

**Primary Role**: Inspect and disarm traps

**Strengths**:
- AGI × 6 inspect (best in game)
- +50 disarm bonus (95% success at level 1)
- Can retry failed disarms

**Recommended Stats**:
- AGI 16+ (for 95% inspect)
- AGI 18 ideal (less stat loss on level up)

**Strategy**: Essential for safe chest handling

### Ninja - Advanced Specialist

**Primary Role**: Combat + some trap ability

**Strengths**:
- AGI × 4 inspect (good, not best)
- +50 disarm bonus (same as Thief)
- Excellent combat abilities

**Weaknesses**:
- Lower inspect than Thief
- Requires evil alignment + Thieves Dagger
- Very high XP requirements

**Strategy**: Late-game Thief upgrade if dagger obtained

### Priest/Bishop/Lord - CALFO Support

**Primary Role**: Spell-based trap detection

**Strengths**:
- CALFO: 95% trap identification
- No trigger risk
- Available early (Level 2 spell)

**Weaknesses**:
- Costs spell point
- Can't disarm better than non-Thieves

**Strategy**: Essential backup to Thief

### Fighter/Samurai - Chest Opener

**Primary Role**: Tank trap damage

**Strengths**:
- High HP (survives trap damage)
- Not vulnerable to class-specific traps
- At level 51+, can disarm as well as Thief

**Strategy**: Best character to actually open chest (after disarming)

### Mage - Vulnerable

**Warnings**:
- Vulnerable to MAGE_BLASTER (4d6 damage)
- Low HP (trap damage is lethal)
- Should NOT open chests

**Strategy**: Cast CALFO, then stay back

## Chest Tiers & Rewards

### Tier 1 (Common) - Dungeon 1-2

**Trap Chance**: 50%
**Common Traps**: Poison Needle, Gas Bomb, Alarm
**Gold**: 10-100
**Items**: Leather, Chain, +0 weapons
**Item Chance**: 28% for 1st item, 14% for 2nd item

### Tier 2 (Uncommon) - Dungeon 3-4

**Trap Chance**: 60%
**Common Traps**: Crossbow Bolt, Poison Needle
**Gold**: 50-300
**Items**: Chain, Plate, +1 weapons
**Item Chance**: 46% for 1st item, 23% for 2nd item

### Tier 3 (Rare) - Dungeon 5-6

**Trap Chance**: 70%
**Common Traps**: Exploding Box, Stunner, Teleporter
**Gold**: 100-600
**Items**: Plate, +1/+2 weapons, +1 armor
**Item Chance**: 64% for 1st item, 32% for 2nd item

### Tier 4 (Epic) - Dungeon 7-8

**Trap Chance**: 80%
**Common Traps**: Teleporter, Mage Blaster, Priest Blaster
**Gold**: 300-1500
**Items**: +2 weapons, +2 armor, special items
**Item Chance**: 82% for 1st item, 41% for 2nd item

### Tier 5 (Legendary) - Dungeon 9-10

**Trap Chance**: 90%
**Common Traps**: Teleporter, Class Blasters
**Gold**: 500-5000
**Items**: +3 weapons, +3 armor, unique items
**Item Chance**: 100% for 1st item (guaranteed!), 50% for 2nd item

## Decision Tree: What To Do?

### You Find a Chest

**Have a Thief with AGI 16+?**
- YES → Thief inspects
- NO → Priest casts CALFO (or risk it)

### Trap Identified

**Is it TELEPORTER?**
- YES → **ALWAYS DISARM** (too dangerous to risk)
- NO → Continue evaluation

**Is it Class Blaster for your party?**
- YES (have that class) → Disarm recommended
- NO (immune) → Can risk if high HP

**Is party low HP/spells?**
- YES → Disarm or leave chest
- NO → Can risk low-damage traps

### Disarm Attempt

**Have Thief/Ninja?**
- YES → 95% success, go ahead
- NO → Use high-level Fighter (51+) or leave

**Disarm failed without triggering?**
- Means you chose CORRECT trap type!
- Retry until success

### Open Chest

**Is inventory full (8/8 items)?**
- YES → **DROP 2-3 ITEMS FIRST** (critical!)
- NO → Safe to open

**Who should open?**
- Fighter or high-HP character (can tank accidental triggers)
- NOT Mage/Priest (if class traps possible)

## Common Mistakes

### ❌ Opening with Full Inventory
**Problem**: Losing priceless items forever with no warning
**Solution**: Always check inventory, drop items first

### ❌ Not Double-Checking Trap Type
**Problem**: Wrong trap type = likely trigger
**Solution**: Use Inspect + CALFO for confirmation

### ❌ Mage/Priest Opening Chests
**Problem**: Vulnerable to class-specific traps
**Solution**: Fighter or Thief should open

### ❌ Risking TELEPORTER
**Problem**: Can instantly kill entire party
**Solution**: ALWAYS disarm Teleporters

### ❌ No Thief in Party
**Problem**: Poor inspect/disarm ability
**Solution**: Rely on CALFO + high-level Fighters

### ❌ Ignoring Low HP
**Problem**: "Safe" traps can kill wounded characters
**Solution**: Heal before opening chests

## Advanced Strategies

### Efficiency: When to Skip Inspection

**Skip If**:
- Tier 1 chest on dungeon 1 (low risk, low reward)
- Party is level 20+ and full HP (can tank most traps)
- In a hurry and willing to risk

**Never Skip If**:
- High-tier chest (tier 4-5)
- TELEPORTER is possible
- Party is damaged

### Optimal Party Composition

**Essential**: Thief with AGI 16+
**Highly Recommended**: Priest for CALFO
**Nice to Have**: Fighter for opening

### Level 1 Thief vs. Level 51 Fighter

**Disarm Ability**: Exactly the same!
**Inspect Ability**: Thief is far better (AGI × 6 vs AGI × 1)

**Conclusion**: Thief is better overall for trap handling

## Related

- [Spells](./04-spells.md) - CALFO spell details
- [Party Formation](./03-party-formation.md) - Thief positioning
- [Death & Recovery](./09-death-recovery.md) - If trap kills you
- [Items & Equipment](./11-items-equipment.md) - Treasure items

## Tips Summary

1. **Always have a Thief** (AGI 16+ ideal)
2. **Double-check with CALFO** for important chests
3. **NEVER risk TELEPORTER traps** - always disarm
4. **Check inventory before opening** - drop items if needed
5. **Fighter opens, not Mage** - tank trap damage
6. **Failed disarm without trigger** = correct trap type, retry
7. **High-tier chests** (4-5) = high trap chance, be careful
8. **Tier 5 chests** = 100% item drop, worth the effort
