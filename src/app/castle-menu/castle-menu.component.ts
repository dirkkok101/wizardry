import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';

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
  readonly menuItems: MenuItem[] = [
    {
      id: 'tavern',
      label: "GILGAMESH'S TAVERN",
      enabled: true,
      shortcut: 'G'
    },
    {
      id: 'temple',
      label: 'TEMPLE OF CANT',
      enabled: true,
      shortcut: 'T'
    },
    {
      id: 'shop',
      label: "BOLTAC'S TRADING POST",
      enabled: true,
      shortcut: 'B'
    },
    {
      id: 'inn',
      label: "ADVENTURER'S INN",
      enabled: true,
      shortcut: 'A'
    },
    {
      id: 'edge-of-town',
      label: 'EDGE OF TOWN',
      enabled: true,
      shortcut: 'E'
    }
  ];

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
}
