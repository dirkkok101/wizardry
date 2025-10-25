# EquipmentService

**Pure function service for equipment management and validation.**

## Responsibility

Manages equipment slots, equip/unequip operations, class restrictions, cursed items, equipment stat bonuses, and AC calculations. Validates equipment compatibility with character class.

## API Reference

### equipItem

Equip item to character.

**Signature**:
```typescript
function equipItem(
  character: Character,
  item: Equipment
): Character
```

**Parameters**:
- `character`: Character equipping item
- `item`: Equipment to equip

**Returns**: New character with item equipped

**Throws**:
- `ClassRestrictionError` if class cannot use item
- `SlotOccupiedError` if slot already has item (must unequip first)
- `CursedItemEquippedError` if trying to equip when cursed item present

**Example**:
```typescript
const equipped = EquipmentService.equipItem(
  fighter,
  { name: "Long Sword", type: "WEAPON", damage: "1d8" }
)
// equipped.equipment.weapon = Long Sword
```

### unequipItem

Unequip item from character.

**Signature**:
```typescript
function unequipItem(
  character: Character,
  slot: EquipmentSlot
): Character
```

**Parameters**:
- `character`: Character unequipping item
- `slot`: Equipment slot to unequip

**Returns**: New character with item unequipped

**Throws**:
- `CursedItemError` if item is cursed (cannot unequip)

**Example**:
```typescript
const unequipped = EquipmentService.unequipItem(fighter, 'WEAPON')
// unequipped.equipment.weapon = null
// Long Sword moved to inventory
```

### canEquipItem

Check if character can equip item.

**Signature**:
```typescript
function canEquipItem(
  character: Character,
  item: Equipment
): boolean
```

**Parameters**:
- `character`: Character to check
- `item`: Equipment to check

**Returns**: True if character's class can use item

**Example**:
```typescript
if (EquipmentService.canEquipItem(mage, plateArmor)) {
  // False: Mages cannot wear armor
}
```

### calculateAC

Calculate character's armor class.

**Signature**:
```typescript
function calculateAC(character: Character): number
```

**Parameters**:
- `character`: Character to calculate

**Returns**: Armor class (lower is better)

**Formula**: Base 10 - armor bonus - shield bonus - AGI modifier

**Example**:
```typescript
const ac = EquipmentService.calculateAC(fighter)
// Plate (AC 4) + Shield (-2) + AGI 14 (-1) = AC 1
```

### getEquipmentBonuses

Get stat bonuses from all equipped items.

**Signature**:
```typescript
function getEquipmentBonuses(character: Character): StatBonuses
```

**Parameters**:
- `character`: Character to check

**Returns**: Stat bonuses from equipment

**Example**:
```typescript
const bonuses = EquipmentService.getEquipmentBonuses(fighter)
// bonuses: { str: +2 (Murasama Blade), ac: -10 (Lords Garb), ... }
```

### isCursed

Check if item is cursed.

**Signature**:
```typescript
function isCursed(item: Equipment): boolean
```

**Parameters**:
- `item`: Equipment to check

**Returns**: True if item is cursed

**Example**:
```typescript
if (EquipmentService.isCursed(deadlyRing)) {
  // True: Deadly Ring is cursed (cannot unequip, -3 regen)
}
```

### removeCurse

Remove curse from equipped item (via temple service).

**Signature**:
```typescript
function removeCurse(
  character: Character,
  slot: EquipmentSlot
): Character
```

**Parameters**:
- `character`: Character with cursed item
- `slot`: Slot with cursed item

**Returns**: Character with curse removed (item can now be unequipped)

**Example**:
```typescript
const uncursed = EquipmentService.removeCurse(fighter, 'WEAPON')
// Cursed sword can now be unequipped
```

### getClassRestrictions

Get equipment restrictions for class.

**Signature**:
```typescript
function getClassRestrictions(
  characterClass: CharacterClass
): EquipmentRestrictions
```

**Parameters**:
- `characterClass`: Class to check

**Returns**: Restrictions object (allowed weapons, armor, etc.)

**Example**:
```typescript
const restrictions = EquipmentService.getClassRestrictions('MAGE')
// restrictions.weapons: ['DAGGER', 'STAFF']
// restrictions.armor: [] (no armor allowed)
// restrictions.shields: [] (no shields)
```

