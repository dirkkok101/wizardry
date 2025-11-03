# Scene-Specific Character Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace wrapper-based character card composition with scene-specific card components for 30-43% vertical space reduction.

**Architecture:** Create TavernCharacterCardComponent and TrainingGroundsCharacterCardComponent as independent components with horizontal layouts. Delete old CharacterCardComponent, CharacterCardWrapperComponent, and CharacterCardActionsComponent. Use shared SCSS variables for visual consistency.

**Tech Stack:** Angular 19, TypeScript, Jest, SCSS

---

## Task 1: Create TavernCharacterCardComponent - Write Failing Tests

**Files:**
- Create: `src/components/tavern-character-card/__tests__/tavern-character-card.component.spec.ts`
- Create: `src/components/tavern-character-card/tavern-character-card.component.ts` (empty shell)
- Create: `src/components/tavern-character-card/tavern-character-card.component.html` (empty)
- Create: `src/components/tavern-character-card/tavern-character-card.component.scss` (empty)

**Step 1: Create component directory structure**

```bash
mkdir -p src/components/tavern-character-card/__tests__
```

**Step 2: Create empty component files**

Create `src/components/tavern-character-card/tavern-character-card.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';

@Component({
  selector: 'app-tavern-character-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tavern-character-card.component.html',
  styleUrls: ['./tavern-character-card.component.scss']
})
export class TavernCharacterCardComponent {
  @Input() character!: Character;
  @Input() isInParty: boolean = false;
  @Input() canMoveUp: boolean = true;
  @Input() canMoveDown: boolean = true;

  @Output() add = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() moveUp = new EventEmitter<string>();
  @Output() moveDown = new EventEmitter<string>();
  @Output() inspect = new EventEmitter<string>();
}
```

Create `src/components/tavern-character-card/tavern-character-card.component.html`:

```html
<div class="tavern-character-card">
  <!-- Empty for now -->
</div>
```

Create `src/components/tavern-character-card/tavern-character-card.component.scss`:

```scss
@use '../../styles/variables' as *;

.tavern-character-card {
  // Empty for now
}
```

**Step 3: Write failing tests**

