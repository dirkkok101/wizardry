# ChangeFormationCommand

**Move character between front and back rows in party formation.**

## Responsibility

Handles movement of characters between front row and back row during party management. Validates row capacity constraints (max 3 per row) and updates formation. Creates event log entry for formation change.

## Command Flow

**Preconditions**:
- Party must exist
- Character must be in party
- Target row must have space (max 3 characters)
- Character must be alive

**Services Called**:
1. `PartyService.findMember()` - Verify character in party
2. `PartyService.moveToFrontRow()` - Move character to front
3. `PartyService.moveToBackRow()` - Move character to back
4. `PartyService.getFormation()` - Get current formation state

**Events Created**:
- `FormationChangedEvent` - Log formation change

**State Changes**:
- Updates `gameState.party.formation.frontRow`
- Updates `gameState.party.formation.backRow`
- Adds formation change event to `gameState.eventLog`

## API Reference

```typescript
interface ChangeFormationCommand {
  execute(
    state: GameState,
    params: FormationChangeParams
  ): GameState
}

interface FormationChangeParams {
  characterId: string
  targetRow: 'front' | 'back'
}
```

## Preconditions

**Validation checks**:
1. **Party exists**: Must have active party
2. **Character in party**: Character must be member of party
3. **Target row has space**: Target row must have fewer than 3 characters
4. **Not same row**: Character not already in target row

**Throws**:
- `NoActivePartyError` - No party currently formed
- `CharacterNotInPartyError` - Character not in party
- `RowFullError` - Target row already has 3 characters
- `AlreadyInRowError` - Character already in target row

## Services Used

### PartyService
- `findMember()` - Locate character in party
- `moveToFrontRow()` - Move character to front row
- `moveToBackRow()` - Move character to back row
- `getFormation()` - Get current formation state
- `getCharacterRow()` - Determine which row character is in

## Events Created

### FormationChangedEvent
```typescript
{
  type: 'FORMATION_CHANGED',
  timestamp: number,
  data: {
    characterId: string,
    name: string,
    class: CharacterClass,
    fromRow: 'front' | 'back',
    toRow: 'front' | 'back'
  }
}
```

**Event log message**: "Gandalf the Mage moved from back row to front row."

## Formation Strategy

### Front Row
**Advantages**:
- Can use melee weapons effectively
- Attacked first by enemies (acts as tank)
- Required for certain weapon types

**Best classes**: Fighter, Lord, Samurai, Ninja

### Back Row
**Advantages**:
- Protected from melee attacks (lower chance to be hit)
- Safe position for fragile classes
- Can still cast spells and use ranged weapons

**Best classes**: Mage, Priest, Bishop, Thief

### Tactical Considerations
```typescript
// Common strategies:
// 1. Front-heavy (3 front, 3 back) - Balanced
// 2. Back-heavy (2 front, 4 back) - More spellcasters
// 3. All-melee (6 front, 0 back) - Not recommended (formation error)

// Dynamic formation changes:
// - Move injured fighter to back to protect
// - Move healthy mage to front if needed
// - Swap positions based on enemy type
```

## Example Usage

```typescript
// Initial party formation
const party = {
  formation: {
    frontRow: [fighter1, fighter2],
    backRow: [mage1, priest1, thief1]
  }
}

// Move Mage to front row (risky but sometimes needed)
const newState = ChangeFormationCommand.execute(gameState, {
  characterId: mage1.id,
  targetRow: "front"
})

// Formation now:
// Front: Fighter1, Fighter2, Mage1
// Back: Priest1, Thief1

// Move injured fighter to back row for protection
const newState2 = ChangeFormationCommand.execute(newState, {
  characterId: fighter1.id,
  targetRow: "back"
})

// Formation now:
// Front: Fighter2, Mage1
// Back: Priest1, Thief1, Fighter1
```

## Testing

**Test cases**:

