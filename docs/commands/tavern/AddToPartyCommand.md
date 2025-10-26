# AddToPartyCommand

**Add character to existing party.**

## Responsibility

Adds a single character to the current party with validation of party size constraints. Assigns character to appropriate formation row (front or back) based on class or explicit specification. Creates event log entry for party membership change.

## Command Flow

**Preconditions**:
- Party must exist (cannot add to non-existent party)
- Party must not be full (max 6 members)
- Character must exist in roster
- Character must not already be in party
- Character must be alive

**Services Called**:
1. `RosterService.findCharacter()` - Validate character exists
2. `PartyService.addMember()` - Add character to party
3. `PartyService.assignToRow()` - Assign to front or back row
4. `CharacterService.validateForParty()` - Check character eligibility

**Events Created**:
- `CharacterAddedToPartyEvent` - Log party membership addition

**State Changes**:
- Adds character to `gameState.party.members`
- Adds character to `gameState.party.formation.frontRow` or `backRow`
- Adds event to `gameState.eventLog`

## API Reference

```typescript
interface AddToPartyCommand {
  execute(
    state: GameState,
    params: AddToPartyParams
  ): GameState
}

interface AddToPartyParams {
  characterId: string
  row?: 'front' | 'back' // Optional, auto-assigned if not specified
}
```

## Preconditions

**Validation checks**:
1. **Party exists**: Must have active party
2. **Party not full**: Party must have fewer than 6 members
3. **Character exists**: Character ID must exist in roster
4. **Not duplicate**: Character not already in party
5. **Character alive**: Character must not be DEAD/ASHES/LOST
6. **Row not full**: Target row (front or back) must have space (max 3 each)

**Throws**:
- `NoActivePartyError` - No party currently formed
- `PartyFullError` - Party already has 6 members
- `CharacterNotFoundError` - Character ID doesn't exist
- `CharacterAlreadyInPartyError` - Character already in party
- `CharacterDeadError` - Dead characters cannot join party
- `RowFullError` - Target row already has 3 characters

## Services Used

### RosterService
- `findCharacter()` - Locate character by ID

### PartyService
- `addMember()` - Add character to party members
- `assignToRow()` - Place character in front or back row
- `isPartyFull()` - Check if party has 6 members
- `isCharacterInParty()` - Check for duplicate membership

### CharacterService
- `validateForParty()` - Check if character eligible
- `isAlive()` - Verify character not dead

## Events Created

### CharacterAddedToPartyEvent
```typescript
{
  type: 'CHARACTER_ADDED_TO_PARTY',
  timestamp: number,
  data: {
    characterId: string,
    name: string,
    class: CharacterClass,
    row: 'front' | 'back',
    partySize: number
  }
}
```

**Event log message**: "Gandalf the Mage joined the party (back row). Party size: 4"

## Row Assignment Logic

**Auto-assignment** (when row not specified):
```typescript
// Front row classes
const frontRowClasses = ['FIGHTER', 'LORD', 'SAMURAI', 'NINJA']

// Back row classes
const backRowClasses = ['MAGE', 'PRIEST', 'BISHOP', 'THIEF']

// Assignment algorithm:
if (frontRowClasses.includes(character.class) && frontRow.length < 3) {
  assignToFront()
} else if (backRow.length < 3) {
  assignToBack()
} else if (frontRow.length < 3) {
  assignToFront()
} else {
  throw new RowFullError("Both rows are full")
}
```

## Example Usage

```typescript
// Add character with auto row assignment
const newState = AddToPartyCommand.execute(gameState, {
  characterId: "mage-123"
})
// Mage auto-assigned to back row

// Add character to specific row
const newState2 = AddToPartyCommand.execute(gameState, {
  characterId: "fighter-456",
  row: "front"
})
// Fighter placed in front row

// Check party state
console.log(`Party size: ${newState2.party.members.length}/6`)
console.log(`Front row: ${newState2.party.formation.frontRow.length}/3`)
console.log(`Back row: ${newState2.party.formation.backRow.length}/3`)
```

## Testing

**Test cases**:

