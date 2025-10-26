# BuyItemCommand

**Command for purchasing equipment from the shop.**

## Responsibility

Executes item purchase transaction, validates affordability and class restrictions, deducts gold, and adds item to character inventory.

## Command Flow

### Preconditions
1. Must be in SHOP_MENU mode
2. Party must have sufficient gold for item cost
3. Target character must be able to equip item (class restrictions)
4. Character inventory must have space

### Services Called
- `ShopService.canEquip(character, item)` - Validate class can use item
- `ShopService.buyItem(party, item, character)` - Execute purchase

### Events Created
- `BUY_ITEM` event with item details, cost, and character

### State Changes
- Party gold reduced by item cost
- Item added to character inventory
- Shop transaction logged

## API Reference

```typescript
function execute(
  state: GameState,
  itemId: string,
  characterId: string
): GameState
```

**Parameters**:
- `state`: Current game state (must be in SHOP_MENU mode)
- `itemId`: ID of item to purchase
- `characterId`: ID of character receiving item

**Returns**: New game state with item purchased

**Throws**:
- `InvalidStateTransitionError` if not in shop
- `InsufficientGoldError` if party cannot afford item
- `CannotEquipError` if character's class cannot use item
- `InventoryFullError` if character inventory is full
- `ItemNotFoundError` if itemId invalid
- `CharacterNotFoundError` if characterId invalid

**Example**:
```typescript
const fighter = createCharacter({ class: 'Fighter', inventory: [] })
const longSword = { id: 'long_sword', name: 'Long Sword', cost: 25, damage: '1d8' }
const state = createGameState({
  uiMode: 'SHOP_MENU',
  party: { gold: 1000, members: [fighter] }
})

const result = BuyItemCommand.execute(state, 'long_sword', fighter.id)
// result.party.gold === 975 (1000 - 25)
// result.party.members[0].inventory includes longSword
```

## Preconditions

### State Validation
```typescript
// Must be in shop
if (state.uiMode !== 'SHOP_MENU') {
  throw new InvalidStateTransitionError('Must be in shop to buy items')
}
```

### Item Validation
```typescript
// Item must exist in shop catalog
const item = shopCatalog.get(itemId)
if (!item) {
  throw new ItemNotFoundError(`Item ${itemId} not found in shop`)
}
```

### Character Validation
```typescript
// Character must exist
const character = state.party.members.find(m => m.id === characterId)
if (!character) {
  throw new CharacterNotFoundError(`Character ${characterId} not found`)
}

// Character must be able to equip item
if (!ShopService.canEquip(character, item)) {
  throw new CannotEquipError(
    `${character.class} cannot equip ${item.name}`
  )
}

// Character must have inventory space
if (character.inventory.length >= MAX_INVENTORY_SIZE) {
  throw new InventoryFullError('Character inventory is full')
}
```

### Gold Validation
```typescript
// Party must have sufficient gold
if (state.party.gold < item.cost) {
  throw new InsufficientGoldError(
    `${item.name} costs ${item.cost} gold, party has ${state.party.gold}`
  )
}
```

## Services Used

### ShopService
- `canEquip(character, item)` - Check class restrictions
  - Mage: Daggers, staves, robes only
  - Priest: Blunt weapons, no helmets
  - Thief: Daggers, short swords, leather armor
  - Fighter/Samurai/Lord: All equipment
- `buyItem(party, item, character)` - Execute purchase transaction

## Events Created