Create `src/components/tavern-character-card/__tests__/tavern-character-card.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TavernCharacterCardComponent } from '../tavern-character-card.component';
import { createTestCharacter } from '../../../test-helpers/test-factories';

describe('TavernCharacterCardComponent', () => {
  let component: TavernCharacterCardComponent;
  let fixture: ComponentFixture<TavernCharacterCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TavernCharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TavernCharacterCardComponent);
    component = fixture.componentInstance;
    component.character = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
  });

  describe('rendering', () => {
    it('displays character name', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Gandalf');
    });

    it('displays race and class', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain(component.character.race);
      expect(compiled.textContent).toContain(component.character.class);
    });

    it('displays level', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Level');
    });
  });

  describe('when character is not in party', () => {
    beforeEach(() => {
      component.isInParty = false;
      fixture.detectChanges();
    });

    it('shows Add button', () => {
      const addBtn = fixture.nativeElement.querySelector('.add-btn');
      expect(addBtn).toBeTruthy();
    });

    it('hides Remove button', () => {
      const removeBtn = fixture.nativeElement.querySelector('.remove-btn');
      expect(removeBtn).toBeFalsy();
    });

    it('hides Move Up button', () => {
      const moveUpBtn = fixture.nativeElement.querySelector('.move-up-btn');
      expect(moveUpBtn).toBeFalsy();
    });

    it('hides Move Down button', () => {
      const moveDownBtn = fixture.nativeElement.querySelector('.move-down-btn');
      expect(moveDownBtn).toBeFalsy();
    });

    it('shows Inspect button', () => {
      const inspectBtn = fixture.nativeElement.querySelector('.inspect-btn');
      expect(inspectBtn).toBeTruthy();
    });

    it('emits add event when Add clicked', () => {
      jest.spyOn(component.add, 'emit');
      const addBtn = fixture.nativeElement.querySelector('.add-btn');
      addBtn.click();
      expect(component.add.emit).toHaveBeenCalledWith('char-1');
    });
  });

  describe('when character is in party', () => {
    beforeEach(() => {
      component.isInParty = true;
      fixture.detectChanges();
    });

    it('hides Add button', () => {
      const addBtn = fixture.nativeElement.querySelector('.add-btn');
      expect(addBtn).toBeFalsy();
    });

    it('shows Remove button', () => {
      const removeBtn = fixture.nativeElement.querySelector('.remove-btn');
      expect(removeBtn).toBeTruthy();
    });

    it('shows Move Up button', () => {
      const moveUpBtn = fixture.nativeElement.querySelector('.move-up-btn');
      expect(moveUpBtn).toBeTruthy();
    });

    it('shows Move Down button', () => {
      const moveDownBtn = fixture.nativeElement.querySelector('.move-down-btn');
      expect(moveDownBtn).toBeTruthy();
    });

    it('shows Inspect button', () => {
      const inspectBtn = fixture.nativeElement.querySelector('.inspect-btn');
      expect(inspectBtn).toBeTruthy();
    });

    it('emits remove event when Remove clicked', () => {
      jest.spyOn(component.remove, 'emit');
      const removeBtn = fixture.nativeElement.querySelector('.remove-btn');
      removeBtn.click();
      expect(component.remove.emit).toHaveBeenCalledWith('char-1');
    });

    it('emits moveUp event when Move Up clicked', () => {
      jest.spyOn(component.moveUp, 'emit');
      const moveUpBtn = fixture.nativeElement.querySelector('.move-up-btn');
      moveUpBtn.click();
      expect(component.moveUp.emit).toHaveBeenCalledWith('char-1');
    });

    it('emits moveDown event when Move Down clicked', () => {
      jest.spyOn(component.moveDown, 'emit');
      const moveDownBtn = fixture.nativeElement.querySelector('.move-down-btn');
      moveDownBtn.click();
      expect(component.moveDown.emit).toHaveBeenCalledWith('char-1');
    });

    it('disables Move Up button when canMoveUp is false', () => {
      component.canMoveUp = false;
      fixture.detectChanges();
      const moveUpBtn = fixture.nativeElement.querySelector('.move-up-btn');
      expect(moveUpBtn.disabled).toBe(true);
    });

    it('disables Move Down button when canMoveDown is false', () => {
      component.canMoveDown = false;
      fixture.detectChanges();
      const moveDownBtn = fixture.nativeElement.querySelector('.move-down-btn');
      expect(moveDownBtn.disabled).toBe(true);
    });
  });

  describe('inspect action', () => {
    it('emits inspect event when Inspect clicked', () => {
      component.isInParty = false;
      fixture.detectChanges();
      jest.spyOn(component.inspect, 'emit');
      const inspectBtn = fixture.nativeElement.querySelector('.inspect-btn');
      inspectBtn.click();
      expect(component.inspect.emit).toHaveBeenCalledWith('char-1');
    });
  });
});
```

**Step 4: Run tests to verify they fail**

```bash
npm test -- tavern-character-card
```

Expected: Tests fail with "Cannot find .add-btn", "textContent doesn't contain Gandalf", etc.

**Step 5: Commit failing tests**

```bash
git add src/components/tavern-character-card/
git commit -m "test: add failing tests for TavernCharacterCardComponent"
```

---

## Task 2: Implement TavernCharacterCardComponent Template and Make Tests Pass

**Files:**
- Modify: `src/components/tavern-character-card/tavern-character-card.component.html`
- Modify: `src/components/tavern-character-card/tavern-character-card.component.scss`

**Step 1: Implement template**

Update `src/components/tavern-character-card/tavern-character-card.component.html`:

```html
<div class="tavern-character-card">
  <div class="character-info">
    <div class="character-name">{{ character.name }}</div>
    <div class="character-details">
      <span class="race-class">{{ character.race }} {{ character.class }}</span>
      <span class="level">Level {{ character.level }}</span>
    </div>
  </div>

  <div class="character-actions">
    @if (!isInParty) {
      <button class="action-btn add-btn" (click)="add.emit(character.id)">
        Add
      </button>
    }

    @if (isInParty) {
      <button class="action-btn remove-btn" (click)="remove.emit(character.id)">
        Remove
      </button>
      <button
        class="action-btn move-up-btn"
        (click)="moveUp.emit(character.id)"
        [disabled]="!canMoveUp">
        Move Up
      </button>
      <button
        class="action-btn move-down-btn"
        (click)="moveDown.emit(character.id)"
        [disabled]="!canMoveDown">
        Move Down
      </button>
    }

    <button class="action-btn inspect-btn" (click)="inspect.emit(character.id)">
      Inspect
    </button>
  </div>
</div>
```

**Step 2: Implement styles**

Update `src/components/tavern-character-card/tavern-character-card.component.scss`:

```scss
@use '../../styles/variables' as *;

.tavern-character-card {
  display: grid;
  grid-template-columns: 60% 40%;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: $color-bg-black;
  border: 1px solid $color-text-green;
  height: 80px;
  align-items: center;

  .character-info {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    .character-name {
      font-family: $font-mono;
      font-size: 1rem;
      font-weight: bold;
      color: $color-text-green;
    }

    .character-details {
      display: flex;
      flex-direction: column;
      font-family: $font-mono;
      font-size: 0.875rem;
      color: $color-text-green;
      opacity: 0.8;

      .race-class {
        // Styling inherited
      }

      .level {
        // Styling inherited
      }
    }
  }

  .character-actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    .action-btn {
      padding: $spacing-xs;
      background: transparent;
      color: $color-text-green;
      border: 1px solid $color-text-green;
      cursor: pointer;
      font-family: $font-mono;
      font-size: 0.75rem;
      text-align: center;

      &:hover:not(:disabled) {
        background: $color-text-green;
        color: $color-bg-black;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
}
```

**Step 3: Run tests to verify they pass**

```bash
npm test -- tavern-character-card
```

Expected: All tests pass

**Step 4: Commit implementation**

```bash
git add src/components/tavern-character-card/
git commit -m "feat: implement TavernCharacterCardComponent with horizontal layout"
```

---

## Task 3: Create TrainingGroundsCharacterCardComponent - Write Failing Tests

**Files:**
- Create: `src/components/training-grounds-character-card/__tests__/training-grounds-character-card.component.spec.ts`
- Create: `src/components/training-grounds-character-card/training-grounds-character-card.component.ts`
- Create: `src/components/training-grounds-character-card/training-grounds-character-card.component.html`
- Create: `src/components/training-grounds-character-card/training-grounds-character-card.component.scss`

**Step 1: Create component directory structure**

```bash
mkdir -p src/components/training-grounds-character-card/__tests__
```

**Step 2: Create empty component files**

Create `src/components/training-grounds-character-card/training-grounds-character-card.component.ts`:

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character } from '../../types/Character';
import { CharacterStatus } from '../../types/CharacterStatus';

@Component({
  selector: 'app-training-grounds-character-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training-grounds-character-card.component.html',
  styleUrls: ['./training-grounds-character-card.component.scss']
})
export class TrainingGroundsCharacterCardComponent {
  @Input() character!: Character;
  @Input() status!: CharacterStatus;

  @Output() inspect = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
}
```

Create `src/components/training-grounds-character-card/training-grounds-character-card.component.html`:

```html
<div class="training-grounds-character-card">
  <!-- Empty for now -->
</div>
```

Create `src/components/training-grounds-character-card/training-grounds-character-card.component.scss`:

```scss
@use '../../styles/variables' as *;

.training-grounds-character-card {
  // Empty for now
}
```

**Step 3: Write failing tests**

Create `src/components/training-grounds-character-card/__tests__/training-grounds-character-card.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingGroundsCharacterCardComponent } from '../training-grounds-character-card.component';
import { createTestCharacter } from '../../../test-helpers/test-factories';
import { CharacterStatus } from '../../../types/CharacterStatus';

