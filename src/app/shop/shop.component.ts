import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';

type ShopView = 'main' | 'buy' | 'sell' | 'identify';

/**
 * Shop Component (Boltac's Trading Post)
 *
 * Item trading services (Phase 4: Scaffolded)
 * - Basic structure and navigation
 * - Placeholder for buy/sell/identify
 * - Full inventory system in Phase 5
 */
@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, MenuComponent],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class ShopComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    {
      id: 'buy',
      label: 'BUY ITEMS',
      enabled: true,
      shortcut: 'B'
    },
    {
      id: 'sell',
      label: 'SELL ITEMS',
      enabled: true,
      shortcut: 'S'
    },
    {
      id: 'identify',
      label: 'IDENTIFY ITEMS',
      enabled: true,
      shortcut: 'I'
    },
    {
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  readonly currentView = signal<ShopView>('main');

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.SHOP
    }));
  }

  handleMenuSelect(itemId: string): void {
    switch (itemId) {
      case 'buy':
        this.currentView.set('buy');
        break;

      case 'sell':
        this.currentView.set('sell');
        break;

      case 'identify':
        this.currentView.set('identify');
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
