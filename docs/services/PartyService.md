# PartyService

**Pure function service for party formation and membership management.**

## Responsibility

Manages party composition, formation (front/back rows), and membership changes. Handles validation of party size constraints and formation rules.

## API Reference

### addMember

Add character to party.

**Signature**:
```typescript
function addMember(party: Party, character: Character): Party
```

**Parameters**:
- `party`: Current party state
- `character`: Character to add

**Returns**: New party with character added

**Throws**:
- `PartyFullError` if party has 6 members
- `CharacterAlreadyInPartyError` if character already in party

**Example**:
```typescript
const party = createEmptyParty()
const character = createCharacter({ name: "Gandalf", class: "Mage" })

const newParty = PartyService.addMember(party, character)
// newParty.members.length === 1
```

### removeMember

Remove character from party.

**Signature**:
```typescript
function removeMember(party: Party, characterId: string): Party
```

**Parameters**:
- `party`: Current party state
- `characterId`: ID of character to remove

**Returns**: New party without character

**Throws**:
- `CharacterNotInPartyError` if character not in party

**Example**:
```typescript
const party = createPartyWithMembers()
const newParty = PartyService.removeMember(party, "char-1")
// Character removed from party
```

### moveToFrontRow

Move character to front row.

**Signature**:
```typescript
function moveToFrontRow(party: Party, characterId: string): Party
```

**Parameters**:
- `party`: Current party state
- `characterId`: ID of character to move

**Returns**: New party with updated formation

**Throws**:
- `FrontRowFullError` if front row has 3 characters
- `CharacterNotInPartyError` if character not in party

**Example**:
```typescript
const party = createPartyWithMembers()
const newParty = PartyService.moveToFrontRow(party, "mage-1")
// Mage moved from back row to front row
```

### moveToBackRow

Move character to back row.

**Signature**:
```typescript
function moveToBackRow(party: Party, characterId: string): Party
```

**Parameters**:
- `party`: Current party state
- `characterId`: ID of character to move

**Returns**: New party with updated formation

**Throws**:
- `BackRowFullError` if back row has 3 characters
- `CharacterNotInPartyError` if character not in party

**Example**:
```typescript
const party = createPartyWithMembers()
const newParty = PartyService.moveToBackRow(party, "fighter-1")
// Fighter moved from front row to back row
```

### getFormation

Get current party formation.

**Signature**:
```typescript
function getFormation(party: Party): Formation
```

**Parameters**:
- `party`: Current party state

**Returns**: Formation object with front and back rows

**Example**:
```typescript
const formation = PartyService.getFormation(party)
// formation.frontRow: Character[] (0-3)
// formation.backRow: Character[] (0-3)
```

### updatePosition

Update party position in dungeon.

**Signature**:
```typescript
function updatePosition(party: Party, position: Position): Party
```

**Parameters**:
- `party`: Current party state
- `position`: New position {x, y, level, facing}

**Returns**: New party with updated position

**Example**:
```typescript
const newParty = PartyService.updatePosition(party, {
  x: 5,
  y: 10,
  level: 1,
  facing: 'north'
})
```

### isPartyFull

Check if party has maximum members (6).

**Signature**:
```typescript
function isPartyFull(party: Party): boolean
```

**Parameters**:
- `party`: Current party state

**Returns**: True if party has 6 members

**Example**:
```typescript
if (PartyService.isPartyFull(party)) {
  throw new PartyFullError("Cannot add more members")
}
```

## Dependencies

Uses:
- `ValidationService` - Validate party size constraints
- `Character` type - Character entity definition
- `Party` type - Party entity definition

## Testing

See [PartyService.test.ts](../../tests/services/PartyService.test.ts)

**Key test cases**:
- Adding character to empty party
- Adding to full party throws error
- Removing character from party
- Moving between front/back rows
- Front row max 3 characters constraint
- Back row max 3 characters constraint
- Duplicate character prevention
- Position updates

## Related

- [Formation Diagram](../diagrams/party-structure.md)
- [FormPartyCommand](../commands/FormPartyCommand.md) - Uses this service
- [Party System](../systems/party-system.md) - System overview
