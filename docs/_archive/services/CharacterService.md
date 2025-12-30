# CharacterService

**Pure function service for character stats, classes, and progression.**

## Responsibility

Manages character attributes, stat modifications, class requirements validation, and character progression. Handles stat increases/decreases on level-up and aging effects.

## API Reference

### createCharacter

Create new character from creation parameters.

**Signature**:
```typescript
function createCharacter(params: CharacterCreationParams): Character
```

**Parameters**:
- `params`: Character creation parameters (name, race, class, stats, alignment)

**Returns**: New character entity

**Throws**:
- `InvalidStatsError` if stats don't meet class requirements
- `InvalidAlignmentError` if alignment incompatible with class

**Example**:
```typescript
const fighter = CharacterService.createCharacter({
  name: "Conan",
  race: "HUMAN",
  class: "FIGHTER",
  stats: { str: 15, int: 10, pie: 8, vit: 14, agi: 12, luc: 10 },
  alignment: "GOOD",
  bonusPoints: 12
})
```

### meetsClassRequirements

Check if character stats meet class requirements.

**Signature**:
```typescript
function meetsClassRequirements(
  stats: Stats,
  alignment: Alignment,
  targetClass: CharacterClass
): boolean
```

**Parameters**:
- `stats`: Character stats
- `alignment`: Character alignment
- `targetClass`: Class to check (FIGHTER, MAGE, etc.)

**Returns**: True if requirements met

**Example**:
```typescript
const canBeLord = CharacterService.meetsClassRequirements(
  { str: 15, int: 12, pie: 12, vit: 15, agi: 14, luc: 15 },
  "GOOD",
  "LORD"
)
// canBeLord === true (all requirements met)
```

### modifyStat

Modify character stat (increase or decrease).

**Signature**:
```typescript
function modifyStat(
  character: Character,
  stat: StatType,
  amount: number
): Character
```

**Parameters**:
- `character`: Character to modify
- `stat`: Stat to modify (STR, INT, PIE, VIT, AGI, LUC)
- `amount`: Amount to change (positive or negative)

**Returns**: New character with modified stat

**Example**:
```typescript
const stronger = CharacterService.modifyStat(fighter, 'STR', 1)
// stronger.stats.str === fighter.stats.str + 1
```

### applyLevelUpStatChanges

Apply stat changes on level-up.

**Signature**:
```typescript
function applyLevelUpStatChanges(character: Character): Character
```

**Parameters**:
- `character`: Character leveling up

**Returns**: New character with stat changes applied

**Formula**: Each stat has 75% chance to be checked, then `(130-age)%` chance to increase

**Example**:
```typescript
const leveled = CharacterService.applyLevelUpStatChanges(fighter)
// Stats may have increased or decreased based on age
// Younger = more likely to increase
```

### calculateStatModifier

Calculate stat modifier for game mechanics.

**Signature**:
```typescript
function calculateStatModifier(
  stat: StatType,
  value: number
): number
```

**Parameters**:
- `stat`: Stat type
- `value`: Stat value

**Returns**: Modifier for that stat

**Modifiers**:
- STR: Damage modifier (-3 to +3)
- AGI: Initiative modifier (-2 to +4)
- VIT: HP modifier (-1 to +2)
- INT/PIE: Spell learning modifier

**Example**:
```typescript
const strMod = CharacterService.calculateStatModifier('STR', 18)
// strMod === 3 (18 STR gives +3 damage)
```

### getClassData

Get class data and requirements.

**Signature**:
```typescript
function getClassData(characterClass: CharacterClass): ClassData
```

**Parameters**:
- `characterClass`: Class identifier

**Returns**: Class data with requirements, abilities, equipment restrictions

**Example**:
```typescript
const lordData = CharacterService.getClassData('LORD')
// lordData.requirements: { str: 15, vit: 15, int: 12, pie: 12, agi: 14, luc: 15 }
// lordData.alignment: ['GOOD']
// lordData.spells: { priest: [1,2,3,4,5,6] }
```

### getRaceData

Get race data and base stats.

**Signature**:
```typescript
function getRaceData(race: Race): RaceData
```

**Parameters**:
- `race`: Race identifier (HUMAN, ELF, DWARF, GNOME, HOBBIT)

**Returns**: Race data with base stats

**Example**:
```typescript
const hobbitData = CharacterService.getRaceData('HOBBIT')
// hobbitData.baseStats: { str: 5, int: 7, pie: 7, vit: 6, agi: 10, luc: 15 }
// hobbitData.totalStats: 50
```

### calculateAge

Calculate character age after resting periods.

**Signature**:
```typescript
function calculateAge(
  currentAge: number,
  restCount: number
): number
```

**Parameters**:
- `currentAge`: Current age in years
- `restCount`: Number of rests at inn

**Returns**: New age (increases ~0.1 years per rest)

**Example**:
```typescript
const newAge = CharacterService.calculateAge(15, 10)
// newAge ≈ 16 (aged 1 year after ~10 rests)
```

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

**Returns**: True if character meets requirements

**Example**:
```typescript
if (CharacterService.canChangeClass(mage, 'SAMURAI')) {
  // Mage has built up STR/VIT/AGI enough for Samurai
}
```

### getMaxHP

Calculate maximum HP for character.

**Signature**:
```typescript
function getMaxHP(character: Character): number
```

**Parameters**:
- `character`: Character to calculate

**Returns**: Maximum HP based on class, level, VIT

**Formula**: Sum of HP rolls per level + VIT modifier

**Example**:
```typescript
const maxHP = CharacterService.getMaxHP(fighter)
// Level 5 Fighter with VIT 14: ~30-50 HP
```

### applyHPGain

Apply HP gain on level-up.

**Signature**:
```typescript
function applyHPGain(character: Character): Character
```

**Parameters**:
- `character`: Character leveling up

**Returns**: New character with increased max HP

**Formula**: HitDice + VIT_modifier, minimum 1

**Example**:
```typescript
const leveled = CharacterService.applyHPGain(fighter)
// fighter gained 1d10 + VIT_modifier HP
```

### getAvailableClasses

Get all classes character can currently become.

**Signature**:
```typescript
function getAvailableClasses(
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
const classes = CharacterService.getAvailableClasses(
  { str: 17, int: 17, pie: 17, vit: 17, agi: 17, luc: 17 },
  'EVIL'
)
// classes includes 'NINJA' (all stats 17, evil alignment)
```

## Dependencies

Uses:
- `class-reference.json` - Class data and requirements
- `race-stats.json` - Race base stats
- `RandomService` - RNG for stat changes

## Testing

See [CharacterService.test.ts](../../tests/services/CharacterService.test.ts)

**Key test cases**:
- Character creation with valid stats
- Class requirement validation (all 8 classes)
- Stat modifier calculations
- Level-up stat changes (age-based)
- HP gain on level-up
- Age increase from resting
- Class change eligibility
- Race base stats (all 5 races)
- Alignment restrictions per class

## Related

- [Character Creation System](../systems/character-creation-system.md) - System overview
- [Class Reference](../research/class-reference.md) - All 8 classes documented
- [Race Reference](../research/race-stats.md) - All 5 races documented
- [CreateCharacterCommand](../commands/CreateCharacterCommand.md) - Uses this service
- [LevelUpCharacterCommand](../commands/LevelUpCharacterCommand.md) - Uses this service
