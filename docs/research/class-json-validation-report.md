# Class JSON Validation Report

**Date**: 2025-11-23
**Validated By**: Claude Code
**Status**: ✅ Mostly Accurate with Minor Clarifications Needed

---

## Summary

All 8 class JSON files (`data/classes/*.json`) have been validated against source material from:
- `docs/research/class-reference.md` (Zimlab Wizardry Fan Page)
- `docs/game-design/02-character-creation.md` (Design documentation)
- Web research on original Wizardry 1 mechanics

**Overall Assessment**: Class data is **accurate** with a few areas requiring clarification regarding spell progression for hybrid classes.

---

## Validation Results by Class

### ✅ Fighter (fighter.json)

**Requirements**: `str: 11` ✓
**Alignment**: No restrictions (`[]`) ✓
**Equipment**: All weapons and armor ✓
**Hit Dice**: `1d10` ✓
**Attacks Per Level**:
- Levels 1-4: 1 attack
- Levels 5-9: 2 attacks
- Levels 10-14: 3 attacks
- Levels 15+: 4 attacks
- ✓ Matches reference: "1 + (level / 5)"

**Spell Access**: None ✓
**Special Abilities**: None (canCriticalHit: false) ✓

**Issues**: None

---

### ✅ Mage (mage.json)

**Requirements**: `int: 11` ✓
**Alignment**: No restrictions (`[]`) ✓
**Equipment**: Dagger/staff only, no armor ✓
**Hit Dice**: `1d4` ✓
**Attacks Per Level**: 1 attack at all levels (`1+: 1`) ✓
**Spell Access**: Mage spells 1-7, minLevel 1 ✓
**Special Abilities**: Can cast mage spells ✓

**Issues**: None

---

### ✅ Priest (priest.json)

**Requirements**: `pie: 11` ✓
**Alignment**: `["good", "evil"]` (cannot be neutral) ✓
**Equipment**:
- Weapons: Blunt only (mace, flail, staff, hammer) ✓
- Armor: All types ✓
- Helmets: None (`[]`) ✓

**Hit Dice**: `1d8` ✓
**Attacks Per Level**:
- Levels 1-4: 1 attack
- Levels 5-9: 2 attacks
- Levels 10+: 3 attacks
- ✓ Reasonable progression

**Spell Access**: Priest spells 1-7, minLevel 1 ✓
**Special Abilities**: Can dispel undead (canDispelUndead: true) ✓

**Issues**: None

---

### ✅ Thief (thief.json)

**Requirements**: `agi: 11` ✓
**Alignment**: `["neutral", "evil"]` (cannot be good) ✓
**Equipment**:
- Weapons: Dagger, short sword ✓
- Armor: Leather only ✓
- Helmets: Leather only ✓

**Hit Dice**: `1d8` ✓
**Attacks Per Level**:
- Levels 1-4: 1 attack
- Levels 5-9: 2 attacks
- Levels 10+: 3 attacks

**Spell Access**: None ✓
**Special Abilities**:
- Disarm traps ✓
- Open locked chests ✓
- Critical hit backstab (canCriticalHit: true) ✓

**Issues**: None

---

### ⚠️ Bishop (bishop.json)

**Requirements**: `int: 12, pie: 12` ✓
**Alignment**: `["good", "evil"]` (cannot be neutral)
**⚠️ KNOWN CONFLICT**: Source material shows conflicting information:
- Zimlab says: "Any alignment"
- Strategy Wiki says: "Good or Evil only" (not Neutral)
- **JSON uses**: `["good", "evil"]` (Strategy Wiki version)

**Equipment**:
- Weapons: Mace, flail, staff (blunt weapons) ✓
- Armor: All types ✓
- Helmets: None (`[]`) ✓

**Hit Dice**: `1d6` ✓
**Attacks Per Level**: 1 attack at all levels (`1+: 1`) ✓
**Spell Access**: Both mage and priest spells 1-7, minLevel 1 ✓
**Special Abilities**:
- Can cast both spell types ✓
- Can identify cursed items (canIdentifyItems: true) ✓

**Issues**:
1. ⚠️ Alignment restriction conflict documented in source material (see `class-reference.md:116`)
2. Decision made to use Strategy Wiki version (`["good", "evil"]`)

---

### ⚠️ Samurai (samurai.json)

**Requirements**:
- `str: 15` ✓
- `int: 11` ✓
- `pie: 10` ✓
- `vit: 14` ✓
- `agi: 10` ✓

**Alignment**: `["good", "neutral"]` (cannot be evil) ✓
**Equipment**: All weapons and armor ✓
**Hit Dice**: `1d10` ✓
**Attacks Per Level**: Same as Fighter ✓
**Spell Access**:
- Mage spells 1-6 (maxLevel: 6) ✓
- **⚠️ minLevel: 4** - Needs clarification

**Special Abilities**:
- Can use all weapons/armor ✓
- Casts mage spells (max level 6) ✓
- Can critical hit (canCriticalHit: true) ✓

**Issues**:
1. ⚠️ **minLevel: 4** - Does this mean:
   - Option A: Samurai cannot cast spells until character level 4?
   - Option B: Samurai start at spell level 1 but with delayed progression?

