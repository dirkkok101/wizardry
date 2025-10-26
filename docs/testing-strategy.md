# Testing Strategy

**Comprehensive testing approach for Wizardry remake.**

## Testing Philosophy

**TDD (Test-Driven Development)**: Write tests first, then implementation

**No Mocks for Services**: Services are pure functions, test with real data

**Minimal Mocks for Commands**: Only mock external dependencies (IndexedDB, Canvas)

## Testing Layers

### Service Layer Testing

**Approach**: Pure function testing, no mocks needed

**Example**:
```typescript
describe('PartyService', () => {
  describe('addMember', () => {
    it('adds character to empty party', () => {
      const party = createEmptyParty()
      const character = createTestCharacter()

      const result = PartyService.addMember(party, character)

      expect(result.members).toHaveLength(1)
      expect(result.members[0]).toBe(character)
    })

    it('throws when party is full', () => {
      const party = createFullParty() // 6 members
      const character = createTestCharacter()

      expect(() => PartyService.addMember(party, character))
        .toThrow(PartyFullError)
    })
  })
})
```

**Key Practices**:
- Test happy path first
- Test error cases second
- Test edge cases (empty, full, boundary values)
- Use factory functions for test data

### Command Layer Testing

**Approach**: Test orchestration logic, mock only external I/O

**Example**:
```typescript
describe('RestAtInnCommand', () => {
  it('restores HP and spell points', () => {
    const state = createGameState({
      party: createPartyWithDamagedMembers()
    })
    const command = new RestAtInnCommand()

    const result = command.execute(state)

    expect(result.party.members.every(m => m.hp === m.maxHP)).toBe(true)
    expect(result.party.members.every(m => hasFullSpellPoints(m))).toBe(true)
  })

  it('ages characters', () => {
    const state = createGameState()
    const initialAge = state.party.members[0].age

    const result = new RestAtInnCommand().execute(state)

    expect(result.party.members[0].age).toBeGreaterThan(initialAge)
  })
})
```

### Integration Testing

**Approach**: Test multiple layers together

**Example**:
```typescript
describe('Combat Integration', () => {
  it('resolves complete combat round', () => {
    const state = createCombatState()

    // Input phase
    const withInput = new AttackCommand(0, 0).execute(state) // char 0 attacks group 0

    // Initiative phase (automatic)
    const initiative = CombatService.calculateInitiative(withInput)

    // Resolution phase
    const result = CombatService.resolveRound(initiative)

    expect(result.combatLog).toContainEntry('attack')
    expect(result.enemies[0].hp).toBeLessThan(initialHP)
  })
})
```

## Test Organization

```
tests/
├── services/
│   ├── PartyService.test.ts
│   ├── CombatService.test.ts
│   └── ... (one file per service)
├── commands/
│   ├── MoveForwardCommand.test.ts
│   └── ... (one file per command)
├── integration/
│   ├── combat-integration.test.ts
│   ├── spell-casting-integration.test.ts
│   └── ...
└── helpers/
    ├── test-factories.ts  # createTestCharacter(), etc.
    └── test-assertions.ts # custom matchers
```

## Test Data Factories

**Create factory functions for common test data**:

