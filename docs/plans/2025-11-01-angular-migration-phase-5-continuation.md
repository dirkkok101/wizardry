# Phase 5 Continuation: Shop & Training Grounds Business Logic - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete business logic for Shop (buy/sell/identify) and Training Grounds (character creation wizard) components

**Architecture:**
- Pure function services first (ShopService, CharacterCreationService)
- Update Angular components with multi-step wizards and transaction flows
- Follow TDD: test → fail → implement → pass → commit for every feature
- Incremental complexity: Shop Buy/Sell → Training Grounds Creation Wizard

**Tech Stack:** Angular 20, TypeScript 5.5+, Jest, Signals API, standalone components, TDD methodology

**Prerequisites:** Tasks 1-6 from Phase 5 must be complete (Temple, Item types, InventoryService)

**Estimated Duration:** 6-8 days | **Target:** 40+ new tests (total 240+ tests)

---

## Part 1: Shop Component - Buy/Sell/Identify Services

### Task 8: Implement ShopService - Pricing Logic (TDD)

**Files:**
- Create: `src/services/ShopService.ts`
- Create: `src/services/__tests__/ShopService.spec.ts`

**Step 1: Write failing tests for pricing calculations**

```typescript
// src/services/__tests__/ShopService.spec.ts
import { ShopService } from '../ShopService'
import { Item } from '../../types/Item'
import { ItemType, ItemSlot } from '../../types/ItemType'
import { Character } from '../../types/Character'
import { CharacterClass } from '../../types/CharacterClass'

describe('ShopService', () => {
  const mockItem: Item = {
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

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    // ... other required fields
    inventory: [],
    gold: 500
  } as Character

  describe('calculateSellPrice', () => {
    it('returns 50% of purchase price', () => {
      const sellPrice = ShopService.calculateSellPrice(mockItem)
      expect(sellPrice).toBe(100) // 50% of 200
    })

    it('floors the result for odd prices', () => {
      const oddItem = { ...mockItem, price: 75 }
      const sellPrice = ShopService.calculateSellPrice(oddItem)
      expect(sellPrice).toBe(37) // floor(75 * 0.5) = 37
    })

    it('returns 0 for cursed items', () => {
      const cursedItem = { ...mockItem, cursed: true }
      const sellPrice = ShopService.calculateSellPrice(cursedItem)
      expect(sellPrice).toBe(0)
    })
  })

  describe('canAfford', () => {
    it('returns true when character has enough gold', () => {
      expect(ShopService.canAfford(mockCharacter, mockItem)).toBe(true)
    })

    it('returns false when character does not have enough gold', () => {
      const poorChar = { ...mockCharacter, gold: 50 }
      expect(ShopService.canAfford(poorChar, mockItem)).toBe(false)
    })
  })

  describe('calculateIdentifyPrice', () => {
    it('returns 100 gold flat fee for any item', () => {
      expect(ShopService.calculateIdentifyPrice(mockItem)).toBe(100)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --ci --testPathPattern="ShopService"`

Expected output:
```
FAIL src/services/__tests__/ShopService.spec.ts
  ● Test suite failed to run
    Cannot find module '../ShopService'
```

**Step 3: Implement ShopService with pricing logic**

```typescript
// src/services/ShopService.ts
import { Character } from '../types/Character'
import { Item } from '../types/Item'

/**
 * ShopService - Boltac's Trading Post business logic
 *
 * Features:
 * - Purchase price validation
 * - Sell price calculation (50% of purchase price)
 * - Identify service pricing (100 gold flat fee)
 * - Cursed item handling (cannot sell)
 */
export class ShopService {
  /**
   * Calculate sell price for an item.
   * Returns 50% of purchase price (floored).
   * Cursed items cannot be sold (return 0).
   */
  static calculateSellPrice(item: Item): number {
    if (item.cursed) {
      return 0
    }
    return Math.floor(item.price * 0.5)
  }

  /**
   * Check if character can afford an item.
   */
  static canAfford(character: Character, item: Item): boolean {
    return (character.gold || 0) >= item.price
  }

  /**
   * Calculate identification price (flat 100 gold).
   */
  static calculateIdentifyPrice(_item: Item): number {
    return 100
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --ci --testPathPattern="ShopService"`

