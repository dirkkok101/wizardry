import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '@shared/components/scene-title/scene-title.component';
import { SceneFooterComponent } from '@shared/components/scene-footer/scene-footer.component';
import { CharacterPanelComponent } from '@shared/components/character-panel/character-panel.component';
import { MessageLogComponent } from '@shared/components/message-log/message-log.component';
import {
  FloatingDamageComponent,
  FloatingDamageEntry,
  createFloatingDamage,
  DamageType
} from '@shared/components/floating-damage/floating-damage.component';
import { MenuItem } from '@shared/components/menu/menu.component';
import { GameStateService } from '@services/GameStateService';
import { MessageLogService } from '@services/MessageLogService';
import { LightService } from '@services/LightService';
import { SpriteService } from '@services/SpriteService';
import { EncounterService } from '@services/EncounterService';
import { EncounterTriggerService } from '@services/EncounterTriggerService';
import { TrapEffectService } from '@services/trap/TrapEffectService';
import { GameStateQueries } from '@utils/GameStateQueries';
import { Character } from '@models/Character';
import { CharacterAction } from '@models/CharacterCardTypes';
import { CharacterStatus } from '@models/CharacterStatus';
import { ActiveSpell } from '@models/active-spell.types';
import { PendingTrapResult } from '@models/GameState';
import { ANIMATION_TIMINGS } from '@config/AnimationTimings';
import { ARENA_TIMING } from '@shared/components/cinematic-arena/cinematic-arena.types';

/** Trap effect for sequential display */
interface TrapEffect {
  characterId: string;
  characterName: string;
  spriteUrl: string;
  className: string;
  currentHp: number;
  maxHp: number;
  damage: number;
  status: CharacterStatus | null;
}

/**
 * ChestPlaybackComponent - Trap animation playback with arena-style cards.
 *
 * Uses a combat-like card-by-card presentation:
 * - Left side: Trap card with icon and name
 * - Right side: Character portrait (cycles through affected characters)
 * - Center: Action labels and damage display
 * - Floating damage numbers and shake animations
 *
 * Layout matches other maze scenes: 3-column with character panels + viewport + message log.
 */
