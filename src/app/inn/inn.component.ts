import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { InnService, RoomType } from '../../services/InnService';
import { LevelUpService } from '../../services/LevelUpService';
import { SpellLearningService } from '../../services/SpellLearningService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { CharacterListComponent } from '../../components/character-list/character-list.component';
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
  // Expose RoomType enum to template
  readonly RoomType = RoomType;

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
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly processing = signal<boolean>(false);
  readonly levelUpData = signal<LevelUpDisplayData | null>(null);

  // Party
  readonly currentParty = computed(() => this.gameState.party());
  readonly partyCharacters = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();
    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  // Roster
  readonly allCharacters = computed(() => {
    const state = this.gameState.state();
    return Array.from(state.roster.values());
  });

  readonly selectedCharacter = computed(() => {
    const charId = this.selectedCharacterId();
    if (!charId) return null;
    return this.gameState.state().roster.get(charId) || null;
  });

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.INN
    }));
  }

  handleMenuSelect(itemId: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    switch (itemId) {
      case 'rest':
        this.rest();
        break;

      case 'stables':
        this.currentView.set('stables');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  private rest(): void {
    // Prevent race condition from rapid clicks
    if (this.processing()) {
      return;
    }

    this.processing.set(true);

    try {
      const party = this.currentParty();

      // Validate party exists
      if (party.members.length === 0) {
        this.errorMessage.set('You need a party to rest');
        return;
      }

      // Calculate cost
      const cost = party.members.length * REST_COST_PER_MEMBER;
      const partyGold = party.gold || 0;

      // Check if party can afford
      if (partyGold < cost) {
        this.errorMessage.set(`Cannot afford rest. Need ${cost} gold (${REST_COST_PER_MEMBER} per member)`);
        return;
      }

      // Restore all party members to full HP and deduct gold atomically
      this.gameState.updateState(state => {
        const newRoster = new Map(state.roster);

        party.members.forEach(charId => {
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
            gold: (state.party.gold || 0) - cost // Re-read current gold from state
          }
        };
      });

      this.successMessage.set(`Party rested well! All HP restored. (-${cost} gold)`);
    } finally {
      // Always reset processing flag, even if error occurs
      this.processing.set(false);
    }
  }

  selectCharacterToRest(charId: string): void {
    this.selectedCharacterId.set(charId);
    this.currentView.set('room-select');
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  async restInRoom(roomType: RoomType): Promise<void> {
    const character = this.selectedCharacter();
    if (!character) {
      this.errorMessage.set('No character selected');
      return;
    }

    // Check affordability
    const validation = InnService.canAffordRoom(character, roomType);
    if (!validation.allowed) {
      this.errorMessage.set(validation.reason || 'Cannot afford room');
      return;
    }

    // Rest one week
    const restResult = InnService.restOneWeek(character, roomType);

    // Update character in roster
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(character.id, restResult.updatedCharacter)
    }));

    // Check for level up if fully healed
    if (restResult.isFullyHealed) {
      const updatedChar = restResult.updatedCharacter;
      if (LevelUpService.canLevelUp(updatedChar)) {
        // Perform level up
        const levelUpResult = LevelUpService.performLevelUp(updatedChar);

        // Learn new spells if caster
        const spellResult = SpellLearningService.learnNewSpells(
          levelUpResult.updatedCharacter,
          updatedChar.level,
          levelUpResult.updatedCharacter.level
        );

        // Update character with level up and spells
        this.gameState.updateState(state => ({
          ...state,
          roster: new Map(state.roster).set(character.id, spellResult.updatedCharacter)
        }));

        // Show level up screen
        this.levelUpData.set({
          newLevel: levelUpResult.levelUpData.newLevel,
          hpIncrease: levelUpResult.levelUpData.hpIncrease,
          statIncreases: levelUpResult.levelUpData.statIncreases,
          newSpells: spellResult.newSpells.map(s => ({ id: s.id, name: s.name }))
        });
        this.currentView.set('level-up');
        return;
      }
    }

    // Show rest results if no level up
    this.successMessage.set(
      `Rested for 1 week. HP: ${character.hp} → ${restResult.updatedCharacter.hp} (+${restResult.hpRecovered})`
    );

    // Continue resting if not fully healed
    if (!restResult.isFullyHealed) {
      this.currentView.set('room-select');
    } else {
      this.successMessage.set('Fully healed!');
    }
  }

  continueLevelUp(): void {
    this.levelUpData.set(null);
    this.currentView.set('room-select');
    this.successMessage.set('Level up complete! Continue resting or return to castle.');
  }

  returnToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }

  cancelView(): void {
    this.currentView.set('main');
    this.selectedCharacterId.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
