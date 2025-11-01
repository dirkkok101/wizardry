// src/app/__tests__/integration/shop-flows.integration.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { ShopComponent } from '../../shop/shop.component'
import { GameStateService } from '../../../services/GameStateService'
import { Character } from '../../../types/Character'
import { CharacterClass } from '../../../types/CharacterClass'
import { CharacterStatus } from '../../../types/CharacterStatus'
import { Race } from '../../../types/Race'
import { Alignment } from '../../../types/Alignment'
import { SHOP_INVENTORY, UNIDENTIFIED_ITEMS } from '../../../data/shop-inventory'

describe('Integration: Shop Flows', () => {
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

  beforeEach(() => {
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

    // BUY FLOW
    component.handleMenuSelect('buy')
    expect(component.currentView()).toBe('buy')

    // Buy Long Sword (200 gold)
    const longSword = SHOP_INVENTORY.find(i => i.name === 'Long Sword')!
    component.buyItem(longSword.id)

    // Verify item in inventory and gold deducted
    let character = gameState.state().roster.get('char-1')!
    expect(character.inventory).toContain(longSword.id)
    expect(gameState.state().party.gold).toBe(initialGold - longSword.price)

    // Buy another item
    const dagger = SHOP_INVENTORY.find(i => i.name === 'Dagger')!
    component.buyItem(dagger.id)

    // Verify both items in inventory
    character = gameState.state().roster.get('char-1')!
    expect(character.inventory).toContain(longSword.id)
    expect(character.inventory).toContain(dagger.id)
    expect(gameState.state().party.gold).toBe(initialGold - longSword.price - dagger.price)

    // SELL FLOW
    component.handleMenuSelect('sell')
    expect(component.currentView()).toBe('sell')

    // Sell the Long Sword (100 gold - 50% of 200)
    const sellPrice = Math.floor(longSword.price * 0.5)
    component.sellItem(longSword.id)

    // Verify item removed and gold added
    character = gameState.state().roster.get('char-1')!
    expect(character.inventory).not.toContain(longSword.id)
    expect(character.inventory).toContain(dagger.id) // Dagger should still be there
    expect(gameState.state().party.gold).toBe(
      initialGold - longSword.price - dagger.price + sellPrice
    )

    // Verify view persisted
    expect(component.currentView()).toBe('sell')
  })

  it('maintains gold balance across multiple transactions', () => {
    const initialGold = gameState.state().party.gold || 0

    // Find items with known prices (no class restrictions for FIGHTER)
    const dagger = SHOP_INVENTORY.find(i => i.name === 'Dagger')! // 20 gold
    const leatherArmor = SHOP_INVENTORY.find(i => i.name === 'Leather Armor')! // 50 gold

    // Buy 2 items
    component.handleMenuSelect('buy')
    component.buyItem(dagger.id)
    component.buyItem(leatherArmor.id)

    // Expected gold: 1000 - 20 - 50 = 930
    expect(gameState.state().party.gold).toBe(initialGold - dagger.price - leatherArmor.price)

    // Sell 1 item
    component.handleMenuSelect('sell')
    const daggerSellPrice = Math.floor(dagger.price * 0.5)
    component.sellItem(dagger.id)

    // Expected gold: 930 + 10 = 940
    expect(gameState.state().party.gold).toBe(initialGold - dagger.price - leatherArmor.price + daggerSellPrice)

    // Verify inventory state
    const character = gameState.state().roster.get('char-1')!
    expect(character.inventory.length).toBe(1)
    expect(character.inventory).toContain(leatherArmor.id)
    expect(character.inventory).not.toContain(dagger.id)
  })

  it('persists inventory changes across flow transitions', () => {
    // Buy an item
    component.handleMenuSelect('buy')
    const item1 = SHOP_INVENTORY[0]
    component.buyItem(item1.id)

    // Switch to sell view
    component.handleMenuSelect('sell')

    // Item should still be in inventory
    const character = gameState.state().roster.get('char-1')!
    expect(character.inventory).toContain(item1.id)

    // Switch to identify view
    component.handleMenuSelect('identify')

    // Item should still be there
    const character2 = gameState.state().roster.get('char-1')!
    expect(character2.inventory).toContain(item1.id)
  })
})
