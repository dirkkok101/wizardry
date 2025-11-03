// src/app/components/training-grounds-character-card/training-grounds-character-card.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../../types/Character';
import { CharacterStatus } from '../../../types/CharacterStatus';

/**
 * Training Grounds specific character card component
 *
 * Displays character information in horizontal layout optimized for Training Grounds scene.
 * Layout: 70% info, 30% actions
 * Target height: ~70px
 */
@Component({
  selector: 'app-training-grounds-character-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training-grounds-character-card.component.html',
  styleUrl: './training-grounds-character-card.component.scss'
})
export class TrainingGroundsCharacterCardComponent {
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
