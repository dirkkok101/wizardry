# SearchService

**Pure function service for searching dungeon tiles for secret doors, hidden chests, and traps.**

## Responsibility

Calculates search success rates for discovering secret doors and hidden treasures in dungeon tiles. Implements the perception-based search mechanics from Wizardry 1.

## API Reference

### calculateSearchChance

Calculate probability of successfully finding hidden features.

**Signature**:
```typescript
function calculateSearchChance(
  character: Character,
  searchType: SearchType
): number
```

**Parameters**:
- `character`: Character performing search
- `searchType`: What they're searching for ('SECRET_DOOR' | 'HIDDEN_CHEST')

**Returns**: Search success percentage (0-95)

**Formula**:
```typescript
// Base chance from perception stats
baseChance = (INT + PIE) / 2

// Class modifier
if (character.class === 'Thief' || character.class === 'Ninja') {
  classModifier = +10
} else if (character.class === 'Mage' || character.class === 'Bishop') {
  classModifier = +5
} else {
  classModifier = 0
}

// Total chance
searchChance% = min(95, baseChance + classModifier)
```

**Example**:
```typescript
// Thief with INT 12, PIE 10
const thief = { class: 'Thief', intelligence: 12, piety: 10 }
const chance = SearchService.calculateSearchChance(thief, 'SECRET_DOOR')
// baseChance = (12 + 10) / 2 = 11
// classModifier = +10
// searchChance = 11 + 10 = 21%

// Mage with INT 18, PIE 16
const mage = { class: 'Mage', intelligence: 18, piety: 16 }
const chance2 = SearchService.calculateSearchChance(mage, 'SECRET_DOOR')
// baseChance = (18 + 16) / 2 = 17
// classModifier = +5
// searchChance = 17 + 5 = 22%

// Fighter with INT 8, PIE 8
const fighter = { class: 'Fighter', intelligence: 8, piety: 8 }
const chance3 = SearchService.calculateSearchChance(fighter, 'SECRET_DOOR')
// baseChance = (8 + 8) / 2 = 8
// classModifier = 0
// searchChance = 8%
```

### attemptSearch

Attempt to search current tile for hidden features.

**Signature**:
```typescript
function attemptSearch(
  character: Character,
  tile: Tile,
  randomSeed: number
): SearchResult
```

**Parameters**:
- `character`: Character searching
- `tile`: Dungeon tile to search
- `randomSeed`: Random seed for deterministic testing

**Returns**: `SearchResult` object

```typescript
interface SearchResult {
  secretDoorFound: boolean
  hiddenChestFound: boolean
  foundFeatures: string[]         // Descriptions of what was found
  searchedTile: Tile              // Updated tile with revealed features
}
```

**Example**:
```typescript
const thief = { class: 'Thief', intelligence: 14, piety: 12 }
const tile = {
  x: 5,
  y: 10,
  type: 'FLOOR',
  secretDoor: {
    hidden: true,
    direction: 'NORTH'
  }
}

const result = SearchService.attemptSearch(thief, tile, 12345)

if (result.secretDoorFound) {
  console.log('You found a secret door to the north!')
  // result.searchedTile.secretDoor.hidden = false
}
```

### getSearchableFeatures

Get list of searchable features on current tile.

**Signature**:
```typescript
function getSearchableFeatures(tile: Tile): SearchableFeature[]
```

**Parameters**:
- `tile`: Tile to analyze

**Returns**: Array of searchable features

```typescript
interface SearchableFeature {
  type: 'SECRET_DOOR' | 'HIDDEN_CHEST' | 'HIDDEN_TRAP'
  difficulty: number    // Base difficulty (1-10)
  hidden: boolean       // True if still hidden
}
```

**Example**:
```typescript
const tile = {
  secretDoor: { hidden: true, difficulty: 5 },
  treasure: { hidden: true, difficulty: 7 }
}

const features = SearchService.getSearchableFeatures(tile)
// [
//   { type: 'SECRET_DOOR', difficulty: 5, hidden: true },
//   { type: 'HIDDEN_CHEST', difficulty: 7, hidden: true }
// ]
```

### canSearch

Check if tile can be searched.

**Signature**:
```typescript
function canSearch(tile: Tile): boolean
```

**Parameters**:
- `tile`: Tile to check

**Returns**: `true` if searchable, `false` otherwise

**Searchable Tiles**:
- Floor tiles
- Corridor tiles
- Room tiles
- NOT walls (cannot search walls)
- NOT already fully searched

