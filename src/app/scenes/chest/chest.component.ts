import { Component, OnInit, OnDestroy, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { LoggerService } from '@services/LoggerService';
import { TrapService } from '@services/TrapService';
import { ChestService } from '@services/ChestService';
import { RandomService } from '@services/RandomService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { SceneType } from '@models/SceneType';
import { Chest, TreasureDistributionResult } from '@models/Chest';
import { TrapType, TrapInspectionResult, TrapDisarmResult, TrapTriggerResult } from '@models/Trap';

/**
 * Scene modes for the chest interaction state machine
 */
type ChestMode =
  | 'CHARACTER_SELECT'  // Initial: pick who handles chest
  | 'ACTION_SELECT'     // Main menu: O/I/C/D/L
  | 'CASTER_SELECT'     // Choosing CALFO caster
  | 'TRAP_NAME_INPUT'   // Entering trap name for disarm
  | 'INVENTORY_WARNING' // Confirmation when inventory could overflow
  | 'RESULT_DISPLAY';   // Showing trap/treasure outcome

/**
 * Chest Component
 *
 * Treasure chest interaction interface with trap detection, disarming, and looting.
 * Appears after combat victories or when finding treasure during exploration.
 *
 * Actions:
 * - (O)pen: Open chest directly (risky if trapped)
 * - (I)nspect: Thief/Ninja trap detection (AGI-based)
 * - (C)ALFO: Priest spell for trap identification (95% success)
 * - (D)isarm: Attempt to disarm identified trap
 * - (L)eave: Abandon chest and return to maze
 */
@Component({
  selector: 'app-chest',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent
  ],
  templateUrl: './chest.component.html',
  styleUrls: ['./chest.component.scss']
})
export class ChestComponent implements OnInit, OnDestroy {
  private readonly gameState = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  private readonly logger = inject(LoggerService);
  readonly messages = inject(MessageService);

  // Current mode in the state machine
  readonly mode = signal<ChestMode>('CHARACTER_SELECT');

  // The chest being interacted with
  readonly chest = signal<Chest | null>(null);

  // Selected opener (who handles the chest)
  readonly selectedOpener = signal<Character | null>(null);

  // Selected CALFO caster (for spell casting)
  readonly selectedCaster = signal<Character | null>(null);

  // Trap name input for disarm attempt
  readonly trapNameInput = signal<string>('');

  // Last action result message
  readonly lastActionMessage = signal<string>('');

  // Inventory warning data
  readonly inventoryWarning = signal<string | null>(null);

  // Party members (resolved Character objects)
  readonly partyMembers = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  // Characters who can act (not dead/paralyzed)
  readonly availableCharacters = computed(() => {
    return this.partyMembers().filter(c =>
      c.status !== CharacterStatus.DEAD &&
      c.status !== CharacterStatus.ASHES &&
      c.status !== CharacterStatus.LOST &&
      c.status !== CharacterStatus.PARALYZED &&
      c.status !== CharacterStatus.STONED
    );
  });

  // Characters who can cast CALFO
  readonly calfoEligibleCasters = computed(() => {
    return this.partyMembers().filter(c => TrapService.canCastCalfo(c));
  });

  // Get recommended handler for trap work
  readonly recommendedHandler = computed(() => {
    const chest = this.chest();
    if (!chest) return null;
    return TrapService.getRecommendedHandler(this.partyMembers(), chest.mazeLevel);
  });

