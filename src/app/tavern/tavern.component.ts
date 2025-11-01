import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
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
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  // View state
  readonly currentView = signal<TavernView>('main');
  readonly errorMessage = signal<string | null>(null);

  // Party and roster
  readonly currentParty = computed(() => this.gameState.party());
  readonly allCharacters = computed(() => {
    const state = this.gameState.state();
    return Array.from(state.roster.values());
  });

  // Characters available to add (not in party)
  readonly availableCharacters = computed(() => {
    const party = this.currentParty();
    const partyMemberIds = new Set(party.members);
    return this.allCharacters().filter(char => !partyMemberIds.has(char.id));
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

    switch (itemId) {
      case 'add-character':
        this.currentView.set('add');
        break;

      case 'remove-character':
        this.currentView.set('remove');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  handleAddCharacter(charId: string): void {
    const party = this.currentParty();

    // Check party size limit
    if (party.members.length >= MAX_PARTY_SIZE) {
      this.errorMessage.set(`Party is full (maximum ${MAX_PARTY_SIZE} characters)`);
      return;
    }

    // Add character to party
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

  cancelView(): void {
    this.currentView.set('main');
    this.errorMessage.set(null);
  }
}
