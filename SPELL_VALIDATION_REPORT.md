# Spell Validation Report

**Date**: 2025-11-23
**Validated Against**:
- `docs/research/spell-reference.md`
- `docs/game-design/04-spells.md`

---

## Executive Summary

**Status**: ❌ **VALIDATION FAILED**

**Totals**:
- Total Spell Files: 56
- Mage Spells: 22
- Priest Spells: 34
- Critical Errors: 8
- Warnings: 1

---

## Critical Errors Found

### 1. Missing Spell Files (3 errors)

#### ❌ Missing: TILTOWAIT (Mage Level 6)
- **Current State**: We have two TILTOWAIT files, both at level 7:
  - `tiltowait.json` (level 7)
  - `tiltowait_7.json` (level 7)
- **Expected**: Should have one at level 6 and one at level 7
- **Fix Required**: Rename `tiltowait.json` → `tiltowait_6.json` and change level to 6

#### ❌ Missing: LOMILWA (Mage Level 6)
- **Current State**: `lomilwa.json` is incorrectly set as priest level 6
- **Expected**: Should be mage level 6
- **Fix Required**: Change `lomilwa.json`:
  - `casterType`: "priest" → "mage"
  - Keep at level 6

#### ❌ Missing: MALIKTO (Priest Level 6)
- **Current State**: We have two MALIKTO files, both at level 7:
  - `malikto.json` (level 7, INCORRECT data)
  - `malikto_7.json` (level 7, correct data)
- **Expected**: Should have one at level 6 and one at level 7
- **Fix Required**: Rename `malikto.json` → `malikto_6.json` and change level to 6

---

### 2. Incorrect Spell Data (1 error)

#### ❌ MALIKTO.json has WRONG spell definition
- **File**: `data/spells/malikto.json`
- **Current Data**:
  ```json
  {
    "category": "healing",
    "description": "Fully restores all party members to maximum HP",
    "target": "all_allies",
    "healing": { "type": "full" }
  }
  ```
- **Expected Data** (from research):
  - Level 6: "Petrify" - Turn enemies to stone (single group)
  - Level 7: "Petrification" - Turn all enemies to stone (all groups)
- **Fix Required**: Replace with correct petrification spell data:
  ```json
  {
    "id": "malikto_6",
    "name": "MALIKTO",
    "level": 6,
    "casterType": "priest",
    "category": "offensive",
    "target": "group",
    "description": "Turn enemies to stone",
    "castableIn": ["combat"],
    "effect": {
      "type": "petrification",
      "target": "group"
    }
  }
  ```

---

### 3. Missing Required Fields (4 errors)

#### ❌ Instant Death/Petrification spells missing 'effect' field

The following spells are marked as "offensive" but don't have standard "damage" fields. They need "effect" fields instead:

1. **badi.json** (Priest Level 5)
   - Type: Instant death to enemy group
   - Missing: `effect` field

2. **badi_6.json** (Priest Level 6)
   - Type: Instant death to enemy group
   - Missing: `effect` field

3. **mabadi.json** (Priest Level 5)
   - Type: Instant death to all enemy groups
   - Missing: `effect` field

4. **mabadi_7.json** (Priest Level 7)
   - Type: Instant death to all enemy groups
   - Missing: `effect` field

5. **malikto_7.json** (Priest Level 7)
   - Type: Petrification (turn all enemies to stone)
   - Missing: `effect` field

**Fix Required**: Add `effect` field to all these spells:
```json
{
  "effect": {
    "type": "instant_death"  // or "petrification" for MALIKTO
  }
}
```

---

## Warnings

### ⚠️ Extra Spell (1 warning)

#### LOMILWA appears at Priest Level 6
- **File**: `data/spells/lomilwa.json`
- **Issue**: This is actually the MAGE version misclassified as priest
- **Resolution**: Will be fixed by error fix #2 above

---

## Detailed Spell Count Analysis

### Mage Spells

| Level | Expected | Actual | Status | Spells Found |
|-------|----------|--------|--------|--------------|
| 1 | 4 | 4 | ✓ | DUMAPIC, HALITO, KATINO, MOGREF |
| 2 | 3 | 3 | ✓ | DILTO, MELITO, SOPIC |
| 3 | 2 | 2 | ✓ | MAHALITO, MOLITO |
| 4 | 3 | 3 | ✓ | DALTO, LAHALITO, MORLIS |
| 5 | 3 | 3 | ✓ | LAKANITO, MADALTO, ZILWAN |
| 6 | 5 | 3 | ❌ | HAMAN, MAHAMAN, MALOR (missing: LOMILWA, TILTOWAIT) |
| 7 | 3 | 4 | ❌ | HAMAN, MAHAMAN, 2× TILTOWAIT (duplicate) |