**Example**:
```typescript
const floorTile = { type: 'FLOOR' }
const canSearch1 = SearchService.canSearch(floorTile)
// true

const wallTile = { type: 'WALL' }
const canSearch2 = SearchService.canSearch(wallTile)
// false
```

### revealSecretDoor

Reveal a hidden secret door on tile.

**Signature**:
```typescript
function revealSecretDoor(
  tile: Tile,
  direction: Direction
): Tile
```

**Parameters**:
- `tile`: Tile containing secret door
- `direction`: Direction of secret door

**Returns**: Updated tile with door revealed

**Example**:
```typescript
const tile = {
  secretDoor: {
    hidden: true,
    direction: 'NORTH'
  }
}

const revealed = SearchService.revealSecretDoor(tile, 'NORTH')
// revealed.secretDoor.hidden = false
// Now visible on map and can be opened
```

### markTileSearched

Mark tile as searched to prevent repeated searches.

**Signature**:
```typescript
function markTileSearched(
  tile: Tile,
  character: Character
): Tile
```

**Parameters**:
- `tile`: Tile that was searched
- `character`: Character who searched

**Returns**: Updated tile with search record

**Example**:
```typescript
const tile = { x: 5, y: 10, searched: false }
const thief = { id: 'thief-1', class: 'Thief' }

const markedTile = SearchService.markTileSearched(tile, thief)
// markedTile.searched = true
// markedTile.searchedBy = 'thief-1'
```

## Implementation Details

### Search Chance Calculation

```typescript
export function calculateSearchChance(
  character: Character,
  searchType: SearchType
): number {
  // Base chance from perception
  const int = character.intelligence
  const pie = character.piety
  const baseChance = Math.floor((int + pie) / 2)

  // Class modifier
  let classModifier = 0
  if (character.class === 'Thief' || character.class === 'Ninja') {
    classModifier = 10
  } else if (character.class === 'Mage' || character.class === 'Bishop') {
    classModifier = 5
  }

  // Total chance (capped at 95%)
  return Math.min(95, baseChance + classModifier)
}
```

### Search Attempt Logic

```typescript
export function attemptSearch(
  character: Character,
  tile: Tile,
  randomSeed: number
): SearchResult {
  const result: SearchResult = {
    secretDoorFound: false,
    hiddenChestFound: false,
    foundFeatures: [],
    searchedTile: tile
  }

  // Cannot search non-searchable tiles
  if (!canSearch(tile)) {
    return result
  }

  // Search for secret door
  if (tile.secretDoor && tile.secretDoor.hidden) {
    const chance = calculateSearchChance(character, 'SECRET_DOOR')
    const roll = RandomService.roll(1, 100, randomSeed)

    if (roll <= chance) {
      result.secretDoorFound = true
      result.foundFeatures.push(
        `Secret door to the ${tile.secretDoor.direction}`
      )
      result.searchedTile = revealSecretDoor(
        tile,
        tile.secretDoor.direction
      )
    }
  }

  // Search for hidden chest
  if (tile.treasure && tile.treasure.hidden) {
    const chance = calculateSearchChance(character, 'HIDDEN_CHEST')
    const roll = RandomService.roll(1, 100, randomSeed + 1)

    if (roll <= chance) {
      result.hiddenChestFound = true
      result.foundFeatures.push('Hidden treasure chest')
      result.searchedTile.treasure.hidden = false
    }
  }

  // Mark tile as searched
  result.searchedTile = markTileSearched(result.searchedTile, character)

  return result
}
```

### Secret Door Types

```typescript
export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'

export interface SecretDoor {
  hidden: boolean
  direction: Direction
  difficulty: number    // 1-10 (affects search chance)
}
```

### Hidden Treasure

```typescript
export interface HiddenTreasure {
  hidden: boolean
  chest: Chest
  difficulty: number    // 1-10
}
```

## Search Mechanics

### Who Should Search?

**Best Searchers**:
1. **Thieves**: +10 bonus, best overall
2. **Ninjas**: +10 bonus, same as Thieves
3. **Mages/Bishops**: +5 bonus, high INT/PIE helps

**Poor Searchers**:
- **Fighters**: No bonus, low INT/PIE
- **Priests**: No bonus (despite high PIE, no class bonus)
- **Lords/Samurai**: No bonus, moderate stats

**Optimal Search Character**: Thief with INT 18, PIE 18
- Base: (18 + 18) / 2 = 18
- Class bonus: +10
- **Total: 28% search chance**

### When to Search

