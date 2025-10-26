# FormPartyCommand

**Create or modify party composition with selected characters.**

## Responsibility

Forms a new party or replaces existing party with selected characters. Handles initial formation assignment (front/back rows), validates party constraints (max 6 members), and initializes party state. Creates event log entry for party formation.

## Command Flow

**Preconditions**:
- Character IDs must exist in roster
- Maximum 6 characters allowed
- Characters must not already be in another active party
- Characters must be alive (not DEAD, ASHES, or LOST)

**Services Called**:
1. `RosterService.findCharacters()` - Validate all character IDs
2. `PartyService.createParty()` - Initialize party structure
3. `PartyService.assignFormation()` - Assign front/back rows
4. `CharacterService.validateForParty()` - Check character eligibility

**Events Created**:
- `PartyFormedEvent` - Log party formation with member list

**State Changes**:
- Creates or replaces `gameState.party`
- Sets `gameState.party.members` array
- Sets `gameState.party.formation` (front/back rows)
- Initializes `gameState.party.position` (if entering dungeon)
- Adds formation event to `gameState.eventLog`

## API Reference

```typescript
interface FormPartyCommand {
  execute(
    state: GameState,
    params: PartyFormationParams
  ): GameState
}

interface PartyFormationParams {
  characterIds: string[]
  formation?: FormationAssignment
}

interface FormationAssignment {
  frontRow: string[] // Character IDs (max 3)
  backRow: string[]  // Character IDs (max 3)
}

interface Party {
  members: Character[]
  formation: {
    frontRow: Character[]
    backRow: Character[]
  }
  position?: Position
  gold: number
}
```

## Preconditions

**Validation checks**:
1. **Valid characters**: All character IDs must exist in roster
2. **Party size**: Maximum 6 characters total
3. **Character availability**: Characters must not be in other active party
4. **Character status**: All characters must be alive
5. **Formation valid**: Front row max 3, back row max 3

**Throws**:
- `CharacterNotFoundError` - One or more character IDs invalid
- `PartyTooLargeError` - More than 6 characters specified
- `CharacterInAnotherPartyError` - Character already in active party
- `CharacterDeadError` - Dead characters cannot join party
- `InvalidFormationError` - Formation assignment invalid (too many in row)

## Services Used

### RosterService
- `findCharacters()` - Batch lookup of characters by IDs
- `validateCharacterIds()` - Verify all IDs exist

### PartyService
- `createParty()` - Initialize empty party structure
- `addMembers()` - Add characters to party
- `assignFormation()` - Assign front/back row positions
- `validatePartySize()` - Check party size constraints

### CharacterService
- `validateForParty()` - Check if character eligible for party
- `isAlive()` - Verify character not dead/ashes/lost

## Events Created

### PartyFormedEvent
```typescript
{
  type: 'PARTY_FORMED',
  timestamp: number,
  data: {
    memberIds: string[],
    memberNames: string[],
    frontRow: string[],
    backRow: string[],
    totalMembers: number
  }
}
```

**Event log message**: "Party formed with 6 members: Conan (F), Gandalf (M), Aragorn (S) in front; Gimli (F), Merlin (M), Frodo (T) in back."

## Default Formation Assignment

If formation not explicitly specified, auto-assign based on class:

```typescript
// Front row classes (fighters, tanks)
const frontRowClasses = ['FIGHTER', 'LORD', 'SAMURAI']

// Back row classes (spellcasters, thieves)
const backRowClasses = ['MAGE', 'PRIEST', 'BISHOP', 'THIEF']

// Ninja can go either (prefer front due to high AC)
const ninjaPreference = 'front'
```

**Auto-assignment algorithm**:
1. Sort characters by class priority
2. Assign fighters to front (max 3)
3. Assign spellcasters to back (max 3)
4. Fill remaining slots with hybrids
5. Ensure each row has max 3

## Example Usage

```typescript
// Create party with 6 characters (auto-formation)
const partyParams = {
  characterIds: [
    "fighter-1",
    "fighter-2",
    "samurai-1",
    "mage-1",
    "priest-1",
    "thief-1"
  ]
}

const newState = FormPartyCommand.execute(gameState, partyParams)

// Party created with auto-formation:
// Front: Fighter, Fighter, Samurai
// Back: Mage, Priest, Thief

// Create party with explicit formation
const customFormation = {
  characterIds: ["char-1", "char-2", "char-3", "char-4"],
  formation: {
    frontRow: ["char-1", "char-2"],
    backRow: ["char-3", "char-4"]
  }
}

const newState2 = FormPartyCommand.execute(gameState, customFormation)
```

## Testing

**Test cases**:

