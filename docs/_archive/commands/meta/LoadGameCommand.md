# LoadGameCommand

**Load saved game from IndexedDB and restore game state.**

## Responsibility

Retrieves saved game state and event log from IndexedDB, validates data integrity, and reconstructs complete game state by replaying event stream. Replaces current game state with loaded state.

## Command Flow

### Preconditions
1. Save slot exists in IndexedDB
2. Save data is valid and not corrupted
3. Save version is compatible with current game version
4. Checksum validation passes

### Services Called
1. **LoadService.loadGame** - Load save from IndexedDB
2. **LoadService.deserializeState** - Parse JSON state
3. **LoadService.deserializeEventLog** - Parse JSON event log
4. **ReplayService.replayEvents** - Reconstruct state from events
5. **ValidationService.validateSaveData** - Verify data integrity
6. **EventService.createEvent** - Log load event

### Events Created
```typescript
{
  type: "GAME_LOADED",
  slotName: string,
  timestamp: number,
  eventCount: number,
  loadTime: number
}
```

### State Changes
1. Current game state completely replaced
2. Event log replaced with loaded events
3. Party position and status restored
4. Character roster restored
5. Dungeon state restored
6. Load event added to new event log

## API Reference

**Signature**:
```typescript
function execute(state: GameState, params: {
  slotName: string
}): GameState
```

**Parameters**:
- `state` - Current game state (will be replaced)
- `params.slotName` - Save slot to load (e.g., "save1", "quicksave")

**Returns**: New game state loaded from save

**Throws**:
- `SaveNotFoundError` - Slot doesn't exist or is empty
- `LoadFailedError` - IndexedDB read failed
- `CorruptedSaveError` - Checksum validation failed
- `IncompatibleVersionError` - Save from newer/incompatible version
- `DeserializationError` - JSON parsing failed

## Preconditions

### Save Existence Check
```typescript
// Verify save exists in IndexedDB
const saveExists = await LoadService.hasSave(slotName)
if (!saveExists) {
  throw new SaveNotFoundError(
    `No save found in slot: ${slotName}`
  )
}
```

### Version Compatibility Check
```typescript
// Check save format version
const metadata = await LoadService.getSaveMetadata(slotName)
if (metadata.version > CURRENT_SAVE_VERSION) {
  throw new IncompatibleVersionError(
    `Save from newer version (${metadata.version} > ${CURRENT_SAVE_VERSION})`
  )
}
```

### Data Integrity Check
```typescript
// Validate checksum
const saveData = await LoadService.loadRawSave(slotName)
const validation = ValidationService.validateSaveData(saveData)
if (!validation.valid) {
  throw new CorruptedSaveError(
    `Save data corrupted: ${validation.errors.join(', ')}`
  )
}
```

## Services Used

### LoadService
- **loadGame** - Main load operation (async)
- **deserializeState** - Parse GameState from JSON
- **deserializeEventLog** - Parse event log from JSON
- **decompressSave** - Decompress compressed saves
- **getSaveMetadata** - Get save info before loading
- **hasSave** - Check if save exists

### ReplayService
- **replayEvents** - Reconstruct state from event stream
- **validateEventStream** - Ensure events are valid

### ValidationService
- **validateSaveData** - Checksum and structure validation

### EventService
- **createEvent** - Create GAME_LOADED event

## Events Created

### GAME_LOADED Event
```typescript
{
  id: "evt-12355",
  type: "GAME_LOADED",
  timestamp: 1635725800000,
  slotName: "save1",
  saveTimestamp: 1635725700000,
  description: "Level 3, ready to fight dragon",
  eventCount: 1523,
  loadTime: 156,  // ms to load and replay
  metadata: {
    partyLevel: 3,
    playTime: 7200000,
    characterCount: 6,
    saveVersion: 1
  }
}
```

## Load Process

### Step 1: Load from IndexedDB
```typescript
// Retrieve save record
const saveData = await LoadService.loadRawSave(slotName)
// Returns: { state: string, eventLog: string, metadata, checksum, ... }
```

### Step 2: Decompress (if needed)
```typescript
// Decompress save data if compressed
if (saveData.compressed) {
  saveData = await LoadService.decompressSave(saveData)
}
```

### Step 3: Validate Checksum
```typescript
// Verify data integrity
const calculatedChecksum = calculateChecksum(
  saveData.state + saveData.eventLog
)
if (calculatedChecksum !== saveData.checksum) {
  throw new CorruptedSaveError('Checksum mismatch')
}
```

### Step 4: Deserialize
```typescript
// Parse JSON strings
const state = LoadService.deserializeState(saveData.state)
const eventLog = LoadService.deserializeEventLog(saveData.eventLog)
```

### Step 5: Replay Events (Optional Verification)
```typescript
// Optionally replay events to verify state consistency
const replayedState = ReplayService.replayEvents(
  eventLog,
  createInitialState()
)
// Compare replayedState with loaded state
```

### Step 6: Return New State
```typescript
// Return loaded state with GAME_LOADED event
return {
  ...state,
  eventLog: [...eventLog, loadEvent]
}
```

## Load Strategies

### Full State Load (Fast)
Directly use deserialized state:
```typescript
// Fastest: Use state as-is
return LoadService.deserializeState(saveData.state)
```

### Event Replay Load (Verification)
Replay events to reconstruct state:
```typescript
// Slower but verifies event log integrity
return ReplayService.replayEvents(eventLog, initialState)
```

