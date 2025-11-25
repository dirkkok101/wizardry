import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../../../types/Character';
import { CharacterField, CharacterAction, CharacterActionEvent } from '../../../../types/CharacterCardTypes';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { CharacterStatsComponent } from '../character-stats/character-stats.component';
import { CharacterActionsComponent } from '../character-actions/character-actions.component';

/**
 * Combat status for character action selection
 */
export type CombatStatus = 'active' | 'ready' | 'waiting' | null;

@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    CharacterStatsComponent,
    CharacterActionsComponent
  ],
  templateUrl: './character-card.component.html',
  styleUrls: ['./character-card.component.scss']
})
export class CharacterCardComponent {
  @Input() character!: Character;
  @Input() visibleFields?: CharacterField[];
  @Input() actions?: CharacterAction[];
  @Input() variant: 'default' | 'compact' = 'default';
  /** Highlight the card (e.g., active character in combat) */
  @Input() highlighted = false;
  /** Show HP bar below stats */
  @Input() showHpBar = false;
  /** Combat action status indicator */
  @Input() combatStatus: CombatStatus = null;
  /** Status text to display (e.g., selected action in combat) */
  @Input() statusText?: string | null;
  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

  get displayFields(): CharacterField[] {
    if (this.visibleFields === undefined) {
      // Default fields when not specified
      return ['class', 'level', 'hp'];
    }
    return this.visibleFields;
  }

  get hasStats(): boolean {
    return this.displayFields.length > 0;
  }

  get hasActions(): boolean {
    return !!this.actions && this.actions.length > 0;
  }

  get hpPercent(): number {
    if (!this.character || this.character.maxHp <= 0) return 0;
    return Math.max(0, Math.min(100, (this.character.hp / this.character.maxHp) * 100));
  }

  get isDead(): boolean {
    return this.character.hp <= 0;
  }

  get combatStatusIcon(): string {
    switch (this.combatStatus) {
      case 'ready': return '\u2713'; // ✓
      case 'active': return '\u23F3'; // ⏳
      case 'waiting': return '\u23F8'; // ⏸
      default: return '';
    }
  }

  handleActionClick(event: CharacterActionEvent): void {
    this.actionClick.emit(event);
  }
}
