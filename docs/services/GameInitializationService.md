# GameInitializationService

**Pure function service for creating and initializing new game state.**

## Responsibility

Creates new game instances with default values, initializes empty character rosters, sets starting game state, and ensures consistent new game creation across the application.

## Overview

The GameInitializationService centralizes all logic for creating a new game. This ensures that every new game starts with the correct default values and prevents inconsistencies.

**Key Responsibilities:**
- Create empty game state
- Initialize character roster (empty, max 20)
- Set starting gold (0)
- Initialize quest flags (all false)
- Set starting location (Castle/Town)
- Create initial event log

**Used When:**
- No save data exists on title screen start
- User explicitly starts new game (future feature)
- Save data is corrupted and cannot be recovered

## API Reference

### createNewGame

Create complete new game state with all defaults.

**Signature:**
```typescript
function createNewGame(): GameState
```

**Returns:** New game state object with all defaults set

**Example:**
```typescript
const gameState = GameInitializationService.createNewGame()
// gameState = {
//   mode: 'town',
//   currentLevel: 0,
//   position: { x: 0, y: 0, facing: 'north' },
//   party: { ... empty ... },
//   roster: [],
//   gold: 0,
//   questFlags: { ... all false ... }
// }
```

### initializeRoster

Create empty character roster.

**Signature:**
```typescript
function initializeRoster(): Character[]
```

**Returns:** Empty character array (length 0, max capacity 20)

**Example:**
```typescript
const roster = GameInitializationService.initializeRoster()
// roster = []
// Can hold up to 20 characters
```

### initializeParty

Create empty party structure.

**Signature:**
```typescript
function initializeParty(): Party
```

**Returns:** Empty party object

**Example:**
```typescript
const party = GameInitializationService.initializeParty()
// party = {
//   members: [],
//   formation: { frontRow: [], backRow: [] },
//   gold: 0,
//   inventory: [],
//   inMaze: false
// }
```

### initializeQuestFlags

Create quest flags object with all flags set to false.

**Signature:**
```typescript
function initializeQuestFlags(): QuestFlags
```

**Returns:** Quest flags with all values false

**Example:**
```typescript
const questFlags = GameInitializationService.initializeQuestFlags()
// questFlags = {
//   werdna_defeated: false,
//   amulet_retrieved: false,
//   bronze_key_found: false,
//   silver_key_found: false,
//   gold_key_found: false,
//   blue_ribbon_found: false
// }
```

### getStartingPosition

Get default starting position (Castle entrance).

**Signature:**
```typescript
function getStartingPosition(): Position
```

**Returns:** Starting position and facing direction

**Example:**
```typescript
const position = GameInitializationService.getStartingPosition()
// position = {
//   x: 0,
//   y: 0,
//   level: 0, // 0 = town/castle
//   facing: 'north'
// }
```

### getStartingGold

Get starting gold amount (always 0).

**Signature:**
```typescript
function getStartingGold(): number
```

**Returns:** Starting gold (0)

**Example:**
```typescript
const gold = GameInitializationService.getStartingGold()
// gold = 0
```

### isNewGame

Check if a game state represents a new, unplayed game.

**Signature:**
```typescript
function isNewGame(state: GameState): boolean
```

**Parameters:**
- `state`: Game state to check

**Returns:** True if state is new/unmodified, false otherwise

**Example:**
```typescript
const state = createNewGame()
const isNew = GameInitializationService.isNewGame(state)
// isNew = true

// After creating a character
createCharacter(state)
const stillNew = GameInitializationService.isNewGame(state)
// stillNew = false (roster no longer empty)
```

### resetGameState

Reset game state back to new game defaults (destructive).

**Signature:**
```typescript
function resetGameState(state: GameState): GameState
```

**Parameters:**
- `state`: Existing game state to reset

**Returns:** Reset game state (new object)

**Throws:**
- Never throws (always succeeds)

**Example:**
```typescript
// Reset current game
const freshState = GameInitializationService.resetGameState(currentState)
// freshState = brand new game, all progress lost
```

**Warning:** This is destructive - all characters, progress, and flags are lost.

## Data Structures

### GameState

Complete game state structure.

```typescript
interface GameState {
  // Current game mode
  mode: GameMode // 'town', 'dungeon', 'combat'

  // Current dungeon level (0 = town)
  currentLevel: number

  // Party position (if in dungeon)
  position: Position

  // Active party
  party: Party

  // Character roster (max 20)
  roster: Character[]

  // Explored map state
  exploredMaps: Record<number, ExploredTiles>

  // Quest progress flags
  questFlags: QuestFlags

  // Game statistics
  stats: GameStatistics

  // Event log for replay
  eventLog: GameEvent[]

  // Metadata
  metadata: GameMetadata
}
```

