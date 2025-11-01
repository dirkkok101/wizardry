# Task 13: Shop Component - Sell Flow Implementation - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete item selling functionality in Shop component with inventory display, sell price calculation, transaction handling, and cursed item restrictions

**Architecture:** Extend existing ShopComponent (buy flow already complete) with sell flow - signal-based state, party-based gold system, immutable state updates

**Tech Stack:** Angular 20, TypeScript 5.5+, Jest, Signals API, standalone components, TDD methodology

**Prerequisites:** Tasks 1-11 complete (ShopService, InventoryService, shop buy flow)

**Estimated Duration:** 1 day | **Target:** 15 new tests (25 total ShopComponent tests)

---

## Part 1: Display Character Inventory

### Step 1: Write failing tests for inventory display

**Files:**
- Modify: `src/app/shop/shop.component.spec.ts`

Add to existing test file:

```typescript
  describe('sell flow', () => {
    beforeEach(() => {
      // Create character with inventory
      const mockItem1: Item = {
        id: 'item-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 200,
        damage: 10,
        cursed: false,
        identified: true,
        equipped: false
      }

      const mockItem2: Item = {
        id: 'item-2',
        name: 'Leather Armor',
        type: ItemType.ARMOR,
        slot: ItemSlot.ARMOR,
        price: 50,
        defense: 2,
        cursed: false,
        identified: true,
        equipped: false
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [mockItem1, mockItem2]
        }),
        party: {
          ...state.party,
          members: ['char-1'],
          gold: 500
        }
      }))

      component.selectCharacter('char-1')
      component.handleMenuSelect('sell')
    })

    it('displays character inventory items', () => {
      const inventory = component.getCharacterInventory()

      expect(inventory.length).toBe(2)
      expect(inventory[0].name).toBe('Long Sword')
      expect(inventory[1].name).toBe('Leather Armor')
    })

    it('shows empty message when character has no items', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: []
        })
      }))

      const inventory = component.getCharacterInventory()

      expect(inventory.length).toBe(0)
    })

    it('displays sellable items only (excludes equipped cursed items)', () => {
      const cursedItem: Item = {
        id: 'cursed-sword',
        name: 'Cursed Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 300,
        cursed: true,
        identified: true,
        equipped: true
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [cursedItem]
        })
      }))

      const sellable = component.getSellableItems()

      expect(sellable.length).toBe(0)
    })
  })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: FAIL (getCharacterInventory/getSellableItems not implemented)

### Step 3: Implement inventory display methods

**Files:**
- Modify: `src/app/shop/shop.component.ts`

Add to ShopComponent:

```typescript
  /**
   * Get current character's inventory
   */
  getCharacterInventory(): Item[] {
    const character = this.selectedCharacter()
    if (!character) {
      return []
    }

    return character.inventory
  }

  /**
   * Get items that can be sold (not equipped cursed items)
   */
  getSellableItems(): Item[] {
    const inventory = this.getCharacterInventory()

    return inventory.filter(item => {
      // Cannot sell equipped cursed items
      if (item.equipped && item.cursed) {
        return false
      }
      return true
    })
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS

### Step 5: Commit

```bash
git add src/app/shop/
git commit -m "feat(shop): implement inventory display for sell flow

- Get character inventory items
- Filter sellable items (exclude equipped cursed items)
- Handle empty inventory
- 3 tests passing (13 total)

Part of Phase 5: Shop sell flow implementation"
```

---

## Part 2: Calculate and Display Sell Prices

### Step 1: Write failing tests for sell price display

**Files:**
- Modify: `src/app/shop/shop.component.spec.ts`

Add to sell flow describe block:

```typescript
    it('calculates sell price (50% of purchase price)', () => {
      const item: Item = {
        id: 'item-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 200,
        cursed: false,
        identified: true,
        equipped: false
      }

      const sellPrice = component.getSellPrice(item)

      expect(sellPrice).toBe(100) // 50% of 200
    })

    it('floors sell price for odd amounts', () => {
      const item: Item = {
        id: 'item-1',
        name: 'Dagger',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 75,
        cursed: false,
        identified: true,
        equipped: false
      }

      const sellPrice = component.getSellPrice(item)

      expect(sellPrice).toBe(37) // floor(75 * 0.5) = 37
    })

    it('returns 0 sell price for cursed items', () => {
      const cursedItem: Item = {
        id: 'cursed-sword',
        name: 'Cursed Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 300,
        cursed: true,
        identified: true,
        equipped: false
      }

      const sellPrice = component.getSellPrice(cursedItem)

      expect(sellPrice).toBe(0)
    })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: FAIL (getSellPrice not implemented)

### Step 3: Implement sell price calculation

**Files:**
- Modify: `src/app/shop/shop.component.ts`

Add to ShopComponent:

```typescript
  /**
   * Calculate sell price for an item (uses ShopService)
   */
  getSellPrice(item: Item): number {
    return ShopService.calculateSellPrice(item)
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS

### Step 5: Commit

```bash
git add src/app/shop/
git commit -m "feat(shop): implement sell price calculation display

- Calculate sell price using ShopService (50% of purchase)
- Floor prices for odd amounts
- Return 0 for cursed items
- 3 tests passing (16 total)

Part of Phase 5: Shop sell flow implementation"
```

---

## Part 3: Sell Transaction Logic

### Step 1: Write failing tests for sell transaction

**Files:**
- Modify: `src/app/shop/shop.component.spec.ts`

Add to sell flow describe block:

```typescript
    it('removes item from character inventory when sold', () => {
      const item: Item = {
        id: 'item-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 200,
        cursed: false,
        identified: true,
        equipped: false
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [item]
        })
      }))

      component.sellItem(item.id)

      const char = gameState.state().roster.get('char-1')!
      expect(char.inventory).not.toContain(item)
      expect(char.inventory.length).toBe(0)
    })

    it('adds gold to party when item sold', () => {
      const item: Item = {
        id: 'item-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 200,
        cursed: false,
        identified: true,
        equipped: false
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [item]
        }),
        party: {
          ...state.party,
          gold: 500
        }
      }))

      const initialGold = gameState.party().gold || 0

      component.sellItem(item.id)

      const finalGold = gameState.party().gold || 0
      const expectedGain = 100 // 50% of 200

      expect(finalGold).toBe(initialGold + expectedGain)
    })

    it('shows success message after selling item', () => {
      const item: Item = {
        id: 'item-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 200,
        cursed: false,
        identified: true,
        equipped: false
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [item]
        })
      }))

      component.sellItem(item.id)

      expect(component.successMessage()).toContain('Sold')
      expect(component.successMessage()).toContain('Long Sword')
      expect(component.successMessage()).toContain('100')
    })

    it('cannot sell equipped cursed item', () => {
      const cursedItem: Item = {
        id: 'cursed-sword',
        name: 'Cursed Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 300,
        cursed: true,
        identified: true,
        equipped: true
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [cursedItem]
        })
      }))

      component.sellItem(cursedItem.id)

      expect(component.errorMessage()).toContain('Cannot sell equipped cursed item')
    })

    it('shows error when item not found', () => {
      component.sellItem('nonexistent-item')

      expect(component.errorMessage()).toContain('not found')
    })

    it('shows error when no character selected', () => {
      component.selectedCharacterId.set(null)

      component.sellItem('item-1')

      expect(component.errorMessage()).toContain('No character selected')
    })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: FAIL (sellItem not implemented)

### Step 3: Implement sell transaction method

**Files:**
- Modify: `src/app/shop/shop.component.ts`

Add to ShopComponent:

```typescript
  /**
   * Sell an item from character inventory
   */
  sellItem(itemId: string): void {
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

    // Check if item can be sold (not equipped cursed)
    if (item.equipped && item.cursed) {
      this.errorMessage.set('Cannot sell equipped cursed item')
      return
    }

    // Calculate sell price
    const sellPrice = ShopService.calculateSellPrice(item)

    if (sellPrice === 0) {
      this.errorMessage.set('Cursed items cannot be sold')
      return
    }

    // Remove item from character inventory
    const charId = this.selectedCharacterId()!
    const party = this.gameState.party()

    this.gameState.updateState(state => {
      const updatedChar = {
        ...character,
        inventory: character.inventory.filter(i => i.id !== itemId)
      }

      return {
        ...state,
        roster: new Map(state.roster).set(charId, updatedChar),
        party: {
          ...state.party,
          gold: (party.gold || 0) + sellPrice
        }
      }
    })

    this.successMessage.set(`Sold ${item.name} for ${sellPrice} gold`)
    this.errorMessage.set(null)
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS

### Step 5: Commit

```bash
git add src/app/shop/
git commit -m "feat(shop): implement sell transaction logic

- Remove item from character inventory
- Add gold to party (50% of purchase price)
- Prevent selling equipped cursed items
- Prevent selling cursed items (0 value)
- Success/error messaging
- 6 tests passing (22 total)

Part of Phase 5: Shop sell flow implementation"
```

---

## Part 4: Update HTML Template for Sell Flow

### Step 1: Replace sell placeholder with functional UI

**Files:**
- Modify: `src/app/shop/shop.component.html`

Replace the sell placeholder with:

```html
    @if (currentView() === 'sell') {
      <div class="sell-view">
        <h2>SELL ITEMS</h2>

        @if (selectedCharacter(); as character) {
          @if (getSellableItems().length > 0) {
            <div class="item-list">
              @for (item of getSellableItems(); track item.id) {
                <div class="item-row">
                  <div class="item-info">
                    <span class="item-name">{{ item.name }}</span>
                    @if (item.equipped) {
                      <span class="equipped-badge">(Equipped)</span>
                    }
                  </div>
                  <div class="item-price">
                    <span class="sell-price">Sell: {{ getSellPrice(item) }} gold</span>
                    <button
                      class="sell-btn"
                      (click)="sellItem(item.id)"
                      [disabled]="getSellPrice(item) === 0"
                    >
                      (S) Sell
                    </button>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="empty-message">No items to sell</p>
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

Expected: PASS (all 22 tests still passing)

### Step 3: Commit

```bash
git add src/app/shop/
git commit -m "feat(shop): implement sell flow UI template

- Replace placeholder with functional sell UI
- Display sellable items with prices
- Show sell buttons (disabled for cursed items)
- Display party gold balance
- Empty state for no items
- Tests still passing (22 total)

Part of Phase 5: Shop sell flow implementation - COMPLETE"
```

---

## Part 5: Add Confirmation Prompt (Optional Enhancement)

### Step 1: Write test for sell confirmation

**Files:**
- Modify: `src/app/shop/shop.component.spec.ts`

Add to sell flow describe block:

```typescript
    it('shows confirmation before selling high-value item', () => {
      const expensiveItem: Item = {
        id: 'item-1',
        name: 'Plate Mail',
        type: ItemType.ARMOR,
        slot: ItemSlot.ARMOR,
        price: 1000,
        cursed: false,
        identified: true,
        equipped: false
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [expensiveItem]
        })
      }))

      component.initiateSell(expensiveItem.id)

      expect(component.pendingSellItemId()).toBe(expensiveItem.id)
      expect(component.showSellConfirmation()).toBe(true)
    })

    it('completes sell after confirmation', () => {
      const item: Item = {
        id: 'item-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 200,
        cursed: false,
        identified: true,
        equipped: false
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [item]
        })
      }))

      component.initiateSell(item.id)
      component.confirmSell()

      const char = gameState.state().roster.get('char-1')!
      expect(char.inventory.length).toBe(0)
      expect(component.showSellConfirmation()).toBe(false)
    })

    it('cancels sell on decline confirmation', () => {
      const item: Item = {
        id: 'item-1',
        name: 'Long Sword',
        type: ItemType.WEAPON,
        slot: ItemSlot.WEAPON,
        price: 200,
        cursed: false,
        identified: true,
        equipped: false
      }

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [item]
        })
      }))

      component.initiateSell(item.id)
      component.cancelSell()

      const char = gameState.state().roster.get('char-1')!
      expect(char.inventory.length).toBe(1)
      expect(component.showSellConfirmation()).toBe(false)
    })
