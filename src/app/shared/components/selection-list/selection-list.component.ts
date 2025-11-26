import {
  Component,
  input,
  output,
  signal,
  computed,
  HostListener,
  TemplateRef,
  ContentChild
} from '@angular/core'
import { CommonModule } from '@angular/common'

/**
 * Base interface for selectable options.
 * Consumers can extend this with additional properties.
 */
export interface SelectableOption {
  id: string
  shortcut: string // Single key like 'A', '1', 'S'
  enabled: boolean
}

/**
 * Context passed to the item template for rendering.
 */
export interface SelectionItemContext<T extends SelectableOption> {
  $implicit: T
  index: number
  selected: boolean
}

/**
 * SelectionListComponent
 *
 * A reusable component for displaying a list of selectable options with
 * keyboard and mouse support. Uses content projection for custom item rendering.
 *
 * Features:
 * - Arrow key navigation (optional, skips disabled items)
 * - Direct shortcut key selection (e.g., press 'A' to select option with shortcut 'A')
 * - Mouse click selection
 * - Hover state tracking
 * - ESC to cancel
 * - Enter to confirm current selection
 *
 * Usage:
 * ```html
 * <app-selection-list
 *   [options]="roomOptions"
 *   [allowArrowNavigation]="true"
 *   (optionSelected)="onRoomSelected($event)"
 *   (cancelled)="onCancel()">
 *   <ng-template #itemTemplate let-option let-index="index" let-selected="selected">
 *     <div class="my-item" [class.selected]="selected">
 *       {{ option.name }}
 *     </div>
 *   </ng-template>
 * </app-selection-list>
 * ```
 */
@Component({
  selector: 'app-selection-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selection-list.component.html',
  styleUrls: ['./selection-list.component.scss']
})
export class SelectionListComponent<T extends SelectableOption> {
  // Inputs
  readonly options = input<T[]>([])
  readonly allowArrowNavigation = input(true)
  readonly initialSelectedIndex = input(0)
  readonly showShortcutsInList = input(true)

  // Outputs
  readonly optionSelected = output<T>()
  readonly cancelled = output<void>()
  readonly selectionChanged = output<number>()

  // Content projection for custom item template
  @ContentChild('itemTemplate') itemTemplate!: TemplateRef<SelectionItemContext<T>>

  // Internal state
  readonly selectedIndex = signal(0)
  readonly hoveredIndex = signal<number | null>(null)

  // Computed: enabled options for navigation
  readonly enabledIndices = computed(() => {
    return this.options()
      .map((opt, idx) => ({ opt, idx }))
      .filter(({ opt }) => opt.enabled)
      .map(({ idx }) => idx)
  })

  // Computed: current selected option
  readonly selectedOption = computed(() => {
    const opts = this.options()
    const idx = this.selectedIndex()
    return opts[idx] ?? null
  })

  constructor() {
    // Initialize selected index to first enabled option
    queueMicrotask(() => {
      const initial = this.initialSelectedIndex()
      const enabled = this.enabledIndices()
      if (enabled.length > 0) {
        // Use initial if it's enabled, otherwise first enabled
        if (enabled.includes(initial)) {
          this.selectedIndex.set(initial)
        } else {
          this.selectedIndex.set(enabled[0])
        }
      }
    })
  }

  /**
   * Handle keyboard input for navigation and selection.
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const key = event.key

    // ESC to cancel
    if (key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      this.cancelled.emit()
      return
    }

    // Enter to select current
    if (key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      this.selectCurrentOption()
      return
    }

    // Arrow navigation (if enabled)
    if (this.allowArrowNavigation()) {
      if (key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        this.navigateNext()
        return
      }
      if (key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        this.navigatePrevious()
        return
      }
    }

    // Direct shortcut selection
    this.handleShortcutKey(event)
  }

  /**
   * Handle direct shortcut key presses (e.g., 'A', '1', 'S').
   */
  private handleShortcutKey(event: KeyboardEvent): void {
    const key = event.key.toUpperCase()
    const options = this.options()

    const matchIndex = options.findIndex(
      opt => opt.shortcut.toUpperCase() === key && opt.enabled
    )

    if (matchIndex !== -1) {
      event.preventDefault()
      event.stopPropagation()
      this.selectOption(options[matchIndex], matchIndex)
    }
  }

  /**
   * Navigate to next enabled option.
   */
  navigateNext(): void {
    const enabled = this.enabledIndices()
    if (enabled.length === 0) return

    const current = this.selectedIndex()
    const currentPos = enabled.indexOf(current)

    let nextPos: number
    if (currentPos === -1 || currentPos >= enabled.length - 1) {
      // Wrap to first
      nextPos = 0
    } else {
      nextPos = currentPos + 1
    }

    this.selectedIndex.set(enabled[nextPos])
    this.selectionChanged.emit(enabled[nextPos])
  }

  /**
   * Navigate to previous enabled option.
   */
  navigatePrevious(): void {
    const enabled = this.enabledIndices()
    if (enabled.length === 0) return

    const current = this.selectedIndex()
    const currentPos = enabled.indexOf(current)

    let prevPos: number
    if (currentPos === -1 || currentPos <= 0) {
      // Wrap to last
      prevPos = enabled.length - 1
    } else {
      prevPos = currentPos - 1
    }

    this.selectedIndex.set(enabled[prevPos])
    this.selectionChanged.emit(enabled[prevPos])
  }

  /**
   * Select the currently highlighted option.
   */
  selectCurrentOption(): void {
    const option = this.selectedOption()
    if (option && option.enabled) {
      this.optionSelected.emit(option)
    }
  }

  /**
   * Select a specific option (from click or shortcut).
   */
  selectOption(option: T, index: number): void {
    if (!option.enabled) return

    this.selectedIndex.set(index)
    this.optionSelected.emit(option)
  }

  /**
   * Handle mouse click on an option.
   */
  onOptionClick(option: T, index: number): void {
    this.selectOption(option, index)
  }

  /**
   * Handle mouse enter on an option.
   */
  onOptionMouseEnter(index: number): void {
    this.hoveredIndex.set(index)
    // Also update selection on hover for visual feedback
    const option = this.options()[index]
    if (option?.enabled) {
      this.selectedIndex.set(index)
    }
  }

  /**
   * Handle mouse leave on an option.
   */
  onOptionMouseLeave(): void {
    this.hoveredIndex.set(null)
  }

  /**
   * Get template context for an option.
   */
  getItemContext(option: T, index: number): SelectionItemContext<T> {
    return {
      $implicit: option,
      index,
      selected: this.selectedIndex() === index
    }
  }
}
