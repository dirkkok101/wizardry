# Task 14: Shop Component - Identify Flow Implementation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete item identification functionality in Shop component with unidentified item display, identification cost (100 gold), property revelation, and curse detection

**Architecture:** Extend existing ShopComponent (buy and sell flows already complete) with identify flow - 100 gold flat fee, reveal true name and properties, handle cursed items

**Tech Stack:** Angular 20, TypeScript 5.5+, Jest, Signals API, standalone components, TDD methodology

**Prerequisites:** Tasks 1-13 complete (ShopService, shop buy/sell flows)

**Estimated Duration:** 1 day | **Target:** 15 new tests (40 total ShopComponent tests)

---

## Part 1: Add Unidentified Items to Shop Inventory

### Step 1: Write failing tests for unidentified items

**Files:**
- Modify: `src/data/__tests__/shop-inventory.spec.ts` (create if not exists)

```typescript
// src/data/__tests__/shop-inventory.spec.ts
import { SHOP_INVENTORY, UNIDENTIFIED_ITEMS } from '../shop-inventory'
import { ItemType } from '../../types/ItemType'

describe('Shop Inventory', () => {
  describe('regular inventory', () => {
    it('contains identified items', () => {
      const allIdentified = SHOP_INVENTORY.every(item => item.identified === true)
      expect(allIdentified).toBe(true)
    })

    it('contains no cursed items', () => {
      const noCursed = SHOP_INVENTORY.every(item => item.cursed === false)
      expect(noCursed).toBe(true)
    })
  })

  describe('unidentified items', () => {
    it('contains unidentified items for testing', () => {
      expect(UNIDENTIFIED_ITEMS.length).toBeGreaterThan(0)
    })

    it('all items are unidentified', () => {
      const allUnidentified = UNIDENTIFIED_ITEMS.every(item => item.identified === false)
      expect(allUnidentified).toBe(true)
    })

    it('includes some cursed items', () => {
      const hasCursed = UNIDENTIFIED_ITEMS.some(item => item.cursed === true)
      expect(hasCursed).toBe(true)
    })

    it('has unidentifiedName for display', () => {
      UNIDENTIFIED_ITEMS.forEach(item => {
        expect(item.unidentifiedName).toBeDefined()
        expect(item.unidentifiedName).not.toBe(item.name)
      })
    })
  })
})
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="shop-inventory"`

Expected: FAIL (UNIDENTIFIED_ITEMS not exported)

### Step 3: Add unidentified items to shop inventory

**Files:**
- Modify: `src/data/shop-inventory.ts`

Add unidentified items:

```typescript
/**
 * Unidentified items for testing identification mechanics
 * These are not for sale but can be found in character inventories
 */
export const UNIDENTIFIED_ITEMS: Item[] = [
  {
    id: 'unknown-sword-1',
    name: 'Sharpened Blade',
    unidentifiedName: 'Unknown Sword',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 250,
    damage: 12,
    cursed: false,
    identified: false,
    equipped: false,
    description: 'A finely crafted sword with excellent balance'
  },
  {
    id: 'unknown-armor-1',
    name: 'Reinforced Mail',
    unidentifiedName: 'Unknown Armor',
    type: ItemType.ARMOR,
    slot: ItemSlot.ARMOR,
    price: 400,
    defense: 5,
    cursed: false,
    identified: false,
    equipped: false,
    description: 'Heavy armor with reinforced plating'
  },
  {
    id: 'cursed-sword-1',
    name: 'Blade of Despair',
    unidentifiedName: 'Mysterious Sword',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 500,
    damage: 15,
    cursed: true,
    identified: false,
    equipped: false,
    description: 'A powerful but cursed weapon that cannot be removed once equipped'
  },
  {
    id: 'cursed-armor-1',
    name: 'Cursed Plate',
    unidentifiedName: 'Heavy Armor',
    type: ItemType.ARMOR,
    slot: ItemSlot.ARMOR,
    price: 600,
    defense: 8,
    cursed: true,
    identified: false,
    equipped: false,
    description: 'Excellent protection, but binds to the wearer permanently'
  }
]
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="shop-inventory"`

Expected: PASS

### Step 5: Commit

