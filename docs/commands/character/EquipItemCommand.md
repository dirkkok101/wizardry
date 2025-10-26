# EquipItemCommand

**Equip weapon or armor to character equipment slot.**

## Responsibility

Equips an item from a character's inventory to their equipment slot, validating class restrictions, slot availability, and cursed item blocking. Updates character's AC and combat stats based on equipped item bonuses.

## Command Flow

### Preconditions
1. Item exists in character's inventory
2. Character's class can use the item (EquipmentService.canEquipItem)
3. Equipment slot is available or empty
4. No cursed item blocking equip operation
5. Character is alive and not ashed

### Services Called
1. **EquipmentService.equipItem** - Perform equipment operation
2. **EquipmentService.calculateAC** - Recalculate armor class with new item
3. **EquipmentService.getEquipmentBonuses** - Apply stat bonuses from item
4. **EventService.createEvent** - Log equipment event

### Events Created
```typescript
{
  type: "ITEM_EQUIPPED",
  characterId: string,
  itemId: string,
  slot: EquipmentSlot,
  timestamp: number,
  newAC: number
}
```

### State Changes
1. Item moved from inventory to equipment slot
2. Character AC recalculated
3. Stat bonuses applied (STR, AGI, etc.)
4. Equipment effects activated (regeneration, protections)
5. Event added to game log

## API Reference

**Signature**:
```typescript
function execute(state: GameState, params: {
  characterId: string,
  itemId: string
}): GameState
```

**Parameters**:
- `state` - Current game state
- `params.characterId` - Character equipping item
- `params.itemId` - Item to equip

**Returns**: New game state with item equipped

**Throws**:
- `CharacterNotFoundError` - Character ID invalid
- `ItemNotFoundError` - Item not in character inventory
- `ClassRestrictionError` - Character class cannot use item
- `SlotOccupiedError` - Slot has item (must unequip first)
- `CursedItemBlockingError` - Cursed item prevents equipment changes
- `CharacterDeadError` - Cannot equip when dead/ashed

## Preconditions

### Character Validation
```typescript
// Character must exist and be alive
const character = state.roster.get(characterId)
if (!character) throw new CharacterNotFoundError()
if (character.status === 'ASHES' || character.status === 'DEAD') {
  throw new CharacterDeadError()
}
```

### Item Validation
```typescript
// Item must be in character's inventory
const item = character.inventory.find(i => i.id === itemId)
if (!item) throw new ItemNotFoundError()
```

### Class Restriction Check
```typescript
// Character class must be able to use item
if (!EquipmentService.canEquipItem(character, item)) {
  throw new ClassRestrictionError(
    `${character.class} cannot use ${item.name}`
  )
}
```

### Cursed Item Check
```typescript
// Check if cursed item blocks equipment changes
const hasCursedItem = Object.values(character.equipment).some(
  equippedItem => equippedItem && EquipmentService.isCursed(equippedItem)
)
if (hasCursedItem) {
  throw new CursedItemBlockingError()
}
```

## Services Used

### EquipmentService
- **equipItem** - Core equipment logic, slot assignment
- **canEquipItem** - Validate class restrictions
- **calculateAC** - Recalculate armor class
- **getEquipmentBonuses** - Extract stat bonuses
- **isCursed** - Check cursed status

### EventService
- **createEvent** - Create ITEM_EQUIPPED event

## Events Created

### ITEM_EQUIPPED Event
```typescript
{
  id: "evt-12345",
  type: "ITEM_EQUIPPED",
  timestamp: 1635724800000,
  characterId: "char-abc",
  characterName: "Gandalf",
  itemId: "item-sword-123",
  itemName: "Long Sword +2",
  slot: "WEAPON",
  previousAC: 5,
  newAC: 5,
  bonuses: {
    damage: "+2",
    toHit: "+2"
  }
}
```

## Testing

### Test Cases

**Basic Equipment**:
```typescript
test('equips Long Sword to fighter weapon slot', () => {
  const fighter = createFighter({ inventory: [longSword] })
  const state = createGameState({ roster: [fighter] })

  const result = EquipItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: longSword.id
  })

  const updated = result.roster.get(fighter.id)!
  expect(updated.equipment.weapon).toBe(longSword)
  expect(updated.inventory).not.toContain(longSword)
})
```

**Class Restriction**:
```typescript
test('prevents mage from equipping plate armor', () => {
  const mage = createMage({ inventory: [plateArmor] })
  const state = createGameState({ roster: [mage] })

  expect(() => EquipItemCommand.execute(state, {
    characterId: mage.id,
    itemId: plateArmor.id
  })).toThrow(ClassRestrictionError)
})
```

**AC Calculation**:
```typescript
test('recalculates AC when equipping armor', () => {
  const fighter = createFighter({
    inventory: [chainMail],
    equipment: { armor: null }
  })
  const state = createGameState({ roster: [fighter] })

  const result = EquipItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: chainMail.id
  })

  const updated = result.roster.get(fighter.id)!
  const newAC = EquipmentService.calculateAC(updated)
  expect(newAC).toBeLessThan(fighter.ac) // Lower AC is better
})
```

**Cursed Item Blocking**:
```typescript
test('prevents equipment changes when cursed item equipped', () => {
  const fighter = createFighter({
    inventory: [newSword],
    equipment: { weapon: cursedSword }
  })
  const state = createGameState({ roster: [fighter] })

  expect(() => EquipItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: newSword.id
  })).toThrow(CursedItemBlockingError)
})
```

**Stat Bonuses**:
```typescript
test('applies equipment stat bonuses', () => {
  const fighter = createFighter({
    inventory: [murasama], // +2 STR
    stats: { str: 16 }
  })
  const state = createGameState({ roster: [fighter] })

  const result = EquipItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: murasama.id
  })

  const updated = result.roster.get(fighter.id)!
  const bonuses = EquipmentService.getEquipmentBonuses(updated)
  expect(bonuses.str).toBe(2)
})
```

**Event Creation**:
```typescript
test('creates ITEM_EQUIPPED event', () => {
  const fighter = createFighter({ inventory: [longSword] })
  const state = createGameState({ roster: [fighter] })

  const result = EquipItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: longSword.id
  })

  const lastEvent = result.eventLog[result.eventLog.length - 1]
  expect(lastEvent.type).toBe('ITEM_EQUIPPED')
  expect(lastEvent.itemName).toBe('Long Sword')
  expect(lastEvent.slot).toBe('WEAPON')
})
```

## Related

- [EquipmentService](../services/EquipmentService.md) - Equipment management
- [UnequipItemCommand](./UnequipItemCommand.md) - Unequip items
- [DropItemCommand](./DropItemCommand.md) - Drop items
- [IdentifyItemCommand](./IdentifyItemCommand.md) - Identify unknown items
- [Equipment Reference](../research/equipment-reference.md) - All items documented
- [Items & Equipment](../game-design/11-items-equipment.md) - Player guide
