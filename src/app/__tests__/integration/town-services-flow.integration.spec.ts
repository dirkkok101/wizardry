import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TavernComponent } from '../../tavern/tavern.component';
import { GameStateService } from '../../../services/GameStateService';
import { SaveService } from '../../../services/SaveService';
import { PartyService } from '../../../services/PartyService';
import { InnService, RoomType } from '../../../services/InnService';
import { LevelUpService } from '../../../services/LevelUpService';
import { createTestCharacter } from '../../../test-helpers/test-factories';
import { Alignment } from '../../../types/Alignment';
import { CharacterStatus } from '../../../types/CharacterStatus';
import { CharacterClass } from '../../../types/CharacterClass';

/**
 * Town Services Flow Integration Tests
 *
 * These are E2E integration tests that verify complete workflows across
 * multiple town services using real components and services (no mocks).
 * Tests combine UI components with service-level business logic.
 */
describe('Town Services Flow Integration Tests', () => {
  let gameStateService: GameStateService;
  let saveService: SaveService;
  let tavernFixture: ComponentFixture<TavernComponent>;
  let tavernComponent: TavernComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TavernComponent]
    }).compileComponents();

    gameStateService = TestBed.inject(GameStateService);
    saveService = TestBed.inject(SaveService);

    tavernFixture = TestBed.createComponent(TavernComponent);
    tavernComponent = tavernFixture.componentInstance;
    tavernFixture.detectChanges();
  });

  // NOTE: These tests were disabled during tavern redesign (2025-11-03)
  // Character gold was removed, party gold was added, and tavern API changed
  // New integration tests exist in src/app/tavern/__tests__/tavern.integration.spec.ts

  describe('Level Up and Spell Learning', () => {
    it('levels up Mage using service', () => {
      // Create Mage with XP for level 2 (900+ XP)
      const mage = createTestCharacter({
        id: 'mage-1',
        name: 'Gandalf',
        class: CharacterClass.MAGE,
        experience: 1000,
        level: 1,
        hp: 8,
        maxHp: 8,
        intelligence: 16
      });

      // Use LevelUpService to perform level up
      const levelUpResult = LevelUpService.performLevelUp(mage);
      expect(levelUpResult.updatedCharacter).toBeDefined();
      expect(levelUpResult.levelUpData).toBeDefined();

      const leveledChar = levelUpResult.updatedCharacter;

      // Verify level up occurred
      expect(leveledChar.level).toBe(2);

      // Verify HP increased (original maxHp + new roll)
      expect(leveledChar.maxHp).toBeGreaterThan(8);
      expect(leveledChar.hp).toBeGreaterThan(8);

      // Verify service returned level up data
      expect(levelUpResult.levelUpData.hpIncrease).toBeGreaterThan(0);
      expect(levelUpResult.levelUpData.newLevel).toBe(2);
    });
  });


  describe('Save/Load Game State', () => {
    it('saves and loads complete game state', async () => {
      // Create party with characters
      const characters = [
        createTestCharacter({
          id: 'hero-1',
          name: 'Hero1',
          level: 2,
          experience: 1200
        }),
        createTestCharacter({
          id: 'hero-2',
          name: 'Hero2',
          level: 1,
          experience: 500
        })
      ];

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(characters.map(c => [c.id, c])),
        party: {
          ...state.party,
          members: characters.map(c => c.id),
          gold: 200
        }
      }));

      const originalState = gameStateService.state();

      // Save to slot 1
      await saveService.saveGame(originalState, 1);

      // Modify state significantly
      gameStateService.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          members: [],
          gold: 0
        }
      }));

      const modifiedParty = gameStateService.party();
      expect(modifiedParty.members.length).toBe(0);
      expect(modifiedParty.gold).toBe(0);

      // Load from slot 1
      const loadedState = await saveService.loadGame(1);
      expect(loadedState).not.toBeNull();

      // Restore state using updateState
      gameStateService.updateState(() => loadedState!);

      // Verify state restored exactly
      const restoredState = gameStateService.state();
      expect(restoredState.party.members.length).toBe(2);
      expect(restoredState.party.gold).toBe(200);
      expect(restoredState.roster.size).toBe(2);

      const restoredHero1 = restoredState.roster.get('hero-1')!;
      expect(restoredHero1.name).toBe('Hero1');
      expect(restoredHero1.level).toBe(2);
      expect(restoredHero1.experience).toBe(1200);

      const restoredHero2 = restoredState.roster.get('hero-2')!;
      expect(restoredHero2.name).toBe('Hero2');
      expect(restoredHero2.level).toBe(1);
      expect(restoredHero2.experience).toBe(500);
    });
  });
});