```typescript
// tests/helpers/test-factories.ts

export function createTestCharacter(overrides?: Partial<Character>): Character {
  return {
    id: 'test-char-1',
    name: 'Test Fighter',
    race: 'Human',
    class: 'Fighter',
    stats: { str: 15, int: 10, pie: 10, vit: 12, agi: 10, luc: 10 },
    hp: 20,
    maxHP: 20,
    spellPoints: new Map(),
    ...overrides
  }
}

export function createEmptyParty(): Party {
  return {
    members: [],
    formation: { frontRow: [], backRow: [] },
    position: { x: 0, y: 0, level: 1 },
    facing: 'north',
    gold: 0
  }
}

export function createFullParty(): Party {
  const members = Array.from({ length: 6 }, (_, i) =>
    createTestCharacter({ id: `char-${i}`, name: `Member ${i}` })
  )
  return {
    members,
    formation: {
      frontRow: members.slice(0, 3),
      backRow: members.slice(3, 6)
    },
    position: { x: 0, y: 0, level: 1 },
    facing: 'north',
    gold: 100
  }
}

export function createTestMage(overrides?: Partial<Character>): Character {
  return createTestCharacter({
    class: 'Mage',
    stats: { str: 8, int: 15, pie: 10, vit: 8, agi: 10, luc: 10 },
    mageSpellPoints: new Map([[1, 3], [2, 2]]),
    spellBook: new Set(['dumapic', 'halito', 'katino']),
    ...overrides
  })
}

export function createTestPriest(overrides?: Partial<Character>): Character {
  return createTestCharacter({
    class: 'Priest',
    stats: { str: 10, int: 10, pie: 15, vit: 10, agi: 8, luc: 10 },
    priestSpellPoints: new Map([[1, 3], [2, 2]]),
    spellBook: new Set(['dios', 'badios', 'milwa']),
    ...overrides
  })
}

export function createGameState(overrides?: Partial<GameState>): GameState {
  return {
    mode: 'town',
    characterRoster: new Map(),
    activeParty: createEmptyParty(),
    currentLevel: 1,
    position: { x: 0, y: 0, level: 1 },
    facing: 'north',
    eventLog: [],
    ...overrides
  }
}

export function createCombatState(): GameState {
  const party = createFullParty()
  const enemies = [
    createTestMonsterGroup('orcs', 3),
    createTestMonsterGroup('kobolds', 5)
  ]

  return createGameState({
    mode: 'combat',
    activeParty: party,
    combat: {
      allies: party.members,
      enemies,
      round: 1,
      timeline: [],
      combatLog: []
    }
  })
}

export function createTestMonsterGroup(type: string, count: number): MonsterGroup {
  return {
    id: `group-${type}`,
    monsterType: type,
    count,
    hp: Array.from({ length: count }, () => 8),
    status: Array.from({ length: count }, () => [])
  }
}

export function createPartyWithDamagedMembers(): Party {
  const party = createFullParty()
  party.members.forEach(member => {
    member.hp = Math.floor(member.maxHP / 2)
    if (member.mageSpellPoints) {
      member.mageSpellPoints.forEach((_, level) => {
        member.mageSpellPoints!.set(level, 0)
      })
    }
  })
  return party
}
```

## Coverage Goals

**Minimum Coverage**: 80% for all services and commands

**Critical Paths**: 100% coverage
- Combat resolution
- Spell casting
- Character death/resurrection
- Level-up stat changes
- Party movement
- Formation changes
- Door interactions
- Trap detection
- Encounter generation

## Running Tests

```bash
# Run all tests (single run, exits when complete)
npm test -- --run

# Run all tests (watch mode - default)
npm test

# Run specific service tests
npm test -- PartyService

# Run specific command tests
npm test -- MoveForwardCommand

# Run integration tests only
npm test -- integration/

# Run with coverage
npm test -- --coverage

# Watch mode (re-run on file changes)
npm test -- --watch

# Run tests matching pattern
npm test -- --testNamePattern="adds character"

# Verbose output
npm test -- --verbose
```

### Cleaning Up Background Test Processes

**Problem**: Running tests in watch mode (default `npm test`) can leave background Node processes running. These accumulate over time and consume system resources, slowing down future test runs.

**Solution**: Always clean up background processes before running tests:

```bash
# macOS/Linux: Kill all background node processes and run tests
killall -9 node 2>/dev/null || true && npm test -- --run

# Alternative: Use pkill (works on most Unix systems)
pkill -f "npm test" && npm test -- --run
```

**When to clean up**:
- Before running the full test suite
- When tests feel slow or unresponsive
- After interrupting test runs with Ctrl+C
- When you see many node processes in Activity Monitor/top

**Prevention**:
- Use `npm test -- --run` for single test runs (exits automatically)
- Avoid running multiple test sessions in parallel
- Kill watch mode with `q` key instead of Ctrl+C when possible

## Test Performance Best Practices

**Goal**: Keep test suite fast (<5 seconds for full run). Fast tests = faster feedback loop.

### 1. Use Instant Transitions for Scene Navigation

Scene transitions have a default 300ms fade time that slows down tests. **Always use instant transitions** in tests:

```typescript
// ❌ Bad: Uses default 300ms fadeTime
await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)

// ✅ Good: Instant transition (no delay)
await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
  direction: 'instant'
})
```

