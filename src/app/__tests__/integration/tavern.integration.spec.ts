import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TavernComponent } from '../../tavern/tavern.component';
import { GameStateService } from '../../../services/GameStateService';
import { createTestCharacter } from '../../../test-helpers/test-factories';
import { Alignment } from '../../../types/Alignment';
import { CharacterStatus } from '../../../types/CharacterStatus';

describe('Tavern Integration Tests', () => {
  let component: TavernComponent;
  let fixture: ComponentFixture<TavernComponent>;
  let gameStateService: GameStateService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TavernComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TavernComponent);
    component = fixture.componentInstance;
    gameStateService = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);
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
      expect(component.errorMessage()).toBeNull();
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

      expect(component.errorMessage()).toBe('Party is full (maximum 6 members)');
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
      expect(component.errorMessage()).toBe('Good and Evil cannot party together');
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
      expect(component.errorMessage()).toBeNull();
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
      const navigateSpy = jest.spyOn(router, 'navigate');

      component.onInspect(character.id);

      expect(navigateSpy).toHaveBeenCalledWith(['/character-inspection'], {
        queryParams: {
          characterId: character.id,
          returnTo: 'tavern'
        }
      });
    });
  });

  describe('Status Filtering', () => {
    it('only shows OK characters as available', () => {
      const okChar = createTestCharacter({
        id: 'ok-1',
        status: CharacterStatus.OK
      });
      const deadChar = createTestCharacter({
        id: 'dead-1',
        status: CharacterStatus.DEAD
      });
      const ashesChar = createTestCharacter({
        id: 'ashes-1',
        status: CharacterStatus.ASHES
      });
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([
          [okChar.id, okChar],
          [deadChar.id, deadChar],
          [ashesChar.id, ashesChar]
        ])
      }));

      const available = component.availableCharacters();

      expect(available.length).toBe(1);
      expect(available[0].id).toBe(okChar.id);
    });

    it('prevents adding DEAD character', () => {
      const deadChar = createTestCharacter({
        id: 'dead-1',
        status: CharacterStatus.DEAD
      });
      gameStateService.updateState(state => ({
        ...state,
        roster: new Map([[deadChar.id, deadChar]])
      }));

      component.onAddCharacter(deadChar.id);

      expect(component.errorMessage()).toContain('not available');
      expect(gameStateService.party().members).not.toContain(deadChar.id);
    });
  });
});
