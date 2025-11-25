import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/GameStateService';
import { InnService, RoomType } from '../../services/InnService';
import { LevelUpService } from '../../services/LevelUpService';
import { SpellLearningService } from '../../services/SpellLearningService';
import { SceneNavigationService } from '../../services/SceneNavigationService';
import { MessageService } from '../../services/MessageService';
import { GameStateQueries } from '../../utils/GameStateQueries';
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { PartyCharacterGridComponent } from '../shared/components/party-character-grid/party-character-grid.component';
import { ConfirmationDialogComponent } from '../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MenuComponent, MenuItem } from '../shared/components/menu/menu.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';

interface LevelUpDisplayData {
  newLevel: number;
  hpIncrease: number;
  statIncreases: Record<string, number>;
  newSpells: Array<{ id: string; name: string }>;
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
 * - Stables: 0 gp/week, 0 HP/week
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
    MenuComponent
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

  // Characters that can rest (not dead/ashes/lost)
  readonly restableCharacters = computed(() => {
    return this.partyCharacters().filter(c =>
      c.status !== CharacterStatus.DEAD &&
      c.status !== CharacterStatus.ASHES &&
      c.status !== CharacterStatus.LOST
    );
  });

  // Room menu items (static)
  readonly roomMenuItems: MenuItem[] = [
    {
      id: RoomType.STABLES,
      label: `STABLES (${InnService.getRoomCost(RoomType.STABLES)} gp, ${InnService.getRoomHealRate(RoomType.STABLES)} HP/week)`,
      enabled: true,
      shortcut: 'S'
    },
    {
      id: RoomType.BARRACKS,
      label: `BARRACKS (${InnService.getRoomCost(RoomType.BARRACKS)} gp, ${InnService.getRoomHealRate(RoomType.BARRACKS)} HP/week)`,
      enabled: true,
      shortcut: 'B'
    },
    {
      id: RoomType.DOUBLE,
      label: `DOUBLE (${InnService.getRoomCost(RoomType.DOUBLE)} gp, ${InnService.getRoomHealRate(RoomType.DOUBLE)} HP/week)`,
      enabled: true,
      shortcut: 'D'
    },
    {
      id: RoomType.PRIVATE,
      label: `PRIVATE (${InnService.getRoomCost(RoomType.PRIVATE)} gp, ${InnService.getRoomHealRate(RoomType.PRIVATE)} HP/week)`,
      enabled: true,
      shortcut: 'P'
    },
    {
      id: RoomType.ROYAL_SUITE,
      label: `ROYAL SUITE (${InnService.getRoomCost(RoomType.ROYAL_SUITE)} gp, ${InnService.getRoomHealRate(RoomType.ROYAL_SUITE)} HP/week)`,
      enabled: true,
      shortcut: 'R'
    },
    {
      id: 'back',
      label: 'BACK (ESC)',
      enabled: true,
      shortcut: 'ESC'
    }
  ];

  // Footer menu items
  readonly footerMenuItems = computed((): MenuItem[] => [
    {
      id: 'return',
      label: 'Return to Castle (ESC)',
      shortcut: 'ESC',
      enabled: true
    }
  ]);

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
    this.messages.clear();
  }

  handleRoomSelect(roomId: string): void {
    if (roomId === 'back') {
      this.cancelRoomSelection();
      return;
    }

    const roomType = roomId as RoomType;
    const character = this.selectedCharacter();
    if (!character) {
      this.messages.showError('No character selected');
      return;
    }

    // Validate affordability
    const validation = InnService.canAffordRoom(this.gameState.state(), roomType);
    if (!validation.allowed) {
      this.messages.showError(validation.reason || 'Cannot afford room');
      return;
    }

    // Show confirmation
    const cost = InnService.getRoomCost(roomType);
    const healRate = InnService.getRoomHealRate(roomType);
    this.pendingRoomType.set(roomType);
    this.confirmationMessage.set(
      `Rest ${character.name} in ${roomType.toLowerCase().replace('_', ' ')}?\n` +
      `Cost: ${cost} gp/week | Heal: ${healRate} HP/week`
    );
    this.showConfirmation.set(true);
  }

  cancelRoomSelection(): void {
    this.showRoomSelection.set(false);
    this.selectedCharacterId.set(null);
    this.pendingRoomType.set(null);
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

    // Perform the rest
    this.performRest(character, roomType);
    this.cancelConfirmation();
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

    // Check if fully healed
    if (restResult.isFullyHealed) {
      // Check for level up
      const updatedChar = restResult.updatedCharacter;
      if (LevelUpService.canLevelUp(updatedChar)) {
        this.processLevelUp(updatedChar);
        return;
      }

      // Fully healed, no level up
      this.messages.showSuccess(
        `${character.name} is fully rested! HP: ${updatedChar.hp}/${updatedChar.maxHp}`
      );
      this.showRoomSelection.set(false);
      this.selectedCharacterId.set(null);
    } else {
      // Show progress and allow continuing
      this.messages.showSuccess(
        `Rested 1 week. HP: ${character.hp} → ${restResult.updatedCharacter.hp} (+${restResult.hpRecovered}) | ` +
        `Gold spent: ${restResult.goldSpent}`
      );
    }
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
      statIncreases: levelUpResult.levelUpData.statIncreases as Record<string, number>,
      newSpells: spellResult.newSpells.map(s => ({ id: s.id, name: s.name }))
    });

    // Close room selection
    this.showRoomSelection.set(false);
  }

  dismissLevelUp(): void {
    this.levelUpData.set(null);
    this.selectedCharacterId.set(null);
    this.messages.showSuccess('Level up complete!');
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Handle ESC based on current state
    if (this.levelUpData()) {
      this.dismissLevelUp();
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
}
