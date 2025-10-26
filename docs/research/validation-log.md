# Research Validation Log

**Started:** 2025-10-26
**Validator:** Claude Code
**Method:** Source-by-source cross-reference validation

---

## Validation Sessions

### Session 1: High-Priority Sources (2025-10-26)

#### Source #35: Strategy Wiki - Trebor's Castle
- **URL:** https://strategywiki.org/wiki/Wizardry:_Proving_Grounds_of_the_Mad_Overlord/Trebor's_castle
- **Status:** ✅ Validated
- **Target Files:** class-reference.md
- **Findings:**
  - **DISCREPANCY**: Bishop alignment restriction listed as "Good or Evil (not Neutral)" in source, but our docs say "No alignment restrictions"
  - **CONFIRMED**: All other class requirements match our documentation
  - **CONFIRMED**: Equipment restrictions match (Priest no helmets, Mage no armor, etc.)
  - **CONFIRMED**: Elite class stat requirements all match
  - **NEW DATA**: Class change mechanics - attributes reset to racial minimums when changing class
  - **NEW DATA**: Class change - previously learned spells remembered with minimum spell points restored
  - **NEW DATA**: Character ages during class change retraining
- **Actions:**
  - Need to verify Bishop alignment restriction with additional sources
  - Added class change details to class-reference.md

#### Source #59: Faster Thoughts - Class Changes
- **URL:** https://wizardry.fasterthoughts.io/adventurer-customization/class-changes/
- **Status:** ❌ Not Applicable
- **Target Files:** N/A
- **Findings:**
  - This source covers Wizardry Variants Daphne or modern remake, NOT Wizardry 1
  - Contains completely different mechanics (skill systems, passive abilities, shop-based class changes)
  - Mechanics described (angle bracket abilities, wanderer class, summonable heroes) do not exist in original Wizardry 1
- **Actions:**
  - Mark source #59 as inapplicable to Wizardry 1 research
  - Do NOT use this source for validation

---

## Discrepancies Found

### 1. Bishop Alignment Restriction (UNRESOLVED)
- **File:** class-reference.md
- **Current Documentation:** "No alignment restrictions"
- **Source #35 (Strategy Wiki):** "Good or Evil (not Neutral)"
- **Severity:** Medium
- **Status:** Pending additional source verification
- **Note:** This is a significant discrepancy that affects character creation. Need to check authoritative sources (Zimlab, original manual, or game code) to resolve.

