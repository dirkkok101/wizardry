import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopComponent } from './shop.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { SceneType } from '@types/SceneType';
import { Character } from '@types/Character';
import { Item } from '@types/Item';
import { CharacterClass } from '@types/CharacterClass';
import { Race } from '@types/Race';
import { Alignment } from '@types/Alignment';
import { CharacterStatus } from '@types/CharacterStatus';
import { SHOP_INVENTORY, UNIDENTIFIED_ITEMS } from '@config/shop-inventory';

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

    it('auto-selects character when only one party member', () => {
      component.ngOnInit();
      expect(component.selectedCharacterId()).toBe('char-1');
      expect(component.currentView()).toBe('main');
    });

    it('shows footer menu items for character selection view', () => {
      component.currentView.set('character-select');
      const menuItems = component.footerMenuItems();
      expect(menuItems.some(m => m.id === 'leave')).toBe(true);
    });

    it('shows footer menu items for main view', () => {
      component.selectCharacter('char-1');
      const menuItems = component.footerMenuItems();
      expect(menuItems.some(m => m.id === 'buy')).toBe(true);
      expect(menuItems.some(m => m.id === 'sell')).toBe(true);
      expect(menuItems.some(m => m.id === 'identify')).toBe(true);
      expect(menuItems.some(m => m.id === 'uncurse')).toBe(true);
      expect(menuItems.some(m => m.id === 'leave')).toBe(true);
    });
  });

  describe('character selection', () => {
    it('sets selected character', () => {
      component.selectCharacter('char-1');
      expect(component.selectedCharacterId()).toBe('char-1');
    });

    it('transitions to main view after selection', () => {
      component.selectCharacter('char-1');
      expect(component.currentView()).toBe('main');
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

    it('returns to main view when back action selected', () => {
      component.selectCharacter('char-1');
      component.currentView.set('buy');
      component.handleFooterAction('back');
      expect(component.currentView()).toBe('main');
    });

    it('handles ESC key to return to castle from main view', () => {
      component.selectCharacter('char-1');
      component.handleKeydown({ key: 'Escape' } as KeyboardEvent);
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('handles ESC key to return to main from sub-views', () => {
      component.selectCharacter('char-1');
      component.currentView.set('buy');
      component.handleKeydown({ key: 'Escape' } as KeyboardEvent);
      expect(component.currentView()).toBe('main');
    });

    it('handles ESC key to cancel confirmation dialog - dialog handles this', () => {
      // Note: When confirmation dialog is showing, keyboard events are handled by the dialog itself
      // The component's handleKeydown returns early when showConfirmation is true
      component.selectCharacter('char-1');
      component.showConfirmation.set(true);
      // Calling cancelAction directly as the dialog would
      component.cancelAction();
      expect(component.showConfirmation()).toBe(false);
    });
  });

  describe('keyboard shortcuts', () => {
    beforeEach(() => {
      component.selectCharacter('char-1');
    });

    it('B key transitions to buy view', () => {
      component.handleKeydown({ key: 'b' } as KeyboardEvent);
      expect(component.currentView()).toBe('buy');
    });

    it('S key transitions to sell view when character has items', () => {
      // Add item to character inventory (must use actual shop inventory item ID)
      const charWithItem = { ...mockCharacter, inventory: ['weapon-long-sword'] };
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', charWithItem)
      }));
      component.handleKeydown({ key: 's' } as KeyboardEvent);
      expect(component.currentView()).toBe('sell');
    });

    it('S key does nothing when character has no items', () => {
      component.handleKeydown({ key: 's' } as KeyboardEvent);
      expect(component.currentView()).toBe('main');
    });

    it('L key leaves shop', () => {
      component.handleKeydown({ key: 'l' } as KeyboardEvent);
      expect(navigationService.returnToCastle).toHaveBeenCalled();
    });

    it('keyboard shortcuts are ignored in non-main views', () => {
      component.currentView.set('buy');
      component.handleKeydown({ key: 'b' } as KeyboardEvent);
      // Should stay in buy view, not try to transition again
      expect(component.currentView()).toBe('buy');
    });

    it('keyboard shortcuts are ignored when confirmation dialog is open', () => {
      component.showConfirmation.set(true);
      component.handleKeydown({ key: 'l' } as KeyboardEvent);
      // Should not leave shop
      expect(navigationService.returnToCastle).not.toHaveBeenCalled();
    });
  });

  describe('view transitions', () => {
    beforeEach(() => {
      component.selectCharacter('char-1');
    });

    it('transitions to buy view', () => {
      component.handleFooterAction('buy');
      expect(component.currentView()).toBe('buy');
    });

    it('transitions to sell view', () => {
      component.handleFooterAction('sell');
      expect(component.currentView()).toBe('sell');
    });

    it('transitions to identify view', () => {
      component.handleFooterAction('identify');
      expect(component.currentView()).toBe('identify');
    });

    it('transitions to uncurse view', () => {
      component.handleFooterAction('uncurse');
      expect(component.currentView()).toBe('uncurse');
    });

    it('changes character when change-character selected', () => {
      component.handleFooterAction('change-character');
      expect(component.currentView()).toBe('character-select');
      expect(component.selectedCharacterId()).toBe(null);
    });
  });

  describe('buy flow', () => {
    beforeEach(() => {
      component.selectCharacter('char-1');
    });

    it('shows confirmation dialog when initiating buy', () => {
      const item = SHOP_INVENTORY[0];
      component.initiateBuy(item.id);
      expect(component.showConfirmation()).toBe(true);
      expect(component.confirmationMessage()).toContain(item.name);
    });

    it('deducts gold from party after confirming purchase', () => {
      const initialGold = gameState.state().party.gold || 0;
      const item = SHOP_INVENTORY[0];

      component.initiateBuy(item.id);
      component.confirmAction();

      expect(gameState.state().party.gold).toBe(initialGold - item.price);
    });

    it('adds item to character inventory after confirming purchase', () => {
      const item = SHOP_INVENTORY[0];

      component.initiateBuy(item.id);
      component.confirmAction();

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
      component.initiateBuy(expensiveItem.id);

      expect(messageService.messageText()).toContain('afford');
      expect(component.showConfirmation()).toBe(false);
    });

    it('shows error when inventory is full', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: Array(8).fill('item')
        })
      }));

      component.initiateBuy(SHOP_INVENTORY[0].id);

      expect(messageService.messageText()).toContain('full');
      expect(component.showConfirmation()).toBe(false);
    });

    it('shows error when no character selected', () => {
      component.selectedCharacterId.set(null);
      component.initiateBuy(SHOP_INVENTORY[0].id);

      expect(messageService.messageText()).toContain('No character selected');
    });

    it('cancels buy when cancel action called', () => {
      const item = SHOP_INVENTORY[0];
      component.initiateBuy(item.id);
      component.cancelAction();

      expect(component.showConfirmation()).toBe(false);
      const char = gameState.state().roster.get('char-1')!;
      expect(char.inventory).not.toContain(item.id);
    });
  });

  describe('sell flow', () => {
    beforeEach(() => {
      const item1Id = 'weapon-long-sword';
      const item2Id = 'armor-leather';

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [item1Id, item2Id]
        }),
        party: {
          ...state.party,
          members: ['char-1'],
          gold: 500
        }
      }));

      component.selectCharacter('char-1');
      component.handleFooterAction('sell');
    });

    it('displays character inventory items', () => {
      const inventory = component.getCharacterInventory();

      expect(inventory.length).toBe(2);
      expect(inventory[0].name).toBe('Long Sword');
      expect(inventory[1].name).toBe('Leather Armor');
    });

    it('shows empty message when character has no items', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: []
        })
      }));

      const inventory = component.getCharacterInventory();
      expect(inventory.length).toBe(0);
    });

    it('calculates sell price (50% of purchase price)', () => {
      const item = SHOP_INVENTORY.find(i => i.id === 'weapon-long-sword')!;
      const sellPrice = component.getSellPrice(item);
      expect(sellPrice).toBe(100); // 50% of 200
    });

    it('shows confirmation before selling item', () => {
      const itemId = 'weapon-long-sword';

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [itemId]
        })
      }));

      component.initiateSell(itemId);

      expect(component.showConfirmation()).toBe(true);
      expect(component.confirmationMessage()).toContain('Long Sword');
    });

    it('removes item from inventory after confirming sell', () => {
      const itemId = 'weapon-long-sword';

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [itemId]
        })
      }));

      component.initiateSell(itemId);
      component.confirmAction();

      const char = gameState.state().roster.get('char-1')!;
      expect(char.inventory).not.toContain(itemId);
    });

    it('adds gold to party after confirming sell', () => {
      const itemId = 'weapon-long-sword';

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [itemId]
        }),
        party: {
          ...state.party,
          gold: 500
        }
      }));

      const initialGold = gameState.party().gold || 0;

      component.initiateSell(itemId);
      component.confirmAction();

      const finalGold = gameState.party().gold || 0;
      expect(finalGold).toBe(initialGold + 100); // 50% of 200
    });

    it('shows success message after selling', () => {
      const itemId = 'weapon-long-sword';

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [itemId]
        })
      }));

      component.initiateSell(itemId);
      component.confirmAction();

      expect(messageService.messageText()).toContain('Sold');
      expect(messageService.messageText()).toContain('Long Sword');
    });

    it('cancels sell on cancel action', () => {
      const itemId = 'weapon-long-sword';

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [itemId]
        })
      }));

      component.initiateSell(itemId);
      component.cancelAction();

      const char = gameState.state().roster.get('char-1')!;
      expect(char.inventory.length).toBe(1);
      expect(component.showConfirmation()).toBe(false);
    });

    it('shows error when item not found', () => {
      component.initiateSell('nonexistent-item');
      expect(messageService.messageText()).toContain('not found');
    });

    it('shows error when no character selected', () => {
      component.selectedCharacterId.set(null);
      component.initiateSell('weapon-long-sword');
      expect(messageService.messageText()).toContain('No character selected');
    });
  });

  describe('identify flow', () => {
    beforeEach(() => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [UNIDENTIFIED_ITEMS[0], UNIDENTIFIED_ITEMS[2]]
        }),
        party: {
          ...state.party,
          members: ['char-1'],
          gold: 500
        }
      }));

      component.selectCharacter('char-1');
      component.handleFooterAction('identify');
    });

    it('displays only unidentified items', () => {
      const unidentified = component.getUnidentifiedItems();

      expect(unidentified.length).toBe(2);
      expect(unidentified.every(item => !item.identified)).toBe(true);
    });

    it('shows unidentifiedName for unknown items', () => {
      const unidentified = component.getUnidentifiedItems();

      expect(unidentified[0].unidentifiedName).toBe('Unknown Sword');
      expect(unidentified[0].name).not.toBe('Unknown Sword');
    });

    it('displays identification cost (100 gold flat)', () => {
      const cost = component.getIdentifyCost();
      expect(cost).toBe(100);
    });

    it('shows confirmation dialog when initiating identify', () => {
      component.initiateIdentify(UNIDENTIFIED_ITEMS[0].id);

      expect(component.showConfirmation()).toBe(true);
      expect(component.confirmationMessage()).toContain('100');
    });

    it('deducts gold after confirming identify', () => {
      const initialGold = gameState.party().gold || 0;

      component.initiateIdentify(UNIDENTIFIED_ITEMS[0].id);
      component.confirmAction();

      const finalGold = gameState.party().gold || 0;
      expect(finalGold).toBe(initialGold - 100);
    });

    it('shows error when cannot afford identification', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 50
        }
      }));

      component.initiateIdentify(UNIDENTIFIED_ITEMS[0].id);

      expect(messageService.messageText()).toContain('afford');
      expect(component.showConfirmation()).toBe(false);
    });

    it('shows error when item not found', () => {
      component.initiateIdentify('nonexistent-item');
      expect(messageService.messageText()).toContain('not found');
    });

    it('shows error when no character selected', () => {
      component.selectedCharacterId.set(null);
      component.initiateIdentify(UNIDENTIFIED_ITEMS[0].id);
      expect(messageService.messageText()).toContain('No character selected');
    });
  });

  describe('uncurse flow', () => {
    const cursedItem: Item = {
      ...UNIDENTIFIED_ITEMS[2],
      identified: true
    };

    beforeEach(() => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [cursedItem]
        }),
        party: {
          ...state.party,
          members: ['char-1'],
          gold: 1000
        }
      }));

      component.selectCharacter('char-1');
      component.handleFooterAction('uncurse');
    });

    it('displays cursed items', () => {
      const cursed = component.getCursedItems();

      expect(cursed.length).toBe(1);
      expect(cursed[0].cursed).toBe(true);
    });

    it('calculates uncurse cost', () => {
      const cost = component.getUncurseCost(cursedItem);
      expect(cost).toBe(500); // Base cost
    });

    it('shows confirmation dialog when initiating uncurse', () => {
      component.initiateUncurse(cursedItem.id);

      expect(component.showConfirmation()).toBe(true);
      expect(component.confirmationMessage()).toContain('500');
    });

    it('shows error when cannot afford uncurse', () => {
      gameState.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 100
        }
      }));

      component.initiateUncurse(cursedItem.id);

      expect(messageService.messageText()).toContain('afford');
      expect(component.showConfirmation()).toBe(false);
    });

    it('shows error when item not found', () => {
      component.initiateUncurse('nonexistent-item');
      expect(messageService.messageText()).toContain('not found');
    });

    it('shows error when no character selected', () => {
      component.selectedCharacterId.set(null);
      component.initiateUncurse(cursedItem.id);
      expect(messageService.messageText()).toContain('No character selected');
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      component.selectCharacter('char-1');
    });

    it('getSellableItems excludes equipped cursed items', () => {
      const equippedCursedItem: Item = {
        id: 'equipped-cursed',
        name: 'Cursed Ring',
        type: SHOP_INVENTORY[0].type,
        slot: SHOP_INVENTORY[0].slot,
        price: 100,
        cursed: true,
        equipped: true,
        identified: true
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [equippedCursedItem, SHOP_INVENTORY[0]]
        })
      }));

      // Force update the component's selected character
      const sellable = component.getSellableItems();

      // Only the non-equipped item should be sellable
      expect(sellable.some(i => i.id === 'equipped-cursed')).toBe(false);
    });

    it('getUnidentifiedItems returns only unidentified items', () => {
      const identifiedItem = { ...SHOP_INVENTORY[0], identified: true };
      const unidentifiedItem = { ...UNIDENTIFIED_ITEMS[0], identified: false };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [identifiedItem, unidentifiedItem]
        })
      }));

      const unidentified = component.getUnidentifiedItems();

      expect(unidentified.length).toBe(1);
      expect(unidentified[0].id).toBe(unidentifiedItem.id);
    });

    it('getCursedItems returns only identified cursed items', () => {
      const cursedIdentified: Item = {
        ...UNIDENTIFIED_ITEMS[2],
        identified: true
      };
      const cursedUnidentified: Item = {
        ...UNIDENTIFIED_ITEMS[2],
        id: 'cursed-unid',
        identified: false
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [cursedIdentified, cursedUnidentified]
        })
      }));

      const cursed = component.getCursedItems();

      // Only identified cursed items
      expect(cursed.length).toBe(1);
      expect(cursed[0].id).toBe(cursedIdentified.id);
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

  describe('menu item states', () => {
    beforeEach(() => {
      component.selectCharacter('char-1');
    });

    it('disables sell when character has no items', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: []
        })
      }));

      const menuItems = component.footerMenuItems();
      const sellItem = menuItems.find(m => m.id === 'sell');

      expect(sellItem?.enabled).toBe(false);
    });

    it('enables sell when character has items', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: ['weapon-long-sword']
        })
      }));

      const menuItems = component.footerMenuItems();
      const sellItem = menuItems.find(m => m.id === 'sell');

      expect(sellItem?.enabled).toBe(true);
    });

    it('disables identify when no unidentified items', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: ['weapon-long-sword']
        })
      }));

      const menuItems = component.footerMenuItems();
      const identifyItem = menuItems.find(m => m.id === 'identify');

      expect(identifyItem?.enabled).toBe(false);
    });

    it('enables identify when has unidentified items', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [UNIDENTIFIED_ITEMS[0]]
        })
      }));

      const menuItems = component.footerMenuItems();
      const identifyItem = menuItems.find(m => m.id === 'identify');

      expect(identifyItem?.enabled).toBe(true);
    });

    it('disables uncurse when no identified cursed items', () => {
      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: ['weapon-long-sword']
        })
      }));

      const menuItems = component.footerMenuItems();
      const uncurseItem = menuItems.find(m => m.id === 'uncurse');

      expect(uncurseItem?.enabled).toBe(false);
    });

    it('enables uncurse when has identified cursed items', () => {
      const cursedIdentified: Item = {
        ...UNIDENTIFIED_ITEMS[2],
        identified: true
      };

      gameState.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set('char-1', {
          ...mockCharacter,
          inventory: [cursedIdentified]
        })
      }));

      const menuItems = component.footerMenuItems();
      const uncurseItem = menuItems.find(m => m.id === 'uncurse');

      expect(uncurseItem?.enabled).toBe(true);
    });
  });

  describe('character action handling', () => {
    it('selects character on select action', () => {
      component.handleCharacterAction({
        characterId: 'char-1',
        actionType: 'select'
      });

      expect(component.selectedCharacterId()).toBe('char-1');
      expect(component.currentView()).toBe('main');
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
