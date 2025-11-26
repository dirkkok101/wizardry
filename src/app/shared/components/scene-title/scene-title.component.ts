import { Component, input, computed, inject } from '@angular/core';
import { GameStateService } from '@services/GameStateService';

@Component({
  selector: 'app-scene-title',
  standalone: true,
  templateUrl: './scene-title.component.html',
  styleUrl: './scene-title.component.scss'
})
export class SceneTitleComponent {
  private gameStateService = inject(GameStateService);

  readonly title = input.required<string>();
  readonly showPartyGold = input<boolean>(false);

  readonly partyGold = computed(() => {
    if (!this.showPartyGold()) return null;
    return this.gameStateService.state().party.gold;
  });
}