```typescript
describe('ChangeFormationCommand', () => {
  test('moves character from back to front', () => {
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const mage = createCharacter({ name: "Wizard", class: "MAGE" })
    const party = createParty([fighter, mage])
    const stateWithParty = { ...gameState, party }

    const newState = ChangeFormationCommand.execute(stateWithParty, {
      characterId: mage.id,
      targetRow: "front"
    })

    expect(newState.party.formation.frontRow).toContainEqual(mage)
    expect(newState.party.formation.backRow).not.toContainEqual(mage)
  })

  test('moves character from front to back', () => {
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const mage = createCharacter({ name: "Wizard", class: "MAGE" })
    const party = createParty([fighter, mage])
    const stateWithParty = { ...gameState, party }

    const newState = ChangeFormationCommand.execute(stateWithParty, {
      characterId: fighter.id,
      targetRow: "back"
    })

    expect(newState.party.formation.backRow).toContainEqual(fighter)
    expect(newState.party.formation.frontRow).not.toContainEqual(fighter)
  })

  test('throws error when target row full (3 characters)', () => {
    const chars = createCharacters([
      { name: "F1", class: "FIGHTER" },
      { name: "F2", class: "FIGHTER" },
      { name: "F3", class: "FIGHTER" },
      { name: "M1", class: "MAGE" }
    ])
    const party = createParty(chars)
    const stateWithParty = { ...gameState, party }

    expect(() => ChangeFormationCommand.execute(stateWithParty, {
      characterId: chars[3].id, // Mage
      targetRow: "front" // Front already has 3
    })).toThrow(RowFullError)
  })

  test('throws error when no active party', () => {
    const character = createCharacter({ name: "Lonely" })

    expect(() => ChangeFormationCommand.execute(gameState, {
      characterId: character.id,
      targetRow: "front"
    })).toThrow(NoActivePartyError)
  })

  test('throws error when character not in party', () => {
    const inParty = createCharacter({ name: "InParty" })
    const notInParty = createCharacter({ name: "NotInParty" })
    const party = createParty([inParty])
    const stateWithParty = { ...gameState, party }

    expect(() => ChangeFormationCommand.execute(stateWithParty, {
      characterId: notInParty.id,
      targetRow: "front"
    })).toThrow(CharacterNotInPartyError)
  })

  test('throws error when already in target row', () => {
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const party = createParty([fighter])
    const stateWithParty = { ...gameState, party }

    expect(() => ChangeFormationCommand.execute(stateWithParty, {
      characterId: fighter.id,
      targetRow: "front" // Already in front
    })).toThrow(AlreadyInRowError)
  })

  test('swaps all front row to back row', () => {
    const chars = createCharacters([
      { name: "F1", class: "FIGHTER" },
      { name: "F2", class: "FIGHTER" },
      { name: "F3", class: "FIGHTER" }
    ])
    let state = { ...gameState, party: createParty(chars) }

    state = ChangeFormationCommand.execute(state, {
      characterId: chars[0].id,
      targetRow: "back"
    })
    state = ChangeFormationCommand.execute(state, {
      characterId: chars[1].id,
      targetRow: "back"
    })
    state = ChangeFormationCommand.execute(state, {
      characterId: chars[2].id,
      targetRow: "back"
    })

    expect(state.party.formation.frontRow).toHaveLength(0)
    expect(state.party.formation.backRow).toHaveLength(3)
  })

  test('moves Mage to front row (valid but risky)', () => {
    const mage = createCharacter({ name: "BraveMage", class: "MAGE" })
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const party = createParty([fighter, mage])
    const stateWithParty = { ...gameState, party }

    const newState = ChangeFormationCommand.execute(stateWithParty, {
      characterId: mage.id,
      targetRow: "front"
    })

    expect(newState.party.formation.frontRow).toContainEqual(mage)
  })

  test('moves Lord from front to back', () => {
    const lord = createCharacter({ name: "Paladin", class: "LORD" })
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const party = createParty([lord, fighter])
    const stateWithParty = { ...gameState, party }

    const newState = ChangeFormationCommand.execute(stateWithParty, {
      characterId: lord.id,
      targetRow: "back"
    })

    expect(newState.party.formation.backRow).toContainEqual(lord)
  })

  test('moves Samurai between rows', () => {
    const samurai = createCharacter({ name: "Warrior", class: "SAMURAI" })
    const mage = createCharacter({ name: "Wizard", class: "MAGE" })
    const party = createParty([samurai, mage])
    let state = { ...gameState, party }

    // Samurai starts in front
    expect(state.party.formation.frontRow).toContainEqual(samurai)

    // Move to back
    state = ChangeFormationCommand.execute(state, {
      characterId: samurai.id,
      targetRow: "back"
    })
    expect(state.party.formation.backRow).toContainEqual(samurai)

    // Move back to front
    state = ChangeFormationCommand.execute(state, {
      characterId: samurai.id,
      targetRow: "front"
    })
    expect(state.party.formation.frontRow).toContainEqual(samurai)
  })

  test('moves Thief from back to front', () => {
    const thief = createCharacter({ name: "Rogue", class: "THIEF" })
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const party = createParty([fighter, thief])
    const stateWithParty = { ...gameState, party }

    const newState = ChangeFormationCommand.execute(stateWithParty, {
      characterId: thief.id,
      targetRow: "front"
    })

    expect(newState.party.formation.frontRow).toContainEqual(thief)
  })

  test('event log contains formation change', () => {
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const mage = createCharacter({ name: "Wizard", class: "MAGE" })
    const party = createParty([fighter, mage])
    const stateWithParty = { ...gameState, party }

    const newState = ChangeFormationCommand.execute(stateWithParty, {
      characterId: mage.id,
      targetRow: "front"
    })

    const event = newState.eventLog[newState.eventLog.length - 1]
    expect(event.type).toBe('FORMATION_CHANGED')
    expect(event.data.name).toBe("Wizard")
    expect(event.data.fromRow).toBe("back")
    expect(event.data.toRow).toBe("front")
  })

  test('maintains party size after formation change', () => {
    const chars = createCharacters(6)
    const party = createParty(chars)
    let state = { ...gameState, party }

    state = ChangeFormationCommand.execute(state, {
      characterId: chars[0].id,
      targetRow: "back"
    })

    expect(state.party.members).toHaveLength(6)
  })

  test('fills front row to capacity (3)', () => {
    const chars = createCharacters([
      { name: "F1", class: "FIGHTER" },
      { name: "M1", class: "MAGE" },
      { name: "M2", class: "MAGE" },
      { name: "M3", class: "MAGE" }
    ])
    let state = { ...gameState, party: createParty(chars) }

    state = ChangeFormationCommand.execute(state, {
      characterId: chars[1].id,
      targetRow: "front"
    })
    state = ChangeFormationCommand.execute(state, {
      characterId: chars[2].id,
      targetRow: "front"
    })

    expect(state.party.formation.frontRow).toHaveLength(3)
  })

  test('fills back row to capacity (3)', () => {
    const chars = createCharacters([
      { name: "F1", class: "FIGHTER" },
      { name: "F2", class: "FIGHTER" },
      { name: "F3", class: "FIGHTER" },
      { name: "M1", class: "MAGE" }
    ])
    let state = { ...gameState, party: createParty(chars) }

    state = ChangeFormationCommand.execute(state, {
      characterId: chars[0].id,
      targetRow: "back"
    })
    state = ChangeFormationCommand.execute(state, {
      characterId: chars[1].id,
      targetRow: "back"
    })

    expect(state.party.formation.backRow).toHaveLength(3)
  })
})
```

## Related

**Services**:
- [PartyService](../services/PartyService.md) - Formation management

**Related Commands**:
- [FormPartyCommand](./FormPartyCommand.md) - Initial formation setup
- [AddToPartyCommand](./AddToPartyCommand.md) - Add character to row
- [RemoveFromPartyCommand](./RemoveFromPartyCommand.md) - Remove from formation

**Game Design**:
- [Party System](../game-design/05-party-system.md) - Party mechanics
- [Formation Strategy](../game-design/05-party-system.md#formation) - Front/back row tactics
- [Combat System](../game-design/06-combat-system.md) - How formation affects combat
