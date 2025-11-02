# Task 21: Integration Testing & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create E2E integration tests for complete town service workflows, verify performance targets, apply code polish, and update documentation.

**Architecture:** Integration tests using real components and services (no mocks). Performance measurement in test suite. Final cleanup and documentation.

**Tech Stack:** Jest integration tests, Real component testing, Performance assertions

---

## Implementation Tasks (Concise Format)

### Task 21.1: Town Service Flow Integration Tests

**Create:** `src/app/__tests__/integration/town-services-flow.integration.spec.ts`

**E2E Test Scenarios (6 tests):**

1. **Complete Character Lifecycle:**
```typescript
it('creates character, forms party, rests, shops, levels up', async () => {
  // 1. Create character at Training Grounds
  // 2. Add to party at Tavern
  // 3. Rest at Inn until level up
  // 4. Buy items at Shop
  // 5. Verify all state changes persisted
})
```

2. **Party Formation with Alignment Conflicts:**
```typescript
it('prevents Good/Evil mixing during party formation', async () => {
  // Create Good and Evil characters
  // Add Good character to party
  // Attempt to add Evil character
  // Verify error and party unchanged
})
```

3. **Gold Management Flow:**
```typescript
it('manages gold across party pool and characters', async () => {
  // Form party with gold
  // Divvy gold at Tavern
  // Buy items at Shop (deduct from character)
  // Sell items (add to party pool)
  // Verify gold balances correct
})
```

4. **Level Up and Spell Learning:**
```typescript
it('levels up Mage and learns new spells', async () => {
  // Create Mage with high XP
  // Rest at Inn until fully healed
  // Verify level up triggered
  // Verify new spells learned
  // Verify HP increased
})
```

5. **Death and Resurrection Flow:**
```typescript
it('handles character death and temple resurrection', async () => {
  // Set character to DEAD status
  // Attempt to add to party (should fail)
  // Resurrect at Temple
  // Add to party (should succeed)
})
```

6. **Save/Load Game State:**
```typescript
it('saves and loads complete game state', async () => {
  // Create party, buy items, level up
  // Save to slot 1
  // Modify state
  // Load from slot 1
  // Verify state restored exactly
})
```

**Commit**: `test(integration): add town service E2E flow tests`

### Task 21.2: Performance Verification

**Create:** `src/app/__tests__/performance.spec.ts`

**Performance Tests (3 tests):**
```typescript
it('completes full test suite in under 5 seconds', () => {
  // Jest automatically tracks this
  // Verify in final report
})

it('large party operations complete quickly', () => {
  const start = performance.now()

  // Create 10 characters
  // Form/disband party multiple times
  // Verify operations complete

  const duration = performance.now() - start
  expect(duration).toBeLessThan(1000) // 1 second
})

it('save/load operations complete quickly', async () => {
  const start = performance.now()

  await SaveService.saveGame(1, largeGameState)
  await SaveService.loadGame(1)

  const duration = performance.now() - start
  expect(duration).toBeLessThan(500) // 500ms
})
```

**Commit**: `test(performance): verify speed targets met`

### Task 21.3: Code Polish

**Cleanup Tasks:**
1. Remove any remaining `console.log` statements
2. Fix TypeScript `any` types (use proper types)
3. Remove unused imports
4. Consistent error message formatting
5. Add JSDoc comments to public methods
6. Verify all test descriptions accurate

**Run:**
```bash
npx eslint src --fix
npm test -- --coverage
```

**Verify:**
- 0 TypeScript errors
- 0 ESLint warnings
- 490+ tests passing
- < 5 second test execution
- > 80% coverage

**Commit**: `refactor(phase-6): code polish and cleanup`

### Task 21.4: Documentation Updates

**Update:** `docs/implementation/phase-6-summary.md`

**Contents:**
```markdown
# Phase 6 Implementation Summary

## Overview
Completed all town service business logic and castle integration.

## Components Implemented
1. **Tavern** - Party formation with alignment validation
2. **Inn** - Character resting, level-up, spell learning
3. **Character Inspection** - Full character sheet display
4. **Utilities** - Save/load with 3 slots
5. **Castle Menu** - Enhanced with party display

## Services Implemented
1. **PartyService** - Alignment validation, gold distribution
2. **LevelUpService** - XP calc, HP rolls, stat increases
3. **SpellLearningService** - Spell progression for casters
4. **InnService** - Room types, rest mechanics
5. **SaveService** (extended) - Slot metadata, load/save

## Test Metrics
- **Total Tests**: 490+ (up from 336)
- **New Tests**: ~155
- **Execution Time**: < 5 seconds
- **Coverage**: > 80%

## Features Delivered
- ✅ Party formation with Good/Evil conflicts
- ✅ Character leveling system (XP, HP, stats)
- ✅ Spell learning for Mage/Priest/Bishop
- ✅ 5 inn room types with healing
- ✅ Save/load game (3 slots)
- ✅ Character inspection from multiple contexts
- ✅ Party display in Castle Menu
- ✅ Gold management (divvy, pool, individual)

## Next Phase (Phase 7)
- Camp scene (pre-dungeon staging)
- Maze scene (3D Canvas rendering)
- Combat scene (turn-based battles)
- Chest scene (loot and traps)
```

**Update:** `CLAUDE.md` - Mark Phase 6 complete in status section

**Commit**: `docs(phase-6): add completion summary`

### Task 21.5: Final Verification

**Run Final Checks:**
```bash
# 1. Clean build
rm -rf .angular/cache
npm run build

# 2. Full test suite
npm test

# 3. Check for issues
npx tsc --noEmit
```

**Verify Checklist:**
- [ ] All 490+ tests passing
- [ ] Test execution < 5 seconds
- [ ] No TypeScript errors
- [ ] No console.log in source
- [ ] All docs updated
- [ ] Build succeeds
- [ ] Coverage > 80%

**Final Commit:**
```bash
git add .
git commit -m "feat(phase-6): COMPLETE - Town Service Completion & Castle Integration

Phase 6 delivers complete town service layer:
- 5 components: Tavern, Inn, Character Inspection, Utilities, Castle Menu
- 5 services: Party, LevelUp, SpellLearning, Inn, Save (extended)
- 490+ tests passing in < 5s
- 80%+ coverage maintained
- All town services fully functional

Next: Phase 7 (Dungeon/Combat system)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Summary

**Integration Tests**: 6 E2E flows
**Performance Tests**: 3 speed checks
**Total New Tests**: ~10
**Total Phase 6 Tests**: ~490
**Estimated Time**: 2-3 hours
**Success Criteria**: All tests pass, < 5s execution, > 80% coverage
