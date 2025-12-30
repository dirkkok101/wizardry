# Contributing Guide

**Standards and patterns for Wizardry remake development.**

## Documentation Standards

**Format**: Markdown with Mermaid.js for diagrams

**Structure**:
- Use ## for major sections
- Use ### for subsections
- Include code examples
- Link to related docs

**Code Examples**:
```typescript
// Always use TypeScript syntax
// Include complete, runnable examples
function example(): ReturnType {
  return result
}
```

## Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Test additions/changes
- `refactor`: Code refactor
- `chore`: Tooling, dependencies

**Examples**:
```
docs(services): add PartyService documentation
feat(combat): implement initiative system
test(spells): add spell casting tests
```

## Pull Request Process

1. Create feature branch from `main`
2. Write documentation first (if new feature)
3. Write failing tests (TDD)
4. Implement minimal code to pass tests
5. Commit frequently (small commits)
6. Open PR with description
7. Request review

## Code Review Checklist

**Before Requesting Review**:
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Code follows TypeScript strict mode
- [ ] No console.log statements
- [ ] Services are pure functions
- [ ] Commands are immutable
- [ ] Commit messages follow format

**Reviewers Check**:
- [ ] Tests cover new code (80%+ coverage)
- [ ] Documentation is clear and accurate
- [ ] Code follows architecture patterns
- [ ] No breaking changes to existing APIs
- [ ] Performance considerations addressed

## Development Workflow

### 1. Documentation-First Approach

**Before writing code**:
1. Read relevant game design docs
2. Read relevant system docs
3. Read service/command docs
4. Understand validated research

### 2. Test-Driven Development

**For every feature**:
1. Write failing test
2. Run test (verify it fails)
3. Write minimal code to pass test
4. Run test (verify it passes)
5. Refactor if needed
6. Commit

### 3. Service Layer Development

**Pure Functions Only**:
```typescript
// ✅ Good: Pure function
function addMember(party: Party, character: Character): Party {
  return {
    ...party,
    members: [...party.members, character]
  }
}

// ❌ Bad: Mutation
function addMember(party: Party, character: Character): void {
  party.members.push(character) // Mutates input!
}
```

**No Side Effects**:
- No API calls
- No database access
- No file I/O
- No random() calls (use RandomService)
- No Date.now() calls (use GameState.timestamp)

### 4. Command Layer Development

**Orchestration Pattern**:
```typescript
class MoveForwardCommand {
  execute(state: GameState): GameState {
    // 1. Validate preconditions
    if (state.mode !== 'NAVIGATION') {
      throw new InvalidModeError()
    }

    // 2. Call services
    const newPosition = NavigationService.moveForward(
      state.party.position,
      state.party.facing
    )

    // 3. Create event
    const event = EventService.createMoveEvent(newPosition)

    // 4. Return new state
    return {
      ...state,
      party: { ...state.party, position: newPosition },
      eventLog: [...state.eventLog, event]
    }
  }
}
```

## Architectural Principles

### 1. Party-First Architecture

Party is the core abstraction, not individual characters:
- Movement moves entire party
- Combat involves party formation
- Inventory shared within party
- Death affects party state

### 2. Event Sourcing

Every action creates an event:
- Commands create events
- State derived from events
- Replay system for debugging
- Save/load as event streams

### 3. Modal Game States

Explicit state machine prevents invalid actions:
- TOWN: Access services, form party
- NAVIGATION: Move, search, encounter
- COMBAT: Attack, cast, flee
- CHARACTER_CREATION: Create new character
- CAMP: Change formation, use items

### 4. Immutable State Updates

All state changes create new state:
```typescript
// ✅ Good
const newState = { ...state, hp: newHP }

// ❌ Bad
state.hp = newHP
```

## Testing Guidelines

### Service Tests

**No mocks needed** (pure functions):
```typescript
test('PartyService.addMember adds character to party', () => {
  const party = createEmptyParty()
  const character = createTestCharacter()

  const result = PartyService.addMember(party, character)

  expect(result.members).toHaveLength(1)
  expect(result.members[0]).toBe(character)
})
```

### Command Tests

**Mock only external I/O**:
```typescript
test('SaveGameCommand saves to IndexedDB', () => {
  const mockDB = jest.fn()
  const state = createGameState()
  const command = new SaveGameCommand(mockDB)

  command.execute(state)

  expect(mockDB).toHaveBeenCalledWith(
    expect.objectContaining({ party: state.party })
  )
})
```

### Coverage Requirements

**Minimum**: 80% for all code
**Critical Paths**: 100% coverage
- Combat resolution
- Spell casting
- Character death/resurrection
- Level-up stat changes
- Party movement

## Common Mistakes to Avoid

### ❌ Mutating Input

```typescript
// Bad
function updateHP(character: Character, newHP: number): Character {
  character.hp = newHP // Mutation!
  return character
}

// Good
function updateHP(character: Character, newHP: number): Character {
  return { ...character, hp: newHP }
}
```

### ❌ Side Effects in Services

```typescript
// Bad
function logCombatAction(action: Action): void {
  console.log(action) // Side effect!
  saveToDatabase(action) // Side effect!
}

// Good
function createCombatEvent(action: Action): Event {
  return { type: 'COMBAT_ACTION', payload: action }
}
```

### ❌ Skipping Tests

```typescript
// Bad: No test
function calculateDamage(weapon: Weapon, str: number): number {
  return weapon.damage + str // Hope this works!
}

// Good: Test first
test('calculateDamage adds STR modifier to weapon damage', () => {
  const weapon = { damage: 5 }
  expect(calculateDamage(weapon, 3)).toBe(8)
})
```

## Documentation Contribution

### Adding New Service Documentation

1. Create `docs/services/[ServiceName].md`
2. Follow template structure:
   - Responsibility
   - API Reference
   - Dependencies
   - Testing
   - Related
3. Add to `docs/services/README.md` index
4. Link from related docs
5. Commit: `docs(services): add [ServiceName] documentation`

### Adding New Diagram

1. Create `docs/diagrams/[diagram-name].md`
2. Include Mermaid.js code block
3. Add description and key points
4. Add to `docs/diagrams/README.md` index
5. Commit: `docs(diagrams): add [diagram name]`

## Questions?

- Check [Architecture Docs](./architecture.md) for technical patterns
- Check [Game Design Docs](./game-design/README.md) for game mechanics
- Check [Research Docs](./research/) for validated source data
- Check [Testing Strategy](./testing-strategy.md) for testing approach

## Code of Conduct

- Be respectful and constructive
- Focus on code, not people
- Assume good intentions
- Help others learn

---

**Ready to contribute?** Start with a small task, read the docs, write tests first, and commit frequently!
