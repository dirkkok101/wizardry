import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { InnService, RoomType } from '@services/InnService';
import { LevelUpService } from '@services/LevelUpService';
import { SpellLearningService } from '@services/SpellLearningService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { PartyCharacterGridComponent } from '@shared/components/party-character-grid/party-character-grid.component';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { TierSelectionComponent, TierOption } from '@shared/components/tier-selection/tier-selection.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { CharacterActionEvent } from '@models/CharacterCardTypes';
import { SceneType } from '@models/SceneType';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';

interface LevelUpDisplayData {
  newLevel: number;
  hpIncrease: number;
  statChanges: Record<string, number>;
  newSpells: Array<{ id: string; name: string }>;
}

interface RestProgressData {
  weeksRested: number;
  totalHpRecovered: number;
  totalGoldSpent: number;
  startingHp: number;
  currentHp: number;
  maxHp: number;
}

/**
 * Inn Component (Adventurer's Inn)
 *
 * Character rest and level-up:
 * - Select character from party to rest
 * - Choose room type (cost/healing rate)
 * - Rest loop: heal HP week by week, deduct gold
 * - Level up when HP = max and XP sufficient
 *
 * Room Types:
 * - Stables: 0 gp/week, 0 HP/week (for level-up check only)
 * - Barracks: 10 gp/week, 1 HP/week
 * - Double: 50 gp/week, 3 HP/week
 * - Private: 200 gp/week, 7 HP/week
 * - Royal Suite: 500 gp/week, 10 HP/week
 */
