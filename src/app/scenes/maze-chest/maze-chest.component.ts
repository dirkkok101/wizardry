import {
  Component,
  OnInit,
  signal,
  computed,
  HostListener
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ChestOverlayComponent,
  ChestPhase,
  ChestLetterboxType,
  ChestSummary,
  RecommendedHandler
} from '@shared/components/chest-overlay/chest-overlay.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { MessageLogComponent } from '@shared/components/message-log/message-log.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { GameStateService } from '@services/GameStateService';
import { MessageLogService } from '@services/MessageLogService';
import { LightService } from '@services/LightService';
import { CalfoSpellService } from '@services/trap/CalfoSpellService';
import { TrapInspectionService } from '@services/trap/TrapInspectionService';
import { TrapDisarmService } from '@services/trap/TrapDisarmService';
import { TrapPuzzleService } from '@services/trap/TrapPuzzleService';
import { TrapEffectService } from '@services/trap/TrapEffectService';
import { ChestService } from '@services/ChestService';
import { SpellCastingService } from '@services/SpellCastingService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { ActiveSpell } from '@models/active-spell.types';
import { DungeonState } from '@models/Dungeon';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';
import { Chest } from '@models/Chest';
import { ScrambledTrapState, TrapId } from '@models/Trap';

/**
 * MazeChestComponent - Chest interaction screen.
 *
 * This component handles:
 * 1. Chest sprite display via ChestOverlayComponent
 * 2. Character selection for chest opener
 * 3. Actions: Open, Inspect, CALFO, Disarm
 * 4. Trap identification and disarm attempts
 * 5. Navigation:
 *    - Trap triggered → /maze/chest/playback (with trap info in state)
 *    - No trap → /maze/chest/rewards
 *    - Leave → /maze
 */