@Component({
  selector: 'app-chest-playback',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterPanelComponent,
    MessageLogComponent,
    FloatingDamageComponent
  ],
  template: `
    <div class="chest-playback">
      <!-- Title with Active Spells -->
      <app-scene-title title="Trap Triggered" [activeSpells]="activeSpells()"></app-scene-title>

      <!-- 3-Column Layout -->
      <div class="maze-content">
        <!-- Left Column: Positions 0, 2, 4 -->
        <div class="left-panel">
          <app-character-panel
            [characters]="leftColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="[]"
            [statusTexts]="characterStatusTexts()"
            [showSprites]="true"
          />
        </div>

        <!-- Center Column: Viewport + Message Log -->
        <div class="center-panel">
          <div class="maze-viewport">
            <!-- Trap Arena - matches cinematic-arena structure -->
            <div class="trap-arena" [class.playing]="showArena()">
              <!-- Vignette Effect -->
              <div class="trap-vignette"></div>

              <!-- Arena Content -->
              <div class="arena-content" [class.visible]="showArena()">
                <!-- Arena Stage - Grid layout -->
                <div class="arena-stage">
                  <!-- Trap Card (Left) -->
                  <div class="combatant-panel trap-panel">
                    <div class="trap-card">
                      @if (!trapSpriteError()) {
                        <img
                          [src]="trapSpriteUrl()"
                          [alt]="trapName()"
                          class="trap-sprite-image"
                          (error)="onTrapSpriteError()"
                        />
                      } @else {
                        <div class="trap-sprite-placeholder">⚠</div>
                      }
                      <div class="trap-card-name">{{ trapName() }}</div>
                    </div>
                  </div>

                  <!-- Action Center -->
                  <div class="action-center">
                    <div class="trap-label" [class.visible]="showTrapLabel()">
                      {{ trapName() }}
                    </div>
                    <div class="action-verb" [class.visible]="showActionVerb()">
                      STRIKES!
                    </div>
                    <div class="outcome-label" [class.visible]="showOutcome()"
                         [class.damage]="currentEffect()?.damage"
                         [class.status]="currentEffect()?.status">
                      {{ outcomeText() }}
                    </div>
                  </div>

                  <!-- Character Card (Right) -->
                  @if (currentEffect(); as effect) {
                    <div class="combatant-panel target-panel" [class.shaking]="isShaking()">
                      <div class="portrait-card character">
                        @if (!spriteError()) {
                          <img
                            [src]="effect.spriteUrl"
                            [alt]="effect.characterName"
                            class="portrait-image"
                            (error)="onSpriteError()"
                          />
                        } @else {
                          <div class="portrait-fallback">
                            {{ effect.characterName.charAt(0) }}
                          </div>
                        }
                        <!-- Top overlay: Class + HP -->
                        <div class="portrait-top-overlay">
                          <span class="stat-left class-badge">{{ effect.className }}</span>
                          <span class="stat-right hp-display"
                                [class.warning]="isHpWarning(effect)"
                                [class.critical]="isHpCritical(effect)">
                            {{ getLiveHp(effect) }}/{{ effect.maxHp }}
                          </span>
                        </div>
                        <!-- Bottom overlay: Name -->
                        <div class="portrait-name-overlay">{{ effect.characterName }}</div>
                      </div>
                    </div>
                  } @else {
                    <!-- Empty target placeholder -->
                    <div class="combatant-panel target-panel empty">
                      <div class="portrait-card placeholder">
                        <div class="empty-target-text">Waiting...</div>
                      </div>
                    </div>
                  }
                </div>

                <!-- Status message -->
                <div class="status-message" [class.visible]="showStatus()">
                  {{ statusMessage() }}
                </div>
              </div>

              <!-- Floating Damage Layer -->
              <app-floating-damage
                [entries]="damageEntries()"
                (entryComplete)="onDamageComplete($event)"
              />
            </div>
          </div>

          <!-- Message log below viewport -->
          <div class="message-log-section">
            <app-message-log [messages]="messages()" />
          </div>
        </div>

        <!-- Right Column: Positions 1, 3, 5 -->
        <div class="right-panel">
          <app-character-panel
            [characters]="rightColumnCharacters()"
            [actions]="getActionsForCharacter"
            [visibleActionTypes]="[]"
            [statusTexts]="characterStatusTexts()"
            [showSprites]="true"
          />
        </div>
      </div>

      <!-- Footer Menu -->
      <app-scene-footer
        [menuItems]="footerMenuItems()"
        (itemSelected)="handleMenuAction($event)"
      />
    </div>
  `,
  styles: [`
    /* ============================================
       MAIN CONTAINER - matches combat-playback
       ============================================ */
    .chest-playback {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: transparent;
      color: var(--color-text-primary);
      font-family: var(--font-body);
      padding: 0.5rem;
      box-sizing: border-box;
      overflow: hidden;
    }

    :host ::ng-deep app-scene-title,
    :host ::ng-deep app-scene-footer {
      display: block;
      flex-shrink: 0;
    }

    /* ============================================
       3-COLUMN LAYOUT - matches combat-playback
       ============================================ */
    .maze-content {
      display: grid;
      grid-template-columns: minmax(200px, var(--scene-panel-max-width)) auto minmax(200px, var(--scene-panel-max-width));
      gap: 0.5rem;
      flex: 1;
      min-height: 0;
    }

    @media (min-width: 2000px) {
      .maze-content {
        grid-template-columns: minmax(350px, var(--scene-panel-max-width-4k)) auto minmax(350px, var(--scene-panel-max-width-4k));
      }
    }

    .left-panel,
    .right-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      max-width: var(--scene-panel-max-width);
      align-self: start;
    }

    @media (min-width: 2000px) {
      .left-panel,
      .right-panel {
        max-width: var(--scene-panel-max-width-4k);
      }
    }

    :host ::ng-deep .left-panel app-character-panel,
    :host ::ng-deep .right-panel app-character-panel {
      display: flex;
      flex-direction: column;
      flex: 1;
      width: 100%;
      min-height: 0;
    }

    .center-panel {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-height: 0;
      min-width: 0;
      align-items: center;
      overflow: visible;
      padding: 0.5rem 2px;
    }

    .maze-viewport {
      position: relative;
      flex: 1;
      min-height: 0;
      width: 100%;
      aspect-ratio: var(--scene-viewport-aspect) / 1;
      max-width: 100%;
      background: #000;
      border: 1px solid var(--color-gold-primary);
      border-radius: 4px;
      overflow: hidden;
    }

    .message-log-section {
      width: 100%;
      height: 120px;
      min-height: 90px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 0.1rem 0.25rem;
      background: var(--color-bg-card);
      flex-shrink: 0;
      box-sizing: border-box;
    }

    :host ::ng-deep .message-log-section app-message-log {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    /* ============================================
       TRAP ARENA - fills viewport (cinematic-arena style)
       ============================================ */
    .trap-arena {
      position: absolute;
      inset: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;

      &.playing {
        opacity: 1;
      }
    }

    /* ============================================
       VIGNETTE EFFECT - Subtle red tint for danger
       ============================================ */
    .trap-vignette {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(
        ellipse at center,
        transparent 30%,
        rgba(139, 0, 0, 0.15) 70%,
        rgba(139, 0, 0, 0.35) 100%
      );
      z-index: 0;
    }

    /* ============================================
       ARENA CONTENT - Dark background
       ============================================ */
    .arena-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: rgba(0, 0, 0, 0.85);
      position: relative;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.3s ease;

      &.visible {
        opacity: 1;
      }
    }

    /* ============================================
       ARENA STAGE - Grid layout like cinematic-arena
       ============================================ */
    .arena-stage {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: var(--space-3, 0.75rem);
      padding: var(--space-3, 0.75rem) var(--space-6, 1.5rem);
      padding-top: var(--space-2, 0.5rem);
    }

    /* ============================================
       COMBATANT PANELS - Match cinematic-arena
       ============================================ */
    .combatant-panel {
      display: flex;
      align-items: center;
    }

    .trap-panel {
      justify-content: flex-end;
      animation: slide-in-left 0.4s ease-out;
    }

    .target-panel {
      justify-content: flex-start;
      animation: slide-in-right 0.4s ease-out;

      &.shaking {
        animation: hit-shake 0.3s ease-out;
      }

      &.empty {
        opacity: 0.5;
      }
    }

    @keyframes slide-in-left {
      from { opacity: 0; transform: translateX(-60px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes slide-in-right {
      from { opacity: 0; transform: translateX(60px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes hit-shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-12px); }
      40% { transform: translateX(12px); }
      60% { transform: translateX(-8px); }
      80% { transform: translateX(8px); }
    }

    /* ============================================
       TRAP CARD - 180x180 like cinematic-arena portraits
       ============================================ */
    .trap-card {
      width: 180px;
      height: 180px;
      background: rgba(10, 10, 10, 0.95);
      border: 3px solid var(--color-danger, #ff4444);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.6),
        0 0 20px rgba(255, 68, 68, 0.3);
    }

    /* Trap sprite image - full bleed like character portraits */
    .trap-sprite-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }

    /* Placeholder for trap sprite (fallback when image fails to load) */
    .trap-sprite-placeholder {
      font-size: 5rem;
      color: #ff6b6b;
      filter: drop-shadow(0 0 15px rgba(255, 100, 100, 0.8));
      animation: pulse-glow 1.5s ease-in-out infinite alternate;
    }

    @keyframes pulse-glow {
      from { filter: drop-shadow(0 0 10px rgba(255, 100, 100, 0.5)); }
      to { filter: drop-shadow(0 0 25px rgba(255, 100, 100, 1)); }
    }

    /* Trap name overlay - matches portrait-name-overlay style */
    .trap-card-name {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0.4rem;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 100%);
      font-family: var(--font-body);
      font-size: var(--font-size-xs, 0.75rem);
      color: #ff6b6b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
      z-index: 2;
    }

    /* ============================================
       CHARACTER PORTRAIT CARD - 180x180 like cinematic-arena
       ============================================ */
    .portrait-card {
      width: 180px;
      height: 180px;
      background: rgba(10, 10, 10, 0.95);
      border: 3px solid var(--color-border);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.05);

      &.character {
        border-color: var(--color-cast, #4ecdc4);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.6),
          0 0 20px rgba(78, 205, 196, 0.2);
      }
    }

    .portrait-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
    }

    .portrait-fallback {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 4rem;
      font-weight: bold;
      color: var(--color-text-gold);
      background: var(--color-bg-dark, #1a1a1a);
    }

    .portrait-top-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      padding: 0.4rem 0.5rem;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.75) 0%, transparent 100%);
      font-family: var(--font-body);
      font-size: var(--font-size-xs, 0.75rem);
      z-index: 2;
    }

    .stat-left, .stat-right {
      font-weight: bold;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
    }

    .class-badge {
      color: var(--color-cast, #4ecdc4);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .hp-display {
      color: var(--color-hp-healthy);

      &.warning {
        color: var(--color-hp-warning);
      }

      &.critical {
        color: var(--color-hp-critical);
        animation: hp-pulse 0.5s ease-in-out infinite;
      }
    }

    @keyframes hp-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .portrait-name-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0.4rem;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, transparent 100%);
      font-family: var(--font-body);
      font-size: var(--font-size-xs, 0.75rem);
      color: var(--color-text-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
      z-index: 2;
    }

    /* Placeholder card styling */
    .portrait-card.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(10, 10, 10, 0.7);
      border-color: var(--color-border);
    }

    .empty-target-text {
      font-family: var(--font-display);
      font-size: var(--font-size-lg, 1.125rem);
      color: var(--color-text-muted);
      font-style: italic;
    }

    /* ============================================
       ACTION CENTER - Match cinematic-arena exactly
       ============================================ */
    .action-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-2, 0.5rem);
      min-width: 200px;
      padding: var(--space-2, 0.5rem);
      height: 100%;
    }

    .trap-label {
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: bold;
      color: #ff6b6b;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      text-shadow:
        0 0 15px rgba(255, 107, 107, 0.5),
        0 0 30px rgba(255, 107, 107, 0.3);
      opacity: 0;
      transition: opacity 0.3s ease;

      &.visible {
        opacity: 1;
        animation: label-slide-in 0.3s ease-out;
      }
    }

    @keyframes label-slide-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .action-verb {
      font-family: var(--font-display);
      font-size: 1rem;
      color: var(--color-text-primary);
      letter-spacing: 0.2em;
      text-transform: uppercase;
      opacity: 0;

      &.visible {
        opacity: 1;
        animation: verb-pulse 0.8s ease-in-out infinite;
      }
    }

    @keyframes verb-pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    .outcome-label {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: bold;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      opacity: 0;
      transition: opacity 0.2s ease;

      &.visible {
        opacity: 1;
        animation: outcome-burst 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      &.damage {
        color: #ff6b6b;
        text-shadow:
          0 0 15px rgba(255, 107, 107, 0.6),
          0 0 30px rgba(255, 107, 107, 0.3);
      }

      &.status {
        color: var(--color-magic, #a855f7);
        text-shadow:
          0 0 15px rgba(168, 85, 247, 0.6),
          0 0 30px rgba(168, 85, 247, 0.3);
      }
    }

    @keyframes outcome-burst {
      0% { opacity: 0; transform: scale(0.5); }
      50% { transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }

    /* ============================================
       STATUS MESSAGE - Bottom of arena content
       ============================================ */
    .status-message {
      position: absolute;
      bottom: var(--space-4, 1rem);
      left: 0;
      right: 0;
      text-align: center;
      font-family: var(--font-body);
      font-size: 0.9rem;
      color: var(--color-text-secondary);
      opacity: 0;
      transition: opacity 0.3s ease;

      &.visible {
        opacity: 1;
      }
    }

    /* ============================================
       RESPONSIVE - 2K+ displays
       ============================================ */
    @media (min-width: 2000px) {
      .trap-card,
      .portrait-card {
        width: 360px;
        height: 360px;
      }

      .trap-sprite-placeholder {
        font-size: 8rem;
      }

      .trap-label {
        font-size: 2rem;
      }

      .action-verb {
        font-size: 1.5rem;
      }

      .outcome-label {
        font-size: 1.75rem;
      }

      .action-center {
        min-width: 320px;
      }
    }

    /* ============================================
       COMPACT HEIGHT RESPONSIVE
       ============================================ */
    @media (max-height: 767px) {
      .chest-playback {
        padding: 0.25rem;
      }

      .maze-content {
        gap: 0.35rem;
      }

      .message-log-section {
        height: 80px;
        min-height: 70px;
        padding: 0.25rem;
      }

      .trap-card,
      .portrait-card {
        width: 140px;
        height: 140px;
      }

      .trap-sprite-placeholder {
        font-size: 3.5rem;
      }

      .trap-label {
        font-size: 1.2rem;
      }

      .action-center {
        min-width: 160px;
      }
    }

    @media (max-height: 599px) {
      .message-log-section {
        height: 65px;
      }

      .trap-card,
      .portrait-card {
        width: 120px;
        height: 120px;
      }

      .trap-sprite-placeholder {
        font-size: 3rem;
      }
    }
  `]
})
export class ChestPlaybackComponent implements OnInit, OnDestroy {
  // Animation state
  readonly showArena = signal(false);
  readonly showTrapLabel = signal(false);
  readonly showActionVerb = signal(false);
  readonly showOutcome = signal(false);
  readonly showStatus = signal(false);
  readonly statusMessage = signal('');
  readonly isShaking = signal(false);
  readonly spriteError = signal(false);
  readonly trapSpriteError = signal(false);

