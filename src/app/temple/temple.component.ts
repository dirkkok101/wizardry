import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { TempleService } from '../../services/TempleService';
import { ResurrectionService } from '../../services/ResurrectionService';
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
import { CharacterListComponent } from '../../components/character-list/character-list.component';
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
  imports: [CommonModule, MenuComponent, CharacterListComponent],
  templateUrl: './temple.component.html',
  styleUrls: ['./temple.component.scss']
})
export class TempleComponent implements OnInit {
  readonly menuItems: MenuItem[] = [
    { id: 'healing', label: 'HEALING SERVICES', enabled: true, shortcut: 'H' },
    { id: 'castle', label: 'RETURN TO CASTLE', enabled: true, shortcut: 'C' }
  ];

  // View state
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
    const party = this.currentParty();

    if (!character) {
      this.errorMessage.set('Character not found');
      return;
    }

    // Calculate tithe (cost)
    const tithe = TempleService.calculateTithe(character, service);
    const partyGold = party.gold || 0;

    // Check if party can afford
    if (partyGold < tithe) {
      this.errorMessage.set(`Cannot afford service. Need ${tithe} gold.`);
      return;
    }

    // Attempt service
    const success = ResurrectionService.attemptService(character, service);

    // Update character status based on service and result
    let newStatus = character.status;
    let message = '';

    if (success) {
      switch (service) {
        case ServiceType.CURE_POISON:
        case ServiceType.CURE_PARALYSIS:
        case ServiceType.RESURRECT:
        case ServiceType.RESTORE:
          newStatus = CharacterStatus.OK;
          message = `${character.name} has been cured!`;
          break;
      }
    } else {
      // Handle failures
      if (service === ServiceType.RESURRECT) {
        newStatus = CharacterStatus.ASHES;
        message = `Resurrection failed. ${character.name} has turned to ashes.`;
      } else if (service === ServiceType.RESTORE) {
        newStatus = CharacterStatus.LOST;
        message = `Restoration failed. ${character.name} is lost forever.`;
      }
    }

    // Update game state
    this.gameState.updateState(state => ({
      ...state,
      roster: new Map(state.roster).set(charId, {
        ...character,
        status: newStatus
      }),
      party: {
        ...state.party,
        gold: partyGold - tithe
      }
    }));

    if (success) {
      this.successMessage.set(message);
    } else {
      this.errorMessage.set(message);
    }

    this.currentView.set('main');
  }

  cancelView(): void {
    this.currentView.set('main');
    this.selectedCharacterId.set(null);
    this.selectedService.set(null);
  }
}