Expected output:
```
PASS src/services/__tests__/ShopService.spec.ts
  ShopService
    calculateSellPrice
      ✓ returns 50% of purchase price
      ✓ floors the result for odd prices
      ✓ returns 0 for cursed items
    canAfford
      ✓ returns true when character has enough gold
      ✓ returns false when character does not have enough gold
    calculateIdentifyPrice
      ✓ returns 100 gold flat fee for any item

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

**Step 5: Commit**

```bash
git add src/services/ShopService.ts src/services/__tests__/ShopService.spec.ts
git commit -m "feat(shop): implement pricing and sell logic

- Calculate sell price (50% of purchase, floor)
- Validate purchase affordability
- Identify service pricing (100 gold flat)
- Cursed items cannot be sold
- 6 tests passing

Part of Phase 5: Shop implementation"
```

---

### Task 9: Create Mock Shop Inventory Data

**Files:**
- Create: `src/data/shop-inventory.ts`

**Step 1: Create shop inventory with sample items**

```typescript
// src/data/shop-inventory.ts
import { Item } from '../types/Item'
import { ItemType, ItemSlot } from '../types/ItemType'
import { CharacterClass } from '../types/CharacterClass'

/**
 * Shop inventory - items available for purchase at Boltac's Trading Post
 */
export const SHOP_INVENTORY: Item[] = [
  {
    id: 'weapon-long-sword',
    name: 'Long Sword',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 200,
    damage: 10,
    classRestrictions: [CharacterClass.FIGHTER, CharacterClass.LORD, CharacterClass.SAMURAI],
    cursed: false,
    identified: true,
    equipped: false,
    description: 'A well-balanced blade for warriors'
  },
  {
    id: 'armor-chain-mail',
    name: 'Chain Mail',
    type: ItemType.ARMOR,
    slot: ItemSlot.ARMOR,
    price: 300,
    defense: 4,
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Interlocking metal rings provide solid protection'
  },
  {
    id: 'weapon-staff',
    name: 'Staff',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 30,
    damage: 2,
    classRestrictions: [CharacterClass.MAGE, CharacterClass.PRIEST, CharacterClass.BISHOP],
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Simple wooden staff for spellcasters'
  },
  {
    id: 'armor-leather',
    name: 'Leather Armor',
    type: ItemType.ARMOR,
    slot: ItemSlot.ARMOR,
    price: 50,
    defense: 2,
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Light armor suitable for most adventurers'
  },
  {
    id: 'weapon-dagger',
    name: 'Dagger',
    type: ItemType.WEAPON,
    slot: ItemSlot.WEAPON,
    price: 20,
    damage: 3,
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Small blade, easily concealed'
  },
  {
    id: 'shield-wooden',
    name: 'Shield',
    type: ItemType.SHIELD,
    slot: ItemSlot.SHIELD,
    price: 100,
    defense: 1,
    cursed: false,
    identified: true,
    equipped: false,
    description: 'Wooden shield for blocking attacks'
  }
]
```

**Step 2: Commit**

```bash
git add src/data/shop-inventory.ts
git commit -m "feat(shop): add mock shop inventory data

- 6 starter items (weapons, armor, shield)
- Varied pricing (20-300 gold)
- Class restrictions on weapons
- Ready for buy/sell testing

Part of Phase 5: Shop implementation"
```

---

### Task 10: Update ShopComponent - Buy Flow (TDD)

**Files:**
- Modify: `src/app/shop/shop.component.ts`
- Modify: `src/app/shop/shop.component.spec.ts`

**Step 1: Write failing tests for buy flow**

```typescript
// src/app/shop/shop.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { ShopComponent } from './shop.component'
import { GameStateService } from '../../services/GameStateService'
import { SceneType } from '../../types/SceneType'
import { Character } from '../../types/Character'
import { SHOP_INVENTORY } from '../../data/shop-inventory'

