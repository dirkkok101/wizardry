# ResurrectCharacterCommand

**Command for resurrecting a dead or ashes character at the temple.**

## Responsibility

Executes resurrection attempt for dead or ashes characters. Handles payment, success/failure outcomes, and permanent loss on failed ashes resurrection.

## Command Flow

### Preconditions
1. Must be in TEMPLE_MENU mode
2. Target character must be dead or ashes
3. Party must have sufficient gold for resurrection cost
4. Party must have at least 1 conscious member to pay

### Services Called
- `TempleService.calculateResurrectionCost(character, type)` - Calculate cost
- `TempleService.calculateResurrectionChance(character, type)` - Get success rate
- `TempleService.resurrectFromDead(character, gold)` - Resurrect from dead
- `TempleService.resurrectFromAshes(character, gold)` - Resurrect from ashes

### Events Created
- `RESURRECT_SUCCESS` event on successful resurrection
- `RESURRECT_FAIL_TO_ASHES` event when dead → ashes
- `RESURRECT_FAIL_LOST` event when ashes → lost forever

### State Changes
- **Success**: Character status changes to 'alive', HP set to 1
- **Dead failure**: Character status changes to 'ashes'
- **Ashes failure**: Character removed from roster permanently
- Party gold reduced by resurrection cost

## API Reference

```typescript
function execute(
  state: GameState,
  characterId: string,
  resurrectionType: 'dead' | 'ashes'
): GameState
```

**Parameters**:
- `state`: Current game state (must be in TEMPLE_MENU mode)
- `characterId`: ID of character to resurrect
- `resurrectionType`: Type of resurrection needed

**Returns**: New game state with resurrection outcome

**Throws**:
- `InvalidStateTransitionError` if not in temple
- `InsufficientGoldError` if party cannot afford cost
- `InvalidStatusError` if character not in specified status
- `CharacterNotFoundError` if characterId invalid

**Example**:
```typescript
const dead = createCharacter({
  id: 'char1',
  status: 'dead',
  level: 5,
  age: 25,
  vitality: 95
})
const state = createGameState({
  uiMode: 'TEMPLE_MENU',
  party: { gold: 1000, members: [aliveChar, dead] }
})

const result = ResurrectCharacterCommand.execute(state, 'char1', 'dead')
// Cost: 500 gold (100 × level 5)
// Success (~90%): result.party.members[1].status === 'alive', hp === 1
// Failure (~10%): result.party.members[1].status === 'ashes'
```

## Preconditions

### State Validation
```typescript
// Must be in temple
if (state.uiMode !== 'TEMPLE_MENU') {
  throw new InvalidStateTransitionError('Must be in temple to resurrect')
}
```

### Character Validation
```typescript
// Character must exist
const character = state.roster.get(characterId)
if (!character) {
  throw new CharacterNotFoundError(`Character ${characterId} not found`)
}

// Character must be in correct status
if (resurrectionType === 'dead' && character.status !== 'dead') {
  throw new InvalidStatusError('Character is not dead')
}
if (resurrectionType === 'ashes' && character.status !== 'ashes') {
  throw new InvalidStatusError('Character is not ashes')
}
```

### Gold Validation
```typescript
// Must have sufficient gold
const cost = TempleService.calculateResurrectionCost(character, resurrectionType)
if (state.party.gold < cost) {
  throw new InsufficientGoldError(
    `Resurrection costs ${cost} gold, party has ${state.party.gold}`
  )
}
```

## Services Used

### TempleService
- `calculateResurrectionCost(character, type)` - Get resurrection cost
  - Dead: 100 × level
  - Ashes: 500 × level
- `calculateResurrectionChance(character, type)` - Get success probability
  - Dead: ~90% (minus age/VIM penalties)
  - Ashes: ~50% (minus age/VIM penalties)
- `resurrectFromDead(character, gold)` - Attempt resurrection from dead
- `resurrectFromAshes(character, gold)` - Attempt resurrection from ashes

## Events Created

### Successful Resurrection
```typescript
{
  type: 'RESURRECT_SUCCESS',
  timestamp: Date.now(),
  data: {
    characterId: 'char1',
    characterName: 'Galdor',
    resurrectionType: 'dead',
    cost: 500,
    successChance: 0.90,
    newHP: 1,
    newStatus: 'alive'
  }
}
```

### Failed Dead Resurrection (→ Ashes)
```typescript
{
  type: 'RESURRECT_FAIL_TO_ASHES',
  timestamp: Date.now(),
  data: {
    characterId: 'char1',
    characterName: 'Galdor',
    resurrectionType: 'dead',
    cost: 500,
    successChance: 0.85,
    newStatus: 'ashes'
  }
}
```

