import { Component, OnInit, HostListener, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { TempleService } from '@services/TempleService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { LoggerService } from '@services/LoggerService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { PartyCharacterGridComponent } from '@shared/components/party-character-grid/party-character-grid.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { CharacterActionEvent, CharacterAction, CharacterField } from '@models/CharacterCardTypes';
import { Character } from '@models/Character';
import { SceneType } from '@models/SceneType';
import { CharacterStatus } from '@models/CharacterStatus';
import { ServiceType } from '@models/ServiceType';

/**
 * Temple Component (Temple of Cant)
 *
 * Healing and resurrection services:
 * - Cure Poison: Remove POISONED status
 * - Cure Paralysis: Remove PARALYZED status
 * - Resurrect: DEAD → OK (can fail → ASHES)
 * - Restore: ASHES → OK (can fail → LOST)
 */
@Component({
  selector: 'app-temple',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    PartyCharacterGridComponent
  ],
  templateUrl: './temple.component.html',
  styleUrls: ['./temple.component.scss']
})
export class TempleComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  private readonly logger = inject(LoggerService);
  readonly messages = inject(MessageService);

  // Visible fields for character cards - show status prominently
  readonly visibleFields: CharacterField[] = ['class', 'level', 'hp', 'status'];

  // Afflicted characters (computed using GameStateQueries)
  readonly afflictedCharacters = computed(() =>
    GameStateQueries.afflictedCharacters(this.gameState.state())
  );

  /**
   * Get dynamic actions for each character based on their status
   * This allows clicking the specific service action on the character card
   */
  getCharacterActions = (character: Character): CharacterAction[] => {
    const actions: CharacterAction[] = [{ type: 'inspect', label: 'Inspect' }];
    const serviceType = this.getServiceTypeForStatus(character.status);

    if (serviceType) {
      const tithe = TempleService.calculateTithe(character, serviceType);
      const partyGold = GameStateQueries.partyGold(this.gameState.state());
      const canAfford = partyGold >= tithe;
      const actionId = this.getActionIdFromServiceType(serviceType);
      const serviceName = this.getServiceName(serviceType);

      // Debug logging for temple service button state
      this.logger.debug(`[Temple] getCharacterActions for ${character.name}:`, {
        status: character.status,
        level: character.level,
        serviceType,
        tithe,
        partyGold,
        canAfford,
        actionId
      });

      actions.push({
        type: actionId,
        label: `${serviceName} (${tithe}g)`,
        enabled: canAfford
      });
    }

    return actions;
  };

  /**
   * Map service type to action ID
   */
  private getActionIdFromServiceType(serviceType: ServiceType): string {
    switch (serviceType) {
      case ServiceType.CURE_POISON: return 'cure-poison';
      case ServiceType.CURE_PARALYSIS: return 'cure-paralysis';
      case ServiceType.RESURRECT: return 'resurrect';
      case ServiceType.RESTORE: return 'restore';
    }
  }

  /**
   * Map character status to service type
   */
  private getServiceTypeForStatus(status: CharacterStatus): ServiceType | null {
    switch (status) {
      case CharacterStatus.POISONED: return ServiceType.CURE_POISON;
      case CharacterStatus.PARALYZED: return ServiceType.CURE_PARALYSIS;
      case CharacterStatus.DEAD: return ServiceType.RESURRECT;
      case CharacterStatus.ASHES: return ServiceType.RESTORE;
      default: return null;
    }
  }

  // Footer menu only contains party-level actions (navigation)
  // Character-specific actions (services) are on the character cards
  readonly footerMenuItems = computed((): MenuItem[] => [
    {
      id: 'return',
      label: 'Return to Castle',
      shortcut: 'ESC',
      enabled: true
    }
  ]);

  ngOnInit(): void {
    this.messages.clear();

    // Debug logging for temple initialization
    const state = this.gameState.state();
    const afflicted = GameStateQueries.afflictedCharacters(state);
    const partyGold = GameStateQueries.partyGold(state);

    this.logger.debug('[Temple] Initializing temple scene:', {
      partyGold,
      afflictedCount: afflicted.length,
      afflictedCharacters: afflicted.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        level: c.level,
        hp: c.hp
      }))
    });

    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TEMPLE
    }));
  }

  handleFooterAction(itemId: string): void {
    if (itemId === 'return') {
      this.navigation.returnToCastle();
    }
  }

  /**
   * Get human-readable service name for button labels
   */
  private getServiceName(service: ServiceType): string {
    switch (service) {
      case ServiceType.CURE_POISON: return 'Cure Poison';
      case ServiceType.CURE_PARALYSIS: return 'Cure Paralysis';
      case ServiceType.RESURRECT: return 'Resurrect';
      case ServiceType.RESTORE: return 'Restore';
      default: return 'Service';
    }
  }

  handleCharacterAction(event: CharacterActionEvent): void {
    this.logger.debug('[Temple] handleCharacterAction received:', event);
    this.messages.clear();

    if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'temple');
      return;
    }

    // Handle temple service actions from character card buttons
    const serviceType = this.getServiceTypeFromId(event.actionType);
    if (!serviceType) return;

    const state = this.gameState.state();
    const character = state.roster.get(event.characterId);
    if (!character) {
      this.logger.error('[Temple] Character not found:', event.characterId);
      this.messages.showError('Character not found');
      return;
    }

    const tithe = TempleService.calculateTithe(character, serviceType);
    const partyGold = GameStateQueries.partyGold(state);

    this.logger.debug('[Temple] Service action:', {
      character: character.name,
      serviceType,
      tithe,
      partyGold,
      canAfford: partyGold >= tithe
    });

    if (partyGold < tithe) {
      this.messages.showError(`Cannot afford service. Need ${tithe} gold.`);
      return;
    }

    // Execute service directly (no confirmation dialog)
    const result = TempleService.performService(state, event.characterId, serviceType);

    if (result.success && result.state) {
      this.gameState.updateState(() => result.state!);
      this.messages.showSuccess(this.getSuccessMessage(character.name, serviceType, tithe));
    } else if (result.state) {
      // Service failed but state changed (e.g., DEAD → ASHES)
      this.gameState.updateState(() => result.state!);
      this.messages.showError(result.error || 'Service failed');
    } else {
      this.messages.showError(result.error || 'Service failed');
    }
  }

  private getSuccessMessage(name: string, service: ServiceType, cost: number): string {
    switch (service) {
      case ServiceType.CURE_POISON: return `${name} has been cured of poison. (Cost: ${cost}g)`;
      case ServiceType.CURE_PARALYSIS: return `${name} has been cured of paralysis. (Cost: ${cost}g)`;
      case ServiceType.RESURRECT: return `${name} has been resurrected! (Cost: ${cost}g)`;
      case ServiceType.RESTORE: return `${name} has been restored from ashes! (Cost: ${cost}g)`;
      default: return `${name} has been healed. (Cost: ${cost}g)`;
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.navigation.returnToCastle();
  }

  private getServiceTypeFromId(id: string): ServiceType | null {
    switch (id) {
      case 'cure-poison': return ServiceType.CURE_POISON;
      case 'cure-paralysis': return ServiceType.CURE_PARALYSIS;
      case 'resurrect': return ServiceType.RESURRECT;
      case 'restore': return ServiceType.RESTORE;
      default: return null;
    }
  }

}