### Hybrid Load (Recommended)
Use state but verify with event replay in background:
```typescript
// Load state immediately
const state = LoadService.deserializeState(saveData.state)

// Verify in background (async)
setTimeout(() => {
  const verified = ReplayService.replayEvents(eventLog, initialState)
  if (!deepEqual(state, verified)) {
    console.warn('State mismatch detected')
  }
}, 0)

return state
```

## Testing

### Test Cases

**Basic Load**:
```typescript
test('loads game state from save slot', async () => {
  // Create and save game
  const originalState = createGameState({
    party: { gold: 500 },
    roster: createRoster()
  })
  await SaveGameCommand.execute(originalState, { slotName: 'save1' })

  // Load game
  const loadedState = await LoadGameCommand.execute(
    createGameState(),
    { slotName: 'save1' }
  )

  expect(loadedState.party.gold).toBe(500)
  expect(loadedState.roster.size).toBe(originalState.roster.size)
})
```

**Save Not Found**:
```typescript
test('throws error when save slot empty', async () => {
  await expect(LoadGameCommand.execute(
    createGameState(),
    { slotName: 'save99' }
  )).rejects.toThrow(SaveNotFoundError)
})
```

**Corrupted Save**:
```typescript
test('detects corrupted save data', async () => {
  // Create save
  await SaveGameCommand.execute(createGameState(), { slotName: 'save1' })

  // Corrupt checksum in IndexedDB
  const db = await openIndexedDB()
  const saveData = await db.get('saves', 'save1')
  saveData.checksum = 'invalid-checksum'
  await db.put('saves', saveData)

  // Attempt load
  await expect(LoadGameCommand.execute(
    createGameState(),
    { slotName: 'save1' }
  )).rejects.toThrow(CorruptedSaveError)
})
```

**Version Incompatibility**:
```typescript
test('rejects save from newer version', async () => {
  // Create save with future version
  const saveData = createSaveData({ version: 999 })
  await IndexedDB.put('saves', saveData)

  await expect(LoadGameCommand.execute(
    createGameState(),
    { slotName: 'save1' }
  )).rejects.toThrow(IncompatibleVersionError)
})
```

**Event Log Replay**:
```typescript
test('reconstructs state by replaying event log', async () => {
  const events = [
    createMoveEvent({ x: 0, y: 1 }),
    createMoveEvent({ x: 0, y: 2 }),
    createMoveEvent({ x: 0, y: 3 })
  ]
  const state = createGameState({
    party: { position: { x: 0, y: 3, level: 1 } },
    eventLog: events
  })
  await SaveGameCommand.execute(state, { slotName: 'save1' })

  const loaded = await LoadGameCommand.execute(
    createGameState(),
    { slotName: 'save1' }
  )

  const replayed = ReplayService.replayEvents(
    loaded.eventLog,
    createInitialState()
  )
  expect(replayed.party.position).toEqual({ x: 0, y: 3, level: 1 })
})
```

**Compressed Save**:
```typescript
test('loads and decompresses compressed save', async () => {
  // Save large game (triggers compression)
  const largeState = createGameState({
    eventLog: Array(10000).fill(createMoveEvent())
  })
  await SaveGameCommand.execute(largeState, { slotName: 'save1' })

  const metadata = await LoadService.getSaveMetadata('save1')
  expect(metadata.compressed).toBe(true)

  // Load compressed save
  const loaded = await LoadGameCommand.execute(
    createGameState(),
    { slotName: 'save1' }
  )

  expect(loaded.eventLog.length).toBe(10000)
})
```

**Load Time Tracking**:
```typescript
test('tracks load time in event', async () => {
  await SaveGameCommand.execute(createGameState(), { slotName: 'save1' })

  const startTime = Date.now()
  const loaded = await LoadGameCommand.execute(
    createGameState(),
    { slotName: 'save1' }
  )
  const endTime = Date.now()

  const loadEvent = loaded.eventLog[loaded.eventLog.length - 1]
  expect(loadEvent.type).toBe('GAME_LOADED')
  expect(loadEvent.loadTime).toBeLessThanOrEqual(endTime - startTime)
})
```

**Metadata Preservation**:
```typescript
test('preserves save metadata after load', async () => {
  const state = createGameState({
    party: { position: { x: 10, y: 15, level: 3 } },
    playTime: 7200000
  })
  await SaveGameCommand.execute(state, {
    slotName: 'save1',
    description: 'Boss fight'
  })

  const loaded = await LoadGameCommand.execute(
    createGameState(),
    { slotName: 'save1' }
  )

  const loadEvent = loaded.eventLog[loaded.eventLog.length - 1]
  expect(loadEvent.metadata.partyLevel).toBe(3)
  expect(loadEvent.description).toBe('Boss fight')
})
```

**Event Creation**:
```typescript
test('creates GAME_LOADED event', async () => {
  await SaveGameCommand.execute(createGameState(), { slotName: 'save1' })

  const loaded = await LoadGameCommand.execute(
    createGameState(),
    { slotName: 'save1' }
  )

  const lastEvent = loaded.eventLog[loaded.eventLog.length - 1]
  expect(lastEvent.type).toBe('GAME_LOADED')
  expect(lastEvent.slotName).toBe('save1')
  expect(lastEvent.eventCount).toBeGreaterThanOrEqual(0)
})
```

## Related

- [LoadService](../services/LoadService.md) - Load and deserialization logic
- [SaveGameCommand](./SaveGameCommand.md) - Save game state
- [ReplayService](../services/ReplayService.md) - Event replay for verification
- [ValidationService](../services/ValidationService.md) - Data validation
- [Event Sourcing](../systems/event-sourcing.md) - Event sourcing pattern
- [Save Format](../data-format/save-format.md) - Save file specification