### calculateDamage

Calculate weapon damage for character.

**Signature**:
```typescript
function calculateDamage(
  character: Character,
  weapon?: Equipment
): string
```

**Parameters**:
- `character`: Character attacking
- `weapon`: Weapon used (uses equipped if not specified)

**Returns**: Damage dice formula (e.g., "1d8+3")

**Formula**: WeaponDice + STR_modifier

**Example**:
```typescript
const damage = EquipmentService.calculateDamage(
  fighter,
  { name: "Long Sword", damage: "1d8" }
)
// fighter STR 18: damage = "1d8+3"
```

### identifyItem

Identify unknown item (Bishop/Thief ability).

**Signature**:
```typescript
function identifyItem(
  character: Character,
  item: Equipment
): IdentifyResult
```

**Parameters**:
- `character`: Character identifying
- `item`: Unknown item

**Returns**: Identification result with item properties revealed

**Throws**:
- `CannotIdentifyError` if character not Bishop/Thief

**Example**:
```typescript
const result = EquipmentService.identifyItem(bishop, unknownSword)
// result.identified: true
// result.item: { name: "Sword +2", bonus: 2, cursed: false }
```

### applyEquipmentEffects

Apply special equipment effects (regeneration, protections, etc.).

**Signature**:
```typescript
function applyEquipmentEffects(character: Character): Character
```

**Parameters**:
- `character`: Character with equipment

**Returns**: Character with equipment effects applied

**Example**:
```typescript
const withEffects = EquipmentService.applyEquipmentEffects(character)
// Lords Garb: +3 regen/round, all protections
// Werdna's Amulet: +3 regen, AC 10, party healing
```

### getAvailableSlots

Get equipment slots for character class.

**Signature**:
```typescript
function getAvailableSlots(
  characterClass: CharacterClass
): EquipmentSlot[]
```

**Parameters**:
- `characterClass`: Class to check

**Returns**: Array of available slots

**Example**:
```typescript
const slots = EquipmentService.getAvailableSlots('PRIEST')
// slots: ['WEAPON', 'ARMOR', 'SHIELD', 'GAUNTLETS']
// Note: Priest cannot use HELMET slot
```

### compareItems

Compare two items for upgrade decisions.

**Signature**:
```typescript
function compareItems(
  item1: Equipment,
  item2: Equipment,
  character: Character
): ComparisonResult
```

**Parameters**:
- `item1`: First item
- `item2`: Second item
- `character`: Character context

**Returns**: Comparison result (which is better)

**Example**:
```typescript
const result = EquipmentService.compareItems(
  sword1,
  sword2,
  fighter
)
// result.better: 'item2' (Sword +2 better than Sword +1)
// result.reason: "+1 better damage bonus"
```

### getUniqueItems

Get character-specific unique items.

**Signature**:
```typescript
function getUniqueItems(
  characterClass: CharacterClass
): Equipment[]
```

**Parameters**:
- `characterClass`: Class to check

**Returns**: Array of class-specific unique items

**Example**:
```typescript
const unique = EquipmentService.getUniqueItems('SAMURAI')
// unique: [{ name: "Murasama Blade", damage: "10-50", ... }]
```

## Dependencies

Uses:
- `CharacterService` - Class and stat checks
- `items.json` - Equipment database
- `RandomService` - RNG for identification

## Testing

See [EquipmentService.test.ts](../../tests/services/EquipmentService.test.ts)

**Key test cases**:
- Equip/unequip items
- Class restriction validation (all 8 classes)
- AC calculation with various equipment
- Stat bonuses from equipment
- Cursed item detection
- Curse removal (temple)
- Item identification (Bishop/Thief)
- Damage calculation with STR modifier
- Equipment effects (regen, protections)
- Slot availability per class

## Related

- [Equipment Reference](../research/equipment-reference.md) - All items documented
- [Items & Equipment](../game-design/11-items-equipment.md) - Player guide
- [EquipItemCommand](../commands/EquipItemCommand.md) - Uses this service
- [ShopService](./ShopService.md) - Buy/sell equipment
