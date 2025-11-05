import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { TempleService } from '../../services/TempleService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';
import { ServiceType } from '../../types/ServiceType';

type TempleView = 'main' | 'select-character' | 'select-service';

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
  imports: [CommonModule, MenuComponent],
  templateUrl: './temple.component.html',
  styleUrls: ['./temple.component.scss']
})
export class TempleComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    { id: 'healing', label: 'HEALING SERVICES', enabled: true, shortcut: 'H' },
    { id: 'castle', label: 'RETURN TO CASTLE', enabled: true, shortcut: 'C' }
  ];

  // Confirmation dialog state
  readonly showConfirmation = signal(false);
  readonly confirmationMessage = signal('');
  private pendingService = signal<{
    type: ServiceType;
    characterId: string;
  } | null>(null);

  // Temporary - will be removed in Task 6
  readonly currentView = signal<TempleView>('main');
  readonly selectedCharacterId = signal<string | null>(null);
  readonly selectedService = signal<ServiceType | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

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

  handleMenuSelect(itemId: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    switch (itemId) {
      case 'healing':
        if (this.afflictedCharacters().length === 0) {
          this.errorMessage.set('No afflicted characters in party');
          return;
        }
        this.currentView.set('select-character');
        break;

      case 'castle':
        this.router.navigate(['/castle-menu']);
        break;
    }
  }

  handleCharacterSelect(charId: string): void {
    this.selectedCharacterId.set(charId);
    this.currentView.set('select-service');
  }

  getFilteredCharacters(service: ServiceType): Character[] {
    const afflicted = this.afflictedCharacters();

    switch (service) {
      case ServiceType.CURE_POISON:
        return afflicted.filter(c => c.status === CharacterStatus.POISONED);
      case ServiceType.CURE_PARALYSIS:
        return afflicted.filter(c => c.status === CharacterStatus.PARALYZED);
      case ServiceType.RESURRECT:
        return afflicted.filter(c => c.status === CharacterStatus.DEAD);
      case ServiceType.RESTORE:
        return afflicted.filter(c => c.status === CharacterStatus.ASHES);
      default:
        return afflicted;
    }
  }

  executeService(charId: string, service: ServiceType): void {
    const state = this.gameState.state();
    const character = state.roster.get(charId);

    if (!character) {
      this.errorMessage.set('Character not found');
      return;
    }

    // Check if party can afford (for better error message)
    const tithe = TempleService.calculateTithe(character, service);
    const party = this.currentParty();
    const partyGold = party.gold || 0;

    if (partyGold < tithe) {
      this.errorMessage.set(`Cannot afford service. Need ${tithe} gold.`);
      return;
    }

    // Perform service using TempleService
    const result = TempleService.performService(state, charId, service);

    if (result.success && result.state) {
      // Service succeeded
      this.gameState.updateState(() => result.state!);
      this.successMessage.set(`${character.name} has been cured!`);
    } else if (result.error && result.state) {
      // Service failed but character status changed (resurrection/restoration failure)
      this.gameState.updateState(() => result.state!);
      this.errorMessage.set(result.error);
    } else {
      // Service error (shouldn't happen since we pre-check gold)
      this.errorMessage.set(result.error || 'Service failed');
    }

    this.currentView.set('main');
  }

  cancelView(): void {
    this.currentView.set('main');
    this.selectedCharacterId.set(null);
    this.selectedService.set(null);
  }
}
