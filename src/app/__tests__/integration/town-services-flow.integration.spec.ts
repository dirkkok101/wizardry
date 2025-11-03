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

  describe('Complete Character Lifecycle', () => {
    it('creates character, forms party, divvys gold across workflow', () => {
      // Step 1: Create character (simulating Training Grounds completion)
      const character = createTestCharacter({
        id: 'hero-1',
        name: 'TestHero',
        class: CharacterClass.FIGHTER,
        level: 1,
        experience: 0,
        hp: 5, // Partially damaged
        maxHp: 10,
        gold: 0
      });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]])
      }));

      expect(gameStateService.roster().size).toBe(1);
      expect(gameStateService.roster().get(character.id)!.name).toBe('TestHero');

      // Step 2: Add to party using Tavern component
      tavernComponent.handleAddCharacter(character.id);

      let party = gameStateService.party();
      expect(party.members.length).toBe(1);
      expect(party.members[0]).toBe(character.id);

      // Step 3: Give party gold and divvy using Tavern component
      gameStateService.updateState(state => ({
        ...state,
        party: {
          ...state.party,
          gold: 500
        }
      }));

      tavernComponent.handleDivvyGold();

      party = gameStateService.party();
      expect(party.gold).toBe(0); // Gold was distributed

      const charWithGold = gameStateService.roster().get(character.id)!;
      expect(charWithGold.gold).toBe(500); // All gold went to sole party member

      // Step 4: Use InnService to rest and heal
      const charToRest = gameStateService.roster().get(character.id)!;
      const currentState = gameStateService.state();
      const restResult = InnService.restOneWeek(currentState, charToRest, RoomType.STABLES);
      expect(restResult.updatedCharacter).toBeDefined();
      expect(restResult.hpRecovered).toBeGreaterThanOrEqual(0);

      // Update state with healing result and updated state (party gold)
      gameStateService.updateState(state => ({
        ...restResult.updatedState,
        roster: new Map(state.roster).set(character.id, restResult.updatedCharacter)
      }));

      // Verify character healed
      const healedChar = gameStateService.roster().get(character.id)!;
      expect(healedChar.hp).toBeGreaterThanOrEqual(charToRest.hp); // HP same or increased

      // Step 5: Verify final state
      expect(gameStateService.party().members.length).toBe(1);
      expect(gameStateService.roster().get(character.id)!.status).toBe(CharacterStatus.OK);
    });
  });

  describe('Party Formation with Alignment Conflicts', () => {
    it('prevents Good/Evil mixing during party formation', () => {
      // Create Good and Evil characters
      const goodChar = createTestCharacter({
        id: 'good-char',
        name: 'Paladin',
        alignment: Alignment.GOOD
      });
      const evilChar = createTestCharacter({
        id: 'evil-char',
        name: 'DarkKnight',
        alignment: Alignment.EVIL
      });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [goodChar.id, goodChar],
          [evilChar.id, evilChar]
        ])
      }));

      // Add Good character to party using Tavern component
      tavernComponent.handleAddCharacter(goodChar.id);
      expect(gameStateService.party().members).toContain(goodChar.id);
      expect(tavernComponent.errorMessage()).toBeNull();

      // Attempt to add Evil character - should fail
      tavernComponent.handleAddCharacter(evilChar.id);
      expect(tavernComponent.errorMessage()).toBe('Good and Evil cannot party together');

      // Verify party unchanged
      const party = gameStateService.party();
      expect(party.members.length).toBe(1);
      expect(party.members).toContain(goodChar.id);
      expect(party.members).not.toContain(evilChar.id);
    });
  });

  describe('Gold Management Flow', () => {
    it('manages gold across party pool and characters', () => {
      // Create party with gold
      const characters = [
        createTestCharacter({ id: 'char-1', name: 'Fighter', gold: 10 }),
        createTestCharacter({ id: 'char-2', name: 'Mage', gold: 20 }),
        createTestCharacter({ id: 'char-3', name: 'Priest', gold: 5 })
      ];

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(characters.map(c => [c.id, c])),
        party: {
          ...state.party,
          members: characters.map(c => c.id),
          gold: 300
        }
      }));

      // Divvy gold using Tavern component
      tavernComponent.handleDivvyGold();

      const state = gameStateService.state();

      // Verify party gold cleared
      expect(state.party.gold).toBe(0);

      // Verify gold distributed equally (300 / 3 = 100 per member)
      expect(state.roster.get('char-1')!.gold).toBe(110); // 10 + 100
      expect(state.roster.get('char-2')!.gold).toBe(120); // 20 + 100
      expect(state.roster.get('char-3')!.gold).toBe(105); // 5 + 100

      expect(tavernComponent.successMessage()).toBe('Gold distributed: 100 gold per member');
    });
  });

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

  describe('Death and Resurrection Flow', () => {
    it('handles character death and prevents party joining', () => {
      // Create DEAD character
      const deadChar = createTestCharacter({
        id: 'dead-1',
        name: 'Deceased',
        status: CharacterStatus.DEAD,
        hp: 0
      });

      const aliveChar = createTestCharacter({
        id: 'alive-1',
        name: 'Survivor',
        status: CharacterStatus.OK
      });

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [deadChar.id, deadChar],
          [aliveChar.id, aliveChar]
        ])
      }));

      // Attempt to add DEAD character to party - should fail
      tavernComponent.handleAddCharacter(deadChar.id);
      expect(tavernComponent.errorMessage()).toContain('not available');
      expect(gameStateService.party().members).not.toContain(deadChar.id);

      // Add alive character - should succeed
      tavernComponent.handleAddCharacter(aliveChar.id);
      expect(gameStateService.party().members).toContain(aliveChar.id);

      // Resurrect dead character (simulated - Temple service)
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(state.roster).set(deadChar.id, {
          ...deadChar,
          status: CharacterStatus.OK,
          hp: 1
        })
      }));

      tavernFixture.detectChanges();

      // Now adding should succeed
      tavernComponent.handleAddCharacter(deadChar.id);
      expect(gameStateService.party().members).toContain(deadChar.id);
      expect(gameStateService.party().members.length).toBe(2);
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
          experience: 1200,
          gold: 150
        }),
        createTestCharacter({
          id: 'hero-2',
          name: 'Hero2',
          level: 1,
          experience: 500,
          gold: 75
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
      expect(restoredHero1.gold).toBe(150);

      const restoredHero2 = restoredState.roster.get('hero-2')!;
      expect(restoredHero2.name).toBe('Hero2');
      expect(restoredHero2.level).toBe(1);
      expect(restoredHero2.experience).toBe(500);
      expect(restoredHero2.gold).toBe(75);
    });
  });
});