@Component({
  selector: 'app-maze-chest',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    ChestOverlayComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    SceneFooterComponent
  ],
  template: `
    <div class="maze-chest">
      <!-- Title with Active Spells -->
      <app-scene-title [title]="sceneTitle()" [activeSpells]="activeSpells()"></app-scene-title>

      <!-- 3-Column Layout -->
      <div class="maze-content">
        <!-- Left Column: Positions 0, 2, 4 -->
        <div class="left-panel">
          <app-character-panel
            [characters]="leftPanelCharacters()"
            variant="compact"
            [actions]="getChestActionsForCharacter"
            [visibleActionTypes]="['open', 'inspect', 'calfo', 'disarm']"
            (actionClick)="handleChestCardAction($event)"
          />
        </div>

        <!-- Center Column: Viewport + Message Log -->
        <div class="center-panel">
          <div class="maze-viewport">
            <!-- Chest Overlay (sprite and phase display) -->
            <app-chest-overlay
              [visible]="true"
              [phase]="chestPhase()"
              [chest]="pendingChest() ?? null"
              [spriteState]="chestSprite()"
              [scrambledState]="scrambledTrapState()"
              [trapInput]="chestTrapInput()"
              [summary]="null"
              [availableCharacters]="partyCharacters()"
              [calfoEligibleCasters]="calfoEligibleCasters()"
              [selectedOpener]="chestOpener()"
              [lastMessage]="''"
              [recommendedHandler]="recommendedChestHandler()"
              [inventoryWarning]="chestInventoryWarning()"
              [letterboxType]="chestLetterboxType()"
              [inspectChance]="chestInspectChance()"
              [disarmChance]="chestDisarmChance()"
              [trapLetterboxName]="trapLetterboxName()"
              (characterSelected)="onChestCharacterSelected($event)"
              (casterSelected)="onChestCasterSelected($event)"
              (actionSelected)="onChestActionSelected($event)"
              (keyPressed)="onChestKeyPressed($event)"
            />
          </div>
          <div class="message-log-section">
            <app-message-log [messages]="messages()" />
          </div>
        </div>

        <!-- Right Column: Positions 1, 3, 5 -->
        <div class="right-panel">
          <app-character-panel
            [characters]="rightPanelCharacters()"
            variant="compact"
            [actions]="getChestActionsForCharacter"
            [visibleActionTypes]="['open', 'inspect', 'calfo', 'disarm']"
            (actionClick)="handleChestCardAction($event)"
          />
        </div>
      </div>

      <!-- Footer Menu -->
      <app-scene-footer
        [menuItems]="footerMenuItems()"
        (itemSelected)="onFooterMenuSelect($event)"
      />
    </div>
  `,
  styles: [`
    .maze-chest {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: transparent;
      color: var(--color-text-primary);
      font-family: var(--font-body);
      padding: 0.5rem;
      box-sizing: border-box;
      overflow: hidden;
    }

    :host ::ng-deep app-scene-title,
    :host ::ng-deep app-scene-footer {
      display: block;
      flex-shrink: 0;
    }

    /* 3-COLUMN LAYOUT - matches maze-exploration */
    .maze-content {
      display: grid;
      grid-template-columns: minmax(200px, var(--scene-panel-max-width)) auto minmax(200px, var(--scene-panel-max-width));
      gap: 0.5rem;
      flex: 1;
      min-height: 0;
    }

    /* 4K screens: 50% larger cards */
    @media (min-width: 2000px) {
      .maze-content {
        grid-template-columns: minmax(350px, var(--scene-panel-max-width-4k)) auto minmax(350px, var(--scene-panel-max-width-4k));
      }
    }

    /* Side panels (character columns) */
    .left-panel,
    .right-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      max-width: var(--scene-panel-max-width);
      align-self: start;
    }

    @media (min-width: 2000px) {
      .left-panel,
      .right-panel {
        max-width: var(--scene-panel-max-width-4k);
      }
    }

    /* Make character panel fill the entire side column */
    :host ::ng-deep .left-panel app-character-panel,
    :host ::ng-deep .right-panel app-character-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      min-height: 0;
    }

    /* Center column: Viewport + Message Log */
    .center-panel {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 0;
      min-width: 0;
      align-items: center;
      overflow: visible;
      padding: 0.5rem 2px;
    }

    /* Viewport container - shows canvas through transparent background */
    .maze-viewport {
      position: relative;
      flex: 1;
      min-height: 0;
      width: 100%;
      aspect-ratio: var(--scene-viewport-aspect) / 1;
      max-width: 100%;
      background: transparent;
      border: 1px solid var(--color-gold-primary);
      border-radius: 4px;
      overflow: hidden;
    }

    .message-log-section {
      width: 100%;
      height: 120px;
      min-height: 90px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 0.1rem 0.25rem;
      background: var(--color-bg-card);
      flex-shrink: 0;
      box-sizing: border-box;
    }

    :host ::ng-deep .message-log-section app-message-log {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    /* Compact height responsive adjustments */
    @media (max-height: 767px) {
      .maze-chest {
        padding: 0.25rem;
      }

      .maze-content {
        gap: 0.35rem;
      }

      .message-log-section {
        height: 80px;
        min-height: 70px;
        padding: 0.25rem;
      }
    }

    /* Very compact height */
    @media (max-height: 599px) {
      .message-log-section {
        height: 65px;
      }
    }
  `]
})
export class MazeChestComponent implements OnInit {
  // Chest state
  readonly chestPhase = signal<ChestPhase>('action_select');
  readonly chestSprite = signal<'closed' | 'open'>('closed');
  readonly chestOpener = signal<Character | null>(null);
  readonly scrambledTrapState = signal<ScrambledTrapState | null>(null);
  readonly chestTrapInput = signal<string>('');
  readonly chestInventoryWarning = signal<string | null>(null);
  readonly chestLetterboxType = signal<ChestLetterboxType>(null);
  readonly trapLetterboxName = signal<string>('');

  // Pending trap info for playback route
  readonly pendingTrapInfo = signal<{
    trapTriggered: boolean;
    trapId: TrapId | null;
    trapMessage: string | null;
    damageDealt: Map<string, number>;
    statusEffects: Map<string, CharacterStatus>;
  } | null>(null);

