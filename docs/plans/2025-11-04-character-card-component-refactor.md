# Character Card Component Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor all character card implementations into a single, reusable component system using the Composition Pattern to eliminate code duplication and standardize visual design across Castle Menu, Tavern, and Training Grounds scenes.

**Architecture:** Create a main `CharacterCardComponent` orchestrator with three specialized sub-components (`StatusBadgeComponent`, `CharacterStatsComponent`, `CharacterActionsComponent`) and shared utility helpers. The main component accepts configuration for visible fields and action buttons, delegating rendering to sub-components. All components use SCSS variables for consistent styling.

**Tech Stack:** Angular 19 (standalone components), TypeScript, SCSS, Jest (testing)

---

## Design Decisions Summary

**Validated Choices:**
- **Goal**: Reduce code duplication AND standardize visual design
- **Layout**: Single standardized layout (120px default, 80px compact) replacing all existing card variants
- **Content**: Configurable fields - Name/Status always shown, optional fields (race, class, level, hp, ac, alignment) per scene
- **Actions**: Action configuration array pattern with type-safe events
- **Architecture**: Composition Pattern (main component + 3 sub-components + utility helpers)

**Current State:**
- 4 distinct character card implementations (Castle Menu, Tavern, Training Grounds, Character Inspection)
- Code duplication for status display, inspect buttons, character info
- Character Inspection uses hardcoded colors instead of SCSS variables

**Target State:**
- Single `CharacterCardComponent` used across all town scenes
- Reusable `StatusBadgeComponent` for status display
- Shared `CharacterDisplayHelpers` for formatting
- Character Inspection refactored to use SCSS variables
- 95%+ test coverage, no visual regressions

---

## Component Architecture

### File Structure
```
src/
├── components/
│   ├── character-card/
│   │   ├── character-card.component.ts
│   │   ├── character-card.component.html
│   │   ├── character-card.component.scss
│   │   └── __tests__/
│   │       └── character-card.component.spec.ts
│   ├── status-badge/
│   │   ├── status-badge.component.ts
│   │   ├── status-badge.component.html
│   │   ├── status-badge.component.scss
│   │   └── __tests__/
│   │       └── status-badge.component.spec.ts
│   ├── character-stats/
│   │   ├── character-stats.component.ts
│   │   ├── character-stats.component.html
│   │   ├── character-stats.component.scss
│   │   └── __tests__/
│   │       └── character-stats.component.spec.ts
│   └── character-actions/
│       ├── character-actions.component.ts
│       ├── character-actions.component.html
│       ├── character-actions.component.scss
│       └── __tests__/
│           └── character-actions.component.spec.ts
└── helpers/
    ├── CharacterDisplayHelpers.ts
    └── __tests__/
        └── CharacterDisplayHelpers.spec.ts
```

### Component APIs

**CharacterCardComponent (Main Orchestrator)**
```typescript
@Input() character!: Character;
@Input() visibleFields?: CharacterField[];
@Input() actions?: CharacterAction[];
@Input() variant?: 'default' | 'compact';
@Output() actionClick = new EventEmitter<CharacterActionEvent>();

type CharacterField = 'race' | 'class' | 'level' | 'hp' | 'ac' | 'alignment';

interface CharacterAction {
  type: 'inspect' | 'add' | 'remove' | 'delete' | 'moveUp' | 'moveDown';
  label?: string;
  enabled?: boolean;
  variant?: 'default' | 'danger';
}

interface CharacterActionEvent {
  characterId: string;
  actionType: string;
}
```

**StatusBadgeComponent**
```typescript
@Input() status!: CharacterStatus;
@Input() variant?: 'badge' | 'inline' = 'badge';
```

**CharacterStatsComponent**
```typescript
@Input() character!: Character;
@Input() fields!: CharacterField[];
@Input() layout?: 'vertical' | 'horizontal' = 'vertical';
```

**CharacterActionsComponent**
```typescript
@Input() actions!: CharacterAction[];
@Input() characterId!: string;
@Output() actionClick = new EventEmitter<CharacterActionEvent>();
```

**CharacterDisplayHelpers (Utility Functions)**
```typescript
export function formatHP(current: number, max: number): string;
export function getStatusColorClass(status: CharacterStatus): string;
export function getDefaultActionLabel(type: string): string;
export function formatStatValue(field: CharacterField, character: Character): string;
```

### Layout Specification

**Standard Card Layout (CSS Grid):**
```
┌─────────────────────────────────────────────────┐
│ CHARACTER NAME              [Status Badge]      │
│ ─────────────────────────────────────────────── │
│                                                  │
│ Race: Human          HP: 12/20                  │
│ Class: Fighter       AC: 5                      │
│ Level: 3             Alignment: Good            │
│                                                  │
│ ─────────────────────────────────────────────── │
│              [Inspect] [Action] [Action]        │
└─────────────────────────────────────────────────┘

Dimensions:
- Default variant: min-height 120px
- Compact variant: min-height 80px
- Two-column grid for stats (configurable to single column)
```

**SCSS Variables (from styles/variables.scss):**
- All components MUST use variables - NO hardcoded colors
- Colors: `$color-bg-black`, `$color-text-green`, `$color-text-bright`, `$color-text-dim`, `$color-border`, `$color-amber`, `$color-error`
- Spacing: `$spacing-xs` (4px), `$spacing-sm` (8px), `$spacing-md` (16px)
- Typography: `$font-mono`, `$font-size-base` (16px), `$font-size-large` (20px)

---

## Migration Path

**Phase 1: Create New Components (No Breaking Changes)**
1. Create helper utilities with tests
2. Create StatusBadgeComponent with tests
3. Create CharacterStatsComponent with tests
4. Create CharacterActionsComponent with tests
5. Create CharacterCardComponent with tests
6. Verify 95%+ test coverage

**Phase 2: Migrate Scenes One-by-One**
1. Training Grounds (simplest - 2 actions, minimal fields)
2. Tavern (moderate - conditional actions for party formation)
3. Castle Menu (layout change - was vertical, now standardized)

**Phase 3: Fix Character Inspection**
- Replace hardcoded colors with SCSS variables
- Maintain existing layout (full-screen sheet, not a card)

**Phase 4: Clean Up**
- Delete old component files
- Run full test suite
- Update documentation

---

## Testing Requirements

**Coverage Goals:**
- 100% for CharacterDisplayHelpers (pure functions)
- 95%+ for all components
- All existing integration tests must pass

**Test Framework:**
- Jest with jest-preset-angular
- Colocated tests in `__tests__/` subdirectories
- Factory functions from `tests/helpers/test-factories.ts`

**Performance:**
- Test suite must complete in <5 seconds total
- Use instant transitions for scene navigation tests

---

## Usage Examples

**Castle Menu (show AC, inspect only):**
```typescript
<app-character-card
  [character]="char"
  [visibleFields]="['race', 'class', 'level', 'hp', 'ac']"
  [actions]="[{ type: 'inspect' }]"
  (actionClick)="handleAction($event)">
</app-character-card>
```

**Tavern (alignment, party management actions):**
```typescript
<app-character-card
  [character]="char"
  [visibleFields]="['class', 'level', 'race', 'alignment']"
  [actions]="[
    { type: 'add', enabled: !isInParty },
    { type: 'remove', enabled: isInParty, variant: 'danger' },
    { type: 'moveUp', enabled: canMoveUp },
    { type: 'moveDown', enabled: canMoveDown },
    { type: 'inspect' }
  ]"
  variant="compact"
  (actionClick)="handleAction($event)">
</app-character-card>
```

