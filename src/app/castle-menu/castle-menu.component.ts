import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
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
  imports: [CommonModule, MenuComponent, SceneTitleComponent, SceneFooterComponent],
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
      { id: 'tavern', label: "GILGAMESH'S TAVERN", enabled: true, shortcut: 'T' },
      { id: 'training-grounds', label: 'TRAINING GROUNDS', enabled: true, shortcut: 'G' },
      { id: 'inn', label: "ADVENTURER'S INN", enabled: true, shortcut: 'I' },
      { id: 'shop', label: "BOLTAC'S SHOP", enabled: true, shortcut: 'S' },
      { id: 'temple', label: 'TEMPLE OF CANT', enabled: true, shortcut: 'M' },
      { id: 'utilities', label: 'UTILITIES', enabled: true, shortcut: 'U' },
      { id: 'edge-of-town', label: 'EDGE OF TOWN', enabled: this.hasParty(), shortcut: 'E' }
    ];
    return baseItems;
  });

  readonly footerMenuItems = computed((): MenuItem[] => {
    const hasParty = (this.currentParty().members?.length ?? 0) > 0;

    return [
      { id: 'tavern', label: 'Tavern', shortcut: 'G', enabled: true },
      { id: 'temple', label: 'Temple', shortcut: 'T', enabled: true },
      { id: 'shop', label: 'Shop', shortcut: 'B', enabled: true },
      { id: 'inn', label: 'Inn', shortcut: 'A', enabled: true },
      { id: 'edge', label: 'Edge of Town', shortcut: 'E', enabled: hasParty }
    ];
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

  handleFooterAction(itemId: string): void {
    switch(itemId) {
      case 'tavern':
        this.router.navigate(['/tavern']);
        break;
      case 'temple':
        this.router.navigate(['/temple']);
        break;
      case 'shop':
        this.router.navigate(['/shop']);
        break;
      case 'inn':
        this.router.navigate(['/inn']);
        break;
      case 'edge':
        if ((this.currentParty().members?.length ?? 0) > 0) {
          this.router.navigate(['/edge-of-town']);
        }
        break;
    }
  }
}
