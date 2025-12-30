# SaveService

**Pure function service for game state persistence to IndexedDB.**

## Responsibility

Serializes game state and event log to IndexedDB, manages save slots, and handles save file metadata.

## API Reference

### saveGame

Save complete game state to IndexedDB.

**Signature**:
```typescript
function saveGame(
  state: GameState,
  eventLog: GameEvent[],
  slotName: string,
  metadata?: SaveMetadata
): Promise<SaveResult>
```

**Parameters**:
- `state`: Current game state to save
- `eventLog`: Complete event log
- `slotName`: Save slot identifier (e.g. "save1", "autosave")
- `metadata`: Optional metadata (description, timestamp)

**Returns**: Promise resolving to save result with success/failure

**Throws**:
- `SaveFailedError` if IndexedDB write fails
- `InvalidSlotNameError` if slot name invalid

**Example**:
```typescript
const result = await SaveService.saveGame(
  state,
  eventLog,
  "save1",
  { description: "Level 3, party at stairs", timestamp: Date.now() }
)
// result = { success: true, slotName: "save1", size: 245678 }
```

### serializeState

Serialize game state to JSON.

**Signature**:
```typescript
function serializeState(state: GameState): string
```

**Parameters**:
- `state`: Game state to serialize

**Returns**: JSON string of game state

**Example**:
```typescript
const json = SaveService.serializeState(state)
// json = '{"mode":"NAVIGATION","party":{...},...}'
```

### serializeEventLog

Serialize event log to JSON.

**Signature**:
```typescript
function serializeEventLog(eventLog: GameEvent[]): string
```

**Parameters**:
- `eventLog`: Event log to serialize

**Returns**: JSON string of event log

**Example**:
```typescript
const json = SaveService.serializeEventLog(eventLog)
// json = '[{"id":"evt-1","type":"MOVE_PARTY",...},...]'
```

### getSaveMetadata

Get metadata for save slot without loading full save.

**Signature**:
```typescript
function getSaveMetadata(slotName: string): Promise<SaveMetadata | null>
```

**Parameters**:
- `slotName`: Save slot to query

**Returns**: Promise resolving to metadata or null if slot empty

**Example**:
```typescript
const metadata = await SaveService.getSaveMetadata("save1")
// metadata = {
//   timestamp: 1635724800000,
//   description: "Level 3, party at stairs",
//   partyLevel: 3,
//   playTime: 7200000  // 2 hours
// }
```

### listSaveSlots

List all available save slots.

**Signature**:
```typescript
function listSaveSlots(): Promise<SaveSlotInfo[]>
```

**Returns**: Promise resolving to array of save slot info

**Example**:
```typescript
const slots = await SaveService.listSaveSlots()
// slots = [
//   { name: "save1", timestamp: ..., description: "..." },
//   { name: "save2", timestamp: ..., description: "..." },
//   { name: "autosave", timestamp: ..., description: "..." }
// ]
```

### deleteSave

Delete save from IndexedDB.

**Signature**:
```typescript
function deleteSave(slotName: string): Promise<void>
```

**Parameters**:
- `slotName`: Save slot to delete

**Returns**: Promise resolving when deletion complete

**Throws**:
- `DeleteFailedError` if deletion fails

**Example**:
```typescript
await SaveService.deleteSave("save2")
// Save slot "save2" removed from IndexedDB
```

### autoSave

Create autosave.

**Signature**:
```typescript
function autoSave(
  state: GameState,
  eventLog: GameEvent[]
): Promise<SaveResult>
```

**Parameters**:
- `state`: Current game state
- `eventLog`: Event log

**Returns**: Promise resolving to save result

**Notes**: Uses "autosave" slot, overwrites previous autosave

**Example**:
```typescript
const result = await SaveService.autoSave(state, eventLog)
// Autosave created/updated
```

### compressSave

Compress save data for smaller storage.

**Signature**:
```typescript
function compressSave(saveData: SaveData): Promise<CompressedSave>
```

**Parameters**:
- `saveData`: Uncompressed save data

**Returns**: Promise resolving to compressed save

**Notes**: Uses LZ compression algorithm

**Example**:
```typescript
const compressed = await SaveService.compressSave(saveData)
// compressed.size << saveData.size (50-70% reduction)
```

### decompressSave

Decompress compressed save data.

**Signature**:
```typescript
function decompressSave(compressed: CompressedSave): Promise<SaveData>
```

**Parameters**:
- `compressed`: Compressed save data

**Returns**: Promise resolving to decompressed save

**Example**:
```typescript
const saveData = await SaveService.decompressSave(compressed)
// saveData = original uncompressed save
```

## Save File Structure

### IndexedDB Schema

```typescript
{
  slotName: string,           // Primary key
  version: number,            // Save format version
  timestamp: number,          // Save time (ms since epoch)
  metadata: {
    description: string,
    partyLevel: number,
    playTime: number,
    characters: string[],     // Character names
  },
  state: string,              // Serialized GameState (JSON)
  eventLog: string,           // Serialized event log (JSON)
  compressed: boolean,        // Whether data is compressed
  checksum: string            // Data integrity check
}
```

### Save Slots

- **Manual Saves**: save1-save10 (10 slots)
- **Autosave**: autosave (1 slot, auto-overwritten)
- **Quicksave**: quicksave (1 slot, F5 key)

## Save Triggers

### Manual Save
- Player selects "Save Game" from menu
- Prompts for slot selection
- Allows custom description

### Autosave
- Triggered on level change (stairs)
- Triggered on party wipe (can restore before wipe)
- Triggered every 10 minutes
- Silent (no UI prompt)

### Quicksave
- Triggered by F5 key
- Uses dedicated quicksave slot
- Overwrites previous quicksave

## Data Validation

### Checksum Verification
- Calculate SHA-256 checksum of save data
- Store checksum in save record
- Verify on load to detect corruption

### Version Checking
- Current save format version: 1
- Future versions may migrate old saves
- Reject saves from newer versions

## Dependencies

Uses:
- IndexedDB API (browser storage)
- LZ compression library (data compression)
- Crypto API (checksum generation)

## Testing

See [SaveService.test.ts](../../tests/services/SaveService.test.ts)

**Key test cases**:
- Save to IndexedDB succeeds
- Serialized state can be deserialized
- Event log serialization preserves all events
- Save metadata stored correctly
- List slots returns all saves
- Delete removes save from IndexedDB
- Autosave overwrites previous autosave
- Compression reduces file size 50-70%
- Checksum detects corrupted saves

## Related

- [LoadService](./LoadService.md) - Loading saved games
- [EventService](./EventService.md) - Event creation
- [ReplayService](./ReplayService.md) - Event replay
- [Event Sourcing](../systems/event-sourcing.md) - Event sourcing overview
- [Data Format](../data-format/save-format.md) - Save file format spec
