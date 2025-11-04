import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../../types/Character';

@Component({
  selector: 'app-castle-menu-character-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './castle-menu-character-card.component.html',
  styleUrl: './castle-menu-character-card.component.scss'
})
export class CastleMenuCharacterCardComponent {
  @Input({ required: true }) character!: Character;
  @Output() inspect = new EventEmitter<string>();

  onInspect(): void {
    this.inspect.emit(this.character.id);
  }
}
