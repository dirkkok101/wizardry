import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopComponent } from './shop.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { SceneType } from '@models/SceneType';
import { Character } from '@models/Character';
import { Item } from '@models/Item';
import { ItemType, ItemSlot } from '@models/ItemType';
import { CharacterClass } from '@models/CharacterClass';
import { Race } from '@models/Race';
import { Alignment } from '@models/Alignment';
import { CharacterStatus } from '@models/CharacterStatus';

// Test item fixtures that match JSON item structure
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
});

const TEST_LONG_SWORD: Item = createTestItem({
  id: 'long_sword',
  name: 'Long Sword',
  type: ItemType.WEAPON,
  slot: ItemSlot.WEAPON,
  price: 25,
  damage: 8
});

describe('ShopComponent', () => {
  let component: ShopComponent;
  let fixture: ComponentFixture<ShopComponent>;
  let gameState: GameStateService;
  let navigationService: SceneNavigationService;
  let messageService: MessageService;

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
    age: 18,
    hp: 10,
    maxHp: 10,
    ac: 10,
    vim: { current: 16, max: 16 },
    knownSpells: [],
    inventory: [],
    gold: 0,
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
    navigationService = TestBed.inject(SceneNavigationService);
    messageService = TestBed.inject(MessageService);

    jest.spyOn(navigationService, 'returnToCastle').mockImplementation(() => Promise.resolve(true));
    jest.spyOn(navigationService, 'inspectCharacter').mockImplementation(() => Promise.resolve(true));

    // Setup roster with character and party with gold
    gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set('char-1', mockCharacter),
      party: {
        ...state.party,
        members: ['char-1'],
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

    it('displays shop title using SceneTitleComponent', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      const sceneTitle = compiled.querySelector('app-scene-title');
      expect(sceneTitle).toBeTruthy();
    });

    it('starts on character selection view when multiple party members', () => {
      // Add a second party member so auto-select doesn't trigger
      const secondCharacter = { ...mockCharacter, id: 'char-2', name: 'Frodo' };
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-2', secondCharacter),
        party: {
          ...state.party,
          members: ['char-1', 'char-2']
        }
      }));

      component.ngOnInit();
      expect(component.currentView()).toBe('character-select');
    });

    it('auto-selects character and goes to buy view when only one party member', () => {
      component.ngOnInit();
      expect(component.selectedCharacterId()).toBe('char-1');
      expect(component.currentView()).toBe('buy');
    });

    it('shows footer menu items for character selection view', () => {
      component.currentView.set('character-select');
      const menuItems = component.footerMenuItems();
      expect(menuItems.some(m => m.id === 'leave')).toBe(true);
    });

    it('shows footer menu items for buy view', () => {
      component.selectCharacter('char-1');
      const menuItems = component.footerMenuItems();
      expect(menuItems.some(m => m.id === 'back')).toBe(true);
    });
  });

  describe('character selection', () => {
    it('sets selected character', () => {
      component.selectCharacter('char-1');
      expect(component.selectedCharacterId()).toBe('char-1');
    });

    it('transitions to buy view after selection', () => {
      component.selectCharacter('char-1');
      expect(component.currentView()).toBe('buy');
    });

    it('shows error when character not found', () => {
      component.selectCharacter('nonexistent');
      expect(messageService.hasMessage()).toBe(true);
    });
  });

  describe('navigation', () => {
    it('returns to castle when leave action selected', () => {
      component.handleFooterAction('leave');
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('returns to character selection when back action selected from buy view', () => {
      component.selectCharacter('char-1');
      component.handleFooterAction('back');
      expect(component.currentView()).toBe('character-select');
      expect(component.selectedCharacterId()).toBe(null);
    });

    it('handles ESC key to return to castle from character-select view', () => {
      component.currentView.set('character-select');
      component.handleKeydown({ key: 'Escape' } as KeyboardEvent);
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('handles ESC key to return to character-select from buy view', () => {
      component.selectCharacter('char-1');
      component.handleKeydown({ key: 'Escape' } as KeyboardEvent);
      expect(component.currentView()).toBe('character-select');
    });

    it('handles ESC key to cancel confirmation dialog - dialog handles this', () => {
      component.selectCharacter('char-1');
      component.showConfirmation.set(true);
      component.cancelAction();
      expect(component.showConfirmation()).toBe(false);
    });
  });

  describe('buy flow', () => {
    beforeEach(() => {
      component.selectCharacter('char-1');
    });

    it('shows confirmation dialog when initiating buy', () => {
      const shopItems = component.shopInventory();
      const item = shopItems[0];
      component.initiateBuy(item.id);
      expect(component.showConfirmation()).toBe(true);
      expect(component.confirmationMessage()).toContain(item.name);
    });

    it('deducts gold from party after confirming purchase', () => {
      const initialGold = gameState.state().party.gold || 0;
      const shopItems = component.shopInventory();
      const item = shopItems[0];

      component.initiateBuy(item.id);
      component.confirmAction();

      expect(gameState.state().party.gold).toBe(initialGold - item.price);
    });

    it('adds item to character inventory after confirming purchase', () => {
      const shopItems = component.shopInventory();
      const item = shopItems[0];

      component.initiateBuy(item.id);
      component.confirmAction();

      const char = gameState.state().roster.get('char-1')!;
      // Item has unique instance ID, so check by name instead
      expect(char.inventory.find(i => i.name === item.name)).toBeDefined();
    });

    it('shows error when party cannot afford item', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 10
        }
      }));

      const shopItems = component.shopInventory();
      const expensiveItem = shopItems.find(i => i.price > 10);
      if (expensiveItem) {
        component.initiateBuy(expensiveItem.id);
        expect(messageService.messageText()).toContain('afford');
        expect(component.showConfirmation()).toBe(false);
      }
    });

    it('shows error when inventory is full', () => {
      const dummyItem = createTestItem({ id: 'item', name: 'Item' });
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: Array(8).fill(dummyItem)
        })
      }));

      const shopItems = component.shopInventory();
      component.initiateBuy(shopItems[0].id);

      expect(messageService.messageText()).toContain('full');
      expect(component.showConfirmation()).toBe(false);
    });

    it('shows error when no character selected', () => {
      component.selectedCharacterId.set(null);
      const shopItems = component.shopInventory();
      component.initiateBuy(shopItems[0].id);

      expect(messageService.messageText()).toContain('No character selected');
    });

    it('cancels buy when cancel action called', () => {
      const shopItems = component.shopInventory();
      const item = shopItems[0];
      component.initiateBuy(item.id);
      component.cancelAction();

      expect(component.showConfirmation()).toBe(false);
      const char = gameState.state().roster.get('char-1')!;
      // Item should not be in inventory since purchase was cancelled
      expect(char.inventory.find(i => i.name === item.name)).toBeUndefined();
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      component.selectCharacter('char-1');
    });

    it('partyGold returns correct party gold', () => {
      expect(component.partyGold()).toBe(500);
    });

    it('partyCharacters returns party members', () => {
      const members = component.partyCharacters();
      expect(members.length).toBe(1);
      expect(members[0].id).toBe('char-1');
    });
  });

  describe('character action handling', () => {
    it('selects character on buy action', () => {
      component.handleCharacterAction({
        characterId: 'char-1',
        actionType: 'buy'
      });

      expect(component.selectedCharacterId()).toBe('char-1');
      expect(component.currentView()).toBe('buy');
    });

    it('navigates to inspect on inspect action', () => {
      component.handleCharacterAction({
        characterId: 'char-1',
        actionType: 'inspect'
      });

      expect(navigationService.inspectCharacter).toHaveBeenCalledWith('char-1', 'shop');
    });
  });
});
