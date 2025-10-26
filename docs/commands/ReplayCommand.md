# ReplayCommand

**Replay event log to reconstruct or verify game state.**

## Responsibility

Replays game event stream from beginning or specific point to reconstruct game state, enabling time-travel debugging, state verification, undo/redo functionality, and visual playback of game sessions.

## Command Flow

### Preconditions
1. Event log exists and is not empty
2. Events are valid and properly formatted
3. Initial state is provided (or default new game state)
4. Target event ID is valid (if replaying to specific point)

### Services Called
1. **ReplayService.replayEvents** - Replay all events
2. **ReplayService.replayToEvent** - Replay to specific event
3. **ReplayService.validateEventStream** - Validate event log
4. **EventService.getEvent** - Retrieve specific events
5. **EventService.createEvent** - Log replay event

### Events Created
```typescript
{
  type: "REPLAY_EXECUTED",
  eventCount: number,
  targetEventId?: string,
  timestamp: number,
  replayTime: number
}
```

### State Changes
1. Game state reconstructed from events
2. All state changes applied in order
3. Final state matches cumulative event effects
4. Replay event added to log (optional)

## API Reference

**Signature**:
```typescript
function execute(state: GameState, params: {
  events?: GameEvent[],
  targetEventId?: string,
  initialState?: GameState,
  mode?: 'full' | 'partial' | 'verify'
}): GameState
```

**Parameters**:
- `state` - Current game state (used for event log if not provided)
- `params.events` - Optional event array to replay (uses state.eventLog if not provided)
- `params.targetEventId` - Optional event ID to stop at (time-travel)
- `params.initialState` - Optional starting state (defaults to new game)
- `params.mode` - Replay mode: full, partial, or verify

**Returns**: New game state after replay

**Throws**:
- `InvalidEventError` - Event cannot be applied
- `EventNotFoundError` - Target event ID not found
- `EventReplayError` - Replay process failed
- `EmptyEventLogError` - No events to replay

## Preconditions

### Event Log Validation
```typescript
// Event log must exist and have events
const events = params.events || state.eventLog
if (!events || events.length === 0) {
  throw new EmptyEventLogError('No events to replay')
}
```

### Event Stream Validation
```typescript
// Validate all events can be replayed
const validation = ReplayService.validateEventStream(
  events,
  params.initialState || createNewGameState()
)
if (!validation.valid) {
  throw new EventReplayError(
    `Invalid event stream: ${validation.errors.join(', ')}`
  )
}
```

### Target Event Check
```typescript
// If replaying to specific event, verify it exists
if (params.targetEventId) {
  const targetExists = events.some(e => e.id === params.targetEventId)
  if (!targetExists) {
    throw new EventNotFoundError(
      `Event not found: ${params.targetEventId}`
    )
  }
}
```

## Services Used

### ReplayService
- **replayEvents** - Replay entire event stream
- **replayToEvent** - Replay up to specific event
- **validateEventStream** - Verify events are valid
- **applyEvent** - Apply single event to state
- **getStateDiff** - Compare states (for verification)

### EventService
- **getEvent** - Retrieve specific event
- **createEvent** - Create REPLAY_EXECUTED event

## Events Created

### REPLAY_EXECUTED Event (Full)
```typescript
{
  id: "evt-12356",
  type: "REPLAY_EXECUTED",
  timestamp: 1635725900000,
  mode: "full",
  eventCount: 1523,
  replayTime: 234,  // ms
  startEventId: "evt-1",
  endEventId: "evt-1523",
  stateVerified: true
}
```

### REPLAY_EXECUTED Event (Partial)
```typescript
{
  id: "evt-12357",
  type: "REPLAY_EXECUTED",
  timestamp: 1635726000000,
  mode: "partial",
  eventCount: 500,
  replayTime: 78,  // ms
  startEventId: "evt-1",
  endEventId: "evt-500",
  targetEventId: "evt-500",
  stateVerified: false
}
```

