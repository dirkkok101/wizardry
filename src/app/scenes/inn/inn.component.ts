import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { InnService, RoomType, PartyHealPlan, PartyRestResult, LevelUpDisplayData } from '@services/InnService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { RestActionCardComponent, RestActionConfig, RestActionType } from '@shared/components/rest-action-card/rest-action-card.component';
import { RestResultsModalComponent, RestResultsData } from '@shared/components/rest-results-modal/rest-results-modal.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { CharacterActionEvent } from '@models/CharacterCardTypes';
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
    RestActionCardComponent,
    RestResultsModalComponent,
    EmptyStateComponent
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

  // Front row characters (for 3-column layout)
  readonly frontRowCharacters = computed(() =>
    GameStateQueries.frontRowCharacters(this.gameState.state())
  );

  // Back row characters (for 3-column layout)
  readonly backRowCharacters = computed(() =>
    GameStateQueries.backRowCharacters(this.gameState.state())
  );

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

  // Rest action configurations (computed for the 3 cards)
  readonly restActionConfigs = computed((): RestActionConfig[] => {
    const plan = this.healPlan();
    const needsHealing = this.partyNeedsHealing();
    const needsSpells = this.partyNeedsSpells();
    const hasCasters = this.partyHasCasters();

    return [
      {
        type: 'restore-spells' as RestActionType,
        title: 'Restore Spells',
        description: 'Rest at the stables to restore all spell points for casters.',
        costText: '1 week at Stables',
        goldCost: 0,
        weeksNeeded: 1,
        enabled: hasCasters && needsSpells,
        disabledReason: !hasCasters
          ? 'No spell casters in party'
          : !needsSpells
          ? 'All spell points are full'
          : undefined
      },
      {
        type: 'heal-party' as RestActionType,
        title: 'Heal Party',
        description: this.getHealDescription(plan),
        costText: this.getHealCostText(plan),
        goldCost: plan.totalCost,
        weeksNeeded: plan.weeksNeeded,
        enabled: needsHealing && (plan.canAffordFull || plan.weeksNeeded > 0),
        disabledReason: !needsHealing
          ? 'All characters at full HP'
          : plan.weeksNeeded === 0
          ? 'Cannot afford any healing'
          : undefined
      },
      {
        type: 'full-rest' as RestActionType,
        title: 'Full Rest',
        description: 'Complete recovery: heal all HP and restore all spell points.',
        costText: this.getFullRestCostText(plan),
        goldCost: plan.totalCost,
        weeksNeeded: Math.max(plan.weeksNeeded, 1),
        enabled: (needsHealing || needsSpells) && (plan.canAffordFull || plan.weeksNeeded > 0 || !needsHealing),
        disabledReason: !needsHealing && !needsSpells
          ? 'Party is fully rested'
          : undefined
      }
    ];
  });

  // Footer menu items
  readonly footerMenuItems = computed((): MenuItem[] => {
    return [
      {
        id: 'return',
        label: 'Return to Castle (ESC)',
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

    if (itemId === 'return') {
      this.navigation.returnToCastle();
    }
  }

  handleCharacterAction(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'inn');
    }
  }

  handleRestActionSelected(actionType: RestActionType): void {
    this.messages.clear();

    switch (actionType) {
      case 'restore-spells':
        this.executeRestoreSpells();
        break;
      case 'heal-party':
        this.executeHealParty();
        break;
      case 'full-rest':
        this.executeFullRest();
        break;
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

  /**
   * Get description text for Heal Party action
   */
  private getHealDescription(plan: PartyHealPlan): string {
    if (plan.weeksNeeded === 0) {
      return 'All characters are at full HP.';
    }

    const roomName = this.getRoomName(plan.roomTier);
    if (plan.canAffordFull) {
      return `Rest at ${roomName} to fully heal all party members.`;
    } else {
      return `Partial healing at ${roomName} (cannot afford full heal).`;
    }
  }

  /**
   * Get cost text for Heal Party action
   */
  private getHealCostText(plan: PartyHealPlan): string {
    if (plan.weeksNeeded === 0) {
      return 'No cost';
    }

    const weeks = plan.weeksNeeded;
    const weekText = weeks === 1 ? '1 week' : `${weeks} weeks`;
    const roomName = this.getRoomName(plan.roomTier);

    return `${weekText} at ${roomName}`;
  }

  /**
   * Get cost text for Full Rest action
   */
  private getFullRestCostText(plan: PartyHealPlan): string {
    const needsHealing = this.partyNeedsHealing();

    if (!needsHealing) {
      return '1 week at Stables';
    }

    return this.getHealCostText(plan);
  }

  /**
   * Get display name for room type
   */
  private getRoomName(roomType: RoomType): string {
    const names: Record<RoomType, string> = {
      [RoomType.STABLES]: 'Stables',
      [RoomType.BARRACKS]: 'Barracks',
      [RoomType.DOUBLE]: 'Double Room',
      [RoomType.PRIVATE]: 'Private Room',
      [RoomType.ROYAL_SUITE]: 'Royal Suite'
    };
    return names[roomType];
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
    const configs = this.restActionConfigs();

    if (key === '1' && configs[0].enabled) {
      event.preventDefault();
      this.handleRestActionSelected('restore-spells');
    } else if (key === '2' && configs[1].enabled) {
      event.preventDefault();
      this.handleRestActionSelected('heal-party');
    } else if (key === '3' && configs[2].enabled) {
      event.preventDefault();
      this.handleRestActionSelected('full-rest');
    }
  }
}
