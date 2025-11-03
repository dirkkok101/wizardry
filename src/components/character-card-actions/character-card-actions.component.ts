import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ActionType = 'inspect' | 'add' | 'remove' | 'moveUp' | 'moveDown';

@Component({
  selector: 'app-character-card-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-card-actions.component.html',
  styleUrl: './character-card-actions.component.scss'
})
export class CharacterCardActionsComponent {
  @Input() actions: ActionType[] = [];
  @Input() disabledActions: ActionType[] = [];

  @Output() inspectClick = new EventEmitter<void>();
  @Output() addClick = new EventEmitter<void>();
  @Output() removeClick = new EventEmitter<void>();
  @Output() moveUpClick = new EventEmitter<void>();
  @Output() moveDownClick = new EventEmitter<void>();

  getButtonLabel(action: ActionType): string {
    const labels: Record<ActionType, string> = {
      inspect: 'Inspect',
      add: 'Add',
      remove: 'Remove',
      moveUp: '↑',
      moveDown: '↓'
    };
    return labels[action];
  }

  isDisabled(action: ActionType): boolean {
    return this.disabledActions.includes(action);
  }

  handleClick(action: ActionType): void {
    const emitters: Record<ActionType, EventEmitter<void>> = {
      inspect: this.inspectClick,
      add: this.addClick,
      remove: this.removeClick,
      moveUp: this.moveUpClick,
      moveDown: this.moveDownClick
    };
    emitters[action].emit();
  }
}