  // Floating damage
  readonly damageEntries = signal<FloatingDamageEntry[]>([]);

  // Current effect being displayed
  readonly currentEffect = signal<TrapEffect | null>(null);
  readonly outcomeText = signal('');

  // Live HP tracking (updated as damage is applied)
  private liveHpMap = new Map<string, number>();

  // Timeout cleanup for memory leak prevention
  private pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

  // Trap info from GameState
  readonly pendingTrap = computed(() => this.gameState.state().pendingTrapResult);
  readonly trapName = computed(() => this.pendingTrap()?.trapName ?? '');

  // Trap sprite URL - converts trap name to sprite path
  // e.g., "POISON_NEEDLE" -> "/assets/sprites/traps/poison_needle.png"
  readonly trapSpriteUrl = computed(() => {
    const trap = this.pendingTrap();
    if (!trap) return '';
    // Convert trap ID to snake_case filename (e.g., POISON_NEEDLE -> poison_needle)
    const filename = trap.trapId.toLowerCase();
    return `/assets/sprites/traps/${filename}.png`;
  });

  // Party characters
  readonly partyCharacters = computed(() => {
    const state = this.gameState.state();
    return GameStateQueries.partyCharacters(state);
  });

  // 3-column layout: left column gets positions 0, 2, 4
  readonly leftColumnCharacters = computed(() => {
    const party = this.partyCharacters();
    return party.filter((_, i) => i % 2 === 0);
  });

