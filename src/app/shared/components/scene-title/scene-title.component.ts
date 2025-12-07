import { Component, input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '@services/GameStateService';
import { VersionDisplayService } from '@services/VersionDisplayService';
import { ActiveSpell } from '@models/active-spell.types';
import { APP_VERSION } from '@config/version';

@Component({
  selector: 'app-scene-title',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scene-title.component.html',
  styleUrl: './scene-title.component.scss'
})
export class SceneTitleComponent {
  private readonly gameStateService = inject(GameStateService);
  private readonly versionDisplayService = inject(VersionDisplayService);

  readonly title = input.required<string>();
  readonly showPartyGold = input<boolean>(false);
  readonly activeSpells = input<ActiveSpell[]>([]);

  // App version for display
  readonly appVersion = APP_VERSION;

  // Version display controlled by global service (toggle with Ctrl+Shift+V)
  readonly showVersion = this.versionDisplayService.showVersion;

  readonly partyGold = computed(() => {
    if (!this.showPartyGold()) return null;
    return this.gameStateService.state().party.gold;
  });
}
