import { Component, OnInit, HostListener, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { TempleService } from '../../services/TempleService';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { MenuItem } from '../../components/menu/menu.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
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
    CharacterCardComponent,
    ConfirmationDialogComponent
  ],
  templateUrl: './temple.component.html',
  styleUrls: ['./temple.component.scss']
})
export class TempleComponent implements OnInit {
  // Confirmation dialog state
  readonly showConfirmation = signal(false);
  readonly confirmationMessage = signal('');
  private pendingService = signal<{
    type: ServiceType;
    characterId: string;
  } | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Party and afflicted characters
  readonly currentParty = computed(() => this.gameState.party());
  readonly afflictedCharacters = computed(() => {
    const state = this.gameState.state();
    const party = this.currentParty();

    return party.members
      .map(id => state.roster.get(id))
      .filter((char): char is Character => char !== undefined)
      .filter(char => char.status !== CharacterStatus.OK);
  });

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

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TEMPLE
    }));
  }

  handleFooterAction(itemId: string): void {
    if (itemId === 'return') {
      this.router.navigate(['/castle-menu']);
      return;
    }

    // Service selection
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
      this.pendingService.set({ type: serviceType, characterId: char.id });
      this.confirmationMessage.set(`${this.getServiceActionText(serviceType)} ${char.name}?`);
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
      this.errorMessage.set('Character not found');
      this.cancelService();
      return;
    }

    // Check gold
    const tithe = TempleService.calculateTithe(character, pending.type);
    const party = this.currentParty();
    if (party.gold < tithe) {
      this.errorMessage.set(`Cannot afford service. Need ${tithe} gold.`);
      this.cancelService();
      return;
    }

    // Execute service
    const result = TempleService.performService(state, pending.characterId, pending.type);

    if (result.success && result.state) {
      this.gameState.updateState(() => result.state!);
      this.errorMessage.set(null);
    } else if (result.error && result.state) {
      // Service failed but state changed (resurrection failure)
      this.gameState.updateState(() => result.state!);
      this.errorMessage.set(result.error);
    } else {
      this.errorMessage.set(result.error || 'Service failed');
    }

    this.cancelService();
  }

  handleCharacterAction(event: CharacterActionEvent): void {
    if (event.actionType === 'inspect') {
      this.router.navigate(['/character-inspection'], {
        queryParams: {
          characterId: event.characterId,
          returnTo: 'temple'
        }
      });
    }
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    // Don't navigate if confirmation dialog is open
    if (!this.showConfirmation()) {
      this.router.navigate(['/castle-menu']);
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
