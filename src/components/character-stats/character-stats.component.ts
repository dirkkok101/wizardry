import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';
import { CharacterField } from '../../types/CharacterCardTypes';
import { formatStatValue } from '../../helpers/CharacterDisplayHelpers';

@Component({
  selector: 'app-character-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-stats.component.html',
  styleUrls: ['./character-stats.component.scss']
})
export class CharacterStatsComponent {
  @Input() character!: Character;
  @Input() fields!: CharacterField[];
  @Input() layout: 'vertical' | 'horizontal' = 'vertical';

  getFieldLabel(field: CharacterField): string {
    const labels: Record<CharacterField, string> = {
      race: 'Race',
      class: 'Class',
      level: 'Level',
      hp: 'HP',
      ac: 'AC',
      alignment: 'Alignment'
    };
    return labels[field];
  }

  getFieldValue(field: CharacterField): string {
    return formatStatValue(field, this.character);
  }

  isAmberField(field: CharacterField): boolean {
    return field === 'level';
  }
}
