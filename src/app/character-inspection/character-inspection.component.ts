import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GameStateService } from '../../services/GameStateService';
import { Character } from '../../types/Character';
import { CharacterClass } from '../../types/CharacterClass';

/**
 * Character Inspection Component
 *
 * Displays full character sheet including:
 * - Basic info (name, class, level, alignment)
 * - Stats (STR, INT, PIE, VIT, AGI, LUK)
 * - Status (HP/MaxHP, Gold, XP, Status)
 * - Equipment (weapon, armor)
 * - Inventory (8 slots)
 * - Spells (for casters only)
 *
 * Context-aware: Returns to correct scene (tavern, castle-menu, etc.)
 */
@Component({
  selector: 'app-character-inspection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-inspection.component.html',
  styleUrls: ['./character-inspection.component.scss']
})
export class CharacterInspectionComponent {
  // Inject dependencies using inject() for use in field initializers
  private readonly gameState = inject(GameStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Query params (auto-managed with toSignal)
  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: {} as Record<string, string>
  });

  readonly characterId = computed(() =>
    this.queryParams()['characterId'] || null
  );

  readonly returnTo = computed(() =>
    this.queryParams()['returnTo'] || 'castle-menu'
  );

  // Character data
  readonly character = computed(() => {
    const id = this.characterId();
    if (!id) return null;
    return this.gameState.state().roster.get(id) || null;
  });

  // Inventory slots (8 max)
  readonly inventorySlots = computed(() => {
    const char = this.character();
    if (!char) return [];

    const slots = new Array(8).fill(null);
    char.inventory.forEach((item, index) => {
      if (index < 8) {
        slots[index] = item;
      }
    });
    return slots;
  });

  // Check if character is a spellcaster
  readonly isSpellcaster = computed(() => {
    const char = this.character();
    if (!char) return false;

    const casterClasses: CharacterClass[] = [
      CharacterClass.MAGE,
      CharacterClass.PRIEST,
      CharacterClass.BISHOP,
      CharacterClass.SAMURAI,
      CharacterClass.LORD
    ];
    return casterClasses.includes(char.class);
  });

  // Check if character has mage spells
  readonly hasMageSpells = computed(() => {
    const char = this.character();
    if (!char) return false;
    return [CharacterClass.MAGE, CharacterClass.BISHOP, CharacterClass.SAMURAI].includes(char.class);
  });

  // Check if character has priest spells
  readonly hasPriestSpells = computed(() => {
    const char = this.character();
    if (!char) return false;
    return [CharacterClass.PRIEST, CharacterClass.BISHOP, CharacterClass.LORD].includes(char.class);
  });


  /**
   * Navigate back to the previous scene
   */
  returnToPrevious(): void {
    this.router.navigate([`/${this.returnTo()}`]);
  }

  /**
   * Get status color based on character status
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'OK':
        return 'status-ok';
      case 'DEAD':
      case 'ASHES':
      case 'LOST':
        return 'status-dead';
      case 'PARALYZED':
      case 'STONED':
      case 'POISONED':
      case 'ASLEEP':
        return 'status-afflicted';
      default:
        return '';
    }
  }

  /**
   * Format item display (handles both string IDs and Item objects)
   */
  formatItem(item: string | any): string {
    if (!item) return 'Empty';
    if (typeof item === 'string') return item;
    return item.name || 'Unknown Item';
  }
}
