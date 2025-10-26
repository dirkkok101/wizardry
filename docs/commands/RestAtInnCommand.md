# RestAtInnCommand

**Command for resting party at the inn.**

## Responsibility

Executes inn rest operation to restore HP, spell points, and remove temporary status effects. Deducts gold cost and applies aging/vitality penalties.

## Command Flow

### Preconditions
1. Party must be in TOWN mode
2. Party must have at least 1 conscious member
3. Party must have sufficient gold for rest cost

### Services Called
- `InnService.calculateRestCost(party)` - Calculate gold cost
- `InnService.restAtInn(party)` - Perform rest operation

### Events Created
- `REST_AT_INN` event with cost, restored HP/SP, and any character deaths

### State Changes
- All party members: HP restored to max
- All party members: Spell points restored to max
- Temporary status effects removed (poison, paralysis, sleep)
- Party gold reduced by rest cost
- All characters aged slightly (~0.1 years)
- All characters vitality reduced (~0.05 VIM)
- Possible old age deaths for elderly characters

## API Reference

```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (must be in TOWN mode)

**Returns**: New game state with party rested

**Throws**:
- `InvalidStateTransitionError` if not in town
- `InsufficientGoldError` if party cannot afford rest
- `NoConsciousMembersError` if no conscious members

**Example**:
```typescript
const state = createGameState({
  mode: 'TOWN',
  party: {
    gold: 100,
    members: [
      createCharacter({ hp: 10, maxHP: 50, age: 20 }),
      createCharacter({ hp: 5, maxHP: 30, age: 25, status: ['poisoned'] })
    ]
  }
})

const result = RestAtInnCommand.execute(state)
// result.party.members[0].hp === 50 (restored)
// result.party.members[0].age ≈ 20.1 (aged)
// result.party.members[1].hp === 30 (restored)
// result.party.members[1].status === [] (poison cured)
// result.party.gold < 100 (cost deducted)
```

## Preconditions

### State Validation
```typescript
// Must be in town
if (state.mode !== 'TOWN') {
  throw new InvalidStateTransitionError('Must be in town to rest at inn')
}
```

### Party Validation
```typescript
// Must have at least one conscious member
const consciousMembers = state.party.members.filter(m => m.status === 'alive')
if (consciousMembers.length === 0) {
  throw new NoConsciousMembersError('No conscious members to rest')
}

// Must have sufficient gold
const cost = InnService.calculateRestCost(state.party)
if (state.party.gold < cost) {
  throw new InsufficientGoldError(`Rest costs ${cost} gold, party has ${state.party.gold}`)
}
```

## Services Used

### InnService
- `calculateRestCost(party)` - Calculate gold cost based on party size/level
- `restAtInn(party)` - Perform full rest operation
- `restoreHP(party)` - Restore all HP to maximum
- `restoreSpellPoints(character)` - Restore all spell points
- `removeTemporaryStatus(character)` - Remove curable status effects
- `applyAging(character)` - Age character ~0.1 years
- `applyVitalityLoss(character)` - Reduce VIM ~0.05
- `checkOldAgeDeath(character)` - Check for age-based death

## Events Created

```typescript
{
  type: 'REST_AT_INN',
  timestamp: Date.now(),
  data: {
    cost: 30,
    restored: [
      { characterId: 'char1', hpRestored: 40, spRestored: 15 },
      { characterId: 'char2', hpRestored: 25, spRestored: 8, statusCured: ['poisoned'] }
    ],
    aging: [
      { characterId: 'char1', newAge: 20.1 },
      { characterId: 'char2', newAge: 25.1 }
    ],
    deaths: [] // Empty if no age deaths
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('RestAtInnCommand', () => {
  it('restores all HP to maximum', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        gold: 100,
        members: [createCharacter({ hp: 10, maxHP: 50 })]
      }
    })
    const result = RestAtInnCommand.execute(state)
    expect(result.party.members[0].hp).toBe(50)
  })

  it('restores all spell points to maximum', () => {
    const mage = createCharacter({
      mageSpellPoints: new Map([[1, 0], [2, 0]]),
      maxMageSpellPoints: new Map([[1, 3], [2, 2]])
    })
    const state = createGameState({
      mode: 'TOWN',
      party: { gold: 100, members: [mage] }
    })
    const result = RestAtInnCommand.execute(state)
    expect(result.party.members[0].mageSpellPoints.get(1)).toBe(3)
    expect(result.party.members[0].mageSpellPoints.get(2)).toBe(2)
  })

  it('removes temporary status effects (poison, paralysis)', () => {
    const poisoned = createCharacter({ status: ['poisoned', 'paralyzed'] })
    const state = createGameState({
      mode: 'TOWN',
      party: { gold: 100, members: [poisoned] }
    })
    const result = RestAtInnCommand.execute(state)
    expect(result.party.members[0].status).toEqual([])
  })

  it('does not remove permanent status (dead, ashes)', () => {
    const dead = createCharacter({ status: ['dead'] })
    const state = createGameState({
      mode: 'TOWN',
      party: {
        gold: 100,
        members: [createCharacter({ status: 'alive' }), dead]
      }
    })
    const result = RestAtInnCommand.execute(state)
    expect(result.party.members[1].status).toContain('dead')
  })

  it('deducts gold cost', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { gold: 100, members: [createCharacter()] }
    })
    const result = RestAtInnCommand.execute(state)
    expect(result.party.gold).toBeLessThan(100)
  })

  it('ages characters slightly', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        gold: 100,
        members: [createCharacter({ age: 20 })]
      }
    })
    const result = RestAtInnCommand.execute(state)
    expect(result.party.members[0].age).toBeGreaterThan(20)
    expect(result.party.members[0].age).toBeLessThan(20.2)
  })

  it('reduces vitality (VIM)', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        gold: 100,
        members: [createCharacter({ vitality: 100 })]
      }
    })
    const result = RestAtInnCommand.execute(state)
    expect(result.party.members[0].vitality).toBeLessThan(100)
  })

  it('throws error if insufficient gold', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { gold: 0, members: [createCharacter()] }
    })
    expect(() => RestAtInnCommand.execute(state))
      .toThrow(InsufficientGoldError)
  })

  it('throws error if not in town', () => {
    const state = createGameState({ mode: 'NAVIGATION' })
    expect(() => RestAtInnCommand.execute(state))
      .toThrow(InvalidStateTransitionError)
  })

  it('may cause old age death for elderly characters', () => {
    const elderly = createCharacter({ age: 75 })
    const state = createGameState({
      mode: 'TOWN',
      party: { gold: 1000, members: [elderly] }
    })
    // Run multiple times to test probability
    let deathOccurred = false
    for (let i = 0; i < 100; i++) {
      const result = RestAtInnCommand.execute(state)
      if (result.party.members[0].status === 'dead') {
        deathOccurred = true
        break
      }
    }
    // At age 75, death should occur occasionally
  })

  it('creates REST_AT_INN event', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { gold: 100, members: [createCharacter()] }
    })
    const result = RestAtInnCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('REST_AT_INN')
  })
})
```

## Related

**Services**:
- [InnService](../services/InnService.md) - Inn rest mechanics
- [TownService](../services/TownService.md) - Inn access validation

**Commands**:
- [EnterTownCommand](./EnterTownCommand.md) - Enter town
- [VisitTempleCommand](./VisitTempleCommand.md) - Temple for resurrection

**Systems**:
- [Town System](../systems/town-system.md) - Town services overview
- [Combat Formulas](../research/combat-formulas.md) - Aging and VIM formulas