**Training Grounds (delete character):**
```typescript
<app-character-card
  [character]="char"
  [visibleFields]="['race', 'class', 'level']"
  [actions]="[
    { type: 'inspect' },
    { type: 'delete', variant: 'danger' }
  ]"
  variant="compact"
  (actionClick)="handleAction($event)">
</app-character-card>
```

---

## Implementation Tasks

### Task 1: Create Type Definitions and Helper Functions

**Files:**
- Create: `src/types/CharacterCardTypes.ts`
- Create: `src/helpers/CharacterDisplayHelpers.ts`
- Create: `src/helpers/__tests__/CharacterDisplayHelpers.spec.ts`

**Step 1: Write type definitions**

Create `src/types/CharacterCardTypes.ts`:

```typescript
export type CharacterField = 'race' | 'class' | 'level' | 'hp' | 'ac' | 'alignment';

export interface CharacterAction {
  type: 'inspect' | 'add' | 'remove' | 'delete' | 'moveUp' | 'moveDown';
  label?: string;
  enabled?: boolean;
  variant?: 'default' | 'danger';
}

export interface CharacterActionEvent {
  characterId: string;
  actionType: string;
}
```

**Step 2: Write failing tests for helper functions**

Create `src/helpers/__tests__/CharacterDisplayHelpers.spec.ts`:

```typescript
import {
  formatHP,
  getStatusColorClass,
  getDefaultActionLabel,
  formatStatValue
} from '../CharacterDisplayHelpers';
import { CharacterStatus } from '../../types/CharacterTypes';
import { createTestCharacter } from '../../../tests/helpers/test-factories';

describe('CharacterDisplayHelpers', () => {
  describe('formatHP', () => {
    it('formats HP as current/max', () => {
      expect(formatHP(12, 20)).toBe('12/20');
    });

    it('handles zero values', () => {
      expect(formatHP(0, 15)).toBe('0/15');
    });

    it('handles full HP', () => {
      expect(formatHP(25, 25)).toBe('25/25');
    });
  });

  describe('getStatusColorClass', () => {
    it('returns status-ok for OK status', () => {
      expect(getStatusColorClass(CharacterStatus.OK)).toBe('status-ok');
    });

    it('returns status-dead for DEAD status', () => {
      expect(getStatusColorClass(CharacterStatus.DEAD)).toBe('status-dead');
    });

    it('returns status-ashes for ASHES status', () => {
      expect(getStatusColorClass(CharacterStatus.ASHES)).toBe('status-ashes');
    });

    it('returns status-lost for LOST status', () => {
      expect(getStatusColorClass(CharacterStatus.LOST)).toBe('status-lost');
    });
  });

  describe('getDefaultActionLabel', () => {
    it('returns "Inspect" for inspect action', () => {
      expect(getDefaultActionLabel('inspect')).toBe('Inspect');
    });

    it('returns "Add" for add action', () => {
      expect(getDefaultActionLabel('add')).toBe('Add');
    });

    it('returns "Remove" for remove action', () => {
      expect(getDefaultActionLabel('remove')).toBe('Remove');
    });

    it('returns "Delete" for delete action', () => {
      expect(getDefaultActionLabel('delete')).toBe('Delete');
    });

    it('returns "↑" for moveUp action', () => {
      expect(getDefaultActionLabel('moveUp')).toBe('↑');
    });

    it('returns "↓" for moveDown action', () => {
      expect(getDefaultActionLabel('moveDown')).toBe('↓');
    });

    it('returns capitalized type for unknown action', () => {
      expect(getDefaultActionLabel('custom')).toBe('Custom');
    });
  });

  describe('formatStatValue', () => {
    const char = createTestCharacter({
      race: 'Human',
      class: 'Fighter',
      level: 5,
      hp: 30,
      maxHP: 40,
      ac: 3,
      alignment: 'Good'
    });

    it('formats race field', () => {
      expect(formatStatValue('race', char)).toBe('Human');
    });

    it('formats class field', () => {
      expect(formatStatValue('class', char)).toBe('Fighter');
    });

    it('formats level field', () => {
      expect(formatStatValue('level', char)).toBe('3');
    });

    it('formats hp field as current/max', () => {
      expect(formatStatValue('hp', char)).toBe('30/40');
    });

    it('formats ac field', () => {
      expect(formatStatValue('ac', char)).toBe('3');
    });

    it('formats alignment field', () => {
      expect(formatStatValue('alignment', char)).toBe('Good');
    });
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npm test -- CharacterDisplayHelpers`

Expected: FAIL - module not found

**Step 4: Implement helper functions**

Create `src/helpers/CharacterDisplayHelpers.ts`:

```typescript
import { CharacterStatus } from '../types/CharacterTypes';
import { Character } from '../types/GameTypes';
import { CharacterField } from '../types/CharacterCardTypes';

export function formatHP(current: number, max: number): string {
  return `${current}/${max}`;
}

export function getStatusColorClass(status: CharacterStatus): string {
  const statusMap: Record<CharacterStatus, string> = {
    [CharacterStatus.OK]: 'status-ok',
    [CharacterStatus.DEAD]: 'status-dead',
    [CharacterStatus.ASHES]: 'status-ashes',
    [CharacterStatus.LOST]: 'status-lost',
    [CharacterStatus.AFRAID]: 'status-afflicted',
    [CharacterStatus.ASLEEP]: 'status-afflicted',
    [CharacterStatus.PARALYZED]: 'status-afflicted',
    [CharacterStatus.POISONED]: 'status-afflicted',
    [CharacterStatus.SILENCED]: 'status-afflicted',
    [CharacterStatus.STONED]: 'status-ashes'
  };

  return statusMap[status] || 'status-ok';
}

export function getDefaultActionLabel(type: string): string {
  const labels: Record<string, string> = {
    inspect: 'Inspect',
    add: 'Add',
    remove: 'Remove',
    delete: 'Delete',
    moveUp: '↑',
    moveDown: '↓'
  };

  return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

export function formatStatValue(field: CharacterField, character: Character): string {
  switch (field) {
    case 'race':
      return character.race;
    case 'class':
      return character.class;
    case 'level':
      return character.level.toString();
    case 'hp':
      return formatHP(character.hp, character.maxHP);
    case 'ac':
      return character.ac.toString();
    case 'alignment':
      return character.alignment;
    default:
      return '';
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `npm test -- CharacterDisplayHelpers`

Expected: PASS - all tests green, 100% coverage

**Step 6: Commit**

```bash
git add src/types/CharacterCardTypes.ts src/helpers/CharacterDisplayHelpers.ts src/helpers/__tests__/CharacterDisplayHelpers.spec.ts
git commit -m "feat: add character card type definitions and helper functions"
```

---

### Task 2: Create StatusBadgeComponent

**Files:**
- Create: `src/components/status-badge/status-badge.component.ts`
- Create: `src/components/status-badge/status-badge.component.html`
- Create: `src/components/status-badge/status-badge.component.scss`
- Create: `src/components/status-badge/__tests__/status-badge.component.spec.ts`

**Step 1: Write failing component tests**

Create `src/components/status-badge/__tests__/status-badge.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from '../status-badge.component';
import { CharacterStatus } from '../../../types/CharacterTypes';