```typescript
{
  type: 'BUY_ITEM',
  timestamp: Date.now(),
  data: {
    itemId: 'long_sword',
    itemName: 'Long Sword',
    cost: 25,
    characterId: 'char1',
    characterName: 'Galdor',
    characterClass: 'Fighter',
    remainingGold: 975
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('BuyItemCommand', () => {
  it('deducts gold and adds item to inventory', () => {
    const fighter = createCharacter({ class: 'Fighter', inventory: [] })
    const longSword = { id: 'long_sword', cost: 25 }
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [fighter] }
    })
    const result = BuyItemCommand.execute(state, 'long_sword', fighter.id)
    expect(result.party.gold).toBe(75)
    expect(result.party.members[0].inventory).toContainEqual(longSword)
  })

  it('allows mage to buy daggers', () => {
    const mage = createCharacter({ class: 'Mage' })
    const dagger = { id: 'dagger', cost: 5 }
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [mage] }
    })
    const result = BuyItemCommand.execute(state, 'dagger', mage.id)
    expect(result.party.members[0].inventory).toContainEqual(dagger)
  })

  it('allows mage to buy staves', () => {
    const mage = createCharacter({ class: 'Mage' })
    const staff = { id: 'staff', cost: 10 }
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [mage] }
    })
    const result = BuyItemCommand.execute(state, 'staff', mage.id)
    expect(result.party.members[0].inventory).toContainEqual(staff)
  })

  it('prevents mage from buying swords', () => {
    const mage = createCharacter({ class: 'Mage' })
    const sword = { id: 'long_sword', cost: 25 }
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [mage] }
    })
    expect(() => BuyItemCommand.execute(state, 'long_sword', mage.id))
      .toThrow(CannotEquipError)
  })

  it('prevents priest from buying helmets', () => {
    const priest = createCharacter({ class: 'Priest' })
    const helmet = { id: 'helmet', cost: 100, slot: 'helmet' }
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 200, members: [priest] }
    })
    expect(() => BuyItemCommand.execute(state, 'helmet', priest.id))
      .toThrow(CannotEquipError)
  })

  it('allows fighter to buy all equipment types', () => {
    const fighter = createCharacter({ class: 'Fighter' })
    const plateMail = { id: 'plate_mail', cost: 750 }
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 1000, members: [fighter] }
    })
    const result = BuyItemCommand.execute(state, 'plate_mail', fighter.id)
    expect(result.party.members[0].inventory).toContainEqual(plateMail)
  })

  it('throws error if insufficient gold', () => {
    const fighter = createCharacter({ class: 'Fighter' })
    const plateMail = { id: 'plate_mail', cost: 750 }
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [fighter] }
    })
    expect(() => BuyItemCommand.execute(state, 'plate_mail', fighter.id))
      .toThrow(InsufficientGoldError)
  })

  it('throws error if inventory full', () => {
    const fullInventory = new Array(MAX_INVENTORY_SIZE).fill({ id: 'item' })
    const fighter = createCharacter({ inventory: fullInventory })
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 1000, members: [fighter] }
    })
    expect(() => BuyItemCommand.execute(state, 'dagger', fighter.id))
      .toThrow(InventoryFullError)
  })

  it('throws error if not in shop', () => {
    const state = createGameState({ mode: 'TOWN' })
    expect(() => BuyItemCommand.execute(state, 'dagger', 'char1'))
      .toThrow(InvalidStateTransitionError)
  })

  it('throws error if item not found', () => {
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 1000, members: [createCharacter()] }
    })
    expect(() => BuyItemCommand.execute(state, 'invalid_item', 'char1'))
      .toThrow(ItemNotFoundError)
  })

  it('throws error if character not found', () => {
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 1000 }
    })
    expect(() => BuyItemCommand.execute(state, 'dagger', 'invalid_char'))
      .toThrow(CharacterNotFoundError)
  })

  it('creates BUY_ITEM event', () => {
    const fighter = createCharacter({ class: 'Fighter' })
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [fighter] }
    })
    const result = BuyItemCommand.execute(state, 'dagger', fighter.id)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('BUY_ITEM')
  })
})
```

## Related

**Services**:
- [ShopService](../services/ShopService.md) - Buy/sell mechanics
- [EquipmentService](../services/EquipmentService.md) - Equipment stats

**Commands**:
- [VisitShopCommand](./VisitShopCommand.md) - Enter shop
- [SellItemCommand](./SellItemCommand.md) - Sell equipment
- [EquipItemCommand](./EquipItemCommand.md) - Equip purchased item

**Research**:
- [Equipment Reference](../research/equipment-reference.md) - All 80+ items with class restrictions

**Systems**:
- [Town System](../systems/town-system.md) - Shop mechanics
