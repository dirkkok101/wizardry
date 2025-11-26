import { TestBed } from '@angular/core/testing';
import { SaveService } from '../SaveService';
import { GameState } from '@models/GameState';
import { SceneType } from '@models/SceneType';
import { GameInitializationService } from '../GameInitializationService';

describe('SaveService - Slot Metadata', () => {
  let service: SaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SaveService]
    });
    service = TestBed.inject(SaveService);
    // Clear all save slots
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getSlotMetadata', () => {
    it('returns null for empty slot', async () => {
      const metadata = await service.getSlotMetadata(1);
      expect(metadata).toBeNull();
    });

    it('returns metadata for saved game', async () => {
      const state = createTestGameState();
      await service.saveGame(state, 1);

      const metadata = await service.getSlotMetadata(1);

      expect(metadata).not.toBeNull();
      expect(metadata?.slotId).toBe(1);
      expect(metadata?.timestamp).toBeGreaterThan(0);
      expect(metadata?.partySize).toBe(2);
      expect(metadata?.partyGold).toBe(100);
      expect(metadata?.currentScene).toBe(SceneType.CASTLE_MENU);
      expect(metadata?.partyLevel).toBe(1);
    });

    it('calculates average party level correctly', async () => {
      const state = createTestGameState();
      // Set character levels
      const char1 = state.roster.get('char1')!;
      const char2 = state.roster.get('char2')!;
      char1.level = 3;
      char2.level = 5;

      await service.saveGame(state, 1);
      const metadata = await service.getSlotMetadata(1);

      expect(metadata?.partyLevel).toBe(4); // Average of 3 and 5
    });

    it('handles empty party', async () => {
      const state = createTestGameState();
      state.party.members = [];

      await service.saveGame(state, 1);
      const metadata = await service.getSlotMetadata(1);

      expect(metadata?.partySize).toBe(0);
      expect(metadata?.partyLevel).toBe(0);
    });

    it('handles multiple independent slots', async () => {
      const state1 = createTestGameState();
      state1.party.gold = 100;

      const state2 = createTestGameState();
      state2.party.gold = 200;

      const state3 = createTestGameState();
      state3.party.gold = 300;

      await service.saveGame(state1, 1);
      await service.saveGame(state2, 2);
      await service.saveGame(state3, 3);

      const meta1 = await service.getSlotMetadata(1);
      const meta2 = await service.getSlotMetadata(2);
      const meta3 = await service.getSlotMetadata(3);

      expect(meta1?.partyGold).toBe(100);
      expect(meta2?.partyGold).toBe(200);
      expect(meta3?.partyGold).toBe(300);
    });
  });

  describe('saveGame with overwrite', () => {
    it('overwrites existing save', async () => {
      const state1 = createTestGameState();
      state1.party.gold = 100;

      const state2 = createTestGameState();
      state2.party.gold = 200;

      await service.saveGame(state1, 1);
      const meta1 = await service.getSlotMetadata(1);
      expect(meta1?.partyGold).toBe(100);

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      await service.saveGame(state2, 1);
      const meta2 = await service.getSlotMetadata(1);
      expect(meta2?.partyGold).toBe(200);
      expect(meta2?.timestamp).toBeGreaterThan(meta1!.timestamp);
    });
  });

  describe('deleteSave', () => {
    it('removes slot metadata after delete', async () => {
      const state = createTestGameState();
      await service.saveGame(state, 1);

      let metadata = await service.getSlotMetadata(1);
      expect(metadata).not.toBeNull();

      await service.deleteSave(1);

      metadata = await service.getSlotMetadata(1);
      expect(metadata).toBeNull();
    });
  });

  describe('metadata updates', () => {
    it('updates metadata on each save', async () => {
      const state = createTestGameState();
      state.party.gold = 100;

      await service.saveGame(state, 1);
      const meta1 = await service.getSlotMetadata(1);

      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      state.party.gold = 500;
      await service.saveGame(state, 1);
      const meta2 = await service.getSlotMetadata(1);

      expect(meta2?.partyGold).toBe(500);
      expect(meta2?.timestamp).toBeGreaterThan(meta1!.timestamp);
    });
  });
});

/**
 * Helper function to create a test game state
 */
function createTestGameState(): GameState {
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

  // Set party members
  state.party.members = ['char1', 'char2'];
  state.party.formation.frontRow = ['char1'];
  state.party.formation.backRow = ['char2'];
  state.party.gold = 100;
  state.currentScene = SceneType.CASTLE_MENU;

  return state;
}
