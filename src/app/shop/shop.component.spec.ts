import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ShopComponent } from './shop.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';
import { Race } from '../../types/Race';
import { Alignment } from '../../types/Alignment';
import { CharacterStatus } from '../../types/CharacterStatus';
import { SHOP_INVENTORY } from '../../data/shop-inventory';

describe('ShopComponent', () => {
  let component: ShopComponent;
  let fixture: ComponentFixture<ShopComponent>;
  let gameState: GameStateService;
  let router: Router;

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Gandalf',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.GOOD,
    status: CharacterStatus.OK,
    strength: 15,
    intelligence: 10,
    piety: 10,
    vitality: 12,
    agility: 10,
    luck: 10,
    level: 1,
    experience: 0,
    hp: 10,
    maxHp: 10,
    ac: 10,
    inventory: [],
    password: 'test',
    createdAt: Date.now(),
    lastModified: Date.now()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ShopComponent]
    });

    fixture = TestBed.createComponent(ShopComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Setup roster with character and party with gold
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter),
      party: {
        ...state.party,
        gold: 500
      }
    }));
  });

  describe('initialization', () => {
    it('updates scene to SHOP on init', () => {
      component.ngOnInit();
      expect(gameState.currentScene()).toBe(SceneType.SHOP);
    });

    it('loads shop inventory', () => {
      component.ngOnInit();
      expect(component.shopInventory().length).toBeGreaterThan(0);
    });

    it('displays shop title', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain('BOLTAC');
    });

    it('shows menu options', () => {
      fixture.detectChanges();
      expect(component.menuItems.length).toBe(4);
      expect(component.menuItems[0].id).toBe('buy');
      expect(component.menuItems[1].id).toBe('sell');
      expect(component.menuItems[2].id).toBe('identify');
      expect(component.menuItems[3].id).toBe('castle');
    });
  });

  describe('character selection', () => {
    it('sets selected character', () => {
      component.selectCharacter('char-1');
      expect(component.selectedCharacterId()).toBe('char-1');
    });

    it('shows error when character not found', () => {
      component.selectCharacter('nonexistent');
      expect(component.errorMessage()).toBeTruthy();
    });
  });

  describe('buy flow', () => {
    beforeEach(() => {
      component.selectCharacter('char-1');
    });

    it('deducts gold from party when purchasing item', () => {
      const initialGold = gameState.state().party.gold || 0;
      const item = SHOP_INVENTORY[0];

      component.buyItem(item.id);

      expect(gameState.state().party.gold).toBe(initialGold - item.price);
    });

    it('adds item to character inventory', () => {
      const item = SHOP_INVENTORY[0];

      component.buyItem(item.id);

      const char = gameState.state().roster.get('char-1')!;
      expect(char.inventory).toContain(item.id);
    });

    it('shows error when party cannot afford item', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 10
        }
      }));

      const expensiveItem = SHOP_INVENTORY.find(i => i.price > 100)!;

      component.buyItem(expensiveItem.id);

      expect(component.errorMessage()).toContain('afford');
    });

    it('shows error when inventory is full', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: Array(8).fill('item')
        })
      }));

      component.buyItem(SHOP_INVENTORY[0].id);

      expect(component.errorMessage()).toContain('full');
    });

    it('shows error when no character selected', () => {
      component.selectedCharacterId.set(null);

      component.buyItem(SHOP_INVENTORY[0].id);

      expect(component.errorMessage()).toContain('No character selected');
    });
  });

  describe('placeholder services', () => {
    it('shows buy placeholder when selected', () => {
      component.handleMenuSelect('buy');
      expect(component.currentView()).toBe('buy');
    });

    it('shows sell placeholder when selected', () => {
      component.handleMenuSelect('sell');
      expect(component.currentView()).toBe('sell');
    });

    it('shows identify placeholder when selected', () => {
      component.handleMenuSelect('identify');
      expect(component.currentView()).toBe('identify');
    });
  });

  describe('navigation', () => {
    it('returns to castle when selected', () => {
      component.handleMenuSelect('castle');
      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
