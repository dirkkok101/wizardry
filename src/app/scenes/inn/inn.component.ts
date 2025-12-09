import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { InnService, RoomType, PartyHealPlan, PartyRestResult } from '@services/InnService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { RestResultsModalComponent, RestResultsData } from '@shared/components/rest-results-modal/rest-results-modal.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { CharacterActionEvent } from '@models/CharacterCardTypes';
import { Character } from '@models/Character';
import { SceneType } from '@models/SceneType';
import { CharacterStatus } from '@models/CharacterStatus';

/**
 * Inn Component (Adventurer's Inn)
 *
 * Party-based rest system with three action types:
 * - Restore Spells (1): Free, 1 week at Stables - restores all spell points
 * - Heal Party (2): Auto-optimized room tier - heals all HP
 * - Full Rest (3): Both healing and spell restoration
 *
 * The system automatically calculates the optimal room tier based on
 * party gold, cascading from Royal Suite down to Barracks.
 */
@Component({
  selector: 'app-inn',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    RestResultsModalComponent
  ],
  templateUrl: './inn.component.html',
  styleUrls: ['./inn.component.scss']
})
export class InnComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  readonly messages = inject(MessageService);

  // State signals
  readonly showRestResults = signal(false);
  readonly restResults = signal<RestResultsData | null>(null);

  // Party characters (computed from game state)
  readonly partyCharacters = computed(() =>
    GameStateQueries.partyCharacters(this.gameState.state())
  );

  // Party gold (computed from game state)
  readonly partyGold = computed(() =>
    GameStateQueries.partyGold(this.gameState.state())
  );

  // Left column characters (positions 1, 3, 5 - indices 0, 2, 4)
  readonly leftColumnCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[0], chars[2], chars[4]].filter((c): c is Character => c !== undefined);
  });

  // Right column characters (positions 2, 4, 6 - indices 1, 3, 5)
  readonly rightColumnCharacters = computed(() => {
    const chars = this.partyCharacters();
    return [chars[1], chars[3], chars[5]].filter((c): c is Character => c !== undefined);
  });

  // Living characters only (for rest calculations)
  readonly livingCharacters = computed(() =>
    this.partyCharacters().filter(c => c.status === CharacterStatus.OK)
  );

  // Calculated heal plan (computed for Heal Party action)
  readonly healPlan = computed((): PartyHealPlan =>
    InnService.calculatePartyHealPlan(this.livingCharacters(), this.partyGold())
  );

  // Check if party needs healing
  readonly partyNeedsHealing = computed(() =>
    this.livingCharacters().some(c => c.hp < c.maxHp)
  );

  // Check if party has depleted spell points
  readonly partyNeedsSpells = computed(() =>
    InnService.partyHasDepletedSpellPoints(this.livingCharacters())
  );

  // Check if party has any casters
  readonly partyHasCasters = computed(() =>
    InnService.partyHasCasters(this.livingCharacters())
  );

  // Footer menu items with rest actions
  readonly footerMenuItems = computed((): MenuItem[] => {
    const plan = this.healPlan();
    const needsHealing = this.partyNeedsHealing();
    const needsSpells = this.partyNeedsSpells();
    const hasCasters = this.partyHasCasters();

    // Calculate full rest cost (0 if only spells needed)
    const fullRestCost = needsHealing ? plan.totalCost : 0;

    return [
      {
        id: 'restore-spells',
        label: 'Restore Spells',
        shortcut: '1',
        enabled: hasCasters && needsSpells
      },
      {
        id: 'heal-party',
        label: plan.totalCost > 0 ? `Heal Party (${plan.totalCost}g)` : 'Heal Party',
        shortcut: '2',
        enabled: needsHealing && plan.weeksNeeded > 0
      },
      {
        id: 'full-rest',
        label: fullRestCost > 0 ? `Full Rest (${fullRestCost}g)` : 'Full Rest',
        shortcut: '3',
        enabled: needsHealing || needsSpells
      },
      {
        id: 'return',
        label: 'Return to Castle',
        shortcut: 'ESC',
        enabled: true
      }
    ];
  });

  ngOnInit(): void {
    this.messages.clear();
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.INN
    }));
  }

  handleFooterAction(itemId: string): void {
    this.messages.clear();

    switch (itemId) {
      case 'restore-spells':
        this.executeRestoreSpells();
        break;
      case 'heal-party':
        this.executeHealParty();
        break;
      case 'full-rest':
        this.executeFullRest();
        break;
      case 'return':
        this.navigation.returnToCastle();
        break;
    }
  }

  handleCharacterAction(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'inn');
    }
  }

  /**
   * Execute Restore Spells action (1 week at Stables, free)
   */
  private executeRestoreSpells(): void {
    if (!this.partyNeedsSpells()) {
      this.messages.showError('All spell points are already full');
      return;
    }

    // Create a minimal plan for stables (1 week, free)
    const stablesPlan: PartyHealPlan = {
      roomTier: RoomType.STABLES,
      weeksNeeded: 1,
      totalCost: 0,
      canAffordFull: true,
      hpPerCharacter: new Map()
    };

    const result = InnService.executePartyRest(
      this.gameState.state(),
      stablesPlan,
      true // restore spells
    );

    this.applyRestResult(result);
  }

  /**
   * Execute Heal Party action (auto-optimized room tier)
   */
  private executeHealParty(): void {
    const plan = this.healPlan();

    if (plan.weeksNeeded === 0) {
      this.messages.showError('No healing needed - all characters at full HP');
      return;
    }

    const result = InnService.executePartyRest(
      this.gameState.state(),
      plan,
      false // don't restore spells
    );

    this.applyRestResult(result);
  }

  /**
   * Execute Full Rest action (heal HP + restore spells)
   */
  private executeFullRest(): void {
    const healPlan = this.healPlan();
    const needsHealing = this.partyNeedsHealing();
    const needsSpells = this.partyNeedsSpells();

    if (!needsHealing && !needsSpells) {
      this.messages.showError('Party is already fully rested');
      return;
    }

    // If only spells needed, use stables plan
    // If healing needed, use calculated heal plan
    const plan: PartyHealPlan = needsHealing
      ? healPlan
      : {
          roomTier: RoomType.STABLES,
          weeksNeeded: 1,
          totalCost: 0,
          canAffordFull: true,
          hpPerCharacter: new Map()
        };

    // Always restore spells for Full Rest
    const result = InnService.executePartyRest(
      this.gameState.state(),
      plan,
      true // restore spells
    );

    this.applyRestResult(result);
  }

  /**
   * Apply rest result to game state and show results modal
   */
  private applyRestResult(result: PartyRestResult): void {
    // Update game state
    this.gameState.updateState(() => result.updatedState);

    // Build character names map
    const characterNames = new Map<string, string>();
    for (const [charId] of result.perCharacter) {
      const char = result.updatedState.roster.get(charId);
      if (char) {
        characterNames.set(charId, char.name);
      }
    }

    // Set results data for modal
    this.restResults.set({
      weeksRested: result.weeksRested,
      goldSpent: result.goldSpent,
      goldRemaining: result.goldRemaining,
      perCharacter: result.perCharacter,
      characterNames,
      levelUps: result.levelUps
    });

    this.showRestResults.set(true);
  }

  /**
   * Dismiss the rest results modal
   */
  dismissRestResults(): void {
    this.showRestResults.set(false);
    this.restResults.set(null);
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (this.showRestResults()) {
      this.dismissRestResults();
    } else {
      this.navigation.returnToCastle();
    }
  }

  @HostListener('window:keydown.enter')
  handleEnter(): void {
    if (this.showRestResults()) {
      this.dismissRestResults();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    // Don't handle shortcuts when results modal is showing
    if (this.showRestResults()) {
      return;
    }

    const key = event.key;
    const menuItems = this.footerMenuItems();

    // Find menu item by shortcut key
    const item = menuItems.find(m => m.shortcut === key);
    if (item && item.enabled) {
      event.preventDefault();
      this.handleFooterAction(item.id);
    }
  }
}
