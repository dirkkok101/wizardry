import { Component, OnInit, computed, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { CachedImageDirective } from '@shared/directives/cached-image.directive';
import { MenuItem } from '@shared/components/menu/menu.component';
import { PartyService, moveCharacterUp, moveCharacterDown } from '@services/PartyService';
import { Character } from '@models/Character';
import { CharacterSelectionDialogComponent, CharacterOption } from '@shared/components/character-selection-dialog/character-selection-dialog.component';

@Component({
  selector: 'app-tavern',
  standalone: true,
  imports: [CommonModule, CharacterPanelComponent, SceneTitleComponent, SceneFooterComponent, CharacterSelectionDialogComponent, CachedImageDirective],
  templateUrl: './tavern.component.html',
  styleUrl: './tavern.component.scss'
})
export class TavernComponent implements OnInit {
  private readonly gameStateService = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  readonly messages = inject(MessageService);

  // Dialog state
  readonly showAddDialog = signal(false);
  readonly dialogCharacters = signal<CharacterOption[]>([]);

  ngOnInit(): void {
    this.messages.clear();
  }

  // Computed properties using GameStateQueries
  // Shows OK characters and DEAD/ASHES characters whose bodies are in town (not dungeon)
  readonly availableCharacters = computed(() =>
    GameStateQueries.tavernAvailableCharacters(this.gameStateService.state())
  );

  // Party characters in order (positions 1-6)
  readonly partyCharacters = computed(() =>
    GameStateQueries.partyCharacters(this.gameStateService.state())
  );

  // Left column: positions 1, 3, 5 (indices 0, 2, 4)
  readonly leftColumnCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[0], chars[2], chars[4]].filter((c): c is Character => c !== undefined);
  });

  // Right column: positions 2, 4, 6 (indices 1, 3, 5)
  readonly rightColumnCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[1], chars[3], chars[5]].filter((c): c is Character => c !== undefined);
  });

  readonly footerMenuItems = computed((): MenuItem[] => {
    const canAdd = this.partyCharacters().length < 6;
    return [
      { id: 'add', label: 'Add Character', shortcut: 'A', enabled: canAdd },
      { id: 'leave', label: 'Return to Castle', shortcut: 'ESC', enabled: true }
    ];
  });

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
    switch (itemId) {
      case 'add':
        this.openAddDialog();
        break;
      case 'leave':
        this.navigation.returnToCastle();
        break;
    }
  }

  // Dialog methods
  openAddDialog(): void {
    const available = this.availableCharacters();
    const options: CharacterOption[] = available.map((char, index) => ({
      character: char,
      index: index + 1,
      enabled: this.canAddCharacter(char)
    }));
    this.dialogCharacters.set(options);
    this.showAddDialog.set(true);
  }

  onDialogCharacterSelected(character: Character): void {
    this.showAddDialog.set(false);
    this.onAddCharacter(character.id);
  }

  onDialogCancelled(): void {
    this.showAddDialog.set(false);
    this.dialogCharacters.set([]);
  }

  private canAddCharacter(char: Character): boolean {
    const state = this.gameStateService.state();
    const validation = PartyService.canAddCharacterToParty(
      state.party,
      char,
      state.roster,
      state.bodies
    );
    return validation.allowed;
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.showAddDialog()) {
      this.onDialogCancelled();
    } else {
      this.navigation.returnToCastle();
    }
  }

  @HostListener('window:keydown.a')
  handleAddKey(): void {
    if (!this.showAddDialog() && this.partyCharacters().length < 6) {
      this.openAddDialog();
    }
  }
}
