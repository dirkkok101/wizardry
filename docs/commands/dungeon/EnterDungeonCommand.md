# EnterDungeonCommand

**Command for entering the dungeon from town.**

## Responsibility

Transitions party from town mode to dungeon navigation mode, validates party readiness, and positions party at dungeon entrance.

## Command Flow

### Preconditions
1. Party must be in TOWN mode
2. Party must have at least 1 member
3. Party must have at least 1 conscious member
4. Recommended: Party should have thief for trap detection (warning only)

### Services Called
- `TownService.validatePartyForDungeon(party)` - Validate party composition
- `TownService.exitTown(state)` - Transition to dungeon mode

### Events Created
- `ENTER_DUNGEON` event with timestamp and party composition

### State Changes
- `state.mode` changes from `TOWN` to `NAVIGATION`
- `state.party.position` set to dungeon entrance: `{ x: 0, y: 0, level: 1, facing: 'north' }`

## API Reference

```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (must be in TOWN mode)

**Returns**: New game state with mode set to NAVIGATION

**Throws**:
- `InvalidStateTransitionError` if not in town
- `EmptyPartyError` if party has no members
- `NoConsciousMembersError` if all party members are dead/unconscious

**Warnings**:
- Warns if no thief in party (traps will be dangerous)

**Example**:
```typescript
const state = createGameState({
  mode: 'TOWN',
  party: {
    members: [
      createCharacter({ class: 'Fighter' }),
      createCharacter({ class: 'Mage' }),
      createCharacter({ class: 'Thief' })
    ]
  }
})

const result = EnterDungeonCommand.execute(state)
// result.mode === 'NAVIGATION'
// result.party.position === { x: 0, y: 0, level: 1, facing: 'north' }
```

## Preconditions

### State Validation
```typescript
// Must be in town
if (state.mode !== 'TOWN') {
  throw new InvalidStateTransitionError('Must be in town to enter dungeon')
}
```

### Party Validation
```typescript
// Party must have at least one member
if (state.party.members.length === 0) {
  throw new EmptyPartyError('Cannot enter dungeon with empty party')
}

// Must have at least one conscious member
const consciousMembers = state.party.members.filter(m => m.status === 'alive')
if (consciousMembers.length === 0) {
  throw new NoConsciousMembersError('All party members are unconscious')
}

// Warn if no thief (not an error, just warning)
const hasThief = state.party.members.some(m => m.class === 'Thief' || m.class === 'Ninja')
if (!hasThief) {
  console.warn('No thief in party: traps will be dangerous')
}
```

## Services Used

### TownService
- `validatePartyForDungeon(party)` - Validate party composition
  - Requires at least 1 member
  - Requires at least 1 conscious member
  - Warns if no thief for trap detection
- `exitTown(state)` - Transition from TOWN to NAVIGATION mode

## Events Created

```typescript
{
  type: 'ENTER_DUNGEON',
  timestamp: Date.now(),
  data: {
    partySize: 4,
    partyComposition: [
      { class: 'Fighter', level: 3, status: 'alive' },
      { class: 'Mage', level: 2, status: 'alive' },
      { class: 'Priest', level: 2, status: 'alive' },
      { class: 'Thief', level: 2, status: 'alive' }
    ],
    warnings: [], // Or ['No thief in party']
    entryPosition: { x: 0, y: 0, level: 1, facing: 'north' }
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('EnterDungeonCommand', () => {
  it('transitions from TOWN to NAVIGATION mode', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [createCharacter()] }
    })
    const result = EnterDungeonCommand.execute(state)
    expect(result.mode).toBe('NAVIGATION')
  })

  it('sets party position to dungeon entrance (0,0,1)', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [createCharacter()] }
    })
    const result = EnterDungeonCommand.execute(state)
    expect(result.party.position).toEqual({
      x: 0,
      y: 0,
      level: 1,
      facing: 'north'
    })
  })

  it('allows entry with valid party', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ class: 'Fighter' }),
          createCharacter({ class: 'Mage' })
        ]
      }
    })
    const result = EnterDungeonCommand.execute(state)
    expect(result.mode).toBe('NAVIGATION')
  })

  it('throws error if party is empty', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [] }
    })
    expect(() => EnterDungeonCommand.execute(state))
      .toThrow(EmptyPartyError)
  })

  it('throws error if all members unconscious', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ status: 'dead' }),
          createCharacter({ status: 'ashes' })
        ]
      }
    })
    expect(() => EnterDungeonCommand.execute(state))
      .toThrow(NoConsciousMembersError)
  })

  it('throws error if not in town', () => {
    const state = createGameState({ mode: 'NAVIGATION' })
    expect(() => EnterDungeonCommand.execute(state))
      .toThrow(InvalidStateTransitionError)
  })

  it('warns if no thief in party', () => {
    const consoleSpy = jest.spyOn(console, 'warn')
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ class: 'Fighter' }),
          createCharacter({ class: 'Mage' })
        ]
      }
    })
    EnterDungeonCommand.execute(state)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No thief')
    )
  })

  it('does not warn if thief in party', () => {
    const consoleSpy = jest.spyOn(console, 'warn')
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ class: 'Fighter' }),
          createCharacter({ class: 'Thief' })
        ]
      }
    })
    EnterDungeonCommand.execute(state)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('does not warn if ninja in party', () => {
    const consoleSpy = jest.spyOn(console, 'warn')
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ class: 'Fighter' }),
          createCharacter({ class: 'Ninja' })
        ]
      }
    })
    EnterDungeonCommand.execute(state)
    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('allows re-entry after visiting town', () => {
    let state = createGameState({
      mode: 'NAVIGATION',
      party: { members: [createCharacter()] }
    })
    state = EnterTownCommand.execute(state)
    state = EnterDungeonCommand.execute(state)
    expect(state.mode).toBe('NAVIGATION')
  })

  it('creates ENTER_DUNGEON event', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [createCharacter()] }
    })
    const result = EnterDungeonCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('ENTER_DUNGEON')
  })
})
```

## Related

**Services**:
- [TownService](../services/TownService.md) - Dungeon entry validation
- [DungeonService](../services/DungeonService.md) - Dungeon map data

**Commands**:
- [EnterTownCommand](../meta/EnterTownCommand.md) - Return to town
- [MoveForwardCommand](./MoveForwardCommand.md) - Navigate dungeon
- [DescendStairsCommand](./DescendStairsCommand.md) - Go deeper

**Systems**:
- [Dungeon System](../systems/dungeon-system.md) - Dungeon mechanics
- [Town System](../systems/town-system.md) - Town/dungeon transition
