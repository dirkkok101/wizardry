# LoadService

**Pure function service for loading saved games from IndexedDB.**

## Responsibility

Loads and deserializes game saves from IndexedDB, validates save data integrity, and reconstructs game state from event logs.

## API Reference

### loadGame

Load complete game from IndexedDB save slot.

**Signature**:
```typescript
function loadGame(slotName: string): Promise<LoadResult>
```

**Parameters**:
- `slotName`: Save slot to load (e.g. "save1", "autosave")

**Returns**: Promise resolving to loaded game state and event log

**Throws**:
- `SaveNotFoundError` if slot doesn't exist
- `CorruptedSaveError` if checksum validation fails
- `IncompatibleVersionError` if save format too old/new

**Example**:
```typescript
const result = await LoadService.loadGame("save1")
// result = {
//   state: GameState,
//   eventLog: GameEvent[],
//   metadata: SaveMetadata
// }
```

### deserializeState

Deserialize game state from JSON.

**Signature**:
```typescript
function deserializeState(json: string): GameState
```

**Parameters**:
- `json`: Serialized game state JSON string

**Returns**: Reconstructed game state object

**Throws**:
- `InvalidStateJSONError` if JSON malformed

**Example**:
```typescript
const state = LoadService.deserializeState(stateJson)
// state = complete GameState object
```

### deserializeEventLog

Deserialize event log from JSON.

**Signature**:
```typescript
function deserializeEventLog(json: string): GameEvent[]
```

**Parameters**:
- `json`: Serialized event log JSON string

**Returns**: Array of game events

**Throws**:
- `InvalidEventLogJSONError` if JSON malformed

**Example**:
```typescript
const events = LoadService.deserializeEventLog(eventLogJson)
// events = [GameEvent, GameEvent, ...]
```

### validateSaveData

Validate save data integrity and format.

**Signature**:
```typescript
function validateSaveData(saveData: SaveData): ValidationResult
```

**Parameters**:
- `saveData`: Save data to validate

**Returns**: Validation result with success/errors

**Example**:
```typescript
const result = LoadService.validateSaveData(saveData)
// result = {
//   valid: true,
//   errors: [],
//   warnings: ["Save from older version, may need migration"]
// }
```

### verifyChecksum

Verify save data checksum matches.

**Signature**:
```typescript
function verifyChecksum(saveData: SaveData): boolean
```

**Parameters**:
- `saveData`: Save data with checksum

**Returns**: True if checksum valid, false if corrupted

**Example**:
```typescript
const valid = LoadService.verifyChecksum(saveData)
// valid = true (save data not corrupted)
```

### reconstructState

Reconstruct game state from event log.

**Signature**:
```typescript
function reconstructState(
  eventLog: GameEvent[],
  initialState: GameState
): GameState
```

**Parameters**:
- `eventLog`: Complete event log from save
- `initialState`: Initial state (new game state)

**Returns**: Reconstructed game state

**Notes**: Uses ReplayService internally

**Example**:
```typescript
const state = LoadService.reconstructState(eventLog, newGameState)
// state = game state at time of save
```

### migrateSaveVersion

Migrate save from older version to current version.

**Signature**:
```typescript
function migrateSaveVersion(
  saveData: SaveData,
  fromVersion: number,
  toVersion: number
): SaveData
```

**Parameters**:
- `saveData`: Save data to migrate
- `fromVersion`: Source version number
- `toVersion`: Target version number

**Returns**: Migrated save data

**Example**:
```typescript
const migrated = LoadService.migrateSaveVersion(oldSave, 1, 2)
// migrated = save data updated to version 2 format
```

### quickLoad

Load from quicksave slot.

**Signature**:
```typescript
function quickLoad(): Promise<LoadResult>
```

**Returns**: Promise resolving to loaded game from quicksave

**Throws**:
- `NoQuicksaveError` if no quicksave exists

**Example**:
```typescript
const result = await LoadService.quickLoad()
// Loads from quicksave slot (F9 key)
```

### loadAutosave

Load from autosave slot.

**Signature**:
```typescript
function loadAutosave(): Promise<LoadResult>
```

**Returns**: Promise resolving to loaded game from autosave

**Throws**:
- `NoAutosaveError` if no autosave exists

**Example**:
```typescript
const result = await LoadService.loadAutosave()
// Loads most recent autosave
```

## Load Process

### Step-by-Step

1. **Retrieve Save Data**
   - Query IndexedDB for save slot
   - Throw error if not found

2. **Decompress (if needed)**
   - Check if save is compressed
   - Decompress using SaveService.decompressSave()

3. **Verify Checksum**
   - Calculate checksum of loaded data
   - Compare to stored checksum
   - Throw error if mismatch

4. **Validate Version**
   - Check save format version
   - Migrate if from older version
   - Reject if from newer version

5. **Deserialize**
   - Parse state JSON
   - Parse event log JSON
   - Validate structure

6. **Reconstruct State**
   - Option 1: Use saved state directly
   - Option 2: Replay event log (more reliable)

7. **Return Result**
   - Return state, event log, metadata

## Version Migration

### Version 1 → Version 2 (Example)
```typescript
function migrateV1ToV2(saveData: SaveData): SaveData {
  // Add new fields introduced in v2
  const state = JSON.parse(saveData.state)
  state.newField = defaultValue

  return {
    ...saveData,
    state: JSON.stringify(state),
    version: 2
  }
}
```

## Error Handling

### Corrupted Saves
- Checksum mismatch detected
- Attempt to load from autosave
- Prompt user to load different save

### Missing Saves
- Slot empty or doesn't exist
- Show "No save in this slot" message
- Return to save/load menu

### Version Incompatibility
- Save from future version (can't load)
- Save from very old version (migration failed)
- Warn user and prevent loading

## Dependencies

Uses:
- `SaveService` (decompression)
- `ReplayService` (state reconstruction from events)
- `ValidationService` (save validation)
- IndexedDB API (data retrieval)
- Crypto API (checksum verification)

## Testing

See [LoadService.test.ts](../../tests/services/LoadService.test.ts)

**Key test cases**:
- Load from valid save succeeds
- Deserialize state correctly
- Deserialize event log preserves events
- Checksum verification detects corruption
- Load throws error for missing save
- Load throws error for corrupted save
- Version migration updates old saves
- Quickload uses quicksave slot
- Autosave loads most recent autosave
- Reconstructed state matches saved state

## Related

- [SaveService](./SaveService.md) - Saving games
- [ReplayService](./ReplayService.md) - Event replay for reconstruction
- [EventService](./EventService.md) - Event deserialization
- [Event Sourcing](../systems/event-sourcing.md) - Event sourcing overview
- [Data Format](../data-format/save-format.md) - Save file format spec
