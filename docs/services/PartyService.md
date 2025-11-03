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

### canAddCharacterToParty

Validate if character can be added to party. Checks party size, alignment conflicts, character status, and duplicates.

**Signature**:
```typescript
function canAddCharacterToParty(
  party: Party,
  character: Character,
  allCharacters: Map<string, Character>
): ValidationResult
```

**Parameters**:
- `party`: Current party state
- `character`: Character to validate
- `allCharacters`: Full character roster

**Returns**: ValidationResult object with `allowed` boolean and optional `reason` string

**Example**:
```typescript
const validation = PartyService.canAddCharacterToParty(party, character, roster);
if (!validation.allowed) {
  console.error(validation.reason); // "Good and Evil cannot party together"
}
```

**Validation Rules**:
- Character not already in party
- Party size < 6
- Character status is OK
- No alignment conflict (Good vs Evil)

### divvyGold

Distribute party's pooled gold equally among all members. Remainder distributed to first N members.

**Signature**:
```typescript
function divvyGold(
  party: Party,
  roster: Map<string, Character>
): DivvyGoldResult
```

**Parameters**:
- `party`: Current party state
- `roster`: Character roster (to update individual character gold)

**Returns**: DivvyGoldResult with `success` boolean, optional `error` string, `updatedParty`, and `updatedRoster`

**Example**:
```typescript
const result = PartyService.divvyGold(party, roster);
if (result.success) {
  // Use result.updatedParty and result.updatedRoster
} else {
  console.error(result.error); // "No gold to distribute"
}
```

**Distribution Logic**:
- `sharePerMember = floor(totalGold / partySize)`
- `remainder = totalGold % partySize`
- First N members get +1 gold (where N = remainder)

### getPartyGold

Get current party gold amount.

**Signature**:
```typescript
function getPartyGold(state: GameState): number
```

**Parameters**:
- `state`: Current game state

**Returns**: Party's gold amount

**Example**:
```typescript
const gold = getPartyGold(state); // 500
```

### addPartyGold

Add gold to party immutably.

**Signature**:
```typescript
function addPartyGold(state: GameState, amount: number): GameState
```

**Parameters**:
- `state`: Current game state
- `amount`: Gold to add

**Returns**: New game state with updated party gold

**Example**:
```typescript
const newState = addPartyGold(state, 100);
// newState.party.gold = oldState.party.gold + 100
```

### removePartyGold

Remove gold from party immutably. Never goes below zero.

**Signature**:
```typescript
function removePartyGold(state: GameState, amount: number): GameState
```

**Parameters**:
- `state`: Current game state
- `amount`: Gold to remove

**Returns**: New game state with updated party gold (minimum 0)

**Example**:
```typescript
const newState = removePartyGold(state, 50);
// newState.party.gold = max(0, oldState.party.gold - 50)
```

### hasEnoughGold

Check if party has enough gold for a purchase.

**Signature**:
```typescript
function hasEnoughGold(state: GameState, amount: number): boolean
```

**Parameters**:
- `state`: Current game state
- `amount`: Required gold amount

**Returns**: True if party gold >= amount

**Example**:
```typescript
if (hasEnoughGold(state, 100)) {
  // Proceed with purchase
}
```

### moveCharacterUp

Move character up in party order (swap with previous member). Automatically recalculates formation.

**Signature**:
```typescript
function moveCharacterUp(state: GameState, characterId: string): GameState
```

**Parameters**:
- `state`: Current game state
- `characterId`: Character to move up

**Returns**: New game state with reordered party and updated formation

**Example**:
```typescript
const newState = moveCharacterUp(state, "char-2");
// Character at index 2 swaps with character at index 1
// Formation recalculated (first 3 → front row, next 3 → back row)
```

**Notes**:
- If character is at index 0, returns state unchanged
- If character not found, returns state unchanged
- Formation auto-recalculates based on new order

### moveCharacterDown

Move character down in party order (swap with next member). Automatically recalculates formation.

**Signature**:
```typescript
function moveCharacterDown(state: GameState, characterId: string): GameState
```

**Parameters**:
- `state`: Current game state
- `characterId`: Character to move down

**Returns**: New game state with reordered party and updated formation

**Example**:
```typescript
const newState = moveCharacterDown(state, "char-1");
// Character at index 1 swaps with character at index 2
// Formation recalculated (first 3 → front row, next 3 → back row)
```

**Notes**:
- If character is at last index, returns state unchanged
- If character not found, returns state unchanged
- Formation auto-recalculates based on new order

## Dependencies

Uses:
- `ValidationService` - Validate party size constraints
- `Character` type - Character entity definition
- `Party` type - Party entity definition
- `GameState` type - Global game state
- `Alignment` enum - Character alignment values
- `CharacterStatus` enum - Character status values
- `isDefined` utility - Type guard for filtering

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
