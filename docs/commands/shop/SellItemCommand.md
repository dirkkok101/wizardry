# SellItemCommand

**Command for selling equipment to the shop.**

## Responsibility

Executes item sale transaction, validates ownership, adds gold to party, and removes item from character inventory.

## Command Flow

### Preconditions
1. Must be in SHOP_MENU mode
2. Character must own the item to sell
3. Item must not be cursed and equipped (cursed items cannot be removed)

### Services Called
- `ShopService.calculateItemValue(item)` - Calculate sell price (50% of buy price)
- `ShopService.sellItem(party, item, character)` - Execute sale

### Events Created
- `SELL_ITEM` event with item details, sell price, and character

### State Changes
- Party gold increased by sell price (50% of original cost)
- Item removed from character inventory
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
- `itemId`: ID of item to sell
- `characterId`: ID of character owning item

**Returns**: New game state with item sold

**Throws**:
- `InvalidStateTransitionError` if not in shop
- `ItemNotOwnedError` if character doesn't have item
- `CannotSellError` if item is cursed and equipped
- `CharacterNotFoundError` if characterId invalid

**Example**:
```typescript
const fighter = createCharacter({
  inventory: [
    { id: 'long_sword', name: 'Long Sword', cost: 25 }
  ]
})
const state = createGameState({
  uiMode: 'SHOP_MENU',
  party: { gold: 100, members: [fighter] }
})

const result = SellItemCommand.execute(state, 'long_sword', fighter.id)
// result.party.gold === 112.5 (100 + 12.5, if 50% sell rate)
// result.party.members[0].inventory no longer includes longSword
```

## Preconditions

### State Validation
```typescript
// Must be in shop
if (state.uiMode !== 'SHOP_MENU') {
  throw new InvalidStateTransitionError('Must be in shop to sell items')
}
```

### Character Validation
```typescript
// Character must exist
const character = state.party.members.find(m => m.id === characterId)
if (!character) {
  throw new CharacterNotFoundError(`Character ${characterId} not found`)
}

// Character must own the item
const item = character.inventory.find(i => i.id === itemId)
if (!item) {
  throw new ItemNotOwnedError(
    `Character does not own item ${itemId}`
  )
}
```

### Item Validation
```typescript
// Cannot sell cursed equipped items
if (item.cursed && isEquipped(character, item)) {
  throw new CannotSellError(
    'Cannot sell cursed equipped item. Visit temple to uncurse first.'
  )
}
```

## Services Used

### ShopService
- `calculateItemValue(item)` - Calculate sell price
  - Formula: `SellPrice = item.cost × 0.5` (50% of buy price)
- `sellItem(party, item, character)` - Execute sale transaction

## Events Created

```typescript
{
  type: 'SELL_ITEM',
  timestamp: Date.now(),
  data: {
    itemId: 'long_sword',
    itemName: 'Long Sword',
    originalCost: 25,
    sellPrice: 12.5,
    characterId: 'char1',
    characterName: 'Galdor',
    newGoldTotal: 112.5
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('SellItemCommand', () => {
  it('adds 50% gold and removes item from inventory', () => {
    const longSword = { id: 'long_sword', cost: 25 }
    const fighter = createCharacter({ inventory: [longSword] })
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [fighter] }
    })
    const result = SellItemCommand.execute(state, 'long_sword', fighter.id)
    expect(result.party.gold).toBe(112.5) // 100 + (25 × 0.5)
    expect(result.party.members[0].inventory).not.toContainEqual(longSword)
  })

  it('calculates sell price correctly for expensive items', () => {
    const plateMail = { id: 'plate_mail', cost: 750 }
    const fighter = createCharacter({ inventory: [plateMail] })
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 0, members: [fighter] }
    })
    const result = SellItemCommand.execute(state, 'plate_mail', fighter.id)
    expect(result.party.gold).toBe(375) // 750 × 0.5
  })

  it('allows selling unequipped items', () => {
    const dagger = { id: 'dagger', cost: 5, equipped: false }
    const thief = createCharacter({ inventory: [dagger] })
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [thief] }
    })
    const result = SellItemCommand.execute(state, 'dagger', thief.id)
    expect(result.party.gold).toBe(102.5)
  })

  it('allows selling equipped non-cursed items', () => {
    const longSword = { id: 'long_sword', cost: 25, equipped: true, cursed: false }
    const fighter = createCharacter({
      inventory: [longSword],
      equipment: { weapon: longSword }
    })
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [fighter] }
    })
    const result = SellItemCommand.execute(state, 'long_sword', fighter.id)
    expect(result.party.gold).toBe(112.5)
  })

  it('prevents selling cursed equipped items', () => {
    const cursedSword = {
      id: 'cursed_sword',
      cost: 1000,
      equipped: true,
      cursed: true
    }
    const fighter = createCharacter({
      inventory: [cursedSword],
      equipment: { weapon: cursedSword }
    })
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [fighter] }
    })
    expect(() => SellItemCommand.execute(state, 'cursed_sword', fighter.id))
      .toThrow(CannotSellError)
  })

  it('throws error if character does not own item', () => {
    const fighter = createCharacter({ inventory: [] })
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [fighter] }
    })
    expect(() => SellItemCommand.execute(state, 'long_sword', fighter.id))
      .toThrow(ItemNotOwnedError)
  })

  it('throws error if not in shop', () => {
    const state = createGameState({ mode: 'TOWN' })
    expect(() => SellItemCommand.execute(state, 'dagger', 'char1'))
      .toThrow(InvalidStateTransitionError)
  })

  it('throws error if character not found', () => {
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100 }
    })
    expect(() => SellItemCommand.execute(state, 'dagger', 'invalid_char'))
      .toThrow(CharacterNotFoundError)
  })

  it('creates SELL_ITEM event', () => {
    const dagger = { id: 'dagger', cost: 5 }
    const fighter = createCharacter({ inventory: [dagger] })
    const state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [fighter] }
    })
    const result = SellItemCommand.execute(state, 'dagger', fighter.id)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('SELL_ITEM')
  })

  it('can sell multiple items sequentially', () => {
    const dagger = { id: 'dagger', cost: 5 }
    const staff = { id: 'staff', cost: 10 }
    const mage = createCharacter({ inventory: [dagger, staff] })
    let state = createGameState({
      uiMode: 'SHOP_MENU',
      party: { gold: 100, members: [mage] }
    })

    state = SellItemCommand.execute(state, 'dagger', mage.id)
    expect(state.party.gold).toBe(102.5)

    state = SellItemCommand.execute(state, 'staff', mage.id)
    expect(state.party.gold).toBe(107.5)
  })
})
```

## Related

**Services**:
- [ShopService](../services/ShopService.md) - Buy/sell mechanics
- [TempleService](../services/TempleService.md) - Uncursing items

**Commands**:
- [VisitShopCommand](./VisitShopCommand.md) - Enter shop
- [BuyItemCommand](./BuyItemCommand.md) - Purchase equipment
- [UnequipItemCommand](../character/UnequipItemCommand.md) - Unequip before selling

**Research**:
- [Equipment Reference](../research/equipment-reference.md) - Item values and cursed items

**Systems**:
- [Town System](../systems/town-system.md) - Shop mechanics
