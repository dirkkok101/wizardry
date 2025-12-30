# CharacterCreationService

**Pure function service for character creation flow and validation.**

## Responsibility

Manages character creation process including bonus point rolling, stat allocation, race selection, alignment selection, and class eligibility. Validates creation parameters and generates new characters.

## API Reference

### rollBonusPoints

Roll bonus points for stat allocation.

**Signature**:
```typescript
function rollBonusPoints(): number
```

**Returns**: Bonus points (7-29 range)

**Formula**:
```
Roll = 1d4 + 6 (yields 7-10)
If Roll < 20 and random(1-11) == 1: Roll += 10
If Roll < 20 and random(1-11) == 1: Roll += 10
```

**Distribution**:
- 7-10 points: 90.0%
- 17-20 points: 9.25%
- 27-29 points: 0.75%

**Example**:
```typescript
const bonusPoints = CharacterCreationService.rollBonusPoints()
// bonusPoints = 7-29 (most likely 7-10)
```

### allocateStats

Allocate bonus points to stats.

**Signature**:
```typescript
function allocateStats(
  race: Race,
  bonusPoints: number,
  allocation: StatAllocation
): Stats
```

**Parameters**:
- `race`: Character race (determines base stats)
- `bonusPoints`: Available bonus points
- `allocation`: Points to allocate per stat

**Returns**: Final stats after allocation

**Throws**:
- `InsufficientPointsError` if allocation exceeds bonus points
- `InvalidAllocationError` if allocation negative

**Example**:
```typescript
const stats = CharacterCreationService.allocateStats(
  'HUMAN',
  10,
  { str: 3, int: 2, pie: 0, vit: 2, agi: 2, luc: 1 }
)
// stats: { str: 11, int: 10, pie: 5, vit: 10, agi: 10, luc: 10 }
// (Human base + allocation)
```

### getEligibleClasses

Get classes character can become with stats.

**Signature**:
```typescript
function getEligibleClasses(
  stats: Stats,
  alignment: Alignment
): CharacterClass[]
```

**Parameters**:
- `stats`: Character stats
- `alignment`: Character alignment

**Returns**: Array of eligible classes

**Example**:
```typescript
const classes = CharacterCreationService.getEligibleClasses(
  { str: 15, int: 12, pie: 12, vit: 15, agi: 14, luc: 15 },
  'GOOD'
)
// classes: ['FIGHTER', 'MAGE', 'PRIEST', 'BISHOP', 'SAMURAI', 'LORD']
```

### validateCreation

Validate character creation parameters.

**Signature**:
```typescript
function validateCreation(params: CharacterCreationParams): ValidationResult
```

**Parameters**:
- `params`: All character creation parameters

**Returns**: Validation result with errors (if any)

**Checks**:
- Name not empty
- Stats meet class requirements
- Alignment compatible with class
- Bonus points properly allocated

**Example**:
```typescript
const result = CharacterCreationService.validateCreation({
  name: "Gandalf",
  race: "ELF",
  class: "MAGE",
  stats: { str: 7, int: 15, pie: 10, vit: 6, agi: 9, luc: 6 },
  alignment: "GOOD",
  bonusPoints: 10
})
// result.valid === true
```

### generateStartingAge

Generate random starting age.

**Signature**:
```typescript
function generateStartingAge(): number
```

**Returns**: Starting age (14-16 years)

**Formula**: `14 + random(0-2)`

**Example**:
```typescript
const age = CharacterCreationService.generateStartingAge()
// age = 14, 15, or 16
```

### createNewCharacter

Create complete character from parameters.

**Signature**:
```typescript
function createNewCharacter(params: CharacterCreationParams): Character
```

**Parameters**:
- `params`: Complete character creation parameters

**Returns**: New character entity

**Throws**:
- Validation errors if parameters invalid

**Example**:
```typescript
const character = CharacterCreationService.createNewCharacter({
  name: "Conan",
  race: "HUMAN",
  class: "FIGHTER",
  stats: { str: 16, int: 8, pie: 5, vit: 15, agi: 10, luc: 9 },
  alignment: "NEUTRAL",
  bonusPoints: 12
})
```

