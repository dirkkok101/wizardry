# Inn UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Inn room selection with modern UX patterns, component-first approach benefiting multiple scenes.

**Architecture:** Enhance shared components (SelectionListComponent, CharacterCardComponent) first, then apply to Inn scene. Add SCSS tokens for consistent animations. Standardize HP bar display across Inn and Temple.

**Tech Stack:** Angular 17+, SCSS, Signals, Jest

---

## Task 1: Add Animation & Interaction SCSS Tokens

**Files:**
- Modify: `src/styles/variables.scss:96` (append after `:root` block)

**Step 1: Add animation tokens to variables.scss**

Add after line 96 (after closing `}` of `:root`):

```scss
// Animation Timing
$transition-fast: 0.15s ease;
$transition-normal: 0.25s ease;
$transition-slow: 0.4s ease;

// Interaction States
$state-hover-lift: -2px;
$state-selected-glow: 0 0 12px rgba(0, 255, 0, 0.4);
$state-disabled-opacity: 0.5;

// Card Sizing
$card-padding-sm: 0.75rem;
$card-padding-md: 1rem;
$card-padding-lg: 1.5rem;
$card-gap: 1rem;
$card-border-radius: 4px;

// Shadows
$shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
$shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
$shadow-glow-green: 0 0 8px rgba(0, 255, 0, 0.3);
$shadow-glow-amber: 0 0 8px rgba(255, 170, 0, 0.3);
```

**Step 2: Verify build succeeds**

Run: `ng build`
Expected: Build completes without errors

**Step 3: Commit**

```bash
git add src/styles/variables.scss
git commit -m "feat(styles): add animation and interaction SCSS tokens"
```

---

## Task 2: Create Shared Card Mixins

**Files:**
- Create: `src/styles/_card-mixins.scss`

**Step 1: Create the card mixins file**

Create `src/styles/_card-mixins.scss`:

```scss
@use 'variables' as *;

/// Base card styling for static display cards
@mixin card-base {
  padding: $card-padding-md;
  background: rgba(0, 20, 0, 0.4);
  border: 1px solid $color-text-dim;
  border-radius: $card-border-radius;
  transition: all $transition-normal;
}

/// Interactive card with hover/selected/disabled states
@mixin card-interactive {
  @include card-base;
  cursor: pointer;

  &:hover:not(.disabled) {
    transform: translateY($state-hover-lift);
    border-color: $color-text-green;
    box-shadow: $shadow-glow-green;
  }

  &.selected:not(.disabled) {
    border-color: $color-text-green;
    box-shadow: $state-selected-glow;
    background: rgba(0, 255, 0, 0.1);
  }

  &.disabled {
    opacity: $state-disabled-opacity;
    cursor: not-allowed;
    border-color: rgba($color-error, 0.3);
  }
}

/// Staggered entry animation for card lists
@mixin card-stagger-animation($delay-increment: 0.05s) {
  @for $i from 1 through 10 {
    &:nth-child(#{$i}) {
      animation-delay: #{($i - 1) * $delay-increment};
    }
  }
}

/// Entry fade-in animation keyframes
@keyframes card-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Step 2: Verify build succeeds**

Run: `ng build`
Expected: Build completes (file not imported yet, but should parse correctly)

**Step 3: Commit**

```bash
git add src/styles/_card-mixins.scss
git commit -m "feat(styles): add shared card mixins for interactive cards"
```

---

## Task 3: Add SelectionList Inputs for Enhanced Features

**Files:**
- Modify: `src/app/shared/components/selection-list/selection-list.component.ts`
- Test: `src/app/shared/components/selection-list/__tests__/selection-list.component.spec.ts`

**Step 1: Write tests for new inputs**

Add tests to `selection-list.component.spec.ts`:

```typescript
describe('enhanced features', () => {
  it('should accept maxHeight input', () => {
    fixture.componentRef.setInput('maxHeight', '300px');
    fixture.detectChanges();
    const listEl = fixture.nativeElement.querySelector('.selection-list');
    expect(listEl.style.maxHeight).toBe('300px');
  });

  it('should show keyboard hints when showKeyboardHints is true', () => {
    fixture.componentRef.setInput('showKeyboardHints', true);
    fixture.componentRef.setInput('options', [
      { id: '1', shortcut: 'A', enabled: true }
    ]);
    fixture.detectChanges();
    const hints = fixture.nativeElement.querySelector('.keyboard-hints');
    expect(hints).toBeTruthy();
  });

  it('should show empty message when options array is empty', () => {
    fixture.componentRef.setInput('options', []);
    fixture.componentRef.setInput('emptyMessage', 'No items available');
    fixture.detectChanges();
    const emptyEl = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyEl.textContent).toContain('No items available');
  });

  it('should apply entry animation class when entryAnimation is true', () => {
    fixture.componentRef.setInput('entryAnimation', true);
    fixture.componentRef.setInput('options', [
      { id: '1', shortcut: 'A', enabled: true }
    ]);
    fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('.selection-item');
    expect(item.classList.contains('animate-entry')).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- selection-list.component.spec.ts`
Expected: FAIL - new properties don't exist yet

**Step 3: Add new inputs to component**

In `selection-list.component.ts`, add after line 74 (`readonly columns = input(1)`):

```typescript
  readonly maxHeight = input<string | null>(null)
  readonly showKeyboardHints = input(false)
  readonly emptyMessage = input('No options available')
  readonly entryAnimation = input(false)
```

**Step 4: Run tests again**

Run: `npm test -- selection-list.component.spec.ts`
Expected: Still failing (template not updated yet)

**Step 5: Commit inputs**

```bash
git add src/app/shared/components/selection-list/selection-list.component.ts
git add src/app/shared/components/selection-list/__tests__/selection-list.component.spec.ts
git commit -m "feat(selection-list): add maxHeight, showKeyboardHints, emptyMessage, entryAnimation inputs"
```

---

## Task 4: Update SelectionList Template

**Files:**
- Modify: `src/app/shared/components/selection-list/selection-list.component.html`

**Step 1: Update template with new features**

Replace entire content of `selection-list.component.html`:

```html
<div
  class="selection-list"
  role="listbox"
  [style.--columns]="columns()"
  [style.maxHeight]="maxHeight()"
  [class.scrollable]="maxHeight()"
>
  @if (options().length === 0) {
    <div class="empty-state">{{ emptyMessage() }}</div>
  } @else {
    @for (option of options(); track option.id; let i = $index) {
      <div
        class="selection-item"
        [class.selected]="selectedIndex() === i"
        [class.disabled]="!option.enabled"
        [class.hovered]="hoveredIndex() === i"
        [class.animate-entry]="entryAnimation()"
        (click)="onOptionClick(option, i)"
        (mouseenter)="onOptionMouseEnter(i)"
        (mouseleave)="onOptionMouseLeave()"
        role="option"
        [attr.aria-selected]="selectedIndex() === i"
        [attr.aria-disabled]="!option.enabled"
        [attr.tabindex]="option.enabled ? 0 : -1"
      >
        @if (showShortcutsInList()) {
          <span class="item-shortcut">({{ option.shortcut }})</span>
        }

        @if (itemTemplate) {
          <ng-container
            [ngTemplateOutlet]="itemTemplate"
            [ngTemplateOutletContext]="getItemContext(option, i)"
          />
        } @else {
          <span class="item-default">{{ option.id }}</span>
        }
      </div>
    }
  }

  @if (showKeyboardHints() && options().length > 0) {
    <div class="keyboard-hints">
      <span>↑↓ Navigate</span>
      <span>Enter Select</span>
      <span>ESC Cancel</span>
    </div>
  }
</div>
```

**Step 2: Run tests**

Run: `npm test -- selection-list.component.spec.ts`
Expected: Some tests may still fail (need SCSS updates)

**Step 3: Commit template**

```bash
git add src/app/shared/components/selection-list/selection-list.component.html
git commit -m "feat(selection-list): update template with empty state, animations, keyboard hints"
```

---

## Task 5: Update SelectionList Styling

**Files:**
- Modify: `src/app/shared/components/selection-list/selection-list.component.scss`

**Step 1: Update SCSS with new features**

Replace entire content of `selection-list.component.scss`:

```scss
@use '../../../../styles/variables' as *;
@use '../../../../styles/card-mixins' as *;

.selection-list {
  display: grid;
  grid-template-columns: repeat(var(--columns, 1), 1fr);
  gap: $spacing-sm;
  width: 100%;

  &.scrollable {
    overflow-y: auto;
    padding-right: $spacing-xs;

    // Custom scrollbar
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-track {
      background: rgba(0, 255, 0, 0.1);
    }
    &::-webkit-scrollbar-thumb {
      background: $color-text-dim;
      border-radius: 3px;
    }
  }
}

.selection-item {
  @include card-interactive;
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;

  &.animate-entry {
    animation: card-fade-in $transition-normal forwards;
    @include card-stagger-animation(0.05s);
  }
}

.item-shortcut {
  color: $color-amber;
  font-weight: bold;
  min-width: 30px;
  flex-shrink: 0;
}

.item-default {
  color: $color-text-bright;
}

.empty-state {
  grid-column: 1 / -1;
  padding: $spacing-lg;
  text-align: center;
  color: $color-text-dim;
  font-style: italic;
}

.keyboard-hints {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  gap: $spacing-lg;
  padding-top: $spacing-md;
  border-top: 1px solid $color-text-dim;
  margin-top: $spacing-sm;

  span {
    color: $color-text-dim;
    font-size: $font-size-small;
  }
}
```

**Step 2: Run all tests**

Run: `npm test -- selection-list.component.spec.ts`
Expected: PASS

**Step 3: Verify build**

Run: `ng build`
Expected: Build succeeds

**Step 4: Commit styling**

```bash
git add src/app/shared/components/selection-list/selection-list.component.scss
git commit -m "feat(selection-list): add enhanced styling with card mixins and animations"
```

---

## Task 6: Add HP Context to CharacterCard

**Files:**
- Modify: `src/app/shared/components/character-card/character-card.component.ts`
- Modify: `src/app/shared/components/character-card/character-card.component.html`
- Test: `src/app/shared/components/character-card/__tests__/character-card.component.spec.ts`

**Step 1: Write test for showHpContext input**

Add to `character-card.component.spec.ts`:

```typescript
describe('HP context display', () => {
  it('should show HP needed text when showHpContext is true and HP < max', () => {
    component.character = {
      ...createTestCharacter(),
      hp: 5,
      maxHp: 10
    };
    component.showHpBar = true;
    component.showHpContext = true;
    fixture.detectChanges();

    const context = fixture.nativeElement.querySelector('.hp-context');
    expect(context).toBeTruthy();
    expect(context.textContent).toContain('5 HP to heal');
  });

  it('should not show HP context when at full HP', () => {
    component.character = {
      ...createTestCharacter(),
      hp: 10,
      maxHp: 10
    };
    component.showHpBar = true;
    component.showHpContext = true;
    fixture.detectChanges();

    const context = fixture.nativeElement.querySelector('.hp-context');
    expect(context).toBeFalsy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- character-card.component.spec.ts`
Expected: FAIL - showHpContext doesn't exist

**Step 3: Add showHpContext input to component**

In `character-card.component.ts`, add after line 31 (`@Input() statusText?: string | null;`):

```typescript
  /** Show "X HP to heal" context text when HP < max */
  @Input() showHpContext = false;
```

Add computed property after `isDead` getter (line 56):

```typescript
  get hpNeeded(): number {
    return Math.max(0, this.character.maxHp - this.character.hp);
  }
```

**Step 4: Update template**

In `character-card.component.html`, replace the HP bar section (lines 28-36):

```html
  <!-- HP Bar (optional) -->
  @if (showHpBar && !isDead) {
    <div class="hp-bar-container">
      <div class="hp-bar">
        <div class="hp-fill"
             [style.width.%]="hpPercent"
             [class.critical]="hpPercent <= 25"
             [class.low]="hpPercent > 25 && hpPercent <= 50"
             [class.healthy]="hpPercent > 50">
        </div>
      </div>
      @if (showHpContext && hpNeeded > 0) {
        <div class="hp-context">{{ hpNeeded }} HP to heal</div>
      }
    </div>
  }
```

**Step 5: Run tests**

Run: `npm test -- character-card.component.spec.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/shared/components/character-card/
git commit -m "feat(character-card): add showHpContext input for healing context display"
```

---

## Task 7: Enhance CharacterCard HP Bar Styling

**Files:**
- Modify: `src/app/shared/components/character-card/character-card.component.scss`

**Step 1: Update HP bar styling with gradient thresholds**

Replace the HP bar section in `character-card.component.scss` (lines 113-130):

```scss
// HP Bar
.hp-bar-container {
  margin-top: $spacing-xs;
}

.hp-bar {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 3px;
  overflow: hidden;

  .hp-fill {
    height: 100%;
    transition: width 0.3s ease, background 0.3s ease;

    &.healthy {
      background: linear-gradient(90deg, #00aa00, #00ff00);
    }

    &.low {
      background: linear-gradient(90deg, #ff8800, #ffaa00);
    }

    &.critical {
      background: linear-gradient(90deg, #ff0000, #ff4444);
    }
  }
}

.hp-context {
  font-size: $font-size-small;
  color: $color-text-dim;
  margin-top: 2px;
  font-style: italic;
}
```

**Step 2: Verify build and tests**

Run: `npm test -- character-card && ng build`
Expected: All pass

**Step 3: Commit**

```bash
git add src/app/shared/components/character-card/character-card.component.scss
git commit -m "feat(character-card): enhance HP bar with gradient colors by threshold"
```

---

## Task 8: Enable HP Bars in Inn Scene

**Files:**
- Modify: `src/app/scenes/inn/inn.component.html`

**Step 1: Update PartyCharacterGrid to show HP bar**

In `inn.component.html`, update line 8-16 (the `app-party-character-grid`):

```html
        <app-party-character-grid
          source="party"
          [showFormation]="true"
          [visibleFields]="['class', 'level', 'hp', 'status']"
          [showHpBar]="true"
          [actions]="[{type: 'inspect'}, {type: 'rest', label: 'Rest'}]"
          (actionClick)="handleCharacterAction($event)"
          emptyMessage="No party members"
          variant="default"
        />
```

**Step 2: Verify it works**

Run: `ng serve`
Navigate to Inn scene - character cards should now show HP bars

**Step 3: Commit**

```bash
git add src/app/scenes/inn/inn.component.html
git commit -m "feat(inn): enable HP bar display on character cards"
```

---

## Task 9: Enable HP Bars in Temple Scene

**Files:**
- Modify: `src/app/scenes/temple/temple.component.html`

**Step 1: Find and update PartyCharacterGrid in temple**

Search for `app-party-character-grid` in temple component and add `[showHpBar]="true"`.

**Step 2: Verify**

Run: `ng serve`
Navigate to Temple - character cards should show HP bars

**Step 3: Commit**

```bash
git add src/app/scenes/temple/temple.component.html
git commit -m "feat(temple): enable HP bar display on character cards"
```

---

## Task 10: Add Healing Preview to Inn

**Files:**
- Modify: `src/app/scenes/inn/inn.component.ts`
- Test: `src/app/scenes/inn/__tests__/inn.component.spec.ts`

**Step 1: Write test for roomsWithPreview computed**

Add to `inn.component.spec.ts`:

```typescript
describe('roomsWithPreview', () => {
  it('should calculate weeks and total cost for each room', () => {
    // Setup: character needs 6 HP, party has 1000 gold
    // ...test setup...

    const preview = component.roomsWithPreview();

    // Barracks: 1 HP/week = 6 weeks @ 10gp = 60gp total
    const barracks = preview.find(r => r.roomType === RoomType.BARRACKS);
    expect(barracks?.weeks).toBe(6);
    expect(barracks?.totalCost).toBe(60);
    expect(barracks?.affordable).toBe(true);
  });

  it('should mark room as not affordable when totalCost > partyGold', () => {
    // Setup: character needs healing, party has only 20 gold
    // Royal Suite costs 500/week, way too expensive
    // ...test setup...

    const preview = component.roomsWithPreview();
    const royal = preview.find(r => r.roomType === RoomType.ROYAL_SUITE);
    expect(royal?.affordable).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- inn.component.spec.ts`
Expected: FAIL - roomsWithPreview doesn't exist

**Step 3: Add roomsWithPreview computed signal**

In `inn.component.ts`, add after `roomOptions` computed (around line 142):

```typescript
  // Room options with healing preview calculated for selected character
  readonly roomsWithPreview = computed(() => {
    const char = this.selectedCharacter();
    const rooms = this.roomOptions();
    const gold = this.partyGold();

    if (!char) return rooms.map(r => ({ ...r, weeks: 0, totalCost: 0, affordable: r.enabled }));

    const hpNeeded = char.maxHp - char.hp;

    return rooms.map(room => {
      const healRate = InnService.getRoomHealRate(room.roomType);
      const weeks = healRate > 0 ? Math.ceil(hpNeeded / healRate) : Infinity;
      const totalCost = weeks === Infinity ? 0 : weeks * room.cost;
      const affordable = room.cost === 0 || totalCost <= gold;

      return { ...room, weeks, totalCost, affordable, enabled: affordable };
    });
  });
```

**Step 4: Run tests**

Run: `npm test -- inn.component.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/scenes/inn/inn.component.ts
git add src/app/scenes/inn/__tests__/inn.component.spec.ts
git commit -m "feat(inn): add roomsWithPreview computed with healing cost calculation"
```

---

## Task 11: Redesign Inn Room Selection Template

**Files:**
- Modify: `src/app/scenes/inn/inn.component.html`

**Step 1: Update room selection section**

Replace lines 25-109 (the entire room selection view) with:

```html
    <!-- Room Selection View -->
    @if (showRoomSelection() && !showConfirmation() && !levelUpData()) {
      <div class="room-selection">
        <!-- Character Context Panel -->
        @if (selectedCharacter(); as character) {
          <div class="character-context-panel">
            <div class="context-header">
              <h2 class="character-name">{{ character.name }}</h2>
              <div class="character-class">{{ character.class }} Level {{ character.level }}</div>
            </div>
            <div class="hp-display">
              <div class="hp-text">
                HP: {{ character.hp }}/{{ character.maxHp }}
                @if (character.hp < character.maxHp) {
                  <span class="hp-needed">({{ character.maxHp - character.hp }} to heal)</span>
                }
              </div>
              <div class="hp-bar">
                <div class="hp-fill"
                     [style.width.%]="(character.hp / character.maxHp) * 100"
                     [class.critical]="(character.hp / character.maxHp) <= 0.25"
                     [class.low]="(character.hp / character.maxHp) > 0.25 && (character.hp / character.maxHp) <= 0.5"
                     [class.healthy]="(character.hp / character.maxHp) > 0.5">
                </div>
              </div>
            </div>
          </div>

          <h3 class="section-title">SELECT ROOM TYPE</h3>

          <app-selection-list
            [options]="roomsWithPreview()"
            [allowArrowNavigation]="true"
            [showShortcutsInList]="false"
            [columns]="2"
            [showKeyboardHints]="true"
            [entryAnimation]="true"
            (optionSelected)="handleRoomSelected($event)"
            (cancelled)="handleRoomSelectionCancelled()"
          >
            <ng-template #itemTemplate let-option let-selected="selected">
              <div class="room-card" [class.selected]="selected" [class.disabled]="!option.affordable">
                <div class="room-card__header">
                  <span class="shortcut">({{ option.shortcut }})</span>
                  <span class="name">{{ option.name }}</span>
                </div>
                <div class="room-card__stats">
                  <span class="cost">
                    @if (option.cost === 0) { FREE } @else { {{ option.cost }} gp/week }
                  </span>
                  <span class="benefit">{{ option.benefit }}</span>
                </div>
                <div class="room-card__description">{{ option.description }}</div>
                <div class="room-card__preview">
                  @if (option.weeks === Infinity) {
                    <span>No healing - level check only</span>
                  } @else if (option.weeks === 0) {
                    <span>Already at full HP</span>
                  } @else {
                    <span>{{ option.weeks }} week{{ option.weeks > 1 ? 's' : '' }} · {{ option.totalCost }} gp total</span>
                  }
                </div>
                @if (!option.affordable && option.cost > 0) {
                  <div class="room-card__badge">CANNOT AFFORD</div>
                }
              </div>
            </ng-template>
          </app-selection-list>
        }
      </div>

      <!-- Rest Progress Display -->
      @if (restProgress(); as progress) {
        <div class="rest-progress">
          <div class="progress-bar-container">
            <div class="progress-bar" [style.width.%]="(progress.currentHp / progress.maxHp) * 100"></div>
          </div>
          <div class="progress-stats">
            <span>HP: {{ progress.currentHp }}/{{ progress.maxHp }}</span>
            <span>Weeks: {{ progress.weeksRested }}</span>
            <span>Gold spent: {{ progress.totalGoldSpent }}</span>
          </div>
        </div>
      }

      <!-- Auto-Rest Indicator -->
      @if (isAutoResting()) {
        <div class="auto-rest-indicator">
          <span class="spinner"></span>
          <span>Resting... (Press ESC to stop)</span>
        </div>
      }
    }
```

**Step 2: Verify build**

Run: `ng build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/scenes/inn/inn.component.html
git commit -m "feat(inn): redesign room selection with 2-column grid and healing preview"
```

---

## Task 12: Add Inn Room Selection Styling

**Files:**
- Modify: `src/app/scenes/inn/inn.component.scss`

**Step 1: Add new room selection styles**

Add to `inn.component.scss` (replace old room selection styles):

```scss
@use '../../../styles/variables' as *;
@use '../../../styles/card-mixins' as *;

// Character Context Panel
.character-context-panel {
  max-width: 500px;
  margin: 0 auto $spacing-lg;
  @include card-base;
  text-align: center;

  .context-header {
    margin-bottom: $spacing-md;
  }

  .character-name {
    color: $color-text-bright;
    font-size: $font-size-large;
    margin: 0 0 $spacing-xs;
  }

  .character-class {
    color: $color-text-dim;
  }

  .hp-display {
    .hp-text {
      margin-bottom: $spacing-xs;
      color: $color-text-bright;

      .hp-needed {
        color: $color-amber;
        margin-left: $spacing-xs;
      }
    }

    .hp-bar {
      height: 8px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 4px;
      overflow: hidden;

      .hp-fill {
        height: 100%;
        transition: width $transition-normal;

        &.healthy { background: linear-gradient(90deg, #00aa00, #00ff00); }
        &.low { background: linear-gradient(90deg, #ff8800, #ffaa00); }
        &.critical { background: linear-gradient(90deg, #ff0000, #ff4444); }
      }
    }
  }
}

.section-title {
  text-align: center;
  color: $color-amber;
  margin: $spacing-lg 0;
  font-size: $font-size-large;
}

// Room Card Styling
.room-card {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  height: 100%;

  &__header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .shortcut {
      color: $color-amber;
      font-weight: bold;
    }

    .name {
      color: $color-text-green;
      font-size: 1.125rem;
      font-weight: bold;
    }
  }

  &__stats {
    display: flex;
    justify-content: space-between;

    .cost { color: $color-amber; }
    .benefit { color: $color-text-bright; }
  }

  &__description {
    color: $color-text-dim;
    font-size: 0.875rem;
    flex-grow: 1;
  }

  &__preview {
    padding-top: $spacing-sm;
    border-top: 1px solid $color-text-dim;
    font-style: italic;
    color: $color-text-gray;
    font-size: 0.875rem;
  }

  &__badge {
    background: rgba($color-error, 0.2);
    color: $color-error;
    padding: 2px $spacing-xs;
    border-radius: 2px;
    font-size: 0.75rem;
    text-align: center;
  }
}

// Responsive: 1 column on smaller screens
@media (max-width: 767px) {
  .room-selection ::ng-deep .selection-list {
    --columns: 1;
  }

  .character-context-panel {
    max-width: 100%;
  }
}
```

**Step 2: Verify visually**

Run: `ng serve`
Navigate to Inn, select a character to rest, verify room selection looks correct

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/app/scenes/inn/inn.component.scss
git commit -m "feat(inn): add styling for redesigned room selection"
```

---

## Task 13: Final Verification and Cleanup

**Files:**
- All modified files

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Run build**

Run: `ng build`
Expected: Build succeeds without errors

**Step 3: Manual testing checklist**

- [ ] Inn scene: Character cards show HP bars
- [ ] Inn scene: Room selection shows 2-column grid
- [ ] Inn scene: Healing preview shows weeks + total cost
- [ ] Inn scene: Keyboard navigation works (arrows, shortcuts, ESC, Enter)
- [ ] Inn scene: Responsive - 1 column on mobile (<768px)
- [ ] Temple scene: Character cards show HP bars
- [ ] SelectionList: Entry animations work
- [ ] SelectionList: Keyboard hints display

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup for Inn UI redesign"
```

---

## Summary

| Task | Description | Estimated Time |
|------|-------------|----------------|
| 1 | Add SCSS animation tokens | 3 min |
| 2 | Create card mixins | 3 min |
| 3 | Add SelectionList inputs | 5 min |
| 4 | Update SelectionList template | 3 min |
| 5 | Update SelectionList styling | 5 min |
| 6 | Add CharacterCard HP context | 5 min |
| 7 | Enhance HP bar styling | 3 min |
| 8 | Enable HP bars in Inn | 2 min |
| 9 | Enable HP bars in Temple | 2 min |
| 10 | Add healing preview computed | 5 min |
| 11 | Redesign room selection template | 5 min |
| 12 | Add room selection styling | 5 min |
| 13 | Final verification | 5 min |

**Total: ~50 minutes**

## Scenes That Benefit

| Scene | Improvement |
|-------|-------------|
| Inn | Full redesign with healing preview |
| Temple | HP bars on character cards |
| Spell Selection | Entry animations, keyboard hints |
| Future dialogs | Card mixins available |