## Replay Modes

### Full Replay
Replay all events from beginning:
```typescript
const finalState = ReplayCommand.execute(state, {
  mode: 'full'
})
// finalState = complete reconstruction from event log
```

### Partial Replay (Time Travel)
Replay to specific event:
```typescript
const stateAtEvent = ReplayCommand.execute(state, {
  mode: 'partial',
  targetEventId: 'evt-500'
})
// stateAtEvent = game state at event 500
```

### Verify Replay
Replay and compare to current state:
```typescript
const verification = ReplayCommand.execute(state, {
  mode: 'verify'
})
// Replays events and compares to current state
// Throws error if states don't match
```

## Use Cases

### 1. Save/Load Verification
Verify loaded state matches event replay:
```typescript
test('loaded state matches replayed events', () => {
  const loaded = LoadGameCommand.execute(state, { slotName: 'save1' })
  const replayed = ReplayCommand.execute(loaded, { mode: 'verify' })
  // Throws if mismatch
})
```

### 2. Undo Functionality
Replay to previous event:
```typescript
function undoLastAction(state: GameState): GameState {
  const previousEventId = state.eventLog[state.eventLog.length - 2]?.id
  return ReplayCommand.execute(state, {
    targetEventId: previousEventId,
    mode: 'partial'
  })
}
```

### 3. Debugging
Replay to bug occurrence:
```typescript
// Find event where bug occurred
const bugEventId = 'evt-1234'

// Replay to that point
const stateAtBug = ReplayCommand.execute(state, {
  targetEventId: bugEventId,
  mode: 'partial'
})

// Inspect state at bug moment
console.log(stateAtBug)
```

### 4. Visual Playback
Replay with animation:
```typescript
async function playbackSession(events: GameEvent[]) {
  let currentState = createNewGameState()

  for (const event of events) {
    currentState = ReplayService.applyEvent(currentState, event)
    await renderState(currentState)
    await delay(100)  // Animation delay
  }
}
```

### 5. State Migration
Update old save to new format:
```typescript
function migrateSave(oldSave: SaveData): GameState {
  // Replay events with updated event handlers
  const newState = ReplayCommand.execute(oldSave.state, {
    events: oldSave.eventLog,
    mode: 'full'
  })
  return newState
}
```

## Replay Optimization

### Snapshot Strategy
Create periodic snapshots for faster replay:
```typescript
// Create snapshot every 100 events
const snapshots = new Map<string, GameState>()
events.forEach((event, i) => {
  if (i % 100 === 0) {
    const snapshot = ReplayService.replayToEvent(
      events.slice(0, i),
      event.id,
      initialState
    )
    snapshots.set(event.id, snapshot)
  }
})
```

### Fast Forward to Target
Use closest snapshot before target:
```typescript
function fastForwardReplay(
  events: GameEvent[],
  targetEventId: string
): GameState {
  // Find closest snapshot before target
  const targetIndex = events.findIndex(e => e.id === targetEventId)
  const snapshotIndex = Math.floor(targetIndex / 100) * 100

  // Load snapshot
  const snapshot = snapshots.get(events[snapshotIndex].id)

  // Replay remaining events
  return ReplayService.replayEvents(
    events.slice(snapshotIndex, targetIndex + 1),
    snapshot
  )
}
```

## Testing

### Test Cases

**Full Replay**:
```typescript
test('replays all events to reconstruct state', () => {
  const events = [
    createMoveEvent({ x: 0, y: 1 }),
    createMoveEvent({ x: 0, y: 2 }),
    createMoveEvent({ x: 0, y: 3 })
  ]
  const state = createGameState({ eventLog: events })

  const replayed = ReplayCommand.execute(state, { mode: 'full' })

  expect(replayed.party.position).toEqual({ x: 0, y: 3, level: 1 })
})
```