```bash
git add src/data/shop-inventory.ts src/data/__tests__/shop-inventory.spec.ts
git commit -m "feat(shop): add unidentified items for identification testing

- 4 unidentified items (2 normal, 2 cursed)
- All have unidentifiedName for display
- Mix of weapons and armor
- Tests verify identified=false and unidentifiedName set
- 6 tests passing

Part of Phase 5: Shop identify flow implementation"
```

---

## Part 2: Display Unidentified Items

### Step 1: Write failing tests for unidentified item display

**Files:**
- Modify: `src/app/shop/shop.component.spec.ts`

Add to existing test file:

```typescript
import { UNIDENTIFIED_ITEMS } from '../../data/shop-inventory'

  describe('identify flow', () => {
    beforeEach(() => {
      // Create character with unidentified items
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [UNIDENTIFIED_ITEMS[0], UNIDENTIFIED_ITEMS[2]] // 1 normal, 1 cursed
        }),
        party: {
          ...state.party,
          members: ['char-1'],
          gold: 500
        }
      }))

      component.selectCharacter('char-1')
      component.handleMenuSelect('identify')
    })

    it('displays only unidentified items', () => {
      const unidentified = component.getUnidentifiedItems()

      expect(unidentified.length).toBe(2)
      expect(unidentified.every(item => !item.identified)).toBe(true)
    })

    it('shows unidentifiedName instead of true name', () => {
      const unidentified = component.getUnidentifiedItems()

      expect(unidentified[0].unidentifiedName).toBe('Unknown Sword')
      expect(unidentified[0].name).not.toBe('Unknown Sword')
    })

    it('shows empty message when no unidentified items', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [] // Empty inventory
        })
      }))

      const unidentified = component.getUnidentifiedItems()

      expect(unidentified.length).toBe(0)
    })

    it('displays identification cost (100 gold flat)', () => {
      const cost = component.getIdentifyCost()

      expect(cost).toBe(100)
    })
  })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: FAIL (getUnidentifiedItems/getIdentifyCost not implemented)

### Step 3: Implement unidentified item display methods

**Files:**
- Modify: `src/app/shop/shop.component.ts`

Add to ShopComponent:

```typescript
  /**
   * Get unidentified items from character inventory
   */
  getUnidentifiedItems(): Item[] {
    const inventory = this.getCharacterInventory()

    return inventory.filter(item => !item.identified)
  }

  /**
   * Get identification cost (uses ShopService)
   */
  getIdentifyCost(): number {
    // Flat 100 gold fee for any item
    return 100
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS

### Step 5: Commit

```bash
git add src/app/shop/
git commit -m "feat(shop): implement unidentified item display

- Filter unidentified items from character inventory
- Show unidentifiedName for display
- Flat 100 gold identification cost
- Handle empty inventory
- 4 tests passing (29 total)

Part of Phase 5: Shop identify flow implementation"
```

---

## Part 3: Identify Transaction Logic

### Step 1: Write failing tests for identification

**Files:**
- Modify: `src/app/shop/shop.component.spec.ts`

Add to identify flow describe block:

```typescript
    it('deducts 100 gold from party when identifying', () => {
      const initialGold = gameState.party().gold || 0

      component.identifyItem(UNIDENTIFIED_ITEMS[0].id)

      const finalGold = gameState.party().gold || 0

      expect(finalGold).toBe(initialGold - 100)
    })

    it('marks item as identified', () => {
      const item = UNIDENTIFIED_ITEMS[0]

      component.identifyItem(item.id)

      const char = gameState.state().roster.get('char-1')!
      const identifiedItem = char.inventory.find(i => i.id === item.id)!

      expect(identifiedItem.identified).toBe(true)
    })

    it('reveals true item name', () => {
      const item = UNIDENTIFIED_ITEMS[0]
      const trueName = item.name

      component.identifyItem(item.id)

      expect(component.successMessage()).toContain(trueName)
    })

    it('reveals item properties after identification', () => {
      const item = UNIDENTIFIED_ITEMS[0]

      component.identifyItem(item.id)

      const char = gameState.state().roster.get('char-1')!
      const identifiedItem = char.inventory.find(i => i.id === item.id)!

      expect(identifiedItem.damage).toBeDefined()
      expect(component.successMessage()).toContain('damage')
    })

    it('reveals curse status if cursed', () => {
      const cursedItem = UNIDENTIFIED_ITEMS[2] // Cursed item

      component.identifyItem(cursedItem.id)

      expect(component.successMessage()).toContain('CURSED')
      expect(component.successMessage()).toContain('WARNING')
    })

    it('shows error when cannot afford identification', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 50 // Not enough for 100 gold cost
        }
      }))

      component.identifyItem(UNIDENTIFIED_ITEMS[0].id)

      expect(component.errorMessage()).toContain('afford')
    })

    it('shows error when item not found', () => {
      component.identifyItem('nonexistent-item')

      expect(component.errorMessage()).toContain('not found')
    })

    it('shows error when item already identified', () => {
      const identifiedItem: Item = {
        ...UNIDENTIFIED_ITEMS[0],
        identified: true
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [identifiedItem]
        })
      }))

      component.identifyItem(identifiedItem.id)

      expect(component.errorMessage()).toContain('already identified')
    })

    it('shows error when no character selected', () => {
      component.selectedCharacterId.set(null)

      component.identifyItem(UNIDENTIFIED_ITEMS[0].id)

      expect(component.errorMessage()).toContain('No character selected')
    })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: FAIL (identifyItem not implemented)

### Step 3: Implement identification method

**Files:**
- Modify: `src/app/shop/shop.component.ts`

Add to ShopComponent:

```typescript
  /**
   * Identify an item from character inventory
   */
  identifyItem(itemId: string): void {
    const character = this.selectedCharacter()
    if (!character) {
      this.errorMessage.set('No character selected')
      return
    }

    // Find item in inventory
    const item = character.inventory.find(i => i.id === itemId)
    if (!item) {
      this.errorMessage.set('Item not found in inventory')
      return
    }

    // Check if already identified
    if (item.identified) {
      this.errorMessage.set('Item is already identified')
      return
    }

    // Check if party can afford (100 gold flat fee)
    const identifyCost = this.getIdentifyCost()
    const party = this.gameState.party()
    const partyGold = party.gold || 0

    if (partyGold < identifyCost) {
      this.errorMessage.set(`Cannot afford identification. Need ${identifyCost} gold.`)
      return
    }

    // Mark item as identified
    const charId = this.selectedCharacterId()!

    this.gameState.updateState(state => {
      const updatedInventory = character.inventory.map(i =>
        i.id === itemId ? { ...i, identified: true } : i
      )

      const updatedChar = {
        ...character,
        inventory: updatedInventory
      }

      return {
        ...state,
        roster: new Map(state.roster).set(charId, updatedChar),
        party: {
          ...state.party,
          gold: partyGold - identifyCost
        }
      }
    })

    // Build success message with item details
    let message = `Identified: ${item.name}`

    // Add properties
    if (item.damage) {
      message += ` (Damage: ${item.damage})`
    }
    if (item.defense) {
      message += ` (Defense: ${item.defense})`
    }

    // Warn if cursed
    if (item.cursed) {
      message += ' - WARNING: CURSED! Cannot be removed once equipped!'
    }

    this.successMessage.set(message)
    this.errorMessage.set(null)
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS (all 38 tests passing)

### Step 5: Commit

```bash
git add src/app/shop/
git commit -m "feat(shop): implement identify transaction logic

- Deduct 100 gold from party
- Mark item as identified
- Reveal true name and properties
- Reveal curse status with warning
- Validation (affordability, already identified)
- 9 tests passing (38 total)

Part of Phase 5: Shop identify flow implementation"
```

---

## Part 4: Item Property Display

### Step 1: Write test for detailed property display

**Files:**
- Modify: `src/app/shop/shop.component.spec.ts`

Add to identify flow describe block:

```typescript
    it('displays item properties after identification', () => {
      const item = UNIDENTIFIED_ITEMS[0]

      component.identifyItem(item.id)

      const properties = component.getItemProperties(item.id)

      expect(properties).toContain('Damage')
      expect(properties).toContain(item.damage?.toString())
    })

    it('shows curse indicator in properties', () => {
      const cursedItem = UNIDENTIFIED_ITEMS[2]

      component.identifyItem(cursedItem.id)

      const properties = component.getItemProperties(cursedItem.id)

      expect(properties).toContain('CURSED')
    })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: FAIL (getItemProperties not implemented)

### Step 3: Implement property display method

**Files:**
- Modify: `src/app/shop/shop.component.ts`

Add to ShopComponent:

```typescript
  /**
   * Get formatted item properties for display
   */
  getItemProperties(itemId: string): string {
    const character = this.selectedCharacter()
    if (!character) {
      return ''
    }

    const item = character.inventory.find(i => i.id === itemId)
    if (!item) {
      return ''
    }

    const properties: string[] = []

    if (item.damage) {
      properties.push(`Damage: ${item.damage}`)
    }

    if (item.defense) {
      properties.push(`Defense: ${item.defense}`)
    }

    if (item.cursed) {
      properties.push('CURSED')
    }

    if (item.description) {
      properties.push(item.description)
    }

    return properties.join(' | ')
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS (all 40 tests passing)

### Step 5: Commit

```bash
git add src/app/shop/
git commit -m "feat(shop): implement item property display

- Format item properties for display
- Show damage, defense, curse status
- Include item description
- 2 tests passing (40 total)

Part of Phase 5: Shop identify flow implementation"
```

---

## Part 5: Update HTML Template for Identify Flow

### Step 1: Replace identify placeholder with functional UI

**Files:**
- Modify: `src/app/shop/shop.component.html`

Replace the identify placeholder with:

```html
    @if (currentView() === 'identify') {
      <div class="identify-view">
        <h2>IDENTIFY ITEMS</h2>

        @if (selectedCharacter(); as character) {
          @if (getUnidentifiedItems().length > 0) {
            <div class="identify-info">
              <p>Identification Cost: {{ getIdentifyCost() }} gold</p>
            </div>

            <div class="item-list">
              @for (item of getUnidentifiedItems(); track item.id) {
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-name">{{ item.unidentifiedName || 'Unknown Item' }}</span>
                    <span class="item-type">{{ item.type }}</span>
                  </div>
                  <button
                    class="identify-btn"
                    (click)="identifyItem(item.id)"
                  >
                    (I) Identify
                  </button>
                </div>
              }
            </div>

            @if (successMessage()) {
              <div class="identification-result">
                <h3>Identification Result:</h3>
                <p class="result-text">{{ successMessage() }}</p>
              </div>
            }
          } @else {
            <p class="empty-message">No unidentified items</p>
          }

          <div class="party-gold">
            <strong>Party Gold:</strong> {{ gameState.party().gold || 0 }}
          </div>
        } @else {
          <p class="error-message">No character selected</p>
        }

        <button class="cancel-btn" (click)="cancelView()">(ESC) Back</button>
      </div>
    }
```

### Step 2: Verify tests still pass

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS (all 40 tests still passing)

### Step 3: Commit

```bash
git add src/app/shop/
git commit -m "feat(shop): implement identify flow UI template

- Replace placeholder with functional identify UI
- Display unidentified items with unidentifiedName
- Show identification cost (100 gold)
- Display identification results with properties
- Show curse warning prominently
- Display party gold balance
- Empty state for no unidentified items
- Tests still passing (40 total)

Part of Phase 5: Shop identify flow implementation - COMPLETE"
```

---

## Part 6: Add Helper for Testing Identify Flow

### Step 1: Create test helper to add unidentified items to characters

**Files:**
- Create: `src/test-helpers/shop-test-helpers.ts`

```typescript
// src/test-helpers/shop-test-helpers.ts
import { GameState } from '../types/GameState'
import { Character } from '../types/Character'
import { Item } from '../types/Item'
import { UNIDENTIFIED_ITEMS } from '../data/shop-inventory'

/**
 * Test helper: Add unidentified items to a character for testing identify flow
 */
export function addUnidentifiedItemsToCharacter(
  state: GameState,
  characterId: string,
  itemCount: number = 2
): GameState {
  const character = state.roster.get(characterId)
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }

  const itemsToAdd = UNIDENTIFIED_ITEMS.slice(0, itemCount)

  return {
    ...state,
    roster: new Map(state.roster).set(characterId, {
      ...character,
      inventory: [...character.inventory, ...itemsToAdd]
    })
  }
}

/**
 * Test helper: Give character identified version of an item
 */
export function identifyItemForCharacter(
  state: GameState,
  characterId: string,
  itemId: string
): GameState {
  const character = state.roster.get(characterId)
  if (!character) {
    throw new Error(`Character ${characterId} not found`)
  }

  const updatedInventory = character.inventory.map(item =>
    item.id === itemId ? { ...item, identified: true } : item
  )

  return {
    ...state,
    roster: new Map(state.roster).set(characterId, {
      ...character,
      inventory: updatedInventory
    })
  }
}
```

### Step 2: Write test for test helper

**Files:**
- Create: `src/test-helpers/__tests__/shop-test-helpers.spec.ts`

```typescript
// src/test-helpers/__tests__/shop-test-helpers.spec.ts
import { addUnidentifiedItemsToCharacter, identifyItemForCharacter } from '../shop-test-helpers'
import { GameState } from '../../types/GameState'
import { Character } from '../../types/Character'
import { CharacterClass } from '../../types/CharacterClass'
import { CharacterStatus } from '../../types/CharacterStatus'

describe('Shop Test Helpers', () => {
  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Test',
    class: CharacterClass.FIGHTER,
    level: 1,
    hp: 10,
    maxHp: 10,
    status: CharacterStatus.OK,
    inventory: []
  } as Character

  const mockState: GameState = {
    roster: new Map([['char-1', mockCharacter]]),
    party: {
      members: ['char-1'],
      gold: 500
    }
  } as GameState

  describe('addUnidentifiedItemsToCharacter', () => {
    it('adds unidentified items to character inventory', () => {
      const updated = addUnidentifiedItemsToCharacter(mockState, 'char-1', 2)

      const char = updated.roster.get('char-1')!
      expect(char.inventory.length).toBe(2)
      expect(char.inventory[0].identified).toBe(false)
    })
  })

  describe('identifyItemForCharacter', () => {
    it('marks item as identified', () => {
      const withItems = addUnidentifiedItemsToCharacter(mockState, 'char-1', 1)
      const itemId = withItems.roster.get('char-1')!.inventory[0].id

      const updated = identifyItemForCharacter(withItems, 'char-1', itemId)

      const char = updated.roster.get('char-1')!
      expect(char.inventory[0].identified).toBe(true)
    })
  })
})
```

### Step 3: Run test

Run: `npm test -- --ci --testPathPattern="shop-test-helpers"`

Expected: PASS

### Step 4: Commit

```bash
git add src/test-helpers/
git commit -m "test(shop): add test helpers for identify flow

- Helper to add unidentified items to character
- Helper to identify items for testing
- Test coverage for helpers
- 2 tests passing

Part of Phase 5: Shop identify flow implementation"
```

---

## Execution Summary

**Task 14 Complete:**
- ✅ Add unidentified items to shop inventory (6 tests)
- ✅ Display unidentified items (4 tests)
- ✅ Identify transaction logic (9 tests)
- ✅ Item property display (2 tests)
- ✅ Complete HTML template
- ✅ Test helpers (2 tests)
- ✅ Total: 23 new tests (40 ShopComponent tests + 6 inventory tests + 2 helper tests = 48 total)

**Files Created:**
- `src/data/__tests__/shop-inventory.spec.ts`
- `src/test-helpers/shop-test-helpers.ts`
- `src/test-helpers/__tests__/shop-test-helpers.spec.ts`

**Files Modified:**
- `src/data/shop-inventory.ts`
- `src/app/shop/shop.component.ts`
- `src/app/shop/shop.component.html`
- `src/app/shop/shop.component.spec.ts`

**Ready For:**
- Task 15: Integration testing and polish

---

## Notes for Implementation

**Reference Documentation:**
- `/docs/ui/scenes/04-boltacs-trading-post.md` - Complete shop identify flow (lines 271-334)
- `/docs/services/ShopService.md` - Identification pricing

**Testing Requirements:**
- Test with both normal and cursed unidentified items
- Test affordability validation
- Test already-identified items
- Test empty inventory
- Verify curse warnings are prominent

**Common Pitfalls:**
- Remember to show unidentifiedName, not true name, until identified
- Flat 100 gold cost (not based on item value)
- Deduct gold even if item is cursed
- Display curse warning prominently after identification
- Party-based gold system (not character.gold)
- Cannot identify already-identified items
