// src/app/__tests__/integration/shop-flows.integration.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router, ActivatedRoute } from '@angular/router'
import { of } from 'rxjs'
import { ShopComponent } from '@scenes/shop/shop.component'
import { CharacterInspectionComponent } from '@scenes/character-inspection/character-inspection.component'
import { GameStateService } from '@services/GameStateService'
import { ItemDataLoader } from '@services/ItemDataLoader'
import { ShopService } from '@services/ShopService'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
import { Item } from '@models/Item'
import { ItemType, ItemSlot } from '@models/ItemType'
import * as fs from 'fs'
import * as path from 'path'

describe('Integration: Shop Flows', () => {
  beforeAll(async () => {
    // Mock fetch to load real data files
    global.fetch = jest.fn((url: string) => {
      const urlPath = url.toString();
      // Match either /items/ or /assets/items/ paths
      const match = urlPath.match(/\/(?:assets\/)?(items)\/([^/]+\.json)$/);
      if (match) {
        const [, directory, filename] = match;
        const dataPath = path.join(__dirname, '../../../../data', directory, filename);
        try {
          const fileContent = fs.readFileSync(dataPath, 'utf-8');
          const jsonData = JSON.parse(fileContent);
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(jsonData)
          } as Response);
        } catch (error) {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found'
          } as Response);
        }
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);
    });

    // Load items for shop tests
    await ItemDataLoader.loadAllItems();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Shop Buy Flow', () => {
    let component: ShopComponent
    let fixture: ComponentFixture<ShopComponent>
    let gameState: GameStateService

    const mockCharacter: Character = {
      id: 'char-1',
      name: 'TestChar',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      level: 1,
      experience: 0,
      hp: 10,
      maxHp: 10,
      ac: 10,
      status: CharacterStatus.OK,
      strength: 15,
      intelligence: 10,
      piety: 10,
      vitality: 12,
      agility: 10,
      luck: 10,
      inventory: [],
      password: 'test123',
      createdAt: Date.now(),
      lastModified: Date.now()
    } as Character

    beforeEach(async () => {
      // Reset ItemDataLoader before each test
      ItemDataLoader['itemsCache'] = null;
      ItemDataLoader['loadPromise'] = null;
      ItemDataLoader['loaded'] = false;
      ItemDataLoader['loading'] = false;
      ItemDataLoader['loadError'] = null;
      ItemDataLoader['failedItems'].clear();

      // Reload items for this test
      await ItemDataLoader.loadAllItems();

      TestBed.configureTestingModule({
        imports: [ShopComponent],
        providers: [
          {
            provide: Router,
            useValue: {
              navigate: jest.fn()
            }
          }
        ]
      })

      fixture = TestBed.createComponent(ShopComponent)
      component = fixture.componentInstance
      gameState = TestBed.inject(GameStateService)

      // Setup game state with character
      gameState.updateState(state => ({
        ...state,
        roster: new Map([['char-1', mockCharacter]]),
        party: {
          members: ['char-1'],
          gold: 1000,
          position: { x: 0, y: 0 },
          facing: 'north'
        }
      }))

      component.ngOnInit()
      component.selectCharacter('char-1')
    })

    it('completes buy flow with state persistence', () => {
      const initialGold = gameState.state().party.gold || 0
      const shopItems = component.shopInventory()

      // BUY FLOW - shop now goes directly to buy view
      expect(component.currentView()).toBe('buy')

      // Buy Long Sword
      const longSword = shopItems.find(i => i.name === 'Long Sword')!
      component.initiateBuy(longSword.id)
      component.confirmAction()

      // Verify item in inventory (with unique instance ID)
      let character = gameState.state().roster.get('char-1')!
      expect(character.inventory.some(i => i.id.startsWith('long_sword_'))).toBe(true)
      expect(gameState.state().party.gold).toBe(initialGold - longSword.price)

      // Buy another item
      const dagger = shopItems.find(i => i.name === 'Dagger')!
      component.initiateBuy(dagger.id)
      component.confirmAction()

      // Verify both items in inventory
      character = gameState.state().roster.get('char-1')!
      expect(character.inventory.some(i => i.id.startsWith('long_sword_'))).toBe(true)
      expect(character.inventory.some(i => i.id.startsWith('dagger_'))).toBe(true)
      expect(gameState.state().party.gold).toBe(initialGold - longSword.price - dagger.price)
    })

    it('generates unique IDs for multiple purchases of same item', () => {
      const shopItems = component.shopInventory()
      const dagger = shopItems.find(i => i.name === 'Dagger')!

      // Buy same item twice
      component.initiateBuy(dagger.id)
      component.confirmAction()
      component.initiateBuy(dagger.id)
      component.confirmAction()

      // Verify both items have different IDs
      const character = gameState.state().roster.get('char-1')!
      const daggers = character.inventory.filter(i => i.name === 'Dagger')
      expect(daggers.length).toBe(2)
      expect(daggers[0].id).not.toBe(daggers[1].id)
    })

    it('persists inventory changes across navigation', () => {
      const shopItems = component.shopInventory()

      // Buy an item
      const item1 = shopItems[0]
      component.initiateBuy(item1.id)
      component.confirmAction()

      // Go back to character selection
      component.handleFooterAction('back')
      expect(component.currentView()).toBe('character-select')

      // Item should still be in inventory
      const character = gameState.state().roster.get('char-1')!
      expect(character.inventory.some(i => i.name === item1.name)).toBe(true)

      // Select character again
      component.selectCharacter('char-1')
      expect(component.currentView()).toBe('buy')

      // Item should still be there
      const character2 = gameState.state().roster.get('char-1')!
      expect(character2.inventory.some(i => i.name === item1.name)).toBe(true)
    })
  })

  describe('Character Inspection Shop Actions', () => {
    let component: CharacterInspectionComponent
    let fixture: ComponentFixture<CharacterInspectionComponent>
    let gameState: GameStateService

    const createTestItem = (overrides: Partial<Item> = {}): Item => ({
      id: 'test-item',
      name: 'Test Item',
      type: ItemType.WEAPON,
      slot: ItemSlot.WEAPON,
      price: 100,
      damage: 5,
      cursed: false,
      identified: true,
      equipped: false,
      ...overrides
    })

    const mockCharacter: Character = {
      id: 'char-1',
      name: 'TestChar',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      level: 1,
      experience: 0,
      hp: 10,
      maxHp: 10,
      ac: 10,
      status: CharacterStatus.OK,
      strength: 15,
      intelligence: 10,
      piety: 10,
      vitality: 12,
      agility: 10,
      luck: 10,
      inventory: [],
      password: 'test123',
      createdAt: Date.now(),
      lastModified: Date.now()
    } as Character

    beforeEach(async () => {
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          {
            provide: Router,
            useValue: { navigate: jest.fn() }
          },
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({ characterId: 'char-1', returnTo: 'shop' })
            }
          }
        ]
      })

      fixture = TestBed.createComponent(CharacterInspectionComponent)
      component = fixture.componentInstance
      gameState = TestBed.inject(GameStateService)
    })

    it('sells item and adds gold to party', () => {
      const sellableItem = createTestItem({
        id: 'sellable-sword',
        name: 'Sellable Sword',
        price: 200
      })

      gameState.updateState(state => ({
        ...state,
        roster: new Map([['char-1', { ...mockCharacter, inventory: [sellableItem] }]]),
        party: { members: ['char-1'], gold: 500, position: { x: 0, y: 0 }, facing: 'north' }
      }))

      fixture.detectChanges()

      // Verify shop context is enabled
      expect(component.isShopContext()).toBe(true)
      expect(component.shopContext()?.enabled).toBe(true)

      // Sell the item
      component.handleItemAction({ type: 'sell', item: sellableItem })

      // Verify item removed and gold added
      const character = gameState.state().roster.get('char-1')!
      expect(character.inventory.length).toBe(0)
      expect(gameState.state().party.gold).toBe(600) // 500 + 100 (50% of 200)
    })

    it('identifies item and deducts gold from party', () => {
      const unidentifiedItem = createTestItem({
        id: 'mystery-sword',
        name: 'Mystery Sword',
        unidentifiedName: 'Unknown Blade',
        price: 300,
        identified: false
      })

      gameState.updateState(state => ({
        ...state,
        roster: new Map([['char-1', { ...mockCharacter, inventory: [unidentifiedItem] }]]),
        party: { members: ['char-1'], gold: 500, position: { x: 0, y: 0 }, facing: 'north' }
      }))

      fixture.detectChanges()

      // Identify the item
      component.handleItemAction({ type: 'identify', item: unidentifiedItem })

      // Verify item is now identified and gold deducted
      const character = gameState.state().roster.get('char-1')!
      const item = character.inventory[0]
      expect(item.identified).toBe(true)
      expect(gameState.state().party.gold).toBe(400) // 500 - 100 (identify cost)
    })

    it('uncurses item and deducts gold from party', () => {
      const cursedItem = createTestItem({
        id: 'cursed-blade',
        name: 'Cursed Blade',
        price: 400,
        cursed: true,
        identified: true
      })

      gameState.updateState(state => ({
        ...state,
        roster: new Map([['char-1', { ...mockCharacter, inventory: [cursedItem] }]]),
        party: { members: ['char-1'], gold: 500, position: { x: 0, y: 0 }, facing: 'north' }
      }))

      fixture.detectChanges()

      // Uncurse the item
      component.handleItemAction({ type: 'uncurse', item: cursedItem })

      // Verify item is no longer cursed and gold deducted
      const character = gameState.state().roster.get('char-1')!
      const item = character.inventory[0]
      expect(item.cursed).toBe(false)
      expect(gameState.state().party.gold).toBe(300) // 500 - 200 (50% of 400)
    })

    it('shows shop context only when coming from shop', () => {
      // Test with shop returnTo
      gameState.updateState(state => ({
        ...state,
        roster: new Map([['char-1', mockCharacter]]),
        party: { members: ['char-1'], gold: 500, position: { x: 0, y: 0 }, facing: 'north' }
      }))

      fixture.detectChanges()
      expect(component.isShopContext()).toBe(true)
      expect(component.shopContext()).not.toBeNull()
    })

    it('does not show shop context when coming from tavern', async () => {
      // Reset with tavern returnTo
      TestBed.resetTestingModule()
      TestBed.configureTestingModule({
        imports: [CharacterInspectionComponent],
        providers: [
          { provide: Router, useValue: { navigate: jest.fn() } },
          {
            provide: ActivatedRoute,
            useValue: {
              queryParams: of({ characterId: 'char-1', returnTo: 'tavern' })
            }
          }
        ]
      })

      const newFixture = TestBed.createComponent(CharacterInspectionComponent)
      const newComponent = newFixture.componentInstance
      const newGameState = TestBed.inject(GameStateService)

      newGameState.updateState(state => ({
        ...state,
        roster: new Map([['char-1', mockCharacter]]),
        party: { members: ['char-1'], gold: 500, position: { x: 0, y: 0 }, facing: 'north' }
      }))

      newFixture.detectChanges()
      expect(newComponent.isShopContext()).toBe(false)
      expect(newComponent.shopContext()).toBeNull()
    })
  })
})
