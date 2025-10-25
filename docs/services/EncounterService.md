# EncounterService

**Pure function service for random encounter generation and fixed encounter management.**

## Responsibility

Manages random encounter probability, generates monster groups, handles fixed encounters (Murphy's Ghosts, Level 10 guardians), and determines encounter composition based on dungeon level.

## API Reference

### checkForEncounter

Check if a random encounter occurs on current tile.

**Signature**:
```typescript
function checkForEncounter(
  level: number,
  position: Position,
  encounterRate: number
): boolean
```

**Parameters**:
- `level`: Current dungeon level (1-10)
- `position`: Current position
- `encounterRate`: Base encounter rate per step (0.0-1.0)

**Returns**: `true` if encounter triggered, `false` otherwise

**Example**:
```typescript
const encounter = EncounterService.checkForEncounter(1, { x: 5, y: 10 }, 0.1)
// encounter === true (10% chance per step)
```

### generateEncounter

Generate random monster encounter for current level.

**Signature**:
```typescript
function generateEncounter(
  level: number,
  monsterData: MonsterData
): Encounter
```

**Parameters**:
- `level`: Current dungeon level (1-10)
- `monsterData`: Monster database

**Returns**: Encounter with 1-4 monster groups

**Throws**:
- `InvalidLevelError` if level < 1 or level > 10

**Example**:
```typescript
const encounter = EncounterService.generateEncounter(1, monsterData)
// encounter = {
//   groups: [
//     { monsterId: "orc", count: 4 },
//     { monsterId: "kobold", count: 3 }
//   ]
// }
```

### getFixedEncounter

Get fixed encounter at specific location (if any).

**Signature**:
```typescript
function getFixedEncounter(
  level: number,
  position: Position
): FixedEncounter | null
```

**Parameters**:
- `level`: Dungeon level
- `position`: Tile coordinates

**Returns**: Fixed encounter definition, or `null` if no fixed encounter

**Example**:
```typescript
// Murphy's Ghosts at Level 1, (13E, 5N)
const fixed = EncounterService.getFixedEncounter(1, { x: 13, y: 5 })
// fixed = {
//   id: "murphys_ghosts",
//   groups: [{ monsterId: "murphys_ghost", count: 1 }],
//   repeatable: true,
//   cannotFlee: true
// }

// No fixed encounter at random location
const none = EncounterService.getFixedEncounter(1, { x: 5, y: 10 })
// none === null
```

### generateMonsterGroup

Generate a single monster group.

**Signature**:
```typescript
function generateMonsterGroup(
  level: number,
  monsterData: MonsterData
): MonsterGroup
```

**Parameters**:
- `level`: Dungeon level (determines monster pool)
- `monsterData`: Monster database

**Returns**: Monster group with random count

**Example**:
```typescript
const group = EncounterService.generateMonsterGroup(1, monsterData)
// group = { monsterId: "orc", count: 5 } (3-6 orcs appear)
```

### getEncounterDifficulty

Calculate encounter difficulty rating.

**Signature**:
```typescript
function getEncounterDifficulty(
  encounter: Encounter,
  monsterData: MonsterData
): number
```

**Parameters**:
- `encounter`: Encounter to evaluate
- `monsterData`: Monster database (for XP/HP)

**Returns**: Difficulty rating (sum of monster XP × count)

**Example**:
```typescript
const difficulty = EncounterService.getEncounterDifficulty(encounter, monsterData)
// difficulty = 2400 (4 orcs @ 235 XP each = 940, + 3 kobolds @ 415 XP each = 1245)
```

### shouldEncounterOccur

Check if encounter should occur based on level-specific rates.

**Signature**:
```typescript
function shouldEncounterOccur(
  level: number,
  stepsWithoutEncounter: number
): boolean
```

**Parameters**:
- `level`: Current level
- `stepsWithoutEncounter`: Steps taken since last encounter

**Returns**: `true` if encounter triggered

**Example**:
```typescript
// Level 1: low encounter rate
const occur1 = EncounterService.shouldEncounterOccur(1, 10)
// occur1 === false (10 steps not enough)

// Level 10: high encounter rate
const occur10 = EncounterService.shouldEncounterOccur(10, 3)
// occur10 === true (3 steps likely triggers)
```

### getMonsterPoolForLevel

Get available monsters for specific level.

**Signature**:
```typescript
function getMonsterPoolForLevel(
  level: number,
  monsterData: MonsterData
): Monster[]
```

**Parameters**:
- `level`: Dungeon level
- `monsterData`: Monster database

**Returns**: Array of monsters that can appear on this level

**Example**:
```typescript
const pool = EncounterService.getMonsterPoolForLevel(1, monsterData)
// pool = [Orc, Kobold, Bubbly Slime, Zombie, etc.] (Level 1 monsters only)

const pool10 = EncounterService.getMonsterPoolForLevel(10, monsterData)
// pool10 = [Vampire, Greater Demon, Werdna, etc.] (Level 10 bosses)
```

### isSpecialEncounterLocation

Check if position is a special encounter location.

**Signature**:
```typescript
function isSpecialEncounterLocation(
  level: number,
  position: Position
): boolean
```

**Parameters**:
- `level`: Dungeon level
- `position`: Tile coordinates

**Returns**: `true` if position has fixed encounter

**Example**:
```typescript
const isSpecial = EncounterService.isSpecialEncounterLocation(1, { x: 13, y: 5 })
// isSpecial === true (Murphy's Ghosts location)
```

## Dependencies

Uses:
- `MonsterService` (load monster data)
- `RandomService` (RNG for encounter rolls)
- `ValidationService` (validate levels)

## Testing

See [EncounterService.test.ts](../../tests/services/EncounterService.test.ts)

**Key test cases**:
- Check for encounter with various rates
- Generate encounter for Level 1 (easy monsters)
- Generate encounter for Level 10 (hard monsters)
- Get fixed encounter at Murphy's Ghosts location
- Get fixed encounter at non-special location (returns null)
- Generate monster group (count within range)
- Calculate encounter difficulty
- Should encounter occur based on steps
- Get monster pool for each level (1-10)
- Special encounter location detection
- Invalid level throws error

## Related

- [MonsterService](./MonsterService.md) - Provides monster data
- [CombatService](./CombatService.md) - Uses encounters for combat
- [RandomService](./RandomService.md) - RNG for encounter rolls
- [Monster Reference](../research/monster-reference.md) - All 96 monsters
- [Dungeon Maps Reference](../research/dungeon-maps-reference.md) - Fixed encounter locations
