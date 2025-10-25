# TownService

**Pure function service for town state management and service access.**

## Responsibility

Manages town mode state, validates access to town services (Inn, Temple, Shop, Training), and handles transitions between town and dungeon.

## API Reference

### enterTown

Enter town from dungeon.

**Signature**:
```typescript
function enterTown(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (in dungeon or navigation mode)

**Returns**: New game state with mode set to TOWN

**Throws**:
- `InvalidStateTransitionError` if already in town or in combat

**Example**:
```typescript
const dungeonState = createGameState({ mode: 'NAVIGATION' })

const townState = TownService.enterTown(dungeonState)
// townState.mode = 'TOWN'
// townState.party.position preserved (return point)
```

### exitTown

Exit town and enter dungeon.

**Signature**:
```typescript
function exitTown(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (in town)

**Returns**: New game state with mode set to NAVIGATION

**Throws**:
- `InvalidStateTransitionError` if not in town

**Example**:
```typescript
const townState = createGameState({ mode: 'TOWN' })

const dungeonState = TownService.exitTown(townState)
// dungeonState.mode = 'NAVIGATION'
// dungeonState.party.position = (0, 0, 1) (dungeon entrance)
```

### canAccessInn

Check if party can access inn service.

**Signature**:
```typescript
function canAccessInn(party: Party): boolean
```

**Parameters**:
- `party`: Current party

**Returns**: True if inn is accessible

**Requirements**:
- Party must have at least 1 conscious member
- Party must have sufficient gold for rest

**Example**:
```typescript
const party = createParty({ gold: 100, members: [aliveCharacter] })

const canRest = TownService.canAccessInn(party)
// Result: true (has gold and conscious member)

const deadParty = createParty({ members: [deadCharacter] })
const cannotRest = TownService.canAccessInn(deadParty)
// Result: false (no conscious members)
```

### canAccessTemple

Check if party can access temple service.

**Signature**:
```typescript
function canAccessTemple(party: Party): boolean
```

**Parameters**:
- `party`: Current party

**Returns**: True if temple is accessible

**Requirements**:
- At least 1 conscious member
- Have dead/ashes characters to resurrect OR status ailments to cure

**Example**:
```typescript
const party = createParty({
  members: [
    createCharacter({ status: 'alive' }),
    createCharacter({ status: 'dead' })
  ]
})

const canUseTemple = TownService.canAccessTemple(party)
// Result: true (has dead character needing resurrection)
```

### canAccessShop

Check if party can access shop service.

**Signature**:
```typescript
function canAccessShop(party: Party): boolean
```

**Parameters**:
- `party`: Current party

**Returns**: True if shop is accessible

**Requirements**:
- At least 1 conscious member

**Example**:
```typescript
const party = createParty({ gold: 500, members: [aliveCharacter] })

const canShop = TownService.canAccessShop(party)
// Result: true
```

### canAccessTraining

Check if party can access training grounds.

**Signature**:
```typescript
function canAccessTraining(
  roster: Map<string, Character>
): boolean
```

**Parameters**:
- `roster`: All created characters

**Returns**: True if training is accessible

**Requirements**:
- Have characters in roster

**Example**:
```typescript
const roster = new Map([
  ['char1', createCharacter()],
  ['char2', createCharacter()]
])

const canTrain = TownService.canAccessTraining(roster)
// Result: true (has characters)

const emptyRoster = new Map()
const cannotTrain = TownService.canAccessTraining(emptyRoster)
// Result: false (no characters)
```

### getAvailableServices

Get list of available town services for current party.

**Signature**:
```typescript
function getAvailableServices(
  party: Party,
  roster: Map<string, Character>
): TownService[]
```

**Parameters**:
- `party`: Current party
- `roster`: All characters

**Returns**: Array of accessible services

**Services**:
- `INN`: Rest and restore
- `TEMPLE`: Resurrection and cure
- `SHOP`: Buy/sell equipment
- `TRAINING`: Roster management, level-up
- `CHARACTER_CREATION`: Create new characters
- `PARTY_FORMATION`: Modify active party

**Example**:
```typescript
const party = createParty({ gold: 100, members: [aliveCharacter] })
const roster = new Map([['char1', aliveCharacter]])

const services = TownService.getAvailableServices(party, roster)
// Result: ['INN', 'TEMPLE', 'SHOP', 'TRAINING', 'CHARACTER_CREATION', 'PARTY_FORMATION']
```

### validatePartyForDungeon

Validate party can enter dungeon.

**Signature**:
```typescript
function validatePartyForDungeon(party: Party): ValidationResult
```

**Parameters**:
- `party`: Party attempting to enter dungeon

**Returns**: Validation result with errors if invalid

**Requirements**:
- At least 1 party member
- At least 1 conscious member
- Recommended: Have thief for traps (warning, not error)

**Example**:
```typescript
const emptyParty = createParty({ members: [] })
const result1 = TownService.validatePartyForDungeon(emptyParty)
// result1.valid = false, result1.errors = ['Party must have at least 1 member']

const validParty = createParty({ members: [aliveCharacter] })
const result2 = TownService.validatePartyForDungeon(validParty)
// result2.valid = true, result2.warnings = ['No thief: traps will be dangerous']
```

### getTownMenuOptions

Get available town menu options.

**Signature**:
```typescript
function getTownMenuOptions(state: GameState): MenuOption[]
```

**Parameters**:
- `state`: Current game state

**Returns**: Array of menu options

**Example**:
```typescript
const state = createGameState({ mode: 'TOWN' })

const options = TownService.getTownMenuOptions(state)
// Result: [
//   { id: 'inn', label: 'Inn', enabled: true },
//   { id: 'temple', label: 'Temple', enabled: true },
//   { id: 'shop', label: 'Shop', enabled: true },
//   { id: 'training', label: 'Training', enabled: true },
//   { id: 'dungeon', label: 'Enter Dungeon', enabled: true }
// ]
```

## Dependencies

Uses:
- `ValidationService` (validate state transitions, party requirements)

## Testing

See [TownService.test.ts](../../tests/services/TownService.test.ts)

**Key test cases**:
- Enter town from navigation mode
- Exit town to dungeon entrance
- Cannot enter town from combat
- Inn accessible with conscious member and gold
- Temple accessible with dead/status characters
- Shop always accessible with conscious member
- Training accessible with roster
- Validate party requires at least 1 member
- Validate party warns if no thief
- Available services filtered by party state
- Menu options enabled/disabled correctly

## Related

- [InnService](./InnService.md) - Inn rest mechanics
- [TempleService](./TempleService.md) - Resurrection and curing
- [ShopService](./ShopService.md) - Buy/sell equipment
- [TrainingService](./TrainingService.md) - Roster management
- [EnterTownCommand](../commands/EnterTownCommand.md) - Uses this service
- [Town System](../systems/town-system.md) - Town system overview
