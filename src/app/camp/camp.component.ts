import { Component, OnInit, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { SceneType } from '../../types/SceneType';
import { Character } from '../../types/Character';
import { CharacterAction, CharacterActionEvent } from '../../components/character-card/character-card.component';
import { MenuItem } from '../../components/scene-footer/scene-footer.component';

@Component({
  selector: 'app-camp',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent
  ],
  templateUrl: './camp.component.html',
  styleUrls: ['./camp.component.scss']
})
export class CampComponent implements OnInit {
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly gameState: GameStateService,
    private readonly saveService: SaveService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Update scene
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CAMP
    }));

    // Auto-save on entry
    this.saveService.saveGame(this.gameState.state(), 1);
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.returnToCastle();
  }

  returnToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }
}