✅ **Always Search**:
- Dead ends (high chance of secret doors)
- Suspicious wall alignments
- After combat (for hidden treasure)
- Before resting (check for safety)

⚠️ **Sometimes Search**:
- Long corridors (low probability)
- Open rooms (unlikely to have secrets)

❌ **Never Search**:
- Already searched tiles (waste of time)
- In combat (cannot search during combat)
- While fleeing (no time)

### Search Limits

**One Search Per Tile**:
- Cannot search same tile multiple times
- Tile is marked as "searched"
- Prevents search spam

**Party vs. Individual**:
- Only one character searches at a time
- Best searcher should always search
- Other party members cannot retry

### Secret Door Placement

**Common Locations**:
- Dead ends
- Corner walls
- Behind decorative features
- Maze junctions

**Difficulty Levels**:
```typescript
Easy (1-3):     Main progression secrets
Medium (4-6):   Optional treasures
Hard (7-9):     Rare secrets, shortcuts
Extreme (10):   Easter eggs, ultimate secrets
```

### Hidden Treasure

**Chest Locations**:
- Floor tiles after combat
- Secret rooms
- Boss lairs
- Special event tiles

**Discovery**:
- Same mechanics as secret doors
- INT + PIE / 2 + class bonus
- Thieves have best chance

## Strategic Considerations

### Stat Priorities for Searchers

**For Thieves/Ninjas**:
1. **AGI** (for trap inspection/disarm)
2. **INT + PIE** (for searching)
3. **DEX** (for AC)

**For Mages**:
1. **INT** (for spells AND searching)
2. **PIE** (bonus to searching)
3. **VIT** (for HP)

### Search Frequency

**Search Every**:
- Dead end
- Suspicious wall
- After defeating boss
- Before camping

**Don't Bother Searching**:
- Middle of long corridor
- Open areas
- Known tiles (already searched)

### Time Management

Searching takes time (1 action):
- Cannot search and move in same turn
- Cannot search during combat
- Plan search actions carefully

### Secret Door Strategy

**Found a Secret Door**:
1. Mark on automap
2. Decide whether to open now or later
3. May lead to dangerous area
4. May be shortcut or treasure route

**Opened Secret Door**:
- May close behind you
- May be one-way
- Mark on map carefully

## Dependencies

Uses:
- `RandomService` (for search rolls)

No dependencies on combat or character services.

## Testing

**Test File**: `tests/services/SearchService.test.ts`

**Key Test Cases**:

1. **Search chance calculation**
   ```typescript
   test('Thief gets +10 bonus', () => {
     const thief = { class: 'Thief', intelligence: 12, piety: 10 }
     const chance = SearchService.calculateSearchChance(thief, 'SECRET_DOOR')
     expect(chance).toBe(21)  // (12+10)/2 + 10 = 21
   })

   test('Fighter has no bonus', () => {
     const fighter = { class: 'Fighter', intelligence: 12, piety: 10 }
     const chance = SearchService.calculateSearchChance(fighter, 'SECRET_DOOR')
     expect(chance).toBe(11)  // (12+10)/2 + 0 = 11
   })
   ```

2. **Search success**
   ```typescript
   test('finds secret door on successful roll', () => {
     jest.spyOn(RandomService, 'roll').mockReturnValue(20)

     const thief = { class: 'Thief', intelligence: 18, piety: 18 }
     const tile = {
       secretDoor: { hidden: true, direction: 'NORTH', difficulty: 5 }
     }

     const result = SearchService.attemptSearch(thief, tile, 0)
     expect(result.secretDoorFound).toBe(true)
     expect(result.searchedTile.secretDoor.hidden).toBe(false)
   })
   ```

3. **Searchable tiles**
   ```typescript
   test('cannot search walls', () => {
     const wallTile = { type: 'WALL' }
     expect(SearchService.canSearch(wallTile)).toBe(false)
   })

   test('can search floor tiles', () => {
     const floorTile = { type: 'FLOOR' }
     expect(SearchService.canSearch(floorTile)).toBe(true)
   })
   ```

## Related

**Services**:
- [TrapService](./TrapService.md) - Trap detection
- [DoorService](./DoorService.md) - Door opening
- [MapService](./MapService.md) - Map updates

**Commands**:
- [SearchCommand](../commands/SearchCommand.md) - Uses this service

**Research**:
- [Trap Mechanics Validation](../research/trap-mechanics-validation.md) - Search mechanics

**Game Design**:
- [Dungeon Exploration](../game-design/06-dungeon-exploration.md) - Search strategy