@Component({
  selector: 'app-inn',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    PartyCharacterGridComponent,
    ConfirmationDialogComponent,
    TierSelectionComponent
  ],
  templateUrl: './inn.component.html',
  styleUrls: ['./inn.component.scss']
})
export class InnComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  readonly messages = inject(MessageService);

  // Expose to template
  readonly RoomType = RoomType;
  readonly Object = Object;

  // State signals
  readonly selectedCharacterId = signal<string | null>(null);
  readonly showRoomSelection = signal(false);
  readonly showConfirmation = signal(false);
  readonly confirmationMessage = signal('');
  readonly pendingRoomType = signal<RoomType | null>(null);
  readonly levelUpData = signal<LevelUpDisplayData | null>(null);
  readonly restProgress = signal<RestProgressData | null>(null);
  readonly isAutoResting = signal(false);

  // Party characters (computed from game state)
  readonly partyCharacters = computed(() =>
    GameStateQueries.partyCharacters(this.gameState.state())
  );

  // Party gold (computed from game state)
  readonly partyGold = computed(() =>
    GameStateQueries.partyGold(this.gameState.state())
  );

  // Selected character (computed from ID)
  readonly selectedCharacter = computed(() => {
    const charId = this.selectedCharacterId();
    if (!charId) return null;
    return GameStateQueries.getCharacter(this.gameState.state(), charId) || null;
  });

  // Room tier options for TierSelectionComponent
  readonly roomOptions: TierOption[] = [
    {
      id: RoomType.STABLES,
      name: 'Stables',
      cost: InnService.getRoomCost(RoomType.STABLES),
      costUnit: 'gp/week',
      benefit: `${InnService.getRoomHealRate(RoomType.STABLES)} HP/week`,
      shortcut: 'S',
      description: 'Free but no healing - for level-up checks only'
    },
    {
      id: RoomType.BARRACKS,
      name: 'Barracks',
      cost: InnService.getRoomCost(RoomType.BARRACKS),
      costUnit: 'gp/week',
      benefit: `${InnService.getRoomHealRate(RoomType.BARRACKS)} HP/week`,
      shortcut: 'B',
      description: 'Basic shared accommodation'
    },
    {
      id: RoomType.DOUBLE,
      name: 'Double',
      cost: InnService.getRoomCost(RoomType.DOUBLE),
      costUnit: 'gp/week',
      benefit: `${InnService.getRoomHealRate(RoomType.DOUBLE)} HP/week`,
      shortcut: 'D',
      description: 'Shared room with moderate comfort'
    },
    {
      id: RoomType.PRIVATE,
      name: 'Private',
      cost: InnService.getRoomCost(RoomType.PRIVATE),
      costUnit: 'gp/week',
      benefit: `${InnService.getRoomHealRate(RoomType.PRIVATE)} HP/week`,
      shortcut: 'P',
      description: 'Private room for faster recovery'
    },
    {
      id: RoomType.ROYAL_SUITE,
      name: 'Royal Suite',
      cost: InnService.getRoomCost(RoomType.ROYAL_SUITE),
      costUnit: 'gp/week',
      benefit: `${InnService.getRoomHealRate(RoomType.ROYAL_SUITE)} HP/week`,
      shortcut: 'R',
      description: 'Luxury accommodation with maximum healing'
    }
  ];

  // Footer menu items - dynamic based on current state
  readonly footerMenuItems = computed((): MenuItem[] => {
    if (this.showRoomSelection()) {
      return [
        {
          id: 'back',
          label: 'Back (ESC)',
          shortcut: 'ESC',
          enabled: true
        }
      ];
    }

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
    } else if (itemId === 'back') {
      this.cancelRoomSelection();
    }
  }

  handleCharacterAction(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'inn');
    } else if (event.actionType === 'rest') {
      this.selectCharacterToRest(event.characterId);
    }
  }

  selectCharacterToRest(charId: string): void {
    const character = GameStateQueries.getCharacter(this.gameState.state(), charId);
    if (!character) {
      this.messages.showError('Character not found');
      return;
    }

    // Check if character is alive
    if (character.status === CharacterStatus.DEAD ||
        character.status === CharacterStatus.ASHES ||
        character.status === CharacterStatus.LOST) {
      this.messages.showError(`${character.name} cannot rest in their current state`);
      return;
    }

    this.selectedCharacterId.set(charId);
    this.showRoomSelection.set(true);
    this.restProgress.set(null);
    this.messages.clear();
  }

  handleRoomSelected(option: TierOption): void {
    const roomType = option.id as RoomType;
    const character = this.selectedCharacter();
    if (!character) {
      this.messages.showError('No character selected');
      return;
    }

    // Validate affordability (double-check since component should prevent this)
    const validation = InnService.canAffordRoom(this.gameState.state(), roomType);
    if (!validation.allowed) {
      this.messages.showError(validation.reason || 'Cannot afford room');
      return;
    }

    // Show confirmation with options
    this.pendingRoomType.set(roomType);
    const cost = InnService.getRoomCost(roomType);
    const healRate = InnService.getRoomHealRate(roomType);
    const hpNeeded = character.maxHp - character.hp;
    const weeksToHeal = healRate > 0 ? Math.ceil(hpNeeded / healRate) : 0;
    const totalCost = cost * weeksToHeal;

    let message = `Rest ${character.name} in ${option.name.toLowerCase()}?\n`;
    message += `Cost: ${cost} gp/week | Heal: ${healRate} HP/week\n\n`;

    if (hpNeeded > 0 && healRate > 0) {
      message += `To fully heal (${hpNeeded} HP): ~${weeksToHeal} weeks, ~${totalCost} gp`;
    } else if (hpNeeded <= 0) {
      message += `Character is already at full HP. Rest to check for level-up.`;
    } else {
      message += `Stables provide no healing but allow level-up checks.`;
    }

    this.confirmationMessage.set(message);
    this.showConfirmation.set(true);
  }

  handleRoomSelectionCancelled(): void {
    this.cancelRoomSelection();
  }

  cancelRoomSelection(): void {
    this.showRoomSelection.set(false);
    this.selectedCharacterId.set(null);
    this.pendingRoomType.set(null);
    this.restProgress.set(null);
    this.isAutoResting.set(false);
    this.messages.clear();
  }

  cancelConfirmation(): void {
    this.showConfirmation.set(false);
    this.confirmationMessage.set('');
    this.pendingRoomType.set(null);
  }

  confirmRest(): void {
    const roomType = this.pendingRoomType();
    const character = this.selectedCharacter();

    if (!roomType || !character) {
      this.messages.showError('Invalid rest request');
      this.cancelConfirmation();
      return;
    }

    // Initialize rest progress only if not already tracking
    if (!this.restProgress()) {
      this.restProgress.set({
        weeksRested: 0,
        totalHpRecovered: 0,
        totalGoldSpent: 0,
        startingHp: character.hp,
        currentHp: character.hp,
        maxHp: character.maxHp
      });
    }

    // Perform the rest
    this.performRest(character, roomType);
    this.cancelConfirmation();
  }

  /**
   * Rest until fully healed (auto-rest mode)
   */
  confirmAutoRest(): void {
    const roomType = this.pendingRoomType();
    const character = this.selectedCharacter();

    if (!roomType || !character) {
      this.messages.showError('Invalid rest request');
      this.cancelConfirmation();
      return;
    }

    // Initialize rest progress only if not already tracking
    if (!this.restProgress()) {
      this.restProgress.set({
        weeksRested: 0,
        totalHpRecovered: 0,
        totalGoldSpent: 0,
        startingHp: character.hp,
        currentHp: character.hp,
        maxHp: character.maxHp
      });
    }

    this.isAutoResting.set(true);
    this.cancelConfirmation();
    this.performAutoRest(character, roomType);
  }

  private performAutoRest(character: Character, roomType: RoomType): void {
    // Rest loop until fully healed or can't afford
    const restLoop = (): void => {
      const currentChar = this.selectedCharacter();
      if (!currentChar || !this.isAutoResting()) {
        this.isAutoResting.set(false);
        return;
      }

      // Check if fully healed
      if (currentChar.hp >= currentChar.maxHp) {
        this.isAutoResting.set(false);
        this.checkForLevelUpAfterRest(currentChar);
        return;
      }

      // Check affordability
      const validation = InnService.canAffordRoom(this.gameState.state(), roomType);
      if (!validation.allowed) {
        this.isAutoResting.set(false);
        this.messages.showError(`Ran out of gold! ${validation.reason}`);
        return;
      }

      // Perform one week of rest
      this.performSingleWeekRest(currentChar, roomType);

      // Continue loop after a short delay for visual feedback
      setTimeout(() => {
        if (this.isAutoResting()) {
          restLoop();
        }
      }, 100);
    };

    restLoop();
  }

  private performSingleWeekRest(character: Character, roomType: RoomType): void {
    const currentState = this.gameState.state();

    // Rest for one week
    const restResult = InnService.restOneWeek(currentState, character, roomType);

    // Update game state
    this.gameState.updateState(state => ({
      ...restResult.updatedState,
      roster: new Map(state.roster).set(character.id, restResult.updatedCharacter)
    }));

    // Update progress
    const progress = this.restProgress();
    if (progress) {
      this.restProgress.set({
        ...progress,
        weeksRested: progress.weeksRested + 1,
        totalHpRecovered: progress.totalHpRecovered + restResult.hpRecovered,
        totalGoldSpent: progress.totalGoldSpent + restResult.goldSpent,
        currentHp: restResult.updatedCharacter.hp
      });
    }
  }

  private performRest(character: Character, roomType: RoomType): void {
    const currentState = this.gameState.state();

    // Validate affordability again
    const validation = InnService.canAffordRoom(currentState, roomType);
    if (!validation.allowed) {
      this.messages.showError(validation.reason || 'Cannot afford room');
      return;
    }

    // Rest for one week
    const restResult = InnService.restOneWeek(currentState, character, roomType);

    // Update game state with rest result
    this.gameState.updateState(state => ({
      ...restResult.updatedState,
      roster: new Map(state.roster).set(character.id, restResult.updatedCharacter)
    }));

    // Update progress
    const progress = this.restProgress();
    if (progress) {
      this.restProgress.set({
        ...progress,
        weeksRested: progress.weeksRested + 1,
        totalHpRecovered: progress.totalHpRecovered + restResult.hpRecovered,
        totalGoldSpent: progress.totalGoldSpent + restResult.goldSpent,
        currentHp: restResult.updatedCharacter.hp
      });
    }

    // Check if fully healed
    if (restResult.isFullyHealed) {
      this.checkForLevelUpAfterRest(restResult.updatedCharacter);
    } else {
      // Show progress and allow continuing
      this.showRestProgressMessage(restResult.updatedCharacter, restResult.hpRecovered, restResult.goldSpent);
    }
  }

  private checkForLevelUpAfterRest(character: Character): void {
    if (LevelUpService.canLevelUp(character)) {
      this.processLevelUp(character);
    } else {
      // Fully healed, no level up
      const progress = this.restProgress();
      if (progress && progress.weeksRested > 0) {
        this.messages.showSuccess(
          `${character.name} is fully rested after ${progress.weeksRested} week(s)! ` +
          `HP: ${progress.startingHp} → ${character.hp}/${character.maxHp} | ` +
          `Gold spent: ${progress.totalGoldSpent}`
        );
      } else {
        this.messages.showSuccess(
          `${character.name} is already fully rested! HP: ${character.hp}/${character.maxHp}`
        );
      }
      this.showRoomSelection.set(false);
      this.selectedCharacterId.set(null);
      this.restProgress.set(null);
    }
  }

  private showRestProgressMessage(character: Character, hpRecovered: number, goldSpent: number): void {
    const progress = this.restProgress();
    const hpRemaining = character.maxHp - character.hp;

    let message = `Rested 1 week. HP: ${character.hp - hpRecovered} → ${character.hp} (+${hpRecovered})`;
    if (goldSpent > 0) {
      message += ` | Gold: -${goldSpent}`;
    }
    message += ` | ${hpRemaining} HP remaining to full`;

    if (progress && progress.weeksRested > 1) {
      message += ` | Total: ${progress.weeksRested} weeks, ${progress.totalGoldSpent} gp`;
    }

    this.messages.showSuccess(message);
  }

  private processLevelUp(character: Character): void {
    // Perform level up
    const levelUpResult = LevelUpService.performLevelUp(character);

    // Learn new spells if applicable
    const spellResult = SpellLearningService.learnNewSpells(
      levelUpResult.updatedCharacter,
      character.level,
      levelUpResult.updatedCharacter.level
    );

    // Update game state with leveled up character
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(character.id, spellResult.updatedCharacter)
    }));

    // Show level up display
    this.levelUpData.set({
      newLevel: levelUpResult.levelUpData.newLevel,
      hpIncrease: levelUpResult.levelUpData.hpIncrease,
      statChanges: levelUpResult.levelUpData.statChanges as Record<string, number>,
      newSpells: spellResult.newSpells.map(s => ({ id: s.id, name: s.name }))
    });

    // Close room selection
    this.showRoomSelection.set(false);
    this.restProgress.set(null);
  }

  dismissLevelUp(): void {
    this.levelUpData.set(null);
    this.selectedCharacterId.set(null);
    this.restProgress.set(null);
    this.messages.showSuccess('Level up complete!');
  }

  stopAutoRest(): void {
    this.isAutoResting.set(false);
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Handle ESC based on current state
    if (this.levelUpData()) {
      this.dismissLevelUp();
    } else if (this.isAutoResting()) {
      this.stopAutoRest();
    } else if (this.showConfirmation()) {
      this.cancelConfirmation();
    } else if (this.showRoomSelection()) {
      this.cancelRoomSelection();
    } else {
      this.navigation.returnToCastle();
    }
  }

  @HostListener('window:keydown.enter')
  handleEnter(): void {
    // Dismiss level up display on Enter
    if (this.levelUpData()) {
      this.dismissLevelUp();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    // Handle dialog shortcuts when confirmation is showing
    if (this.showConfirmation()) {
      const key = event.key.toLowerCase();

      if (key === '1') {
        event.preventDefault();
        this.confirmRest();
      } else if (key === 'a') {
        event.preventDefault();
        this.confirmAutoRest();
      }
    }
  }
}
