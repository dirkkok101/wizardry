# DeathService

**Pure function service for character death handling and body management.**

## Responsibility

Manages character death state transitions, handles body creation at death location, tracks body positions in dungeon, and manages death-related status changes (alive → dead → ashes → lost).

## API Reference

### killCharacter

Mark character as dead and create body at current location.

**Signature**:
```typescript
function killCharacter(
  gameState: GameState,
  characterId: string
): GameState
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character to kill

**Returns**: New game state with character marked dead, body created at party position

**Throws**:
- `CharacterNotFoundError` if character doesn't exist
- `CharacterAlreadyDeadError` if character already dead

**Example**:
```typescript
const newState = DeathService.killCharacter(gameState, "char-123")
// newState.roster.get("char-123").status === "dead"
// newState.bodies["char-123"] = {
//   characterId: "char-123",
//   level: 1,
//   position: { x: 5, y: 10 },
//   deathType: "normal"
// }
```

### turnToAshes

Convert dead character to ashes (failed resurrection attempt).

**Signature**:
```typescript
function turnToAshes(
  gameState: GameState,
  characterId: string
): GameState
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character to convert to ashes

**Returns**: New game state with character status = "ashes"

**Throws**:
- `CharacterNotFoundError` if character doesn't exist
- `CharacterNotDeadError` if character not in "dead" state

**Example**:
```typescript
// DI spell fails, body turns to ashes
const newState = DeathService.turnToAshes(gameState, "char-123")
// newState.roster.get("char-123").status === "ashes"
```

### loseForever

Permanently lose character (failed KADORTO resurrection from ashes).

**Signature**:
```typescript
function loseForever(
  gameState: GameState,
  characterId: string
): GameState
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character to lose forever

**Returns**: New game state with character status = "lost", removed from roster

**Throws**:
- `CharacterNotFoundError` if character doesn't exist
- `CharacterNotAshesError` if character not in "ashes" state

**Example**:
```typescript
// KADORTO spell fails, character lost forever
const newState = DeathService.loseForever(gameState, "char-123")
// newState.roster.has("char-123") === false (removed from roster)
```

### getBodyLocation

Get the dungeon location of a character's body.

**Signature**:
```typescript
function getBodyLocation(
  gameState: GameState,
  characterId: string
): { level: number; position: Position } | null
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character

**Returns**: Body location (level and position), or `null` if no body exists

**Example**:
```typescript
const location = DeathService.getBodyLocation(gameState, "char-123")
// location = { level: 5, position: { x: 10, y: 15 } }

const noBody = DeathService.getBodyLocation(gameState, "alive-char")
// noBody === null (character is alive)
```

### getBodiesAtLocation

Get all character bodies at a specific dungeon location.

**Signature**:
```typescript
function getBodiesAtLocation(
  gameState: GameState,
  level: number,
  position: Position
): Body[]
```

**Parameters**:
- `gameState`: Current game state
- `level`: Dungeon level
- `position`: Tile coordinates

**Returns**: Array of bodies at this location

**Example**:
```typescript
const bodies = DeathService.getBodiesAtLocation(gameState, 5, { x: 10, y: 15 })
// bodies = [
//   { characterId: "char-123", level: 5, position: { x: 10, y: 15 }, deathType: "normal" },
//   { characterId: "char-456", level: 5, position: { x: 10, y: 15 }, deathType: "petrified" }
// ]
```

### removeBody

Remove body from dungeon (after successful recovery).

**Signature**:
```typescript
function removeBody(
  gameState: GameState,
  characterId: string
): GameState
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character whose body to remove

**Returns**: New game state with body removed from dungeon

**Example**:
```typescript
// After successful body recovery
const newState = DeathService.removeBody(gameState, "char-123")
// newState.bodies["char-123"] === undefined (body removed from dungeon)
```

### isCharacterDead

Check if character is dead.

**Signature**:
```typescript
function isCharacterDead(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: `true` if character status is "dead", "ashes", or "lost"

**Example**:
```typescript
const isDead = DeathService.isCharacterDead(character)
// isDead === true (character is dead)
```

### canBeResurrected

Check if character can be resurrected.

**Signature**:
```typescript
function canBeResurrected(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: `true` if character is "dead" (not ashes or lost)

**Example**:
```typescript
const canRes = DeathService.canBeResurrected(character)
// canRes === true (DI spell can resurrect)

const ashes = DeathService.canBeResurrected(ashesCharacter)
// ashes === false (need KADORTO, not DI)
```

### canBeRaisedFromAshes

Check if character can be raised from ashes.

**Signature**:
```typescript
function canBeRaisedFromAshes(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: `true` if character status is "ashes"

**Example**:
```typescript
const canRaise = DeathService.canBeRaisedFromAshes(character)
// canRaise === true (KADORTO spell can raise from ashes)
```

### getDeathType

Get the type of death for a character.

**Signature**:
```typescript
function getDeathType(
  gameState: GameState,
  characterId: string
): DeathType | null
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character

**Returns**: Death type ("normal", "petrified", "decapitated"), or `null` if alive

**Example**:
```typescript
const deathType = DeathService.getDeathType(gameState, "char-123")
// deathType === "petrified" (turned to stone, need different treatment)

const alive = DeathService.getDeathType(gameState, "alive-char")
// alive === null (character is alive)
```

### getAllBodies

Get all character bodies in the dungeon.

**Signature**:
```typescript
function getAllBodies(gameState: GameState): Body[]
```

**Parameters**:
- `gameState`: Current game state

**Returns**: Array of all bodies in dungeon

**Example**:
```typescript
const allBodies = DeathService.getAllBodies(gameState)
// allBodies = [
//   { characterId: "char-123", level: 5, position: { x: 10, y: 15 }, ... },
//   { characterId: "char-456", level: 1, position: { x: 3, y: 7 }, ... }
// ]
```

## Dependencies

Uses:
- `PartyService` (remove dead characters from party)
- `ValidationService` (validate character states)

## Testing

See [DeathService.test.ts](../../tests/services/DeathService.test.ts)

**Key test cases**:
- Kill character (creates body at current location)
- Kill already dead character (throws error)
- Turn dead character to ashes (failed DI)
- Turn alive character to ashes (throws error)
- Lose character forever (failed KADORTO)
- Lose non-ashes character (throws error)
- Get body location (returns correct level and position)
- Get body location for alive character (returns null)
- Get bodies at location (multiple bodies)
- Get bodies at empty location (returns empty array)
- Remove body after recovery
- Check if character is dead
- Check if character can be resurrected (dead vs ashes vs lost)
- Check if character can be raised from ashes
- Get death type (normal, petrified, decapitated)
- Get all bodies in dungeon
- Character not found throws error

## Related

- [BodyRecoveryService](./BodyRecoveryService.md) - Retrieves bodies from dungeon
- [ResurrectionService](./ResurrectionService.md) - Resurrects dead characters
- [TempleService](./TempleService.md) - Temple resurrection
- [CombatService](./CombatService.md) - Calls killCharacter when HP reaches 0
- [StatusEffectService](./StatusEffectService.md) - Handles status effects that can cause death
- [Death & Recovery Game Design](../game-design/09-death-recovery.md) - Death mechanics