**Partial Replay**:
```typescript
test('replays to specific event', () => {
  const events = [
    { id: 'evt-1', ...createMoveEvent({ x: 0, y: 1 }) },
    { id: 'evt-2', ...createMoveEvent({ x: 0, y: 2 }) },
    { id: 'evt-3', ...createMoveEvent({ x: 0, y: 3 }) }
  ]
  const state = createGameState({ eventLog: events })

  const replayed = ReplayCommand.execute(state, {
    mode: 'partial',
    targetEventId: 'evt-2'
  })

  expect(replayed.party.position.y).toBe(2)
})
```

**Verify Mode**:
```typescript
test('verifies replayed state matches current state', () => {
  const events = [createMoveEvent({ x: 1, y: 1 })]
  const state = createGameState({
    party: { position: { x: 1, y: 1, level: 1 } },
    eventLog: events
  })

  // Should not throw
  expect(() => ReplayCommand.execute(state, {
    mode: 'verify'
  })).not.toThrow()
})

test('throws error when states mismatch', () => {
  const events = [createMoveEvent({ x: 1, y: 1 })]
  const state = createGameState({
    party: { position: { x: 999, y: 999, level: 1 } },  // Wrong position
    eventLog: events
  })

  expect(() => ReplayCommand.execute(state, {
    mode: 'verify'
  })).toThrow(EventReplayError)
})
```

**Empty Event Log**:
```typescript
test('throws error when event log is empty', () => {
  const state = createGameState({ eventLog: [] })

  expect(() => ReplayCommand.execute(state, {
    mode: 'full'
  })).toThrow(EmptyEventLogError)
})
```

**Event Not Found**:
```typescript
test('throws error when target event not found', () => {
  const events = [{ id: 'evt-1', ...createMoveEvent() }]
  const state = createGameState({ eventLog: events })

  expect(() => ReplayCommand.execute(state, {
    targetEventId: 'evt-999',
    mode: 'partial'
  })).toThrow(EventNotFoundError)
})
```

**Complex Event Sequence**:
```typescript
test('replays complex event sequence correctly', () => {
  const events = [
    createMoveEvent({ x: 1, y: 0 }),
    createCombatStartEvent(),
    createAttackEvent({ damage: 10 }),
    createCombatEndEvent(),
    createMoveEvent({ x: 2, y: 0 })
  ]
  const state = createGameState({ eventLog: events })

  const replayed = ReplayCommand.execute(state, { mode: 'full' })

  expect(replayed.party.position.x).toBe(2)
  expect(replayed.mode).toBe('NAVIGATION')  // Combat ended
})
```

**Replay Performance**:
```typescript
test('replays large event log efficiently', () => {
  const events = Array(10000).fill(null).map((_, i) => ({
    id: `evt-${i}`,
    ...createMoveEvent()
  }))
  const state = createGameState({ eventLog: events })

  const startTime = Date.now()
  ReplayCommand.execute(state, { mode: 'full' })
  const endTime = Date.now()

  expect(endTime - startTime).toBeLessThan(5000)  // < 5 seconds
})
```

**Event Creation**:
```typescript
test('creates REPLAY_EXECUTED event', () => {
  const events = [createMoveEvent()]
  const state = createGameState({ eventLog: events })

  const replayed = ReplayCommand.execute(state, { mode: 'full' })

  const lastEvent = replayed.eventLog[replayed.eventLog.length - 1]
  expect(lastEvent.type).toBe('REPLAY_EXECUTED')
  expect(lastEvent.eventCount).toBe(1)
  expect(lastEvent.replayTime).toBeGreaterThanOrEqual(0)
})
```

## Related

- [ReplayService](../services/ReplayService.md) - Event replay logic
- [EventService](../services/EventService.md) - Event management
- [SaveGameCommand](./SaveGameCommand.md) - Save with event log
- [LoadGameCommand](./LoadGameCommand.md) - Load and replay verification
- [Event Sourcing](../systems/event-sourcing.md) - Event sourcing pattern
- [Architecture](../architecture.md) - Event sourcing architecture
