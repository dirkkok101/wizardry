# DispellService

**Pure function service for dispelling undead enemies (Turn Undead mechanic).**

## Responsibility

Calculates dispell success probability and validates undead targets for the DISPELL combat action. This implements the classic "Turn Undead" mechanic where divine classes can instantly destroy undead enemies.

## API Reference

### isUndeadGroup

Check if enemy group consists of undead monsters.

**Signature**:
```typescript
function isUndeadGroup(group: EnemyGroup): boolean
```

**Parameters**:
- `group`: Enemy group to check

**Returns**: `true` if all monsters in group are undead type, `false` otherwise

**Example**:
```typescript
const zombieGroup = {
  name: 'Zombies',
  monsters: [
    { name: 'Zombie', type: 'UNDEAD', level: 1 },
    { name: 'Zombie', type: 'UNDEAD', level: 1 }
  ]
}

const isUndead = DispellService.isUndeadGroup(zombieGroup)
// isUndead === true

const orcGroup = {
  name: 'Orcs',
  monsters: [{ name: 'Orc', type: 'HUMANOID', level: 2 }]
}

const isOrcUndead = DispellService.isUndeadGroup(orcGroup)
// isOrcUndead === false
```

### calculateDispellChance

Calculate probability of successfully dispelling undead group.

**Signature**:
```typescript
function calculateDispellChance(
  casterLevel: number,
  undeadLevel: number
): number
```

**Parameters**:
- `casterLevel`: Level of Priest/Bishop/Lord attempting dispell
- `undeadLevel`: Average level of undead group being targeted

**Returns**: Success probability as percentage (5-95 range)

**Formula**:
```typescript
baseChance = (casterLevel - undeadLevel) × 10

// Clamp to 5% - 95% range
finalChance = Math.max(5, Math.min(95, baseChance))
```

**Example**:
```typescript
// Level 5 Priest vs Level 3 Zombies
const chance1 = DispellService.calculateDispellChance(5, 3)
// chance1 === 20 (20%)

// Level 10 Lord vs Level 5 Ghouls
const chance2 = DispellService.calculateDispellChance(10, 5)
// chance2 === 50 (50%)

// Level 8 Priest vs Level 12 Vampire
const chance3 = DispellService.calculateDispellChance(8, 12)
// chance3 === 5 (minimum 5%, undead is higher level)

// Level 20 Bishop vs Level 2 Zombies
const chance4 = DispellService.calculateDispellChance(20, 2)
// chance4 === 95 (maximum 95%, capped)
```

### attemptDispell

Attempt to dispell undead group using random roll.

**Signature**:
```typescript
function attemptDispell(
  casterLevel: number,
  undeadLevel: number,
  randomSeed: number
): boolean
```

**Parameters**:
- `casterLevel`: Level of divine caster
- `undeadLevel`: Average level of undead group
- `randomSeed`: Random seed for deterministic testing

**Returns**: `true` if dispell succeeds, `false` if it fails

**Example**:
```typescript
const casterLevel = 7
const undeadLevel = 4
const randomSeed = 12345

const success = DispellService.attemptDispell(
  casterLevel,
  undeadLevel,
  randomSeed
)

if (success) {
  console.log('Undead dispelled!')
} else {
  console.log('Dispell failed!')
}
```

### getUndeadTypes

Get list of all undead monster types.

**Signature**:
```typescript
function getUndeadTypes(): string[]
```

**Returns**: Array of undead monster names

**Example**:
```typescript
const undeadTypes = DispellService.getUndeadTypes()
// [
//   'Zombie',
//   'Ghoul',
//   'Creeping Coins',
//   'Gas Cloud',
//   'Spectre',
//   'Wraith',
//   'Vampire',
//   'Vampire Lord'
// ]
```

### getAverageGroupLevel

Calculate average level of monsters in a group.

**Signature**:
```typescript
function getAverageGroupLevel(group: EnemyGroup): number
```

**Parameters**:
- `group`: Enemy group to calculate average for

**Returns**: Average level rounded to nearest integer

**Example**:
```typescript
const mixedZombies = {
  name: 'Zombies',
  monsters: [
    { level: 1 },
    { level: 2 },
    { level: 1 },
    { level: 3 }
  ]
}

const avgLevel = DispellService.getAverageGroupLevel(mixedZombies)
// avgLevel === 2 (average of 1,2,1,3 = 1.75 → rounds to 2)
```

## Implementation Details

### Undead Type Detection

```typescript
export const UNDEAD_MONSTERS = [
  'Zombie',
  'Ghoul',
  'Creeping Coins',
  'Gas Cloud',
  'Spectre',
  'Wraith',
  'Vampire',
  'Vampire Lord'
] as const

export function isUndeadGroup(group: EnemyGroup): boolean {
  if (!group || group.monsters.length === 0) {
    return false
  }

  // All monsters in group must be undead
  return group.monsters.every(monster =>
    UNDEAD_MONSTERS.includes(monster.name) ||
    monster.type === 'UNDEAD'
  )
}
```

### Dispell Chance Calculation

```typescript
export function calculateDispellChance(
  casterLevel: number,
  undeadLevel: number
): number {
  // Base formula: (Caster - Undead) × 10%
  const baseChance = (casterLevel - undeadLevel) * 10

  // Clamp to 5% - 95% range
  // Never 0% (always a small chance)
  // Never 100% (always a small chance of failure)
  return Math.max(5, Math.min(95, baseChance))
}
```

### Dispell Attempt

