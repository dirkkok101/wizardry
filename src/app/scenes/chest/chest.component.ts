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
import { CharacterListItemComponent } from '@shared/components/character-list-item/character-list-item.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { Character } from '@models/Character';
import { CharacterStatus } from '@models/CharacterStatus';
import { SceneType } from '@models/SceneType';
import { Chest, TreasureDistributionResult } from '@models/Chest';
import { TrapType, TrapInspectionResult, TrapDisarmResult, TrapTriggerResult } from '@models/Trap';
import { Item } from '@models/Item';

/**
 * Scene modes for the chest interaction state machine
 */
type ChestMode =
  | 'CHARACTER_SELECT'  // Initial: pick who handles chest
  | 'ACTION_SELECT'     // Main menu: O/I/C/D/L
  | 'CASTER_SELECT'     // Choosing CALFO caster
  | 'TRAP_NAME_INPUT'   // Entering trap name for disarm
  | 'INVENTORY_WARNING' // Confirmation when inventory could overflow
  | 'RESULT_DISPLAY'    // Showing trap/treasure outcome
  | 'VICTORY_SUMMARY';  // Showing combined combat + chest rewards

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
    SceneFooterComponent,
    CharacterListItemComponent
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

  // Chest interaction results for victory summary
  readonly chestResults = signal<{
    goldObtained: number
    itemsObtained: Item[]
    trapTriggered: boolean
    trapType: TrapType | null
    trapMessage: string | null
  } | null>(null)

  // Computed signal for pending combat rewards from game state
  readonly pendingCombatRewards = computed(() => {
    return this.gameState.state().pendingCombatRewards
  })

  // Pending trap info to merge with chest results in distributeTreasure
  private readonly pendingTrapInfo = signal<{
    trapTriggered: boolean
    trapType: TrapType | null
    trapMessage: string | null
  } | null>(null)

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

    // In victory summary mode
    if (mode === 'VICTORY_SUMMARY') {
      return [
        { id: 'continue', label: 'Return to Maze', shortcut: 'ENTER', enabled: true }
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
   * Initialize the chest from game state (set by combat victory or exploration)
   */
  private initializeChest(): void {
    const state = this.gameState.state();

    // Get chest from game state (set by combat victory or exploration)
    if (state.pendingChest) {
      this.chest.set(state.pendingChest);
      this.logger.debug('[Chest] Using pending chest from game state:', state.pendingChest);

      // Clear pending chest from state (consumed)
      this.gameState.updateState(s => ({ ...s, pendingChest: undefined }));
      return;
    }

    // Fallback for development/testing - generate a test chest
    this.logger.warn('[Chest] No pending chest in state, generating test chest for development');
    const position = state.dungeon?.position ?? { x: 0, y: 0, facing: 'NORTH' as const };
    const mazeLevel = state.dungeon?.currentLevel ?? 1;

    const chest = ChestService.generateChest(
      3,  // Reward tier
      mazeLevel,
      { x: position.x, y: position.y, facing: position.facing },
      'combat_victory'
    );

    this.chest.set(chest);
    this.logger.debug('[Chest] Generated test chest:', chest);
  }

  /**
   * Handle keyboard input
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    const key = event.key.toUpperCase();
    const mode = this.mode();

    console.log('[Chest] Keyboard event:', {
      key,
      rawKey: event.key,
      mode,
      trapNameInput: this.trapNameInput()
    });

    // Handle ESC for cancel/leave
    if (key === 'ESCAPE') {
      console.log('[Chest] ESC pressed - calling handleCancel');
      this.handleCancel();
      return;
    }

    // Handle Enter for continue
    if (key === 'ENTER' && (mode === 'RESULT_DISPLAY' || mode === 'VICTORY_SUMMARY')) {
      console.log('[Chest] ENTER pressed in', mode, '- calling handleContinue');
      this.handleContinue();
      return;
    }

    // Character select mode - number keys
    if (mode === 'CHARACTER_SELECT') {
      const num = parseInt(key);
      if (num >= 1 && num <= 6) {
        console.log('[Chest] Character selected:', num);
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
        console.log('[Chest] BACKSPACE in TRAP_NAME_INPUT');
        this.trapNameInput.update(v => v.slice(0, -1));
      } else if (key === 'ENTER') {
        console.log('[Chest] ENTER in TRAP_NAME_INPUT - calling submitTrapName');
        this.submitTrapName();
      } else if (key.length === 1 && /[A-Z ]/.test(key)) {
        console.log('[Chest] Adding character to trap name:', key);
        this.trapNameInput.update(v => v + key);
      } else {
        console.log('[Chest] Ignored key in TRAP_NAME_INPUT:', key);
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
      console.log('[Chest] ACTION_SELECT mode, key:', key);
      switch (key) {
        case 'O': this.handleOpen(); break;
        case 'I': this.handleInspect(); break;
        case 'C': this.handleCalfo(); break;
        case 'D': this.handleDisarm(); break;
        case 'L': this.handleLeave(); break;
        default:
          console.log('[Chest] Unhandled key in ACTION_SELECT:', key);
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

    console.log('[Chest] handleOpen called:', {
      hasChest: !!chest,
      hasOpener: !!opener,
      chestTrapped: chest?.trapped,
      chestTrapDisarmed: chest?.trapDisarmed
    });

    if (!chest || !opener) {
      console.log('[Chest] handleOpen early return - missing chest or opener');
      return;
    }

    // Check inventory space
    const warning = ChestService.checkInventorySpace(opener, chest);
    if (warning) {
      console.log('[Chest] Inventory warning shown:', warning.warning);
      this.inventoryWarning.set(warning.warning);
      this.mode.set('INVENTORY_WARNING');
      return;
    }

    console.log('[Chest] No inventory warning - calling openChest');
    this.openChest(false);
  }

  /**
   * Open the chest (with optional skip of inventory check)
   */
  private openChest(skipWarning: boolean): void {
    const chest = this.chest();
    const opener = this.selectedOpener();

    console.log('[Chest] openChest called:', {
      skipWarning,
      hasChest: !!chest,
      hasOpener: !!opener,
      chestTrapped: chest?.trapped,
      chestTrapDisarmed: chest?.trapDisarmed,
      chestTrapType: chest?.trapType
    });

    if (!chest || !opener) {
      console.log('[Chest] openChest early return - missing chest or opener');
      return;
    }

    this.inventoryWarning.set(null);

    // Check if trapped and not disarmed
    if (chest.trapped && !chest.trapDisarmed) {
      console.log('[Chest] Chest is trapped and not disarmed - triggering trap');
      this.triggerTrap(chest, opener);
      return;
    }

    // Safe to open - distribute treasure
    console.log('[Chest] Chest is safe - distributing treasure');
    this.distributeTreasure(chest, opener);
  }

  /**
   * Trigger trap effects
   */
  private triggerTrap(chest: Chest, opener: Character): void {
    console.log('[Chest] triggerTrap called:', {
      chestTrapType: chest.trapType,
      openerName: opener.name,
      chestContents: chest.contents
    });

    if (!chest.trapType) {
      console.log('[Chest] triggerTrap early return - no trap type');
      return;
    }

    const result = TrapService.applyTrapEffects(
      chest.trapType,
      opener,
      this.partyMembers()
    );

    console.log('[Chest] applyTrapEffects result:', {
      trapType: result.trapType,
      damageDealtCount: result.damageDealt.size,
      statusAppliedCount: result.statusApplied.size,
      specialEffect: result.specialEffect,
      message: result.message
    });

    this.lastActionMessage.set(result.message);

    // Apply damage and status to game state
    this.applyTrapDamage(result);

    // Handle special effects
    if (result.specialEffect === 'teleport') {
      console.log('[Chest] Teleport effect - NOT distributing treasure, going to RESULT_DISPLAY');
      this.handleTeleport();
      return;
    }

    if (result.specialEffect === 'combat') {
      console.log('[Chest] Alarm effect - NOT distributing treasure, going to RESULT_DISPLAY');
      this.handleAlarm();
      return;
    }

    // Store trap info for victory summary (will be merged with treasure results)
    this.pendingTrapInfo.set({
      trapTriggered: true,
      trapType: chest.trapType,
      trapMessage: result.message
    })

    // Treasure can still be collected after most traps
    console.log('[Chest] No special effect - distributing treasure after trap');
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

    // Set chest results for victory summary (no treasure, trap triggered)
    this.chestResults.set({
      goldObtained: 0,
      itemsObtained: [],
      trapTriggered: true,
      trapType: this.chest()?.trapType || null,
      trapMessage: this.lastActionMessage()
    });

    this.mode.set('RESULT_DISPLAY');
  }

  /**
   * Handle alarm trap effect (triggers combat)
   */
  private handleAlarm(): void {
    // TODO: Trigger combat encounter
    this.lastActionMessage.update(m => m + ' Monsters approach!');

    // Set chest results for victory summary (no treasure, trap triggered)
    this.chestResults.set({
      goldObtained: 0,
      itemsObtained: [],
      trapTriggered: true,
      trapType: this.chest()?.trapType || null,
      trapMessage: this.lastActionMessage()
    });

    this.mode.set('RESULT_DISPLAY');
  }

  /**
   * Distribute treasure from chest
   */
  private distributeTreasure(chest: Chest, opener: Character): void {
    console.log('[Chest] distributeTreasure called:', {
      chestId: chest.id,
      chestContents: chest.contents,
      openerName: opener.name,
      openerId: opener.id
    });

    const state = this.gameState.state();
    const result = ChestService.distributeTreasure(chest, opener, state.party);

    console.log('[Chest] distributeTreasure result:', {
      goldAdded: result.goldAdded,
      itemsReceivedCount: result.itemsReceived.length,
      itemsReceived: result.itemsReceived.map(i => i.name),
      itemsLostCount: result.itemsLost.length,
      itemsLost: result.itemsLost.map(i => i.name)
    });

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

    // Store results for victory summary (merge with any pending trap info)
    const trapInfo = this.pendingTrapInfo() ?? {
      trapTriggered: false,
      trapType: null,
      trapMessage: null
    }

    this.chestResults.set({
      goldObtained: result.goldAdded,
      itemsObtained: result.itemsReceived,
      ...trapInfo
    })

    // Clear pending trap info
    this.pendingTrapInfo.set(null)

    const message = ChestService.getDistributionMessage(result);
    console.log('[Chest] Distribution message:', message);
    console.log('[Chest] Setting mode to RESULT_DISPLAY');
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

    console.log('[Chest] submitTrapName called:', {
      hasChest: !!chest,
      hasOpener: !!opener,
      trapNameInput: this.trapNameInput(),
      trapNameInputLength: this.trapNameInput().length,
      chestTrapType: chest?.trapType,
      chestTrapped: chest?.trapped,
      chestTrapDisarmed: chest?.trapDisarmed
    });

    if (!chest || !opener) {
      console.log('[Chest] submitTrapName early return - missing chest or opener');
      return;
    }

    const result = TrapService.attemptDisarm(opener, chest, this.trapNameInput());

    console.log('[Chest] attemptDisarm result:', {
      success: result.success,
      triggered: result.triggered,
      wrongName: result.wrongName
    });

    if (result.success) {
      console.log('[Chest] Disarm SUCCESS - updating chest state');
      this.chest.update(c => c ? { ...c, trapDisarmed: true, trapped: false } : c);
      this.lastActionMessage.set(`${opener.name} successfully disarmed the trap!`);
      console.log('[Chest] After success - setting mode to ACTION_SELECT');
    } else if (result.triggered) {
      if (result.wrongName) {
        console.log('[Chest] WRONG NAME - trap will trigger');
        this.lastActionMessage.set('Wrong trap name! The trap triggers!');
      } else {
        console.log('[Chest] Disarm failed - trap will trigger');
        this.lastActionMessage.set('Disarm failed! The trap triggers!');
      }
      console.log('[Chest] Calling triggerTrap...');
      this.triggerTrap(chest, opener);
      return;
    } else {
      console.log('[Chest] Disarm failed but trap NOT triggered - can retry');
      this.lastActionMessage.set(`${opener.name} could not disarm it. Try again?`);
    }

    console.log('[Chest] Setting mode to ACTION_SELECT and clearing input');
    this.mode.set('ACTION_SELECT');
    this.trapNameInput.set('');
    this.logger.debug('[Chest] Disarm result:', result);
  }

  /**
   * Handle Leave action
   */
  private handleLeave(): void {
    const hasCombatRewards = !!this.gameState.state().pendingCombatRewards;

    console.log('[Chest] handleLeave called:', { hasCombatRewards });

    if (hasCombatRewards) {
      // From combat - show victory summary even if chest abandoned
      console.log('[Chest] Showing victory summary (chest abandoned)');
      this.chestResults.set({
        goldObtained: 0,
        itemsObtained: [],
        trapTriggered: false,
        trapType: null,
        trapMessage: null
      });
      this.mode.set('VICTORY_SUMMARY');
      return;
    }

    console.log('[Chest] handleLeave - navigating to maze');
    this.logger.debug('[Chest] Leaving chest');
    this.navigation.navigateTo('maze');
  }

  /**
   * Handle Cancel action
   */
  private handleCancel(): void {
    const mode = this.mode();

    console.log('[Chest] handleCancel called:', { mode });

    if (mode === 'CASTER_SELECT' || mode === 'TRAP_NAME_INPUT') {
      console.log('[Chest] Cancel from CASTER_SELECT/TRAP_NAME_INPUT - returning to ACTION_SELECT');
      this.mode.set('ACTION_SELECT');
      this.trapNameInput.set('');
      this.selectedCaster.set(null);
    } else if (mode === 'INVENTORY_WARNING') {
      console.log('[Chest] Cancel from INVENTORY_WARNING - returning to ACTION_SELECT');
      this.mode.set('ACTION_SELECT');
      this.inventoryWarning.set(null);
    } else if (mode === 'CHARACTER_SELECT') {
      console.log('[Chest] Cancel from CHARACTER_SELECT - leaving');
      this.handleLeave();
    } else {
      console.log('[Chest] Cancel from other mode - leaving');
      this.handleLeave();
    }
  }

  /**
   * Handle Continue action (after result display)
   */
  private handleContinue(): void {
    const chest = this.chest();
    const currentMode = this.mode();
    const hasCombatRewards = !!this.gameState.state().pendingCombatRewards;

    console.log('[Chest] handleContinue called:', {
      hasChest: !!chest,
      currentMode,
      hasCombatRewards,
      lastActionMessage: this.lastActionMessage()
    });

    if (currentMode === 'RESULT_DISPLAY' && hasCombatRewards) {
      // From combat - show victory summary before maze
      console.log('[Chest] Transitioning to VICTORY_SUMMARY');
      this.mode.set('VICTORY_SUMMARY');
      return;
    }

    if (currentMode === 'VICTORY_SUMMARY') {
      // After victory summary - clear rewards and go to maze
      console.log('[Chest] Navigating to maze from VICTORY_SUMMARY');
      this.clearCombatRewardsAndNavigate();
      return;
    }

    // Non-combat chest or exploration - go directly to maze
    if (chest && currentMode === 'RESULT_DISPLAY') {
      console.log('[Chest] Navigating to maze from RESULT_DISPLAY (no combat rewards)');
      this.navigation.navigateTo('maze');
    } else {
      console.log('[Chest] handleContinue - conditions not met for navigation');
    }
  }

  private clearCombatRewardsAndNavigate(): void {
    this.gameState.updateState(state => ({
      ...state,
      pendingCombatRewards: undefined
    }));
    this.navigation.navigateTo('maze');
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
