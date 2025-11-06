import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveSpell } from '../../types/active-spell.types';

@Component({
  selector: 'app-active-spells',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-spells.component.html',
  styleUrls: ['./active-spells.component.scss']
})
export class ActiveSpellsComponent {
  readonly spells = input.required<ActiveSpell[]>();
}