  // Computed from GameState
  readonly pendingChest = computed(() => this.gameState.state().pendingChest);
  readonly dungeonState = computed(() => this.gameState.state().dungeon as DungeonState | undefined);
  readonly currentLevel = computed(() => this.dungeonState()?.currentLevel ?? 1);

  // Scene title
  readonly sceneTitle = computed(() => `CHEST - LEVEL ${this.currentLevel()}`);

  // Active spells (MILWA, LOMILWA, etc.) - same pattern as maze-exploration
  readonly activeSpells = computed((): ActiveSpell[] => {
    const dungeon = this.dungeonState();
    if (!dungeon) return [];

    const spells: ActiveSpell[] = [];

    // Light spells
    if (dungeon.lightActive && dungeon.lightSpellType) {
      const viewDistance = LightService.getEffectiveViewDistance(dungeon);
      const durationText = dungeon.lightDurationRemaining !== undefined
        ? ` (${dungeon.lightDurationRemaining} steps)`
        : '';
      spells.push({
        name: dungeon.lightSpellType,
        icon: '💡',
        description: `Light (Radius: ${viewDistance})${durationText}`,
        variant: 'light'
      });
    }

    // LATUMAPIC (monster identification)
    if (dungeon.latumapicActive) {
      spells.push({
        name: 'LATUMAPIC',
        icon: '👁️',
        description: 'Monsters Identified',
        variant: 'identification'
      });
    }

    // MAPORFIC (party AC buff)
    if (dungeon.expeditionAcBuff && dungeon.expeditionAcBuff !== 0) {
      spells.push({
        name: 'MAPORFIC',
        icon: '🛡️',
        description: `Party AC ${dungeon.expeditionAcBuff > 0 ? '+' : ''}${dungeon.expeditionAcBuff}`,
        variant: 'protection'
      });
    }

    return spells;
  });

  // Message log messages
  readonly messages = computed(() => this.messageLog.messages());

  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  // Column splitting: even/odd indices (matches maze-exploration pattern)
  readonly leftPanelCharacters = computed(() => {
    return this.partyCharacters().filter((_, i) => i % 2 === 0); // Positions 0, 2, 4
  });

  readonly rightPanelCharacters = computed(() => {
    return this.partyCharacters().filter((_, i) => i % 2 === 1); // Positions 1, 3, 5
  });

  readonly calfoEligibleCasters = computed(() => {
    return this.partyCharacters().filter(c => CalfoSpellService.canCastCalfo(c));
  });

  readonly recommendedChestHandler = computed((): RecommendedHandler | null => {
    const chest = this.pendingChest();
    if (!chest) return null;
    return TrapInspectionService.getRecommendedHandler(
      this.partyCharacters(),
      chest.mazeLevel,
      TrapDisarmService.calculateDisarmChance
    );
  });

  readonly chestInspectChance = computed(() => {
    const opener = this.chestOpener();
    if (!opener) return 0;
    return TrapInspectionService.calculateInspectChance(opener);
  });

  readonly chestDisarmChance = computed(() => {
    const opener = this.chestOpener();
    const chest = this.pendingChest();
    if (!opener || !chest) return 0;
    return Math.round(TrapDisarmService.calculateDisarmChance(opener, chest.mazeLevel));
  });

  readonly footerMenuItems = computed((): MenuItem[] => {
    const phase = this.chestPhase();
    const items: MenuItem[] = [];

    if (phase === 'action_select') {
      items.push({ id: 'leave', label: 'Leave', enabled: true, shortcut: 'L' });
    } else if (phase === 'inventory_warning') {
      items.push({ id: 'confirm-open', label: 'Open Anyway', enabled: true, shortcut: 'Y' });
      items.push({ id: 'cancel', label: 'Cancel', enabled: true, shortcut: 'N' });
    } else if (phase === 'trap_input') {
      items.push({ id: 'submit-disarm', label: 'Submit', enabled: true, shortcut: 'Enter' });
      items.push({ id: 'cancel', label: 'Cancel', enabled: true, shortcut: 'Escape' });
    }

    return items;
  });

