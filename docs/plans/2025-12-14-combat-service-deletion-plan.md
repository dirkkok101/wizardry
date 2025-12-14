# CombatService Deprecation and Test Migration Plan

## Executive Summary

The monolithic `CombatService.ts` (4,239 lines) has been refactored into focused services under `src/app/services/combat/`. The `CombatServiceFacade` provides backward compatibility. This plan addresses migration/deletion of **34 test files** that still import from the deprecated `CombatService`.

---

## 1. Test File Inventory and Analysis

### Test Files Importing from CombatService (34 total)

| # | Test File | Tests Functionality | Recommendation |
|---|-----------|---------------------|----------------|
| 1 | `CombatService.spec.ts` | Initiative, initiateCombat, createCommand, calculateHitChance | **MIGRATE** - Update to facade |
| 2 | `CombatService.initiative.spec.ts` | Detailed initiative with agility modifiers | **DELETE** - Covered by `InitiativeService.spec.ts` |
| 3 | `CombatService.executeCommand.spec.ts` | Command execution basics | **DELETE** - Covered by `CommandExecutor.spec.ts` |
| 4 | `CombatService.executeRound.spec.ts` | Round execution, dead combatant skipping | **DELETE** - Covered by `CombatRoundOrchestrator.spec.ts` |
| 5 | `CombatService.surprise.spec.ts` | Surprise mechanics | **MIGRATE** - Move to `SurpriseService.spec.ts` |
| 6 | `CombatService.flee.spec.ts` | Flee chance formula | **MIGRATE** - Move to `FleeService.spec.ts` |
| 7 | `CombatService.resolveAttack.spec.ts` | Attack resolution basics | **MIGRATE** - Move to `AttackResolutionService.spec.ts` |
| 8 | `CombatService.dispel.spec.ts` | Dispel/Turn Undead mechanics | **MIGRATE** - Move to `DispelAction.spec.ts` |
| 9 | `CombatService.audit.spec.ts` | Combat audit/debugging | **KEEP** - Validates facade audit behavior |
| 10 | `CombatService.monsterAI.spec.ts` | Monster action selection, targeting | **MIGRATE** - Move to `MonsterAIService.spec.ts` |
| 11 | `CombatService.monsterPositioning.spec.ts` | Monster formation, advance | **DELETE** - Covered by `MonsterAdvancementService.spec.ts` |
| 12 | `CombatService.criticalHits.spec.ts` | Critical hits/instant kill | **MIGRATE** - Move to `AttackResolutionService.spec.ts` |
| 13 | `CombatService.callForHelp.spec.ts` | Call for help mechanic | **MIGRATE** - Move to `CallForHelpAction.spec.ts` |
| 14-20 | `CombatService.phase2-8.spec.ts` | Phase implementation tests | **DELETE** - Historical/redundant |
| 21 | `CombatService.multipleAttacks.spec.ts` | Multi-attack mechanics | **MIGRATE** - Move to `AttackResolutionService.spec.ts` |
| 22 | `CombatService.helplessDamage.spec.ts` | Helpless target damage | **MIGRATE** - Move to `AttackResolutionService.spec.ts` |
| 23 | `CombatService.monsterIdentification.spec.ts` | LATUMAPIC identification | **KEEP** - Integration test |
| 24 | `CombatService.doubleDamage.spec.ts` | Double damage mechanics | **MIGRATE** - Move to `AttackResolutionService.spec.ts` |
| 25 | `CombatService.partyRepositioning.spec.ts` | Party repositioning after deaths | **MIGRATE** - Move to `PartyFormationService.spec.ts` |
| 26 | `CombatService.strengthModifiers.spec.ts` | Strength attack modifiers | **MIGRATE** - Move to `AttackResolutionService.spec.ts` |
| 27 | `CombatService.weaponSwings.spec.ts` | Weapon swing counts | **MIGRATE** - Move to `AttackResolutionService.spec.ts` |
| 28 | `CombatService.spellDegradation.spec.ts` | Spell degradation system | **MIGRATE** - Move to `StatusEffectService.spec.ts` |
| 29 | `CombatService.statusRecovery.spec.ts` | Status recovery mechanics | **MIGRATE** - Move to `CharacterRecoveryService.spec.ts` |
| 30 | `CombatService.demoralization.spec.ts` | Monster demoralization | **MIGRATE** - Merge into `FleeService.spec.ts` |
| 31 | `CombatService.purposedWeapons.spec.ts` | Purposed weapon bonuses | **MIGRATE** - Move to `AttackResolutionService.spec.ts` |
| 32 | `StatusRecovery.spec.ts` | Status recovery (duplicate) | **DELETE** - Redundant |
| 33 | `Combat.e2e.spec.ts` | End-to-end combat flow | **MIGRATE** - Update to facade |
| 34 | `Combat.performance.spec.ts` | Performance benchmarks | **MIGRATE** - Update to facade |

---

## 2. Categorization Summary

### Files to DELETE (13 files) - Redundant Coverage

```
CombatService.initiative.spec.ts      # Covered by InitiativeService.spec.ts
CombatService.executeCommand.spec.ts  # Covered by CommandExecutor.spec.ts
CombatService.executeRound.spec.ts    # Covered by CombatRoundOrchestrator.spec.ts
CombatService.monsterPositioning.spec.ts # Covered by MonsterAdvancementService.spec.ts
CombatService.phase2.spec.ts          # Historical
CombatService.phase3.spec.ts          # Historical
CombatService.phase4.spec.ts          # Historical
CombatService.phase5.spec.ts          # Historical
CombatService.phase6.spec.ts          # Historical
CombatService.phase7.spec.ts          # Historical
CombatService.phase8.spec.ts          # Historical
StatusRecovery.spec.ts                # Duplicate
```

