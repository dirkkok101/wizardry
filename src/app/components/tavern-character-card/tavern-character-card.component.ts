// src/app/components/tavern-character-card/tavern-character-card.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../../types/Character';

@Component({
  selector: 'app-tavern-character-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tavern-character-card.component.html',
  styleUrl: './tavern-character-card.component.scss'
})
export class TavernCharacterCardComponent {
  @Input() character!: Character;
  @Input() isInParty: boolean = false;
  @Input() canMoveUp: boolean = true;
  @Input() canMoveDown: boolean = true;

  @Output() add = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() moveUp = new EventEmitter<string>();
  @Output() moveDown = new EventEmitter<string>();
  @Output() inspect = new EventEmitter<string>();

  onAddClick(): void {
    this.add.emit(this.character.id);
  }

  onRemoveClick(): void {
    this.remove.emit(this.character.id);
  }

  onMoveUpClick(): void {
    this.moveUp.emit(this.character.id);
  }

  onMoveDownClick(): void {
    this.moveDown.emit(this.character.id);
  }

  onInspectClick(): void {
    this.inspect.emit(this.character.id);
  }
}
