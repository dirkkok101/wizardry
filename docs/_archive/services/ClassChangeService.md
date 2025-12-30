# ClassChangeService

**Pure function service for character class changing mechanics.**

## Responsibility

Manages class change validation, stat retention, spell retention, level reset, and multi-classing progression. Validates class change eligibility and applies class change effects.

## API Reference

### canChangeClass

Check if character can change to new class.

**Signature**:
```typescript
function canChangeClass(
  character: Character,
  newClass: CharacterClass
): boolean
```

**Parameters**:
- `character`: Character attempting class change
- `newClass`: Target class

**Returns**: True if character meets class requirements

**Example**:
```typescript
if (ClassChangeService.canChangeClass(mage, 'SAMURAI')) {
  // Mage has built up STR/VIT/AGI for Samurai
}
```

### changeClass

Perform class change.

**Signature**:
```typescript
function changeClass(
  character: Character,
  newClass: CharacterClass
): Character
```

**Parameters**:
- `character`: Character changing class
- `newClass`: New class

**Returns**: New character with class changed

**Effects**:
- Level reset to 1
- Class changed
- Stats retained (no stat loss)
- Some spells retained (based on new class)
- HP recalculated for new class
- Equipment restrictions updated

**Throws**:
- `ClassRequirementsNotMetError` if stats insufficient

**Example**:
```typescript
const samurai = ClassChangeService.changeClass(mage, 'SAMURAI')
// samurai.level = 1
// samurai.class = 'SAMURAI'
// samurai.stats = mage.stats (unchanged)
// samurai.spellBook = retained mage spells (levels 1-6)
```

### getRetainedSpells

Get spells retained after class change.

**Signature**:
```typescript
function getRetainedSpells(
  character: Character,
  newClass: CharacterClass
): Set<string>
```

**Parameters**:
- `character`: Character with current spell book
- `newClass`: New class

**Returns**: Set of spell IDs retained

**Rules**:
- Mage → Samurai: Keep mage spells levels 1-6
- Priest → Lord: Keep priest spells levels 1-6
- Any → Bishop: Keep all learned spells
- Fighter/Thief → Mage/Priest: Lose all spells (new spell book)

**Example**:
```typescript
const retained = ClassChangeService.getRetainedSpells(mage, 'SAMURAI')
// retained: All mage spells level 1-6 (lose level 7 spells)
```

### calculateNewHP

Calculate HP after class change.

**Signature**:
```typescript
function calculateNewHP(
  character: Character,
  newClass: CharacterClass
): number
```

**Parameters**:
- `character`: Character changing class
- `newClass`: New class

**Returns**: New max HP for level 1 of new class

**Formula**: Re-roll HP for level 1 using new class hit dice

**Example**:
```typescript
const newHP = ClassChangeService.calculateNewHP(mage, 'FIGHTER')
// Mage had ~4-8 HP, Fighter gets 1d10+VIT (~8-15 HP at level 1)
```

### validateClassChange

Validate class change request.

**Signature**:
```typescript
function validateClassChange(
  character: Character,
  newClass: CharacterClass
): ValidationResult
```

**Parameters**:
- `character`: Character requesting change
- `newClass`: Target class

**Returns**: Validation result with errors (if any)

**Checks**:
- Stats meet class requirements
- Alignment compatible with class
- Not already that class

**Example**:
```typescript
const result = ClassChangeService.validateClassChange(fighter, 'LORD')
// result.valid = false (fighter likely lacks INT/PIE/LUC)
// result.errors: ['Insufficient INT', 'Insufficient PIE', 'Insufficient LUC']
```

### getClassChangeRecommendations

Get recommended class change paths.

**Signature**:
```typescript
function getClassChangeRecommendations(
  character: Character
): ClassChangeRecommendation[]
```

**Parameters**:
- `character`: Character to check

**Returns**: Array of recommended class changes with reasoning

**Example**:
```typescript
const recommendations = ClassChangeService.getClassChangeRecommendations(mage)
// [
//   { class: 'SAMURAI', reason: 'Has INT 15, needs STR/VIT/AGI 15/14/10' },
//   { class: 'BISHOP', reason: 'Has INT 15, needs PIE 12' }
// ]
```

### updateEquipmentRestrictions

Apply new class equipment restrictions.

**Signature**:
```typescript
function updateEquipmentRestrictions(
  character: Character,
  newClass: CharacterClass
): Character
```

**Parameters**:
- `character`: Character after class change
- `newClass`: New class

**Returns**: Character with illegal equipment unequipped

**Example**:
```typescript
const updated = ClassChangeService.updateEquipmentRestrictions(
  character,
  'MAGE'
)
// Armor and weapons unequipped (mage can only use dagger/staff, no armor)
```

### recalculateSpellPoints

Recalculate spell point pools for new class.

**Signature**:
```typescript
function recalculateSpellPoints(
  character: Character,
  newClass: CharacterClass
): Character
```

**Parameters**:
- `character`: Character after class change
- `newClass`: New class

**Returns**: Character with recalculated spell points (for level 1)

**Example**:
```typescript
const updated = ClassChangeService.recalculateSpellPoints(samurai, 'SAMURAI')
// Samurai spell points reset for level 1 (minimal pools)
```

### getOptimalClassPath

Get optimal class change path for goal class.

**Signature**:
```typescript
function getOptimalClassPath(
  startClass: CharacterClass,
  goalClass: CharacterClass
): CharacterClass[]
```

**Parameters**:
- `startClass`: Starting class
- `goalClass`: Goal class

**Returns**: Array of classes to change through (optimal path)

**Example**:
```typescript
const path = ClassChangeService.getOptimalClassPath('FIGHTER', 'NINJA')
// path: ['FIGHTER', 'THIEF', 'NINJA']
// Build STR first, then AGI/LUC, then max all stats
```

### getMultiClassBonuses

Get bonuses from previous classes.

**Signature**:
```typescript
function getMultiClassBonuses(character: Character): ClassBonus[]
```

**Parameters**:
- `character`: Multi-classed character

**Returns**: Array of bonuses from previous classes

**Example**:
```typescript
const bonuses = ClassChangeService.getMultiClassBonuses(samurai)
// If samurai was previously Mage:
// bonuses: [{ class: 'MAGE', bonus: 'Retained mage spells 1-6' }]
```

### canBecomeNinja

Check if character can become Ninja (special requirements).

**Signature**:
```typescript
function canBecomeNinja(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: True if all stats ≥17 and evil alignment

**Example**:
```typescript
if (ClassChangeService.canBecomeNinja(character)) {
  // All stats 17+, evil alignment, can use Thieves Dagger
}
```

## Dependencies

Uses:
- `CharacterService` - Class requirements, stat validation
- `SpellService` - Spell retention logic
- `EquipmentService` - Equipment restriction validation
- `class-reference.json` - Class data

## Testing

See [ClassChangeService.test.ts](../../tests/services/ClassChangeService.test.ts)

**Key test cases**:
- Class change validation (stats and alignment)
- Level reset to 1
- Stat retention (no stat loss)
- Spell retention (Mage→Samurai, Priest→Lord)
- HP recalculation for new class
- Equipment unequipping (illegal items)
- Spell point pool reset
- Multi-class bonus tracking
- Ninja class change (all stats 17+)
- Optimal class path calculation

## Related

- [Class Reference](../research/class-reference.md) - All class requirements
- [Progression System](../game-design/08-progression.md) - Player guide
- [ChangeClassCommand](../commands/ChangeClassCommand.md) - Uses this service
- [Equipment Reference](../research/equipment-reference.md) - Thieves Dagger (change to Ninja)
