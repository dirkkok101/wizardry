# VisitShopCommand

**Command for entering the shop to buy and sell equipment.**

## Responsibility

Transitions party to shop service mode, allowing access to equipment purchase, item selling, and item identification.

## Command Flow

### Preconditions
1. Party must be in TOWN mode
2. Party must have at least 1 conscious member

### Services Called
- `TownService.canAccessShop(party)` - Validate shop access

### Events Created
- `VISIT_SHOP` event with timestamp and party gold

### State Changes
- `state.uiMode` changes to `SHOP_MENU`
- Shop menu displayed with available equipment

## API Reference

```typescript
function execute(state: GameState): GameState
```

**Parameters**:
- `state`: Current game state (must be in TOWN mode)

**Returns**: New game state with shop menu active

**Throws**:
- `InvalidStateTransitionError` if not in town
- `NoConsciousMembersError` if no conscious members

**Example**:
```typescript
const state = createGameState({
  mode: 'TOWN',
  party: {
    gold: 1000,
    members: [createCharacter({ class: 'Fighter' })]
  }
})

const result = VisitShopCommand.execute(state)
// result.uiMode === 'SHOP_MENU'
// result.eventLog includes VISIT_SHOP event
```

## Preconditions

### State Validation
```typescript
// Must be in town
if (state.mode !== 'TOWN') {
  throw new InvalidStateTransitionError('Must be in town to visit shop')
}
```

### Party Validation
```typescript
// Must have at least one conscious member
const consciousMembers = state.party.members.filter(m => m.status === 'alive')
if (consciousMembers.length === 0) {
  throw new NoConsciousMembersError('No conscious members to visit shop')
}
```

## Services Used

### TownService
- `canAccessShop(party)` - Validate shop access (always true with conscious member)

### ShopService (available after entering)
- `getBuyableItems(partyGold, characterClass)` - Get available items
- `getEquipmentBySlot(slot, characterClass)` - Filter by equipment slot
- `canEquip(character, item)` - Check class restrictions

## Events Created

```typescript
{
  type: 'VISIT_SHOP',
  timestamp: Date.now(),
  data: {
    partyGold: 1000,
    partyMembers: [
      { id: 'char1', class: 'Fighter', canBuy: true },
      { id: 'char2', class: 'Mage', canBuy: true }
    ]
  }
}
```

## Testing

**Key test cases**:
```typescript
describe('VisitShopCommand', () => {
  it('transitions to shop menu', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [createCharacter()] }
    })
    const result = VisitShopCommand.execute(state)
    expect(result.uiMode).toBe('SHOP_MENU')
  })

  it('allows shop visit with any conscious member', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ status: 'alive' }),
          createCharacter({ status: 'dead' })
        ]
      }
    })
    const result = VisitShopCommand.execute(state)
    expect(result.uiMode).toBe('SHOP_MENU')
  })

  it('allows shop visit even with no gold', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { gold: 0, members: [createCharacter()] }
    })
    const result = VisitShopCommand.execute(state)
    expect(result.uiMode).toBe('SHOP_MENU')
  })

  it('throws error if not in town', () => {
    const state = createGameState({ mode: 'NAVIGATION' })
    expect(() => VisitShopCommand.execute(state))
      .toThrow(InvalidStateTransitionError)
  })

  it('throws error if no conscious members', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: {
        members: [
          createCharacter({ status: 'dead' }),
          createCharacter({ status: 'ashes' })
        ]
      }
    })
    expect(() => VisitShopCommand.execute(state))
      .toThrow(NoConsciousMembersError)
  })

  it('creates VISIT_SHOP event', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { members: [createCharacter()] }
    })
    const result = VisitShopCommand.execute(state)
    const event = result.eventLog[result.eventLog.length - 1]
    expect(event.type).toBe('VISIT_SHOP')
  })

  it('preserves party gold amount', () => {
    const state = createGameState({
      mode: 'TOWN',
      party: { gold: 1500, members: [createCharacter()] }
    })
    const result = VisitShopCommand.execute(state)
    expect(result.party.gold).toBe(1500)
  })
})
```

## Related

**Services**:
- [ShopService](../services/ShopService.md) - Buy/sell equipment
- [TownService](../services/TownService.md) - Shop access validation

**Commands**:
- [BuyItemCommand](./BuyItemCommand.md) - Purchase equipment
- [SellItemCommand](./SellItemCommand.md) - Sell equipment
- [EnterTownCommand](../meta/EnterTownCommand.md) - Enter town

**Research**:
- [Equipment Reference](../research/equipment-reference.md) - All 80+ items

**Systems**:
- [Town System](../systems/town-system.md) - Town services overview
