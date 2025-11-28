import { Component, OnInit, computed, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { CharacterListItemComponent } from '@shared/components/character-list-item/character-list-item.component';
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { PartyService, moveCharacterUp, moveCharacterDown } from '@services/PartyService';
import { Character } from '@models/Character';

@Component({
  selector: 'app-tavern',
  standalone: true,
  imports: [CommonModule, CharacterPanelComponent, CharacterListItemComponent, SceneTitleComponent, SceneFooterComponent],
  templateUrl: './tavern.component.html',
  styleUrl: './tavern.component.scss'
})
export class TavernComponent implements OnInit {
  private readonly gameStateService = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  readonly messages = inject(MessageService);

  ngOnInit(): void {
    this.messages.clear();
  }

  // Computed properties using GameStateQueries
  // Shows OK characters and DEAD/ASHES characters whose bodies are in town (not dungeon)
  readonly availableCharacters = computed(() =>
    GameStateQueries.tavernAvailableCharacters(this.gameStateService.state())
  );

  readonly frontRowCharacters = computed(() =>
    GameStateQueries.frontRowCharacters(this.gameStateService.state())
  );

  readonly backRowCharacters = computed(() =>
    GameStateQueries.backRowCharacters(this.gameStateService.state())
  );

  readonly partyGold = computed(() =>
    GameStateQueries.partyGold(this.gameStateService.state())
  );

  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'leave', label: 'Return to Castle', shortcut: 'ESC', enabled: true }
  ]);

  // Visible action types for party CharacterPanel
  readonly partyActionTypes = ['remove', 'inspect', 'moveUp', 'moveDown'];

  /**
   * Get actions for party characters (used by CharacterPanel)
   * Returns a function that evaluates move enabled state per character
   */
  getPartyActions = (char: Character): CharacterAction[] => {
    return [
      { type: 'remove' },
      { type: 'inspect' },
      { type: 'moveUp', enabled: this.canCharacterMoveUp(char.id) },
      { type: 'moveDown', enabled: this.canCharacterMoveDown(char.id) }
    ];
  };

  // Helper methods for character card inputs
  canCharacterMoveUp(characterId: string): boolean {
    return GameStateQueries.canMoveUp(this.gameStateService.state(), characterId);
  }

  canCharacterMoveDown(characterId: string): boolean {
    return GameStateQueries.canMoveDown(this.gameStateService.state(), characterId);
  }

  getCharacterActions(characterId: string, isInParty: boolean): CharacterAction[] {
    if (isInParty) {
      return [
        { type: 'remove' },
        { type: 'inspect' },
        { type: 'moveUp', enabled: this.canCharacterMoveUp(characterId) },
        { type: 'moveDown', enabled: this.canCharacterMoveDown(characterId) }
      ];
    }
    return [
      { type: 'add' },
      { type: 'inspect' }
    ];
  }

  onAddCharacter(characterId: string): void {
    const state = this.gameStateService.state();
    const character = state.roster.get(characterId);

    if (!character) {
      this.messages.showError('Character not found');
      return;
    }

    const validation = PartyService.canAddCharacterToParty(
      state.party,
      character,
      state.roster,
      state.bodies
    );

    if (!validation.allowed) {
      this.messages.showError(validation.reason || 'Cannot add character');
      return;
    }

    // Pool character's gold to party and add to party
    const characterGold = character.gold || 0;

    this.gameStateService.updateState(state => {
      // Create updated character with gold set to 0 (pooled to party)
      const updatedCharacter = { ...character, gold: 0 };
      const newRoster = new Map(state.roster);
      newRoster.set(characterId, updatedCharacter);

      return {
        ...state,
        roster: newRoster,
        party: {
          ...state.party,
          members: [...state.party.members, characterId],
          gold: state.party.gold + characterGold,
          formation: {
            ...state.party.formation,
            frontRow: state.party.formation.frontRow.length < 3
              ? [...state.party.formation.frontRow, characterId]
              : state.party.formation.frontRow,
            backRow: state.party.formation.frontRow.length >= 3
              ? [...state.party.formation.backRow, characterId]
              : state.party.formation.backRow
          }
        }
      };
    });
  }

  onRemoveCharacter(characterId: string): void {
    const state = this.gameStateService.state();

    if (!state.roster.has(characterId)) {
      this.messages.showError('Character not found');
      return;
    }

    this.gameStateService.updateState(state => ({
      ...state,
      party: {
        ...state.party,
        members: state.party.members.filter(id => id !== characterId),
        formation: {
          frontRow: state.party.formation.frontRow.filter(id => id !== characterId),
          backRow: state.party.formation.backRow.filter(id => id !== characterId)
        }
      }
    }));
  }

  onMoveUp(characterId: string): void {
    const newState = moveCharacterUp(this.gameStateService.state(), characterId);
    this.gameStateService.updateState(() => newState);
  }

  onMoveDown(characterId: string): void {
    const newState = moveCharacterDown(this.gameStateService.state(), characterId);
    this.gameStateService.updateState(() => newState);
  }

  onInspect(characterId: string): void {
    this.navigation.inspectCharacter(characterId, 'tavern');
  }

  handleActionClick(event: CharacterActionEvent): void {
    switch (event.actionType) {
      case 'add':
        this.onAddCharacter(event.characterId);
        break;
      case 'remove':
        this.onRemoveCharacter(event.characterId);
        break;
      case 'moveUp':
        this.onMoveUp(event.characterId);
        break;
      case 'moveDown':
        this.onMoveDown(event.characterId);
        break;
      case 'inspect':
        this.onInspect(event.characterId);
        break;
    }
  }

  handleFooterAction(itemId: string): void {
    if (itemId === 'leave') {
      this.navigation.returnToCastle();
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.navigation.returnToCastle();
  }
}
