# EventService

**Pure function service for event creation and management in event sourcing system.**

## Responsibility

Creates, validates, and manages game events for event sourcing architecture. All state changes must go through event creation.

## API Reference

### createEvent

Create new game event.

**Signature**:
```typescript
function createEvent(
  type: EventType,
  payload: EventPayload,
  metadata?: EventMetadata
): GameEvent
```

**Parameters**:
- `type`: Event type identifier (e.g. "MOVE_PARTY", "ATTACK", "CAST_SPELL")
- `payload`: Event data specific to event type
- `metadata`: Optional metadata (timestamp, user, session)

**Returns**: Complete game event with ID, timestamp, type, and payload

**Throws**:
- `InvalidEventTypeError` if event type unknown
- `InvalidPayloadError` if payload missing required fields

**Example**:
```typescript
const event = EventService.createEvent(
  "MOVE_PARTY",
  { direction: "north", from: { x: 10, y: 10 }, to: { x: 10, y: 11 } }
)
// event = {
//   id: "evt-1234567890",
//   timestamp: 1635724800000,
//   type: "MOVE_PARTY",
//   payload: { direction: "north", from: {...}, to: {...} }
// }
```

### validateEvent

Validate event structure and payload.

**Signature**:
```typescript
function validateEvent(event: GameEvent): ValidationResult
```

**Parameters**:
- `event`: Event to validate

**Returns**: Validation result with success/failure and errors

**Example**:
```typescript
const result = EventService.validateEvent(event)
// result = { valid: true, errors: [] }
```

### createMovementEvent

Create party movement event.

**Signature**:
```typescript
function createMovementEvent(
  from: Position,
  to: Position,
  direction: Direction
): GameEvent
```

**Parameters**:
- `from`: Starting position
- `to`: Ending position
- `direction`: Movement direction

**Returns**: Movement event

**Example**:
```typescript
const event = EventService.createMovementEvent(
  { x: 10, y: 10, level: 1 },
  { x: 10, y: 11, level: 1 },
  "north"
)
```

### createCombatEvent

Create combat action event.

**Signature**:
```typescript
function createCombatEvent(
  action: CombatAction,
  actorId: string,
  targetId: string,
  result: CombatResult
): GameEvent
```

**Parameters**:
- `action`: Combat action type ("attack", "cast_spell", "defend", etc.)
- `actorId`: ID of character/monster performing action
- `targetId`: ID of target
- `result`: Combat result (damage, hit/miss, etc.)

**Returns**: Combat event

**Example**:
```typescript
const event = EventService.createCombatEvent(
  "attack",
  "char-1",
  "monster-5",
  { hit: true, damage: 12, killed: false }
)
```

### createSpellEvent

Create spell casting event.

**Signature**:
```typescript
function createSpellEvent(
  casterId: string,
  spellId: string,
  targets: string[],
  result: SpellResult
): GameEvent
```

**Parameters**:
- `casterId`: ID of caster
- `spellId`: Spell identifier (e.g. "HALITO", "DIOS")
- `targets`: Array of target IDs
- `result`: Spell effect result

**Returns**: Spell casting event

**Example**:
```typescript
const event = EventService.createSpellEvent(
  "char-mage",
  "MAHALITO",
  ["monster-1", "monster-2", "monster-3"],
  { damage: 18, targets: 3 }
)
```

### createCharacterEvent

Create character state change event.

**Signature**:
```typescript
function createCharacterEvent(
  characterId: string,
  changeType: CharacterChangeType,
  changes: CharacterChanges
): GameEvent
```

**Parameters**:
- `characterId`: ID of character
- `changeType`: Type of change ("hp", "level_up", "status_effect", etc.)
- `changes`: Object describing changes

**Returns**: Character change event

**Example**:
```typescript
const event = EventService.createCharacterEvent(
  "char-1",
  "hp",
  { from: 25, to: 15, damage: 10, source: "orc_attack" }
)
```

### createLevelEvent

Create level change event (stairs, teleport).

**Signature**:
```typescript
function createLevelEvent(
  from: Position,
  to: Position,
  trigger: string
): GameEvent
```

**Parameters**:
- `from`: Starting position
- `to`: Destination position (may be different level)
- `trigger`: What caused change ("stairs_down", "teleporter", "MALOR")

**Returns**: Level change event

**Example**:
```typescript
const event = EventService.createLevelEvent(
  { x: 10, y: 10, level: 1 },
  { x: 10, y: 10, level: 2 },
  "stairs_down"
)
```

### serializeEvent

Serialize event for storage.

**Signature**:
```typescript
function serializeEvent(event: GameEvent): string
```

**Parameters**:
- `event`: Event to serialize

**Returns**: JSON string representation

**Example**:
```typescript
const json = EventService.serializeEvent(event)
// json = '{"id":"evt-123","type":"MOVE_PARTY",...}'
```

### deserializeEvent

Deserialize event from storage.

**Signature**:
```typescript
function deserializeEvent(json: string): GameEvent
```

**Parameters**:
- `json`: Serialized event JSON

**Returns**: Reconstructed event object

**Throws**:
- `InvalidEventJSONError` if JSON malformed

**Example**:
```typescript
const event = EventService.deserializeEvent(json)
```

## Event Types

### Movement Events
- `MOVE_PARTY` - Party movement
- `TURN_PARTY` - Party rotation
- `CHANGE_LEVEL` - Level transition (stairs, teleport)

### Combat Events
- `ATTACK` - Physical attack
- `CAST_SPELL` - Spell casting
- `DEFEND` - Defensive stance
- `FLEE` - Attempt to flee
- `MONSTER_ACTION` - Monster action

### Character Events
- `HP_CHANGE` - HP modification
- `LEVEL_UP` - Character levels up
- `STATUS_EFFECT` - Status effect applied/removed
- `EQUIP_ITEM` - Equipment changed
- `DEATH` - Character dies

### Town Events
- `REST_AT_INN` - Inn rest
- `TEMPLE_SERVICE` - Temple service used
- `SHOP_TRANSACTION` - Buy/sell item
- `TRAIN` - Character training

### System Events
- `SAVE_GAME` - Game saved
- `LOAD_GAME` - Game loaded
- `NEW_GAME` - New game started

## Event Payload Schema

Each event type has specific payload schema:

**MOVE_PARTY**:
```typescript
{
  direction: Direction,
  from: Position,
  to: Position,
  encounterTriggered?: boolean
}
```

**ATTACK**:
```typescript
{
  actorId: string,
  targetId: string,
  hit: boolean,
  damage?: number,
  critical?: boolean,
  killed?: boolean
}
```

**CAST_SPELL**:
```typescript
{
  casterId: string,
  spellId: string,
  spellLevel: number,
  targets: string[],
  result: SpellResult
}
```

## Dependencies

Uses:
- `ValidationService` (event validation)
- `RandomService` (event ID generation)

## Testing

See [EventService.test.ts](../../tests/services/EventService.test.ts)

**Key test cases**:
- Event creation assigns unique ID
- Event timestamp set correctly
- Event validation catches invalid payloads
- Event serialization/deserialization preserves data
- All event types have correct schema
- Metadata attached correctly

## Related

- [ReplayService](./ReplayService.md) - Event replay
- [SaveService](./SaveService.md) - Event persistence
- [Event Sourcing](../systems/event-sourcing.md) - Event sourcing overview
- [Architecture](../architecture.md) - Event sourcing pattern
