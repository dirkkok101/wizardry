# DropItemCommand

**Drop item from character inventory onto dungeon floor.**

## Responsibility

Removes item from character's inventory and places it on the current dungeon tile, allowing party to free inventory space or leave items for later retrieval. Dropped items remain on the map until picked up or party wipes.

## Command Flow

### Preconditions
1. Item exists in character's inventory (not equipped)
2. Character is alive and not ashed
3. Party is in dungeon (not in town)
4. Current tile can hold items (not a wall or special tile)

### Services Called
1. **InventoryService.removeItem** - Remove from character inventory
2. **DungeonService.placeItemOnTile** - Place item on current tile
3. **EventService.createEvent** - Log drop event

### Events Created
```typescript
{
  type: "ITEM_DROPPED",
  characterId: string,
  itemId: string,
  itemName: string,
  position: Position,
  timestamp: number
}
```

### State Changes
1. Item removed from character inventory
2. Item placed on dungeon tile at party position
3. Tile item collection updated
4. Event added to game log

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
- `params.characterId` - Character dropping item
- `params.itemId` - Item to drop

**Returns**: New game state with item dropped on tile

**Throws**:
- `CharacterNotFoundError` - Character ID invalid
- `ItemNotFoundError` - Item not in character inventory
- `ItemEquippedError` - Item is equipped (must unequip first)
- `InvalidLocationError` - Cannot drop items in town or on special tiles
- `CharacterDeadError` - Cannot drop items when dead/ashed

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
// Item must be in character's inventory (not equipped)
const item = character.inventory.find(i => i.id === itemId)
if (!item) throw new ItemNotFoundError()

// Check item is not currently equipped
const isEquipped = Object.values(character.equipment).some(
  equippedItem => equippedItem?.id === itemId
)
if (isEquipped) {
  throw new ItemEquippedError('Must unequip item before dropping')
}
```

### Location Validation
```typescript
// Must be in dungeon to drop items
if (state.mode !== 'NAVIGATION' && state.mode !== 'CAMP') {
  throw new InvalidLocationError('Can only drop items in dungeon')
}

// Check current tile can hold items
const currentTile = DungeonService.getTile(
  state.dungeon,
  state.party.position
)
if (currentTile.type === 'WALL' || currentTile.special === 'STAIRS') {
  throw new InvalidLocationError('Cannot drop items on this tile')
}
```

## Services Used

### InventoryService
- **removeItem** - Remove item from character inventory

### DungeonService
- **placeItemOnTile** - Add item to tile's item collection
- **getTile** - Validate tile can hold items

### EventService
- **createEvent** - Create ITEM_DROPPED event

## Events Created

### ITEM_DROPPED Event
```typescript
{
  id: "evt-12347",
  type: "ITEM_DROPPED",
  timestamp: 1635725000000,
  characterId: "char-abc",
  characterName: "Gandalf",
  itemId: "item-potion-456",
  itemName: "Potion of Healing",
  position: {
    x: 10,
    y: 15,
    level: 3,
    facing: 'NORTH'
  },
  reason: "inventory_management"
}
```

## Testing

### Test Cases

**Basic Drop**:
```typescript
test('drops item from inventory to dungeon tile', () => {
  const fighter = createFighter({
    inventory: [potion, scroll, sword]
  })
  const state = createGameState({
    mode: 'NAVIGATION',
    roster: [fighter],
    party: { position: { x: 10, y: 10, level: 1 } }
  })

  const result = DropItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: potion.id
  })

  const updated = result.roster.get(fighter.id)!
  expect(updated.inventory).not.toContain(potion)
  expect(updated.inventory.length).toBe(2)

  const tile = DungeonService.getTile(result.dungeon, { x: 10, y: 10, level: 1 })
  expect(tile.items).toContain(potion)
})
```

**Cannot Drop Equipped Item**:
```typescript
test('prevents dropping equipped item', () => {
  const fighter = createFighter({
    inventory: [potion],
    equipment: { weapon: longSword }
  })
  const state = createGameState({
    mode: 'NAVIGATION',
    roster: [fighter]
  })

  expect(() => DropItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: longSword.id
  })).toThrow(ItemEquippedError)
})
```

**Cannot Drop in Town**:
```typescript
test('prevents dropping items in town', () => {
  const fighter = createFighter({ inventory: [potion] })
  const state = createGameState({
    mode: 'TOWN',
    roster: [fighter]
  })

  expect(() => DropItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: potion.id
  })).toThrow(InvalidLocationError)
})
```

**Cannot Drop on Special Tiles**:
```typescript
test('prevents dropping on stairs tile', () => {
  const fighter = createFighter({ inventory: [potion] })
  const state = createGameState({
    mode: 'NAVIGATION',
    roster: [fighter],
    party: { position: { x: 5, y: 5, level: 1 } }
  })
  // Tile at (5,5) is stairs
  const dungeon = createDungeon({
    tiles: [{ x: 5, y: 5, type: 'FLOOR', special: 'STAIRS_DOWN' }]
  })

  expect(() => DropItemCommand.execute(
    { ...state, dungeon },
    { characterId: fighter.id, itemId: potion.id }
  )).toThrow(InvalidLocationError)
})
```

**Item Not in Inventory**:
```typescript
test('throws error when item not in inventory', () => {
  const fighter = createFighter({ inventory: [] })
  const state = createGameState({ roster: [fighter] })

  expect(() => DropItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: 'non-existent-item'
  })).toThrow(ItemNotFoundError)
})
```

**Multiple Items on Tile**:
```typescript
test('adds item to tile with existing items', () => {
  const fighter = createFighter({ inventory: [newPotion] })
  const existingItems = [oldSword, oldArmor]
  const state = createGameState({
    mode: 'NAVIGATION',
    roster: [fighter],
    party: { position: { x: 10, y: 10, level: 1 } },
    dungeon: createDungeon({
      tiles: [{
        x: 10, y: 10, type: 'FLOOR',
        items: existingItems
      }]
    })
  })

  const result = DropItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: newPotion.id
  })

  const tile = DungeonService.getTile(
    result.dungeon,
    { x: 10, y: 10, level: 1 }
  )
  expect(tile.items).toHaveLength(3)
  expect(tile.items).toContain(newPotion)
})
```

**Event Creation**:
```typescript
test('creates ITEM_DROPPED event', () => {
  const fighter = createFighter({ inventory: [potion] })
  const state = createGameState({
    mode: 'NAVIGATION',
    roster: [fighter],
    party: { position: { x: 10, y: 15, level: 3 } }
  })

  const result = DropItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: potion.id
  })

  const lastEvent = result.eventLog[result.eventLog.length - 1]
  expect(lastEvent.type).toBe('ITEM_DROPPED')
  expect(lastEvent.itemName).toBe('Potion of Healing')
  expect(lastEvent.position).toEqual({ x: 10, y: 15, level: 3 })
})
```

## Related

- [InventoryService](../services/InventoryService.md) - Inventory management
- [DungeonService](../services/DungeonService.md) - Tile and item placement
- [EquipItemCommand](./EquipItemCommand.md) - Equip items
- [UnequipItemCommand](./UnequipItemCommand.md) - Unequip items first
- [SearchCommand](./SearchCommand.md) - Find dropped items on tiles
- [Items & Equipment](../game-design/11-items-equipment.md) - Player guide