describe('TrainingGroundsCharacterCardComponent', () => {
  let component: TrainingGroundsCharacterCardComponent;
  let fixture: ComponentFixture<TrainingGroundsCharacterCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingGroundsCharacterCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingGroundsCharacterCardComponent);
    component = fixture.componentInstance;
    component.character = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
    component.status = CharacterStatus.OK;
  });

  describe('rendering', () => {
    it('displays character name', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Gandalf');
    });

    it('displays race and class', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain(component.character.race);
      expect(compiled.textContent).toContain(component.character.class);
    });

    it('displays level', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Level');
    });

    it('displays status badge', () => {
      fixture.detectChanges();
      const statusBadge = fixture.nativeElement.querySelector('.status-badge');
      expect(statusBadge).toBeTruthy();
      expect(statusBadge.textContent).toContain('OK');
    });

    it('applies status class to badge', () => {
      component.status = CharacterStatus.DEAD;
      fixture.detectChanges();
      const statusBadge = fixture.nativeElement.querySelector('.status-badge');
      expect(statusBadge.classList.contains('status-dead')).toBe(true);
    });
  });

  describe('actions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('shows Inspect button', () => {
      const inspectBtn = fixture.nativeElement.querySelector('.inspect-btn');
      expect(inspectBtn).toBeTruthy();
    });

    it('shows Delete button', () => {
      const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
      expect(deleteBtn).toBeTruthy();
    });

    it('emits inspect event when Inspect clicked', () => {
      jest.spyOn(component.inspect, 'emit');
      const inspectBtn = fixture.nativeElement.querySelector('.inspect-btn');
      inspectBtn.click();
      expect(component.inspect.emit).toHaveBeenCalledWith('char-1');
    });

    it('emits delete event when Delete clicked', () => {
      jest.spyOn(component.delete, 'emit');
      const deleteBtn = fixture.nativeElement.querySelector('.delete-btn');
      deleteBtn.click();
      expect(component.delete.emit).toHaveBeenCalledWith('char-1');
    });
  });
});
```

**Step 4: Run tests to verify they fail**

```bash
npm test -- training-grounds-character-card
```

Expected: Tests fail with "Cannot find .inspect-btn", "textContent doesn't contain Gandalf", etc.

**Step 5: Commit failing tests**

```bash
git add src/components/training-grounds-character-card/
git commit -m "test: add failing tests for TrainingGroundsCharacterCardComponent"
```

---

## Task 4: Implement TrainingGroundsCharacterCardComponent and Make Tests Pass

**Files:**
- Modify: `src/components/training-grounds-character-card/training-grounds-character-card.component.html`
- Modify: `src/components/training-grounds-character-card/training-grounds-character-card.component.scss`

**Step 1: Implement template**

Update `src/components/training-grounds-character-card/training-grounds-character-card.component.html`:

```html
<div class="training-grounds-character-card">
  <div class="character-info">
    <div class="character-name">{{ character.name }}</div>
    <div class="character-details">
      <span class="race-class">{{ character.race }} {{ character.class }}</span>
      <span class="level">Level {{ character.level }}</span>
    </div>
    <span class="status-badge" [class]="'status-' + status.toLowerCase()">
      {{ status }}
    </span>
  </div>

  <div class="character-actions">
    <button class="action-btn inspect-btn" (click)="inspect.emit(character.id)">
      Inspect
    </button>
    <button class="action-btn delete-btn" (click)="delete.emit(character.id)">
      Delete
    </button>
  </div>
</div>
```

**Step 2: Implement styles**

Update `src/components/training-grounds-character-card/training-grounds-character-card.component.scss`:

```scss
@use '../../styles/variables' as *;

