import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/SceneType';

/**
 * Training Grounds Component
 *
 * Character creation service (Phase 4: Scaffolded)
 * - Basic structure and navigation
 * - Placeholder for character creation wizard
 * - Full creation flow in Phase 5
 */
@Component({
  selector: 'app-training-grounds',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training-grounds.component.html',
  styleUrls: ['./training-grounds.component.scss']
})
export class TrainingGroundsComponent implements OnInit {
  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.TRAINING_GROUNDS
    }));
  }

  returnToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }
}
