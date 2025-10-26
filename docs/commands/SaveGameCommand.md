# SaveGameCommand

**Save complete game state and event log to IndexedDB.**

## Responsibility

Serializes current game state and complete event log to IndexedDB storage, creating a save point that can be loaded later. Manages save slots, metadata, and data integrity validation.

## Command Flow

### Preconditions
1. Game is in valid state to save (not in critical transition)
2. Save slot name is valid and not reserved
3. IndexedDB is available in browser
4. Game state can be serialized

### Services Called
1. **SaveService.saveGame** - Serialize and persist game state
2. **SaveService.serializeState** - Convert state to JSON
3. **SaveService.serializeEventLog** - Convert event log to JSON
4. **ValidationService.validateGameState** - Ensure state is valid
5. **EventService.createEvent** - Log save event

### Events Created
```typescript
{
  type: "GAME_SAVED",
  slotName: string,
  timestamp: number,
  saveSize: number,
  eventCount: number
}
```

### State Changes
1. Save record created in IndexedDB
2. Save metadata updated (timestamp, description, play time)
3. Checksum generated for data integrity
4. Save event added to game log
5. State remains unchanged (save is non-destructive)

## API Reference

**Signature**:
```typescript
function execute(state: GameState, params: {
  slotName: string,
  description?: string
}): GameState
```

**Parameters**:
- `state` - Current game state to save
- `params.slotName` - Save slot identifier (e.g., "save1", "quicksave")
- `params.description` - Optional player description of save

**Returns**: New game state with save event added

**Throws**:
- `InvalidSlotNameError` - Slot name invalid or reserved
- `SaveFailedError` - IndexedDB write failed
- `InvalidStateError` - Game state cannot be saved (corruption)
- `StorageQuotaExceededError` - Browser storage full

## Preconditions

### Slot Name Validation
```typescript
// Validate slot name format
const validSlotPattern = /^(save[1-9]|save10|quicksave|autosave)$/
if (!validSlotPattern.test(slotName)) {
  throw new InvalidSlotNameError(
    `Invalid slot name: ${slotName}. Must be save1-save10, quicksave, or autosave.`
  )
}
```

### State Validation
```typescript
// Ensure game state is valid before saving
const validation = ValidationService.validateGameState(state)
if (!validation.valid) {
  throw new InvalidStateError(
    `Cannot save corrupted state: ${validation.errors.join(', ')}`
  )
}
```

### Storage Availability
```typescript
// Check IndexedDB is available
if (!window.indexedDB) {
  throw new StorageUnavailableError('IndexedDB not supported in browser')
}
```

## Services Used

### SaveService
- **saveGame** - Main save operation (async)
- **serializeState** - Convert GameState to JSON string
- **serializeEventLog** - Convert event log to JSON string
- **compressSave** - Optional compression for large saves
- **getSaveMetadata** - Get existing save info (for overwrite check)

### ValidationService
- **validateGameState** - Ensure state integrity before saving

### EventService
- **createEvent** - Create GAME_SAVED event

## Events Created

### GAME_SAVED Event
```typescript
{
  id: "evt-12354",
  type: "GAME_SAVED",
  timestamp: 1635725700000,
  slotName: "save1",
  description: "Level 3, ready to fight dragon",
  saveSize: 245678,  // Bytes
  eventCount: 1523,  // Events in log
  compressed: false,
  checksum: "a1b2c3d4e5f6...",
  metadata: {
    partyLevel: 3,
    partyPosition: { x: 10, y: 15, level: 3 },
    playTime: 7200000,  // 2 hours in ms
    characters: [
      { name: "Conan", class: "FIGHTER", level: 4 },
      { name: "Merlin", class: "MAGE", level: 3 }
    ]
  }
}
```

## Save File Structure

### IndexedDB Record
```typescript
{
  // Primary key
  slotName: "save1",

  // Save format version
  version: 1,

  // Save timestamp
  timestamp: 1635725700000,

  // Metadata for save browser
  metadata: {
    description: "Level 3, ready to fight dragon",
    partyLevel: 3,
    playTime: 7200000,
    characterNames: ["Conan", "Merlin", "Gandalf"],
    location: "Dungeon Level 3 (10, 15)"
  },

  // Serialized data
  state: "{\"mode\":\"NAVIGATION\",\"party\":{...},...}",
  eventLog: "[{\"id\":\"evt-1\",\"type\":\"MOVE_PARTY\",...},...]",

  // Data integrity
  compressed: false,
  checksum: "sha256:a1b2c3d4e5f6..."
}
```

### Save Slots
**Manual Saves**: save1-save10 (10 slots)
**Quicksave**: quicksave (F5 key, 1 slot)
**Autosave**: autosave (automatic, 1 slot)

## Save Triggers

### Manual Save
Triggered by player action:
```typescript
// Player selects "Save Game" from menu
SaveGameCommand.execute(state, {
  slotName: "save3",
  description: "Before boss fight"
})
```

