import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterAction, CharacterActionEvent } from '@types/CharacterCardTypes';
import { getDefaultActionLabel } from '@utils/CharacterDisplayHelpers';

@Component({
  selector: 'app-character-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-actions.component.html',
  styleUrls: ['./character-actions.component.scss']
})
export class CharacterActionsComponent {
  @Input() actions!: CharacterAction[];
  @Input() characterId!: string;
  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

  getButtonLabel(action: CharacterAction): string {
    return action.label || getDefaultActionLabel(action.type);
  }

  isEnabled(action: CharacterAction): boolean {
    return action.enabled !== false;
  }

  getVariant(action: CharacterAction): string {
    return action.variant || 'default';
  }

  handleClick(action: CharacterAction): void {
    if (this.isEnabled(action)) {
      this.actionClick.emit({
        characterId: this.characterId,
        actionType: action.type
      });
    }
  }
}
