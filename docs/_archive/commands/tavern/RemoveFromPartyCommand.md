# RemoveFromPartyCommand

**Remove character from active party.**

## Responsibility

Removes a character from the current party and updates formation. Handles removal from front or back row and adjusts party composition. Creates event log entry for party membership removal.

## Command Flow

**Preconditions**:
- Party must exist
- Character must be in the party
- Character ID must be valid

**Services Called**:
1. `PartyService.findMember()` - Verify character in party
2. `PartyService.removeMember()` - Remove from party members
3. `PartyService.removeFromFormation()` - Remove from front or back row

**Events Created**:
- `CharacterRemovedFromPartyEvent` - Log party membership removal

**State Changes**:
- Removes character from `gameState.party.members`
- Removes character from `gameState.party.formation.frontRow` or `backRow`
- Adds removal event to `gameState.eventLog`

## API Reference

```typescript
interface RemoveFromPartyCommand {
  execute(
    state: GameState,
    characterId: string
  ): GameState
}
```

## Preconditions

**Validation checks**:
1. **Party exists**: Must have active party
2. **Character in party**: Character must be member of current party
3. **Valid ID**: Character ID must be valid UUID format

**Throws**:
- `NoActivePartyError` - No party currently formed
- `CharacterNotInPartyError` - Character not in party
- `InvalidIdError` - Invalid character ID format

## Services Used

### PartyService
- `findMember()` - Locate character in party
- `removeMember()` - Remove character from members array
- `removeFromFormation()` - Remove from front or back row
- `isCharacterInParty()` - Verify membership

## Events Created

### CharacterRemovedFromPartyEvent
```typescript
{
  type: 'CHARACTER_REMOVED_FROM_PARTY',
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

**Event log message**: "Gandalf the Mage left the party (was in back row). Party size: 3"

## Example Usage

```typescript
// Remove character from party
const party = {
  members: [fighter, mage, priest],
  formation: {
    frontRow: [fighter],
    backRow: [mage, priest]
  }
}

const newState = RemoveFromPartyCommand.execute(gameState, mage.id)

// Party now has 2 members
// newState.party.members: [fighter, priest]
// newState.party.formation.backRow: [priest]

