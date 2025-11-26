// src/app/__tests__/integration/shop-flows.integration.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { ShopComponent } from '@scenes/shop/shop.component'
import { GameStateService } from '@services/GameStateService'
import { ItemDataLoader } from '@services/ItemDataLoader'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { Race } from '@models/Race'
import { Alignment } from '@models/Alignment'
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

  it('completes buy → sell flow with state persistence', () => {
    const initialGold = gameState.state().party.gold || 0
    const shopItems = component.shopInventory()

    // BUY FLOW
    component.handleFooterAction('buy')
    expect(component.currentView()).toBe('buy')

    // Buy Long Sword
    const longSword = shopItems.find(i => i.name === 'Long Sword')!
    component.initiateBuy(longSword.id)
    component.confirmAction()

    // Verify item in inventory and gold deducted
    let character = gameState.state().roster.get('char-1')!
    expect(character.inventory.find(i => i.id === longSword.id)).toBeDefined()
    expect(gameState.state().party.gold).toBe(initialGold - longSword.price)

    // Buy another item
    const dagger = shopItems.find(i => i.name === 'Dagger')!
    component.initiateBuy(dagger.id)
    component.confirmAction()

    // Verify both items in inventory
    character = gameState.state().roster.get('char-1')!
    expect(character.inventory.find(i => i.id === longSword.id)).toBeDefined()
    expect(character.inventory.find(i => i.id === dagger.id)).toBeDefined()
    expect(gameState.state().party.gold).toBe(initialGold - longSword.price - dagger.price)

    // SELL FLOW
    component.handleFooterAction('sell')
    expect(component.currentView()).toBe('sell')

    // Sell the Long Sword (50% of price)
    const sellPrice = Math.floor(longSword.price * 0.5)
    component.initiateSell(longSword.id)
    component.confirmAction()

    // Verify item removed and gold added
    character = gameState.state().roster.get('char-1')!
    expect(character.inventory.find(i => i.id === longSword.id)).toBeUndefined()
    expect(character.inventory.find(i => i.id === dagger.id)).toBeDefined() // Dagger should still be there
    expect(gameState.state().party.gold).toBe(
      initialGold - longSword.price - dagger.price + sellPrice
    )

    // Verify view persisted
    expect(component.currentView()).toBe('sell')
  })

  it('maintains gold balance across multiple transactions', () => {
    const initialGold = gameState.state().party.gold || 0
    const shopItems = component.shopInventory()

    // Find items with known prices (no class restrictions for FIGHTER)
    const dagger = shopItems.find(i => i.name === 'Dagger')!
    const leatherArmor = shopItems.find(i => i.name === 'Leather Armor')!

    // Buy 2 items
    component.handleFooterAction('buy')
    component.initiateBuy(dagger.id)
    component.confirmAction()
    component.initiateBuy(leatherArmor.id)
    component.confirmAction()

    // Verify gold after purchases
    expect(gameState.state().party.gold).toBe(initialGold - dagger.price - leatherArmor.price)

    // Sell 1 item
    component.handleFooterAction('sell')
    const daggerSellPrice = Math.floor(dagger.price * 0.5)
    component.initiateSell(dagger.id)
    component.confirmAction()

    // Verify gold after sale
    expect(gameState.state().party.gold).toBe(initialGold - dagger.price - leatherArmor.price + daggerSellPrice)

    // Verify inventory state
    const character = gameState.state().roster.get('char-1')!
    expect(character.inventory.length).toBe(1)
    expect(character.inventory.find(i => i.id === leatherArmor.id)).toBeDefined()
    expect(character.inventory.find(i => i.id === dagger.id)).toBeUndefined()
  })

  it('persists inventory changes across flow transitions', () => {
    const shopItems = component.shopInventory()

    // Buy an item
    component.handleFooterAction('buy')
    const item1 = shopItems[0]
    component.initiateBuy(item1.id)
    component.confirmAction()

    // Switch to sell view
    component.handleFooterAction('sell')

    // Item should still be in inventory
    const character = gameState.state().roster.get('char-1')!
    expect(character.inventory.find(i => i.id === item1.id)).toBeDefined()

    // Switch to identify view
    component.handleFooterAction('identify')

    // Item should still be there
    const character2 = gameState.state().roster.get('char-1')!
    expect(character2.inventory.find(i => i.id === item1.id)).toBeDefined()
  })
})