  constructor(
    private gameState: GameStateService,
    private router: Router,
    private messageLog: MessageLogService
  ) {}

  ngOnInit(): void {
    // Verify we have a pending chest
    const chest = this.pendingChest();
    if (!chest) {
      console.error('[MazeChest] No pending chest!');
      this.router.navigate(['/maze']);
      return;
    }

    console.log('[MazeChest] Chest interaction started', {
      trapped: chest.trapped,
      trapIdentified: chest.trapIdentified,
      trapDisarmed: chest.trapDisarmed
    });
  }

  /**
   * Get actions available for a character on the chest
   */
  getChestActionsForCharacter = (char: Character): CharacterAction[] => {
    const actions: CharacterAction[] = [];
    const chest = this.pendingChest();
    if (!chest) return actions;

    const canAct = char.status !== CharacterStatus.DEAD && char.hp > 0;

    // Open action - always available for living characters
    actions.push({
      type: 'open',
      label: 'Open',
      enabled: canAct
    });

    // Inspect action - only if trap not yet identified
    if (!chest.trapIdentified) {
      actions.push({
        type: 'inspect',
        label: 'Inspect',
        enabled: canAct
      });
    }

    // CALFO action - only for casters with spell points
    if (CalfoSpellService.canCastCalfo(char)) {
      actions.push({
        type: 'calfo',
        label: 'Calfo',
        enabled: canAct
      });
    }

    // Disarm action - only if trap identified and not disarmed
    if (chest.trapIdentified && chest.trapped && !chest.trapDisarmed) {
      actions.push({
        type: 'disarm',
        label: 'Disarm',
        enabled: canAct
      });
    }

    return actions;
  };

  /**
   * Handle character action on chest
   */
  handleChestCardAction(event: CharacterActionEvent): void {
    const character = this.partyCharacters().find(c => c.id === event.characterId);
    if (!character) return;

    switch (event.actionType) {
      case 'open':
        this.handleChestOpenWith(character);
        break;
      case 'inspect':
        this.handleChestInspectWith(character);
        break;
      case 'calfo':
        this.handleChestCalfoWith(character);
        break;
      case 'disarm':
        this.handleChestDisarmWith(character);
        break;
    }
  }

  /**
   * Handle Open chest with specific character
   */
  private handleChestOpenWith(character: Character): void {
    const chest = this.pendingChest();
    if (!chest) return;

    this.chestOpener.set(character);

    // Check inventory space
    const recipient = ChestService.selectRecipient(this.partyCharacters());
    if (recipient) {
      const warning = ChestService.checkInventorySpace(recipient, chest);
      if (warning) {
        this.chestInventoryWarning.set(warning.warning);
        this.chestPhase.set('inventory_warning');
        return;
      }
    }

    this.openChest();
  }

  /**
   * Handle Inspect trap with specific character
   */
  private handleChestInspectWith(character: Character): void {
    const chest = this.pendingChest();
    if (!chest || chest.trapIdentified) {
      this.setChestMessage('The trap has already been identified.');
      return;
    }

    this.chestOpener.set(character);

    const result = TrapInspectionService.attemptInspection(character, chest);

    if (result.triggered) {
      this.setChestMessage(`${character.name} accidentally triggered the trap!`);
      this.triggerChestTrap(chest, character);
      return;
    }

    if (result.trapIdentified) {
      // Update pending chest in game state
      this.gameState.updateState(state => ({
        ...state,
        pendingChest: state.pendingChest ? {
          ...state.pendingChest,
          trapIdentified: true,
          trapId: result.trapIdentified
        } : undefined
      }));

      const scrambledState = TrapPuzzleService.createScrambledState(result.trapIdentified);
      this.scrambledTrapState.set(scrambledState);
      this.setChestMessage(`${character.name} found a trap!`);
    } else {
      this.setChestMessage(`${character.name} didn't find anything suspicious.`);
    }
  }

