# EnterTownCommand

**Command for entering town from dungeon.**

## Responsibility

Transitions party from dungeon navigation mode to town mode, allowing access to town services (Inn, Temple, Shop, Training).

## Command Flow

### Preconditions
1. Party must be in NAVIGATION mode (in dungeon)
2. Party must NOT be in COMBAT mode
3. Party must have at least 1 conscious member

### Services Called
- `TownService.enterTown(state)` - Transition to town mode

### Events Created
- `ENTER_TOWN` event with timestamp and party position

### State Changes
- `state.mode` changes from `NAVIGATION` to `TOWN`
- `state.party.position` preserved (return point for dungeon re-entry)

## API Reference

```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (must be in NAVIGATION mode)

**Returns**: New game state with mode set to TOWN

**Throws**:
- `InvalidStateTransitionError` if not in navigation mode or in combat
- `NoConsciousMembersError` if all party members are dead/unconscious

**Example**:
```typescript
const dungeonState = createGameState({
  mode: 'NAVIGATION',
  party: {
    position: { x: 5, y: 10, level: 1, facing: 'north' },
    members: [aliveCharacter]
  }
})

const townState = EnterTownCommand.execute(dungeonState)
// townState.mode === 'TOWN'
// townState.party.position === { x: 5, y: 10, level: 1, facing: 'north' }
// townState.eventLog includes ENTER_TOWN event
```

## Preconditions

### State Validation
```typescript
// Must be in navigation mode
if (state.mode !== 'NAVIGATION') {
  throw new InvalidStateTransitionError('Must be in dungeon to enter town')
}

// Cannot enter town during combat
if (state.mode === 'COMBAT') {
  throw new InvalidStateTransitionError('Cannot enter town during combat')
}
```

### Party Validation
```typescript
// Must have at least one conscious member
const consciousMembers = state.party.members.filter(m => m.status === 'alive')
if (consciousMembers.length === 0) {
  throw new NoConsciousMembersError('All party members are unconscious')
}
```

## Services Used

### TownService
- `enterTown(state)` - Handles mode transition and state updates

## Events Created

```typescript
{
  type: 'ENTER_TOWN',
  timestamp: Date.now(),
  data: {
    fromPosition: { x: 5, y: 10, level: 1, facing: 'north' },
    partyGold: 1000,
    partyStatus: 'All members alive'
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('EnterTownCommand', () => {
  it('transitions from NAVIGATION to TOWN mode', () => {
    const state = createGameState({ mode: 'NAVIGATION' })
    const result = EnterTownCommand.execute(state)
    expect(result.mode).toBe('TOWN')
  })

  it('preserves party position for dungeon re-entry', () => {
    const position = { x: 5, y: 10, level: 1, facing: 'north' }
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { position }
    })
    const result = EnterTownCommand.execute(state)
    expect(result.party.position).toEqual(position)
  })

  it('throws error if in combat', () => {
    const state = createGameState({ mode: 'COMBAT' })
    expect(() => EnterTownCommand.execute(state))
      .toThrow(InvalidStateTransitionError)
  })

  it('throws error if all party members unconscious', () => {
    const state = createGameState({
      mode: 'NAVIGATION',
      party: { members: [deadCharacter, deadCharacter] }
    })
    expect(() => EnterTownCommand.execute(state))
      .toThrow(NoConsciousMembersError)
  })

  it('creates ENTER_TOWN event in event log', () => {
    const state = createGameState({ mode: 'NAVIGATION' })
    const result = EnterTownCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('ENTER_TOWN')
  })

  it('allows re-entry to town multiple times', () => {
    let state = createGameState({ mode: 'NAVIGATION' })
    state = EnterTownCommand.execute(state)
    state = EnterDungeonCommand.execute(state)
    state = EnterTownCommand.execute(state)
    expect(state.mode).toBe('TOWN')
  })
})
```

## Related

**Services**:
- [TownService](../services/TownService.md) - Town mode management

**Commands**:
- [EnterDungeonCommand](./EnterDungeonCommand.md) - Return to dungeon
- [RestAtInnCommand](./RestAtInnCommand.md) - Inn service
- [VisitTempleCommand](./VisitTempleCommand.md) - Temple service
- [VisitShopCommand](./VisitShopCommand.md) - Shop service

**Systems**:
- [Town System](../systems/town-system.md) - Town services overview
