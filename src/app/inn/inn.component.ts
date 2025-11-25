import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/GameStateService';
import { InnService, RoomType } from '../../services/InnService';
import { LevelUpService } from '../../services/LevelUpService';
import { SpellLearningService } from '../../services/SpellLearningService';
import { SceneNavigationService } from '../../services/SceneNavigationService';
import { MessageService } from '../../services/MessageService';
import { GameStateQueries } from '../../utils/GameStateQueries';
import { MenuComponent, MenuItem } from '../shared/components/menu/menu.component';
import { CharacterListComponent } from '../shared/components/character-list/character-list.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';

type InnView = 'main' | 'stables' | 'character-select' | 'room-select' | 'resting' | 'level-up';

const REST_COST_PER_MEMBER = 10;

interface LevelUpDisplayData {
  newLevel: number
  hpIncrease: number
  statIncreases: Record<string, number>
  newSpells: Array<{ id: string; name: string }>
}

/**
 * Inn Component (Adventurer's Inn)
 *
 * Character rest and level-up:
 * - Select character to rest
 * - Choose room type (cost/healing rate)
 * - Rest loop: heal HP, deduct gold
 * - Level up when HP = max and XP sufficient
 */
@Component({
  selector: 'app-inn',
  standalone: true,
  imports: [CommonModule, MenuComponent, CharacterListComponent],
  templateUrl: './inn.component.html',
  styleUrls: ['./inn.component.scss']
})
export class InnComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  readonly messages = inject(MessageService);

  // Expose RoomType enum and Object to template
  readonly RoomType = RoomType;
  readonly Object = Object;

  readonly menuItems: MenuItem[] = [
    {
      id: 'rest',
      label: 'REST (10 GOLD/MEMBER)',
      enabled: true,
      shortcut: 'R'
    },
    {
      id: 'stables',
      label: 'STABLES',
      enabled: true,
      shortcut: 'S'
    },
    {
      id: 'castle',
      label: 'RETURN TO CASTLE',
      enabled: true,
      shortcut: 'C'
    }
  ];

  readonly roomMenuItems: MenuItem[] = [
    {
      id: RoomType.STABLES,
      label: 'STABLES (0 gp, 0 HP/week)',
      enabled: true,
      shortcut: 'S'
    },
    {
      id: RoomType.BARRACKS,
      label: 'BARRACKS (10 gp, 1 HP/week)',
      enabled: true,
      shortcut: 'B'
    },
    {
      id: RoomType.DOUBLE,
      label: 'DOUBLE (50 gp, 3 HP/week)',
      enabled: true,
      shortcut: 'D'
    },
    {
      id: RoomType.PRIVATE,
      label: 'PRIVATE (200 gp, 7 HP/week)',
      enabled: true,
      shortcut: 'P'
    },
    {
      id: RoomType.ROYAL_SUITE,
      label: 'ROYAL SUITE (500 gp, 10 HP/week)',
      enabled: true,
      shortcut: 'R'
    }
  ];

  // View state
  readonly currentView = signal<InnView>('main');
  readonly selectedCharacterId = signal<string | null>(null);
  readonly processing = signal<boolean>(false);
  readonly levelUpData = signal<LevelUpDisplayData | null>(null);

  // Party characters using GameStateQueries
  readonly partyCharacters = computed(() =>
    GameStateQueries.partyCharacters(this.gameState.state())
  );

  // Party gold using GameStateQueries
  readonly partyGold = computed(() =>
    GameStateQueries.partyGold(this.gameState.state())
  );

  // All roster characters using GameStateQueries
  readonly allCharacters = computed(() =>
    GameStateQueries.allCharacters(this.gameState.state())
  );

  // Selected character using GameStateQueries
  readonly selectedCharacter = computed(() => {
    const charId = this.selectedCharacterId();
    if (!charId) return null;
    return GameStateQueries.getCharacter(this.gameState.state(), charId) || null;
  });

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.INN
    }));
  }

  handleMenuSelect(itemId: string): void {
    this.messages.clear();

    switch (itemId) {
      case 'rest':
        this.rest();
        break;

      case 'stables':
        this.currentView.set('stables');
        break;

      case 'castle':
        this.navigation.returnToCastle();
        break;
    }
  }

  private rest(): void {
    if (this.processing()) {
      return;
    }

    this.processing.set(true);

    try {
      const partyMembers = this.partyCharacters();

      if (partyMembers.length === 0) {
        this.messages.showError('You need a party to rest');
        return;
      }

      const cost = partyMembers.length * REST_COST_PER_MEMBER;
      const gold = this.partyGold();

      if (gold < cost) {
        this.messages.showError(`Cannot afford rest. Need ${cost} gold (${REST_COST_PER_MEMBER} per member)`);
        return;
      }

      this.gameState.updateState(state => {
        const newRoster = new Map(state.roster);

        state.party.members.forEach(charId => {
          const char = newRoster.get(charId);
          if (char) {
            newRoster.set(charId, {
              ...char,
              hp: char.maxHp
            });
          }
        });

        return {
          ...state,
          roster: newRoster,
          party: {
            ...state.party,
            gold: (state.party.gold || 0) - cost
          }
        };
      });

      this.messages.showSuccess(`Party rested well! All HP restored. (-${cost} gold)`);
    } finally {
      this.processing.set(false);
    }
  }

  selectCharacterToRest(charId: string): void {
    this.selectedCharacterId.set(charId);
    this.currentView.set('room-select');
    this.messages.clear();
  }

  async restInRoom(roomType: RoomType): Promise<void> {
    const character = this.selectedCharacter();
    if (!character) {
      this.messages.showError('No character selected');
      return;
    }

    const currentState = this.gameState.state();

    const validation = InnService.canAffordRoom(currentState, roomType);
    if (!validation.allowed) {
      this.messages.showError(validation.reason || 'Cannot afford room');
      return;
    }

    const restResult = InnService.restOneWeek(currentState, character, roomType);

    this.gameState.updateState(state => ({
      ...restResult.updatedState,
      roster: new Map(state.roster).set(character.id, restResult.updatedCharacter)
    }));

    if (restResult.isFullyHealed) {
      const updatedChar = restResult.updatedCharacter;
      if (LevelUpService.canLevelUp(updatedChar)) {
        const levelUpResult = LevelUpService.performLevelUp(updatedChar);

        const spellResult = SpellLearningService.learnNewSpells(
          levelUpResult.updatedCharacter,
          updatedChar.level,
          levelUpResult.updatedCharacter.level
        );

        this.gameState.updateState(state => ({
          ...state,
          roster: new Map(state.roster).set(character.id, spellResult.updatedCharacter)
        }));

        this.levelUpData.set({
          newLevel: levelUpResult.levelUpData.newLevel,
          hpIncrease: levelUpResult.levelUpData.hpIncrease,
          statIncreases: levelUpResult.levelUpData.statIncreases as Record<string, number>,
          newSpells: spellResult.newSpells.map(s => ({ id: s.id, name: s.name }))
        });
        this.currentView.set('level-up');
        return;
      }
    }

    this.messages.showSuccess(
      `Rested for 1 week. HP: ${character.hp} → ${restResult.updatedCharacter.hp} (+${restResult.hpRecovered})`
    );

    if (!restResult.isFullyHealed) {
      this.currentView.set('room-select');
    } else {
      this.messages.showSuccess('Fully healed!');
    }
  }

  continueLevelUp(): void {
    this.levelUpData.set(null);
    this.currentView.set('room-select');
    this.messages.showSuccess('Level up complete! Continue resting or return to castle.');
  }

  returnToCastle(): void {
    this.navigation.returnToCastle();
  }

  cancelView(): void {
    this.currentView.set('main');
    this.selectedCharacterId.set(null);
    this.messages.clear();
  }
}
