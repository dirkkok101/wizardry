import { Component, OnInit, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GameStateService } from '../../services/GameStateService';

@Component({
  selector: 'app-spell-casting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spell-casting.component.html',
  styleUrls: ['./spell-casting.component.scss']
})
export class SpellCastingComponent implements OnInit {
  private readonly queryParams;

  readonly characterId = computed(() =>
    this.queryParams()?.['characterId'] || null
  );

  readonly returnTo = computed(() =>
    this.queryParams()?.['returnTo'] || 'castle-menu'
  );

  constructor(
    private readonly gameState: GameStateService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.queryParams = toSignal(this.route.queryParams);
  }

  ngOnInit(): void {
    // No scene update - this is a temporary stub
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.returnToPrevious();
  }

  returnToPrevious(): void {
    this.router.navigate([`/${this.returnTo()}`]);
  }
}
