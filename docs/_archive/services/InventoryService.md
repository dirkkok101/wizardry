# InventoryService

**Pure function service for inventory management and item operations.**

## Responsibility

Manages character and party inventory, item acquisition, item dropping, weight/capacity limits, item stacking, and treasure distribution. Handles item transfers between characters and party storage.

## API Reference

### addItem

Add item to character inventory.

**Signature**:
```typescript
function addItem(
  character: Character,
  item: Item
): Character
```

**Parameters**:
- `character`: Character receiving item
- `item`: Item to add

**Returns**: New character with item added

**Throws**:
- `InventoryFullError` if inventory at capacity

**Example**:
```typescript
const updated = InventoryService.addItem(
  fighter,
  { id: "potion-1", name: "Healing Potion", type: "CONSUMABLE" }
)
// updated.inventory includes healing potion
```

### removeItem

Remove item from character inventory.

**Signature**:
```typescript
function removeItem(
  character: Character,
  itemId: string
): Character
```

**Parameters**:
- `character`: Character with item
- `itemId`: Item ID to remove

**Returns**: New character without item

**Throws**:
- `ItemNotFoundError` if item not in inventory

**Example**:
```typescript
const updated = InventoryService.removeItem(fighter, "potion-1")
// Healing potion removed from inventory
```

### dropItem

Drop item on ground (at current position).

**Signature**:
```typescript
function dropItem(
  character: Character,
  itemId: string,
  position: Position
): DropItemResult
```

**Parameters**:
- `character`: Character dropping item
- `itemId`: Item to drop
- `position`: Current dungeon position

**Returns**: Result with updated character and ground item

**Example**:
```typescript
const result = InventoryService.dropItem(
  fighter,
  "iron-sword",
  { x: 5, y: 10, level: 1, facing: 'north' }
)
// result.character: Fighter without iron sword
// result.groundItem: Iron sword at (5,10) on level 1
```

### pickupItem

Pick up item from ground.

**Signature**:
```typescript
function pickupItem(
  character: Character,
  item: Item
): Character
```

**Parameters**:
- `character`: Character picking up item
- `item`: Item on ground

**Returns**: New character with item

**Throws**:
- `InventoryFullError` if no space

**Example**:
```typescript
const updated = InventoryService.pickupItem(fighter, groundItem)
// updated.inventory includes picked up item
```

### transferItem

Transfer item between characters.

**Signature**:
```typescript
function transferItem(
  fromCharacter: Character,
  toCharacter: Character,
  itemId: string
): TransferResult
```

**Parameters**:
- `fromCharacter`: Character giving item
- `toCharacter`: Character receiving item
- `itemId`: Item to transfer

**Returns**: Result with both characters updated

**Throws**:
- `ItemNotFoundError` if item not owned by sender
- `InventoryFullError` if recipient inventory full

**Example**:
```typescript
const result = InventoryService.transferItem(
  fighter,
  mage,
  "healing-potion"
)
// result.from: Fighter without potion
// result.to: Mage with potion
```

### getInventoryWeight

Calculate total inventory weight.

**Signature**:
```typescript
function getInventoryWeight(character: Character): number
```

**Parameters**:
- `character`: Character to check

**Returns**: Total weight in pounds

**Example**:
```typescript
const weight = InventoryService.getInventoryWeight(fighter)
// weight = 85 (equipped + inventory weight)
```

### canCarryItem

Check if character can carry additional item.

**Signature**:
```typescript
function canCarryItem(
  character: Character,
  item: Item
): boolean
```

**Parameters**:
- `character`: Character to check
- `item`: Item to potentially add

**Returns**: True if character can carry item

**Formula**: STR determines max carry weight

**Example**:
```typescript
if (InventoryService.canCarryItem(mage, plateArmor)) {
  // False: Mage has low STR, cannot carry heavy armor
}
```

### stackItems

Stack identical items (potions, scrolls, arrows).

**Signature**:
```typescript
function stackItems(character: Character): Character
```

**Parameters**:
- `character`: Character with inventory

**Returns**: Character with stacked items

**Example**:
```typescript
const stacked = InventoryService.stackItems(fighter)
// 5 separate healing potions → 1 stack of 5 potions
```

### splitStack

Split item stack.