```typescript
describe('AddToPartyCommand', () => {
  test('adds Fighter to front row (auto-assignment)', () => {
    const party = createParty([
      { name: "Existing", class: "MAGE" }
    ])
    const stateWithParty = { ...gameState, party }

    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })

    const newState = AddToPartyCommand.execute(stateWithParty, {
      characterId: fighter.id
    })

    expect(newState.party.members).toHaveLength(2)
    expect(newState.party.formation.frontRow).toContainEqual(fighter)
  })

  test('adds Mage to back row (auto-assignment)', () => {
    const party = createParty([
      { name: "Tank", class: "FIGHTER" }
    ])
    const stateWithParty = { ...gameState, party }

    const mage = createCharacter({ name: "Wizard", class: "MAGE" })

    const newState = AddToPartyCommand.execute(stateWithParty, {
      characterId: mage.id
    })

    expect(newState.party.formation.backRow).toContainEqual(mage)
  })

  test('adds character to explicit row', () => {
    const party = createParty([{ name: "Hero" }])
    const stateWithParty = { ...gameState, party }

    const mage = createCharacter({ name: "FrontMage", class: "MAGE" })

    const newState = AddToPartyCommand.execute(stateWithParty, {
      characterId: mage.id,
      row: "front" // Force Mage to front
    })

    expect(newState.party.formation.frontRow).toContainEqual(mage)
  })

  test('throws error when party full (6 members)', () => {
    const fullParty = createParty(
      Array(6).fill(null).map((_, i) => ({ name: `Hero${i}` }))
    )
    const stateWithParty = { ...gameState, party: fullParty }

    const extra = createCharacter({ name: "Extra" })

    expect(() => AddToPartyCommand.execute(stateWithParty, {
      characterId: extra.id
    })).toThrow(PartyFullError)
  })

  test('throws error when no active party', () => {
    const character = createCharacter({ name: "Lonely" })

    expect(() => AddToPartyCommand.execute(gameState, {
      characterId: character.id
    })).toThrow(NoActivePartyError)
  })

  test('throws error when character already in party', () => {
    const character = createCharacter({ name: "Duplicate" })
    const party = createParty([character])
    const stateWithParty = { ...gameState, party }

    expect(() => AddToPartyCommand.execute(stateWithParty, {
      characterId: character.id
    })).toThrow(CharacterAlreadyInPartyError)
  })

  test('throws error when character dead', () => {
    const party = createParty([{ name: "Alive" }])
    const stateWithParty = { ...gameState, party }

    const dead = createCharacter({ name: "Dead", condition: "DEAD" })

    expect(() => AddToPartyCommand.execute(stateWithParty, {
      characterId: dead.id
    })).toThrow(CharacterDeadError)
  })

  test('throws error when front row full', () => {
    const party = createParty([
      { name: "F1", class: "FIGHTER" },
      { name: "F2", class: "FIGHTER" },
      { name: "F3", class: "FIGHTER" }
    ])
    const stateWithParty = { ...gameState, party }

    const fighter = createCharacter({ name: "F4", class: "FIGHTER" })

    expect(() => AddToPartyCommand.execute(stateWithParty, {
      characterId: fighter.id,
      row: "front"
    })).toThrow(RowFullError)
  })

  test('throws error when back row full', () => {
    const party = createParty([
      { name: "M1", class: "MAGE" },
      { name: "M2", class: "MAGE" },
      { name: "M3", class: "MAGE" }
    ])
    const stateWithParty = { ...gameState, party }

    const mage = createCharacter({ name: "M4", class: "MAGE" })

    expect(() => AddToPartyCommand.execute(stateWithParty, {
      characterId: mage.id,
      row: "back"
    })).toThrow(RowFullError)
  })

  test('fills party to exactly 6 members', () => {
    const party = createParty(
      Array(5).fill(null).map((_, i) => ({ name: `Hero${i}` }))
    )
    const stateWithParty = { ...gameState, party }

    const sixth = createCharacter({ name: "Sixth" })

    const newState = AddToPartyCommand.execute(stateWithParty, {
      characterId: sixth.id
    })

    expect(newState.party.members).toHaveLength(6)
  })

  test('assigns Lord to front row', () => {
    const party = createParty([{ name: "Tank" }])
    const stateWithParty = { ...gameState, party }

    const lord = createCharacter({ name: "Paladin", class: "LORD" })

    const newState = AddToPartyCommand.execute(stateWithParty, {
      characterId: lord.id
    })

    expect(newState.party.formation.frontRow).toContainEqual(lord)
  })

  test('assigns Samurai to front row', () => {
    const party = createParty([{ name: "Tank" }])
    const stateWithParty = { ...gameState, party }

    const samurai = createCharacter({ name: "Warrior", class: "SAMURAI" })

    const newState = AddToPartyCommand.execute(stateWithParty, {
      characterId: samurai.id
    })

    expect(newState.party.formation.frontRow).toContainEqual(samurai)
  })

  test('assigns Bishop to back row', () => {
    const party = createParty([{ name: "Tank" }])
    const stateWithParty = { ...gameState, party }

    const bishop = createCharacter({ name: "Cleric", class: "BISHOP" })

    const newState = AddToPartyCommand.execute(stateWithParty, {
      characterId: bishop.id
    })

    expect(newState.party.formation.backRow).toContainEqual(bishop)
  })

  test('event log contains addition event', () => {
    const party = createParty([{ name: "Hero1" }])
    const stateWithParty = { ...gameState, party }

    const character = createCharacter({ name: "Hero2", class: "FIGHTER" })

    const newState = AddToPartyCommand.execute(stateWithParty, {
      characterId: character.id
    })

    const event = newState.eventLog[newState.eventLog.length - 1]
    expect(event.type).toBe('CHARACTER_ADDED_TO_PARTY')
    expect(event.data.name).toBe("Hero2")
    expect(event.data.partySize).toBe(2)
  })
})
```

## Related

**Services**:
- [PartyService](../services/PartyService.md) - Party membership management
- [RosterService](../services/RosterService.md) - Character lookup
- [CharacterService](../services/CharacterService.md) - Character validation

**Related Commands**:
- [FormPartyCommand](./FormPartyCommand.md) - Create initial party
- [RemoveFromPartyCommand](./RemoveFromPartyCommand.md) - Remove character
- [ChangeFormationCommand](./ChangeFormationCommand.md) - Change rows

**Game Design**:
- [Party System](../game-design/05-party-system.md) - Party mechanics
- [Formation Strategy](../game-design/05-party-system.md#formation) - Row tactics
