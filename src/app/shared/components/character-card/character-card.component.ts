import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '@models/Character';
import { CharacterField, CharacterAction, CharacterActionEvent } from '@models/CharacterCardTypes';
import { SpriteService } from '@services/SpriteService';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { CharacterStatsComponent } from '../character-stats/character-stats.component';
import { CharacterActionsComponent } from '../character-actions/character-actions.component';

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
  /** Status text to display (e.g., selected action in combat) */
  @Input() statusText?: string | null;
  /** Show "X HP to heal" context text when HP < max */
  @Input() showHpContext = false;
  /** Show character sprite thumbnail */
  @Input() showSprite = false;
  /** Size of the sprite thumbnail */
  @Input() spriteSize: 'small' | 'medium' = 'medium';
  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

  /** Get the sprite URL for this character (with fallback) */
  get spriteUrl(): string {
    return SpriteService.getSpriteUrl(this.character);
  }

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

  get hpNeeded(): number {
    return Math.max(0, this.character.maxHp - this.character.hp);
  }

  handleActionClick(event: CharacterActionEvent): void {
    this.actionClick.emit(event);
  }
}
