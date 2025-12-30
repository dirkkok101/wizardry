# SpellService

**Pure function service for spell casting, spell points management, and spell learning.**

## Responsibility

Manages spell point pools per level (1-7), validates spell casting, handles spell point restoration, and manages spell learning on level-up. Separate pools for Mage and Priest spells.

## API Reference

### castSpell

Cast a spell, deducting spell points.

**Signature**:
```typescript
function castSpell(
  character: Character,
  spellId: string,
  targets: Combatant[]
): SpellCastResult
```

**Parameters**:
- `character`: Caster character
- `spellId`: Spell identifier (e.g., "HALITO", "DIOS")
- `targets`: Array of targets for spell effect

**Returns**: Spell cast result with effects and updated character

**Throws**:
- `SpellNotLearnedError` if character doesn't know spell
- `InsufficientSpellPointsError` if no points remaining for spell level
- `InvalidTargetError` if targets invalid for spell type

**Example**:
```typescript
const result = SpellService.castSpell(
  mage,
  "HALITO",
  [orcGroup]
)
// result.success === true
// result.damage === 6 (1d8)
// result.character.mageSpellPoints.get(1) === previous - 1
```

### hasSpellPoints

Check if character has spell points for spell level.

**Signature**:
```typescript
function hasSpellPoints(
  character: Character,
  spellLevel: number,
  spellType: 'MAGE' | 'PRIEST'
): boolean
```

**Parameters**:
- `character`: Character to check
- `spellLevel`: Spell level (1-7)
- `spellType`: Mage or Priest spell

**Returns**: True if character has ≥1 point for that level

**Example**:
```typescript
if (SpellService.hasSpellPoints(mage, 3, 'MAGE')) {
  // Can cast level 3 mage spell
}
```

### deductSpellPoints

Deduct 1 spell point from appropriate pool.

**Signature**:
```typescript
function deductSpellPoints(
  character: Character,
  spellLevel: number,
  spellType: 'MAGE' | 'PRIEST'
): Character
```

**Parameters**:
- `character`: Character casting spell
- `spellLevel`: Spell level (1-7)
- `spellType`: Mage or Priest spell

**Returns**: New character with spell points deducted

**Throws**:
- `InsufficientSpellPointsError` if no points available

**Example**:
```typescript
const updated = SpellService.deductSpellPoints(mage, 1, 'MAGE')
// updated.mageSpellPoints.get(1) === previous - 1
```

### restoreSpellPoints

Restore all spell points (used after inn rest).

**Signature**:
```typescript
function restoreSpellPoints(character: Character): Character
```

**Parameters**:
- `character`: Character to restore

**Returns**: New character with full spell points

**Example**:
```typescript
const restored = SpellService.restoreSpellPoints(mage)
// All spell point pools restored to maximum
```

### learnSpell

Attempt to learn spell on level-up.

**Signature**:
```typescript
function learnSpell(
  character: Character,
  spellId: string
): LearnSpellResult
```

**Parameters**:
- `character`: Character attempting to learn
- `spellId`: Spell to learn

**Returns**: Result with success status and updated character

**Formula**: Learn chance = `(INT or PIE) / 30`

**Example**:
```typescript
const result = SpellService.learnSpell(mage, "MAHALITO")
if (result.success) {
  // Spell learned, added to spell book
  // Spell point pool for level recalculated
}
```

### hasSpellLearned

Check if character knows a spell.

**Signature**:
```typescript
function hasSpellLearned(
  character: Character,
  spellId: string
): boolean
```

**Parameters**:
- `character`: Character to check
- `spellId`: Spell identifier

**Returns**: True if spell in character's spell book

**Example**:
```typescript
if (SpellService.hasSpellLearned(mage, "HALITO")) {
  // Can cast HALITO
}
```

### getAvailableSpells

Get all spells character can cast (has learned + has points).

**Signature**:
```typescript
function getAvailableSpells(
  character: Character,
  context: 'COMBAT' | 'DUNGEON' | 'TOWN'
): Spell[]
```

**Parameters**:
- `character`: Character to check
- `context`: Where spell will be cast

**Returns**: Array of castable spells

**Example**:
```typescript
const spells = SpellService.getAvailableSpells(mage, 'COMBAT')
// Only combat-castable spells with available points
```

### calculateSpellPoints

Calculate spell point pool for spell level.

**Signature**:
```typescript
function calculateSpellPoints(
  character: Character,
  spellLevel: number,
  spellType: 'MAGE' | 'PRIEST'
): number
```

**Parameters**:
- `character`: Character to calculate for
- `spellLevel`: Spell level (1-7)
- `spellType`: Mage or Priest

**Returns**: Maximum spell points for that level

**Formula**: Based on spells learned and character level (complex)

**Example**:
```typescript
const maxPoints = SpellService.calculateSpellPoints(mage, 3, 'MAGE')
// maxPoints might be 2-5 depending on level and spells learned
```

### getSpellData

Get spell data from spell database.

**Signature**:
```typescript
function getSpellData(spellId: string): Spell
```

**Parameters**:
- `spellId`: Spell identifier

**Returns**: Spell data object

**Throws**:
- `SpellNotFoundError` if spell ID invalid

**Example**:
```typescript
const spell = SpellService.getSpellData("HALITO")
// spell.name === "HALITO"
// spell.level === 1
// spell.damage === "1d8"
```

### canLearnSpellLevel

Check if character can access spell level.

**Signature**:
```typescript
function canLearnSpellLevel(
  character: Character,
  spellLevel: number,
  spellType: 'MAGE' | 'PRIEST'
): boolean
```

**Parameters**:
- `character`: Character to check
- `spellLevel`: Spell level (1-7)
- `spellType`: Mage or Priest

**Returns**: True if character's level allows access

**Example**:
```typescript
if (SpellService.canLearnSpellLevel(mage, 4, 'MAGE')) {
  // Mage can learn level 4 spells (probably level 7+)
}
```

## Dependencies

Uses:
- `CharacterService` - Character class and level checks
- `RandomService` - RNG for spell learning rolls
- `spells.json` - Spell database

## Testing

See [SpellService.test.ts](../../tests/services/SpellService.test.ts)

**Key test cases**:
- Casting spell deducts 1 point from correct pool
- Casting without points throws error
- Casting unlearned spell throws error
- Spell point restoration (inn rest)
- Learning spells based on INT/PIE
- Spell learning probability validation
- Separate Mage/Priest pools
- Spell point calculation per level
- Context-based spell availability (combat/dungeon/town)

## Related

- [Spell System](../systems/spell-system.md) - System overview
- [Spell Reference](../research/spell-reference.md) - All spells documented
- [CastSpellCommand](../commands/CastSpellCommand.md) - Uses this service
- [RestAtInnCommand](../commands/RestAtInnCommand.md) - Restores spell points
