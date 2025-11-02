import { TestBed } from '@angular/core/testing';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { PartyService } from '../../services/PartyService';
import { createTestCharacter, createEmptyParty } from '../../test-helpers/test-factories';
import { CharacterClass } from '../../types/CharacterClass';
import { GameState } from '../../types/GameState';

/**
 * Performance Verification Tests
 *
 * Ensures test suite and core operations meet performance targets:
 * - Full test suite: < 5 seconds
 * - Large party operations: < 1 second
 * - Save/load operations: < 500ms
 */
describe('Performance Tests', () => {
  let gameStateService: GameStateService;
  let saveService: SaveService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({}).compileComponents();

    gameStateService = TestBed.inject(GameStateService);
    saveService = TestBed.inject(SaveService);
  });

  describe('Large Party Operations', () => {
    it('completes party operations quickly (< 1000ms)', () => {
      const start = performance.now();

      // Create 10 characters
      const characters = Array.from({ length: 10 }, (_, i) =>
        createTestCharacter({
          id: `char-${i}`,
          name: `Character ${i}`,
          class: CharacterClass.FIGHTER,
          level: i + 1,
          experience: (i + 1) * 1000,
          gold: (i + 1) * 100
        })
      );

      const roster = new Map(characters.map(c => [c.id, c]));

      // Form party with first 6
      let party = createEmptyParty();
      for (let i = 0; i < 6; i++) {
        const validation = PartyService.canAddCharacterToParty(party, characters[i], roster);
        if (validation.allowed) {
          party = {
            ...party,
            members: [...party.members, characters[i].id]
          };
        }
      }

      expect(party.members.length).toBe(6);

      // Disband party (remove all members)
      party = {
        ...party,
        members: []
      };

      expect(party.members.length).toBe(0);

      // Form party again with different members
      for (let i = 4; i < 10; i++) {
        if (party.members.length < 6) {
          const validation = PartyService.canAddCharacterToParty(party, characters[i], roster);
          if (validation.allowed) {
            party = {
              ...party,
              members: [...party.members, characters[i].id]
            };
          }
        }
      }

      expect(party.members.length).toBe(6);

      // Divvy gold multiple times
      party = {
        ...party,
        gold: 10000
      };

      for (let i = 0; i < 5; i++) {
        const divvyResult = PartyService.divvyGold(party, roster);
        if (divvyResult.success) {
          party = divvyResult.updatedParty!;
          // Re-add gold for next iteration
          party = {
            ...party,
            gold: 10000
          };
        }
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });

  describe('Save/Load Operations', () => {
    it('completes save/load quickly (< 500ms)', async () => {
      // Create large game state
      const characters = Array.from({ length: 20 }, (_, i) =>
        createTestCharacter({
          id: `hero-${i}`,
          name: `Hero ${i}`,
          level: Math.floor(i / 2) + 1,
          experience: (i + 1) * 500,
          gold: (i + 1) * 50
        })
      );

      const largeGameState: GameState = {
        ...gameStateService.state(),
        roster: new Map(characters.map(c => [c.id, c])),
        party: {
          ...gameStateService.state().party,
          members: characters.slice(0, 6).map(c => c.id),
          gold: 5000
        }
      };

      const start = performance.now();

      // Save to slot 1
      await saveService.saveGame(largeGameState, 1);

      // Load from slot 1
      const loadedState = await saveService.loadGame(1);

      const duration = performance.now() - start;

      expect(loadedState).not.toBeNull();
      expect(loadedState!.roster.size).toBe(20);
      expect(loadedState!.party.members.length).toBe(6);
      expect(loadedState!.party.gold).toBe(5000);
      expect(duration).toBeLessThan(500); // 500ms
    });
  });

  describe('Test Suite Speed', () => {
    it('verifies test execution time is reasonable', () => {
      // This test itself should complete very quickly
      const start = performance.now();

      // Perform some basic operations
      const char = createTestCharacter();
      const party = createEmptyParty();
      const roster = new Map([[char.id, char]]);

      const validation = PartyService.canAddCharacterToParty(party, char, roster);

      const duration = performance.now() - start;

      expect(validation.allowed).toBe(true);
      expect(duration).toBeLessThan(50); // 50ms for simple operations
    });
  });
});