**Expected Mage Level 6**: HAMAN, LOMILWA, MAHAMAN, MALOR, TILTOWAIT
**Expected Mage Level 7**: HAMAN, MAHAMAN, TILTOWAIT

---

### Priest Spells

| Level | Expected | Actual | Status | Spells Found |
|-------|----------|--------|--------|--------------|
| 1 | 5 | 5 | ✓ | BADIOS, DIOS, KALKI, MILWA, PORFIC |
| 2 | 4 | 4 | ✓ | CALFO, MANIFO, MATU, MONTINO |
| 3 | 5 | 5 | ✓ | BADIAL, BAMATU, DIAL, LATUMAPIC, LOMILWA |
| 4 | 7 | 7 | ✓ | BADIALMA, BAMORDI, DALTO, KANDI, KATU, LATUMOFIS, MAPORFIC |
| 5 | 6 | 6 | ✓ | BADI, BADIALMA, DIAL, KADORTO, LOKTOFEIT, MABADI |
| 6 | 3 | 3 | ❌ | BADI, LOMILWA (wrong), LORTO (missing: MALIKTO) |
| 7 | 3 | 4 | ❌ | DI, MABADI, 2× MALIKTO (one is wrong) |

**Expected Priest Level 6**: BADI, LORTO, MALIKTO
**Expected Priest Level 7**: DI, MABADI, MALIKTO

---

## Required Fixes Summary

### File Changes Required

1. **Rename**: `tiltowait.json` → `tiltowait_6.json`
   - Change level: 7 → 6
   - Update description: "Ultimate damage spell" → "Massive damage to all groups"

2. **Update**: `lomilwa.json`
   - Change casterType: "priest" → "mage"
   - Keep level: 6

3. **Rename**: `malikto.json` → `malikto_6.json`
   - Change level: 7 → 6
   - Change category: "healing" → "offensive"
   - Change target: "all_allies" → "group"
   - Change description: "Fully restores all party members to maximum HP" → "Turn enemies to stone"
   - Remove: `healing` field
   - Add: `effect: { type: "petrification", target: "group" }`

4. **Add effect field** to:
   - `badi.json`: `effect: { type: "instant_death" }`
   - `badi_6.json`: `effect: { type: "instant_death" }`
   - `mabadi.json`: `effect: { type: "instant_death" }`
   - `mabadi_7.json`: `effect: { type: "instant_death" }`
   - `malikto_7.json`: `effect: { type: "petrification" }`

---

## Expected Results After Fixes

### Mage Spells (should be 23 total)
- Level 1: 4 spells ✓
- Level 2: 3 spells ✓
- Level 3: 2 spells ✓
- Level 4: 3 spells ✓
- Level 5: 3 spells ✓
- Level 6: 5 spells (after fixes)
- Level 7: 3 spells (after fixes)

### Priest Spells (should be 33 total)
- Level 1: 5 spells ✓
- Level 2: 4 spells ✓
- Level 3: 5 spells ✓
- Level 4: 7 spells ✓
- Level 5: 6 spells (after effect fields added)
- Level 6: 3 spells (after fixes)
- Level 7: 3 spells (after fixes)

**Total Expected**: 56 spell files (matches current count, just need corrections)

---

## Validation Checklist

After applying fixes, re-run validation to confirm:

- [ ] All 56 spell files parse correctly as JSON
- [ ] All required fields present in each spell
- [ ] No duplicate spell definitions at same level
- [ ] Mage level 6 has exactly 5 spells: HAMAN, LOMILWA, MAHAMAN, MALOR, TILTOWAIT
- [ ] Mage level 7 has exactly 3 spells: HAMAN, MAHAMAN, TILTOWAIT
- [ ] Priest level 6 has exactly 3 spells: BADI, LORTO, MALIKTO
- [ ] Priest level 7 has exactly 3 spells: DI, MABADI, MALIKTO
- [ ] All instant death spells have `effect` field
- [ ] All damage spells have `damage` field
- [ ] All healing spells have `healing` field
- [ ] All utility spells validated

---

## Next Steps

1. Apply the 8 fixes listed above
2. Re-run validation script: `node scripts/validate-spells.mjs`
3. Confirm all errors resolved
4. Update any TypeScript interfaces if needed
5. Commit corrected spell files

---

**End of Report**
