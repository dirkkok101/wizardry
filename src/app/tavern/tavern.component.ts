import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { PartyService } from '../../services/PartyService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { CharacterListComponent } from '../../components/character-list/character-list.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

type TavernView = 'main' | 'add' | 'remove';

const MAX_PARTY_SIZE = 6;

/**
 * Tavern Component (Gilgamesh's Tavern)
 *
 * Party formation hub where players:
 * - Add characters to party (max 6)
 * - Remove characters from party
 * - Inspect character details
 * - Return to castle
 */
@Component({
  selector: 'app-tavern',
  standalone: true,
  imports: [CommonModule, MenuComponent, CharacterListComponent],
  templateUrl: './tavern.component.html',
  styleUrls: ['./tavern.component.scss']
})
export class TavernComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'add-character',
      label: 'ADD TO PARTY',
      enabled: true,
      shortcut: 'A'
    },
    {
      id: 'remove-character',
      label: 'REMOVE FROM PARTY',
      enabled: true,
      shortcut: 'R'
    },
    {
      id: 'divvy-gold',
      label: 'DIVVY GOLD',
      enabled: true,
      shortcut: 'D'
    },
    {
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  // View state
  readonly currentView = signal<TavernView>('main');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Party and roster
  readonly currentParty = computed(() => this.gameState.party());
  readonly allCharacters = computed(() => {
    const state = this.gameState.state();
    return Array.from(state.roster.values());
  });

  // Characters available to add (not in party, status OK only)
  readonly availableCharacters = computed(() => {
    const party = this.currentParty();
    const partyMemberIds = new Set(party.members);
    return this.allCharacters().filter(
      char => !partyMemberIds.has(char.id) && char.status === 'OK'
    );
  });

  // Characters in party (for removal)
  readonly partyCharacters = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();
    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TAVERN
    }));
  }

  handleMenuSelect(itemId: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    switch (itemId) {
      case 'add-character':
        this.currentView.set('add');
        break;

      case 'remove-character':
        this.currentView.set('remove');
        break;

      case 'divvy-gold':
        this.handleDivvyGold();
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  handleAddCharacter(charId: string): void {
    const state = this.gameState.state();
    const party = this.currentParty();
    const character = state.roster.get(charId);

    if (!character) {
      this.errorMessage.set('Character not found');
      return;
    }

    // Validate using PartyService
    const validation = PartyService.canAddCharacterToParty(party, character, state.roster);

    if (!validation.allowed) {
      this.errorMessage.set(validation.reason || 'Cannot add character');
      return;
    }

    // Add character to party (immutable update)
    this.gameState.updateState(state => ({
      ...state,
      party: {
        ...state.party,
        members: [...state.party.members, charId]
      }
    }));

    this.currentView.set('main');
  }

  handleRemoveCharacter(charId: string): void {
    // Remove character from party
    this.gameState.updateState(state => ({
      ...state,
      party: {
        ...state.party,
        members: state.party.members.filter(id => id !== charId)
      }
    }));

    this.currentView.set('main');
  }

  handleDivvyGold(): void {
    const state = this.gameState.state();
    const party = this.currentParty();

    // Clear previous messages
    this.errorMessage.set(null);
    this.successMessage.set(null);

    // Divvy gold using PartyService
    const result = PartyService.divvyGold(party, state.roster);

    if (!result.success) {
      this.errorMessage.set(result.error || 'Failed to distribute gold');
      return;
    }

    // Update game state with new roster and party
    this.gameState.updateState(state => ({
      ...state,
      roster: result.updatedRoster!,
      party: result.updatedParty!
    }));

    // Calculate share per member for success message
    const sharePerMember = Math.floor(party.gold! / party.members.length);
    this.successMessage.set(`Gold distributed: ${sharePerMember} gold per member`);
  }

  handleInspectCharacter(charId: string): void {
    const party = this.currentParty();

    // Validate character is in party
    if (!party.members.includes(charId)) {
      this.errorMessage.set('Character not found in party');
      return;
    }

    // Navigate to character inspection with return context
    this.router.navigate(['/character-inspection'], {
      queryParams: {
        characterId: charId,
        returnTo: 'tavern'
      }
    });
  }

  cancelView(): void {
    this.currentView.set('main');
    this.errorMessage.set(null);
  }
}