### GameMode

Current mode of gameplay.

```typescript
type GameMode =
  | 'town'              // In castle/town
  | 'dungeon_nav'       // Exploring dungeon
  | 'combat'            // In battle
  | 'camp'              // Camp menu in dungeon
  | 'character_mgmt'    // Character management screens
```

### Party

Active adventuring party.

```typescript
interface Party {
  // Character IDs in party (max 6)
  members: string[]

  // Party formation
  formation: {
    frontRow: string[]  // Max 3
    backRow: string[]   // Max 3
  }

  // Shared party gold
  gold: number

  // Shared party inventory
  inventory: string[]  // Item IDs

  // Is party currently in dungeon?
  inMaze: boolean
}
```

### QuestFlags

Boolean flags tracking quest progress.

```typescript
interface QuestFlags {
  // Main quest
  werdna_defeated: boolean
  amulet_retrieved: boolean

  // Key items found
  bronze_key_found: boolean
  silver_key_found: boolean
  gold_key_found: boolean
  blue_ribbon_found: boolean

  // Optional side quests (if any)
  // ...
}
```

### GameStatistics

Game-wide statistics (optional, for future features).

```typescript
interface GameStatistics {
  // Play time in milliseconds
  playTime: number

  // Number of battles fought
  battlesWon: number
  battlesLost: number

  // Steps taken in dungeon
  stepsTaken: number

  // Characters created
  charactersCreated: number

  // Highest dungeon level reached
  deepestLevel: number
}
```

### GameMetadata

Metadata about the game.

```typescript
interface GameMetadata {
  // Game version that created this save
  version: string

  // When game was started
  createdAt: number

  // Last played time
  lastPlayedAt: number

  // Save description (optional)
  description?: string
}
```

## Default Values

### New Game Defaults

When creating a new game, these values are used:

```typescript
const NEW_GAME_DEFAULTS = {
  mode: 'town',
  currentLevel: 0,
  position: { x: 0, y: 0, level: 0, facing: 'north' },
  party: {
    members: [],
    formation: { frontRow: [], backRow: [] },
    gold: 0,
    inventory: [],
    inMaze: false
  },
  roster: [],
  exploredMaps: {},
  questFlags: {
    werdna_defeated: false,
    amulet_retrieved: false,
    bronze_key_found: false,
    silver_key_found: false,
    gold_key_found: false,
    blue_ribbon_found: false
  },
  stats: {
    playTime: 0,
    battlesWon: 0,
    battlesLost: 0,
    stepsTaken: 0,
    charactersCreated: 0,
    deepestLevel: 0
  },
  eventLog: [],
  metadata: {
    version: '1.0.0',
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    description: 'New Game'
  }
}
```

## Usage Patterns

### Starting New Game from Title Screen

```typescript
// In StartGameCommand
async execute() {
  // Check for existing save
  const saveExists = await SaveService.checkForSaveData()

  let gameState: GameState

  if (saveExists) {
    // Load existing game
    gameState = await LoadService.loadGame('autosave')
  } else {
    // Create new game
    gameState = GameInitializationService.createNewGame()
  }

  // Navigate to appropriate scene
  const destination = gameState.party.inMaze
    ? SceneType.CAMP
    : SceneType.CASTLE_MENU

  await SceneNavigationService.transitionTo(destination)
}
```

### Handling Corrupted Save

```typescript
// In LoadService
async loadGame(slotName: string) {
  try {
    const saveData = await loadFromIndexedDB(slotName)
    return deserialize(saveData)
  } catch (error) {
    console.error('Save corrupted:', error)

    // Fall back to new game
    return GameInitializationService.createNewGame()
  }
}
```

### New Game+ (Future Feature)

```typescript
// Hypothetical: Start new game with some progress carried over
function createNewGamePlus(previousState: GameState): GameState {
  const newState = GameInitializationService.createNewGame()

  // Carry over specific items (example)
  newState.party.gold = Math.floor(previousState.party.gold * 0.1)

  return newState
}
```

## Validation

### State Validation

Check if a game state is valid:

```typescript
function validateGameState(state: GameState): ValidationResult {
  const errors: string[] = []

  // Check roster size
  if (state.roster.length > 20) {
    errors.push('Roster exceeds maximum size (20)')
  }

  // Check party size
  if (state.party.members.length > 6) {
    errors.push('Party exceeds maximum size (6)')
  }

  // Check gold is non-negative
  if (state.party.gold < 0) {
    errors.push('Party gold cannot be negative')
  }

  // Check formation
  if (state.party.formation.frontRow.length > 3) {
    errors.push('Front row exceeds maximum size (3)')
  }
  if (state.party.formation.backRow.length > 3) {
    errors.push('Back row exceeds maximum size (3)')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
```

