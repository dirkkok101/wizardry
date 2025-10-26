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
