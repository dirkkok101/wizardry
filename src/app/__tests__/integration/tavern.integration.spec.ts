import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TavernComponent } from '@scenes/tavern/tavern.component';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { createTestCharacter } from '@testing/test-factories';
import { Alignment } from '@models/Alignment';
import { CharacterStatus } from '@models/CharacterStatus';

describe('Tavern Integration Tests', () => {
  let component: TavernComponent;
  let fixture: ComponentFixture<TavernComponent>;
  let gameStateService: GameStateService;
  let navigationService: SceneNavigationService;
  let messageService: MessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TavernComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TavernComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
    navigationService = TestBed.inject(SceneNavigationService);
    messageService = TestBed.inject(MessageService);
    fixture.detectChanges();
  });

  describe('Full Party Formation Flow', () => {
    it('forms a full party of 6 members', () => {
      // Create 6 characters with compatible alignments
      const characters = [
        createTestCharacter({ id: 'char-1', name: 'Fighter1', alignment: Alignment.GOOD }),
        createTestCharacter({ id: 'char-2', name: 'Mage1', alignment: Alignment.GOOD }),
        createTestCharacter({ id: 'char-3', name: 'Priest1', alignment: Alignment.NEUTRAL }),
        createTestCharacter({ id: 'char-4', name: 'Thief1', alignment: Alignment.NEUTRAL }),
        createTestCharacter({ id: 'char-5', name: 'Fighter2', alignment: Alignment.GOOD }),
        createTestCharacter({ id: 'char-6', name: 'Mage2', alignment: Alignment.NEUTRAL })
      ];

      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(characters.map(c => [c.id, c]))
      }));

      // Add all characters
      characters.forEach(char => {
        component.onAddCharacter(char.id);
      });

      // Verify all added
      const party = gameStateService.party();
      expect(party.members.length).toBe(6);
      expect(messageService.isError()).toBe(false);
    });

    it('prevents adding 7th character to full party', () => {
      // Setup full party
      const characters = Array.from({ length: 7 }, (_, i) =>
        createTestCharacter({ id: `char-${i}`, alignment: Alignment.NEUTRAL })
      );
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map(characters.map(c => [c.id, c])),
        party: {
          ...state.party,
          members: characters.slice(0, 6).map(c => c.id)
        }
      }));

      // Attempt to add 7th
      component.onAddCharacter('char-6');

      expect(messageService.messageText()).toBe('Party is full (maximum 6 members)');
      expect(gameStateService.party().members.length).toBe(6);
    });
  });

  describe('Alignment Conflict Prevention', () => {
    it('prevents mixing Good and Evil alignments', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      });
      const evilChar = createTestCharacter({
        id: 'evil-1',
        alignment: Alignment.EVIL
      });
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[goodChar.id, goodChar], [evilChar.id, evilChar]])
      }));

      // Add Good character
      component.onAddCharacter(goodChar.id);
      expect(gameStateService.party().members).toContain(goodChar.id);

      // Attempt to add Evil character
      component.onAddCharacter(evilChar.id);
      expect(messageService.messageText()).toBe('Good and Evil cannot party together');
      expect(gameStateService.party().members).not.toContain(evilChar.id);
    });

    it('allows mixing Good and Neutral alignments', () => {
      const goodChar = createTestCharacter({
        id: 'good-1',
        alignment: Alignment.GOOD
      });
      const neutralChar = createTestCharacter({
        id: 'neutral-1',
        alignment: Alignment.NEUTRAL
      });
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[goodChar.id, goodChar], [neutralChar.id, neutralChar]])
      }));

      component.onAddCharacter(goodChar.id);
      component.onAddCharacter(neutralChar.id);

      const party = gameStateService.party();
      expect(party.members).toContain(goodChar.id);
      expect(party.members).toContain(neutralChar.id);
      expect(messageService.isError()).toBe(false);
    });
  });

  // NOTE: Gold distribution feature was removed in the redesign
  // Party gold is now displayed but not distributed from the tavern UI

  describe('Character Inspection Navigation', () => {
    it('navigates to character inspection with correct params', () => {
      const character = createTestCharacter({ id: 'char-1' });
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[character.id, character]]),
        party: {
          ...state.party,
          members: [character.id]
        }
      }));
      const navigateSpy = jest.spyOn(navigationService, 'inspectCharacter').mockImplementation(() => Promise.resolve(true));

      component.onInspect(character.id);

      expect(navigateSpy).toHaveBeenCalledWith(character.id, 'tavern');
    });
  });

  describe('Status Filtering', () => {
    it('shows OK characters and dead characters in town as available', () => {
      const okChar = createTestCharacter({
        id: 'ok-1',
        status: CharacterStatus.OK
      });
      const deadCharInTown = createTestCharacter({
        id: 'dead-1',
        status: CharacterStatus.DEAD
      });
      const ashesCharInTown = createTestCharacter({
        id: 'ashes-1',
        status: CharacterStatus.ASHES
      });
      const lostChar = createTestCharacter({
        id: 'lost-1',
        status: CharacterStatus.LOST
      });
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [okChar.id, okChar],
          [deadCharInTown.id, deadCharInTown],
          [ashesCharInTown.id, ashesCharInTown],
          [lostChar.id, lostChar]
        ]),
        bodies: new Map() // No bodies in dungeon - dead/ashes characters are in town
      }));

      const available = component.availableCharacters();

      // OK, DEAD (in town), ASHES (in town) should be available
      // LOST is permanently dead and should NOT be available
      expect(available.length).toBe(3);
      expect(available.find(c => c.id === okChar.id)).toBeTruthy();
      expect(available.find(c => c.id === deadCharInTown.id)).toBeTruthy();
      expect(available.find(c => c.id === ashesCharInTown.id)).toBeTruthy();
    });

    it('allows adding DEAD character when body is in town', () => {
      const deadChar = createTestCharacter({
        id: 'dead-1',
        status: CharacterStatus.DEAD,
        alignment: Alignment.NEUTRAL
      });
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[deadChar.id, deadChar]]),
        bodies: new Map() // Body is in town, not dungeon
      }));

      component.onAddCharacter(deadChar.id);

      // Should be added successfully
      expect(gameStateService.party().members).toContain(deadChar.id);
      expect(messageService.isError()).toBe(false);
    });

    it('prevents adding DEAD character whose body is in dungeon', () => {
      const deadChar = createTestCharacter({
        id: 'dead-1',
        status: CharacterStatus.DEAD
      });
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[deadChar.id, deadChar]]),
        bodies: new Map([[deadChar.id, { characterId: deadChar.id, level: 3, x: 5, y: 10 }]])
      }));

      component.onAddCharacter(deadChar.id);

      expect(messageService.messageText()).toContain('body must be recovered from the dungeon');
      expect(gameStateService.party().members).not.toContain(deadChar.id);
    });
  });
});
