# ValidationService

**Pure function service for data validation and constraint checking.**

## Responsibility

Validates game data, character stats, party composition, equipment, spells, and state transitions to ensure game rules are followed.

## API Reference

### validateCharacter

Validate character meets all requirements and constraints.

**Signature**:
```typescript
function validateCharacter(character: Character): ValidationResult
```

**Parameters**:
- `character`: Character to validate

**Returns**: Validation result with errors if any

**Example**:
```typescript
const result = ValidationService.validateCharacter(character)
// result = {
//   valid: true,
//   errors: [],
//   warnings: []
// }
```

### validateClassRequirements

Check if character meets class requirements.

**Signature**:
```typescript
function validateClassRequirements(
  stats: Stats,
  className: ClassName,
  alignment: Alignment
): ValidationResult
```

**Parameters**:
- `stats`: Character stats (STR, INT, PIE, VIT, AGI, LUC)
- `className`: Class to validate ("Fighter", "Mage", "Ninja", etc.)
- `alignment`: Character alignment ("Good", "Neutral", "Evil")

**Returns**: Validation result

**Example**:
```typescript
const result = ValidationService.validateClassRequirements(
  { str: 17, int: 17, pie: 17, vit: 17, agi: 17, luc: 17 },
  "Ninja",
  "Evil"
)
// result = { valid: true, errors: [] } (all stats 17+, Evil alignment)
```

### validatePartyComposition

Validate party meets requirements (size, formation).

**Signature**:
```typescript
function validatePartyComposition(party: Party): ValidationResult
```

**Parameters**:
- `party`: Party to validate

**Returns**: Validation result

**Example**:
```typescript
const result = ValidationService.validatePartyComposition(party)
// result = {
//   valid: false,
//   errors: ["Front row cannot exceed 3 characters"],
//   warnings: []
// }
```

### validateEquipment

Validate character can equip item.

**Signature**:
```typescript
function validateEquipment(
  character: Character,
  item: Item,
  slot: EquipmentSlot
): ValidationResult
```

**Parameters**:
- `character`: Character equipping item
- `item`: Item to equip
- `slot`: Equipment slot ("weapon", "armor", "shield", etc.)

**Returns**: Validation result

**Example**:
```typescript
const result = ValidationService.validateEquipment(
  mage,
  plateArmor,
  "armor"
)
// result = {
//   valid: false,
//   errors: ["Mage cannot wear plate armor"],
//   warnings: []
// }
```

### validateSpellCast

Validate character can cast spell.

**Signature**:
```typescript
function validateSpellCast(
  character: Character,
  spell: Spell,
  target: Target
): ValidationResult
```

**Parameters**:
- `character`: Character casting spell
- `spell`: Spell to cast
- `target`: Spell target

**Returns**: Validation result

**Example**:
```typescript
const result = ValidationService.validateSpellCast(
  priest,
  diosSpell,
  allyCharacter
)
// result = {
//   valid: false,
//   errors: ["Not enough spell points for level 1 spells"],
//   warnings: []
// }
```

### validateMovement

Validate party can move to target position.

**Signature**:
```typescript
function validateMovement(
  from: Position,
  to: Position,
  dungeon: DungeonLevel
): ValidationResult
```

**Parameters**:
- `from`: Current position
- `to`: Target position
- `dungeon`: Dungeon level map

**Returns**: Validation result

**Example**:
```typescript
const result = ValidationService.validateMovement(
  { x: 10, y: 10, level: 1 },
  { x: 10, y: 11, level: 1 },
  level1
)
// result = { valid: true, errors: [] } (no wall blocking)
```

### validateStateTransition

Validate game can transition from one state to another.

**Signature**:
```typescript
function validateStateTransition(
  fromState: GameMode,
  toState: GameMode
): ValidationResult
```

**Parameters**:
- `fromState`: Current game mode
- `toState`: Target game mode

**Returns**: Validation result

**Example**:
```typescript
const result = ValidationService.validateStateTransition(
  "COMBAT",
  "TOWN"
)
// result = {
//   valid: false,
//   errors: ["Cannot go to town while in combat"],
//   warnings: []
// }
```

### validateStatValue

Validate stat value is within valid range.

**Signature**:
```typescript
function validateStatValue(
  statName: StatName,
  value: number
): ValidationResult
```

**Parameters**:
- `statName`: Stat name ("STR", "INT", "PIE", "VIT", "AGI", "LUC")
- `value`: Stat value to validate

**Returns**: Validation result

**Example**:
```typescript
const result = ValidationService.validateStatValue("STR", 25)
// result = {
//   valid: true,
//   errors: [],
//   warnings: ["STR above 18 is unusual but valid"]
// }
```

### validateHP

Validate HP value is within valid range.

**Signature**:
```typescript
function validateHP(
  hp: number,
  maxHP: number
): ValidationResult
```

**Parameters**:
- `hp`: Current HP
- `maxHP`: Maximum HP

**Returns**: Validation result

**Example**:
```typescript
const result = ValidationService.validateHP(25, 20)
// result = {
//   valid: false,
//   errors: ["HP cannot exceed max HP"],
//   warnings: []
// }
```

### validateAlignment

Validate alignment is compatible with class and equipment.

**Signature**:
```typescript
function validateAlignment(
  alignment: Alignment,
  className: ClassName,
  equipment?: Item[]
): ValidationResult
```

**Parameters**:
- `alignment`: Character alignment
- `className`: Character class
- `equipment`: Optional equipment to check

**Returns**: Validation result

**Example**:
```typescript
const result = ValidationService.validateAlignment(
  "Good",
  "Thief",
  []
)
// result = {
//   valid: false,
//   errors: ["Thief cannot be Good alignment"],
//   warnings: []
// }
```

## Validation Rules

### Character Creation
- All stats must be 3-18+ range
- Class requirements must be met
- Alignment compatible with class
- Name must be non-empty (max 15 chars)
- Age must be 14-100

### Party Composition
- Minimum 1 character
- Maximum 6 characters
- Front row max 3 characters
- Back row max 3 characters
- At least 1 conscious character

### Equipment
- Character class can use item type
- Character alignment can use item
- Character level meets item requirements
- Item not cursed (or can be removed)

### Spell Casting
- Character has spell in spell book
- Character has spell points for spell level
- Target type compatible with spell
- Character not silenced

### Movement
- Target tile is floor (not wall)
- No closed door blocking (unless opening)
- Target tile on same level (unless stairs)

### State Transitions

Valid transitions:
- TOWN ↔ NAVIGATION
- NAVIGATION ↔ COMBAT
- NAVIGATION ↔ CAMP
- Any → CHARACTER_CREATION (from town)

Invalid transitions:
- COMBAT → TOWN (must finish combat first)
- COMBAT → CHARACTER_CREATION (invalid)

## Dependencies

Uses:
- No external service dependencies (pure validation logic)

## Testing

See [ValidationService.test.ts](../../tests/services/ValidationService.test.ts)

**Key test cases**:
- Valid character passes validation
- Invalid class requirements caught
- Party size limits enforced
- Equipment restrictions enforced
- Spell point checking works
- Movement blocked by walls
- State transitions validated
- Stat ranges enforced
- HP cannot exceed max HP
- Alignment restrictions enforced

## Related

- [CharacterService](./CharacterService.md) - Character management
- [PartyService](./PartyService.md) - Party management
- [EquipmentService](./EquipmentService.md) - Equipment management
- [SpellService](./SpellService.md) - Spell management
- [Class Reference](../research/class-reference.md) - Class requirements
- [Equipment Reference](../research/equipment-reference.md) - Equipment restrictions