console.log(`${mage.name} removed from party`)
console.log(`Remaining members: ${newState.party.members.length}`)
```

## Testing

**Test cases**:

```typescript
describe('RemoveFromPartyCommand', () => {
  test('removes character from front row', () => {
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const mage = createCharacter({ name: "Wizard", class: "MAGE" })
    const party = createParty([fighter, mage])
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, fighter.id)

    expect(newState.party.members).toHaveLength(1)
    expect(newState.party.formation.frontRow).not.toContainEqual(fighter)
    expect(newState.party.members).toContainEqual(mage)
  })

  test('removes character from back row', () => {
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const mage = createCharacter({ name: "Wizard", class: "MAGE" })
    const party = createParty([fighter, mage])
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, mage.id)

    expect(newState.party.members).toHaveLength(1)
    expect(newState.party.formation.backRow).not.toContainEqual(mage)
    expect(newState.party.members).toContainEqual(fighter)
  })

  test('removes from full party (6 members)', () => {
    const chars = createCharacters(6)
    const party = createParty(chars)
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, chars[0].id)

    expect(newState.party.members).toHaveLength(5)
  })

  test('removes leaving single member', () => {
    const char1 = createCharacter({ name: "One" })
    const char2 = createCharacter({ name: "Two" })
    const party = createParty([char1, char2])
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, char2.id)

    expect(newState.party.members).toHaveLength(1)
    expect(newState.party.members[0]).toEqual(char1)
  })

  test('removes all members one by one', () => {
    const chars = createCharacters(3)
    let state = { ...gameState, party: createParty(chars) }

    state = RemoveFromPartyCommand.execute(state, chars[0].id)
    expect(state.party.members).toHaveLength(2)

    state = RemoveFromPartyCommand.execute(state, chars[1].id)
    expect(state.party.members).toHaveLength(1)

    state = RemoveFromPartyCommand.execute(state, chars[2].id)
    expect(state.party.members).toHaveLength(0)
  })

  test('throws error when no active party', () => {
    const character = createCharacter({ name: "Lonely" })

    expect(() => RemoveFromPartyCommand.execute(gameState, character.id))
      .toThrow(NoActivePartyError)
  })

  test('throws error when character not in party', () => {
    const inParty = createCharacter({ name: "InParty" })
    const notInParty = createCharacter({ name: "NotInParty" })
    const party = createParty([inParty])
    const stateWithParty = { ...gameState, party }

    expect(() => RemoveFromPartyCommand.execute(stateWithParty, notInParty.id))
      .toThrow(CharacterNotInPartyError)
  })

  test('throws error for invalid character ID', () => {
    const party = createParty([createCharacter({ name: "Hero" })])
    const stateWithParty = { ...gameState, party }

    expect(() => RemoveFromPartyCommand.execute(stateWithParty, "invalid-id"))
      .toThrow(CharacterNotInPartyError)
  })

  test('removes dead character from party', () => {
    const alive = createCharacter({ name: "Alive" })
    const dead = createCharacter({ name: "Dead", condition: "DEAD" })
    const party = createParty([alive, dead])
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, dead.id)

    expect(newState.party.members).toHaveLength(1)
    expect(newState.party.members[0]).toEqual(alive)
  })

  test('removes character from 3-person front row', () => {
    const f1 = createCharacter({ name: "F1", class: "FIGHTER" })
    const f2 = createCharacter({ name: "F2", class: "FIGHTER" })
    const f3 = createCharacter({ name: "F3", class: "FIGHTER" })
    const party = createParty([f1, f2, f3])
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, f2.id)

    expect(newState.party.formation.frontRow).toHaveLength(2)
    expect(newState.party.formation.frontRow).not.toContainEqual(f2)
  })

  test('removes character from 3-person back row', () => {
    const m1 = createCharacter({ name: "M1", class: "MAGE" })
    const m2 = createCharacter({ name: "M2", class: "MAGE" })
    const m3 = createCharacter({ name: "M3", class: "MAGE" })
    const party = createParty([m1, m2, m3])
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, m2.id)

    expect(newState.party.formation.backRow).toHaveLength(2)
    expect(newState.party.formation.backRow).not.toContainEqual(m2)
  })

  test('event log contains removal event', () => {
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const mage = createCharacter({ name: "Wizard", class: "MAGE" })
    const party = createParty([fighter, mage])
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, mage.id)

    const event = newState.eventLog[newState.eventLog.length - 1]
    expect(event.type).toBe('CHARACTER_REMOVED_FROM_PARTY')
    expect(event.data.name).toBe("Wizard")
    expect(event.data.partySize).toBe(1)
    expect(event.data.row).toBe("back")
  })

  test('maintains formation structure after removal', () => {
    const chars = createCharacters([
      { name: "F1", class: "FIGHTER" },
      { name: "F2", class: "FIGHTER" },
      { name: "M1", class: "MAGE" },
      { name: "M2", class: "MAGE" }
    ])
    const party = createParty(chars)
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, chars[1].id)

    expect(newState.party.formation.frontRow).toHaveLength(1)
    expect(newState.party.formation.backRow).toHaveLength(2)
  })

  test('removes Lord from front row', () => {
    const lord = createCharacter({ name: "Paladin", class: "LORD" })
    const mage = createCharacter({ name: "Wizard", class: "MAGE" })
    const party = createParty([lord, mage])
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, lord.id)

    expect(newState.party.formation.frontRow).toHaveLength(0)
    expect(newState.party.members).toEqual([mage])
  })

  test('removes Ninja from front row', () => {
    const ninja = createCharacter({ name: "Shadow", class: "NINJA" })
    const fighter = createCharacter({ name: "Tank", class: "FIGHTER" })
    const party = createParty([ninja, fighter])
    const stateWithParty = { ...gameState, party }

    const newState = RemoveFromPartyCommand.execute(stateWithParty, ninja.id)

    expect(newState.party.formation.frontRow).toEqual([fighter])
  })
})
```

## Related

**Services**:
- [PartyService](../services/PartyService.md) - Party membership management
- [RosterService](../services/RosterService.md) - Character lookup

**Related Commands**:
- [FormPartyCommand](./FormPartyCommand.md) - Create party
- [AddToPartyCommand](./AddToPartyCommand.md) - Add character to party
- [DeleteCharacterCommand](../training-grounds/DeleteCharacterCommand.md) - Delete character (must remove from party first)

**Game Design**:
- [Party System](../game-design/05-party-system.md) - Party mechanics
