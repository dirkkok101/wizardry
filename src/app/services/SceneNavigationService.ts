import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Valid return destinations for scene navigation.
 * These correspond to route paths without the leading '/'.
 */
export type ReturnDestination =
  | 'castle-menu'
  | 'tavern'
  | 'temple'
  | 'shop'
  | 'inn'
  | 'training-grounds'
  | 'maze'
  | 'chest'
  | 'camp'
  | 'system';

/**
 * SceneNavigationService - Centralized navigation for all scene transitions
 *
 * This service eliminates duplicate navigation code across scenes by providing:
 * - Consistent return-to-castle navigation
 * - Character inspection with proper returnTo handling
 * - Spell casting navigation with returnTo
 * - Type-safe route definitions
 *
 * Benefits:
 * - Single source of truth for navigation paths
 * - Consistent query parameter handling
 * - Easier refactoring of routes
 * - Type-safe destination validation
 */
@Injectable({
  providedIn: 'root'
})
export class SceneNavigationService {
  private readonly router = inject(Router);

  /**
   * Return to castle menu (most common navigation)
   * Used by: Tavern, Temple, Shop, Inn, Training Grounds, Maze
   */
  returnToCastle(): Promise<boolean> {
    return this.router.navigate(['/castle-menu']);
  }

  /**
   * Navigate to a specific scene
   */
  navigateTo(destination: ReturnDestination): Promise<boolean> {
    return this.router.navigate([`/${destination}`]);
  }

  /**
   * Navigate to character inspection with return destination
   * Used by: Castle Menu, Tavern, Temple, Training Grounds, Shop, Inn, Maze
   */
  inspectCharacter(characterId: string, returnTo: ReturnDestination = 'castle-menu'): Promise<boolean> {
    return this.router.navigate(['/character-inspection'], {
      queryParams: { characterId, returnTo }
    });
  }

  /**
   * Navigate to spell casting with return destination
   * Used by: Maze (for dungeon spell casting via navigation)
   */
  castSpell(characterId: string, returnTo: ReturnDestination = 'maze'): Promise<boolean> {
    return this.router.navigate(['/spell-casting'], {
      queryParams: { characterId, returnTo }
    });
  }

  /**
   * Navigate to character creation
   * Used by: Training Grounds
   */
  createCharacter(): Promise<boolean> {
    return this.router.navigate(['/character-creation']);
  }

  /**
   * Navigate to maze (dungeon)
   * Used by: Castle Menu
   */
  enterMaze(): Promise<boolean> {
    return this.router.navigate(['/maze']);
  }

  /**
   * Return from character inspection to previous scene
   * Used by: Character Inspection component
   */
  returnFromInspection(returnTo: string): Promise<boolean> {
    // Validate returnTo is a valid destination, default to castle-menu if not
    const validDestinations: ReturnDestination[] = [
      'castle-menu', 'tavern', 'temple', 'shop', 'inn',
      'training-grounds', 'maze', 'camp', 'system'
    ];

    const destination = validDestinations.includes(returnTo as ReturnDestination)
      ? returnTo
      : 'castle-menu';

    return this.router.navigate([`/${destination}`]);
  }

  /**
   * Town service navigation shortcuts
   */
  goToTavern(): Promise<boolean> {
    return this.router.navigate(['/tavern']);
  }

  goToTemple(): Promise<boolean> {
    return this.router.navigate(['/temple']);
  }

  goToShop(): Promise<boolean> {
    return this.router.navigate(['/shop']);
  }

  goToInn(): Promise<boolean> {
    return this.router.navigate(['/inn']);
  }

  goToTrainingGrounds(): Promise<boolean> {
    return this.router.navigate(['/training-grounds']);
  }

  /**
   * Navigate to camp (from maze)
   * Used by: Maze
   */
  goToCamp(): Promise<boolean> {
    return this.router.navigate(['/camp']);
  }

  /**
   * Navigate to system scene (backup/restore)
   * Used by: Castle Menu
   */
  goToSystem(): Promise<boolean> {
    return this.router.navigate(['/system']);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Maze Child Route Navigation (Combat & Chest flows)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Navigate to combat planning phase
   * Used by: MazeExplorationComponent when encounter triggers
   */
  enterCombat(): Promise<boolean> {
    return this.router.navigate(['/maze/combat/planning']);
  }

  /**
   * Navigate to combat playback (round execution)
   * Used by: CombatPlanningComponent after all actions selected
   */
  startCombatRound(): Promise<boolean> {
    return this.router.navigate(['/maze/combat/playback']);
  }

  /**
   * Navigate to combat victory screen
   * Used by: CombatPlaybackComponent when party wins
   */
  showCombatVictory(): Promise<boolean> {
    return this.router.navigate(['/maze/combat/victory']);
  }

  /**
   * Navigate to combat defeat screen
   * Used by: CombatPlaybackComponent when party is wiped
   */
  showCombatDefeat(): Promise<boolean> {
    return this.router.navigate(['/maze/combat/defeat']);
  }

  /**
   * Return to exploration mode (exit combat/chest flows)
   * Used by: CombatVictoryComponent, ChestRewardsComponent
   */
  returnToExploration(): Promise<boolean> {
    return this.router.navigate(['/maze']);
  }

  /**
   * Navigate to chest interaction screen
   * Used by: CombatVictoryComponent when pendingChest exists
   */
  openChest(): Promise<boolean> {
    return this.router.navigate(['/maze/chest']);
  }

  /**
   * Navigate to chest trap playback
   * Used by: MazeChestComponent when trap is triggered
   */
  showChestTrapPlayback(): Promise<boolean> {
    return this.router.navigate(['/maze/chest/playback']);
  }

  /**
   * Navigate to chest rewards screen
   * Used by: MazeChestComponent (no trap) or ChestPlaybackComponent (after trap)
   */
  showChestRewards(): Promise<boolean> {
    return this.router.navigate(['/maze/chest/rewards']);
  }
}
