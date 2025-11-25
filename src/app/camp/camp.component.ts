import { Component, OnInit, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { NavigationService } from '../../services/NavigationService';
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../shared/components/character-card/character-card.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';
import { CharacterAction, CharacterActionEvent } from '../../types/CharacterCardTypes';
import { MenuItem } from '../shared/components/menu/menu.component';
import { moveCharacterUp, moveCharacterDown } from '../../services/PartyService';

@Component({
  selector: 'app-camp',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent
  ],
  templateUrl: './camp.component.html',
  styleUrls: ['./camp.component.scss']
})
export class CampComponent implements OnInit {
  readonly errorMessage = signal<string | null>(null);

  readonly currentParty = computed(() => this.gameState.party());

  readonly partyCharacters = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();
    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined);
  });

  readonly canEnterMaze = computed(() => {
    const party = this.currentParty();
    const state = this.gameState.state();

    if (party.members.length === 0) return false;

    return party.members.every(memberId => {
      const char = state.roster.get(memberId);
      return char?.status === CharacterStatus.OK ||
             char?.status === CharacterStatus.INJURED;
    });
  });

  readonly footerMenuItems = computed((): MenuItem[] => {
    const canEnter = this.canEnterMaze();
    return [
      {
        id: 'maze',
        label: 'Enter Maze',
        shortcut: 'M',
        enabled: canEnter
      },
      {
        id: 'castle',
        label: 'Return to Castle',
        shortcut: 'ESC',
        enabled: true
      }
    ];
  });

  constructor(
    private readonly gameState: GameStateService,
    private readonly saveService: SaveService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Update scene
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CAMP
    }));

    // Auto-save on entry
    this.saveService.saveGame(this.gameState.state(), 1);
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.returnToCastle();
  }

  returnToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }

  getActionsForCharacter(character: Character): CharacterAction[] {
    const party = this.currentParty();
    const position = party.members.indexOf(character.id);
    const canMoveUp = position > 0;
    const canMoveDown = position < party.members.length - 1;
    const canCast = this.isSpellCaster(character);

    return [
      { type: 'inspect', enabled: true },
      ...(canCast ? [{ type: 'cast', enabled: true }] : []),
      { type: 'moveUp', enabled: canMoveUp },
      { type: 'moveDown', enabled: canMoveDown }
    ];
  }

  isSpellCaster(character: Character): boolean {
    return ['MAGE', 'PRIEST', 'BISHOP', 'SAMURAI', 'LORD'].includes(character.class);
  }

  handleActionClick(event: CharacterActionEvent): void {
    switch (event.actionType) {
      case 'inspect':
        this.onInspectCharacter(event.characterId);
        break;
      case 'cast':
        this.onCastSpell(event.characterId);
        break;
      case 'moveUp':
        this.onMoveUp(event.characterId);
        break;
      case 'moveDown':
        this.onMoveDown(event.characterId);
        break;
    }
  }

  onInspectCharacter(characterId: string): void {
    this.router.navigate(['/character-inspection'], {
      queryParams: { characterId, returnTo: 'camp' }
    });
  }

  onCastSpell(characterId: string): void {
    this.router.navigate(['/spell-casting'], {
      queryParams: { characterId, returnTo: 'camp' }
    });
  }

  onMoveUp(characterId: string): void {
    const newState = moveCharacterUp(this.gameState.state(), characterId);
    this.gameState.updateState(() => newState);
  }

  onMoveDown(characterId: string): void {
    const newState = moveCharacterDown(this.gameState.state(), characterId);
    this.gameState.updateState(() => newState);
  }

  handleFooterAction(itemId: string): void {
    switch(itemId) {
      case 'maze':
        this.enterMaze();
        break;
      case 'castle':
        this.returnToCastle();
        break;
    }
  }

  enterMaze(): void {
    if (!this.canEnterMaze()) {
      this.errorMessage.set('Some party members are dead - visit Temple first');
      setTimeout(() => this.errorMessage.set(null), 3000);
      return;
    }

    // Initialize dungeon state before entering maze
    const state = this.gameState.state();
    const newState = NavigationService.enterDungeon(state, 1);
    this.gameState.updateState(() => newState);

    this.router.navigate(['/maze']);
  }
}