### Files to MIGRATE (18 files) - Valuable Tests

| File | Target Location |
|------|-----------------|
| `CombatService.surprise.spec.ts` | `combat/__tests__/SurpriseService.spec.ts` |
| `CombatService.flee.spec.ts` | `combat/__tests__/FleeService.spec.ts` |
| `CombatService.resolveAttack.spec.ts` | `combat/__tests__/AttackResolutionService.spec.ts` |
| `CombatService.criticalHits.spec.ts` | `combat/__tests__/AttackResolutionService.spec.ts` |
| `CombatService.multipleAttacks.spec.ts` | `combat/__tests__/AttackResolutionService.spec.ts` |
| `CombatService.helplessDamage.spec.ts` | `combat/__tests__/AttackResolutionService.spec.ts` |
| `CombatService.doubleDamage.spec.ts` | `combat/__tests__/AttackResolutionService.spec.ts` |
| `CombatService.strengthModifiers.spec.ts` | `combat/__tests__/AttackResolutionService.spec.ts` |
| `CombatService.weaponSwings.spec.ts` | `combat/__tests__/AttackResolutionService.spec.ts` |
| `CombatService.purposedWeapons.spec.ts` | `combat/__tests__/AttackResolutionService.spec.ts` |
| `CombatService.dispel.spec.ts` | `combat/__tests__/DispelAction.spec.ts` |
| `CombatService.callForHelp.spec.ts` | `combat/__tests__/CallForHelpAction.spec.ts` |
| `CombatService.monsterAI.spec.ts` | `combat/__tests__/MonsterAIService.spec.ts` |
| `CombatService.partyRepositioning.spec.ts` | `combat/__tests__/PartyFormationService.spec.ts` |
| `CombatService.statusRecovery.spec.ts` | `combat/__tests__/CharacterRecoveryService.spec.ts` |
| `CombatService.spellDegradation.spec.ts` | `combat/__tests__/StatusEffectService.spec.ts` |
| `CombatService.demoralization.spec.ts` | `combat/__tests__/FleeService.spec.ts` |
| `CombatService.spec.ts` | Update imports to `CombatServiceFacade` |
| `Combat.e2e.spec.ts` | Update imports to `CombatServiceFacade` |
| `Combat.performance.spec.ts` | Update imports to `CombatServiceFacade` |

### Files to KEEP (3 files) - Validate Facade

```
CombatService.audit.spec.ts
CombatService.monsterIdentification.spec.ts
```

---

## 3. Implementation Order

### Step 1: Delete Redundant Tests (Safe)

Delete historical phase files and duplicates first:
```bash
# These are development artifacts with no unique coverage
rm src/app/services/__tests__/CombatService.phase2.spec.ts
rm src/app/services/__tests__/CombatService.phase3.spec.ts
rm src/app/services/__tests__/CombatService.phase4.spec.ts
rm src/app/services/__tests__/CombatService.phase5.spec.ts
rm src/app/services/__tests__/CombatService.phase6.spec.ts
rm src/app/services/__tests__/CombatService.phase7.spec.ts
rm src/app/services/__tests__/CombatService.phase8.spec.ts
rm src/app/services/__tests__/StatusRecovery.spec.ts
```

### Step 2: Delete Tests Covered by New Services

```bash
rm src/app/services/__tests__/CombatService.initiative.spec.ts
rm src/app/services/__tests__/CombatService.executeCommand.spec.ts
rm src/app/services/__tests__/CombatService.executeRound.spec.ts
rm src/app/services/__tests__/CombatService.monsterPositioning.spec.ts
```

### Step 3: Migrate Valuable Tests

Create new test files and migrate tests:
1. Create `combat/__tests__/AttackResolutionService.spec.ts` - Consolidate 8 test files
2. Create `combat/__tests__/FleeService.spec.ts` - From flee + demoralization
3. Create `combat/__tests__/SurpriseService.spec.ts`
4. Create `combat/__tests__/MonsterAIService.spec.ts`
5. Create `combat/__tests__/DispelAction.spec.ts`
6. Create `combat/__tests__/CallForHelpAction.spec.ts`
7. Create `combat/__tests__/PartyFormationService.spec.ts`
8. Create `combat/__tests__/CharacterRecoveryService.spec.ts`
9. Create `combat/__tests__/StatusEffectService.spec.ts`

### Step 4: Update Facade Tests

Update imports in:
- `CombatService.spec.ts` → `CombatServiceFacade`
- `CombatService.audit.spec.ts` → `CombatServiceFacade`
- `Combat.e2e.spec.ts` → `CombatServiceFacade`
- `Combat.performance.spec.ts` → `CombatServiceFacade`

### Step 5: Delete CombatService.ts

After all tests pass:
```bash
rm src/app/services/CombatService.ts
```

---

## 4. Verification Commands

```bash
# Before each step
npm test -- --silent 2>&1 | tail -5

# After deletions - verify no broken imports
grep -r "from.*CombatService" src/app/ --include="*.ts" | grep -v Facade

# Final verification
npm test
npm run build
```

---

## 5. Risk Mitigation

- **Low Risk**: Phase files, StatusRecovery duplicate
- **Medium Risk**: Initiative, executeCommand, executeRound (verify coverage exists)
- **High Risk**: Attack resolution consolidation (8 files → 1)

**Rollback**: Git revert if tests fail after any step.
