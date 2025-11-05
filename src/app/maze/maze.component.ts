import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';

@Component({
  selector: 'app-maze',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './maze.component.html',
  styleUrls: ['./maze.component.scss']
})
export class MazeComponent implements OnInit {
  constructor(
    private readonly gameState: GameStateService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // No scene update - this is a temporary stub
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.returnToCamp();
  }

  returnToCamp(): void {
    this.router.navigate(['/camp']);
  }
}
