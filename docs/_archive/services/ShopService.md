# ShopService

**Pure function service for shop buy/sell operations and equipment management.**

## Responsibility

Manages shop transactions including buying equipment, selling items, price calculation, and equipment identification.

## API Reference

### buyItem

Purchase item from shop.

**Signature**:
```typescript
function buyItem(
  party: Party,
  item: Item,
  character: Character
): BuyResult
```

**Parameters**:
- `party`: Party making purchase
- `item`: Item to buy
- `character`: Character receiving item

**Returns**: Buy result with updated party gold and character inventory

**Throws**:
- `InsufficientGoldError` if party cannot afford item
- `InventoryFullError` if character inventory is full
- `CannotEquipError` if character's class cannot use item

**Example**:
```typescript
const party = createParty({ gold: 1000 })
const fighter = createCharacter({ class: 'Fighter' })
const longSword = { name: 'Long Sword', cost: 25, damage: '1d8' }

const result = ShopService.buyItem(party, longSword, fighter)
// result.party.gold = 975 (1000 - 25)
// result.character.inventory includes longSword
```

### sellItem

Sell item to shop.

**Signature**:
```typescript
function sellItem(
  party: Party,
  item: Item,
  character: Character
): SellResult
```

**Parameters**:
- `party`: Party selling item
- `item`: Item to sell
- `character`: Character owning item

**Returns**: Sell result with updated party gold and character inventory

**Price Formula**:
```typescript
SellPrice = BuyPrice × 0.5  // 50% of buy price
// Needs confirmation from sources
```

**Throws**:
- `ItemNotOwnedError` if character doesn't have item
- `CannotSellError` if item is cursed and equipped

**Example**:
```typescript
const party = createParty({ gold: 100 })
const fighter = createCharacter({
  inventory: [{ name: 'Long Sword', cost: 25 }]
})

const result = ShopService.sellItem(party, longSword, fighter)
// result.party.gold = 112.5 (100 + 12.5, if 50% sell rate)
// result.character.inventory no longer includes longSword
```

### identifyItem

Identify unknown item.

**Signature**:
```typescript
function identifyItem(
  item: Item,
  identifier: Character,
  paymentGold: number
): IdentifyResult
```

**Parameters**:
- `item`: Unidentified item
- `identifier`: Bishop or character identifying (optional)
- `paymentGold`: Gold paid for shop identification

**Returns**: Identify result revealing item properties

**Methods**:
- Shop identification: Costs gold, 100% success
- Bishop identification: Free, automatic (class ability)

**Reveals**:
- True item name (vs cursed name)
- Bonuses/penalties
- Cursed status
- Special properties

**Example**:
```typescript
const unknown = {
  name: 'Long Sword +1',
  identified: false,
  actualName: 'Long Sword -1',  // Cursed!
  cursed: true
}
const bishop = createCharacter({ class: 'Bishop' })

const result = ShopService.identifyItem(unknown, bishop, 0)
// result.item.identified = true
// result.item.name = 'Long Sword -1'
// result.item.cursed = true (revealed)
```

### canEquip

Check if character can equip item.

**Signature**:
```typescript
function canEquip(
  character: Character,
  item: Item
): boolean
```

**Parameters**:
- `character`: Character attempting to equip
- `item`: Item to equip

**Returns**: True if character's class can equip item

**Class Restrictions**:
- Mage: Daggers, staves, robes only
- Priest: Blunt weapons (maces, staves), no helmets
- Thief: Daggers, short swords, leather armor
- Ninja: Best AC unarmored
- Fighter/Samurai/Lord: All weapons and armor

**Example**:
```typescript
const mage = createCharacter({ class: 'Mage' })
const sword = { name: 'Long Sword', type: 'weapon', weaponType: 'sword' }

const canUse = ShopService.canEquip(mage, sword)
// Result: false (mages cannot use swords)

const staff = { name: 'Staff', type: 'weapon', weaponType: 'staff' }
const canUseStaff = ShopService.canEquip(mage, staff)
// Result: true (mages can use staves)
```

### getBuyableItems

Get items available for purchase at shop.

**Signature**:
```typescript
function getBuyableItems(
  partyGold: number,
  characterClass?: Class
): Item[]
```

**Parameters**:
- `partyGold`: Available gold
- `characterClass`: Optional filter by class (shows usable items only)

**Returns**: Array of items party can afford

**Example**:
```typescript
const items = ShopService.getBuyableItems(1000, 'Fighter')
// Result: [
//   { name: 'Dagger', cost: 5, ... },
//   { name: 'Staff', cost: 10, ... },
//   { name: 'Short Sword', cost: 15, ... },
//   { name: 'Long Sword', cost: 25, ... },
//   ... (all items ≤ 1000 gold, usable by Fighter)
// ]
```

### calculateItemValue

Calculate sell value of item.

**Signature**:
```typescript
function calculateItemValue(item: Item): number
```

**Parameters**:
- `item`: Item to calculate value

**Returns**: Sell price to shop

**Formula**:
```typescript
SellPrice = item.cost × 0.5  // 50% of original cost
```

**Example**:
```typescript
const plateMail = { name: 'Plate Mail', cost: 750 }

const value = ShopService.calculateItemValue(plateMail)
// Result: 375 gold (50% of 750)
```

### getEquipmentBySlot

Get available equipment for specific slot.

**Signature**:
```typescript
function getEquipmentBySlot(
  slot: EquipmentSlot,
  characterClass: Class
): Item[]
```

**Parameters**:
- `slot`: Equipment slot (weapon, armor, shield, helmet, gauntlets, accessory)
- `characterClass`: Character's class

**Returns**: Items for that slot usable by class

**Example**:
```typescript
const weapons = ShopService.getEquipmentBySlot('weapon', 'Mage')
// Result: [
//   { name: 'Dagger', damage: '1d4', cost: 5 },
//   { name: 'Staff', damage: '1d5', cost: 10 },
//   { name: 'Dagger +1', damage: '2d3', cost: 8000 },
//   ... (only dagger/staff variants)
// ]

const armor = ShopService.getEquipmentBySlot('armor', 'Fighter')
// Result: [All armor types, Fighter can wear all]
```

## Dependencies

Uses:
- `ValidationService` (validate gold, inventory space, class restrictions)
- `EquipmentService` (equipment stat bonuses)

## Testing

See [ShopService.test.ts](../../tests/services/ShopService.test.ts)

**Key test cases**:
- Buy item deducts gold
- Buy item adds to inventory
- Insufficient gold throws error
- Sell item adds 50% gold
- Sell item removes from inventory
- Cannot sell cursed equipped items
- Identify reveals true properties
- Identify reveals cursed status
- Bishop identifies for free
- Class restrictions enforced
- Available items filtered by gold
- Equipment sorted by slot
- Mage cannot buy swords
- Priest cannot buy helmets

## Related

- [Equipment Reference](../research/equipment-reference.md) - All 80+ items
- [BuyItemCommand](../commands/BuyItemCommand.md) - Uses this service
- [SellItemCommand](../commands/SellItemCommand.md) - Uses this service
- [EquipmentService](./EquipmentService.md) - Equipment management
- [TownService](./TownService.md) - Shop access validation
- [Town System](../systems/town-system.md) - Town services overview