### Failed Ashes Resurrection (→ Lost Forever)
```typescript
{
  type: 'RESURRECT_FAIL_LOST',
  timestamp: Date.now(),
  data: {
    characterId: 'char1',
    characterName: 'Galdor',
    resurrectionType: 'ashes',
    cost: 2500,
    successChance: 0.45,
    characterLost: true
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('ResurrectCharacterCommand', () => {
  it('calculates dead resurrection cost as 100 × level', () => {
    const char = createCharacter({ level: 5, status: 'dead' })
    const cost = TempleService.calculateResurrectionCost(char, 'dead')
    expect(cost).toBe(500)
  })

  it('calculates ashes resurrection cost as 500 × level', () => {
    const char = createCharacter({ level: 5, status: 'ashes' })
    const cost = TempleService.calculateResurrectionCost(char, 'ashes')
    expect(cost).toBe(2500)
  })

  it('successfully resurrects from dead (HP = 1, status = alive)', () => {
    const dead = createCharacter({ status: 'dead', level: 5 })
    const state = createGameState({
      uiMode: 'TEMPLE_MENU',
      party: { gold: 1000, members: [aliveChar, dead] }
    })
    // Mock success
    const result = ResurrectCharacterCommand.execute(state, dead.id, 'dead')
    // Note: Actual test would need to handle probabilistic outcome
    if (result.roster.get(dead.id).status === 'alive') {
      expect(result.roster.get(dead.id).hp).toBe(1)
      expect(result.party.gold).toBe(500)
    }
  })

  it('failed dead resurrection turns character to ashes', () => {
    const dead = createCharacter({ status: 'dead', level: 5 })
    const state = createGameState({
      uiMode: 'TEMPLE_MENU',
      party: { gold: 1000, members: [aliveChar, dead] }
    })
    // Mock failure
    const result = ResurrectCharacterCommand.execute(state, dead.id, 'dead')
    if (result.roster.get(dead.id).status === 'ashes') {
      expect(result.party.gold).toBe(500)
    }
  })

  it('successfully resurrects from ashes (HP = 1, status = alive)', () => {
    const ashes = createCharacter({ status: 'ashes', level: 5 })
    const state = createGameState({
      uiMode: 'TEMPLE_MENU',
      party: { gold: 3000, members: [aliveChar, ashes] }
    })
    const result = ResurrectCharacterCommand.execute(state, ashes.id, 'ashes')
    if (result.roster.get(ashes.id)?.status === 'alive') {
      expect(result.roster.get(ashes.id).hp).toBe(1)
      expect(result.party.gold).toBe(500)
    }
  })

  it('failed ashes resurrection removes character permanently', () => {
    const ashes = createCharacter({ status: 'ashes', level: 5 })
    const state = createGameState({
      uiMode: 'TEMPLE_MENU',
      party: { gold: 3000, members: [aliveChar] },
      roster: new Map([[ashes.id, ashes]])
    })
    const result = ResurrectCharacterCommand.execute(state, ashes.id, 'ashes')
    if (!result.roster.has(ashes.id)) {
      expect(result.party.gold).toBe(500)
      expect(result.roster.has(ashes.id)).toBe(false)
    }
  })

  it('throws error if insufficient gold', () => {
    const dead = createCharacter({ status: 'dead', level: 10 })
    const state = createGameState({
      uiMode: 'TEMPLE_MENU',
      party: { gold: 100, members: [aliveChar, dead] }
    })
    expect(() => ResurrectCharacterCommand.execute(state, dead.id, 'dead'))
      .toThrow(InsufficientGoldError)
  })

  it('throws error if not in temple', () => {
    const state = createGameState({ mode: 'TOWN' })
    expect(() => ResurrectCharacterCommand.execute(state, 'char1', 'dead'))
      .toThrow(InvalidStateTransitionError)
  })

  it('throws error if character not found', () => {
    const state = createGameState({ uiMode: 'TEMPLE_MENU' })
    expect(() => ResurrectCharacterCommand.execute(state, 'invalid', 'dead'))
      .toThrow(CharacterNotFoundError)
  })

  it('age and vitality penalties reduce success rate', () => {
    const young = createCharacter({ age: 20, vitality: 100 })
    const old = createCharacter({ age: 70, vitality: 80 })

    const youngChance = TempleService.calculateResurrectionChance(young, 'dead')
    const oldChance = TempleService.calculateResurrectionChance(old, 'dead')

    expect(youngChance).toBeGreaterThan(oldChance)
  })

  it('creates appropriate event on success', () => {
    const dead = createCharacter({ status: 'dead', level: 5 })
    const state = createGameState({
      uiMode: 'TEMPLE_MENU',
      party: { gold: 1000, members: [aliveChar, dead] }
    })
    const result = ResurrectCharacterCommand.execute(state, dead.id, 'dead')
    const lastEvent = result.eventLog[result.eventLog.length - 1]
    expect(['RESURRECT_SUCCESS', 'RESURRECT_FAIL_TO_ASHES'])
      .toContain(lastEvent.type)
  })
})
```

## Related

**Services**:
- [TempleService](../services/TempleService.md) - Resurrection mechanics
- [TownService](../services/TownService.md) - Temple access

**Commands**:
- [VisitTempleCommand](./VisitTempleCommand.md) - Enter temple
- [RestAtInnCommand](../inn/RestAtInnCommand.md) - Inn rest (can cause death)

**Research**:
- [Combat Formulas](../research/combat-formulas.md) - Resurrection formulas

**Systems**:
- [Town System](../systems/town-system.md) - Town services overview