2. **Web research findings**:
   - Samurai learn spells much slower than pure Mages
   - Approximately 1 spell level every 4 character levels
   - Example: Level 13 Samurai has only tier 4 Mage spells
   - To reach tier 6 spells: level 18+

3. **Current implementation discrepancy**:
   - `SpellLearningService.ts` uses same spell level requirements for all casters
   - Does not account for slower progression for hybrid classes

**Recommendation**: Clarify minLevel semantics and implement slower spell progression for hybrid classes

---

### ⚠️ Lord (lord.json)

**Requirements**:
- `str: 15` ✓
- `int: 12` ✓
- `pie: 12` ✓
- `vit: 15` ✓
- `agi: 14` ✓
- `luc: 15` ✓

**Alignment**: `["good"]` (must be good only) ✓
**Equipment**: All weapons and armor ✓
**Hit Dice**: `1d10` ✓
**Attacks Per Level**: Same as Fighter ✓
**Spell Access**:
- Priest spells 1-6 (maxLevel: 6) ✓
- **⚠️ minLevel: 4** - Needs clarification (same as Samurai)

**Special Abilities**:
- Can use all weapons/armor ✓
- Casts priest spells (max level 6) ✓
- Can dispel undead (canDispelUndead: true) ✓
- Can critical hit (canCriticalHit: true) ✓

**Issues**:
1. ⚠️ **minLevel: 4** - Same clarification needed as Samurai
2. **Web research findings**:
   - Lord learns spells slower than pure Priests
   - Approximately 1 spell level every 4 character levels
   - Example: Level 13 Lord has tier 5 Priest spells
   - Level 16 Lord has tier 7 spells

**Recommendation**: Same as Samurai - clarify minLevel and implement slower progression

---

### ✅ Ninja (ninja.json)

**Requirements**: All stats `17` ✓
**Alignment**: `["evil"]` (must be evil only) ✓
**Equipment**:
- Weapons: Dagger, short sword, shuriken, staff, nunchaku ✓
- Armor: None (gets AC bonus when unarmored) ✓
- Helmets: None ✓

**Hit Dice**: `1d8` ✓
**Attacks Per Level**:
- Levels 1-4: 2 attacks (base 2!)
- Levels 5-9: 3 attacks
- Levels 10-14: 4 attacks
- Levels 15+: 5 attacks
- ✓ Matches reference: "2 + (level / 5)"

**Spell Access**: None ✓
**Special Abilities**:
- Critical hits (decapitate) ✓
- AC bonus when unarmored ✓
- Fast attacks ✓

**Issues**: None

---

## Critical Issues Summary

### 1. Hybrid Class Spell Progression (Samurai/Lord)

**Problem**: The `minLevel: 4` field in spellAccess is ambiguous and may not correctly represent the original game's slower spell progression for hybrid classes.

**Evidence**:
- Web research indicates hybrid classes learn spells at approximately 1/4 the rate of pure casters
- Current `SpellLearningService.ts` treats all casters the same
- Pure casters: 1 spell level every 2 character levels
- Hybrid classes should: 1 spell level every 4 character levels

**Impact**: Medium - Affects game balance and spell progression accuracy

**Recommendation**:
1. Clarify minLevel field documentation
2. Update SpellLearningService to use different progression tables for hybrid vs pure casters
3. Consider renaming minLevel to characterLevelRequired or similar

### 2. Bishop Alignment Restriction

**Problem**: Source material conflict between "Any" and "Good/Evil only"

**Resolution**: JSON uses `["good", "evil"]` based on Strategy Wiki
**Impact**: Low - Documented in class-reference.md
**Status**: Acceptable as-is, conflict noted

---

## Zod Schema Requirements

Based on this validation, the Zod schema should enforce:

1. **Required fields**: All fields in ClassData interface
2. **Stat requirements**: Only valid stat keys (str, int, pie, vit, agi, luc)
3. **Alignment restrictions**: Only "good", "neutral", "evil"
4. **Hit dice**: Valid dice notation (1d4, 1d6, 1d8, 1d10)
5. **Spell access**:
   - Valid casterType (mage/priest)
   - minLevel >= 1
   - maxLevel between 1-7
6. **Attacks per level**: Valid range notation ("1-4", "5-9", "10+")
7. **XP table**: Exactly 11 entries (levels 2-13)

---

## Sources

- [Zimlab Wizardry Fan Page - Class Reference](https://www.zimlab.com/wizardry)
- [Wizardry Wiki - Samurai](https://wizardry.fandom.com/wiki/Samurai)
- [StrategyWiki - Trebor's Castle](https://strategywiki.org/wiki/Wizardry:_Proving_Grounds_of_the_Mad_Overlord/Trebor's_castle)
- [GameFAQs - Reference Guide](https://gamefaqs.gamespot.com/nes/563479-wizardry-proving-grounds-of-the-mad-overlord/faqs/39644)

---

**Last Updated**: 2025-11-23
**Next Steps**:
1. Implement Zod validation schemas
2. Create validation tests
3. Consider updating SpellLearningService for hybrid class progression
