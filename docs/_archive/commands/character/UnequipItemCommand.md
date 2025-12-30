# UnequipItemCommand

**Unequip item from character equipment slot and return to inventory.**

## Responsibility

Removes equipped item from character's equipment slot and places it back in inventory, validating cursed item restrictions. Updates character's AC and combat stats to reflect removal of item bonuses.

## Command Flow

### Preconditions
1. Item is currently equipped in specified slot
2. Item is not cursed (or curse has been removed)
3. Character has inventory space for unequipped item
4. Character is alive and not ashed

### Services Called
1. **EquipmentService.unequipItem** - Perform unequip operation
2. **EquipmentService.isCursed** - Check if item is cursed
3. **EquipmentService.calculateAC** - Recalculate armor class without item
4. **EventService.createEvent** - Log unequip event

### Events Created
```typescript
{
  type: "ITEM_UNEQUIPPED",
  characterId: string,
  itemId: string,
  slot: EquipmentSlot,
  timestamp: number,
  previousAC: number,
  newAC: number
}
```

### State Changes
1. Item moved from equipment slot to inventory
2. Character AC recalculated (usually worse)
3. Stat bonuses removed
4. Equipment effects deactivated (regeneration, protections)
5. Event added to game log

## API Reference

**Signature**:
```typescript
function execute(state: GameState, params: {
  characterId: string,
  slot: EquipmentSlot
}): GameState
```

**Parameters**:
- `state` - Current game state
- `params.characterId` - Character unequipping item
- `params.slot` - Equipment slot to unequip ('WEAPON', 'ARMOR', 'SHIELD', etc.)

**Returns**: New game state with item unequipped

**Throws**:
- `CharacterNotFoundError` - Character ID invalid
- `SlotEmptyError` - No item equipped in specified slot
- `CursedItemError` - Item is cursed and cannot be removed
- `InventoryFullError` - No space in inventory for item
- `CharacterDeadError` - Cannot unequip when dead/ashed

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

### Slot Validation
```typescript
// Slot must have equipped item
const item = character.equipment[slot]
if (!item) {
  throw new SlotEmptyError(`No item equipped in ${slot} slot`)
}
```

### Cursed Item Check
```typescript
// Cannot unequip cursed items
if (EquipmentService.isCursed(item)) {
  throw new CursedItemError(
    `${item.name} is cursed and cannot be removed. Visit temple to remove curse.`
  )
}
```

### Inventory Space Check
```typescript
// Must have space in inventory
if (character.inventory.length >= MAX_INVENTORY_SIZE) {
  throw new InventoryFullError()
}
```

## Services Used

### EquipmentService
- **unequipItem** - Core unequip logic, inventory management
- **isCursed** - Validate item can be removed
- **calculateAC** - Recalculate armor class without item
- **getEquipmentBonuses** - Recalculate bonuses without item

### EventService
- **createEvent** - Create ITEM_UNEQUIPPED event

## Events Created

### ITEM_UNEQUIPPED Event
```typescript
{
  id: "evt-12346",
  type: "ITEM_UNEQUIPPED",
  timestamp: 1635724900000,
  characterId: "char-abc",
  characterName: "Gandalf",
  itemId: "item-sword-123",
  itemName: "Long Sword +2",
  slot: "WEAPON",
  previousAC: 3,
  newAC: 5,  // Worse AC after unequipping armor
  bonusesRemoved: {
    damage: "+2",
    toHit: "+2"
  }
}
```

## Testing

### Test Cases

**Basic Unequip**:
```typescript
test('unequips weapon and moves to inventory', () => {
  const fighter = createFighter({
    equipment: { weapon: longSword },
    inventory: []
  })
  const state = createGameState({ roster: [fighter] })

  const result = UnequipItemCommand.execute(state, {
    characterId: fighter.id,
    slot: 'WEAPON'
  })

  const updated = result.roster.get(fighter.id)!
  expect(updated.equipment.weapon).toBeNull()
  expect(updated.inventory).toContain(longSword)
})
```

**Cursed Item Blocking**:
```typescript
test('prevents unequipping cursed item', () => {
  const fighter = createFighter({
    equipment: { weapon: cursedSword }
  })
  const state = createGameState({ roster: [fighter] })

  expect(() => UnequipItemCommand.execute(state, {
    characterId: fighter.id,
    slot: 'WEAPON'
  })).toThrow(CursedItemError)
})
```

**AC Recalculation**:
```typescript
test('recalculates AC when unequipping armor', () => {
  const fighter = createFighter({
    equipment: { armor: plateArmor },
    baseAC: 10
  })
  const previousAC = EquipmentService.calculateAC(fighter)
  const state = createGameState({ roster: [fighter] })

  const result = UnequipItemCommand.execute(state, {
    characterId: fighter.id,
    slot: 'ARMOR'
  })

  const updated = result.roster.get(fighter.id)!
  const newAC = EquipmentService.calculateAC(updated)
  expect(newAC).toBeGreaterThan(previousAC) // Higher AC is worse
})
```

**Empty Slot**:
```typescript
test('throws error when unequipping empty slot', () => {
  const fighter = createFighter({
    equipment: { weapon: null }
  })
  const state = createGameState({ roster: [fighter] })

  expect(() => UnequipItemCommand.execute(state, {
    characterId: fighter.id,
    slot: 'WEAPON'
  })).toThrow(SlotEmptyError)
})
```

**Inventory Full**:
```typescript
test('throws error when inventory is full', () => {
  const fullInventory = Array(MAX_INVENTORY_SIZE).fill(null).map(
    () => createItem()
  )
  const fighter = createFighter({
    equipment: { weapon: longSword },
    inventory: fullInventory
  })
  const state = createGameState({ roster: [fighter] })

  expect(() => UnequipItemCommand.execute(state, {
    characterId: fighter.id,
    slot: 'WEAPON'
  })).toThrow(InventoryFullError)
})
```

**Stat Bonus Removal**:
```typescript
test('removes equipment stat bonuses', () => {
  const fighter = createFighter({
    equipment: { weapon: murasama }, // +2 STR
    stats: { str: 16 }
  })
  const state = createGameState({ roster: [fighter] })

  const result = UnequipItemCommand.execute(state, {
    characterId: fighter.id,
    slot: 'WEAPON'
  })

  const updated = result.roster.get(fighter.id)!
  const bonuses = EquipmentService.getEquipmentBonuses(updated)
  expect(bonuses.str).toBe(0) // No STR bonus after unequip
})
```

**Event Creation**:
```typescript
test('creates ITEM_UNEQUIPPED event', () => {
  const fighter = createFighter({
    equipment: { weapon: longSword }
  })
  const state = createGameState({ roster: [fighter] })

  const result = UnequipItemCommand.execute(state, {
    characterId: fighter.id,
    slot: 'WEAPON'
  })

  const lastEvent = result.eventLog[result.eventLog.length - 1]
  expect(lastEvent.type).toBe('ITEM_UNEQUIPPED')
  expect(lastEvent.itemName).toBe('Long Sword')
  expect(lastEvent.slot).toBe('WEAPON')
})
```

## Related

- [EquipmentService](../services/EquipmentService.md) - Equipment management
- [EquipItemCommand](./EquipItemCommand.md) - Equip items
- [DropItemCommand](./DropItemCommand.md) - Drop items from inventory
- [VisitTempleCommand](../temple/VisitTempleCommand.md) - Remove curses at temple
- [Equipment Reference](../research/equipment-reference.md) - All items documented
