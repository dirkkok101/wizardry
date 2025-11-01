import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { CharacterListComponent } from '../../components/character-list/character-list.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

type InnView = 'main' | 'stables';

const REST_COST_PER_MEMBER = 10;

/**
 * Inn Component (Adventurer's Inn)
 *
 * Rest and recovery services:
 * - Rest: Restore all party HP (costs 10 gold per member)
 * - Stables: Board characters for later retrieval
 * - Return to castle
 */
@Component({
  selector: 'app-inn',
  standalone: true,
  imports: [CommonModule, MenuComponent, CharacterListComponent],
  templateUrl: './inn.component.html',
  styleUrls: ['./inn.component.scss']
})
export class InnComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'rest',
      label: 'REST (10 GOLD/MEMBER)',
      enabled: true,
      shortcut: 'R'
    },
    {
      id: 'stables',
      label: 'STABLES',
      enabled: true,
      shortcut: 'S'
    },
    {
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  // View state
  readonly currentView = signal<InnView>('main');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Party
  readonly currentParty = computed(() => this.gameState.party());
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
      currentScene: SceneType.INN
    }));
  }

  handleMenuSelect(itemId: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    switch (itemId) {
      case 'rest':
        this.rest();
        break;

      case 'stables':
        this.currentView.set('stables');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  private rest(): void {
    const party = this.currentParty();

    // Validate party exists
    if (party.members.length === 0) {
      this.errorMessage.set('You need a party to rest');
      return;
    }

    // Calculate cost
    const cost = party.members.length * REST_COST_PER_MEMBER;
    const partyGold = party.gold || 0;

    // Check if party can afford
    if (partyGold < cost) {
      this.errorMessage.set(`Cannot afford rest. Need ${cost} gold (${REST_COST_PER_MEMBER} per member)`);
      return;
    }

    // Restore all party members to full HP
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster);

      party.members.forEach(charId => {
        const char = newRoster.get(charId);
        if (char) {
          newRoster.set(charId, {
            ...char,
            hp: char.maxHp
          });
        }
      });

      return {
        ...state,
        roster: newRoster,
        party: {
          ...state.party,
          gold: partyGold - cost
        }
      };
    });

    this.successMessage.set(`Party rested well! All HP restored. (-${cost} gold)`);
  }

  cancelView(): void {
    this.currentView.set('main');
  }
}
