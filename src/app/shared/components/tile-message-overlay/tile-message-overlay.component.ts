import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  effect,
  signal,
  computed,
} from '@angular/core';

export type TileMessagePhase = 'idle' | 'message' | 'item_reward';

export interface TileMessageItem {
  name: string;
  identified: boolean;
}

/**
 * TileMessageOverlayComponent
 *
 * Displays tile messages in a cinematic letterbox overlay when players
 * inspect tiles or encounter fixed encounters with story text.
 *
 * Uses the established "Theater Stage" pattern from combat/chest overlays:
 * - Letterbox bars slide in from top/bottom
 * - Message text fades in with scale animation
 * - Gold/neutral theme consistent with ENCOUNTER! letterbox
 *
 * Two phases:
 * 1. 'message' - Shows tile message in letterbox
 * 2. 'item_reward' - Shows item found overlay (after message phase)
 *
 * For fixed encounters, auto-dismiss after delay then trigger combat.
 */
@Component({
  selector: 'app-tile-message-overlay',
  standalone: true,
  templateUrl: './tile-message-overlay.component.html',
  styleUrl: './tile-message-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TileMessageOverlayComponent {
  // Inputs
  readonly visible = input(false);
  readonly phase = input<TileMessagePhase>('idle');
  readonly message = input<string>('');
  readonly itemFound = input<TileMessageItem | null>(null);
  readonly autoDismiss = input(false);
  readonly autoDismissDelay = input(2500); // milliseconds

  // Outputs
  readonly dismissed = output<void>();

  // Internal state for animation
  readonly animationKey = signal(0);

  // Computed: item display name (??? if unidentified)
  readonly itemDisplayName = computed(() => {
    const item = this.itemFound();
    if (!item) return '';
    return item.identified ? item.name : '???';
  });

  private autoDismissTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Effect to handle auto-dismiss timer
    effect(() => {
      const visible = this.visible();
      const phase = this.phase();
      const autoDismiss = this.autoDismiss();
      const delay = this.autoDismissDelay();

      // Clear any existing timeout
      if (this.autoDismissTimeout) {
        clearTimeout(this.autoDismissTimeout);
        this.autoDismissTimeout = null;
      }

      // Start auto-dismiss timer if enabled and in message phase
      if (visible && phase === 'message' && autoDismiss) {
        this.autoDismissTimeout = setTimeout(() => {
          this.dismissed.emit();
        }, delay);
      }
    });

    // Effect to trigger animation restart when phase changes
    effect(() => {
      const phase = this.phase();
      if (phase !== 'idle') {
        this.animationKey.update(k => k + 1);
      }
    });
  }

  /**
   * Handle dismiss action (called by parent via keyboard)
   */
  dismiss(): void {
    this.dismissed.emit();
  }
}
