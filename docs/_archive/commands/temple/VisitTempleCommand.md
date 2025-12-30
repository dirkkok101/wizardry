# VisitTempleCommand

**Command for entering the temple to access resurrection and healing services.**

## Responsibility

Transitions party to temple service mode, allowing access to resurrection (from dead/ashes), status curing, and item uncursing.

## Command Flow

### Preconditions
1. Party must be in TOWN mode
2. Party must have at least 1 conscious member
3. Party should have need for temple services (dead/ashes characters or status effects)

### Services Called
- `TownService.canAccessTemple(party)` - Validate temple access

### Events Created
- `VISIT_TEMPLE` event with timestamp

### State Changes
- `state.uiMode` changes to `TEMPLE_MENU`
- Temple menu displayed with available services

## API Reference

```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (must be in TOWN mode)

**Returns**: New game state with temple menu active

**Throws**:
- `InvalidStateTransitionError` if not in town
- `NoConsciousMembersError` if no conscious members

**Example**:
```typescript
const state = createGameState({
  mode: 'TOWN',
  party: {
    members: [
      createCharacter({ status: 'alive' }),
      createCharacter({ status: 'dead' })
    ]
  }
})

const result = VisitTempleCommand.execute(state)
// result.uiMode === 'TEMPLE_MENU'
// result.eventLog includes VISIT_TEMPLE event
```

## Preconditions

### State Validation
```typescript
// Must be in town
if (state.mode !== 'TOWN') {
  throw new InvalidStateTransitionError('Must be in town to visit temple')
}
```

### Party Validation
```typescript
// Must have at least one conscious member
const consciousMembers = state.party.members.filter(m => m.status === 'alive')
if (consciousMembers.length === 0) {
  throw new NoConsciousMembersError('No conscious members to visit temple')
}

// Check if temple services are needed (warning, not error)
const canAccess = TownService.canAccessTemple(state.party)
if (!canAccess) {
  // Warning: No characters need temple services
}
```

## Services Used

### TownService
- `canAccessTemple(party)` - Check if temple has services for this party

### TempleService (available after entering)
- `getAvailableServices(character, partyGold)` - Get services for character

## Events Created

```typescript
{
  type: 'VISIT_TEMPLE',
  timestamp: Date.now(),
  data: {
    partyGold: 1000,
    needsResurrection: ['char2'],
    needsCuring: ['char3'],
    needsUncursing: ['char4']
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('VisitTempleCommand', () => {
  it('transitions to temple menu', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [createCharacter()] }
    })
    const result = VisitTempleCommand.execute(state)
    expect(result.uiMode).toBe('TEMPLE_MENU')
  })

  it('allows temple visit with dead party member', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ status: 'alive' }),
          createCharacter({ status: 'dead' })
        ]
      }
    })
    const result = VisitTempleCommand.execute(state)
    expect(result.uiMode).toBe('TEMPLE_MENU')
  })

  it('allows temple visit with ashes party member', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ status: 'alive' }),
          createCharacter({ status: 'ashes' })
        ]
      }
    })
    const result = VisitTempleCommand.execute(state)
    expect(result.uiMode).toBe('TEMPLE_MENU')
  })

  it('allows temple visit with status effects', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ status: ['poisoned'] })
        ]
      }
    })
    const result = VisitTempleCommand.execute(state)
    expect(result.uiMode).toBe('TEMPLE_MENU')
  })

  it('allows temple visit even if no services needed', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [createCharacter({ status: 'alive' })] }
    })
    const result = VisitTempleCommand.execute(state)
    expect(result.uiMode).toBe('TEMPLE_MENU')
  })

  it('throws error if not in town', () => {
    const state = createGameState({ mode: 'NAVIGATION' })
    expect(() => VisitTempleCommand.execute(state))
      .toThrow(InvalidStateTransitionError)
  })

  it('throws error if no conscious members', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [createCharacter({ status: 'dead' })] }
    })
    expect(() => VisitTempleCommand.execute(state))
      .toThrow(NoConsciousMembersError)
  })

  it('creates VISIT_TEMPLE event', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [createCharacter()] }
    })
    const result = VisitTempleCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('VISIT_TEMPLE')
  })
})
```

## Related

**Services**:
- [TempleService](../services/TempleService.md) - Resurrection and curing
- [TownService](../services/TownService.md) - Temple access validation

**Commands**:
- [ResurrectCharacterCommand](./ResurrectCharacterCommand.md) - Resurrect dead/ashes
- [EnterTownCommand](../meta/EnterTownCommand.md) - Enter town

**Systems**:
- [Town System](../systems/town-system.md) - Town services overview
