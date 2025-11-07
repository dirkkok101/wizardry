import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { MenuItem } from '../../components/menu/menu.component';

@Component({
  selector: 'app-combat-stub',
  standalone: true,
  imports: [CommonModule, SceneTitleComponent, SceneFooterComponent],
  templateUrl: './combat-stub.component.html',
  styleUrls: ['./combat-stub.component.scss']
})
export class CombatStubComponent {
  readonly footerMenuItems: MenuItem[] = [
    { id: 'return', label: 'Return to Maze (ESC)', shortcut: 'ESC', enabled: true }
  ];

  constructor(private router: Router) {}

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.router.navigate(['/maze']);
  }

  handleFooterAction(action: string): void {
    if (action === 'return') {
      this.router.navigate(['/maze']);
    }
  }
}