```typescript
export function attemptDispell(
  casterLevel: number,
  undeadLevel: number,
  randomSeed: number
): boolean {
  const chance = calculateDispellChance(casterLevel, undeadLevel)

  // Generate random number 1-100
  const roll = RandomService.roll(1, 100, randomSeed)

  // Success if roll <= chance
  return roll <= chance
}
```

### Average Level Calculation

```typescript
export function getAverageGroupLevel(group: EnemyGroup): number {
  if (!group || group.monsters.length === 0) {
    return 0
  }

  const totalLevels = group.monsters.reduce(
    (sum, monster) => sum + monster.level,
    0
  )

  const average = totalLevels / group.monsters.length

  return Math.round(average)
}
```

## Undead Monster Reference

### Low-Level Undead (Easy to Dispel)

**Zombies** - Level 1-2
- Most common undead
- Easy to dispel for any divine class
- Typical chance: 50-90% at level 5+

**Creeping Coins** - Level 2-3
- Cursed treasure piles
- Moderately easy to dispel
- Typical chance: 40-80% at level 5+

### Mid-Level Undead (Moderate Difficulty)

**Ghouls** - Level 3-4
- Paralysis attack
- Moderate dispell difficulty
- Typical chance: 30-70% at level 7+

**Gas Cloud** - Level 4-5
- Incorporeal poison cloud
- Harder to dispel
- Typical chance: 20-60% at level 8+

### High-Level Undead (Hard to Dispel)

**Spectres** - Level 7-8
- Energy drain attack
- Hard to dispel
- Typical chance: 10-50% at level 10+

**Wraiths** - Level 8-9
- Powerful undead
- Very hard to dispel
- Typical chance: 5-40% at level 12+

### Boss Undead (Extremely Hard)

**Vampire** - Level 8-10
- Boss encounter
- Extremely hard to dispel
- Typical chance: 5-30% at level 13+

**Vampire Lord** - Level 10+
- Final boss companion
- Nearly impossible to dispel
- Typical chance: 5-10% at any level

## Dispell vs Combat

### Advantages of DISPELL

**Speed**: Instantly removes entire group (no damage calculation)
**Safety**: No counterattack from dispelled undead
**Certainty**: Either succeeds completely or fails completely

### Disadvantages of DISPELL

**No XP**: Dispelled undead award no experience points
**No Treasure**: Dispelled undead drop no items
**Undead Only**: Cannot use against living, demonic, or mechanical enemies
**Failure Wastes Turn**: Failed dispell = character does nothing this round
**Class Restricted**: Only Priest, Bishop, Lord can use

### Strategic Considerations

**When to use DISPELL**:
- Party is low on HP/spells
- Undead group is dangerous (Spectres with energy drain)
- Party wants to avoid combat quickly
- XP/treasure not needed (high-level party)

**When NOT to use DISPELL**:
- Party needs XP for leveling
- Party needs treasure/gold
- Success chance is very low (< 20%)
- Undead are weak (better to attack for XP)

## Dependencies

Uses:
- `RandomService` (for dispell roll)

No dependencies on other combat services (pure calculation).

## Testing

**Test File**: `tests/services/DispellService.test.ts`

**Key Test Cases**:

1. **Undead detection**
   ```typescript
   test('isUndeadGroup returns true for all undead', () => {
     const zombies = createEnemyGroup([
       { name: 'Zombie', type: 'UNDEAD' }
     ])

     expect(DispellService.isUndeadGroup(zombies)).toBe(true)
   })

   test('isUndeadGroup returns false for living enemies', () => {
     const orcs = createEnemyGroup([
       { name: 'Orc', type: 'HUMANOID' }
     ])

     expect(DispellService.isUndeadGroup(orcs)).toBe(false)
   })
   ```

2. **Dispell chance calculation**
   ```typescript
   test('calculateDispellChance uses level difference × 10', () => {
     expect(DispellService.calculateDispellChance(10, 5)).toBe(50)
     expect(DispellService.calculateDispellChance(7, 3)).toBe(40)
     expect(DispellService.calculateDispellChance(5, 8)).toBe(5) // Minimum
   })

   test('calculateDispellChance clamps to 5-95 range', () => {
     expect(DispellService.calculateDispellChance(20, 1)).toBe(95) // Max
     expect(DispellService.calculateDispellChance(1, 20)).toBe(5)  // Min
   })
   ```

3. **Average level calculation**
   ```typescript
   test('getAverageGroupLevel calculates correctly', () => {
     const group = createEnemyGroup([
       { level: 1 },
       { level: 3 },
       { level: 2 }
     ])

     expect(DispellService.getAverageGroupLevel(group)).toBe(2)
   })
   ```

4. **Dispell attempt with deterministic RNG**
   ```typescript
   test('attemptDispell succeeds when roll <= chance', () => {
     // Mock RandomService to return specific values
     jest.spyOn(RandomService, 'roll').mockReturnValue(30)

     // 50% chance, roll 30 = success
     const success = DispellService.attemptDispell(10, 5, 0)
     expect(success).toBe(true)
   })

   test('attemptDispell fails when roll > chance', () => {
     jest.spyOn(RandomService, 'roll').mockReturnValue(70)

     // 50% chance, roll 70 = failure
     const success = DispellService.attemptDispell(10, 5, 0)
     expect(success).toBe(false)
   })
   ```

## Related

**Commands**:
- [DispellCommand](../commands/DispellCommand.md) - Uses this service

**Systems**:
- [Combat System](../systems/combat-system.md) - Combat overview

**Research**:
- [Combat Actions Validation](../research/combat-actions-validation.md) - Original game mechanics
- [Monster Reference](../research/monster-reference.md) - All undead monster types
- [Combat Formulas](../research/combat-formulas.md) - Dispell formula validation
