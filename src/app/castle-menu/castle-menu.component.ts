import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

/**
 * Castle Menu Component
 *
 * Central hub for all town services. Player navigates to:
 * - Tavern (party formation)
 * - Temple (healing/resurrection)
 * - Shop (equipment)
 * - Inn (rest/level up)
 * - Edge of Town (dungeon access)
 */
@Component({
  selector: 'app-castle-menu',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './castle-menu.component.html',
  styleUrls: ['./castle-menu.component.scss']
})
export class CastleMenuComponent implements OnInit {
  // Party display signals
  readonly currentParty = computed(() => this.gameState.party());
  readonly partyCharacters = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();
    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  readonly menuItems = computed(() => {
    const baseItems: MenuItem[] = [
      { id: 'tavern', label: "GILGAMESH'S TAVERN", enabled: true, shortcut: 'G' },
      { id: 'temple', label: 'TEMPLE OF CANT', enabled: true, shortcut: 'T' },
      { id: 'shop', label: "BOLTAC'S TRADING POST", enabled: true, shortcut: 'B' },
      { id: 'inn', label: "ADVENTURER'S INN", enabled: true, shortcut: 'A' },
      { id: 'edge-of-town', label: 'EDGE OF TOWN', enabled: this.hasParty(), shortcut: 'E' }
    ];
    return baseItems;
  });

  private hasParty(): boolean {
    return this.currentParty().members.length > 0;
  }

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Update game state to CASTLE_MENU
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CASTLE_MENU
    }));
  }

  handleMenuSelect(itemId: string): void {
    // Navigate to selected service
    this.router.navigate([`/${itemId}`]);
  }

  handleInspectCharacter(charId: string): void {
    this.router.navigate(['/character-inspection'], {
      queryParams: { characterId: charId, returnTo: 'castle-menu' }
    });
  }
}
