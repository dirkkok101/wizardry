import { Component, OnInit, HostListener, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '@services/GameStateService';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { MenuItem } from '@shared/components/menu/menu.component';

/**
 * Victory Scene Component
 *
 * Displays combat victory summary (XP earned) immediately after combat.
 * Then navigates to chest scene if there's a pending chest, or back to maze.
 *
 * Flow: Combat → Victory → Chest (if pending) → Maze
 */
@Component({
  selector: 'app-victory',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent
  ],
  templateUrl: './victory.component.html',
  styleUrls: ['./victory.component.scss']
})
export class VictoryComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);

  // Get pending combat rewards from game state
  readonly pendingCombatRewards = computed(() => {
    return this.gameState.state().pendingCombatRewards;
  });

  // Check if there's a pending chest to handle
  readonly hasPendingChest = computed(() => {
    return !!this.gameState.state().pendingChest;
  });

  // Footer menu
  readonly footerMenuItems = computed((): MenuItem[] => {
    const hasChest = this.hasPendingChest();
    return [
      {
        id: 'continue',
        label: hasChest ? 'Continue to Chest' : 'Return to Maze',
        shortcut: 'ENTER',
        enabled: true
      }
    ];
  });

  ngOnInit(): void {
    // If no pending rewards, redirect to maze
    if (!this.pendingCombatRewards()) {
      this.router.navigate(['/maze']);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.handleContinue();
    }
  }

  handleFooterAction(itemId: string): void {
    if (itemId === 'continue') {
      this.handleContinue();
    }
  }

  private handleContinue(): void {
    // Clear pending combat rewards
    this.gameState.updateState(state => ({
      ...state,
      pendingCombatRewards: undefined
    }));

    // Navigate to chest if pending, otherwise maze
    if (this.hasPendingChest()) {
      this.router.navigate(['/chest']);
    } else {
      this.router.navigate(['/maze']);
    }
  }
}
