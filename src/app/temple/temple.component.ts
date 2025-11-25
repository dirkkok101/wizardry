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
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
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

  // Afflicted characters (computed using GameStateQueries)
  readonly afflictedCharacters = computed(() =>
    GameStateQueries.afflictedCharacters(this.gameState.state())
  );

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

    if (matchingCharacters.length === 1) {
      const char = matchingCharacters[0];
      const tithe = TempleService.calculateTithe(char, serviceType);
      this.pendingService.set({ type: serviceType, characterId: char.id });
      this.confirmationMessage.set(`${this.getServiceActionText(serviceType)} ${char.name}? (Cost: ${tithe} gold)`);
      this.showConfirmation.set(true);
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
    if (event.actionType === 'inspect') {
      this.navigation.inspectCharacter(event.characterId, 'temple');
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