### 2. WERDNA Hit Points (MAJOR DISCREPANCY)
- **File:** monster-reference.md
- **Current Documentation:** HP 210-300
- **Source #31 (Strategy Wiki):** HP 10d10+20 = 30-120
- **Severity:** Critical
- **Status:** Requires investigation
- **Note:** Our documentation shows 210-300 HP for Werdna, but Strategy Wiki shows 10d10+20 which only yields 30-120. This is a massive discrepancy (3.5x-5x difference). Need to verify against original source (Wizardry Wiki #3) to determine correct value. This significantly affects game difficulty assessment.

### 3. Boss Monster XP Values (Multiple discrepancies)
- **File:** monster-reference.md
- **Discrepancies:**
  - Greater Demon: Our docs 44,570 XP vs Strategy Wiki 44,090 XP (480 XP difference)
  - Poison Giant: Our docs 41,320 XP vs Strategy Wiki 40,840 XP (480 XP difference)
  - Frost Giant: Our docs 41,355 XP (need to verify against Strategy Wiki)
  - Will O' Wisp: Our docs 43,320 XP (need to verify against Strategy Wiki)
- **Severity:** Medium
- **Status:** Requires cross-reference with Wizardry Wiki #3
- **Note:** Pattern suggests potential systematic error in XP recording. All differences appear to be ~480-500 XP. Need to verify which source is authoritative.

### 4. ValueA/ValueB Spell Point Mechanics (RESEARCH GAP)
- **File:** spell-reference.md
- **Expected:** Detailed ValueA/ValueB spell point cost system, casting formulas
- **Found:** Simple "1 point per spell per level" system documented
- **Sources Checked:** #13 (Jeff Ludwig - SNES platform mismatch), #15 (Zimlab - quick reference only)
- **Severity:** Low-Medium (mechanics gap, not accuracy issue)
- **Status:** Requires additional sources
- **Note:** The ValueA/ValueB system may not exist in Wizardry 1, or may be present but undocumented in checked sources. Current documentation states each spell costs 1 point from its level pool. Need to verify with Zimlab FAQ (#41), GameFAQs (#2), or source code (#56).

---

## New Information Extracted

### Class Change Mechanics (from Source #35)
- Attributes reset to racial minimums when changing class
- Experience resets to zero, starting at level 1
- Equipment retained but unequipped
- Previously learned spells remembered with minimum spell points restored
- Character ages during retraining
- All spells in a learned spell level eventually become available

**Action:** Added detailed class change mechanics to class-reference.md

---

### Session 2: Combat Mechanics Validation (2025-10-26)

#### Source #32: Faster Thoughts - Damage Mechanics
- **URL:** https://wizardry.fasterthoughts.io/mechanics/damage-mechanics/
- **Status:** ❌ Not Applicable
- **Target Files:** N/A
- **Findings:**
  - This source covers **Wizardry Variants Daphne**, a modern game/remake, NOT Wizardry 1
  - Contains completely different damage mechanics:
    - Complex multiplicative damage formula with passive skills, type advantages
    - Sure Hit damage (1.8x-2.0x multipliers)
    - Warrior's Battle Cry skill formula
    - Defense penetration percentages (30% from axes)
    - Follow-up attack probability calculations
  - These mechanics do NOT exist in original 1981 Wizardry
- **Actions:**
  - Confirmed source #32 is inapplicable to Wizardry 1 research
  - Do NOT use this source for validation
  - Marked in source-materials.md

#### Source #31: Strategy Wiki - Enemies
- **URL:** https://strategywiki.org/wiki/Wizardry:_Proving_Grounds_of_the_Mad_Overlord/Enemies
- **Status:** ✅ Validated
- **Target Files:** monster-reference.md, combat-formulas.md
- **Findings:**
  - **DATA FORMAT**: Provides complete monster database with HP as dice notation (e.g., 10d10+20)
  - **CONFIRMED**: Most monster AC values match our documentation
  - **CONFIRMED**: Most monster HP ranges match when dice are calculated
  - **DISCREPANCY**: WERDNA HP - Strategy Wiki shows 10d10+20 (30-120 HP range), our docs show 210-300 HP
  - **DISCREPANCY**: Greater Demon XP - Strategy Wiki shows 44,090 XP, our docs show 44,570 XP
  - **DISCREPANCY**: Poison Giant XP - Strategy Wiki shows 40,840 XP, our docs show 41,320 XP
  - **DISCREPANCY**: Frost Giant XP - Need to verify (our docs show 41,355)
  - **DISCREPANCY**: Will O' Wisp XP - Need to verify (our docs show 43,320)
  - **NOTE**: Strategy Wiki does NOT contain combat formulas (hit chance, damage calculation, initiative) - only monster stat tables
- **Actions:**
  - Investigate WERDNA HP discrepancy - 10d10+20 = 30-120, not 210-300
  - Cross-check boss XP values with original source (Wizardry Wiki #3)
  - Update monster-reference.md if discrepancies confirmed
  - Note that combat-formulas.md cannot be validated from this source (no formulas present)

---

### Session 3: Spell System Validation (2025-10-26)

#### Source #13: Jeff Ludwig - Magic List
- **URL:** http://jeffludwig.com/wizardry1-2-3/magiclist.php
- **Status:** ⚠️ Partial - Different Platform (SNES)
- **Target Files:** spell-reference.md
- **Findings:**
  - **PLATFORM MISMATCH**: This source appears to be for the SNES "1st Trilogy" version, NOT the original Apple II/DOS Wizardry 1
  - **DIFFERENT SPELL NAMES**: SNES uses different names (e.g., "Fire Bolt" vs "HALITO", "Nuke" vs "TILTOWAIT")
  - **DIFFERENT DAMAGE VALUES**: SNES spell damage differs from original (e.g., Fire Bolt 2d6+3 vs HALITO 1d8)
  - **MISSING DATA**: No spell point costs, ValueA/ValueB mechanics, or casting formulas present
  - **DIFFERENT SPELL COUNT**: SNES has 19 Mage + 20 Priest = 39 spells vs original's 65+ spells
- **Actions:**
  - Mark source #13 as SNES version, not authoritative for Apple II/DOS Wizardry 1
  - Cannot use for validation of original spell system
  - Update source-materials.md to note platform difference

#### Source #15: Zimlab - Spells (Recovered)
- **URL:** https://www.zimlab.com/wizardry/recovered/jh/wizardry/spells.html
- **Status:** ⚠️ Limited - Quick Reference Only
- **Target Files:** spell-reference.md
- **Findings:**
  - **QUICK REFERENCE FORMAT**: Page is a brief spell table, not comprehensive mechanics documentation
  - **DATA AVAILABLE**: Spell names, when used (Combat/Camp/Any Time), what it affects (Party/Monster/etc.), brief descriptions
  - **MISSING DATA**: No spell point costs, no ValueA/ValueB mechanics, no casting success formulas, no resistance mechanics
  - **EXAMPLE**: HALITO described as "1-8 points of fire damage" to single monster during combat (matches our docs)
  - **CONCLUSION**: This is an archived quick-reference guide, not a complete mechanical ruleset
- **Actions:**
  - Source #15 lacks the expected spell point cost system details
  - Cannot validate ValueA/ValueB mechanics from this source
  - Update source-materials.md to note limited scope

#### Spell Validation Matrix - Unable to Complete

**Expected Data from Sources:**
- Spell point costs (ValueA/ValueB mechanics)
- Casting success rate formulas
- Resistance check mechanics
- Dispel mechanics

**Actual Data from Sources:**
- Source #13: Platform mismatch (SNES vs Apple II), different spell system
- Source #15: Quick reference only, no cost/formula mechanics

**CRITICAL GAP IDENTIFIED:**
The ValueA/ValueB spell point cost system is not documented in either source #13 or #15. This is a significant gap in our research. The original spell-reference.md states:
- "Spell Points: Characters have separate spell point pools for each spell level (1-7)"
- "Each spell costs **1 point** from its level pool"

However, the task plan expected to find ValueA/ValueB mechanics (variable spell costs). This suggests either:
1. The ValueA/ValueB system doesn't exist in Wizardry 1 (was added in later games)
2. This mechanic exists but is not documented in sources #13 and #15
3. The spell point system is simpler than expected (1 point per spell per level)

**Recommendation:**
- Need to check additional sources: Zimlab FAQ (#41), GameFAQs Guide (#2), or game code analysis (#56)
- Current spell-reference.md appears accurate for basic spell effects
- Spell point cost system may be simpler than initially thought

#### Spell Content Cross-Validation (Limited Scope)

Based on Zimlab source #15 quick reference, validating spell names and basic effects:

**Mage Spells - Sample Validation:**
| Spell | Our Docs Level | Our Effect | Source #15 Effect | Match? |
|-------|---------------|------------|-------------------|---------|
| HALITO | 1 | 1d8 fire damage | 1-8 fire damage | ✅ |
| KATINO | 1 | Sleep enemy group | Sleep | ✅ |
| DUMAPIC | 1 | Show coordinates | Shows position | ✅ |
| MOGREF | 1 | -2 AC to ally | Improves AC | ✅ |
| MAHALITO | 3 | 4d6 fire damage | Not verified | ⚠️ |
| TILTOWAIT | 6-7 | Massive damage all groups | Not verified | ⚠️ |

**Priest Spells - Sample Validation:**
| Spell | Our Docs Level | Our Effect | Source #15 Effect | Match? |
|-------|---------------|------------|-------------------|---------|
| DIOS | 1 | 1d8 HP heal | Heals 1-8 HP | ✅ |
| BADIOS | 1 | 1d8 damage undead | Harms undead | ✅ |
| MILWA | 1 | Light | Illuminates | ✅ |
| KALKI | 1 | -1 AC party | Bless (+AC) | ✅ |
| PORFIC | 1 | -4 AC single | Shield (+AC) | ✅ |
| DI | 7 | Resurrect (90%) | Resurrect dead | ✅ |

**Validation Result:** Basic spell effects and names match between our documentation and Source #15. However, detailed mechanics (costs, formulas) not available for validation.

---