describe('ShopComponent', () => {
  let component: ShopComponent
  let fixture: ComponentFixture<ShopComponent>
  let gameState: GameStateService
  let router: Router

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    // ... other required fields
    inventory: [],
    gold: 500
  } as Character

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ShopComponent]
    })

    fixture = TestBed.createComponent(ShopComponent)
    component = fixture.componentInstance
    gameState = TestBed.inject(GameStateService)
    router = TestBed.inject(Router)

    jest.spyOn(router, 'navigate')

    // Setup roster with character
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter)
    }))
  })

  describe('initialization', () => {
    it('updates scene to SHOP on init', () => {
      component.ngOnInit()
      expect(gameState.currentScene()).toBe(SceneType.SHOP)
    })

    it('loads shop inventory', () => {
      component.ngOnInit()
      expect(component.shopInventory().length).toBeGreaterThan(0)
    })
  })

  describe('character selection', () => {
    it('sets selected character', () => {
      component.selectCharacter('char-1')
      expect(component.selectedCharacterId()).toBe('char-1')
    })

    it('shows error when character not found', () => {
      component.selectCharacter('nonexistent')
      expect(component.errorMessage()).toBeTruthy()
    })
  })

  describe('buy flow', () => {
    beforeEach(() => {
      component.selectCharacter('char-1')
    })

    it('deducts gold when purchasing item', () => {
      const initialGold = mockCharacter.gold || 0
      const item = SHOP_INVENTORY[0]

      component.buyItem(item.id)

      const char = gameState.state().roster.get('char-1')!
      expect(char.gold).toBe(initialGold - item.price)
    })

    it('adds item to character inventory', () => {
      const item = SHOP_INVENTORY[0]

      component.buyItem(item.id)

      const char = gameState.state().roster.get('char-1')!
      expect(char.inventory).toContain(item.id)
    })

    it('shows error when character cannot afford item', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          gold: 10
        })
      }))

      const expensiveItem = SHOP_INVENTORY.find(i => i.price > 100)!

      component.buyItem(expensiveItem.id)

      expect(component.errorMessage()).toContain('afford')
    })

    it('shows error when inventory is full', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: Array(8).fill('item')
        })
      }))

      component.buyItem(SHOP_INVENTORY[0].id)

      expect(component.errorMessage()).toContain('full')
    })
  })

  describe('navigation', () => {
    it('returns to castle when selected', () => {
      component.handleMenuSelect('castle')
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu'])
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: FAIL (methods not implemented)

**Step 3: Update ShopComponent with buy flow logic**

```typescript
// src/app/shop/shop.component.ts
import { Component, OnInit, computed, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { GameStateService } from '../../services/GameStateService'
import { ShopService } from '../../services/ShopService'
import { InventoryService } from '../../services/InventoryService'
import { MenuComponent, MenuItem } from '../../components/menu/menu.component'
import { SceneType } from '../../types/SceneType'
import { Character } from '../../types/Character'
import { Item } from '../../types/Item'
import { SHOP_INVENTORY } from '../../data/shop-inventory'

type ShopView = 'main' | 'character-select' | 'buy' | 'sell' | 'identify'

/**
 * Shop Component (Boltac's Trading Post)
 *
 * Item trading services:
 * - Buy items from shop inventory
 * - Sell items from character inventory
 * - Identify unknown items (reveal properties)
 */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    { id: 'buy', label: 'BUY ITEMS', enabled: true, shortcut: 'B' },
    { id: 'sell', label: 'SELL ITEMS', enabled: true, shortcut: 'S' },
    { id: 'identify', label: 'IDENTIFY ITEMS', enabled: true, shortcut: 'I' },
    { id: 'castle', label: 'RETURN TO CASTLE', enabled: true, shortcut: 'C' }
  ]

  // View state
  readonly currentView = signal<ShopView>('character-select')
  readonly selectedCharacterId = signal<string | null>(null)
  readonly errorMessage = signal<string | null>(null)
  readonly successMessage = signal<string | null>(null)

  // Shop data
  readonly shopInventory = signal<Item[]>(SHOP_INVENTORY)

  // Selected character
  readonly selectedCharacter = computed(() => {
    const charId = this.selectedCharacterId()
    if (!charId) return null
    return this.gameState.state().roster.get(charId) || null
  })

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.SHOP
    }))
  }

  selectCharacter(charId: string): void {
    const char = this.gameState.state().roster.get(charId)
    if (!char) {
      this.errorMessage.set('Character not found')
      return
    }

    this.selectedCharacterId.set(charId)
    this.currentView.set('main')
    this.errorMessage.set(null)
  }

  handleMenuSelect(itemId: string): void {
    this.errorMessage.set(null)
    this.successMessage.set(null)

    switch (itemId) {
      case 'buy':
        this.currentView.set('buy')
        break

      case 'sell':
        this.currentView.set('sell')
        break

      case 'identify':
        this.currentView.set('identify')
        break

      case 'castle':
        this.router.navigate(['/castle-menu'])
        break
    }
  }

  buyItem(itemId: string): void {
    const character = this.selectedCharacter()
    if (!character) {
      this.errorMessage.set('No character selected')
      return
    }

    const item = this.shopInventory().find(i => i.id === itemId)
    if (!item) {
      this.errorMessage.set('Item not found')
      return
    }

    // Check if can afford
    if (!ShopService.canAfford(character, item)) {
      this.errorMessage.set(`Cannot afford ${item.name}. Need ${item.price} gold.`)
      return
    }

    // Check inventory space
    if (!InventoryService.hasSpace(character)) {
      this.errorMessage.set('Inventory full (max 8 items)')
      return
    }

    // Check class restrictions
    if (!InventoryService.canEquip(character, item)) {
      this.errorMessage.set(`${character.class} cannot use this item`)
      return
    }

    // Process purchase
    const charId = this.selectedCharacterId()!
    this.gameState.updateState(state => {
      const updatedChar = {
        ...character,
        gold: (character.gold || 0) - item.price,
        inventory: [...character.inventory, item.id]
      }

      return {
        ...state,
        roster: new Map(state.roster).set(charId, updatedChar)
      }
    })

    this.successMessage.set(`Purchased ${item.name} for ${item.price} gold`)
  }

  cancelView(): void {
    this.currentView.set('main')
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --ci --testPathPattern="shop.component"`

Expected: PASS (all tests passing)

**Step 5: Commit**

```bash
git add src/app/shop/
git commit -m "feat(shop): implement buy flow with transaction logic

- Character selection before shopping
- Item purchase with gold deduction
- Inventory space validation (max 8 items)
- Class restriction checking
- Affordability validation
- 10 tests passing

Part of Phase 5: Shop implementation"
```

---

## Part 2: Training Grounds - Character Creation Wizard

### Task 11: Implement CharacterCreationService - Stat Rolling (TDD)

**Files:**
- Create: `src/services/CharacterCreationService.ts`
- Create: `src/services/__tests__/CharacterCreationService.spec.ts`

**Step 1: Write failing tests for stat rolling**

```typescript
// src/services/__tests__/CharacterCreationService.spec.ts
import { CharacterCreationService } from '../CharacterCreationService'
import { Race } from '../../types/Race'

describe('CharacterCreationService', () => {
  describe('rollStats', () => {
    it('rolls 3d6 for each attribute', () => {
      const stats = CharacterCreationService.rollStats()

      // Each stat should be between 3-18 (3d6 range)
      expect(stats.strength).toBeGreaterThanOrEqual(3)
      expect(stats.strength).toBeLessThanOrEqual(18)
      expect(stats.intelligence).toBeGreaterThanOrEqual(3)
      expect(stats.intelligence).toBeLessThanOrEqual(18)
      expect(stats.piety).toBeGreaterThanOrEqual(3)
      expect(stats.piety).toBeLessThanOrEqual(18)
      expect(stats.vitality).toBeGreaterThanOrEqual(3)
      expect(stats.vitality).toBeLessThanOrEqual(18)
      expect(stats.agility).toBeGreaterThanOrEqual(3)
      expect(stats.agility).toBeLessThanOrEqual(18)
      expect(stats.luck).toBeGreaterThanOrEqual(3)
      expect(stats.luck).toBeLessThanOrEqual(18)
    })

    it('generates random bonus points (0-20)', () => {
      const stats = CharacterCreationService.rollStats()

      expect(stats.bonusPoints).toBeGreaterThanOrEqual(0)
      expect(stats.bonusPoints).toBeLessThanOrEqual(20)
    })
  })

  describe('applyRaceModifiers', () => {
    it('applies human modifiers (no changes)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.HUMAN)

      expect(result.strength).toBe(10)
      expect(result.intelligence).toBe(10)
    })

    it('applies elf modifiers (-1 STR, +1 INT, -1 VIT, +1 AGI)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.ELF)

      expect(result.strength).toBe(9)
      expect(result.intelligence).toBe(11)
      expect(result.vitality).toBe(8)
      expect(result.agility).toBe(11)
    })

    it('applies dwarf modifiers (+2 STR, +2 VIT, -1 AGI)', () => {
      const baseStats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10
      }

      const result = CharacterCreationService.applyRaceModifiers(baseStats, Race.DWARF)

      expect(result.strength).toBe(12)
      expect(result.vitality).toBe(12)
      expect(result.agility).toBe(9)
    })
  })

  describe('allocateBonusPoints', () => {
    it('adds bonus points to specified stat', () => {
      const stats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 5
      }

      const result = CharacterCreationService.allocateBonusPoints(stats, 'strength', 3)

      expect(result.strength).toBe(13)
      expect(result.bonusPoints).toBe(2)
    })

    it('throws error when not enough bonus points', () => {
      const stats = {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        bonusPoints: 2
      }

      expect(() => {
        CharacterCreationService.allocateBonusPoints(stats, 'strength', 5)
      }).toThrow('Not enough bonus points')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --ci --testPathPattern="CharacterCreationService"`

Expected: FAIL (CharacterCreationService not found)

**Step 3: Implement CharacterCreationService**

```typescript
// src/services/CharacterCreationService.ts
import { Race, RACE_MODIFIERS } from '../types/Race'

export interface BaseStats {
  strength: number
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number
}

export interface RolledStats extends BaseStats {
  bonusPoints: number
}

/**
 * CharacterCreationService - Character creation wizard logic
 *
 * Features:
 * - Roll random stats (3d6 per attribute)
 * - Apply race modifiers
 * - Allocate bonus points
 * - Calculate eligible classes
 */
export class CharacterCreationService {
  /**
   * Roll 3d6 for each attribute and random bonus points (0-20).
   */
  static rollStats(): RolledStats {
    return {
      strength: this.roll3d6(),
      intelligence: this.roll3d6(),
      piety: this.roll3d6(),
      vitality: this.roll3d6(),
      agility: this.roll3d6(),
      luck: this.roll3d6(),
      bonusPoints: Math.floor(Math.random() * 21) // 0-20
    }
  }

  /**
   * Roll 3d6 (sum of three 6-sided dice).
   */
  private static roll3d6(): number {
    return (
      Math.floor(Math.random() * 6) + 1 +
      Math.floor(Math.random() * 6) + 1 +
      Math.floor(Math.random() * 6) + 1
    )
  }

  /**
   * Apply race modifiers to base stats.
   */
  static applyRaceModifiers(stats: BaseStats, race: Race): BaseStats {
    const modifiers = RACE_MODIFIERS[race]

    return {
      strength: stats.strength + modifiers.strength,
      intelligence: stats.intelligence + modifiers.intelligence,
      piety: stats.piety + modifiers.piety,
      vitality: stats.vitality + modifiers.vitality,
      agility: stats.agility + modifiers.agility,
      luck: stats.luck + modifiers.luck
    }
  }

  /**
   * Allocate bonus points to a specific stat.
   * Throws error if not enough bonus points available.
   */
  static allocateBonusPoints(
    stats: RolledStats,
    stat: keyof BaseStats,
    points: number
  ): RolledStats {
    if (stats.bonusPoints < points) {
      throw new Error('Not enough bonus points')
    }

    return {
      ...stats,
      [stat]: stats[stat] + points,
      bonusPoints: stats.bonusPoints - points
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --ci --testPathPattern="CharacterCreationService"`

Expected: PASS (all tests passing)

**Step 5: Commit**

```bash
git add src/services/CharacterCreationService.ts src/services/__tests__/CharacterCreationService.spec.ts
git commit -m "feat(training): implement character creation stat rolling

- Roll 3d6 for each attribute (STR, INT, PIE, VIT, AGI, LUK)
- Random bonus points (0-20)
- Apply race modifiers (Human, Elf, Dwarf, etc.)
- Allocate bonus points to stats
- 10 tests passing

Part of Phase 5: Training Grounds implementation"
```

---

## Execution Summary

**Remaining Tasks (12-15):**
- Task 12: Update TrainingGroundsComponent - Character Creation Wizard UI
- Task 13: Implement ShopComponent - Sell Flow
- Task 14: Implement ShopComponent - Identify Flow
- Task 15: Integration Testing & Polish

**Each task follows TDD methodology:**
- Write failing test → Run to verify failure → Implement → Run to verify pass → Commit

**Total estimated tests for completion:** 240+ tests
**Execution time remaining:** 4-6 days

**Success criteria:**
- All placeholder messages removed
- Full business logic implemented
- Auto-save after transactions
- All tests passing (<4s)
- Integration with existing Phase 1-4 functionality

---

## Notes for Implementation

**Reference Documentation:**
- `/docs/ui/scenes/04-boltacs-trading-post.md` - Complete Shop mechanics
- `/docs/ui/scenes/02-training-grounds.md` - Character creation wizard
- `/docs/services/` - Service-specific documentation

**Testing Requirements:**
- Follow TDD: test → fail → implement → pass → commit
- Maintain <4s test execution time
- Target 80%+ coverage

**Code Style:**
- Pure functions for services (no side effects)
- Immutable state updates (spread operators)
- Signal-based reactivity in components
- Standalone Angular components

**Common Pitfalls:**
- Cursed items cannot be sold (only uncursed)
- Class restrictions must be checked before purchase
- Ninja class requires ALL stats at 17 (extremely rare!)
- Character creation wizard is multi-step (must maintain state between steps)
