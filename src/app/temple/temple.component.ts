import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';

type TempleView = 'main' | 'healing';

/**
 * Temple Component (Temple of Cant)
 *
 * Healing and resurrection services (Phase 4: Scaffolded)
 * - Basic structure and navigation
 * - Placeholder for healing services
 * - Full resurrection mechanics in Phase 5
 */
@Component({
  selector: 'app-temple',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './temple.component.html',
  styleUrls: ['./temple.component.scss']
})
export class TempleComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'healing',
      label: 'HEALING SERVICES',
      enabled: true,
      shortcut: 'H'
    },
    {
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  readonly currentView = signal<TempleView>('main');

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TEMPLE
    }));
  }

  handleMenuSelect(itemId: string): void {
    switch (itemId) {
      case 'healing':
        this.currentView.set('healing');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  cancelView(): void {
    this.currentView.set('main');
  }
}
