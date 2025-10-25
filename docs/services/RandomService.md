# RandomService

**Pure function service for random number generation with seed support.**

## Responsibility

Provides deterministic random number generation with seeding support for testing, replay, and procedural generation.

## API Reference

### random

Generate random integer in range.

**Signature**:
```typescript
function random(min: number, max: number): number
```

**Parameters**:
- `min`: Minimum value (inclusive)
- `max`: Maximum value (inclusive)

**Returns**: Random integer in range [min, max]

**Example**:
```typescript
const roll = RandomService.random(1, 6)
// roll = 1-6 (d6 roll)
```

### rollDice

Roll dice with standard notation.

**Signature**:
```typescript
function rollDice(notation: string): number
```

**Parameters**:
- `notation`: Dice notation (e.g. "1d6", "2d8+3", "4d6")

**Returns**: Total rolled value

**Example**:
```typescript
const damage = RandomService.rollDice("2d8+3")
// damage = 2d8 + 3 = 5-19 damage
```

### rollMultipleDice

Roll multiple dice and return individual results.

**Signature**:
```typescript
function rollMultipleDice(count: number, sides: number): number[]
```

**Parameters**:
- `count`: Number of dice to roll
- `sides`: Sides per die

**Returns**: Array of individual die results

**Example**:
```typescript
const rolls = RandomService.rollMultipleDice(3, 6)
// rolls = [4, 2, 6] (three d6 rolls)
```

### chance

Test random chance (percentage).

**Signature**:
```typescript
function chance(percentage: number): boolean
```

**Parameters**:
- `percentage`: Success chance (0-100)

**Returns**: True if success, false if failure

**Example**:
```typescript
const success = RandomService.chance(50)
// success = true or false (50% chance)
```

### setSeed

Set random seed for deterministic generation.

**Signature**:
```typescript
function setSeed(seed: number): void
```

**Parameters**:
- `seed`: Seed value for RNG

**Returns**: void (modifies internal state)

**Example**:
```typescript
RandomService.setSeed(12345)
// All subsequent random calls will be deterministic
```

### getSeed

Get current random seed.

**Signature**:
```typescript
function getSeed(): number | null
```

**Returns**: Current seed or null if unseeded

**Example**:
```typescript
const seed = RandomService.getSeed()
// seed = 12345 (if set) or null (if using Math.random())
```

### resetSeed

Reset to unseeded random generation.

**Signature**:
```typescript
function resetSeed(): void
```

**Returns**: void (resets to Math.random())

**Example**:
```typescript
RandomService.resetSeed()
// Now using true random (Math.random())
```

### shuffle

Shuffle array randomly (Fisher-Yates algorithm).

**Signature**:
```typescript
function shuffle<T>(array: T[]): T[]
```

**Parameters**:
- `array`: Array to shuffle

**Returns**: New shuffled array (original unchanged)

**Example**:
```typescript
const shuffled = RandomService.shuffle([1, 2, 3, 4, 5])
// shuffled = [3, 1, 5, 2, 4] (random order)
```

### pickRandom

Pick random element from array.

**Signature**:
```typescript
function pickRandom<T>(array: T[]): T
```

**Parameters**:
- `array`: Array to pick from

**Returns**: Random element

**Throws**:
- `EmptyArrayError` if array is empty

**Example**:
```typescript
const monster = RandomService.pickRandom(["orc", "kobold", "zombie"])
// monster = "orc" (randomly selected)
```

### weightedRandom

Pick random element with weights.

**Signature**:
```typescript
function weightedRandom<T>(
  items: T[],
  weights: number[]
): T
```

**Parameters**:
- `items`: Array of items to choose from
- `weights`: Corresponding weights (higher = more likely)

**Returns**: Randomly selected item based on weights

**Throws**:
- `MismatchedArrayLengthError` if items.length !== weights.length

**Example**:
```typescript
const item = RandomService.weightedRandom(
  ["common", "uncommon", "rare"],
  [70, 25, 5]  // 70% common, 25% uncommon, 5% rare
)
// item = "common" (most likely)
```

### randomRange

Generate random float in range.

**Signature**:
```typescript
function randomRange(min: number, max: number): number
```

**Parameters**:
- `min`: Minimum value (inclusive)
- `max`: Maximum value (inclusive)

**Returns**: Random float in range

**Example**:
```typescript
const value = RandomService.randomRange(0.5, 1.5)
// value = 0.5-1.5 (float)
```

### gaussianRandom

Generate random number with gaussian/normal distribution.

**Signature**:
```typescript
function gaussianRandom(mean: number, stdDev: number): number
```

**Parameters**:
- `mean`: Mean value (center of distribution)
- `stdDev`: Standard deviation (spread)

**Returns**: Random value following normal distribution

**Example**:
```typescript
const value = RandomService.gaussianRandom(10, 2)
// value = ~10 with bell curve distribution (±2 std dev)
```

## Seeded RNG Algorithm

Uses **Mulberry32** PRNG algorithm:

```typescript
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
```

**Properties**:
- Fast (single multiplication)
- Good distribution
- Deterministic (same seed = same sequence)
- Period > 2^32

## Use Cases

### Testing
```typescript
// Set seed for reproducible tests
RandomService.setSeed(12345)
const roll1 = RandomService.rollDice("1d20")  // Always 14
const roll2 = RandomService.rollDice("1d20")  // Always 7
```

### Procedural Generation
```typescript
// Use level number as seed for consistent dungeon layout
RandomService.setSeed(levelNumber)
const encounters = generateEncounters()  // Same for same level
```

### Replay System
```typescript
// Store seed with event log
const seed = Date.now()
RandomService.setSeed(seed)
// Replay with same seed produces identical results
```

### Production (True Random)
```typescript
// No seed = uses Math.random()
RandomService.resetSeed()
const combat = rollInitiative()  // True random
```

## Dice Notation Parser

Supports standard dice notation:

- `1d6` - Single d6
- `2d8` - Two d8
- `1d20+5` - d20 with +5 modifier
- `3d6-2` - Three d6 with -2 modifier
- `4d6` - Four d6 (for ability scores)

Invalid notation throws `InvalidDiceNotationError`.

## Dependencies

Uses:
- No external dependencies (pure math)

## Testing

See [RandomService.test.ts](../../tests/services/RandomService.test.ts)

**Key test cases**:
- Random values within specified range
- Dice notation parser handles all formats
- Seeded RNG produces identical sequences
- Reset seed returns to true random
- Shuffle produces different order
- Weighted random respects probability distribution
- Chance returns true at correct percentage
- Gaussian random follows normal distribution

## Related

- [FormulaService](./FormulaService.md) - Uses RandomService for dice rolls
- [CombatService](./CombatService.md) - Uses for combat randomness
- [EncounterService](./EncounterService.md) - Uses for encounter generation
- [ReplayService](./ReplayService.md) - Uses seed for deterministic replay
- [Event Sourcing](../systems/event-sourcing.md) - Seed storage in events
