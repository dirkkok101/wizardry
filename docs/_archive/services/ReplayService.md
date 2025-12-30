# ReplayService

**Pure function service for event replay and game state reconstruction.**

## Responsibility

Replays event streams to reconstruct game state, supports time-travel debugging, and enables undo/redo functionality.

## API Reference

### replayEvents

Replay event stream to reconstruct game state.

**Signature**:
```typescript
function replayEvents(
  events: GameEvent[],
  initialState: GameState
): GameState
```

**Parameters**:
- `events`: Array of events to replay in order
- `initialState`: Starting game state (typically empty/new game)

**Returns**: Final game state after all events applied

**Throws**:
- `InvalidEventError` if event cannot be applied
- `EventReplayError` if replay fails

**Example**:
```typescript
const finalState = ReplayService.replayEvents(
  eventLog,
  createNewGameState()
)
// finalState = complete game state reconstructed from events
```

### replayToEvent

Replay events up to specific event ID.

**Signature**:
```typescript
function replayToEvent(
  events: GameEvent[],
  targetEventId: string,
  initialState: GameState
): GameState
```

**Parameters**:
- `events`: Complete event stream
- `targetEventId`: Event ID to stop at
- `initialState`: Starting state

**Returns**: Game state at the moment of target event

**Example**:
```typescript
const stateAtEvent = ReplayService.replayToEvent(
  eventLog,
  "evt-500",
  initialState
)
// stateAtEvent = game state at event 500 (time travel)
```

### applyEvent

Apply single event to game state.

**Signature**:
```typescript
function applyEvent(
  state: GameState,
  event: GameEvent
): GameState
```

**Parameters**:
- `state`: Current game state
- `event`: Event to apply

**Returns**: New game state with event applied

**Throws**:
- `InvalidEventTypeError` if event type unknown
- `EventApplicationError` if event cannot be applied to current state

**Example**:
```typescript
const newState = ReplayService.applyEvent(state, moveEvent)
// newState = state with party position updated
```

### validateEventStream

Validate event stream can be replayed successfully.

**Signature**:
```typescript
function validateEventStream(
  events: GameEvent[],
  initialState: GameState
): ValidationResult
```

**Parameters**:
- `events`: Event stream to validate
- `initialState`: Starting state

**Returns**: Validation result with any errors encountered

**Example**:
```typescript
const result = ReplayService.validateEventStream(eventLog, initialState)
// result = { valid: true, errors: [], eventCount: 1523 }
```

### getEventHistory

Get event history with state snapshots.

**Signature**:
```typescript
function getEventHistory(
  events: GameEvent[],
  initialState: GameState,
  snapshotInterval: number
): EventHistory
```

**Parameters**:
- `events`: Event stream
- `initialState`: Starting state
- `snapshotInterval`: Create snapshot every N events (e.g. 100)

**Returns**: Event history with periodic state snapshots

**Example**:
```typescript
const history = ReplayService.getEventHistory(eventLog, initialState, 100)
// history = {
//   events: [...],
//   snapshots: [
//     { eventId: "evt-100", state: {...} },
//     { eventId: "evt-200", state: {...} },
//     ...
//   ]
// }
```

### undoEvent

Undo last event by replaying up to previous event.

**Signature**:
```typescript
function undoEvent(
  currentState: GameState,
  eventLog: GameEvent[]
): GameState
```

**Parameters**:
- `currentState`: Current game state
- `eventLog`: Complete event log

**Returns**: State with last event removed

**Example**:
```typescript
const previousState = ReplayService.undoEvent(state, eventLog)
// previousState = state before last action (movement undone)
```

### redoEvent

Redo previously undone event.

**Signature**:
```typescript
function redoEvent(
  currentState: GameState,
  event: GameEvent
): GameState
```

**Parameters**:
- `currentState`: Current game state
- `event`: Event to redo

**Returns**: State with event reapplied

**Example**:
```typescript
const redoneState = ReplayService.redoEvent(state, lastUndoneEvent)
// redoneState = state with action restored
```

### getStateDiff

Get differences between two game states.

**Signature**:
```typescript
function getStateDiff(
  before: GameState,
  after: GameState
): StateDiff
```

**Parameters**:
- `before`: Earlier game state
- `after`: Later game state

**Returns**: Object describing all differences

**Example**:
```typescript
const diff = ReplayService.getStateDiff(stateBefore, stateAfter)
// diff = {
//   party: { position: { from: {x:10,y:10}, to: {x:10,y:11} } },
//   characters: { "char-1": { hp: { from: 25, to: 15 } } }
// }
```

### createReplaySnapshot

Create snapshot of current state for faster replay.

**Signature**:
```typescript
function createReplaySnapshot(
  state: GameState,
  eventId: string
): ReplaySnapshot
```

**Parameters**:
- `state`: Current game state
- `eventId`: Event ID at this snapshot

**Returns**: Snapshot object for fast forward replay

**Example**:
```typescript
const snapshot = ReplayService.createReplaySnapshot(state, "evt-1000")
// snapshot = { eventId: "evt-1000", state: {...}, timestamp: ... }
```

## Replay Optimization

### Snapshot Strategy
- Create snapshot every 100 events
- Store snapshots in memory for active session
- Persist snapshots to IndexedDB for save files

### Fast Forward
- Find closest snapshot before target
- Replay only events after snapshot
- Much faster than replaying from beginning

**Example**: To replay to event 450:
1. Load snapshot at event 400
2. Replay events 401-450
3. Return resulting state

### Memory Management
- Keep last 10 snapshots in memory
- Older snapshots stored in IndexedDB
- Clear snapshots on new game

## Event Application Order

1. **Validate event** - Check event can be applied
2. **Apply to state** - Create new state with changes
3. **Update derived state** - Recalculate visibility, automap, etc.
4. **Return new state** - Immutable state update

## Use Cases

### Save/Load
- Save: Store event log to IndexedDB
- Load: Replay event log to reconstruct state

### Debugging
- Replay to specific event to reproduce bug
- Compare state diffs to find issue
- Step through events one at a time

### Undo/Redo
- Undo: Replay to previous event
- Redo: Apply undone event again
- Unlimited undo stack (limited by memory)

### Replay Mode
- Watch entire game playback
- Speed up/slow down replay
- Pause at any event

## Dependencies

Uses:
- `EventService` (event validation, deserialization)
- `ValidationService` (state validation)

## Testing

See [ReplayService.test.ts](../../tests/services/ReplayService.test.ts)

**Key test cases**:
- Replay empty event log returns initial state
- Replay single event applies correctly
- Replay multiple events in order
- Replay to specific event (time travel)
- Undo removes last event effect
- Redo reapplies undone event
- Snapshots speed up replay
- State diff correctly identifies changes

## Related

- [EventService](./EventService.md) - Event creation
- [SaveService](./SaveService.md) - Event log persistence
- [LoadService](./LoadService.md) - Loading saved games
- [Event Sourcing](../systems/event-sourcing.md) - Event sourcing overview
- [Architecture](../architecture.md) - Event sourcing pattern