  // 3-column layout: right column gets positions 1, 3, 5
  readonly rightColumnCharacters = computed(() => {
    const party = this.partyCharacters();
    return party.filter((_, i) => i % 2 === 1);
  });

  // Dungeon state for active spells
  readonly dungeonState = computed(() => this.gameState.state().dungeon);

  // Active spells (MILWA, LOMILWA, etc.)
  readonly activeSpells = computed((): ActiveSpell[] => {
    const dungeon = this.dungeonState();
    if (!dungeon) return [];

    const spells: ActiveSpell[] = [];

    if (dungeon.lightActive && dungeon.lightSpellType) {
      const viewDistance = LightService.getEffectiveViewDistance(dungeon);
      const durationText = dungeon.lightDurationRemaining !== undefined
        ? ` (${dungeon.lightDurationRemaining} steps)`
        : '';
      spells.push({
        name: dungeon.lightSpellType,
        icon: '💡',
        description: `Light (Radius: ${viewDistance})${durationText}`,
        variant: 'light'
      });
    }

    if (dungeon.latumapicActive) {
      spells.push({
        name: 'LATUMAPIC',
        icon: '👁️',
        description: 'Monsters Identified',
        variant: 'identification'
      });
    }

    if (dungeon.expeditionAcBuff && dungeon.expeditionAcBuff !== 0) {
      spells.push({
        name: 'MAPORFIC',
        icon: '🛡️',
        description: `Party AC ${dungeon.expeditionAcBuff > 0 ? '+' : ''}${dungeon.expeditionAcBuff}`,
        variant: 'protection'
      });
    }

    return spells;
  });

