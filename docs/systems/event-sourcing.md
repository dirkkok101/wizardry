# Event Sourcing System

**Comprehensive overview of event-driven architecture, replay, and persistence.**

## Overview

Event sourcing is the **architectural backbone** of the Wizardry remake, enabling save/load, replay, and debugging.

**Key Concepts**:
- Every action creates an event
- Game state derived from event replay
- Save game = sequence of events
- Replay system allows watching gameplay
- Undo/redo support (optional feature)
- Debugging via event inspection

## Architecture

### Services Involved

- **EventService** - Event creation, validation
- **ReplayService** - Event replay, state reconstruction
- **SaveService** - IndexedDB persistence
- **LoadService** - Load saved games
- **ValidationService** - Event validation

### Commands Involved

All commands create events:
- **MoveForwardCommand** → MoveEvent
- **AttackCommand** → AttackEvent
- **CastSpellCommand** → SpellCastEvent
- **RestAtInnCommand** → RestEvent
- etc.

### Data Structures

```typescript
interface Event {
  id: string                    // Unique event ID (UUID)
  type: EventType               // Event type
  timestamp: number             // Unix timestamp
  gameTime: number              // In-game time (turns)
  data: EventData               // Event-specific data
  metadata: EventMetadata       // Additional context
}

type EventType =
  | 'party_move'
  | 'party_turn'
  | 'combat_start'
  | 'combat_attack'
  | 'combat_spell'
  | 'combat_end'
  | 'character_created'
  | 'character_level_up'
  | 'character_death'
  | 'item_acquired'
  | 'item_equipped'
  | 'spell_learned'
  | 'inn_rest'
  | 'temple_resurrect'
  | 'shop_purchase'
  | 'shop_sale'
  | 'game_save'
  | 'game_load'

interface EventData {
  // Varies by event type
  [key: string]: any
}

interface EventMetadata {
  commandId: string             // Command that created event
  playerId?: string             // Player ID (multiplayer support)
  version: string               // Event schema version
}

interface EventLog {
  events: Event[]               // All events
  currentIndex: number          // Replay position
  version: string               // Log format version
}
```

## Event Creation

### Command → Event Flow

**Standard Pattern**:
```typescript
class MoveForwardCommand {
  execute(state: GameState): GameState {
    // 1. Validate action
    if (!canMoveForward(state.party)) {
      throw new Error('Cannot move forward')
    }

    // 2. Calculate new state
    const newPosition = calculateForwardPosition(state.party)

    // 3. Create event
    const event: Event = {
      id: generateUUID(),
      type: 'party_move',
      timestamp: Date.now(),
      gameTime: state.turnCount,
      data: {
        from: state.party.position,
        to: newPosition,
        facing: state.party.facing
      },
      metadata: {
        commandId: this.id,
        version: '1.0'
      }
    }

    // 4. Apply event to state
    const newState = applyEvent(state, event)

    // 5. Append event to log
    return {
      ...newState,
      eventLog: [...state.eventLog, event]
    }
  }
}
```

### Event Types and Data

**PartyMoveEvent**:
```typescript
{
  type: 'party_move',
  data: {
    from: Position,
    to: Position,
    facing: Direction
  }
}
```

**CombatAttackEvent**:
```typescript
{
  type: 'combat_attack',
  data: {
    attackerId: string,
    targetId: string,
    damage: number,
    hit: boolean,
    critical: boolean
  }
}
```

**CharacterCreatedEvent**:
```typescript
{
  type: 'character_created',
  data: {
    character: Character,
    bonusRoll: number
  }
}
```

**InnRestEvent**:
```typescript
{
  type: 'inn_rest',
  data: {
    roomType: InnRoomType,
    cost: number,
    charactersHealed: string[],
    encounterTriggered: boolean
  }
}
```

## Event Replay

### State Reconstruction

**Replay Process**:
```typescript
function replayEvents(events: Event[]): GameState {
  let state = createInitialGameState()

  for (const event of events) {
    state = applyEvent(state, event)
  }

  return state
}
```

**Apply Event**:
```typescript
function applyEvent(state: GameState, event: Event): GameState {
  switch (event.type) {
    case 'party_move':
      return applyPartyMove(state, event.data)

    case 'combat_attack':
      return applyCombatAttack(state, event.data)

    case 'character_created':
      return applyCharacterCreated(state, event.data)

    // ... handle all event types

    default:
      console.warn(`Unknown event type: ${event.type}`)
      return state
  }
}
```