## Dependencies

Uses:
- No direct service dependencies (foundational service)

Used by:
- `StartGameCommand` (create new game if no save)
- `LoadService` (fallback on corrupted save)
- `SaveService` (validate state before saving)

## Testing

See [GameInitializationService.test.ts](../../tests/services/GameInitializationService.test.ts)

**Key test cases:**
- createNewGame returns valid game state
- initializeRoster returns empty array
- initializeParty returns empty party
- initializeQuestFlags sets all flags to false
- getStartingPosition returns town position
- getStartingGold returns 0
- isNewGame returns true for new game
- isNewGame returns false after modifications
- resetGameState clears all progress
- All default values are correct

**Validation tests:**
- New game passes validation
- Roster size limit enforced
- Party size limit enforced
- Formation size limits enforced
- Gold cannot be negative

## Performance Considerations

### Object Creation

Creating new game state is lightweight:

```typescript
// Fast operation (< 1ms)
const state = GameInitializationService.createNewGame()
```

### Memory Usage

New game state is small (~2-5KB JSON):

```typescript
const state = createNewGame()
const json = JSON.stringify(state)
console.log(`New game size: ${json.length} bytes`)
// New game size: ~3000 bytes
```

### Immutability

Service returns new objects (doesn't mutate):

```typescript
const state1 = createNewGame()
const state2 = createNewGame()
// state1 !== state2 (different objects)
```

## Usage Examples

### Create New Game

```typescript
// Simple new game creation
const gameState = GameInitializationService.createNewGame()

// Save it
await SaveService.saveGame(gameState, [], 'autosave')

// Start playing
await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU)
```

### Check if New Game

```typescript
// Determine if player has made progress
const state = await LoadService.loadGame('autosave')

if (GameInitializationService.isNewGame(state)) {
  // Show tutorial
  showTutorial()
} else {
  // Skip tutorial
  console.log('Welcome back!')
}
```

### Reset Game (Dangerous!)

```typescript
// Confirm before resetting
const confirmReset = confirm(
  'Start a new game? All progress will be lost!'
)

if (confirmReset) {
  const newState = GameInitializationService.resetGameState(currentState)
  await SaveService.saveGame(newState, [], 'autosave')
  location.reload() // Restart app
}
```

### Custom Starting Conditions (Mod Support)

```typescript
// Hypothetical: Custom starting gold for easy mode
function createEasyModeGame(): GameState {
  const state = GameInitializationService.createNewGame()

  // Give starting gold
  state.party.gold = 1000

  // Give starting items
  state.party.inventory = ['potion_dios', 'potion_dios']

  return state
}
```

## Edge Cases

### Multiple Calls

Service is stateless - multiple calls create independent states:

```typescript
const state1 = createNewGame()
const state2 = createNewGame()

state1.party.gold = 100
console.log(state2.party.gold) // Still 0 (independent)
```

### Partial Initialization

Can use individual methods for testing:

```typescript
// Create custom state for testing
const testState = {
  mode: 'dungeon_nav',
  party: GameInitializationService.initializeParty(),
  roster: GameInitializationService.initializeRoster(),
  questFlags: GameInitializationService.initializeQuestFlags(),
  // ... other required fields
}
```

### Async Considerations

Service is synchronous (no async operations):

```typescript
// No await needed
const state = GameInitializationService.createNewGame()
// Immediately available
```

## Future Enhancements

### Difficulty Modes

```typescript
function createNewGame(difficulty: 'easy' | 'normal' | 'hard'): GameState {
  const state = createNewGame()

  switch (difficulty) {
    case 'easy':
      state.party.gold = 500
      break
    case 'hard':
      state.party.gold = 0
      state.stats.permadeath = true
      break
  }

  return state
}
```

### Character Templates

```typescript
// Pre-made party templates
function createNewGameWithTemplate(template: 'balanced' | 'mages' | 'fighters'): GameState {
  const state = createNewGame()

  switch (template) {
    case 'balanced':
      // Create pre-made party with fighter, mage, priest, thief
      break
  }

  return state
}
```

### Ironman Mode

```typescript
// Hardcore mode - one save only, no reload
function createIronmanGame(): GameState {
  const state = createNewGame()
  state.metadata.ironman = true
  return state
}
```

## Related

- [StartGameCommand](../commands/meta/StartGameCommand.md) - Uses createNewGame()
- [LoadService](./LoadService.md) - Fallback to new game on corruption
- [SaveService](./SaveService.md) - Saves game state
- [Title Screen](../ui/scenes/00-title-screen.md) - Entry point for new game
- [Save Format](../data-format/save-format.md) - Game state structure

---

**Last Updated:** 2025-10-26