  // Dynamic footer menu based on current state
  readonly footerMenuItems = computed((): MenuItem[] => {
    const chest = this.chest();
    const mode = this.mode();
    const opener = this.selectedOpener();

    // In character select mode, just show number hints
    if (mode === 'CHARACTER_SELECT') {
      return [
        { id: 'hint', label: 'Select character (1-6)', shortcut: '1-6', enabled: false }
      ];
    }

    // In caster select mode
    if (mode === 'CASTER_SELECT') {
      return [
        { id: 'cancel', label: 'Cancel', shortcut: 'ESC', enabled: true }
      ];
    }

    // In trap name input mode
    if (mode === 'TRAP_NAME_INPUT') {
      return [
        { id: 'cancel', label: 'Cancel', shortcut: 'ESC', enabled: true }
      ];
    }

    // In inventory warning mode
    if (mode === 'INVENTORY_WARNING') {
      return [
        { id: 'confirm-open', label: 'Open Anyway', shortcut: 'Y', enabled: true },
        { id: 'cancel', label: 'Cancel', shortcut: 'N', enabled: true }
      ];
    }

    // In result display mode
    if (mode === 'RESULT_DISPLAY') {
      return [
        { id: 'continue', label: 'Continue', shortcut: 'ENTER', enabled: true }
      ];
    }

    // ACTION_SELECT mode - main menu
    if (!chest || !opener) {
      return [
        { id: 'leave', label: 'Leave', shortcut: 'L', enabled: true }
      ];
    }

    const items: MenuItem[] = [];

    // Open - always available
    items.push({ id: 'open', label: 'Open', shortcut: 'O', enabled: true });

    // Inspect - only if trap not yet identified
    if (!chest.trapIdentified) {
      items.push({ id: 'inspect', label: 'Inspect', shortcut: 'I', enabled: true });
    }

    // CALFO - only if available caster and trap not identified
    if (!chest.trapIdentified && this.calfoEligibleCasters().length > 0) {
      items.push({ id: 'calfo', label: 'CALFO', shortcut: 'C', enabled: true });
    }

    // Disarm - only if trap identified and not yet disarmed
    if (chest.trapIdentified && chest.trapped && !chest.trapDisarmed) {
      items.push({ id: 'disarm', label: 'Disarm', shortcut: 'D', enabled: true });
    }

    // Leave - always available
    items.push({ id: 'leave', label: 'Leave', shortcut: 'L', enabled: true });

    return items;
  });

