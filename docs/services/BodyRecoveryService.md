# BodyRecoveryService

**Pure function service for retrieving dead character bodies from the dungeon.**

## Responsibility

Manages body recovery mechanics, validates recovery attempts, handles body pickup by new parties, and manages inventory/item transfer from dead characters to recovery party.

## API Reference

### canRecoverBody

Check if party can recover a body at current location.

**Signature**:
```typescript
function canRecoverBody(
  gameState: GameState,
  characterId: string
): boolean
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character whose body to recover

**Returns**: `true` if body is at party's current location and party has space

**Example**:
```typescript
// Party at (5, 10) on Level 3, body is also at (5, 10) Level 3
const canRecover = BodyRecoveryService.canRecoverBody(gameState, "char-123")
// canRecover === true (body is here, party has space)

// Party at different location
const cannotRecover = BodyRecoveryService.canRecoverBody(gameState, "char-456")
// cannotRecover === false (body is on different level)
```

### recoverBody

Recover a character's body from the dungeon.

**Signature**:
```typescript
function recoverBody(
  gameState: GameState,
  characterId: string
): GameState
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character to recover

**Returns**: New game state with body added to party, removed from dungeon

**Throws**:
- `BodyNotFoundError` if no body exists for character
- `BodyNotAtLocationError` if body not at party's current location
- `PartyFullError` if party has 6 members (no space for body)
- `CharacterAlreadyInPartyError` if character already in party

**Example**:
```typescript
const newState = BodyRecoveryService.recoverBody(gameState, "char-123")
// newState.party.members includes char-123 (as dead member)
// newState.bodies["char-123"] === undefined (removed from dungeon)
```

### getBodiesAtCurrentLocation

Get all recoverable bodies at party's current location.

**Signature**:
```typescript
function getBodiesAtCurrentLocation(
  gameState: GameState
): Body[]
```

**Parameters**:
- `gameState`: Current game state

**Returns**: Array of bodies at party's position

**Example**:
```typescript
const bodies = BodyRecoveryService.getBodiesAtCurrentLocation(gameState)
// bodies = [
//   { characterId: "char-123", level: 3, position: { x: 5, y: 10 }, ... },
//   { characterId: "char-456", level: 3, position: { x: 5, y: 10 }, ... }
// ]
```

### calculateRecoveryWeight

Calculate total weight of character's body and equipment.

**Signature**:
```typescript
function calculateRecoveryWeight(character: Character): number
```

**Parameters**:
- `character`: Character whose body weight to calculate

**Returns**: Total weight in pounds (body + equipment + inventory)

**Example**:
```typescript
const weight = BodyRecoveryService.calculateRecoveryWeight(character)
// weight = 185 (body 150 lbs + equipment 35 lbs)
```

### canPartyCarryBody

Check if party has carrying capacity for body.

**Signature**:
```typescript
function canPartyCarryBody(
  party: Party,
  bodyWeight: number
): boolean
```

**Parameters**:
- `party`: Current party
- `bodyWeight`: Weight to carry

**Returns**: `true` if party can carry the additional weight

**Example**:
```typescript
const canCarry = BodyRecoveryService.canPartyCarryBody(party, 185)
// canCarry === true (party has enough strength to carry body)
```

### transferItemsFromBody

Transfer items from dead character to recovery party.

**Signature**:
```typescript
function transferItemsFromBody(
  gameState: GameState,
  characterId: string,
  targetCharacterId: string
): GameState
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: Dead character (source)
- `targetCharacterId`: Living character to receive items (destination)

**Returns**: New game state with items transferred

**Throws**:
- `CharacterNotFoundError` if either character doesn't exist
- `InventoryFullError` if target character's inventory is full

**Example**:
```typescript
// Transfer dead character's items to party leader
const newState = BodyRecoveryService.transferItemsFromBody(
  gameState,
  "dead-char-123",
  "leader-char-456"
)
// newState.roster.get("leader-char-456").inventory includes dead char's items
// newState.roster.get("dead-char-123").inventory is empty
```

### stripBodyEquipment

Remove all equipment from dead character (for storage).

**Signature**:
```typescript
function stripBodyEquipment(character: Character): Character
```

**Parameters**:
- `character`: Character to strip equipment from

**Returns**: New character with no equipped items (items moved to inventory)

**Example**:
```typescript
const stripped = BodyRecoveryService.stripBodyEquipment(deadCharacter)
// stripped.equipment = { weapon: null, armor: null, ... }
// stripped.inventory includes all previously equipped items
```

### locateBody

Find the dungeon location of a character's body (KANDI spell).

**Signature**:
```typescript
function locateBody(
  gameState: GameState,
  characterName: string
): { level: number; position: Position; characterId: string } | null
```

**Parameters**:
- `gameState`: Current game state
- `characterName`: Name of character to locate

**Returns**: Body location, or `null` if not found

**Example**:
```typescript
// KANDI spell: locate Gandalf's body
const location = BodyRecoveryService.locateBody(gameState, "Gandalf")
// location = {
//   characterId: "char-123",
//   level: 5,
//   position: { x: 10, y: 15 }
// }
```

### validateRecovery

Validate that body recovery is possible.

**Signature**:
```typescript
function validateRecovery(
  gameState: GameState,
  characterId: string
): { valid: boolean; reason?: string }
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: Character to recover

**Returns**: Validation result with reason if invalid

**Example**:
```typescript
const validation = BodyRecoveryService.validateRecovery(gameState, "char-123")
// validation = { valid: false, reason: "Body not at current location" }

const valid = BodyRecoveryService.validateRecovery(gameState, "char-456")
// valid = { valid: true }
```

### getRecoveryPartySpace

Get number of available party slots for body recovery.

**Signature**:
```typescript
function getRecoveryPartySpace(party: Party): number
```

**Parameters**:
- `party`: Current party

**Returns**: Number of open party slots (0-6)

**Example**:
```typescript
const space = BodyRecoveryService.getRecoveryPartySpace(party)
// space = 2 (party has 4 members, can add 2 more)
```

## Dependencies

Uses:
- `DeathService` (get body locations, remove bodies)
- `PartyService` (add recovered character to party)
- `InventoryService` (transfer items)
- `ValidationService` (validate recovery conditions)

## Testing

See [BodyRecoveryService.test.ts](../../tests/services/BodyRecoveryService.test.ts)

**Key test cases**:
- Can recover body at current location
- Cannot recover body at different location
- Cannot recover body when party is full (6 members)
- Recover body successfully (adds to party, removes from dungeon)
- Get bodies at current location (multiple bodies)
- Get bodies at empty location (returns empty array)
- Calculate recovery weight (body + equipment)
- Check if party can carry body (enough strength)
- Check if party cannot carry body (too heavy)
- Transfer items from body to living character
- Transfer items when inventory full (throws error)
- Strip body equipment (moves to inventory)
- Locate body by name (KANDI spell)
- Locate non-existent body (returns null)
- Validate recovery (various failure conditions)
- Get recovery party space (0-6 slots)
- Body not found throws error
- Character not found throws error

## Related

- [DeathService](./DeathService.md) - Creates bodies, manages death state
- [ResurrectionService](./ResurrectionService.md) - Resurrects recovered bodies
- [PartyService](./PartyService.md) - Adds bodies to party
- [InventoryService](./InventoryService.md) - Item transfers
- [KANDI Spell](../research/spell-reference.md) - Locate body spell
- [Death & Recovery Game Design](../game-design/09-death-recovery.md) - Body recovery mechanics