.training-grounds-character-card {
  display: grid;
  grid-template-columns: 70% 30%;
  gap: $spacing-sm;
  padding: $spacing-sm;
  background: $color-bg-black;
  border: 1px solid $color-text-green;
  height: 70px;
  align-items: center;

  .character-info {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    .character-name {
      font-family: $font-mono;
      font-size: 1rem;
      font-weight: bold;
      color: $color-text-green;
    }

    .character-details {
      display: flex;
      gap: $spacing-sm;
      font-family: $font-mono;
      font-size: 0.875rem;
      color: $color-text-green;
      opacity: 0.8;
    }

    .status-badge {
      font-family: $font-mono;
      font-size: 0.75rem;
      padding: 2px 6px;
      border: 1px solid $color-text-green;
      display: inline-block;
      width: fit-content;

      &.status-ok {
        color: $color-text-green;
      }

      &.status-dead {
        color: #ff0000;
        border-color: #ff0000;
      }

      &.status-ashes {
        color: #888888;
        border-color: #888888;
      }
    }
  }

  .character-actions {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    .action-btn {
      padding: $spacing-xs;
      background: transparent;
      color: $color-text-green;
      border: 1px solid $color-text-green;
      cursor: pointer;
      font-family: $font-mono;
      font-size: 0.75rem;
      text-align: center;

      &:hover {
        background: $color-text-green;
        color: $color-bg-black;
      }

      &.delete-btn:hover {
        background: #ff0000;
        border-color: #ff0000;
        color: #ffffff;
      }
    }
  }
}
```

**Step 3: Run tests to verify they pass**

```bash
npm test -- training-grounds-character-card
```

Expected: All tests pass

**Step 4: Commit implementation**

```bash
git add src/components/training-grounds-character-card/
git commit -m "feat: implement TrainingGroundsCharacterCardComponent with status badge"
```

---

## Task 5: Update TavernComponent to Use New Card

**Files:**
- Modify: `src/app/tavern/tavern.component.html`
- Modify: `src/app/tavern/tavern.component.ts` (import)
- Modify: `src/app/__tests__/integration/tavern.integration.spec.ts`

**Step 1: Update TavernComponent imports**

In `src/app/tavern/tavern.component.ts`, replace:

```typescript
import { CharacterCardWrapperComponent } from '../../components/character-card-wrapper/character-card-wrapper.component';
```

With:

```typescript
import { TavernCharacterCardComponent } from '../../components/tavern-character-card/tavern-character-card.component';
```

And in the `@Component` decorator imports array, replace `CharacterCardWrapperComponent` with `TavernCharacterCardComponent`.

**Step 2: Update TavernComponent template**

In `src/app/tavern/tavern.component.html`, find the available characters section:

Replace:
```html
@for (char of availableCharacters(); track char.id) {
  <app-character-card-wrapper
    [character]="char"
    [actions]="['add', 'inspect']"
    (add)="onAddCharacter($event)"
    (inspect)="onInspect($event)">
  </app-character-card-wrapper>
}
```

With:
```html
@for (char of availableCharacters(); track char.id) {
  <app-tavern-character-card
    [character]="char"
    [isInParty]="false"
    (add)="onAddCharacter($event)"
    (inspect)="onInspect($event)">
  </app-tavern-character-card>
}
```

Find the party members sections (front row and back row), replace both:

```html
@for (char of frontRowCharacters(); track char.id; let index = $index) {
  <app-character-card-wrapper
    [character]="char"
    [actions]="['remove', 'moveUp', 'moveDown', 'inspect']"
    [canMoveUp]="index > 0"
    [canMoveDown]="index < frontRowCharacters().length - 1"
    (remove)="onRemoveCharacter($event)"
    (moveUp)="onMoveUp($event)"
    (moveDown)="onMoveDown($event)"
    (inspect)="onInspect($event)">
  </app-character-card-wrapper>
}
```

With:
```html
@for (char of frontRowCharacters(); track char.id; let index = $index) {
  <app-tavern-character-card
    [character]="char"
    [isInParty]="true"
    [canMoveUp]="index > 0 || backRowCharacters().length > 0"
    [canMoveDown]="index < frontRowCharacters().length - 1 || backRowCharacters().length > 0"
    (remove)="onRemoveCharacter($event)"
    (moveUp)="onMoveUp($event)"
    (moveDown)="onMoveDown($event)"
    (inspect)="onInspect($event)">
  </app-tavern-character-card>
}
```

(Apply same pattern to back row section)

**Step 3: Update integration tests**

In `src/app/__tests__/integration/tavern.integration.spec.ts`, update selectors:

Replace `app-character-card-wrapper` with `app-tavern-character-card` in all `querySelector` and `querySelectorAll` calls.

**Step 4: Run tests**

```bash
npm test -- tavern
```

Expected: All tavern tests pass

**Step 5: Manually test in browser**

```bash
npm start
```

Navigate to tavern, verify:
- Available characters show "Add" and "Inspect" buttons
- Party members show "Remove", "Move Up/Down", "Inspect" buttons
- Cards are ~80px height (measure in browser DevTools)
- All buttons work correctly

**Step 6: Commit changes**

```bash
git add src/app/tavern/ src/app/__tests__/integration/tavern.integration.spec.ts
git commit -m "refactor: update tavern to use TavernCharacterCardComponent"
```

---

## Task 6: Update TrainingGroundsComponent to Use New Card

**Files:**
- Modify: `src/app/training-grounds/training-grounds.component.html`
- Modify: `src/app/training-grounds/training-grounds.component.ts` (import)

**Step 1: Update TrainingGroundsComponent imports**

In `src/app/training-grounds/training-grounds.component.ts`, replace:

```typescript
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
```

With:

```typescript
import { TrainingGroundsCharacterCardComponent } from '../../components/training-grounds-character-card/training-grounds-character-card.component';
```

And in the `@Component` decorator imports array, replace `CharacterCardComponent` with `TrainingGroundsCharacterCardComponent`.

**Step 2: Update TrainingGroundsComponent template**

In `src/app/training-grounds/training-grounds.component.html`, replace:

```html
@for (item of availableCharacters(); track item.character.id) {
  <app-character-card
    [character]="item.character"
    [status]="item.status"
    (inspect)="handleInspectCharacter($event)"
    (delete)="handleDeleteCharacter($event)">
  </app-character-card>
}
```

With:

```html
@for (item of availableCharacters(); track item.character.id) {
  <app-training-grounds-character-card
    [character]="item.character"
    [status]="item.status"
    (inspect)="handleInspectCharacter($event)"
    (delete)="handleDeleteCharacter($event)">
  </app-training-grounds-character-card>
}
```

**Step 3: Run tests**

```bash
npm test -- training-grounds
```

Expected: All training grounds tests pass

**Step 4: Manually test in browser**

Navigate to training grounds, verify:
- Characters display with status badges
- "Inspect" and "Delete" buttons work
- Cards are ~70px height
- Status badges have correct colors

**Step 5: Commit changes**

```bash
git add src/app/training-grounds/
git commit -m "refactor: update training grounds to use TrainingGroundsCharacterCardComponent"
```

---

## Task 7: Delete Old Components and Verify

**Files:**
- Delete: `src/components/character-card/`
- Delete: `src/components/character-card-wrapper/`
- Delete: `src/components/character-card-actions/`

**Step 1: Delete old component directories**

```bash
rm -rf src/components/character-card
rm -rf src/components/character-card-wrapper
rm -rf src/components/character-card-actions
```

**Step 2: Search for any remaining imports**

```bash
grep -r "character-card.component" src/ --exclude-dir=node_modules
grep -r "character-card-wrapper" src/ --exclude-dir=node_modules
grep -r "character-card-actions" src/ --exclude-dir=node_modules
```

Expected: No results (all imports removed)

**Step 3: Run full test suite**

```bash
npm test
```

Expected: All 774+ tests pass

**Step 4: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 5: Commit deletion**

```bash
git add -A
git commit -m "refactor: remove old character card components"
```

---

## Task 8: Update Documentation

**Files:**
- Create: `docs/components/TavernCharacterCardComponent.md`
- Create: `docs/components/TrainingGroundsCharacterCardComponent.md`
- Modify: `docs/plans/2025-11-03-scene-specific-character-cards-design.md` (mark complete)

**Step 1: Document TavernCharacterCardComponent**

Create `docs/components/TavernCharacterCardComponent.md`:

```markdown
# TavernCharacterCardComponent