```

### Step 2: Run test to verify it fails

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: FAIL (confirmation methods not implemented)

### Step 3: Implement confirmation flow

**Files:**
- Modify: `src/app/shop/shop.component.ts`

Add signals:

```typescript
  readonly showSellConfirmation = signal<boolean>(false)
  readonly pendingSellItemId = signal<string | null>(null)
```

Add methods:

```typescript
  /**
   * Initiate sell with confirmation prompt
   */
  initiateSell(itemId: string): void {
    this.pendingSellItemId.set(itemId)
    this.showSellConfirmation.set(true)
  }

  /**
   * Confirm and complete the sell
   */
  confirmSell(): void {
    const itemId = this.pendingSellItemId()
    if (itemId) {
      this.sellItem(itemId)
    }

    this.showSellConfirmation.set(false)
    this.pendingSellItemId.set(null)
  }

  /**
   * Cancel the sell
   */
  cancelSell(): void {
    this.showSellConfirmation.set(false)
    this.pendingSellItemId.set(null)
  }
```

### Step 4: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS (all 25 tests passing)

### Step 5: Update HTML template with confirmation dialog

**Files:**
- Modify: `src/app/shop/shop.component.html`

Add confirmation dialog to sell view:

```html
    @if (currentView() === 'sell') {
      <div class="sell-view">
        <h2>SELL ITEMS</h2>

        @if (showSellConfirmation()) {
          <div class="confirmation-dialog">
            @if (selectedCharacter(); as character) {
              @if (pendingSellItemId(); as itemId) {
                @if (character.inventory.find(i => i.id === itemId); as item) {
                  <p>Sell {{ item.name }} for {{ getSellPrice(item) }} gold?</p>
                  <div class="confirmation-actions">
                    <button class="confirm-btn" (click)="confirmSell()">(Y) Yes</button>
                    <button class="cancel-btn" (click)="cancelSell()">(N) No</button>
                  </div>
                }
              }
            }
          </div>
        } @else {
          <!-- Existing sell UI ... -->
          <!-- Update sell button to use initiateSell instead of sellItem -->
          <div class="item-list">
            @for (item of getSellableItems(); track item.id) {
              <div class="item-row">
                <div class="item-info">
                  <span class="item-name">{{ item.name }}</span>
                  @if (item.equipped) {
                    <span class="equipped-badge">(Equipped)</span>
                  }
                </div>
                <div class="item-price">
                  <span class="sell-price">Sell: {{ getSellPrice(item) }} gold</span>
                  <button
                    class="sell-btn"
                    (click)="initiateSell(item.id)"
                    [disabled]="getSellPrice(item) === 0"
                  >
                    (S) Sell
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <button class="cancel-btn" (click)="cancelView()">(ESC) Back</button>
      </div>
    }
```

### Step 6: Run test to verify it passes

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS (all 25 tests passing)

### Step 7: Commit

```bash
git add src/app/shop/
git commit -m "feat(shop): add sell confirmation dialog

- Initiate sell with confirmation prompt
- Confirm/cancel sell actions
- Display item and price in confirmation
- 3 tests passing (25 total)

Part of Phase 5: Shop sell flow implementation - COMPLETE"
```

---

## Execution Summary

**Task 13 Complete:**
- ✅ Display character inventory (3 tests)
- ✅ Calculate sell prices (3 tests)
- ✅ Sell transaction logic (6 tests)
- ✅ Sell confirmation dialog (3 tests)
- ✅ Complete HTML template
- ✅ Total: 15 new tests (25 total ShopComponent tests)

**Files Modified:**
- `src/app/shop/shop.component.ts`
- `src/app/shop/shop.component.html`
- `src/app/shop/shop.component.spec.ts`

**Ready For:**
- Task 14: Shop identify flow

---

## Notes for Implementation

**Reference Documentation:**
- `/docs/ui/scenes/04-boltacs-trading-post.md` - Complete shop sell flow (lines 206-268)
- `/docs/services/ShopService.md` - Sell price calculation

**Testing Requirements:**
- All tests use real data (no mocks)
- Test cursed item edge cases
- Test empty inventory
- Test party gold updates

**Common Pitfalls:**
- Remember party-based gold system (not character.gold)
- Cannot sell equipped cursed items
- Cursed items have 0 sell price
- Character inventory stores Item objects (not IDs)
- Use InventoryService.removeItem for validation