### Partial Replay

**Replay to Specific Point**:
```typescript
function replayToIndex(events: Event[], targetIndex: number): GameState {
  const relevantEvents = events.slice(0, targetIndex + 1)
  return replayEvents(relevantEvents)
}
```

**Replay from Checkpoint**:
```typescript
interface Checkpoint {
  index: number
  state: GameState
}

function replayFromCheckpoint(
  checkpoint: Checkpoint,
  events: Event[]
): GameState {
  let state = checkpoint.state
  const remainingEvents = events.slice(checkpoint.index + 1)

  for (const event of remainingEvents) {
    state = applyEvent(state, event)
  }

  return state
}
```

## Save System

### Save Format

**IndexedDB Structure**:
```typescript
interface SaveGame {
  id: string                    // Save game ID
  name: string                  // User-provided name
  timestamp: number             // Save time
  eventLog: EventLog            // All events
  metadata: SaveMetadata        // Additional info
}

interface SaveMetadata {
  version: string               // Game version
  playTime: number              // Total play time (seconds)
  turnCount: number             // Total turns
  partyLevel: number            // Average party level
  dungeonLevel: number          // Deepest level reached
  charactersCreated: number     // Total characters created
}
```

**IndexedDB Schema**:
```typescript
const dbSchema = {
  name: 'WizardryDB',
  version: 1,
  stores: [
    {
      name: 'saves',
      keyPath: 'id',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'name', keyPath: 'name' }
      ]
    },
    {
      name: 'events',
      keyPath: 'id',
      indexes: [
        { name: 'saveId', keyPath: 'saveId' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    }
  ]
}
```

### Save Process

**Save Game**:
```typescript
async function saveGame(
  state: GameState,
  saveName: string
): Promise<string> {
  const saveId = generateUUID()

  const saveGame: SaveGame = {
    id: saveId,
    name: saveName,
    timestamp: Date.now(),
    eventLog: state.eventLog,
    metadata: {
      version: '1.0',
      playTime: state.playTime,
      turnCount: state.turnCount,
      partyLevel: calculateAverageLevel(state.party),
      dungeonLevel: state.party.position.level,
      charactersCreated: state.roster.size
    }
  }

  await IndexedDBService.put('saves', saveGame)

  return saveId
}
```

### Load Process

**Load Game**:
```typescript
async function loadGame(saveId: string): Promise<GameState> {
  const saveGame = await IndexedDBService.get('saves', saveId)

  if (!saveGame) {
    throw new Error(`Save game ${saveId} not found`)
  }

  // Replay all events to reconstruct state
  const state = replayEvents(saveGame.eventLog.events)

  return state
}
```

## Replay Viewer

### Playback Controls

**Replay Interface**:
```typescript
interface ReplayControls {
  play: () => void              // Auto-advance events
  pause: () => void             // Pause playback
  stepForward: () => void       // Advance 1 event
  stepBackward: () => void      // Rewind 1 event
  jumpToEvent: (index: number) => void
  setSpeed: (speed: number) => void  // 0.5×, 1×, 2×, 4×
}
```

**Playback State**:
```typescript
interface ReplayState {
  events: Event[]
  currentIndex: number
  playing: boolean
  speed: number                 // Playback speed multiplier
  gameState: GameState          // Current reconstructed state
}
```

### Replay Rendering

**Replay Loop**:
```typescript
function startReplay(events: Event[]): void {
  let currentIndex = 0
  let state = createInitialGameState()

  const interval = setInterval(() => {
    if (currentIndex >= events.length) {
      clearInterval(interval)
      return
    }

    const event = events[currentIndex]
    state = applyEvent(state, event)

    // Render current state
    render(state)

    // Show event details
    displayEventInfo(event)

    currentIndex++
  }, 1000 / replaySpeed)  // Adjust speed
}
```

## Undo/Redo

### Undo Mechanism

**Undo Last Action**:
```typescript
function undo(state: GameState): GameState {
  if (state.eventLog.length === 0) {
    return state
  }

  // Remove last event
  const events = state.eventLog.slice(0, -1)

  // Replay from beginning (without last event)
  return replayEvents(events)
}
```