  /**
   * Handle CALFO spell with specific character
   */
  private handleChestCalfoWith(character: Character): void {
    if (!CalfoSpellService.canCastCalfo(character)) {
      this.setChestMessage(`${character.name} cannot cast CALFO.`);
      return;
    }

    const chest = this.pendingChest();
    if (!chest) return;

    this.chestOpener.set(character);

    // Deduct spell point
    const updatedCaster = SpellCastingService.deductSpellPoints(character, 'calfo');
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(character.id, updatedCaster)
    }));

    if (!chest.trapIdentified) {
      const result = CalfoSpellService.castCalfo(character, chest);

      if (result.trapIdentified) {
        this.gameState.updateState(state => ({
          ...state,
          pendingChest: state.pendingChest ? {
            ...state.pendingChest,
            trapIdentified: true,
            trapId: result.trapIdentified
          } : undefined
        }));

        const scrambledState = TrapPuzzleService.createScrambledState(result.trapIdentified);
        const fullyRevealedState = TrapPuzzleService.performCalfo(character, scrambledState);
        this.scrambledTrapState.set(fullyRevealedState);
        this.setChestMessage(`${character.name} casts CALFO! A trap is revealed!`);
      } else {
        this.gameState.updateState(state => ({
          ...state,
          pendingChest: state.pendingChest ? {
            ...state.pendingChest,
            trapIdentified: true
          } : undefined
        }));
        this.setChestMessage(`${character.name} casts CALFO. No trap detected.`);
      }
    } else {
      const currentState = this.scrambledTrapState();
      if (currentState) {
        const fullyRevealedState = TrapPuzzleService.performCalfo(character, currentState);
        this.scrambledTrapState.set(fullyRevealedState);
        this.setChestMessage(`${character.name} casts CALFO! All letters revealed!`);
      }
    }
  }

  /**
   * Handle Disarm trap with specific character
   */
  private handleChestDisarmWith(character: Character): void {
    const chest = this.pendingChest();
    if (!chest || !chest.trapIdentified || !chest.trapped || chest.trapDisarmed) {
      return;
    }

    this.chestOpener.set(character);
    this.chestPhase.set('trap_input');
    this.chestTrapInput.set('');
    this.setChestMessage(`${character.name} prepares to disarm. Enter the trap name.`);
  }

  /**
   * Open the chest
   */
  private openChest(): void {
    const chest = this.pendingChest();
    const opener = this.chestOpener();
    if (!chest || !opener) return;

    this.chestInventoryWarning.set(null);

    // Check if trapped and not disarmed
    if (chest.trapped && !chest.trapDisarmed) {
      this.triggerChestTrap(chest, opener);
      return;
    }

    // Safe to open - navigate to rewards
    this.chestSprite.set('open');
    this.chestPhase.set('opening');

    setTimeout(() => {
      this.router.navigate(['/maze/chest/rewards']);
    }, 600);
  }

  /**
   * Trigger trap effects and navigate to playback
   */
  private async triggerChestTrap(chest: Chest, opener: Character): Promise<void> {
    const trapId = chest.trapId;
    if (!trapId) return;

    const result = TrapEffectService.applyTrapEffects(
      trapId,
      opener,
      this.partyCharacters()
    );

    console.log('[MazeChest] Trap triggered:', {
      trapName: result.trapName,
      damageDealt: result.damageDealt.size,
      statusApplied: result.statusApplied.size,
      specialEffect: result.specialEffect
    });

    // Store trap info in game state for playback component
    this.gameState.updateState(state => ({
      ...state,
      // Store trap result temporarily - playback component will read and clear
      pendingTrapResult: {
        trapId,
        trapName: result.trapName,
        message: result.message,
        damageDealt: result.damageDealt,
        statusApplied: result.statusApplied,
        specialEffect: result.specialEffect,
        openerId: opener.id
      }
    }));

    // Show letterbox briefly
    this.chestPhase.set('trap_triggered');
    this.trapLetterboxName.set(result.trapName);
    this.chestLetterboxType.set('trap_triggered');

    await this.delay(1000);

    // Navigate to playback for trap animation
    this.router.navigate(['/maze/chest/playback']);
  }

  /**
   * Submit disarm attempt
   */
  private submitDisarmAttempt(): void {
    const chest = this.pendingChest();
    const opener = this.chestOpener();
    if (!chest || !opener || !chest.trapId) return;

    const inputName = this.chestTrapInput().toUpperCase().trim();
    const result = TrapDisarmService.attemptDisarm(opener, chest, inputName);

    if (result.triggered) {
      this.setChestMessage(`${opener.name} triggered the trap while trying to disarm it!`);
      this.triggerChestTrap(chest, opener);
      return;
    }

    if (result.success) {
      this.gameState.updateState(state => ({
        ...state,
        pendingChest: state.pendingChest ? {
          ...state.pendingChest,
          trapDisarmed: true
        } : undefined
      }));
      this.setChestMessage(`${opener.name} successfully disarmed the trap!`);
      this.scrambledTrapState.set(null);  // Clear puzzle - show "safe to open" status
      this.chestPhase.set('action_select');
      this.chestTrapInput.set('');
    } else {
      this.setChestMessage(`${opener.name} failed to disarm. Try again?`);
      this.chestTrapInput.set('');
    }
  }

  /**
   * Handle footer menu selection
   */
  onFooterMenuSelect(itemId: string): void {
    switch (itemId) {
      case 'leave':
        this.leaveChest();
        break;
      case 'confirm-open':
        this.openChest();
        break;
      case 'cancel':
        this.chestPhase.set('action_select');
        this.chestInventoryWarning.set(null);
        this.chestTrapInput.set('');
        break;
      case 'submit-disarm':
        this.submitDisarmAttempt();
        break;
    }
  }

  /**
   * Leave chest without opening
   */
  private leaveChest(): void {
    // Clear pending chest
    this.gameState.updateState(state => ({
      ...state,
      pendingChest: undefined
    }));

    this.router.navigate(['/maze']);
  }

  // Event handlers for ChestOverlayComponent
  onChestCharacterSelected(index: number): void {
    const char = this.partyCharacters()[index];
    if (char) {
      this.chestOpener.set(char);
    }
  }

  onChestCasterSelected(index: number): void {
    const caster = this.calfoEligibleCasters()[index];
    if (caster) {
      this.handleChestCalfoWith(caster);
    }
  }

  onChestActionSelected(action: string): void {
    switch (action) {
      case 'leave':
        this.leaveChest();
        break;
    }
  }

  onChestKeyPressed(key: string): void {
    if (this.chestPhase() === 'trap_input') {
      if (key === 'Backspace') {
        this.chestTrapInput.update(v => v.slice(0, -1));
      } else if (key === 'Enter') {
        this.submitDisarmAttempt();
      } else if (key.length === 1 && /[A-Z ]/i.test(key)) {
        this.chestTrapInput.update(v => v + key.toUpperCase());
      }
    }
  }

  /**
   * Global keyboard handler
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const key = event.key.toUpperCase();
    const phase = this.chestPhase();

    if (key === 'ESCAPE') {
      if (phase === 'action_select') {
        this.leaveChest();
      } else {
        this.chestPhase.set('action_select');
        this.chestInventoryWarning.set(null);
        this.chestTrapInput.set('');
      }
      return;
    }

    if (phase === 'inventory_warning') {
      if (key === 'Y') {
        this.openChest();
      } else if (key === 'N') {
        this.chestPhase.set('action_select');
        this.chestInventoryWarning.set(null);
      }
      return;
    }

    if (phase === 'trap_input') {
      if (key === 'BACKSPACE') {
        this.chestTrapInput.update(v => v.slice(0, -1));
        event.preventDefault();
      } else if (key === 'ENTER') {
        this.submitDisarmAttempt();
      } else if (key.length === 1 && /[A-Z ]/.test(key)) {
        this.chestTrapInput.update(v => v + key);
        event.preventDefault();
      }
    }
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add message to the message log
   */
  private setChestMessage(message: string): void {
    this.messageLog.addMessage(message);
  }
}