**Impact**: Each transition saves 300ms. With 20 transitions in tests, saves 6 seconds!

### 2. Avoid setTimeout in Tests

Never use `setTimeout()` to wait for async operations. It makes tests slow and flaky.

```typescript
// ❌ Bad: Artificial delay
await new Promise(resolve => setTimeout(resolve, 50))
await expect(something).toBeTruthy()

// ✅ Good: Use queueMicrotask for synchronous async
await new Promise(resolve => queueMicrotask(resolve))

// ✅ Better: Use proper async/await without delays
await someAsyncOperation()
expect(something).toBeTruthy()
```

### 3. Mock Async Operations Synchronously

Use `queueMicrotask()` instead of `setTimeout()` in mocks:

```typescript
// ❌ Bad: 10ms delay per image load
global.Image = class MockImage {
  constructor() {
    setTimeout(() => this.onload?.(), 10)
  }
} as any

// ✅ Good: Instant load
global.Image = class MockImage {
  constructor() {
    queueMicrotask(() => this.onload?.())
  }
} as any
```

### 4. Configure Vitest to Exclude Worktrees

Git worktrees can cause duplicate test execution. Configure vitest to exclude them:

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.worktrees/**',  // ← Prevents duplicate test runs
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**'
    ]
  },
})
```

**Without this**: Tests run twice (once for main directory, once for each worktree)

### 5. Use Fake Timers for Time-Dependent Tests

If you must test time-dependent behavior, use Vitest fake timers instead of real delays:

```typescript
import { vi } from 'vitest'

describe('TimeDependent', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('triggers after delay', async () => {
    const callback = vi.fn()
    scheduleDelayedCallback(callback, 1000)

    // Instantly advance time by 1000ms
    await vi.advanceTimersByTimeAsync(1000)

    expect(callback).toHaveBeenCalled()
  })
})
```

### 6. Performance Metrics

Track test performance to catch regressions:

```bash
# Run tests and check duration
npm test

# Target metrics (as of 2025-10-26):
# ✓ Total duration: <2.5s
# ✓ SceneManager tests: <0.5s
# ✓ SceneNavigationService tests: <0.01s
# ✓ Integration tests: <1s
```

If tests exceed these times, investigate for:
- Missing `{ direction: 'instant' }` in scene transitions
- Accidental `setTimeout()` usage
- Duplicate test file execution (check vite.config.ts excludes)
- Real async operations that should be mocked

## Testing Checklist

Before committing:
- [ ] All tests pass
- [ ] New code has tests (TDD)
- [ ] Coverage ≥80% for new code
- [ ] No console.log in tests
- [ ] Test names describe behavior (not implementation)
- [ ] Edge cases tested (empty, full, boundary values)
- [ ] Error cases tested (invalid input, constraints)
- [ ] Factory functions used for test data
- [ ] No hard-coded test data (use factories)
- [ ] Tests are isolated (no shared state between tests)

**Performance checklist**:
- [ ] Scene transitions use `{ direction: 'instant' }` in tests
- [ ] No `setTimeout()` in test code (use `queueMicrotask()` or fake timers)
- [ ] Async mocks use `queueMicrotask()` not `setTimeout()`
- [ ] Test suite runs in <2.5 seconds
- [ ] No duplicate test execution (check vitest excludes)

## Test Naming Conventions

**Service Tests**:
- `describe('ServiceName')` - Top level
- `describe('methodName')` - Method grouping
- `it('does something specific')` - Individual test

**Command Tests**:
- `describe('CommandName')` - Top level
- `it('performs expected behavior')` - Individual test

**Integration Tests**:
- `describe('Feature Integration')` - Top level
- `it('completes full workflow')` - Individual test

**Examples**:
```typescript
// Good: Describes behavior
it('adds character to empty party')
it('throws when party is full')
it('moves character from back row to front row')

// Bad: Describes implementation
it('calls addMember function')
it('returns new party object')
it('updates formation array')
```

## Testing Anti-Patterns

**Avoid These**:

1. **Testing Implementation Details**
   ```typescript
   // Bad: Tests internal method calls
   it('calls calculateDamage internally', () => {
     const spy = jest.spyOn(service, 'calculateDamage')
     service.resolveAttack()
     expect(spy).toHaveBeenCalled()
   })

   // Good: Tests behavior
   it('reduces target HP on successful attack', () => {
     const result = service.resolveAttack(attacker, target)
     expect(result.target.hp).toBeLessThan(target.hp)
   })
   ```

2. **Mocking Pure Functions**
   ```typescript
   // Bad: Mocking service calls
   const mockPartyService = {
     addMember: jest.fn()
   }

   // Good: Use real service (it's a pure function)
   const result = PartyService.addMember(party, character)
   ```

3. **Shared Test State**
   ```typescript
   // Bad: Shared mutable state
   let party: Party
   beforeAll(() => {
     party = createEmptyParty() // Shared across all tests
   })

   // Good: Fresh state per test
   beforeEach(() => {
     party = createEmptyParty() // New instance per test
   })
   ```

4. **Testing Multiple Things**
   ```typescript
   // Bad: Multiple assertions unrelated
   it('adds member and moves to front row and updates gold', () => {
     // Too many responsibilities
   })

   // Good: One behavior per test
   it('adds member to party')
   it('moves member to front row')
   it('updates party gold')
   ```

5. **Using setTimeout in Tests (Performance Anti-Pattern)**
   ```typescript
   // Bad: Slow and flaky
   it('transitions to new scene', async () => {
     await SceneNavigationService.transitionTo(SceneType.CAMP)
     await new Promise(resolve => setTimeout(resolve, 500)) // ← Adds 500ms!
     expect(getCurrentScene()).toBe(SceneType.CAMP)
   })

   // Good: Fast and reliable
   it('transitions to new scene', async () => {
     await SceneNavigationService.transitionTo(SceneType.CAMP, {
       direction: 'instant' // ← No delay
     })
     expect(getCurrentScene()).toBe(SceneType.CAMP)
   })
   ```

6. **Forgetting to Exclude Worktrees (Performance Anti-Pattern)**
   ```typescript
   // Bad: Missing exclude in vite.config.ts
   export default defineConfig({
     test: {
       // Missing exclude causes duplicate test runs
     }
   })

   // Good: Properly configured
   export default defineConfig({
     test: {
       exclude: ['**/.worktrees/**', /* ... */]
     }
   })
   ```

## Testing Complex Scenarios

**Spell Casting Flow**:
```typescript
describe('Spell Casting', () => {
  it('casts HALITO successfully', () => {
    const mage = createTestMage()
    const target = createTestMonsterGroup('orcs', 3)
    const initialPoints = mage.mageSpellPoints.get(1)

    const result = SpellCastingService.cast(mage, 'halito', target)

    expect(result.caster.mageSpellPoints.get(1)).toBe(initialPoints! - 1)
    expect(result.target.hp).toBeLessThan(target.hp)
    expect(result.log).toContain('HALITO')
  })

  it('fails when no spell points', () => {
    const mage = createTestMage({ mageSpellPoints: new Map([[1, 0]]) })

    expect(() => SpellCastingService.cast(mage, 'halito', target))
      .toThrow(InsufficientSpellPointsError)
  })

  it('fails when spell not in spellbook', () => {
    const mage = createTestMage({ spellBook: new Set() })

    expect(() => SpellCastingService.cast(mage, 'halito', target))
      .toThrow(SpellNotLearnedError)
  })
})
```

**Combat Round Flow**:
```typescript
describe('Combat Round', () => {
  it('resolves complete round with multiple attackers', () => {
    const state = createCombatState()

    // Queue actions
    state.combat.timeline = [
      { actor: state.party.members[0], action: 'attack', target: 0 },
      { actor: state.enemies[0].monsters[0], action: 'attack', target: 0 },
      { actor: state.party.members[1], action: 'cast_spell', spell: 'halito', target: 0 }
    ]

    const result = CombatService.resolveRound(state)

    expect(result.combat.round).toBe(2)
    expect(result.combat.combatLog).toHaveLength(3)
    expect(result.combat.timeline).toHaveLength(0) // Cleared after round
  })
})
```

## Related

- [Service Testing Guide](./services/testing-guide.md)
- [Command Testing Guide](./commands/testing-guide.md)
- [Architecture Overview](./architecture.md) - Understanding layers to test
