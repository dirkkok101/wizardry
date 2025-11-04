import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';
import { CharacterField, CharacterAction, CharacterActionEvent } from '../../types/CharacterCardTypes';
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

  handleActionClick(event: CharacterActionEvent): void {
    this.actionClick.emit(event);
  }
}
