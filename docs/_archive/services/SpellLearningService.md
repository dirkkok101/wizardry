# SpellLearningService

**Pure function service for spell learning and spell point allocation.**

## Responsibility

Manages spell learning on level-up, calculates learn chances based on INT/PIE, and allocates spell point pools.

## API Reference

### attemptLearnSpell

Attempt to learn a single spell on level-up.

**Signature**:
```typescript
function attemptLearnSpell(
  character: Character,
  spell: Spell
): { learned: boolean; character: Character }
```

**Parameters**:
- `character`: Character attempting to learn spell
- `spell`: Spell to learn

**Returns**: Learn result and updated character (if learned)

**Formula**:
```typescript
LearnChance = (INT or PIE) / 30

// For mage spells: use INT
// For priest spells: use PIE
// IQ 18 = 60% per eligible Mage spell
// Piety 15 = 50% per eligible Priest spell
```

**IMPORTANT**: The **first spell of each circle is always GUARANTEED** when you gain access to that spell level—no roll required.

**Example**:
```typescript
const mage = createCharacter({
  class: 'Mage',
  level: 3,
  stats: { int: 15 },
  spellBook: new Set(['dumapic', 'halito'])
})
const katino = getSpell('katino')  // Level 1 mage spell

const result = SpellLearningService.attemptLearnSpell(mage, katino)
// Learn chance: 15 / 30 = 50%
// result.learned = true or false (50/50)
// If learned: result.character.spellBook includes 'katino'
```

### learnSpellsOnLevelUp

Attempt to learn all available spells on level-up.

**Signature**:
```typescript
function learnSpellsOnLevelUp(
  character: Character,
  newLevel: number
): Character
```

**Parameters**:
- `character`: Character leveling up
- `newLevel`: New character level

**Returns**: Character with newly learned spells added to spell book

**Notes**: Attempts to learn all unlearned spells character can access at new level

**Example**:
```typescript
const mage = createCharacter({
  class: 'Mage',
  level: 2,
  stats: { int: 15 },
  spellBook: new Set(['dumapic', 'halito'])  // Only 2 L1 spells
})

const leveled = SpellLearningService.learnSpellsOnLevelUp(mage, 3)
// Attempts to learn remaining L1 spells: KATINO, MOGREF
// Attempts to learn L2 spells: DILTO, MELITO, SOPIC
// Each with 50% chance (INT 15 / 30)
// leveled.spellBook may include some/all of these
```

### calculateLearnChance

Calculate spell learning chance.

**Signature**:
```typescript
function calculateLearnChance(
  character: Character,
  spell: Spell
): number
```

**Parameters**:
- `character`: Character learning spell
- `spell`: Spell to calculate chance for

**Returns**: Learn chance percentage (0-60%)

**Examples**:
```typescript
const mage = createCharacter({ stats: { int: 11 } })
const chance1 = SpellLearningService.calculateLearnChance(mage, mageSpell)
// Result: 11 / 30 = 36.7%

const smartMage = createCharacter({ stats: { int: 18 } })
const chance2 = SpellLearningService.calculateLearnChance(smartMage, mageSpell)
// Result: 18 / 30 = 60.0%

const priest = createCharacter({ stats: { pie: 15 } })
const chance3 = SpellLearningService.calculateLearnChance(priest, priestSpell)
// Result: 15 / 30 = 50.0%
```

### getAccessibleSpellLevels

Get spell levels character can access at current level.

**Signature**:
```typescript
function getAccessibleSpellLevels(
  characterClass: Class,
  level: number
): number[]
```

**Parameters**:
- `characterClass`: Character's class
- `level`: Character's level

**Returns**: Array of spell levels accessible (1-7)

**Spell Level Access by Class Level**:

| Spell Level | Mage/Priest | Bishop (Mage) | Bishop (Priest) | Samurai | Lord |
|------------|-------------|---------------|-----------------|---------|------|
| 1 | Level 1 | Level 1 | Level 4 | Level 4 | Level 4 |
| 2 | Level 1 | Level 5 | Level 8 | Level 7 | Level 6 |
| 3 | Level 3 | Level 9 | Level 12 | Level 10 | Level 8 |
| 4 | Level 5 | Level 13 | Level 16 | Level 13 | Level 10 |
| 5 | Level 7 | Level 17 | Level 20 | Level 16 | Level 12 |
| 6 | Level 9 | Level 21 | Level 24 | Level 19 | Level 14 |
| 7 | Level 11 | Level 25 | Level 28 | Level 22 | Level 16 |

