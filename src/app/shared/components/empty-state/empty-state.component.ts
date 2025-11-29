import { Component, Input } from '@angular/core'

/**
 * Shared empty state component for displaying "no data" messages
 * with consistent styling across all scenes.
 *
 * Variants:
 * - 'default': Full-featured with decorative corners, gradient background, and animation
 * - 'inline': Compact version for list rows/sections with minimal styling
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  /** Main message title (required) */
  @Input({ required: true }) title!: string

  /** Optional subtitle with additional context or guidance */
  @Input() subtitle?: string

  /** Visual variant: 'default' for main areas, 'inline' for compact spaces */
  @Input() variant: 'default' | 'inline' = 'default'
}