**Optimized Undo** (with checkpoints):
```typescript
function undoOptimized(state: GameState, checkpoints: Checkpoint[]): GameState {
  const targetIndex = state.eventLog.length - 2

  // Find nearest checkpoint before target
  const checkpoint = findNearestCheckpoint(checkpoints, targetIndex)

  // Replay from checkpoint to target
  return replayFromCheckpoint(checkpoint, state.eventLog.slice(0, targetIndex + 1))
}
```

### Redo Mechanism

**Redo Last Undone Action**:
```typescript
interface GameStateWithHistory {
  state: GameState
  undoneEvents: Event[]         // Stack of undone events
}

function redo(stateWithHistory: GameStateWithHistory): GameStateWithHistory {
  if (stateWithHistory.undoneEvents.length === 0) {
    return stateWithHistory
  }

  const eventToRedo = stateWithHistory.undoneEvents[stateWithHistory.undoneEvents.length - 1]

  return {
    state: applyEvent(stateWithHistory.state, eventToRedo),
    undoneEvents: stateWithHistory.undoneEvents.slice(0, -1)
  }
}
```

## Debugging

### Event Inspection

**Event Viewer**:
```typescript
function inspectEvent(event: Event): void {
  console.log('Event Details:')
  console.log(`  Type: ${event.type}`)
  console.log(`  Time: ${new Date(event.timestamp).toISOString()}`)
  console.log(`  Turn: ${event.gameTime}`)
  console.log(`  Data:`, JSON.stringify(event.data, null, 2))
  console.log(`  Metadata:`, event.metadata)
}
```

**Event Search**:
```typescript
function findEvents(
  events: Event[],
  filter: (event: Event) => boolean
): Event[] {
  return events.filter(filter)
}

// Examples:
const combatEvents = findEvents(events, e => e.type.startsWith('combat_'))
const deathEvents = findEvents(events, e => e.type === 'character_death')
const criticalHits = findEvents(events, e =>
  e.type === 'combat_attack' && e.data.critical === true
)
```

### State Comparison

**Diff States**:
```typescript
function diffStates(before: GameState, after: GameState): StateDiff {
  return {
    partyMoved: before.party.position !== after.party.position,
    hpChanged: getHPChanges(before.party, after.party),
    itemsChanged: getInventoryChanges(before.party, after.party),
    goldChanged: before.party.gold !== after.party.gold
    // ... etc
  }
}
```

## Performance Optimization

### Checkpointing

**Create Checkpoints**:
```typescript
function createCheckpoints(events: Event[]): Checkpoint[] {
  const checkpointInterval = 100  // Every 100 events

  const checkpoints: Checkpoint[] = []
  let state = createInitialGameState()

  for (let i = 0; i < events.length; i++) {
    state = applyEvent(state, events[i])

    if (i % checkpointInterval === 0) {
      checkpoints.push({
        index: i,
        state: cloneDeep(state)  // Deep copy
      })
    }
  }

  return checkpoints
}
```

**Benefits**:
- Faster replay (don't replay from beginning)
- Efficient undo/redo
- Quick save/load

### Event Compression

**Compress Event Log**:
```typescript
function compressEvents(events: Event[]): CompressedEventLog {
  // Remove redundant data
  // Merge consecutive similar events
  // Apply delta compression

  return {
    version: '1.0',
    compressed: true,
    events: compressedEvents
  }
}
```

## Related Documentation

**Services**:
- [EventService](../services/EventService.md) - Event creation
- [ReplayService](../services/ReplayService.md) - Event replay
- [SaveService](../services/SaveService.md) - Save to IndexedDB
- [LoadService](../services/LoadService.md) - Load from IndexedDB

**Commands**:
- All commands create events
- [SaveGameCommand](../commands/SaveGameCommand.md) - Trigger save
- [LoadGameCommand](../commands/LoadGameCommand.md) - Trigger load

**Game Design**:
- No player-facing game design (implementation detail)

**Research**:
- No specific research docs (modern architecture pattern)

**Diagrams**:
- [Architecture Layers](../diagrams/architecture-layers.md) - Event sourcing in data layer

**Implementation Notes**:
- Event sourcing enables powerful features (replay, undo, save/load)
- Deterministic event application critical for correctness
- Checkpointing essential for performance
- IndexedDB provides reliable browser storage
