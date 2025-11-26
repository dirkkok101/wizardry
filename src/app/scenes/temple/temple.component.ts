import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { TempleService } from '@services/TempleService';
import { SceneNavigationService } from '@services/SceneNavigationService';
import { MessageService } from '@services/MessageService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { PartyCharacterGridComponent } from '@shared/components/party-character-grid/party-character-grid.component';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { CharacterActionEvent, CharacterAction, CharacterField } from '@types/CharacterCardTypes';
import { Character } from '@types/Character';
import { SceneType } from '@types/SceneType';
import { CharacterStatus } from '@types/CharacterStatus';
import { ServiceType } from '@types/ServiceType';

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
    PartyCharacterGridComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './temple.component.html',
  styleUrls: ['./temple.component.scss']
})
export class TempleComponent implements OnInit {
  private readonly gameState = inject(GameStateService);
  private readonly navigation = inject(SceneNavigationService);
  readonly messages = inject(MessageService);

  // Confirmation dialog state
  readonly showConfirmation = signal(false);
  readonly confirmationMessage = signal('');
  private pendingService = signal<{
    type: ServiceType;
    characterId: string;
  } | null>(null);

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

  cancelService(): void {
    this.showConfirmation.set(false);
    this.confirmationMessage.set('');
    this.pendingService.set(null);
  }

  confirmService(): void {
    const pending = this.pendingService();
    if (!pending) return;

    const state = this.gameState.state();
    const character = state.roster.get(pending.characterId);
    if (!character) {
      this.messages.showError('Character not found');
      this.cancelService();
      return;
    }

    const tithe = TempleService.calculateTithe(character, pending.type);
    const partyGold = GameStateQueries.partyGold(state);
    if (partyGold < tithe) {
      this.messages.showError(`Cannot afford service. Need ${tithe} gold.`);
      this.cancelService();
      return;
    }

    const result = TempleService.performService(state, pending.characterId, pending.type);

    if (result.success && result.state) {
      this.gameState.updateState(() => result.state!);
      this.messages.clear();
    } else if (result.error && result.state) {
      this.gameState.updateState(() => result.state!);
      this.messages.showError(result.error);
    } else {
      this.messages.showError(result.error || 'Service failed');
    }

    this.cancelService();
  }

  handleCharacterAction(event: CharacterActionEvent): void {
    this.messages.clear();

    if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'temple');
      return;
    }

    // Handle temple service actions from character card buttons
    const serviceType = this.getServiceTypeFromId(event.actionType);
    if (serviceType) {
      const character = this.gameState.state().roster.get(event.characterId);
      if (!character) {
        this.messages.showError('Character not found');
        return;
      }

      const tithe = TempleService.calculateTithe(character, serviceType);
      this.pendingService.set({ type: serviceType, characterId: event.characterId });
      this.confirmationMessage.set(`${this.getServiceActionText(serviceType)} ${character.name}? (Cost: ${tithe} gold)`);
      this.showConfirmation.set(true);
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    if (!this.showConfirmation()) {
      this.navigation.returnToCastle();
    }
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

  private getServiceActionText(service: ServiceType): string {
    switch (service) {
      case ServiceType.CURE_POISON: return 'Cure poison for';
      case ServiceType.CURE_PARALYSIS: return 'Cure paralysis for';
      case ServiceType.RESURRECT: return 'Attempt to resurrect';
      case ServiceType.RESTORE: return 'Attempt to restore';
      default: return 'Service for';
    }
  }
}