### Quicksave
Triggered by F5 key:
```typescript
// Keyboard shortcut
SaveGameCommand.execute(state, {
  slotName: "quicksave",
  description: `Quicksave at ${new Date().toLocaleString()}`
})
```

### Autosave
Triggered automatically:
```typescript
// On level change (stairs)
SaveGameCommand.execute(state, {
  slotName: "autosave",
  description: `Autosave: Level ${state.party.position.level}`
})

// Every 10 minutes
setInterval(() => {
  SaveGameCommand.execute(state, {
    slotName: "autosave",
    description: "Autosave (periodic)"
  })
}, 600000)
```

## Testing

### Test Cases

**Basic Save**:
```typescript
test('saves game state to IndexedDB', async () => {
  const state = createGameState({
    mode: 'NAVIGATION',
    party: createParty(),
    roster: createRoster()
  })

  const result = await SaveGameCommand.execute(state, {
    slotName: 'save1',
    description: 'Test save'
  })

  // Verify save exists in IndexedDB
  const savedData = await SaveService.getSaveMetadata('save1')
  expect(savedData).toBeDefined()
  expect(savedData.description).toBe('Test save')
})
```

**Save Overwrite**:
```typescript
test('overwrites existing save in slot', async () => {
  const state1 = createGameState({ party: { gold: 100 } })
  const state2 = createGameState({ party: { gold: 500 } })

  await SaveGameCommand.execute(state1, {
    slotName: 'save1',
    description: 'First save'
  })

  await SaveGameCommand.execute(state2, {
    slotName: 'save1',
    description: 'Second save'
  })

  const metadata = await SaveService.getSaveMetadata('save1')
  expect(metadata.description).toBe('Second save')
})
```

**Invalid Slot Name**:
```typescript
test('throws error for invalid slot name', async () => {
  const state = createGameState()

  await expect(SaveGameCommand.execute(state, {
    slotName: 'invalid-slot',
    description: 'Test'
  })).rejects.toThrow(InvalidSlotNameError)
})
```

**Save Metadata**:
```typescript
test('stores correct metadata with save', async () => {
  const state = createGameState({
    party: {
      position: { x: 10, y: 15, level: 3 },
      members: [fighter, mage]
    },
    playTime: 7200000  // 2 hours
  })

  await SaveGameCommand.execute(state, {
    slotName: 'save1',
    description: 'Metadata test'
  })

  const metadata = await SaveService.getSaveMetadata('save1')
  expect(metadata.partyLevel).toBe(3)
  expect(metadata.playTime).toBe(7200000)
  expect(metadata.characterNames).toHaveLength(2)
})
```

**Checksum Generation**:
```typescript
test('generates checksum for data integrity', async () => {
  const state = createGameState()

  await SaveGameCommand.execute(state, {
    slotName: 'save1'
  })

  const saveData = await SaveService.loadRawSave('save1')
  expect(saveData.checksum).toMatch(/^sha256:[a-f0-9]{64}$/)
})
```

**Compression**:
```typescript
test('compresses large save files', async () => {
  const largeEventLog = Array(10000).fill(null).map((_, i) => ({
    id: `evt-${i}`,
    type: 'MOVE_PARTY',
    timestamp: Date.now()
  }))
  const state = createGameState({ eventLog: largeEventLog })

  await SaveGameCommand.execute(state, {
    slotName: 'save1'
  })

  const saveData = await SaveService.loadRawSave('save1')
  expect(saveData.compressed).toBe(true)
  expect(saveData.saveSize).toBeLessThan(
    JSON.stringify(state).length * 0.5  // 50%+ compression
  )
})
```

**Storage Quota**:
```typescript
test('handles storage quota exceeded', async () => {
  // Mock IndexedDB quota exceeded
  jest.spyOn(SaveService, 'saveGame').mockRejectedValue(
    new DOMException('QuotaExceededError')
  )

  const state = createGameState()

  await expect(SaveGameCommand.execute(state, {
    slotName: 'save1'
  })).rejects.toThrow(StorageQuotaExceededError)
})
```

**Event Creation**:
```typescript
test('creates GAME_SAVED event', async () => {
  const state = createGameState({ eventLog: [] })

  const result = await SaveGameCommand.execute(state, {
    slotName: 'save1',
    description: 'Event test'
  })

  const lastEvent = result.eventLog[result.eventLog.length - 1]
  expect(lastEvent.type).toBe('GAME_SAVED')
  expect(lastEvent.slotName).toBe('save1')
  expect(lastEvent.eventCount).toBeGreaterThanOrEqual(0)
})
```

## Related

- [SaveService](../services/SaveService.md) - Save persistence logic
- [LoadGameCommand](./LoadGameCommand.md) - Load saved games
- [ReplayCommand](./ReplayCommand.md) - Replay event log
- [ValidationService](../services/ValidationService.md) - State validation
- [Event Sourcing](../systems/event-sourcing.md) - Event sourcing pattern
- [Save Format](../data-format/save-format.md) - Save file specification
