import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { MessageLogComponent } from '../../components/message-log/message-log.component';
import { ActiveSpellsComponent } from '../../components/active-spells/active-spells.component';
import { GameStateService } from '../../services/GameStateService';
import { NavigationService } from '../../services/NavigationService';
import { DungeonService } from '../../services/DungeonService';
import { EncounterService } from '../../services/EncounterService';
import { SceneType } from '../../types/SceneType';
import { MenuItem } from '../../components/menu/menu.component';
import { ActiveSpell } from '../../types/active-spell.types';
import { GameState } from '../../types/GameState';

@Component({
  selector: 'app-maze',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent,
    MessageLogComponent,
    ActiveSpellsComponent
  ],
  templateUrl: './maze.component.html',
  styleUrls: ['./maze.component.scss']
})
export class MazeComponent implements OnInit {
  // Local signals
  readonly messages = signal<string[]>([]);
  readonly errorMessage = signal<string | null>(null);

  // Computed signals from GameStateService
  readonly dungeonState = computed(() => this.gameState.state().dungeon);
  readonly position = computed(() => this.dungeonState()?.position);
  readonly currentLevel = computed(() => this.dungeonState()?.currentLevel ?? 1);
  readonly party = computed(() => this.gameState.state().party);
  readonly partyCharacters = computed(() => {
    const roster = this.gameState.state().roster;
    return this.party().members.map(id => roster.get(id)!).filter(c => c);
  });

  // Active spells (computed from dungeon state)
  readonly activeSpells = computed((): ActiveSpell[] => {
    const spells: ActiveSpell[] = [];
    const dungeon = this.dungeonState();

    if (dungeon?.lightActive) {
      spells.push({
        name: 'MILWA',
        icon: '💡',
        description: `Light (Radius: ${dungeon.lightRadius})`
      });
    }

    return spells;
  });

  // Scene title
  readonly sceneTitle = computed(() => `MAZE - LEVEL ${this.currentLevel()}`);

  // Footer menu
  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'forward', label: 'Forward (W)', shortcut: 'W', enabled: true },
    { id: 'back', label: 'Backward (S)', shortcut: 'S', enabled: true },
    { id: 'left', label: 'Turn Left (A)', shortcut: 'A', enabled: true },
    { id: 'right', label: 'Turn Right (D)', shortcut: 'D', enabled: true },
    { id: 'strafe_left', label: 'Strafe Left (Q)', shortcut: 'Q', enabled: true },
    { id: 'strafe_right', label: 'Strafe Right (E)', shortcut: 'E', enabled: true },
    { id: 'camp', label: 'Return to Camp (ESC)', shortcut: 'ESC', enabled: true }
  ]);

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set scene type
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.MAZE
    }));

    // Validate dungeon state
    const dungeon = this.dungeonState();
    if (!dungeon) {
      this.errorMessage.set('Dungeon not initialized. Returning to camp...');
      setTimeout(() => this.router.navigate(['/camp']), 2000);
      return;
    }

    // Add welcome message
    this.addMessage(`Entering Level ${this.currentLevel()}...`);
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.router.navigate(['/camp']);
  }

  handleFooterAction(action: string): void {
    // Will be implemented in later tasks
  }

  private addMessage(message: string): void {
    this.messages.update(msgs => {
      const newMsgs = [...msgs, message];
      return newMsgs.slice(-10); // Keep last 10 messages
    });
  }
}