```typescript
describe('FormPartyCommand', () => {
  test('forms party with 6 characters (auto-formation)', () => {
    const chars = createCharacters([
      { name: "Fighter1", class: "FIGHTER" },
      { name: "Fighter2", class: "FIGHTER" },
      { name: "Lord1", class: "LORD" },
      { name: "Mage1", class: "MAGE" },
      { name: "Priest1", class: "PRIEST" },
      { name: "Thief1", class: "THIEF" }
    ])

    const params = { characterIds: chars.map(c => c.id) }
    const newState = FormPartyCommand.execute(gameState, params)

    expect(newState.party.members).toHaveLength(6)
    expect(newState.party.formation.frontRow).toHaveLength(3)
    expect(newState.party.formation.backRow).toHaveLength(3)
  })

  test('forms small party with 3 characters', () => {
    const chars = createCharacters([
      { name: "Tank", class: "FIGHTER" },
      { name: "Healer", class: "PRIEST" },
      { name: "Damage", class: "MAGE" }
    ])

    const params = { characterIds: chars.map(c => c.id) }
    const newState = FormPartyCommand.execute(gameState, params)

    expect(newState.party.members).toHaveLength(3)
    expect(newState.party.formation.frontRow).toContain(chars[0]) // Fighter front
    expect(newState.party.formation.backRow).toContain(chars[1]) // Priest back
  })

  test('forms party with explicit formation', () => {
    const chars = createCharacters([
      { id: "f1", class: "FIGHTER" },
      { id: "m1", class: "MAGE" },
      { id: "p1", class: "PRIEST" }
    ])

    const params = {
      characterIds: ["f1", "m1", "p1"],
      formation: {
        frontRow: ["f1", "m1"], // Mage in front (unusual)
        backRow: ["p1"]
      }
    }

    const newState = FormPartyCommand.execute(gameState, params)

    expect(newState.party.formation.frontRow).toHaveLength(2)
    expect(newState.party.formation.frontRow.map(c => c.id)).toContain("m1")
  })

  test('throws error when party exceeds 6 members', () => {
    const chars = createCharacters(7) // 7 characters

    const params = { characterIds: chars.map(c => c.id) }

    expect(() => FormPartyCommand.execute(gameState, params))
      .toThrow(PartyTooLargeError)
  })

  test('throws error when character not found', () => {
    const params = { characterIds: ["invalid-id"] }

    expect(() => FormPartyCommand.execute(gameState, params))
      .toThrow(CharacterNotFoundError)
  })

  test('throws error when dead character included', () => {
    const chars = createCharacters([
      { name: "Alive", condition: "GOOD" },
      { name: "Dead", condition: "DEAD" }
    ])

    const params = { characterIds: chars.map(c => c.id) }

    expect(() => FormPartyCommand.execute(gameState, params))
      .toThrow(CharacterDeadError)
  })

  test('throws error when front row exceeds 3', () => {
    const chars = createCharacters(4)

    const params = {
      characterIds: chars.map(c => c.id),
      formation: {
        frontRow: chars.slice(0, 4).map(c => c.id), // 4 in front!
        backRow: []
      }
    }

    expect(() => FormPartyCommand.execute(gameState, params))
      .toThrow(InvalidFormationError)
  })

  test('auto-assigns fighters to front row', () => {
    const chars = createCharacters([
      { name: "F1", class: "FIGHTER" },
      { name: "F2", class: "FIGHTER" },
      { name: "M1", class: "MAGE" }
    ])

    const params = { characterIds: chars.map(c => c.id) }
    const newState = FormPartyCommand.execute(gameState, params)

    const frontNames = newState.party.formation.frontRow.map(c => c.name)
    expect(frontNames).toContain("F1")
    expect(frontNames).toContain("F2")
  })

  test('auto-assigns mages to back row', () => {
    const chars = createCharacters([
      { name: "F1", class: "FIGHTER" },
      { name: "M1", class: "MAGE" },
      { name: "P1", class: "PRIEST" }
    ])

    const params = { characterIds: chars.map(c => c.id) }
    const newState = FormPartyCommand.execute(gameState, params)

    const backNames = newState.party.formation.backRow.map(c => c.name)
    expect(backNames).toContain("M1")
    expect(backNames).toContain("P1")
  })

  test('assigns Ninja to front row by default', () => {
    const chars = createCharacters([
      { name: "Ninja", class: "NINJA" },
      { name: "Fighter", class: "FIGHTER" }
    ])

    const params = { characterIds: chars.map(c => c.id) }
    const newState = FormPartyCommand.execute(gameState, params)

    const frontNames = newState.party.formation.frontRow.map(c => c.name)
    expect(frontNames).toContain("Ninja")
  })

  test('initializes party gold to 0', () => {
    const chars = createCharacters(3)
    const params = { characterIds: chars.map(c => c.id) }

    const newState = FormPartyCommand.execute(gameState, params)

    expect(newState.party.gold).toBe(0)
  })

  test('event log contains party formation', () => {
    const chars = createCharacters([
      { name: "Hero1" },
      { name: "Hero2" },
      { name: "Hero3" }
    ])

    const params = { characterIds: chars.map(c => c.id) }
    const newState = FormPartyCommand.execute(gameState, params)

    const event = newState.eventLog[newState.eventLog.length - 1]
    expect(event.type).toBe('PARTY_FORMED')
    expect(event.data.totalMembers).toBe(3)
  })

  test('replaces existing party', () => {
    const oldParty = createParty([
      { name: "Old1" },
      { name: "Old2" }
    ])
    const stateWithParty = { ...gameState, party: oldParty }

    const newChars = createCharacters([
      { name: "New1" },
      { name: "New2" },
      { name: "New3" }
    ])

    const params = { characterIds: newChars.map(c => c.id) }
    const newState = FormPartyCommand.execute(stateWithParty, params)

    expect(newState.party.members).toHaveLength(3)
    expect(newState.party.members[0].name).toBe("New1")
  })
})
```

## Related

**Services**:
- [PartyService](../services/PartyService.md) - Party management
- [RosterService](../services/RosterService.md) - Character lookup
- [CharacterService](../services/CharacterService.md) - Character validation

**Related Commands**:
- [AddToPartyCommand](./AddToPartyCommand.md) - Add character to existing party
- [RemoveFromPartyCommand](./RemoveFromPartyCommand.md) - Remove character from party
- [ChangeFormationCommand](./ChangeFormationCommand.md) - Change front/back rows

**Game Design**:
- [Party System](../game-design/05-party-system.md) - Party mechanics
- [Formation Strategy](../game-design/05-party-system.md#formation) - Front/back row tactics
- [Party Composition](../research/class-reference.md#recommended-party-composition) - Optimal setups
