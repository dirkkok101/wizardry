import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UtilitiesComponent } from '../utilities.component';
import { GameStateService } from '../../../services/GameStateService';
import { SaveService } from '../../../services/SaveService';
import { SceneType } from '../../../types/SceneType';
import { GameInitializationService } from '../../../services/GameInitializationService';
import { signal } from '@angular/core';

describe('UtilitiesComponent', () => {
  let component: UtilitiesComponent;
  let fixture: ComponentFixture<UtilitiesComponent>;
  let saveService: SaveService;
  let gameStateService: GameStateService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UtilitiesComponent],
      providers: [
        SaveService,
        GameStateService,
        {
          provide: Router,
          useValue: {
            navigate: jest.fn()
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UtilitiesComponent);
    component = fixture.componentInstance;
    saveService = TestBed.inject(SaveService);
    gameStateService = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('displays 3 save slots', () => {
      expect(component.saveSlots().length).toBe(3);
    });

    it('shows empty slots initially', async () => {
      await component.ngOnInit();

      const slots = component.saveSlots();
      expect(slots[0]).toBeNull();
      expect(slots[1]).toBeNull();
      expect(slots[2]).toBeNull();
    });

    it('loads metadata for existing saves', async () => {
      // Create a save in slot 1
      const state = createTestGameState();
      await saveService.saveGame(state, 1);

      await component.ngOnInit();

      const slots = component.saveSlots();
      expect(slots[0]).not.toBeNull();
      expect(slots[0]?.slotId).toBe(1);
      expect(slots[1]).toBeNull();
      expect(slots[2]).toBeNull();
    });
  });

  describe('saveToSlot', () => {
    it('saves game to empty slot', async () => {
      await component.saveToSlot(1);

      const metadata = await saveService.getSlotMetadata(1);
      expect(metadata).not.toBeNull();
      expect(metadata?.slotId).toBe(1);
    });

    it('shows success message after save', async () => {
      await component.saveToSlot(1);

      expect(component.successMessage()).toBe('Game saved to slot 1');
    });

    it('refreshes metadata after save', async () => {
      await component.saveToSlot(1);

      const slots = component.saveSlots();
      expect(slots[0]).not.toBeNull();
      expect(slots[0]?.slotId).toBe(1);
    });

    it('prompts confirmation before overwrite', async () => {
      // Save to slot 1 first
      await component.saveToSlot(1);

      // Clear success message
      component.successMessage.set('');

      // Mock user cancels
      component.showConfirmation.set(false);
      component.pendingAction.set(null);

      // Try to save again
      await component.saveToSlot(1);

      // Should show confirmation
      expect(component.confirmationMessage()).toContain('Overwrite');
    });

    it('overwrites after confirmation', async () => {
      const state1 = createTestGameState();
      state1.party.gold = 100;
      gameStateService.updateState(() => state1);

      await component.saveToSlot(1);

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update game state
      const state2 = createTestGameState();
      state2.party.gold = 200;
      gameStateService.updateState(() => state2);

      // Confirm overwrite by directly calling confirmAction
      await component.saveToSlot(1);
      await component.confirmAction();

      const metadata = await saveService.getSlotMetadata(1);
      expect(metadata?.partyGold).toBe(200);
    });
  });

  describe('loadFromSlot', () => {
    it('loads game from slot', async () => {
      const state = createTestGameState();
      state.party.gold = 999;
      await saveService.saveGame(state, 1);

      await component.loadFromSlot(1);

      expect(gameStateService.state().party.gold).toBe(999);
    });

    it('navigates to castle after load', async () => {
      const state = createTestGameState();
      await saveService.saveGame(state, 1);

      await component.loadFromSlot(1);

      expect(router.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });

    it('shows success message after load', async () => {
      const state = createTestGameState();
      await saveService.saveGame(state, 1);

      await component.loadFromSlot(1);

      expect(component.successMessage()).toBe('Game loaded successfully');
    });

    it('shows error when loading empty slot', async () => {
      await component.loadFromSlot(1);

      expect(component.errorMessage()).toBe('No save data in this slot');
    });
  });

  describe('deleteSlot', () => {
    it('prompts confirmation before delete', async () => {
      const state = createTestGameState();
      await saveService.saveGame(state, 1);
      await component.ngOnInit();

      component.deleteSlot(1);

      expect(component.confirmationMessage()).toContain('Delete');
    });

    it('deletes save after confirmation', async () => {
      const state = createTestGameState();
      await saveService.saveGame(state, 1);
      await component.ngOnInit();

      // Trigger delete
      component.deleteSlot(1);
      await component.confirmAction();

      const metadata = await saveService.getSlotMetadata(1);
      expect(metadata).toBeNull();
    });

    it('refreshes metadata after delete', async () => {
      const state = createTestGameState();
      await saveService.saveGame(state, 1);
      await component.ngOnInit();

      expect(component.saveSlots()[0]).not.toBeNull();

      component.deleteSlot(1);
      await component.confirmAction();

      expect(component.saveSlots()[0]).toBeNull();
    });
  });

  describe('message display', () => {
    it('clears error message after timeout', async () => {
      jest.useFakeTimers();

      await component.loadFromSlot(1); // Empty slot triggers error

      expect(component.errorMessage()).toBe('No save data in this slot');

      jest.advanceTimersByTime(3000);

      expect(component.errorMessage()).toBe('');

      jest.useRealTimers();
    });

    it('clears success message after timeout', async () => {
      jest.useFakeTimers();

      await component.saveToSlot(1);

      expect(component.successMessage()).not.toBe('');

      jest.advanceTimersByTime(3000);

      expect(component.successMessage()).toBe('');

      jest.useRealTimers();
    });
  });
});

/**
 * Helper function to create a test game state
 */
function createTestGameState() {
  const state = GameInitializationService.createNewGame();

  // Add 2 test characters to roster
  const char1 = {
    id: 'char1',
    name: 'Fighter1',
    race: 'HUMAN' as const,
    class: 'FIGHTER' as const,
    alignment: 'GOOD' as const,
    attributes: {
      strength: 16,
      intelligence: 10,
      piety: 10,
      vitality: 14,
      agility: 12,
      luck: 10
    },
    level: 1,
    experience: 0,
    hp: 10,
    maxHp: 10,
    status: 'OK' as const,
    inventory: [],
    equipped: {
      weapon: null,
      armor: null,
      shield: null,
      helmet: null,
      gauntlet: null
    },
    spells: {
      mage: [],
      priest: []
    },
    age: 18
  };

  const char2 = {
    ...char1,
    id: 'char2',
    name: 'Mage1',
    class: 'MAGE' as const
  };

  state.roster.set('char1', char1);
  state.roster.set('char2', char2);

  state.party.members = ['char1', 'char2'];
  state.party.formation.frontRow = ['char1'];
  state.party.formation.backRow = ['char2'];
  state.party.gold = 100;
  state.currentScene = SceneType.CASTLE_MENU;

  return state;
}
