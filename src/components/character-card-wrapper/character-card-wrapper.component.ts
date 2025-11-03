import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';
import { CharacterCardComponent } from '../character-card/character-card.component';
import { CharacterCardActionsComponent, ActionType } from '../character-card-actions/character-card-actions.component';

@Component({
  selector: 'app-character-card-wrapper',
  standalone: true,
  imports: [CommonModule, CharacterCardComponent, CharacterCardActionsComponent],
  templateUrl: './character-card-wrapper.component.html',
  styleUrl: './character-card-wrapper.component.scss'
})
export class CharacterCardWrapperComponent {
  @Input() character!: Character;
  @Input() actions: ActionType[] = [];
  @Input() disabledActions: ActionType[] = [];

  @Output() inspect = new EventEmitter<void>();
  @Output() add = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();

  onInspect(): void {
    this.inspect.emit();
  }

  onAdd(): void {
    this.add.emit();
  }

  onRemove(): void {
    this.remove.emit();
  }

  onMoveUp(): void {
    this.moveUp.emit();
  }

  onMoveDown(): void {
    this.moveDown.emit();
  }
}