**Note**: Lords reach 7th-level Priest spells at level 16—significantly faster than Samurai reach 7th-level Mage spells at level 22.

**Example**:
```typescript
const levels1 = SpellLearningService.getAccessibleSpellLevels('Mage', 1)
// Result: [1] (Level 1 spells only)

const levels5 = SpellLearningService.getAccessibleSpellLevels('Mage', 5)
// Result: [1, 2, 3] (Levels 1-3 spells)

const lordLevels = SpellLearningService.getAccessibleSpellLevels('Lord', 20)
// Result: [1, 2, 3, 4, 5, 6] (no Level 7 for Lord)
```

### allocateSpellPoints

Allocate spell points for all spell levels.

**Signature**:
```typescript
function allocateSpellPoints(character: Character): Character
```

**Parameters**:
- `character`: Character to allocate points for

**Returns**: Character with updated spell point pools

**Formula** (complex, needs research):
```typescript
SpellPointsForLevel[circle] = max(
  learned,  // If already learned at least 1 spell this level
  1 + first_level - current_level,  // Based on when first learned
  cap at 9 maximum  // Hard cap
)
```

**Example**:
```typescript
const mage = createCharacter({
  class: 'Mage',
  level: 5,
  spellBook: new Set(['dumapic', 'halito', 'katino', 'dilto', 'melito'])
})

const withPoints = SpellLearningService.allocateSpellPoints(mage)
// withPoints.mageSpellPoints might be:
// Map { 1 → 3, 2 → 2, 3 → 1 }
// (3 L1 points, 2 L2 points, 1 L3 point)
```

### getBishopLearnPenalty

Calculate Bishop spell learning penalty.

**Signature**:
```typescript
function getBishopLearnPenalty(): number
```

**Returns**: Learn chance penalty for Bishops

**Notes**: Bishops learn both mage and priest spells but at reduced rate

**Example**:
```typescript
const penalty = SpellLearningService.getBishopLearnPenalty()
// Result: 0.5 (50% slower learning, needs confirmation)

const bishop = createCharacter({ class: 'Bishop', stats: { int: 18, pie: 18 } })
const baseChance = 18 / 30  // 60%
const actualChance = baseChance * penalty  // 30%
```

### getUnlearnedSpells

Get spells character hasn't learned yet but could learn.

**Signature**:
```typescript
function getUnlearnedSpells(
  character: Character,
  spellLevel: number,
  spellType: 'mage' | 'priest'
): Spell[]
```

**Parameters**:
- `character`: Character to check
- `spellLevel`: Spell level to check (1-7)
- `spellType`: Mage or priest spells

**Returns**: Array of unlearned spells at that level

**Example**:
```typescript
const mage = createCharacter({
  spellBook: new Set(['dumapic', 'halito'])  // Only 2 L1 spells
})

const unlearned = SpellLearningService.getUnlearnedSpells(mage, 1, 'mage')
// Result: [KATINO, MOGREF] (remaining L1 mage spells)
```

## Dependencies

Uses:
- `RandomService` (learn chance rolls)
- `ValidationService` (validate class can learn spell type)

## Testing

See [SpellLearningService.test.ts](../../tests/services/SpellLearningService.test.ts)

**Key test cases**:
- INT 15 mage has 50% learn chance
- PIE 15 priest has 50% learn chance
- INT 18 has 60% learn chance (max)
- **First spell of each circle is GUARANTEED (no roll)**
- Level-up attempts all accessible spells
- Bishops learn both mage and priest spells
- **Samurai reach L7 at level 22, Lord reach L7 at level 16**
- Spell point allocation increases with level
- Unlearned spells excludes spell book
- Learn chance uses INT for mage, PIE for priest
- **Class-changed characters retain spell learning eligibility for circles they know at least one spell in**

## Related

- [Spell Reference](../research/spell-reference.md) - All spells
- [Combat Formulas](../research/combat-formulas.md) - Learn chance formula
- [Spell System](../systems/spell-system.md) - Spell system overview
- [LevelUpCharacterCommand](../commands/LevelUpCharacterCommand.md) - Uses this service
- [SpellCastingService](./SpellCastingService.md) - Casting learned spells
