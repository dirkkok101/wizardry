# DeleteCharacterCommand

**Delete character from roster permanently.**

## Responsibility

Removes character from roster after validation. Ensures character is not currently in an active party. Creates event log entry for character deletion.

## Command Flow

**Preconditions**:
- Character must exist in roster
- Character must not be in active party
- Character ID must be valid

**Services Called**:
1. `RosterService.findCharacter()` - Verify character exists
2. `PartyService.isCharacterInParty()` - Check party membership
3. `RosterService.removeCharacter()` - Remove from roster

**Events Created**:
- `CharacterDeletedEvent` - Log character deletion

**State Changes**:
- Removes character from `gameState.roster.characters`
- Adds deletion event to `gameState.eventLog`

## API Reference

```typescript
interface DeleteCharacterCommand {
  execute(state: GameState, characterId: string): GameState
}
```

## Preconditions

**Validation checks**:
1. **Character exists**: Character ID must exist in roster
2. **Not in party**: Character must not be member of active party
3. **Valid ID**: Character ID must be valid UUID format

**Throws**:
- `CharacterNotFoundError` - Character ID doesn't exist
- `CharacterInPartyError` - Character is in active party, remove from party first
- `InvalidIdError` - Invalid character ID format

## Services Used

### RosterService
- `findCharacter()` - Locate character by ID
- `removeCharacter()` - Remove character from roster permanently

### PartyService
- `isCharacterInParty()` - Check if character is party member

## Events Created

### CharacterDeletedEvent
```typescript
{
  type: 'CHARACTER_DELETED',
  timestamp: number,
  data: {
    characterId: string,
    name: string,
    level: number,
    class: CharacterClass
  }
}
```

**Event log message**: "Gandalf the Mage (Level 5) has been deleted from the roster."

## Example Usage

```typescript
// Find character to delete
const character = RosterService.findCharacter(gameState.roster, "char-123")
// character: { id: "char-123", name: "Weakling", class: "FIGHTER", level: 1 }

// Verify not in party
const inParty = PartyService.isCharacterInParty(gameState.party, "char-123")
// inParty: false

// Delete character
const newState = DeleteCharacterCommand.execute(gameState, "char-123")
// Character removed from roster
```

## Testing

**Test cases**:

```typescript
describe('DeleteCharacterCommand', () => {
  test('deletes character not in party', () => {
    const character = createCharacter({ name: "Doomed" })
    const stateWithCharacter = {
      ...gameState,
      roster: { characters: [character] }
    }

    const newState = DeleteCharacterCommand.execute(
      stateWithCharacter,
      character.id
    )

    expect(newState.roster.characters).toHaveLength(0)
  })

  test('throws error when character in party', () => {
    const character = createCharacter({ name: "InParty" })
    const stateWithParty = {
      ...gameState,
      roster: { characters: [character] },
      party: { members: [character] }
    }

    expect(() => DeleteCharacterCommand.execute(stateWithParty, character.id))
      .toThrow(CharacterInPartyError)
  })

  test('throws error when character not found', () => {
    expect(() => DeleteCharacterCommand.execute(gameState, "invalid-id"))
      .toThrow(CharacterNotFoundError)
  })

  test('event log contains deletion event', () => {
    const character = createCharacter({
      name: "ToBeDeleted",
      class: "MAGE",
      level: 3
    })
    const stateWithCharacter = {
      ...gameState,
      roster: { characters: [character] }
    }

    const newState = DeleteCharacterCommand.execute(
      stateWithCharacter,
      character.id
    )

    const event = newState.eventLog[newState.eventLog.length - 1]
    expect(event.type).toBe('CHARACTER_DELETED')
    expect(event.data.name).toBe("ToBeDeleted")
    expect(event.data.level).toBe(3)
  })

  test('deletes low-level character', () => {
    const character = createCharacter({ name: "Level1", level: 1 })
    const stateWithCharacter = {
      ...gameState,
      roster: { characters: [character] }
    }

    const newState = DeleteCharacterCommand.execute(
      stateWithCharacter,
      character.id
    )

    expect(newState.roster.characters).toHaveLength(0)
  })

  test('deletes high-level character', () => {
    const character = createCharacter({ name: "Veteran", level: 13 })
    const stateWithCharacter = {
      ...gameState,
      roster: { characters: [character] }
    }

    const newState = DeleteCharacterCommand.execute(
      stateWithCharacter,
      character.id
    )

    expect(newState.roster.characters).toHaveLength(0)
  })

  test('does not affect other characters', () => {
    const char1 = createCharacter({ name: "Keep" })
    const char2 = createCharacter({ name: "Delete" })
    const stateWithCharacters = {
      ...gameState,
      roster: { characters: [char1, char2] }
    }

    const newState = DeleteCharacterCommand.execute(
      stateWithCharacters,
      char2.id
    )

    expect(newState.roster.characters).toHaveLength(1)
    expect(newState.roster.characters[0].name).toBe("Keep")
  })
})
```

## Related

**Services**:
- [RosterService](../services/RosterService.md) - Roster management
- [PartyService](../services/PartyService.md) - Party membership checks

**Related Commands**:
- [CreateCharacterCommand](./CreateCharacterCommand.md) - Create character
- [RemoveFromPartyCommand](./RemoveFromPartyCommand.md) - Remove from party before deletion

**Game Design**:
- [Character Management](../game-design/03-character-management.md) - Player guide
