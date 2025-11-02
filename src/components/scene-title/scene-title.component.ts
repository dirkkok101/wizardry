import { Component, input } from '@angular/core';

@Component({
  selector: 'app-scene-title',
  standalone: true,
  templateUrl: './scene-title.component.html',
  styleUrl: './scene-title.component.scss'
})
export class SceneTitleComponent {
  readonly title = input.required<string>();
}
