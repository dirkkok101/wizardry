import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';

/**
 * CharacterCard Component - Presentational component for displaying character data
 *
 * Responsibilities:
 * - Display character information (name, race, class, level, status)
 * - Emit events for user actions (inspect, delete)
 * - No service injection (pure presentation)
 */
@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-card.component.html',
  styleUrls: ['./character-card.component.scss']
})
export class CharacterCardComponent {
  @Input() character!: Character;
  @Input() status!: CharacterStatus;

  @Output() inspect = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  onInspect(): void {
    this.inspect.emit(this.character.id);
  }

  onDelete(): void {
    this.delete.emit(this.character.id);
  }
}