  ngOnInit(): void {
    this.messages.clear();
    this.logger.debug('[Chest] Initializing chest scene');

    // Get chest from game state (would be set by combat/exploration)
    // For now, create a test chest
    this.initializeChest();

    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CHEST
    }));
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Initialize the chest - in production this would come from combat/exploration
   */
  private initializeChest(): void {
    // TODO: Get chest from game state (set by combat victory or exploration)
    // For now, create a test chest for development
    const state = this.gameState.state();

    // Default position if not in dungeon
    const position = state.dungeon?.position ?? { x: 0, y: 0, facing: 'NORTH' as const };
    const mazeLevel = state.dungeon?.currentLevel ?? 1;

    const chest = ChestService.generateChest(
      3,  // Reward tier
      mazeLevel,
      { x: position.x, y: position.y, facing: position.facing },
      'combat_victory'
    );

    this.chest.set(chest);
    this.logger.debug('[Chest] Generated chest:', chest);
  }

  /**
   * Handle keyboard input
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    const key = event.key.toUpperCase();
    const mode = this.mode();

    // Handle ESC for cancel/leave
    if (key === 'ESCAPE') {
      this.handleCancel();
      return;
    }

    // Handle Enter for continue
    if (key === 'ENTER' && mode === 'RESULT_DISPLAY') {
      this.handleContinue();
      return;
    }

    // Character select mode - number keys
    if (mode === 'CHARACTER_SELECT') {
      const num = parseInt(key);
      if (num >= 1 && num <= 6) {
        this.selectCharacter(num - 1);
      }
      return;
    }

    // Caster select mode - number keys
    if (mode === 'CASTER_SELECT') {
      const num = parseInt(key);
      if (num >= 1 && num <= this.calfoEligibleCasters().length) {
        this.selectCaster(num - 1);
      }
      return;
    }

    // Trap name input mode - letter keys
    if (mode === 'TRAP_NAME_INPUT') {
      if (key === 'BACKSPACE') {
        this.trapNameInput.update(v => v.slice(0, -1));
      } else if (key === 'ENTER') {
        this.submitTrapName();
      } else if (key.length === 1 && /[A-Z ]/.test(key)) {
        this.trapNameInput.update(v => v + key);
      }
      return;
    }

    // Inventory warning mode - Y/N
    if (mode === 'INVENTORY_WARNING') {
      if (key === 'Y') {
        this.openChest(true);
      } else if (key === 'N') {
        this.mode.set('ACTION_SELECT');
        this.inventoryWarning.set(null);
      }
      return;
    }

    // Action select mode - action shortcuts
    if (mode === 'ACTION_SELECT') {
      switch (key) {
        case 'O': this.handleOpen(); break;
        case 'I': this.handleInspect(); break;
        case 'C': this.handleCalfo(); break;
        case 'D': this.handleDisarm(); break;
        case 'L': this.handleLeave(); break;
      }
    }
  }

  /**
   * Handle footer menu item selection
   */
  handleFooterAction(itemId: string): void {
    switch (itemId) {
      case 'open': this.handleOpen(); break;
      case 'inspect': this.handleInspect(); break;
      case 'calfo': this.handleCalfo(); break;
      case 'disarm': this.handleDisarm(); break;
      case 'leave': this.handleLeave(); break;
      case 'cancel': this.handleCancel(); break;
      case 'continue': this.handleContinue(); break;
      case 'confirm-open': this.openChest(true); break;
    }
  }

  /**
   * Select a character to handle the chest
   */
  selectCharacter(index: number): void {
    const characters = this.availableCharacters();
    if (index >= 0 && index < characters.length) {
      this.selectedOpener.set(characters[index]);
      this.mode.set('ACTION_SELECT');
      this.lastActionMessage.set(`${characters[index].name} will handle the chest.`);
      this.logger.debug('[Chest] Selected opener:', characters[index].name);
    }
  }

  /**
   * Select a caster for CALFO spell
   */
  selectCaster(index: number): void {
    const casters = this.calfoEligibleCasters();
    if (index >= 0 && index < casters.length) {
      this.selectedCaster.set(casters[index]);
      this.castCalfo(casters[index]);
    }
  }

  /**
   * Handle Open action
   */
  private handleOpen(): void {
    const chest = this.chest();
    const opener = this.selectedOpener();
    if (!chest || !opener) return;

    // Check inventory space
    const warning = ChestService.checkInventorySpace(opener, chest);
    if (warning) {
      this.inventoryWarning.set(warning.warning);
      this.mode.set('INVENTORY_WARNING');
      return;
    }

    this.openChest(false);
  }

  /**
   * Open the chest (with optional skip of inventory check)
   */
  private openChest(skipWarning: boolean): void {
    const chest = this.chest();
    const opener = this.selectedOpener();
    if (!chest || !opener) return;

    this.inventoryWarning.set(null);

    // Check if trapped and not disarmed
    if (chest.trapped && !chest.trapDisarmed) {
      this.triggerTrap(chest, opener);
      return;
    }

    // Safe to open - distribute treasure
    this.distributeTreasure(chest, opener);
  }

  /**
   * Trigger trap effects
   */
  private triggerTrap(chest: Chest, opener: Character): void {
    if (!chest.trapType) return;

    const result = TrapService.applyTrapEffects(
      chest.trapType,
      opener,
      this.partyMembers()
    );

    this.lastActionMessage.set(result.message);

    // Apply damage and status to game state
    this.applyTrapDamage(result);

    // Handle special effects
    if (result.specialEffect === 'teleport') {
      this.handleTeleport();
      return;
    }

    if (result.specialEffect === 'combat') {
      this.handleAlarm();
      return;
    }

    // Treasure can still be collected after most traps
    this.distributeTreasure(chest, opener);
  }

  /**
   * Apply trap damage and status effects to game state
   */
  private applyTrapDamage(result: TrapTriggerResult): void {
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster);

      // Apply damage
      result.damageDealt.forEach((damage, charId) => {
        const char = newRoster.get(charId);
        if (char) {
          const newHp = Math.max(0, char.hp - damage);
          newRoster.set(charId, {
            ...char,
            hp: newHp,
            status: newHp === 0 ? CharacterStatus.DEAD : char.status
          });
        }
      });

      // Apply status effects
      result.statusApplied.forEach((status, charId) => {
        const char = newRoster.get(charId);
        if (char && char.status !== CharacterStatus.DEAD) {
          newRoster.set(charId, { ...char, status });
        }
      });

      return { ...state, roster: newRoster };
    });
  }

  /**
   * Handle teleporter trap effect
   */
  private handleTeleport(): void {
    // TODO: Implement random teleport
    this.lastActionMessage.update(m => m + ' You are teleported away!');
    this.mode.set('RESULT_DISPLAY');
  }

  /**
   * Handle alarm trap effect (triggers combat)
   */
  private handleAlarm(): void {
    // TODO: Trigger combat encounter
    this.lastActionMessage.update(m => m + ' Monsters approach!');
    this.mode.set('RESULT_DISPLAY');
  }

  /**
   * Distribute treasure from chest
   */
  private distributeTreasure(chest: Chest, opener: Character): void {
    const state = this.gameState.state();
    const result = ChestService.distributeTreasure(chest, opener, state.party);

    // Update game state with gold and items
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster);
      const char = newRoster.get(opener.id);

      if (char) {
        // Add received items to opener's inventory
        newRoster.set(opener.id, {
          ...char,
          inventory: [...char.inventory, ...result.itemsReceived]
        });
      }

      return {
        ...state,
        roster: newRoster,
        party: {
          ...state.party,
          gold: state.party.gold + result.goldAdded
        }
      };
    });

    const message = ChestService.getDistributionMessage(result);
    this.lastActionMessage.set(message);
    this.mode.set('RESULT_DISPLAY');
    this.logger.debug('[Chest] Treasure distributed:', result);
  }

  /**
   * Handle Inspect action
   */
  private handleInspect(): void {
    const chest = this.chest();
    const opener = this.selectedOpener();
    if (!chest || !opener || chest.trapIdentified) return;

    const result = TrapService.attemptInspection(opener, chest);

    if (result.triggered) {
      this.lastActionMessage.set('You accidentally triggered the trap!');
      this.triggerTrap(chest, opener);
      return;
    }

    if (result.success && result.trapIdentified) {
      this.chest.update(c => c ? { ...c, trapIdentified: true } : c);
      this.lastActionMessage.set(`${opener.name} detects a ${result.trapIdentified} trap!`);
    } else if (result.success && !chest.trapped) {
      this.chest.update(c => c ? { ...c, trapIdentified: true } : c);
      this.lastActionMessage.set(`${opener.name} finds no trap.`);
    } else {
      this.lastActionMessage.set(`${opener.name} cannot determine if there's a trap.`);
    }

    this.logger.debug('[Chest] Inspection result:', result);
  }

  /**
   * Handle CALFO action
   */
  private handleCalfo(): void {
    const casters = this.calfoEligibleCasters();
    if (casters.length === 0) return;

    if (casters.length === 1) {
      // Auto-select single caster
      this.castCalfo(casters[0]);
    } else {
      // Show caster selection
      this.mode.set('CASTER_SELECT');
      this.lastActionMessage.set('Select who will cast CALFO (1-' + casters.length + ')');
    }
  }

  /**
   * Cast CALFO spell
   */
  private castCalfo(caster: Character): void {
    const chest = this.chest();
    if (!chest) return;

    // Consume spell point
    this.gameState.updateState(state => {
      const newRoster = new Map(state.roster);
      const char = newRoster.get(caster.id);
      if (char?.spellPoints?.priest?.level2) {
        const currentSP = char.spellPoints.priest.level2.current;
        newRoster.set(caster.id, {
          ...char,
          spellPoints: {
            ...char.spellPoints,
            priest: {
              ...char.spellPoints.priest,
              level2: {
                ...char.spellPoints.priest.level2,
                current: Math.max(0, currentSP - 1)
              }
            }
          }
        });
      }
      return { ...state, roster: newRoster };
    });

    const result = TrapService.castCalfo(caster, chest);

    if (result.success && result.trapIdentified) {
      this.chest.update(c => c ? { ...c, trapIdentified: true } : c);
      this.lastActionMessage.set(`CALFO reveals a ${result.trapIdentified} trap!`);
    } else if (result.success && !chest.trapped) {
      this.chest.update(c => c ? { ...c, trapIdentified: true } : c);
      this.lastActionMessage.set('CALFO reveals the chest is not trapped.');
    } else {
      this.lastActionMessage.set('CALFO fails to reveal the trap type.');
    }

    this.mode.set('ACTION_SELECT');
    this.selectedCaster.set(null);
    this.logger.debug('[Chest] CALFO result:', result);
  }

  /**
   * Handle Disarm action
   */
  private handleDisarm(): void {
    const chest = this.chest();
    if (!chest || !chest.trapIdentified || !chest.trapped || chest.trapDisarmed) return;

    this.mode.set('TRAP_NAME_INPUT');
    this.trapNameInput.set('');
    this.lastActionMessage.set(`Enter trap name to disarm: ${chest.trapType}`);
  }

  /**
   * Submit trap name for disarm attempt
   */
  private submitTrapName(): void {
    const chest = this.chest();
    const opener = this.selectedOpener();
    if (!chest || !opener) return;

    const result = TrapService.attemptDisarm(opener, chest, this.trapNameInput());

    if (result.success) {
      this.chest.update(c => c ? { ...c, trapDisarmed: true, trapped: false } : c);
      this.lastActionMessage.set(`${opener.name} successfully disarmed the trap!`);
    } else if (result.triggered) {
      if (result.wrongName) {
        this.lastActionMessage.set('Wrong trap name! The trap triggers!');
      } else {
        this.lastActionMessage.set('Disarm failed! The trap triggers!');
      }
      this.triggerTrap(chest, opener);
      return;
    } else {
      this.lastActionMessage.set(`${opener.name} could not disarm it. Try again?`);
    }

    this.mode.set('ACTION_SELECT');
    this.trapNameInput.set('');
    this.logger.debug('[Chest] Disarm result:', result);
  }

  /**
   * Handle Leave action
   */
  private handleLeave(): void {
    this.logger.debug('[Chest] Leaving chest');
    this.navigation.navigateTo('maze');
  }

  /**
   * Handle Cancel action
   */
  private handleCancel(): void {
    const mode = this.mode();

    if (mode === 'CASTER_SELECT' || mode === 'TRAP_NAME_INPUT') {
      this.mode.set('ACTION_SELECT');
      this.trapNameInput.set('');
      this.selectedCaster.set(null);
    } else if (mode === 'INVENTORY_WARNING') {
      this.mode.set('ACTION_SELECT');
      this.inventoryWarning.set(null);
    } else if (mode === 'CHARACTER_SELECT') {
      this.handleLeave();
    } else {
      this.handleLeave();
    }
  }

  /**
   * Handle Continue action (after result display)
   */
  private handleContinue(): void {
    const chest = this.chest();

    // If chest still has treasure and wasn't a teleport/alarm
    if (chest && this.mode() === 'RESULT_DISPLAY') {
      this.navigation.navigateTo('maze');
    }
  }

  /**
   * Get trap status display text
   */
  getTrapStatusText(): string {
    const chest = this.chest();
    if (!chest) return '';

    if (chest.trapDisarmed) {
      return 'Trap disarmed - safe to open';
    }

    if (chest.trapIdentified) {
      if (chest.trapped && chest.trapType) {
        return `Trap detected: ${chest.trapType}`;
      }
      return 'No trap detected';
    }

    return 'Trap status: Unknown';
  }

  /**
   * Get inspect chance display for selected opener
   */
  getInspectChanceText(): string {
    const opener = this.selectedOpener();
    if (!opener) return '';
    const chance = TrapService.calculateInspectChance(opener);
    return `Inspect chance: ${chance}%`;
  }

  /**
   * Get disarm chance display for selected opener
   */
  getDisarmChanceText(): string {
    const opener = this.selectedOpener();
    const chest = this.chest();
    if (!opener || !chest) return '';
    const chance = TrapService.calculateDisarmChance(opener, chest.mazeLevel);
    return `Disarm chance: ${Math.round(chance)}%`;
  }
}