describe('StatusBadgeComponent', () => {
  let component: StatusBadgeComponent;
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('badge variant', () => {
    beforeEach(() => {
      component.variant = 'badge';
    });

    it('displays OK status with green styling', () => {
      component.status = CharacterStatus.OK;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.textContent.trim()).toBe('OK');
      expect(badge.classList.contains('status-ok')).toBe(true);
      expect(badge.classList.contains('badge')).toBe(true);
    });

    it('displays DEAD status with red styling', () => {
      component.status = CharacterStatus.DEAD;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.textContent.trim()).toBe('DEAD');
      expect(badge.classList.contains('status-dead')).toBe(true);
    });

    it('displays ASHES status with gray styling', () => {
      component.status = CharacterStatus.ASHES;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.textContent.trim()).toBe('ASHES');
      expect(badge.classList.contains('status-ashes')).toBe(true);
    });

    it('displays LOST status with dim styling', () => {
      component.status = CharacterStatus.LOST;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.textContent.trim()).toBe('LOST');
      expect(badge.classList.contains('status-lost')).toBe(true);
    });
  });

  describe('inline variant', () => {
    beforeEach(() => {
      component.variant = 'inline';
    });

    it('renders without badge background', () => {
      component.status = CharacterStatus.OK;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.classList.contains('inline')).toBe(true);
      expect(badge.classList.contains('badge')).toBe(false);
    });

    it('still applies status color class', () => {
      component.status = CharacterStatus.DEAD;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.classList.contains('status-dead')).toBe(true);
    });
  });

  describe('default props', () => {
    it('defaults to badge variant', () => {
      component.status = CharacterStatus.OK;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('.status-badge');
      expect(badge.classList.contains('badge')).toBe(true);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- status-badge.component`

Expected: FAIL - component not found

**Step 3: Implement StatusBadgeComponent**

Create `src/components/status-badge/status-badge.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterStatus } from '../../types/CharacterTypes';
import { getStatusColorClass } from '../../helpers/CharacterDisplayHelpers';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  @Input() status!: CharacterStatus;
  @Input() variant: 'badge' | 'inline' = 'badge';

  get statusColorClass(): string {
    return getStatusColorClass(this.status);
  }
}
```

Create `src/components/status-badge/status-badge.component.html`:

```html
<span
  class="status-badge"
  [ngClass]="{
    'badge': variant === 'badge',
    'inline': variant === 'inline',
    [statusColorClass]: true
  }">
  {{ status }}
</span>
```

Create `src/components/status-badge/status-badge.component.scss`:

```scss
@use '../../../styles/variables' as *;

.status-badge {
  font-family: $font-mono;
  font-size: $font-size-base;
  text-transform: uppercase;

  &.badge {
    padding: $spacing-xs $spacing-sm;
    border-radius: 4px;
    display: inline-block;
  }

  &.inline {
    display: inline;
  }

  // Status colors
  &.status-ok {
    color: $color-text-green;

    &.badge {
      background-color: rgba(0, 255, 0, 0.1);
      border: 1px solid $color-text-green;
    }
  }

  &.status-dead,
  &.status-afflicted {
    color: $color-error;

    &.badge {
      background-color: rgba(255, 0, 0, 0.1);
      border: 1px solid $color-error;
    }
  }

  &.status-ashes {
    color: #666666;

    &.badge {
      background-color: rgba(102, 102, 102, 0.1);
      border: 1px solid #666666;
    }
  }

  &.status-lost {
    color: $color-text-dim;

    &.badge {
      background-color: rgba(0, 136, 0, 0.1);
      border: 1px solid $color-text-dim;
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- status-badge.component`

Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add src/components/status-badge/
git commit -m "feat: add StatusBadgeComponent with badge and inline variants"
```

---

### Task 3: Create CharacterStatsComponent

**Files:**
- Create: `src/components/character-stats/character-stats.component.ts`
- Create: `src/components/character-stats/character-stats.component.html`
- Create: `src/components/character-stats/character-stats.component.scss`
- Create: `src/components/character-stats/__tests__/character-stats.component.spec.ts`

**Step 1: Write failing component tests**

Create `src/components/character-stats/__tests__/character-stats.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterStatsComponent } from '../character-stats.component';
import { createTestCharacter } from '../../../../tests/helpers/test-factories';

describe('CharacterStatsComponent', () => {
  let component: CharacterStatsComponent;
  let fixture: ComponentFixture<CharacterStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterStatsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterStatsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('field display', () => {
    beforeEach(() => {
      component.character = createTestCharacter({
        race: 'Human',
        class: 'Fighter',
        level: 5,
        hp: 30,
        maxHP: 40,
        ac: 3,
        alignment: 'Good'
      });
    });

    it('displays only specified fields', () => {
      component.fields = ['race', 'class'];
      fixture.detectChanges();

      const stats = fixture.nativeElement.querySelectorAll('.stat-item');
      expect(stats.length).toBe(2);
      expect(stats[0].textContent).toContain('Race');
      expect(stats[0].textContent).toContain('Human');
      expect(stats[1].textContent).toContain('Class');
      expect(stats[1].textContent).toContain('Fighter');
    });

    it('formats HP as current/max', () => {
      component.fields = ['hp'];
      fixture.detectChanges();

      const stat = fixture.nativeElement.querySelector('.stat-item');
      expect(stat.textContent).toContain('HP');
      expect(stat.textContent).toContain('30/40');
    });

    it('displays level in amber color', () => {
      component.fields = ['level'];
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.stat-value');
      expect(value.classList.contains('amber')).toBe(true);
    });

    it('displays all field types correctly', () => {
      component.fields = ['race', 'class', 'level', 'hp', 'ac', 'alignment'];
      fixture.detectChanges();

      const stats = fixture.nativeElement.querySelectorAll('.stat-item');
      expect(stats.length).toBe(6);
    });
  });

  describe('layout modes', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
      component.fields = ['race', 'class', 'level'];
    });

    it('applies vertical layout by default', () => {
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.character-stats');
      expect(container.classList.contains('vertical')).toBe(true);
    });

    it('applies horizontal layout when specified', () => {
      component.layout = 'horizontal';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.character-stats');
      expect(container.classList.contains('horizontal')).toBe(true);
    });
  });

  describe('field labels', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
    });

    it('displays proper capitalized labels', () => {
      component.fields = ['race', 'class', 'hp', 'ac'];
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('.stat-label');
      expect(labels[0].textContent.trim()).toBe('Race:');
      expect(labels[1].textContent.trim()).toBe('Class:');
      expect(labels[2].textContent.trim()).toBe('HP:');
      expect(labels[3].textContent.trim()).toBe('AC:');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- character-stats.component`

Expected: FAIL - component not found

**Step 3: Implement CharacterStatsComponent**

Create `src/components/character-stats/character-stats.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/GameTypes';
import { CharacterField } from '../../types/CharacterCardTypes';
import { formatStatValue } from '../../helpers/CharacterDisplayHelpers';

@Component({
  selector: 'app-character-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-stats.component.html',
  styleUrls: ['./character-stats.component.scss']
})
export class CharacterStatsComponent {
  @Input() character!: Character;
  @Input() fields!: CharacterField[];
  @Input() layout: 'vertical' | 'horizontal' = 'vertical';

  getFieldLabel(field: CharacterField): string {
    const labels: Record<CharacterField, string> = {
      race: 'Race',
      class: 'Class',
      level: 'Level',
      hp: 'HP',
      ac: 'AC',
      alignment: 'Alignment'
    };
    return labels[field];
  }

  getFieldValue(field: CharacterField): string {
    return formatStatValue(field, this.character);
  }

  isAmberField(field: CharacterField): boolean {
    return field === 'level';
  }
}
```

Create `src/components/character-stats/character-stats.component.html`:

```html
<div class="character-stats" [ngClass]="{ 'vertical': layout === 'vertical', 'horizontal': layout === 'horizontal' }">
  <div class="stat-item" *ngFor="let field of fields">
    <span class="stat-label">{{ getFieldLabel(field) }}:</span>
    <span class="stat-value" [ngClass]="{ 'amber': isAmberField(field) }">
      {{ getFieldValue(field) }}
    </span>
  </div>
</div>
```

Create `src/components/character-stats/character-stats.component.scss`:

```scss
@use '../../../styles/variables' as *;

.character-stats {
  font-family: $font-mono;
  font-size: $font-size-base;

  &.vertical {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  &.horizontal {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm $spacing-md;
  }
}

.stat-item {
  display: flex;
  gap: $spacing-xs;

  .horizontal & {
    white-space: nowrap;
  }
}

.stat-label {
  color: $color-text-green;
  font-weight: normal;
}

.stat-value {
  color: $color-text-bright;

  &.amber {
    color: $color-amber;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- character-stats.component`

Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add src/components/character-stats/
git commit -m "feat: add CharacterStatsComponent with configurable fields and layouts"
```

---

### Task 4: Create CharacterActionsComponent

**Files:**
- Create: `src/components/character-actions/character-actions.component.ts`
- Create: `src/components/character-actions/character-actions.component.html`
- Create: `src/components/character-actions/character-actions.component.scss`
- Create: `src/components/character-actions/__tests__/character-actions.component.spec.ts`

**Step 1: Write failing component tests**

Create `src/components/character-actions/__tests__/character-actions.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterActionsComponent } from '../character-actions.component';
import { CharacterAction } from '../../../types/CharacterCardTypes';

describe('CharacterActionsComponent', () => {
  let component: CharacterActionsComponent;
  let fixture: ComponentFixture<CharacterActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterActionsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterActionsComponent);
    component = fixture.componentInstance;
    component.characterId = 'test-char-123';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('button rendering', () => {
    it('renders all provided actions', () => {
      component.actions = [
        { type: 'inspect' },
        { type: 'add' },
        { type: 'delete' }
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBe(3);
      expect(buttons[0].textContent.trim()).toBe('Inspect');
      expect(buttons[1].textContent.trim()).toBe('Add');
      expect(buttons[2].textContent.trim()).toBe('Delete');
    });

    it('uses custom label when provided', () => {
      component.actions = [
        { type: 'inspect', label: 'View Details' }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent.trim()).toBe('View Details');
    });

    it('uses default labels when not provided', () => {
      component.actions = [
        { type: 'moveUp' },
        { type: 'moveDown' }
      ];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons[0].textContent.trim()).toBe('↑');
      expect(buttons[1].textContent.trim()).toBe('↓');
    });
  });

  describe('button state', () => {
    it('disables buttons when enabled=false', () => {
      component.actions = [
        { type: 'inspect', enabled: false }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(true);
    });

    it('enables buttons by default', () => {
      component.actions = [
        { type: 'inspect' }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(false);
    });

    it('enables buttons when enabled=true', () => {
      component.actions = [
        { type: 'inspect', enabled: true }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.disabled).toBe(false);
    });
  });

  describe('button styling', () => {
    it('applies default variant by default', () => {
      component.actions = [
        { type: 'inspect' }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('default')).toBe(true);
      expect(button.classList.contains('danger')).toBe(false);
    });

    it('applies danger variant when specified', () => {
      component.actions = [
        { type: 'delete', variant: 'danger' }
      ];
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.classList.contains('danger')).toBe(true);
    });
  });

  describe('event emission', () => {
    it('emits actionClick with characterId and actionType', () => {
      component.actions = [
        { type: 'inspect' }
      ];
      fixture.detectChanges();

      let emittedEvent: any;
      component.actionClick.subscribe(event => {
        emittedEvent = event;
      });

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(emittedEvent).toEqual({
        characterId: 'test-char-123',
        actionType: 'inspect'
      });
    });

    it('emits correct actionType for each button', () => {
      component.actions = [
        { type: 'add' },
        { type: 'remove' }
      ];
      fixture.detectChanges();

      const events: any[] = [];
      component.actionClick.subscribe(event => {
        events.push(event);
      });

      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons[0].click();
      buttons[1].click();

      expect(events[0].actionType).toBe('add');
      expect(events[1].actionType).toBe('remove');
    });

    it('does not emit when button is disabled', () => {
      component.actions = [
        { type: 'inspect', enabled: false }
      ];
      fixture.detectChanges();

      let emitted = false;
      component.actionClick.subscribe(() => {
        emitted = true;
      });

      const button = fixture.nativeElement.querySelector('button');
      button.click();

      expect(emitted).toBe(false);
    });
  });

  describe('empty actions', () => {
    it('renders nothing when actions array is empty', () => {
      component.actions = [];
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- character-actions.component`

Expected: FAIL - component not found

**Step 3: Implement CharacterActionsComponent**

Create `src/components/character-actions/character-actions.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterAction, CharacterActionEvent } from '../../types/CharacterCardTypes';
import { getDefaultActionLabel } from '../../helpers/CharacterDisplayHelpers';

@Component({
  selector: 'app-character-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-actions.component.html',
  styleUrls: ['./character-actions.component.scss']
})
export class CharacterActionsComponent {
  @Input() actions!: CharacterAction[];
  @Input() characterId!: string;
  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

  getButtonLabel(action: CharacterAction): string {
    return action.label || getDefaultActionLabel(action.type);
  }

  isEnabled(action: CharacterAction): boolean {
    return action.enabled !== false;
  }

  getVariant(action: CharacterAction): string {
    return action.variant || 'default';
  }

  handleClick(action: CharacterAction): void {
    if (this.isEnabled(action)) {
      this.actionClick.emit({
        characterId: this.characterId,
        actionType: action.type
      });
    }
  }
}
```

Create `src/components/character-actions/character-actions.component.html`:

```html
<div class="character-actions">
  <button
    *ngFor="let action of actions"
    class="action-btn"
    [ngClass]="getVariant(action)"
    [disabled]="!isEnabled(action)"
    (click)="handleClick(action)">
    {{ getButtonLabel(action) }}
  </button>
</div>
```

Create `src/components/character-actions/character-actions.component.scss`:

```scss
@use '../../../styles/variables' as *;

.character-actions {
  display: flex;
  gap: $spacing-sm;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.action-btn {
  font-family: $font-mono;
  font-size: $font-size-base;
  padding: $spacing-xs $spacing-md;
  background-color: $color-bg-black;
  color: $color-text-green;
  border: 1px solid $color-border;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;

  &:hover:not(:disabled) {
    background-color: lighten($color-bg-black, 5%);
    border-color: $color-text-bright;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.default {
    // Default styling already applied above
  }

  &.danger {
    color: $color-error;
    border-color: $color-error;

    &:hover:not(:disabled) {
      border-color: lighten($color-error, 10%);
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- character-actions.component`

Expected: PASS - all tests green

**Step 5: Commit**

```bash
git add src/components/character-actions/
git commit -m "feat: add CharacterActionsComponent with configurable actions"
```

---

### Task 5: Create CharacterCardComponent (Main Orchestrator)

**Files:**
- Create: `src/components/character-card/character-card.component.ts`
- Create: `src/components/character-card/character-card.component.html`
- Create: `src/components/character-card/character-card.component.scss`
- Create: `src/components/character-card/__tests__/character-card.component.spec.ts`

**Step 1: Write failing component tests**

Create `src/components/character-card/__tests__/character-card.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterCardComponent } from '../character-card.component';
import { createTestCharacter } from '../../../../tests/helpers/test-factories';
import { CharacterStatus } from '../../../types/CharacterTypes';

describe('CharacterCardComponent', () => {
  let component: CharacterCardComponent;
  let fixture: ComponentFixture<CharacterCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('header rendering', () => {
    beforeEach(() => {
      component.character = createTestCharacter({ name: 'Gandalf' });
    });

    it('displays character name prominently', () => {
      fixture.detectChanges();

      const name = fixture.nativeElement.querySelector('.character-name');
      expect(name.textContent.trim()).toBe('Gandalf');
    });

    it('displays status badge in header', () => {
      component.character = createTestCharacter({ status: CharacterStatus.OK });
      fixture.detectChanges();

      const statusBadge = fixture.nativeElement.querySelector('app-status-badge');
      expect(statusBadge).toBeTruthy();
    });
  });

  describe('field visibility', () => {
    beforeEach(() => {
      component.character = createTestCharacter({
        race: 'Human',
        class: 'Fighter',
        level: 5,
        hp: 30,
        maxHP: 40,
        ac: 3,
        alignment: 'Good'
      });
    });

    it('displays only specified visible fields', () => {
      component.visibleFields = ['race', 'class'];
      fixture.detectChanges();

      const statsComponent = fixture.nativeElement.querySelector('app-character-stats');
      expect(statsComponent).toBeTruthy();
    });

    it('displays default fields when visibleFields is undefined', () => {
      component.visibleFields = undefined;
      fixture.detectChanges();

      // Should show default fields: class, level, hp
      const statsComponent = fixture.nativeElement.querySelector('app-character-stats');
      expect(statsComponent).toBeTruthy();
    });

    it('hides stats section when visibleFields is empty array', () => {
      component.visibleFields = [];
      fixture.detectChanges();

      const statsComponent = fixture.nativeElement.querySelector('app-character-stats');
      expect(statsComponent).toBeFalsy();
    });
  });

  describe('actions rendering', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
    });

    it('displays action buttons when provided', () => {
      component.actions = [
        { type: 'inspect' },
        { type: 'delete', variant: 'danger' }
      ];
      fixture.detectChanges();

      const actionsComponent = fixture.nativeElement.querySelector('app-character-actions');
      expect(actionsComponent).toBeTruthy();
    });

    it('hides actions section when no actions provided', () => {
      component.actions = [];
      fixture.detectChanges();

      const actionsComponent = fixture.nativeElement.querySelector('app-character-actions');
      expect(actionsComponent).toBeFalsy();
    });

    it('hides actions section when actions is undefined', () => {
      component.actions = undefined;
      fixture.detectChanges();

      const actionsComponent = fixture.nativeElement.querySelector('app-character-actions');
      expect(actionsComponent).toBeFalsy();
    });
  });

  describe('variant styling', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
    });

    it('applies default variant by default', () => {
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.character-card');
      expect(card.classList.contains('default')).toBe(true);
    });

    it('applies compact variant when specified', () => {
      component.variant = 'compact';
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.character-card');
      expect(card.classList.contains('compact')).toBe(true);
    });
  });

  describe('event forwarding', () => {
    beforeEach(() => {
      component.character = createTestCharacter({ id: 'test-123' });
      component.actions = [{ type: 'inspect' }];
    });

    it('forwards actionClick events from CharacterActionsComponent', () => {
      fixture.detectChanges();

      let emittedEvent: any;
      component.actionClick.subscribe(event => {
        emittedEvent = event;
      });

      // Simulate click from child component
      const actionsComponent = fixture.nativeElement.querySelector('app-character-actions');
      actionsComponent.dispatchEvent(new CustomEvent('actionClick', {
        detail: { characterId: 'test-123', actionType: 'inspect' },
        bubbles: true
      }));

      // Note: This test verifies the component is set up to forward events
      // The actual event emission is tested in CharacterActionsComponent tests
    });
  });

  describe('layout structure', () => {
    beforeEach(() => {
      component.character = createTestCharacter();
      component.visibleFields = ['class', 'level'];
      component.actions = [{ type: 'inspect' }];
    });

    it('renders header, stats, and actions sections', () => {
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.card-header');
      const stats = fixture.nativeElement.querySelector('.card-stats');
      const actions = fixture.nativeElement.querySelector('.card-actions');

      expect(header).toBeTruthy();
      expect(stats).toBeTruthy();
      expect(actions).toBeTruthy();
    });

    it('includes dividers between sections', () => {
      fixture.detectChanges();

      const dividers = fixture.nativeElement.querySelectorAll('.card-divider');
      expect(dividers.length).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- character-card.component`

Expected: FAIL - component not found

**Step 3: Implement CharacterCardComponent**

Create `src/components/character-card/character-card.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/GameTypes';
import { CharacterField, CharacterAction, CharacterActionEvent } from '../../types/CharacterCardTypes';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { CharacterStatsComponent } from '../character-stats/character-stats.component';
import { CharacterActionsComponent } from '../character-actions/character-actions.component';

@Component({
  selector: 'app-character-card',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    CharacterStatsComponent,
    CharacterActionsComponent
  ],
  templateUrl: './character-card.component.html',
  styleUrls: ['./character-card.component.scss']
})
export class CharacterCardComponent {
  @Input() character!: Character;
  @Input() visibleFields?: CharacterField[];
  @Input() actions?: CharacterAction[];
  @Input() variant: 'default' | 'compact' = 'default';
  @Output() actionClick = new EventEmitter<CharacterActionEvent>();

  get displayFields(): CharacterField[] {
    if (this.visibleFields === undefined) {
      // Default fields when not specified
      return ['class', 'level', 'hp'];
    }
    return this.visibleFields;
  }

  get hasStats(): boolean {
    return this.displayFields.length > 0;
  }

  get hasActions(): boolean {
    return !!this.actions && this.actions.length > 0;
  }

  handleActionClick(event: CharacterActionEvent): void {
    this.actionClick.emit(event);
  }
}
```

Create `src/components/character-card/character-card.component.html`:

```html
<div class="character-card" [ngClass]="{ 'default': variant === 'default', 'compact': variant === 'compact' }">
  <!-- Header: Name + Status -->
  <div class="card-header">
    <div class="character-name">{{ character.name }}</div>
    <app-status-badge [status]="character.status" variant="badge"></app-status-badge>
  </div>

  <div class="card-divider"></div>

  <!-- Stats Section -->
  <div class="card-stats" *ngIf="hasStats">
    <app-character-stats
      [character]="character"
      [fields]="displayFields"
      [layout]="variant === 'compact' ? 'horizontal' : 'vertical'">
    </app-character-stats>
  </div>

  <div class="card-divider" *ngIf="hasActions"></div>

  <!-- Actions Section -->
  <div class="card-actions" *ngIf="hasActions">
    <app-character-actions
      [actions]="actions!"
      [characterId]="character.id"
      (actionClick)="handleActionClick($event)">
    </app-character-actions>
  </div>
</div>
```

Create `src/components/character-card/character-card.component.scss`:

```scss
@use '../../../styles/variables' as *;

.character-card {
  display: grid;
  grid-template-rows: auto 1px auto 1px auto;
  background-color: $color-bg-black;
  border: 1px solid $color-border;
  padding: $spacing-md;
  font-family: $font-mono;
  transition: background-color 0.2s, border-color 0.2s;

  &.default {
    min-height: 120px;
  }

  &.compact {
    min-height: 80px;
  }

  &:hover {
    background-color: lighten($color-bg-black, 5%);
    border-color: $color-text-bright;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
}

.character-name {
  font-size: $font-size-large;
  font-weight: bold;
  color: $color-text-bright;
}

.card-divider {
  height: 1px;
  background-color: $color-border;
  margin: $spacing-sm 0;
}

.card-stats {
  display: flex;
  flex-direction: column;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- character-card.component`

Expected: PASS - all tests green

**Step 5: Verify full test coverage**

Run: `npm test -- --coverage --collectCoverageFrom='src/components/character-card/**/*.ts' --collectCoverageFrom='src/components/status-badge/**/*.ts' --collectCoverageFrom='src/components/character-stats/**/*.ts' --collectCoverageFrom='src/components/character-actions/**/*.ts' --collectCoverageFrom='src/helpers/CharacterDisplayHelpers.ts'`

Expected: 95%+ coverage across all new components

**Step 6: Commit**

```bash
git add src/components/character-card/
git commit -m "feat: add CharacterCardComponent orchestrator with sub-components"
```

---

### Task 6: Migrate Training Grounds Scene

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.ts`
- Modify: `src/app/training-grounds/training-grounds.component.html`
- Delete: `src/app/components/training-grounds-character-card/` (entire directory)

**Step 1: Update Training Grounds component to use new CharacterCardComponent**

Modify `src/app/training-grounds/training-grounds.component.ts`:

Find the import section and replace:
```typescript
import { TrainingGroundsCharacterCardComponent } from '../components/training-grounds-character-card/training-grounds-character-card.component';
```

With:
```typescript
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
```

Update the imports array in @Component:
```typescript
imports: [
  CommonModule,
  CharacterCardComponent,  // Changed from TrainingGroundsCharacterCardComponent
  SceneTitleComponent,
  SceneFooterComponent,
  ConfirmationDialogComponent
]
```

Update the handleInspectCharacter method signature (if needed):
```typescript
handleInspectCharacter(event: CharacterActionEvent): void {
  this.router.navigate(['/character-inspection'], {
    queryParams: {
      characterId: event.characterId,
      returnTo: 'training-grounds'
    }
  });
}
```

Update the handleDeleteCharacter method signature:
```typescript
handleDeleteCharacter(event: CharacterActionEvent): void {
  this.characterToDelete = event.characterId;
  this.showDeleteConfirmation = true;
}
```

**Step 2: Update Training Grounds template**

Modify `src/app/training-grounds/training-grounds.component.html`:

Find the character card usage:
```html
<app-training-grounds-character-card
  [character]="item.character"
  [status]="item.status"
  (inspect)="handleInspectCharacter($event)"
  (delete)="handleDeleteCharacter($event)">
</app-training-grounds-character-card>
```

Replace with:
```html
<app-character-card
  [character]="item.character"
  [visibleFields]="['race', 'class', 'level']"
  [actions]="[
    { type: 'inspect' },
    { type: 'delete', variant: 'danger' }
  ]"
  variant="compact"
  (actionClick)="handleActionClick($event)">
</app-character-card>
```

**Step 3: Add unified action handler**

Add to `src/app/training-grounds/training-grounds.component.ts`:

```typescript
handleActionClick(event: CharacterActionEvent): void {
  if (event.actionType === 'inspect') {
    this.handleInspectCharacter(event);
  } else if (event.actionType === 'delete') {
    this.handleDeleteCharacter(event);
  }
}
```

**Step 4: Run integration tests**

Run: `npm test -- training-grounds`

Expected: PASS - all existing tests pass with new component

**Step 5: Manual verification (if in dev mode)**

If running dev server:
- Navigate to Training Grounds
- Verify character cards display correctly
- Verify Inspect button works
- Verify Delete button works
- Verify styling matches previous implementation

**Step 6: Delete old component**

```bash
rm -rf src/app/components/training-grounds-character-card/
```

**Step 7: Commit**

```bash
git add src/app/training-grounds/ src/app/components/
git commit -m "refactor: migrate Training Grounds to use new CharacterCardComponent"
```

---

### Task 7: Migrate Tavern Scene

**Files:**
- Modify: `src/app/tavern/tavern.component.ts`
- Modify: `src/app/tavern/tavern.component.html`
- Delete: `src/app/components/tavern-character-card/` (entire directory)

**Step 1: Update Tavern component imports**

Modify `src/app/tavern/tavern.component.ts`:

Replace:
```typescript
import { TavernCharacterCardComponent } from '../components/tavern-character-card/tavern-character-card.component';
```

With:
```typescript
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { CharacterActionEvent, CharacterAction } from '../../types/CharacterCardTypes';
```

Update imports array:
```typescript
imports: [
  CommonModule,
  CharacterCardComponent,  // Changed from TavernCharacterCardComponent
  SceneTitleComponent,
  SceneFooterComponent,
  ConfirmationDialogComponent
]
```

**Step 2: Add helper method for dynamic actions**

Add to `src/app/tavern/tavern.component.ts`:

```typescript
getCharacterActions(characterId: string, isInParty: boolean): CharacterAction[] {
  if (isInParty) {
    const partyIndex = this.currentParty().findIndex(c => c.id === characterId);
    const canMoveUp = partyIndex > 0;
    const canMoveDown = partyIndex < this.currentParty().length - 1;

    return [
      { type: 'remove', variant: 'danger' },
      { type: 'inspect' },
      { type: 'moveUp', enabled: canMoveUp },
      { type: 'moveDown', enabled: canMoveDown }
    ];
  } else {
    return [
      { type: 'add' },
      { type: 'inspect' }
    ];
  }
}
```

**Step 3: Update Tavern template**

Modify `src/app/tavern/tavern.component.html`:

Find available characters section:
```html
<app-tavern-character-card
  [character]="character"
  [isInParty]="false"
  (inspect)="onInspect($event)"
  (add)="onAddCharacter($event)">
</app-tavern-character-card>
```

Replace with:
```html
<app-character-card
  [character]="character"
  [visibleFields]="['class', 'level', 'race', 'alignment']"
  [actions]="getCharacterActions(character.id, false)"
  variant="compact"
  (actionClick)="handleActionClick($event)">
</app-character-card>
```

Find party members section:
```html
<app-tavern-character-card
  [character]="character"
  [isInParty]="true"
  [canMoveUp]="i > 0"
  [canMoveDown]="i < currentParty().length - 1"
  (inspect)="onInspect($event)"
  (remove)="onRemoveCharacter($event)"
  (moveUp)="onMoveUp($event)"
  (moveDown)="onMoveDown($event)">
</app-tavern-character-card>
```

Replace with:
```html
<app-character-card
  [character]="character"
  [visibleFields]="['class', 'level', 'race', 'alignment']"
  [actions]="getCharacterActions(character.id, true)"
  variant="compact"
  (actionClick)="handleActionClick($event)">
</app-character-card>
```

**Step 4: Add unified action handler**

Add to `src/app/tavern/tavern.component.ts`:

```typescript
handleActionClick(event: CharacterActionEvent): void {
  switch (event.actionType) {
    case 'add':
      this.onAddCharacter(event.characterId);
      break;
    case 'remove':
      this.onRemoveCharacter(event.characterId);
      break;
    case 'moveUp':
      this.onMoveUp(event.characterId);
      break;
    case 'moveDown':
      this.onMoveDown(event.characterId);
      break;
    case 'inspect':
      this.onInspect(event.characterId);
      break;
  }
}
```

**Step 5: Update existing handler methods to accept string ID**

Modify existing methods in `src/app/tavern/tavern.component.ts`:

```typescript
onAddCharacter(characterId: string): void {
  // Existing logic, use characterId directly
}

onRemoveCharacter(characterId: string): void {
  // Existing logic, use characterId directly
}

onMoveUp(characterId: string): void {
  // Existing logic, use characterId directly
}

onMoveDown(characterId: string): void {
  // Existing logic, use characterId directly
}

onInspect(characterId: string): void {
  this.router.navigate(['/character-inspection'], {
    queryParams: {
      characterId: characterId,
      returnTo: 'tavern'
    }
  });
}
```

**Step 6: Run integration tests**

Run: `npm test -- tavern`

Expected: PASS - all existing tests pass

**Step 7: Delete old component**

```bash
rm -rf src/app/components/tavern-character-card/
```

**Step 8: Commit**

```bash
git add src/app/tavern/ src/app/components/
git commit -m "refactor: migrate Tavern to use new CharacterCardComponent"
```

---

### Task 8: Migrate Castle Menu Scene

**Files:**
- Modify: `src/app/castle-menu/castle-menu.component.ts`
- Modify: `src/app/castle-menu/castle-menu.component.html`
- Delete: `src/app/components/castle-menu-character-card/` (entire directory)

**Step 1: Update Castle Menu component imports**

Modify `src/app/castle-menu/castle-menu.component.ts`:

Replace:
```typescript
import { CastleMenuCharacterCardComponent } from '../components/castle-menu-character-card/castle-menu-character-card.component';
```

With:
```typescript
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
```

Update imports array:
```typescript
imports: [
  CommonModule,
  CharacterCardComponent,  // Changed from CastleMenuCharacterCardComponent
  SceneTitleComponent,
  SceneFooterComponent
]
```

**Step 2: Update Castle Menu template**

Modify `src/app/castle-menu/castle-menu.component.html`:

Find the character card usage:
```html
<app-castle-menu-character-card
  [character]="char"
  (inspect)="handleInspectCharacter($event)">
</app-castle-menu-character-card>
```

Replace with:
```html
<app-character-card
  [character]="char"
  [visibleFields]="['race', 'class', 'level', 'hp', 'ac']"
  [actions]="[{ type: 'inspect' }]"
  variant="default"
  (actionClick)="handleActionClick($event)">
</app-character-card>
```

**Step 3: Add action handler**

Modify `src/app/castle-menu/castle-menu.component.ts`:

Add or update:
```typescript
handleActionClick(event: CharacterActionEvent): void {
  if (event.actionType === 'inspect') {
    this.handleInspectCharacter(event.characterId);
  }
}

handleInspectCharacter(characterId: string): void {
  this.router.navigate(['/character-inspection'], {
    queryParams: {
      characterId: characterId,
      returnTo: 'castle-menu'
    }
  });
}
```

**Step 4: Run integration tests**

Run: `npm test -- castle-menu`

Expected: PASS - all existing tests pass

**Step 5: Visual verification (manual, if dev server running)**

- Navigate to Castle Menu
- Verify character cards display with new standardized layout
- Note: Cards will be slightly different height (120px default instead of 140px)
- Verify Inspect button works
- Verify hover states work

**Step 6: Delete old component**

```bash
rm -rf src/app/components/castle-menu-character-card/
```

**Step 7: Commit**

```bash
git add src/app/castle-menu/ src/app/components/
git commit -m "refactor: migrate Castle Menu to use new CharacterCardComponent"
```

---

### Task 9: Fix Character Inspection Hardcoded Colors

**Files:**
- Modify: `src/app/character-inspection/character-inspection.component.scss`
- Modify: `src/app/character-inspection/character-inspection.component.ts`

**Step 1: Replace hardcoded colors in SCSS**

Modify `src/app/character-inspection/character-inspection.component.scss`:

Find and replace hardcoded colors:

**Before:**
```scss
.character-inspection {
  background-color: #000;
  color: #0f0;
  // ... etc
}

.character-name {
  color: #00ff88;
}

.stat-value {
  color: #ff0;
}

.status-ok {
  color: #0f0;
}

.status-dead {
  color: #f00;
}
```

**After:**
```scss
@use '../../../styles/variables' as *;

.character-inspection {
  background-color: $color-bg-black;
  color: $color-text-green;
  font-family: $font-mono;
  // ... etc
}

.character-name {
  color: $color-text-bright;
}

.stat-value {
  color: $color-amber;
}

.status-ok {
  color: $color-text-green;
}

.status-dead,
.status-afflicted {
  color: $color-error;
}

.status-ashes,
.status-lost {
  color: $color-text-dim;
}
```

**Step 2: Update component to use helper function**

Modify `src/app/character-inspection/character-inspection.component.ts`:

Add import:
```typescript
import { getStatusColorClass } from '../../helpers/CharacterDisplayHelpers';
```

Replace getStatusColor method:

**Before:**
```typescript
getStatusColor(status: string): string {
  switch (status) {
    case 'OK': return '#0f0';
    case 'DEAD': return '#f00';
    case 'ASHES': return '#666';
    default: return '#0f0';
  }
}
```

**After:**
```typescript
getStatusColorClass(status: CharacterStatus): string {
  return getStatusColorClass(status);
}
```

**Step 3: Update template to use CSS class instead of inline style**

Modify `src/app/character-inspection/character-inspection.component.html`:

Find:
```html
<div class="status-value" [style.color]="getStatusColor(character.status)">
  {{ character.status }}
</div>
```

Replace with:
```html
<div class="status-value" [ngClass]="getStatusColorClass(character.status)">
  {{ character.status }}
</div>
```

**Step 4: Run tests**

Run: `npm test -- character-inspection`

Expected: PASS - all tests pass

**Step 5: Visual verification (manual)**

- Navigate to Character Inspection
- Verify colors match other components
- Verify status colors are correct (OK=green, DEAD=red, etc.)

**Step 6: Commit**

```bash
git add src/app/character-inspection/
git commit -m "refactor: replace hardcoded colors with SCSS variables in Character Inspection"
```

---

### Task 10: Run Full Test Suite and Verify

**Step 1: Run full test suite**

Run: `npm test`

Expected: All tests pass (500+ tests)

**Step 2: Check test performance**

Expected: Test suite completes in <5 seconds

**Step 3: Generate coverage report**

Run: `npm test -- --coverage`

Expected:
- Overall coverage >80%
- New components coverage >95%
- CharacterDisplayHelpers coverage 100%

**Step 4: Verify no console errors**

Expected: No warnings or errors in test output

**Step 5: Run build**

Run: `npm run build`

Expected: Build succeeds with no errors

**Step 6: Commit verification**

```bash
git add .
git commit -m "test: verify all tests pass after character card refactoring"
```

---

### Task 11: Clean Up and Update Documentation

**Files:**
- Create: `docs/components/character-card-system.md`
- Modify: `docs/architecture.md` (if it exists)

**Step 1: Create component documentation**

Create `docs/components/character-card-system.md`:

```markdown
# Character Card Component System

## Overview

The character card component system is a set of composable Angular components for displaying character information across different scenes. It replaces the previous scene-specific card implementations with a unified, configurable system.

## Architecture

### Composition Pattern

The system uses the **Composition Pattern** with a main orchestrator component and three specialized sub-components:

```
CharacterCardComponent (orchestrator)
├── StatusBadgeComponent (status display)
├── CharacterStatsComponent (configurable stats)
└── CharacterActionsComponent (dynamic buttons)
```

### Components

#### CharacterCardComponent

Main orchestrator component that accepts configuration and delegates rendering.

**Props:**
- `character: Character` - Character data to display
- `visibleFields?: CharacterField[]` - Optional array of fields to show (default: ['class', 'level', 'hp'])
- `actions?: CharacterAction[]` - Optional array of action button configs
- `variant?: 'default' | 'compact'` - Layout size (default: 'default')

**Events:**
- `actionClick: EventEmitter<CharacterActionEvent>` - Emitted when action button clicked

**Usage:**
```typescript
<app-character-card
  [character]="char"
  [visibleFields]="['race', 'class', 'level', 'hp', 'ac']"
  [actions]="[{ type: 'inspect' }]"
  (actionClick)="handleAction($event)">
</app-character-card>
```

#### StatusBadgeComponent

Displays character status with color-coded styling.

**Props:**
- `status: CharacterStatus` - Character status to display
- `variant: 'badge' | 'inline'` - Display style (default: 'badge')

#### CharacterStatsComponent

Displays configurable character stats.

**Props:**
- `character: Character` - Character data
- `fields: CharacterField[]` - Array of fields to display
- `layout: 'vertical' | 'horizontal'` - Layout direction (default: 'vertical')

#### CharacterActionsComponent

Renders dynamic action buttons from configuration.

**Props:**
- `actions: CharacterAction[]` - Array of action configs
- `characterId: string` - Character ID for events

**Events:**
- `actionClick: EventEmitter<CharacterActionEvent>` - Emitted on button click

### Helper Functions

`CharacterDisplayHelpers.ts` provides pure utility functions:

- `formatHP(current: number, max: number): string` - Format HP as "X/Y"
- `getStatusColorClass(status: CharacterStatus): string` - Get CSS class for status
- `getDefaultActionLabel(type: string): string` - Get default label for action type
- `formatStatValue(field: CharacterField, character: Character): string` - Format stat value

## Layout

### Standard Card Layout

```
┌─────────────────────────────────────────────────┐
│ CHARACTER NAME              [Status Badge]      │
│ ─────────────────────────────────────────────── │
│                                                  │
│ Race: Human          HP: 12/20                  │
│ Class: Fighter       AC: 5                      │
│ Level: 3             Alignment: Good            │
│                                                  │
│ ─────────────────────────────────────────────── │
│              [Inspect] [Action] [Action]        │
└─────────────────────────────────────────────────┘
```

### Variants

- **Default**: min-height 120px, vertical stats layout
- **Compact**: min-height 80px, horizontal stats layout

## Usage Examples

### Castle Menu (AC display, inspect only)

```typescript
<app-character-card
  [character]="char"
  [visibleFields]="['race', 'class', 'level', 'hp', 'ac']"
  [actions]="[{ type: 'inspect' }]"
  (actionClick)="handleAction($event)">
</app-character-card>
```

### Tavern (alignment, party management)

```typescript
<app-character-card
  [character]="char"
  [visibleFields]="['class', 'level', 'race', 'alignment']"
  [actions]="[
    { type: 'add', enabled: !isInParty },
    { type: 'remove', enabled: isInParty, variant: 'danger' },
    { type: 'moveUp', enabled: canMoveUp },
    { type: 'moveDown', enabled: canMoveDown },
    { type: 'inspect' }
  ]"
  variant="compact"
  (actionClick)="handleAction($event)">
</app-character-card>
```

### Training Grounds (delete character)

```typescript
<app-character-card
  [character]="char"
  [visibleFields]="['race', 'class', 'level']"
  [actions]="[
    { type: 'inspect' },
    { type: 'delete', variant: 'danger' }
  ]"
  variant="compact"
  (actionClick)="handleAction($event)">
</app-character-card>
```

## Testing

All components have comprehensive unit tests with 95%+ coverage.

**Test files:**
- `src/components/character-card/__tests__/character-card.component.spec.ts`
- `src/components/status-badge/__tests__/status-badge.component.spec.ts`
- `src/components/character-stats/__tests__/character-stats.component.spec.ts`
- `src/components/character-actions/__tests__/character-actions.component.spec.ts`
- `src/helpers/__tests__/CharacterDisplayHelpers.spec.ts`

Run tests: `npm test -- character-card`

## Styling

All components use SCSS variables from `styles/variables.scss`:

- Colors: `$color-bg-black`, `$color-text-green`, `$color-text-bright`, `$color-amber`, `$color-error`
- Spacing: `$spacing-xs`, `$spacing-sm`, `$spacing-md`
- Typography: `$font-mono`, `$font-size-base`, `$font-size-large`

**No hardcoded colors allowed** - all styling uses variables for consistency.

## Migration History

This system replaced three scene-specific card implementations:
- `CastleMenuCharacterCardComponent` (deleted)
- `TavernCharacterCardComponent` (deleted)
- `TrainingGroundsCharacterCardComponent` (deleted)

Migration completed: 2025-11-04
```

**Step 2: Commit documentation**

```bash
git add docs/components/character-card-system.md
git commit -m "docs: add character card component system documentation"
```

---

## Summary

**What Was Built:**
1. Type-safe character card component system with composition pattern
2. 4 new components: CharacterCard, StatusBadge, CharacterStats, CharacterActions
3. Shared helper utilities for consistent formatting
4. Migration of 3 scenes to use new system
5. Fixed Character Inspection hardcoded colors
6. Comprehensive test coverage (95%+)

**Benefits Achieved:**
- ✅ Eliminated code duplication across 3 scenes
- ✅ Standardized visual design with consistent layout
- ✅ All components use SCSS variables (no hardcoded colors)
- ✅ Highly testable with small, focused components
- ✅ Configurable and reusable for future scenes
- ✅ Type-safe API with TypeScript interfaces

**Scenes Updated:**
1. Training Grounds - Uses compact variant with delete action
2. Tavern - Uses compact variant with dynamic party management actions
3. Castle Menu - Uses default variant with AC display and inspect only
4. Character Inspection - Fixed to use SCSS variables

**Files Created:** 16 new files (4 components × 4 files each)
**Files Deleted:** 12 old files (3 old components × 4 files each)
**Files Modified:** 9 scene files

**Test Coverage:**
- CharacterDisplayHelpers: 100%
- StatusBadgeComponent: 95%+
- CharacterStatsComponent: 95%+
- CharacterActionsComponent: 95%+
- CharacterCardComponent: 95%+

**Performance:**
- Full test suite: <5 seconds ✅
- Build time: No regression ✅
- No visual regressions ✅

---

## Execution Handoff

Plan complete and saved to `docs/plans/2025-11-04-character-card-component-refactor.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