  // Footer menu (disabled during playback)
  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'processing', label: 'Processing...', enabled: false }
  ]);

  // Character status texts for panel
  readonly characterStatusTexts = computed((): Map<string, string> => {
    return new Map<string, string>();
  });

  // Message log messages
  readonly messages = computed(() => this.messageLog.messages());

  constructor(
    private gameState: GameStateService,
    private router: Router,
    private messageLog: MessageLogService
  ) {}

  /**
   * Get actions for character (no actions during playback)
   */
  getActionsForCharacter = (_char: Character): CharacterAction[] => [];

  /**
   * Handle footer menu selection (no-op during playback)
   */
  handleMenuAction(_itemId: string): void {}

  /**
   * Handle character sprite loading error
   */
  onSpriteError(): void {
    this.spriteError.set(true);
  }

  /**
   * Handle trap sprite loading error - show placeholder icon
   */
  onTrapSpriteError(): void {
    this.trapSpriteError.set(true);
  }

  /**
   * Handle floating damage animation complete
   */
  onDamageComplete(entryId: string): void {
    this.damageEntries.update(entries => entries.filter(e => e.id !== entryId));
  }

  /**
   * Get live HP for effect (tracks damage as it's applied)
   */
  getLiveHp(effect: TrapEffect): number {
    return this.liveHpMap.get(effect.characterId) ?? effect.currentHp;
  }

  /**
   * Check if HP is in warning range (25-50%)
   */
  isHpWarning(effect: TrapEffect): boolean {
    const hp = this.getLiveHp(effect);
    const percent = hp / effect.maxHp;
    return percent > 0.25 && percent <= 0.5;
  }

  /**
   * Check if HP is in critical range (<25%)
   */
  isHpCritical(effect: TrapEffect): boolean {
    const hp = this.getLiveHp(effect);
    const percent = hp / effect.maxHp;
    return percent <= 0.25;
  }

  ngOnInit(): void {
    const trap = this.pendingTrap();
    if (!trap) {
      console.error('[ChestPlayback] No pending trap result!');
      this.router.navigate(['/maze/chest/rewards']);
      return;
    }

    console.log('[ChestPlayback] Playing trap animation:', {
      trapName: trap.trapName,
      damageDealt: trap.damageDealt.size,
      statusApplied: trap.statusApplied.size,
      specialEffect: trap.specialEffect
    });

    // Initialize live HP tracking
    for (const char of this.partyCharacters()) {
      this.liveHpMap.set(char.id, char.hp);
    }

    // Log trap trigger
    this.messageLog.addMessage(`${trap.trapName} triggered!`);

    this.playTrapSequence(trap);
  }

  ngOnDestroy(): void {
    for (const timeout of this.pendingTimeouts) {
      clearTimeout(timeout);
    }
    this.pendingTimeouts = [];
  }

  /**
   * Format status for display
   */
  formatStatus(status: CharacterStatus): string {
    switch (status) {
      case CharacterStatus.POISONED: return 'Poisoned';
      case CharacterStatus.PARALYZED: return 'Paralyzed';
      case CharacterStatus.DEAD: return 'Dead';
      case CharacterStatus.ASHES: return 'Reduced to Ashes';
      case CharacterStatus.STONED: return 'Petrified';
      default: return status;
    }
  }

  /**
   * Build list of trap effects to animate
   */
  private buildEffectsList(trap: PendingTrapResult): TrapEffect[] {
    const effects: TrapEffect[] = [];
    const chars = this.partyCharacters();

    // Collect all characters affected by damage or status
    const affectedIds = new Set<string>();
    for (const charId of trap.damageDealt.keys()) affectedIds.add(charId);
    for (const charId of trap.statusApplied.keys()) affectedIds.add(charId);

    for (const charId of affectedIds) {
      const char = chars.find(c => c.id === charId);
      if (!char) continue;

      const damage = trap.damageDealt.get(charId) ?? 0;
      const status = trap.statusApplied.get(charId) ?? null;

      // Skip if no damage and no status change
      if (damage === 0 && !status) continue;

      effects.push({
        characterId: charId,
        characterName: char.name,
        spriteUrl: SpriteService.getSpriteUrl(char),
        className: char.class,
        currentHp: char.hp,
        maxHp: char.maxHp,
        damage,
        status
      });
    }

    return effects;
  }

  /**
   * Play the trap animation sequence
   */
  private async playTrapSequence(trap: PendingTrapResult): Promise<void> {
    const effects = this.buildEffectsList(trap);

    // Immediately show arena with trap card and label
    this.showArena.set(true);
    this.showTrapLabel.set(true);
    this.showActionVerb.set(true);

    // Brief pause before cycling through effects (matches portrait entrance timing)
    await this.delay(ARENA_TIMING.PORTRAIT_ENTER);

    // Cycle through each affected character
    if (effects.length > 0) {
      for (const effect of effects) {
        await this.playEffectOnCharacter(effect);
      }
    } else {
      // No one was affected
      await this.delay(ARENA_TIMING.PORTRAIT_ENTER);
      this.outcomeText.set('No one was harmed!');
      this.showOutcome.set(true);
      await this.delay(ARENA_TIMING.RESULT_DELAY);
    }

    // Apply all effects to game state
    this.applyTrapEffects(trap);

    // Show status message and navigate
    await this.delay(ARENA_TIMING.PORTRAIT_ENTER);
    this.showStatus.set(true);

    if (trap.specialEffect === 'combat') {
      this.statusMessage.set('Monsters are coming!');
      await this.delay(ARENA_TIMING.DAMAGE_FLOAT);
      this.navigateToCombat(trap);
    } else {
      this.statusMessage.set('Opening chest...');
      await this.delay(ARENA_TIMING.RESULT_DELAY);
      this.navigateToRewards();
    }
  }

  /**
   * Play animation for a single character effect
   */
  private async playEffectOnCharacter(effect: TrapEffect): Promise<void> {
    // Reset state for new character
    this.showOutcome.set(false);
    this.spriteError.set(false);

    // Show character card (matches portrait entrance timing)
    this.currentEffect.set(effect);
    await this.delay(ARENA_TIMING.PORTRAIT_ENTER);

    // Build outcome text
    const parts: string[] = [];
    if (effect.damage > 0) {
      parts.push(`-${effect.damage} HP`);
    }
    if (effect.status) {
      parts.push(this.formatStatus(effect.status));
    }
    this.outcomeText.set(parts.join(' • '));

    // Show outcome
    this.showOutcome.set(true);

    // Shake and floating damage
    if (effect.damage > 0) {
      this.isShaking.set(true);

      // Floating damage number
      const damageEntry = createFloatingDamage(
        `-${effect.damage}`,
        'damage',
        75, // Right side of viewport (%)
        40  // Vertically centered
      );
      this.damageEntries.update(entries => [...entries, damageEntry]);

      // Update live HP
      const currentHp = this.liveHpMap.get(effect.characterId) ?? effect.currentHp;
      this.liveHpMap.set(effect.characterId, Math.max(0, currentHp - effect.damage));

      // Log to message log
      this.messageLog.addMessage(`${effect.characterName} takes ${effect.damage} damage!`);

      // Wait for shake animation, then let floating damage continue
      await this.delay(ARENA_TIMING.TARGET_HIT_SHAKE);
      this.isShaking.set(false);
      await this.delay(ARENA_TIMING.DAMAGE_FLOAT - ARENA_TIMING.TARGET_HIT_SHAKE);
    }

    // Status effect
    if (effect.status) {
      // Floating status
      const statusEntry = createFloatingDamage(
        this.formatStatus(effect.status).toUpperCase(),
        'status',
        75,
        50
      );
      this.damageEntries.update(entries => [...entries, statusEntry]);

      this.messageLog.addMessage(`${effect.characterName} is ${this.formatStatus(effect.status).toLowerCase()}!`);

      // Wait for status to float up
      await this.delay(ARENA_TIMING.DAMAGE_FLOAT / 2);
    }

    // Pause before next character (matches combat action spacing)
    await this.delay(ARENA_TIMING.NEXT_ACTION_DELAY);
  }

  /**
   * Apply trap effects to game state
   */
  private applyTrapEffects(trap: PendingTrapResult): void {
    console.log('[ChestPlayback] Applying trap effects to characters');

    this.gameState.updateState(state =>
      TrapEffectService.applyTrapEffectsToState(state, trap)
    );
  }

  /**
   * Navigate to combat for ALARM trap
   */
  private async navigateToCombat(trap: PendingTrapResult): Promise<void> {
    console.log('[ChestPlayback] ALARM trap - triggering combat encounter');

    const state = this.gameState.state();
    const dungeon = state.dungeon;

    if (!dungeon) {
      console.error('[ChestPlayback] No dungeon state for alarm combat!');
      this.navigateToRewards();
      return;
    }

    const monsterGroups = EncounterService.generateEncounter(dungeon.currentLevel);
    const combat = EncounterTriggerService.createAlarmCombatState(dungeon.currentLevel, monsterGroups);

    this.gameState.updateState(s => ({
      ...s,
      pendingTrapResult: undefined,
      combat
    }));

    this.router.navigate(['/maze/combat/planning']);
  }

  /**
   * Navigate to chest rewards
   */
  private navigateToRewards(): void {
    console.log('[ChestPlayback] Proceeding to chest rewards');

    this.gameState.updateState(state => ({
      ...state,
      pendingTrapResult: undefined
    }));

    this.router.navigate(['/maze/chest/rewards']);
  }

  /**
   * Helper delay function with cleanup tracking
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, ms);
      this.pendingTimeouts.push(timeout);
    });
  }
}
