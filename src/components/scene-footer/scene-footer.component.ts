import { Component, input, output } from '@angular/core';
import { MenuComponent, MenuItem } from '../menu/menu.component';

@Component({
  selector: 'app-scene-footer',
  standalone: true,
  imports: [MenuComponent],
  templateUrl: './scene-footer.component.html',
  styleUrl: './scene-footer.component.scss'
})
export class SceneFooterComponent {
  readonly menuItems = input.required<MenuItem[]>();
  readonly itemSelected = output<string>();

  onItemSelected(itemId: string): void {
    this.itemSelected.emit(itemId);
  }
}