Scene-specific character card for Gilgamesh's Tavern.

## Selector
`app-tavern-character-card`

## Inputs
- `character: Character` - Character to display
- `isInParty: boolean` - Whether character is in current party
- `canMoveUp: boolean` - Whether Move Up button should be enabled
- `canMoveDown: boolean` - Whether Move Down button should be enabled

## Outputs
- `add: EventEmitter<string>` - Emits character ID when Add clicked
- `remove: EventEmitter<string>` - Emits character ID when Remove clicked
- `moveUp: EventEmitter<string>` - Emits character ID when Move Up clicked
- `moveDown: EventEmitter<string>` - Emits character ID when Move Down clicked
- `inspect: EventEmitter<string>` - Emits character ID when Inspect clicked

## Layout
- **Height**: 80px
- **Grid**: 60% info, 40% actions
- **Buttons**: Stacked vertically

## Conditional Rendering
- `isInParty === false`: Shows Add + Inspect buttons
- `isInParty === true`: Shows Remove + Move Up + Move Down + Inspect buttons
```

**Step 2: Document TrainingGroundsCharacterCardComponent**

Create `docs/components/TrainingGroundsCharacterCardComponent.md`:

```markdown
# TrainingGroundsCharacterCardComponent

Scene-specific character card for Training Grounds.