### getClassRequirements

Get stat requirements for class.

**Signature**:
```typescript
function getClassRequirements(characterClass: CharacterClass): ClassRequirements
```

**Parameters**:
- `characterClass`: Class to check

**Returns**: Requirements object with stat minimums and alignment restrictions

**Example**:
```typescript
const reqs = CharacterCreationService.getClassRequirements('LORD')
// reqs: {
//   str: 15, int: 12, pie: 12, vit: 15, agi: 14, luc: 15,
//   alignment: ['GOOD']
// }
```

### getRaceBaseStats

Get base stats for race.

**Signature**:
```typescript
function getRaceBaseStats(race: Race): Stats
```

**Parameters**:
- `race`: Race identifier

**Returns**: Base stats before bonus allocation

**Example**:
```typescript
const base = CharacterCreationService.getRaceBaseStats('HOBBIT')
// base: { str: 5, int: 7, pie: 7, vit: 6, agi: 10, luc: 15 }
```

### canBecomeEliteClass

Check if stats allow elite class.

**Signature**:
```typescript
function canBecomeEliteClass(
  stats: Stats,
  alignment: Alignment,
  targetClass: 'BISHOP' | 'SAMURAI' | 'LORD' | 'NINJA'
): boolean
```

**Parameters**:
- `stats`: Character stats
- `alignment`: Character alignment
- `targetClass`: Elite class to check

**Returns**: True if requirements met

**Example**:
```typescript
const canBeNinja = CharacterCreationService.canBecomeEliteClass(
  { str: 17, int: 17, pie: 17, vit: 17, agi: 17, luc: 17 },
  'EVIL',
  'NINJA'
)
// canBeNinja === true (all stats 17, evil alignment)
```

### getRemainingPoints

Calculate remaining bonus points after allocation.

**Signature**:
```typescript
function getRemainingPoints(
  bonusPoints: number,
  allocation: StatAllocation
): number
```

**Parameters**:
- `bonusPoints`: Total bonus points
- `allocation`: Current allocation

**Returns**: Remaining unallocated points

**Example**:
```typescript
const remaining = CharacterCreationService.getRemainingPoints(
  12,
  { str: 3, int: 2, pie: 0, vit: 2, agi: 2, luc: 1 }
)
// remaining === 2 (12 - 10 allocated)
```

### getOptimalRaceForClass

Get best race(s) for target class.

**Signature**:
```typescript
function getOptimalRaceForClass(targetClass: CharacterClass): Race[]
```

**Parameters**:
- `targetClass`: Target class

**Returns**: Array of optimal races (sorted by stat efficiency)

**Example**:
```typescript
const races = CharacterCreationService.getOptimalRaceForClass('LORD')
// races: ['HOBBIT', 'GNOME'] (Hobbit has LUC 15, critical for Lord)
```

## Dependencies

Uses:
- `CharacterService` - Character creation and class validation
- `RandomService` - RNG for bonus rolls and age
- `class-reference.json` - Class requirements
- `race-stats.json` - Race base stats

## Testing

See [CharacterCreationService.test.ts](../../tests/services/CharacterCreationService.test.ts)

**Key test cases**:
- Bonus point roll distribution (validate 90%/9.25%/0.75%)
- Stat allocation with various races
- Class eligibility with stats
- Validation of creation parameters
- Starting age range (14-16)
- Elite class creation (all 4 elite classes)
- Ninja creation (requires 27-29 bonus points)
- Lord creation with Hobbit (optimal race)
- Remaining points calculation

## Related

- [Character Creation System](../systems/character-creation-system.md) - System overview
- [Class Reference](../research/class-reference.md) - All class requirements
- [Race Reference](../research/race-stats.md) - All race base stats
- [CreateCharacterCommand](../commands/CreateCharacterCommand.md) - Uses this service
- [Game Design: Character Creation](../game-design/02-character-creation.md) - Player guide