**Signature**:
```typescript
function splitStack(
  character: Character,
  itemId: string,
  amount: number
): Character
```

**Parameters**:
- `character`: Character with stacked item
- `itemId`: Stacked item ID
- `amount`: Amount to split off

**Returns**: Character with split stack

**Example**:
```typescript
const split = InventoryService.splitStack(fighter, "potion-stack", 2)
// Stack of 5 potions → stack of 3 + stack of 2
```

### getInventoryValue

Calculate total gold value of inventory.

**Signature**:
```typescript
function getInventoryValue(character: Character): number
```

**Parameters**:
- `character`: Character to check

**Returns**: Total value in gold pieces

**Example**:
```typescript
const value = InventoryService.getInventoryValue(fighter)
// value = 12500 gold (total sell value)
```

### sortInventory

Sort inventory by type, value, or name.

**Signature**:
```typescript
function sortInventory(
  character: Character,
  sortBy: 'TYPE' | 'VALUE' | 'NAME'
): Character
```

**Parameters**:
- `character`: Character to sort
- `sortBy`: Sort criteria

**Returns**: Character with sorted inventory

**Example**:
```typescript
const sorted = InventoryService.sortInventory(fighter, 'TYPE')
// Inventory sorted: Weapons, Armor, Consumables, Misc
```

### distributeTreasure

Distribute treasure among party.

**Signature**:
```typescript
function distributeTreasure(
  party: Party,
  treasure: Treasure
): Party
```

**Parameters**:
- `party`: Current party
- `treasure`: Treasure to distribute (gold + items)

**Returns**: Party with treasure distributed

**Distribution**:
- Gold: Split evenly among living members
- Items: Added to party inventory or random members

**Example**:
```typescript
const updated = InventoryService.distributeTreasure(
  party,
  { gold: 6000, items: [sword, shield, potion] }
)
// Gold: 1000 per member (6 members)
// Items: Distributed to characters with space
```

### getPartyInventory

Get combined inventory of all party members.

**Signature**:
```typescript
function getPartyInventory(party: Party): Item[]
```

**Parameters**:
- `party`: Current party

**Returns**: Array of all items across party

**Example**:
```typescript
const items = InventoryService.getPartyInventory(party)
// All items from all 6 party members combined
```

### hasItem

Check if character has specific item.

**Signature**:
```typescript
function hasItem(
  character: Character,
  itemName: string
): boolean
```

**Parameters**:
- `character`: Character to check
- `itemName`: Item name to find

**Returns**: True if character has item

**Example**:
```typescript
if (InventoryService.hasItem(thief, "Bronze Key")) {
  // Thief has bronze key to open door
}
```

### getItemByName

Get item from inventory by name.

**Signature**:
```typescript
function getItemByName(
  character: Character,
  itemName: string
): Item | null
```

**Parameters**:
- `character`: Character to search
- `itemName`: Item name

**Returns**: Item if found, null otherwise

**Example**:
```typescript
const key = InventoryService.getItemByName(thief, "Silver Key")
// key: { id: "key-2", name: "Silver Key", ... }
```

### canPickupBody

Check if party can pick up character body (for recovery).

**Signature**:
```typescript
function canPickupBody(
  party: Party,
  body: CharacterBody
): boolean
```

**Parameters**:
- `party`: Current party
- `body`: Dead character body

**Returns**: True if party has space/capacity

**Example**:
```typescript
if (InventoryService.canPickupBody(party, deadMage)) {
  // Can retrieve body for temple resurrection
}
```

## Dependencies

Uses:
- `items.json` - Item database
- `CharacterService` - STR-based carry capacity

## Testing

See [InventoryService.test.ts](../../tests/services/InventoryService.test.ts)

**Key test cases**:
- Add/remove items
- Inventory capacity limits
- Item transfers between characters
- Weight calculation (STR-based)
- Item stacking (potions, scrolls)
- Stack splitting
- Inventory sorting (type, value, name)
- Treasure distribution to party
- Party-wide inventory lookup
- Item search by name
- Body recovery mechanics

## Related

- [Items & Equipment](../game-design/11-items-equipment.md) - Player guide
- [Equipment Reference](../research/equipment-reference.md) - All items
- [DropItemCommand](../commands/DropItemCommand.md) - Uses this service
- [EquipmentService](./EquipmentService.md) - Equipment management