## Selector
`app-training-grounds-character-card`

## Inputs
- `character: Character` - Character to display
- `status: CharacterStatus` - Character status for badge

## Outputs
- `inspect: EventEmitter<string>` - Emits character ID when Inspect clicked
- `delete: EventEmitter<string>` - Emits character ID when Delete clicked

## Layout
- **Height**: 70px
- **Grid**: 70% info, 30% actions
- **Status Badge**: Color-coded by status (OK=green, DEAD=red, ASHES=gray)

## Actions
- Inspect: View character details
- Delete: Remove character from roster (with confirmation)
```

**Step 3: Mark design document complete**

In `docs/plans/2025-11-03-scene-specific-character-cards-design.md`, update success criteria:

```markdown
## Success Criteria

- [x] Design validated with user
- [x] TavernCharacterCardComponent implemented with tests
- [x] TrainingGroundsCharacterCardComponent implemented with tests
- [x] Both scenes updated to use new components
- [x] All 774+ tests passing
- [x] Old components deleted
- [x] Vertical space reduced by target percentages (30-43%)
- [x] Visual consistency maintained (SCSS variables working)
```

**Step 4: Commit documentation**

```bash
git add docs/
git commit -m "docs: add component documentation for scene-specific character cards"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] **TavernCharacterCardComponent**:
  - [ ] Shows correct buttons based on `isInParty`
  - [ ] Emits all 5 events correctly
  - [ ] Disabled states work for move buttons
  - [ ] Height is ~80px
  - [ ] 100% test coverage

- [ ] **TrainingGroundsCharacterCardComponent**:
  - [ ] Shows status badge with correct color
  - [ ] Emits inspect and delete events
  - [ ] Height is ~70px
  - [ ] 100% test coverage

- [ ] **Integration**:
  - [ ] Tavern scene fully functional
  - [ ] Training Grounds scene fully functional
  - [ ] All 774+ tests passing
  - [ ] Build succeeds
  - [ ] No console errors in browser

- [ ] **Cleanup**:
  - [ ] Old components deleted
  - [ ] No orphaned imports
  - [ ] Documentation complete

---

## Rollback Plan

If issues arise:

```bash
# Revert to previous commit
git log --oneline  # Find commit hash before refactoring
git revert <commit-hash>

# Or restore old components
git checkout HEAD~8 src/components/character-card
git checkout HEAD~8 src/components/character-card-wrapper
git checkout HEAD~8 src/components/character-card-actions
```

---

**Estimated Time**: 3.5-5.5 hours
**Success Metric**: 30-43% vertical space reduction, all tests passing
