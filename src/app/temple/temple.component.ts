import { Component, OnInit, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/GameStateService';
import { TempleService } from '../../services/TempleService';
import { SceneNavigationService } from '../../services/SceneNavigationService';
import { MessageService } from '../../services/MessageService';
import { GameStateQueries } from '../../utils/GameStateQueries';
import { SceneTitleComponent } from '../shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../shared/components/scene-footer/scene-footer.component';
import { PartyCharacterGridComponent } from '../shared/components/party-character-grid/party-character-grid.component';
import { ConfirmationDialogComponent } from '../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MenuItem } from '../shared/components/menu/menu.component';
import { CharacterActionEvent, CharacterAction, CharacterField } from '../../types/CharacterCardTypes';
import { Character } from '../../types/Character';
import { SceneType } from '../../types/SceneType';
import { CharacterStatus } from '../../types/CharacterStatus';
import { ServiceType } from '../../types/ServiceType';

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
    const tithe = this.getServiceCostForStatus(character);
    const partyGold = GameStateQueries.partyGold(this.gameState.state());
    const canAfford = partyGold >= tithe;

    switch (character.status) {
      case CharacterStatus.POISONED:
        actions.push({
          type: 'cure-poison',
          label: `Cure Poison (${tithe}g)`,
          enabled: canAfford
        });
        break;
      case CharacterStatus.PARALYZED:
        actions.push({
          type: 'cure-paralysis',
          label: `Cure Paralysis (${tithe}g)`,
          enabled: canAfford
        });
        break;
      case CharacterStatus.DEAD:
        actions.push({
          type: 'resurrect',
          label: `Resurrect (${tithe}g)`,
          enabled: canAfford
        });
        break;
      case CharacterStatus.ASHES:
        actions.push({
          type: 'restore',
          label: `Restore (${tithe}g)`,
          enabled: canAfford
        });
        break;
    }

    return actions;
  };

  /**
   * Get the service cost for a character based on their status
   */
  private getServiceCostForStatus(character: Character): number {
    const serviceType = this.getServiceTypeForStatus(character.status);
    if (!serviceType) return 0;
    return TempleService.calculateTithe(character, serviceType);
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

  readonly footerMenuItems = computed((): MenuItem[] => {
    const afflicted = this.afflictedCharacters();

    return [
      {
        id: 'cure-poison',
        label: 'Cure Poison',
        shortcut: 'P',
        enabled: afflicted.some(c => c.status === CharacterStatus.POISONED)
      },
      {
        id: 'cure-paralysis',
        label: 'Cure Paralysis',
        shortcut: 'A',
        enabled: afflicted.some(c => c.status === CharacterStatus.PARALYZED)
      },
      {
        id: 'resurrect',
        label: 'Resurrect',
        shortcut: 'R',
        enabled: afflicted.some(c => c.status === CharacterStatus.DEAD)
      },
      {
        id: 'restore',
        label: 'Restore',
        shortcut: 'S',
        enabled: afflicted.some(c => c.status === CharacterStatus.ASHES)
      },
      {
        id: 'return',
        label: 'Return to Castle (ESC)',
        shortcut: 'ESC',
        enabled: true
      }
    ];
  });

  ngOnInit(): void {
    this.messages.clear();
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TEMPLE
    }));
  }

  handleFooterAction(itemId: string): void {
    this.messages.clear();

    if (itemId === 'return') {
      this.navigation.returnToCastle();
      return;
    }

    const serviceType = this.getServiceTypeFromId(itemId);
    if (!serviceType) return;

    const afflicted = this.afflictedCharacters();
    const matchingCharacters = afflicted.filter(c => {
      switch (serviceType) {
        case ServiceType.CURE_POISON: return c.status === CharacterStatus.POISONED;
        case ServiceType.CURE_PARALYSIS: return c.status === CharacterStatus.PARALYZED;
        case ServiceType.RESURRECT: return c.status === CharacterStatus.DEAD;
        case ServiceType.RESTORE: return c.status === CharacterStatus.ASHES;
        default: return false;
      }
    });

    if (matchingCharacters.length === 0) {
      return; // Menu item should be disabled, but safety check
    }

    if (matchingCharacters.length === 1) {
      // Auto-select when only one character matches
      const char = matchingCharacters[0];
      const tithe = TempleService.calculateTithe(char, serviceType);
      this.pendingService.set({ type: serviceType, characterId: char.id });
      this.confirmationMessage.set(`${this.getServiceActionText(serviceType)} ${char.name}? (Cost: ${tithe} gold)`);
      this.showConfirmation.set(true);
    } else {
      // Multiple characters - prompt user to select from cards
      const serviceName = this.getServiceName(serviceType);
      this.messages.showError(`Multiple characters need ${serviceName}. Click on a character card to select.`);
    }
  }

  /**
   * Get human-readable service name
   */
  private getServiceName(service: ServiceType): string {
    switch (service) {
      case ServiceType.CURE_POISON: return 'Cure Poison';
      case ServiceType.CURE_PARALYSIS: return 'Cure Paralysis';
      case ServiceType.RESURRECT: return 'Resurrection';
      case ServiceType.RESTORE: return 'Restoration';
      default: return 'service';
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
