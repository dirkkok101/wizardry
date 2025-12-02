import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { ActiveSpell } from '@models/active-spell.types';

@Component({
  selector: 'app-scene-title',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scene-title.component.html',
  styleUrl: './scene-title.component.scss'
})
export class SceneTitleComponent {
  private gameStateService = inject(GameStateService);

  readonly title = input.required<string>();
  readonly showPartyGold = input<boolean>(false);
  readonly activeSpells = input<ActiveSpell[]>([]);

  readonly partyGold = computed(() => {
    if (!this.showPartyGold()) return null;
    return this.gameStateService.state().party.gold;
  });
}
