import { Component, computed, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { CharacterCardWrapperComponent } from '../../components/character-card-wrapper/character-card-wrapper.component';
import { ActionType } from '../../components/character-card-actions/character-card-actions.component';
import { PartyService, moveCharacterUp, moveCharacterDown } from '../../services/PartyService';
import { CharacterStatus } from '../../types/CharacterStatus';

@Component({
  selector: 'app-tavern',
  standalone: true,
  imports: [CommonModule, CharacterCardWrapperComponent],
  templateUrl: './tavern.component.html',
  styleUrl: './tavern.component.scss'
})
export class TavernComponent {
  private gameStateService = inject(GameStateService);
  private router = inject(Router);

  gameState = this.gameStateService.state;
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Computed properties
  availableCharacters = computed(() => {
    const state = this.gameState();
    return Array.from(state.roster.values())
      .filter(char => !state.party.members.includes(char.id))
      .filter(char => char.status === CharacterStatus.OK);
  });

  frontRowCharacters = computed(() => {
    const state = this.gameState();
    return state.party.formation.frontRow
      .map(id => state.roster.get(id))
      .filter(char => char !== undefined);
  });

  backRowCharacters = computed(() => {
    const state = this.gameState();
    return state.party.formation.backRow
      .map(id => state.roster.get(id))
      .filter(char => char !== undefined);
  });

  partyGold = computed(() => this.gameState().party.gold);

  // Action configurations
  availableCharacterActions: ActionType[] = ['inspect', 'add'];

  partyCharacterActions: ActionType[] = ['inspect', 'remove', 'moveUp', 'moveDown'];

  getDisabledActionsForPartyMember(characterId: string): ActionType[] {
    const state = this.gameState();
    const index = state.party.members.indexOf(characterId);
    const disabled: ActionType[] = [];

    if (index === 0) disabled.push('moveUp');
    if (index === state.party.members.length - 1) disabled.push('moveDown');

    return disabled;
  }

  // Action handlers
  onAddCharacter(characterId: string): void {
    const state = this.gameState();
    const character = state.roster.get(characterId);

    if (!character) {
      this.showError('Character not found');
      return;
    }

    // Validate using PartyService
    const validation = PartyService.canAddCharacterToParty(
      state.party,
      character,
      state.roster
    );

    if (!validation.allowed) {
      this.showError(validation.reason || 'Cannot add character');
      return;
    }

    // Add character to party (immutable update)
    this.gameStateService.updateState(state => ({
      ...state,
      party: {
        ...state.party,
        members: [...state.party.members, characterId],
        formation: {
          ...state.party.formation,
          // Add to back row if front row is full, otherwise front row
          frontRow: state.party.formation.frontRow.length < 3
            ? [...state.party.formation.frontRow, characterId]
            : state.party.formation.frontRow,
          backRow: state.party.formation.frontRow.length >= 3
            ? [...state.party.formation.backRow, characterId]
            : state.party.formation.backRow
        }
      }
    }));

    this.showSuccess(`${character.name} joined the party`);
  }

  onRemoveCharacter(characterId: string): void {
    const state = this.gameState();
    const character = state.roster.get(characterId);

    if (!character) {
      this.showError('Character not found');
      return;
    }

    // Remove character from party (immutable update)
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

    this.showSuccess(`${character.name} left the party`);
  }

  onMoveUp(characterId: string): void {
    const newState = moveCharacterUp(this.gameState(), characterId);
    this.gameStateService.updateState(() => newState);
  }

  onMoveDown(characterId: string): void {
    const newState = moveCharacterDown(this.gameState(), characterId);
    this.gameStateService.updateState(() => newState);
  }

  onInspect(characterId: string): void {
    this.router.navigate(['/character-inspection'], {
      queryParams: { characterId, returnTo: 'tavern' }
    });
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.router.navigate(['/castle-menu']);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(null), 3000);
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
