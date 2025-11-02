import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
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
export class CharacterInspectionComponent implements OnInit {
  // Query params
  readonly characterId = signal<string | null>(null);
  readonly returnTo = signal<string>('castle-menu');

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

    const casterClasses: CharacterClass[] = ['MAGE', 'PRIEST', 'BISHOP', 'SAMURAI', 'LORD'];
    return casterClasses.includes(char.class);
  });

  // Check if character has mage spells
  readonly hasMageSpells = computed(() => {
    const char = this.character();
    if (!char) return false;
    return ['MAGE', 'BISHOP', 'SAMURAI'].includes(char.class);
  });

  // Check if character has priest spells
  readonly hasPriestSpells = computed(() => {
    const char = this.character();
    if (!char) return false;
    return ['PRIEST', 'BISHOP', 'LORD'].includes(char.class);
  });

  constructor(
    private gameState: GameStateService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Subscribe to query params
    this.route.queryParams.subscribe(params => {
      this.characterId.set(params['characterId'] || null);
      this.returnTo.set(params['returnTo'] || 'castle-menu');
    });
  }

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
