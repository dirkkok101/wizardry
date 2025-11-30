# Monster Data Audit Script

Comprehensive validation of all monster JSON files against Apple II Wizardry 1 source data.

## Usage

```bash
npx ts-node scripts/audit-monsters.ts
```

## Purpose

This script validates the 101 monster JSON files in `data/monsters/` against the authoritative Apple II Wizardry 1 source code data documented in `docs/research/monster-technical-reference.md`.

## Validation Categories

### 1. Partner Chain Validation

- Verifies partner `monsterId` references exist in loaded monsters
- Detects self-referential loops (reported as INFO, not errors - valid in original)
- Example: Murphy's Ghost has 80% chance to spawn another Murphy's Ghost

### 2. Consistency Validation

Cross-field consistency checks:

| Ability | Required Field |
|---------|---------------|
| `multiple_attacks` | `damage.length > 1` |
| `regeneration` | `regeneration > 0` |
| `level_drain` | `levelDrain` defined |
| `breath_weapon` | `breathWeapon` defined |
| `can_run` | `canFlee: true` |

### 3. Completeness Validation

- All 101 monsters present (numericId 0-100)
- Werdna (ID 96) has `isBoss: true`
- Reports total monster count

### 4. Semantic Validation

- Boss monsters have substantial stats (HP ≥ 30, XP ≥ 1000)
- Dragon-class monsters typically have breath weapons

## Output Format

```
════════════════════════════════════════════════════════════
                  MONSTER DATA AUDIT REPORT
════════════════════════════════════════════════════════════

Scanned: 101 monsters
Issues found: 9 (0 errors, 0 warnings, 9 info)

INFO (9)
────────────────────────────────────────────────────────────
  [partner] murphy_ghost: Self-referential partner chain (80% → self)
  ...

SUMMARY BY CATEGORY
────────────────────────────────────────────────────────────
  partner           9 █████████
  reference         0
  spell             0
  consistency       0
  completeness      0
  semantic          0
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No errors found (warnings and info are acceptable) |
| 1 | One or more errors found |

## Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| ERROR | Data inconsistency that will cause bugs | Must fix |
| WARNING | Potential issue worth investigating | Should review |
| INFO | Notable but valid configuration | No action needed |

## Self-Referential Partner Chains

The following monsters have valid self-referential partner chains per the original Apple II source:

| Monster | Chance | Notes |
|---------|--------|-------|
| Murphy's Ghost | 80% | Can spawn infinite ghost groups |
| Creeping Coin | 100% | Always spawns more coins |
| Gaze Hound | 20% | Pack behavior |
| Lifestealer | 50% | Undead swarm |
| Lvl 1 Ninja | 20% | Ninja squad |
| Lvl 8 Fighter | 20% | Fighter group |
| Lvl 10 Fighter | 10% | Elite fighters |
| Troll | 5% | Rare troll pack |
| Vampire | 15% | Vampire coven |

These are reported as INFO items, not errors.

## Adding New Validations

The script is self-contained in `scripts/audit-monsters.ts`. To add new validations:

1. Create a new validation function following the pattern:
   ```typescript
   function validateNewCategory(monsters: Map<string, MonsterData>): ValidationIssue[] {
     const issues: ValidationIssue[] = []
     // ... validation logic
     return issues
   }
   ```

2. Add the function call to the `allIssues` array in `main()`:
   ```typescript
   const allIssues = [
     ...loadErrors,
     ...validatePartnerChains(monsters),
     ...validateConsistency(monsters),
     ...validateCompleteness(monsters),
     ...validateSemantics(monsters),
     ...validateNewCategory(monsters)  // Add here
   ]
   ```

3. Update the `ValidationCategory` type if adding a new category.

## Related Documentation

- `docs/research/monster-technical-reference.md` - Authoritative source data
- `src/app/validation/MonsterSchema.ts` - Zod schema for monster validation
- `data/monsters/*.json` - Monster data files
