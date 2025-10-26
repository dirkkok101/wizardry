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
