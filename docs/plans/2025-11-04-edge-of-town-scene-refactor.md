# Edge of Town Scene Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Edge of Town scene to match Castle Menu layout using shared components (SceneTitleComponent, SceneFooterComponent, CharacterCardComponent, ConfirmationDialogComponent).

**Architecture:** Complete UI reimplementation preserving business logic. Replace old vertical menu + text list with modern header/footer/card grid pattern. Maintain all navigation paths, maze validation, and exit confirmation functionality.

**Tech Stack:** Angular 19 (standalone components), TypeScript (strict mode), Jest testing, SCSS with design tokens

---

## Task 1: Update Component TypeScript - Imports and Structure

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.ts`

**Step 1: Write test for SceneTitleComponent presence**

Add to `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
describe('initialization', () => {
  it('displays scene title component with party gold', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const titleComponent = compiled.querySelector('app-scene-title');

    expect(titleComponent).toBeTruthy();
  });
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - "app-scene-title" selector not found

**Step 3: Update imports in TypeScript file**

In `src/app/edge-of-town/edge-of-town.component.ts`, replace line 23:

```typescript
imports: [CommonModule, MenuComponent],
```

With:

```typescript
imports: [
  CommonModule,
  SceneTitleComponent,
  SceneFooterComponent,
  CharacterCardComponent,
  ConfirmationDialogComponent
],
```

Add imports at top (after line 8):

```typescript
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { CharacterActionEvent } from '../../types/CharacterCardTypes';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
```

Remove old import (line 6):

```typescript
import { MenuComponent, MenuItem } from '../../components/menu/menu.component';
```

But keep MenuItem type import by changing line 4 to:

```typescript
import { MenuItem } from '../../components/menu/menu.component';
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: Test might not fully pass yet but compilation should succeed

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.ts src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "refactor(edge-of-town): update component imports to use shared components

- Replace MenuComponent with SceneFooterComponent
- Add SceneTitleComponent, CharacterCardComponent, ConfirmationDialogComponent
- Prepare for UI layout refactor matching Castle Menu pattern"
```

---

## Task 2: Update Component TypeScript - Menu Items as Computed Signal

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.ts:28-59`

**Step 1: Write test for conditional menu item enabling**

Add to `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
describe('footer menu items', () => {
  it('disables maze option when no party exists', () => {
    gameState.updateState(state => ({
      ...state,
      party: { ...state.party, members: [] }
    }));

    fixture.detectChanges();
    const menuItems = component.footerMenuItems();
    const mazeItem = menuItems.find(item => item.id === 'maze');

    expect(mazeItem?.enabled).toBe(false);
  });

  it('enables maze option when party exists', () => {
    gameState.updateState(state => ({
      ...state,
      party: { ...state.party, members: ['char-1'] }
    }));

    fixture.detectChanges();
    const menuItems = component.footerMenuItems();
    const mazeItem = menuItems.find(item => item.id === 'maze');

    expect(mazeItem?.enabled).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - "footerMenuItems is not a function" or returns undefined

**Step 3: Replace static menuItems with computed signal**

In `src/app/edge-of-town/edge-of-town.component.ts`, replace lines 28-59:

```typescript
readonly menuItems: MenuItem[] = [
  {
    id: 'training-grounds',
    label: 'TRAINING GROUNDS',
    enabled: true,
    shortcut: 'T'
  },
  // ... rest of static array
];
```

With:

```typescript
readonly footerMenuItems = computed((): MenuItem[] => {
  const hasParty = (this.currentParty().members?.length ?? 0) > 0;

  return [
    { id: 'training-grounds', label: 'Training Grounds', shortcut: 'T', enabled: true },
    { id: 'maze', label: 'Maze', shortcut: 'M', enabled: hasParty },
    { id: 'castle', label: 'Castle', shortcut: 'C', enabled: true },
    { id: 'utilities', label: 'Utilities', shortcut: 'U', enabled: true },
    { id: 'leave-game', label: 'Leave Game', shortcut: 'L', enabled: true }
  ];
});
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: PASS for conditional enabling tests

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.ts src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "refactor(edge-of-town): convert menu items to computed signal

- Replace static menuItems array with footerMenuItems computed signal
- Add conditional enabling: Maze disabled when no party exists
- Reactive to party state changes"
```

---

## Task 3: Add Message Display Signals and Confirmation State

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.ts:74-76`

**Step 1: Write test for message display signal**

Add to `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
describe('message display', () => {
  it('shows error message when set', () => {
    component.messageText.set('Test error message');
    component.messageType.set('error');
    fixture.detectChanges();

    expect(component.messageText()).toBe('Test error message');
    expect(component.messageType()).toBe('error');
  });

  it('clears message when set to null', () => {
    component.messageText.set('Test message');
    component.messageText.set(null);

    expect(component.messageText()).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - "messageText is not defined"

**Step 3: Add message display and confirmation signals**

In `src/app/edge-of-town/edge-of-town.component.ts`, replace lines 74-76:

```typescript
// Error and confirmation state
readonly errorMessage = signal<string | null>(null);
readonly infoMessage = signal<string | null>(null);
readonly showExitConfirmation = signal(false);
```

With:

```typescript
// Message display state (unified for error/info/success)
readonly messageText = signal<string | null>(null);
readonly messageType = signal<'error' | 'info' | 'success'>('info');

// Confirmation dialog state
readonly showLeaveConfirmation = signal(false);
readonly leaveConfirmationMessage = signal('Save and quit the game?');
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: PASS for message signal tests

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.ts src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "refactor(edge-of-town): add unified message display signals

- Replace errorMessage/infoMessage with unified messageText/messageType
- Add showLeaveConfirmation and leaveConfirmationMessage signals
- Prepare for message area above footer"
```

---

## Task 4: Update Navigation Methods

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.ts:92-117`

**Step 1: Write test for handleFooterAction**

Add to `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
describe('footer navigation', () => {
  it('navigates to training grounds via footer action', () => {
    component.handleFooterAction('training-grounds');

    expect(router.navigate).toHaveBeenCalledWith(['/training-grounds']);
  });

  it('shows leave confirmation dialog via footer action', () => {
    component.handleFooterAction('leave-game');

    expect(component.showLeaveConfirmation()).toBe(true);
  });

  it('clears messages before navigation', () => {
    component.messageText.set('Previous error');
    component.handleFooterAction('castle');

    expect(component.messageText()).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - "handleFooterAction is not a function"

**Step 3: Rename and update handleMenuSelect method**

In `src/app/edge-of-town/edge-of-town.component.ts`, replace method (lines 92-117):

```typescript
handleMenuSelect(itemId: string): void {
  // Clear previous errors
  this.errorMessage.set(null);

  switch (itemId) {
    case 'training-grounds':
      this.router.navigate(['/training-grounds']);
      break;

    case 'maze':
      this.enterMaze();
      break;

    case 'castle':
      this.router.navigate(['/castle-menu']);
      break;

    case 'utilities':
      this.router.navigate(['/utilities']);
      break;

    case 'leave-game':
      this.showExitConfirmation.set(true);
      break;
  }
}
```

With:

```typescript
handleFooterAction(itemId: string): void {
  // Clear previous messages
  this.messageText.set(null);

  switch (itemId) {
    case 'training-grounds':
      this.router.navigate(['/training-grounds']);
      break;

    case 'maze':
      this.enterMaze();
      break;

    case 'castle':
      this.router.navigate(['/castle-menu']);
      break;

    case 'utilities':
      this.router.navigate(['/utilities']);
      break;

    case 'leave-game':
      this.showLeaveConfirmation.set(true);
      break;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: PASS for footer action tests

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.ts src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "refactor(edge-of-town): rename handleMenuSelect to handleFooterAction

- Update method name to match footer component pattern
- Update to use unified messageText signal
- Update to use showLeaveConfirmation signal"
```

---

## Task 5: Update Maze Entry Validation

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.ts:119-130`

**Step 1: Write test for updated maze validation**

Update existing test in `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
it('shows error message when entering maze without party', () => {
  gameState.updateState(state => ({
    ...state,
    party: { ...state.party, members: [] }
  }));

  component.handleFooterAction('maze');

  expect(router.navigate).not.toHaveBeenCalled();
  expect(component.messageText()).toBe('You need a party to enter the maze (visit Tavern)');
  expect(component.messageType()).toBe('error');
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - messageText returns null or different value

**Step 3: Update enterMaze method**

In `src/app/edge-of-town/edge-of-town.component.ts`, replace method (lines 119-130):

```typescript
private enterMaze(): void {
  const party = this.currentParty();

  // Validate party exists
  if (party.members.length === 0) {
    this.errorMessage.set('You need a party to enter the maze (visit Tavern)');
    return;
  }

  // Navigate to Camp (dungeon entry)
  this.router.navigate(['/camp']);
}
```

With:

```typescript
private enterMaze(): void {
  const party = this.currentParty();

  // Validate party exists
  if (party.members.length === 0) {
    this.messageText.set('You need a party to enter the maze (visit Tavern)');
    this.messageType.set('error');
    return;
  }

  // Navigate to Camp (dungeon entry)
  this.router.navigate(['/camp']);
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: PASS for maze validation test

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.ts src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "refactor(edge-of-town): update maze validation to use unified message signals

- Replace errorMessage with messageText/messageType
- Maintain validation logic for party requirement"
```

---

## Task 6: Update Exit Confirmation Methods

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.ts:132-150`

**Step 1: Write tests for updated exit confirmation**

Add to `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
describe('leave game confirmation', () => {
  it('shows confirmation dialog via footer action', () => {
    component.handleFooterAction('leave-game');

    expect(component.showLeaveConfirmation()).toBe(true);
  });

  it('hides dialog when user cancels', () => {
    component.showLeaveConfirmation.set(true);
    component.cancelLeaveGame();

    expect(component.showLeaveConfirmation()).toBe(false);
  });

  it('shows success message after save (when window.close fails)', async () => {
    await component.confirmLeaveGame();

    // window.close() will fail in test environment
    expect(component.showLeaveConfirmation()).toBe(false);
    expect(component.messageText()).toBe('Game saved successfully. You can now close this window.');
    expect(component.messageType()).toBe('success');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - method names don't match

**Step 3: Update exit confirmation methods**

In `src/app/edge-of-town/edge-of-town.component.ts`, replace methods (lines 132-150):

```typescript
async confirmExit(): Promise<void> {
  // Save game state
  const state = this.gameState.state();
  await this.saveService.saveGame(state);

  // Close browser window/tab
  // Note: window.close() only works if window was opened by script
  // For user-opened tabs, this will have no effect
  window.close();

  // If window.close() fails (most browsers), show a message
  // informing the user they can safely close the tab
  this.showExitConfirmation.set(false);
  this.infoMessage.set('Game saved successfully. You can now close this window.');
}

cancelExit(): void {
  this.showExitConfirmation.set(false);
}
```

With:

```typescript
async confirmLeaveGame(): Promise<void> {
  // Save game state
  const state = this.gameState.state();
  await this.saveService.saveGame(state);

  // Close browser window/tab
  // Note: window.close() only works if window was opened by script
  // For user-opened tabs, this will have no effect
  window.close();

  // If window.close() fails (most browsers), show a message
  // informing the user they can safely close the tab
  this.showLeaveConfirmation.set(false);
  this.messageText.set('Game saved successfully. You can now close this window.');
  this.messageType.set('success');
}

cancelLeaveGame(): void {
  this.showLeaveConfirmation.set(false);
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: PASS for exit confirmation tests

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.ts src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "refactor(edge-of-town): update exit confirmation methods

- Rename confirmExit/cancelExit to confirmLeaveGame/cancelLeaveGame
- Update to use unified message signals
- Update to use showLeaveConfirmation signal"
```

---

## Task 7: Add Character Action Handler

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.ts` (add new method after line 90)

**Step 1: Write test for character card inspect action**

Add to `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
describe('character actions', () => {
  it('navigates to character inspection when inspect action clicked', () => {
    component.handleCharacterAction({
      characterId: 'char-1',
      actionType: 'inspect'
    });

    expect(router.navigate).toHaveBeenCalledWith(
      ['/character-inspection'],
      { queryParams: { characterId: 'char-1', returnTo: 'edge-of-town' } }
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - "handleCharacterAction is not a function"

**Step 3: Add handleCharacterAction method**

In `src/app/edge-of-town/edge-of-town.component.ts`, add after ngOnInit (around line 90):

```typescript
/**
 * Handle character card action clicks
 */
handleCharacterAction(event: CharacterActionEvent): void {
  if (event.actionType === 'inspect') {
    this.router.navigate(['/character-inspection'], {
      queryParams: {
        characterId: event.characterId,
        returnTo: 'edge-of-town'
      }
    });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: PASS for character action test

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.ts src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "feat(edge-of-town): add character card inspect action handler

- Add handleCharacterAction method for CharacterCardComponent events
- Navigate to character inspection with returnTo parameter
- Match Castle Menu pattern"
```

---

## Task 8: Update HTML Template - Header

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.html`

**Step 1: Write test for scene title component**

Update test in `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
describe('initialization', () => {
  it('displays scene title component with party gold', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const titleComponent = compiled.querySelector('app-scene-title');

    expect(titleComponent).toBeTruthy();
    expect(titleComponent.getAttribute('ng-reflect-title')).toBe('EDGE OF TOWN');
  });
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - app-scene-title not found in template

**Step 3: Replace header in template**

In `src/app/edge-of-town/edge-of-town.component.html`, replace lines 1-4:

```html
<div class="edge-of-town">
  <header>
    <h1>EDGE OF TOWN</h1>
  </header>
```

With:

```html
<div class="edge-of-town">
  <app-scene-title title="EDGE OF TOWN" [showPartyGold]="true" />
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: PASS for title component test

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.html src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "refactor(edge-of-town): replace hardcoded header with SceneTitleComponent

- Remove <header><h1> markup
- Add app-scene-title with showPartyGold enabled
- Match Castle Menu header pattern"
```

---

## Task 9: Update HTML Template - Party Section with Character Cards

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.html:6-25`

**Step 1: Write test for character card display**

Add to `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
describe('party display', () => {
  it('displays character cards for party members', () => {
    // Create test character
    const testChar: Character = {
      id: 'char-1',
      name: 'Gandalf',
      race: Race.HUMAN,
      class: CharacterClass.MAGE,
      level: 5,
      hp: 20,
      maxHp: 25,
      attributes: { strength: 10, intelligence: 18, piety: 12, vitality: 10, agility: 10, luck: 10 },
      status: CharacterStatus.OK,
      alignment: Alignment.GOOD,
      age: 30,
      gold: 0,
      inventory: [],
      equippedArmor: null,
      equippedWeapon: null,
      equippedShield: null,
      ac: 10,
      experiencePoints: 1000,
      spellsKnown: [],
      spellPointsByLevel: [0,0,0,0,0,0,0]
    };

    gameState.updateState(state => ({
      ...state,
      roster: new Map([['char-1', testChar]]),
      party: { ...state.party, members: ['char-1'] }
    }));

    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const characterCards = compiled.querySelectorAll('app-character-card');

    expect(characterCards.length).toBe(1);
  });

  it('shows empty state when no party members', () => {
    gameState.updateState(state => ({
      ...state,
      party: { ...state.party, members: [] }
    }));

    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const emptyState = compiled.querySelector('.no-party');

    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('No party members');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - app-character-card not found

**Step 3: Replace party section in template**

In `src/app/edge-of-town/edge-of-town.component.html`, replace lines 6-25 (entire <main> section):

```html
  <main>
    <div class="menu-section">
      <app-menu
        [items]="menuItems"
        (select)="handleMenuSelect($event)"
      />
    </div>

    <div class="party-section">
      <h2>CURRENT PARTY:</h2>
      <ul *ngIf="partyCharacters().length > 0; else noParty">
        <li *ngFor="let char of partyCharacters(); let i = index">
          {{ i + 1 }}. {{ char.name }} - {{ char.class }} (Lv{{ char.level }})
        </li>
      </ul>
      <ng-template #noParty>
        <p class="no-party">No party formed</p>
      </ng-template>
    </div>
  </main>
```

With:

```html
  <section class="party-section">
    <h2>PARTY</h2>
    <div class="party-members">
      @for (char of partyCharacters(); track char.id) {
        <app-character-card
          [character]="char"
          [visibleFields]="['race', 'class', 'level', 'hp', 'ac']"
          [actions]="[{ type: 'inspect' }]"
          variant="default"
          (actionClick)="handleCharacterAction($event)">
        </app-character-card>
      }
      @empty {
        <p class="no-party">No party members</p>
      }
    </div>
  </section>
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: PASS for character card display tests

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.html src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "refactor(edge-of-town): replace text list with CharacterCardComponent grid

- Remove old menu section and text-based party list
- Add character card grid with inspect action
- Use @for/@empty syntax matching Castle Menu
- Show race, class, level, HP, AC fields"
```

---

## Task 10: Update HTML Template - Message Area and Footer

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.html:27-46`

**Step 1: Write test for message area display**

Add to `src/app/edge-of-town/edge-of-town.component.spec.ts`:

```typescript
describe('message area', () => {
  it('displays error message when type is error', () => {
    component.messageText.set('Test error');
    component.messageType.set('error');
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const messageArea = compiled.querySelector('.message-area.error');

    expect(messageArea).toBeTruthy();
    expect(messageArea.textContent).toContain('Test error');
  });

  it('displays info message when type is info', () => {
    component.messageText.set('Test info');
    component.messageType.set('info');
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const messageArea = compiled.querySelector('.message-area.info');

    expect(messageArea).toBeTruthy();
  });

  it('hides message area when messageText is null', () => {
    component.messageText.set(null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const messageArea = compiled.querySelector('.message-area');

    expect(messageArea).toBeFalsy();
  });
});

describe('footer component', () => {
  it('displays scene footer with menu items', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const footer = compiled.querySelector('app-scene-footer');

    expect(footer).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- edge-of-town.component
```

Expected: FAIL - .message-area and app-scene-footer not found

**Step 3: Replace message displays and add footer**

In `src/app/edge-of-town/edge-of-town.component.html`, replace lines 27-46:

```html
  <!-- Error message -->
  <div class="error-message" *ngIf="errorMessage()">
    <p>{{ errorMessage() }}</p>
  </div>

  <!-- Info message -->
  <div class="info-message" *ngIf="infoMessage()">
    <p>{{ infoMessage() }}</p>
  </div>

  <!-- Exit confirmation -->
  <div class="confirmation-dialog" *ngIf="showExitConfirmation()">
    <div class="dialog-content">
      <p>Save and quit?</p>
      <div class="dialog-actions">
        <button (click)="confirmExit()">(Y)es</button>
        <button (click)="cancelExit()">(N)o</button>
      </div>
    </div>
  </div>
</div>
```

With:

```html
  <main class="content-area">
    <!-- Main content area (empty for this scene) -->
  </main>

  <!-- Message Display Area -->
  @if (messageText()) {
    <div class="message-area" [class.error]="messageType() === 'error'"
         [class.info]="messageType() === 'info'"
         [class.success]="messageType() === 'success'">
      <p>{{ messageText() }}</p>
    </div>
  }

  <!-- Footer Navigation -->
  <app-scene-footer
    [menuItems]="footerMenuItems()"
    (itemSelected)="handleFooterAction($event)"
  />

  <!-- Leave Game Confirmation Dialog -->
  @if (showLeaveConfirmation()) {
    <app-confirmation-dialog
      [visible]="showLeaveConfirmation()"
      [message]="leaveConfirmationMessage()"
      [yesLabel]="'(Enter/Y) Yes'"
      [noLabel]="'(Esc/N) No'"
      (confirmed)="confirmLeaveGame()"
      (cancelled)="cancelLeaveGame()">
    </app-confirmation-dialog>
  }
</div>
```

**Step 4: Run test to verify it passes**

```bash
npm test -- edge-of-town.component
```

Expected: PASS for message area and footer tests

**Step 5: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.html src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "refactor(edge-of-town): add message area, footer, and confirmation dialog

- Add unified message area with error/info/success styling
- Replace custom exit dialog with ConfirmationDialogComponent
- Add SceneFooterComponent for navigation
- Add empty content area for future use
- Complete template refactor matching Castle Menu pattern"
```

---

## Task 11: Update SCSS - Layout Structure

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.scss`

**Step 1: Write visual test**

Manual test plan (document only):
- Component should fill viewport (100vh)
- Header at top with party gold
- Party section below header with responsive grid
- Content area in middle (empty)
- Message area above footer
- Footer at bottom

**Step 2: Replace layout styles**

In `src/app/edge-of-town/edge-of-town.component.scss`, replace lines 3-29:

```scss
.edge-of-town {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: $padding-standard;

  header {
    margin-bottom: $spacing-xl;

    h1 {
      font-size: 24px;
      color: $color-text-bright;
      margin: 0;
      text-align: center;
    }
  }

  main {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-xl;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
    }
  }
```

With:

```scss
.edge-of-town {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $color-bg-black;
  color: $color-text-green;
  font-family: $font-mono;
}
```

**Step 3: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.scss
git commit -m "refactor(edge-of-town): update container layout to vertical flexbox

- Replace min-height with fixed height: 100vh
- Change to vertical flexbox layout
- Remove old grid layout styles
- Match Castle Menu pattern"
```

---

## Task 12: Update SCSS - Party Section Styles

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.scss:31-69`

**Step 1: Replace party section styles**

In `src/app/edge-of-town/edge-of-town.component.scss`, replace lines 31-69:

```scss
  .menu-section {
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .party-section {
    border-left: 1px solid $color-text-dim;
    padding-left: $spacing-lg;

    @media (max-width: 640px) {
      border-left: none;
      border-top: 1px solid $color-text-dim;
      padding-left: 0;
      padding-top: $spacing-lg;
    }

    h2 {
      font-size: 16px;
      color: $color-text-green;
      margin: 0 0 $spacing-md 0;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        color: $color-text-green;
        margin-bottom: $spacing-sm;
      }
    }

    .no-party {
      color: $color-text-dim;
      font-style: italic;
    }
  }
```

With:

```scss
.party-section {
  background-color: rgba(0, 0, 0, 0.3);
  border-bottom: $border-width $border-style $color-border;
  padding: $padding-standard;

  h2 {
    font-size: $font-size-large;
    margin-bottom: $spacing-md;
    color: $color-text-bright;
    text-align: center;
    border-bottom: $border-width $border-style $color-border;
    padding-bottom: $spacing-sm;
  }
}

.party-members {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: $spacing-sm;
  max-width: 100%;

  // Limit to 3 columns max for better card sizing
  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.no-party {
  text-align: center;
  color: $color-text-dim;
  font-style: italic;
  margin-top: $spacing-lg;
  grid-column: 1 / -1;
}
```

**Step 2: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.scss
git commit -m "refactor(edge-of-town): update party section styles to match Castle Menu

- Add responsive 3-column grid for character cards
- Center heading with border
- Add background color and borders
- Match Castle Menu party section styling"
```

---

## Task 13: Update SCSS - Content Area and Message Styles

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.scss`

**Step 1: Add content area and message styles**

In `src/app/edge-of-town/edge-of-town.component.scss`, replace lines 71-89:

```scss
  .error-message {
    margin-top: $spacing-lg;
    text-align: center;

    p {
      color: $color-error;
      font-weight: bold;
    }
  }

  .info-message {
    margin-top: $spacing-lg;
    text-align: center;

    p {
      color: $color-text-bright;
      font-weight: bold;
    }
  }
```

With:

```scss
.content-area {
  flex: 1;
  padding: $padding-standard;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.message-area {
  padding: $spacing-md $padding-standard;
  text-align: center;
  border-top: $border-width $border-style $color-border;

  p {
    margin: 0;
    font-weight: bold;
  }

  &.error {
    background-color: rgba(139, 0, 0, 0.2);
    border-color: $color-error;

    p {
      color: $color-error;
    }
  }

  &.info {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: $color-text-dim;

    p {
      color: $color-text-bright;
    }
  }

  &.success {
    background-color: rgba(0, 100, 0, 0.2);
    border-color: $color-text-green;

    p {
      color: $color-text-green;
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.scss
git commit -m "refactor(edge-of-town): add content area and unified message styling

- Add content-area for future use (matches Castle Menu)
- Add message-area with error/info/success variants
- Color-coded backgrounds and borders for message types
- Remove old error-message and info-message styles"
```

---

## Task 14: Update SCSS - Remove Old Dialog Styles and Add Mobile Responsive

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.scss:91-136`

**Step 1: Remove old confirmation dialog styles and add mobile**

In `src/app/edge-of-town/edge-of-town.component.scss`, replace lines 91-136:

```scss
  .confirmation-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;

    .dialog-content {
      background: $color-bg-black;
      border: 2px solid $color-text-bright;
      padding: $spacing-xl;
      text-align: center;

      p {
        font-size: 18px;
        color: $color-text-bright;
        margin: 0 0 $spacing-lg 0;
      }

      .dialog-actions {
        display: flex;
        gap: $spacing-md;
        justify-content: center;

        button {
          background: none;
          border: 1px solid $color-text-green;
          color: $color-text-green;
          font-family: $font-mono;
          font-size: 14px;
          padding: $spacing-sm $spacing-lg;
          cursor: pointer;

          &:hover {
            background: $color-text-green;
            color: $color-bg-black;
          }
        }
      }
    }
  }
}
```

With:

```scss
// Mobile responsive
@media (max-width: 768px) {
  .party-members {
    grid-template-columns: 1fr;
  }

  .party-section {
    max-height: 40vh;
    overflow-y: auto;
  }

  .message-area {
    padding: $spacing-sm;
    font-size: $font-size-small;
  }
}
```

**Step 2: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.scss
git commit -m "refactor(edge-of-town): remove custom dialog styles and add mobile responsive

- Remove old .confirmation-dialog styles (using ConfirmationDialogComponent)
- Add mobile breakpoint for single-column cards
- Add responsive message area padding
- Complete SCSS refactor matching Castle Menu pattern"
```

---

## Task 15: Update Test Imports and Add Missing Type Imports

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.spec.ts`

**Step 1: Add missing imports for test data**

In `src/app/edge-of-town/edge-of-town.component.spec.ts`, add imports after line 5:

```typescript
import { Character } from '../../types/Character';
import { Race } from '../../types/Race';
import { CharacterClass } from '../../types/CharacterClass';
import { CharacterStatus } from '../../types/CharacterStatus';
import { Alignment } from '../../types/Alignment';
```

**Step 2: Run all tests to verify**

```bash
npm test -- edge-of-town.component
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "test(edge-of-town): add missing type imports for test data

- Import Character, Race, CharacterClass, CharacterStatus, Alignment
- Enable creation of full test character objects"
```

---

## Task 16: Update Old Tests to Match New Structure

**Files:**
- Modify: `src/app/edge-of-town/edge-of-town.component.spec.ts`

**Step 1: Update old tests that reference removed elements**

In `src/app/edge-of-town/edge-of-town.component.spec.ts`, update tests:

Replace test at line 27-31:

```typescript
it('displays edge of town title', () => {
  fixture.detectChanges();
  const compiled = fixture.nativeElement;
  expect(compiled.querySelector('h1')?.textContent).toContain('EDGE OF TOWN');
});
```

With:

```typescript
it('displays edge of town title via scene title component', () => {
  fixture.detectChanges();
  const compiled = fixture.nativeElement;
  const titleComponent = compiled.querySelector('app-scene-title');
  expect(titleComponent).toBeTruthy();
});
```

Replace test at line 33-42:

```typescript
it('shows all 5 menu options', () => {
  fixture.detectChanges();

  expect(component.menuItems.length).toBe(5);
  expect(component.menuItems[0].label).toContain('TRAINING GROUNDS');
  expect(component.menuItems[1].label).toContain('MAZE');
  expect(component.menuItems[2].label).toContain('CASTLE');
  expect(component.menuItems[3].label).toContain('UTILITIES');
  expect(component.menuItems[4].label).toContain('LEAVE GAME');
});
```

With:

```typescript
it('shows all 5 footer menu options', () => {
  fixture.detectChanges();
  const menuItems = component.footerMenuItems();

  expect(menuItems.length).toBe(5);
  expect(menuItems[0].label).toContain('Training Grounds');
  expect(menuItems[1].label).toContain('Maze');
  expect(menuItems[2].label).toContain('Castle');
  expect(menuItems[3].label).toContain('Utilities');
  expect(menuItems[4].label).toContain('Leave Game');
});
```

Update test at line 65-70:

```typescript
it('navigates to training grounds when selected', () => {
  component.handleMenuSelect('training-grounds');

  expect(router.navigate).toHaveBeenCalledWith(['/training-grounds']);
});
```

With:

```typescript
it('navigates to training grounds when selected', () => {
  component.handleFooterAction('training-grounds');

  expect(router.navigate).toHaveBeenCalledWith(['/training-grounds']);
});
```

Update similar tests for maze, castle, utilities to use `handleFooterAction` instead of `handleMenuSelect`.

Update test at line 108-112:

```typescript
it('shows confirmation dialog', () => {
  component.handleMenuSelect('leave-game');

  expect(component.showExitConfirmation()).toBe(true);
});
```

With:

```typescript
it('shows confirmation dialog', () => {
  component.handleFooterAction('leave-game');

  expect(component.showLeaveConfirmation()).toBe(true);
});
```

Update test at line 114-121:

```typescript
it('cancels exit when user chooses No', () => {
  component.handleMenuSelect('leave-game');
  component.cancelExit();

  expect(component.showExitConfirmation()).toBe(false);
  expect(router.navigate).not.toHaveBeenCalled();
});
```

With:

```typescript
it('cancels exit when user chooses No', () => {
  component.handleFooterAction('leave-game');
  component.cancelLeaveGame();

  expect(component.showLeaveConfirmation()).toBe(false);
  expect(router.navigate).not.toHaveBeenCalled();
});
```

**Step 2: Run all tests to verify**

```bash
npm test -- edge-of-town.component
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/app/edge-of-town/edge-of-town.component.spec.ts
git commit -m "test(edge-of-town): update existing tests for refactored component

- Update tests to reference footerMenuItems instead of menuItems
- Update tests to use handleFooterAction instead of handleMenuSelect
- Update tests to use showLeaveConfirmation instead of showExitConfirmation
- Update tests to use cancelLeaveGame instead of cancelExit
- All existing test behaviors preserved with new structure"
```

---

## Task 17: Run Full Test Suite and Verify Coverage

**Files:**
- Test: All edge-of-town tests

**Step 1: Run complete test suite**

```bash
npm test -- edge-of-town.component
```

Expected: All tests pass (20+ tests)

**Step 2: Run with coverage**

```bash
npm test -- edge-of-town.component --coverage
```

Expected: >80% coverage for edge-of-town component

**Step 3: Manual verification checklist**

Start dev server and test manually:

```bash
npm start
```

Navigate to Edge of Town and verify:
- [ ] Scene title shows "EDGE OF TOWN" with party gold
- [ ] Party section shows character cards (if party exists)
- [ ] Character cards show race, class, level, HP, AC
- [ ] Inspect button navigates to character inspection
- [ ] Footer shows 5 menu options
- [ ] Keyboard shortcuts work (T, M, C, U, L, ESC)
- [ ] "Maze" option disabled when no party
- [ ] Error message appears above footer when entering maze without party
- [ ] "Leave Game" shows confirmation dialog
- [ ] Y/Enter confirms, N/Esc cancels leave game
- [ ] Layout matches Castle Menu pattern
- [ ] Mobile responsive (test at 768px)

**Step 4: Commit**

```bash
git add -A
git commit -m "test(edge-of-town): verify complete test suite and manual testing

- All automated tests passing
- Coverage exceeds 80% threshold
- Manual testing checklist complete
- Edge of Town refactor complete"
```

---

## Task 18: Update Documentation

**Files:**
- Modify: `docs/ui/scenes/07-edge-of-town.md`

**Step 1: Read current documentation**

```bash
cat docs/ui/scenes/07-edge-of-town.md
```

**Step 2: Update documentation with new layout**

Update the ASCII mockup to reflect new structure:

```markdown
## Layout

┌─────────────────────────────────────────────────┐
│  EDGE OF TOWN          PARTY GOLD: 1,250 GP     │ ← SceneTitleComponent
├─────────────────────────────────────────────────┤
│  PARTY                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Gandalf  │  │ Frodo    │  │ Aragorn  │      │ ← CharacterCardComponent grid
│  │ Human    │  │ Hobbit   │  │ Human    │      │   (race, class, level, HP, AC)
│  │ Mage     │  │ Thief    │  │ Fighter  │      │
│  │ Lv 5     │  │ Lv 3     │  │ Lv 6     │      │
│  │ HP: 20/25│  │ HP: 15/15│  │ HP: 45/50│      │
│  │ AC: 6    │  │ AC: 4    │  │ AC: -2   │      │
│  │ [Inspect]│  │ [Inspect]│  │ [Inspect]│      │
│  └──────────┘  └──────────┘  └──────────┘      │
├─────────────────────────────────────────────────┤
│  [Content Area - Empty]                         │
├─────────────────────────────────────────────────┤
│  ⚠ You need a party to enter the maze          │ ← Message area (optional)
├─────────────────────────────────────────────────┤
│  T:Training | M:Maze | C:Castle | U:Utilities  │ ← SceneFooterComponent
│  L:Leave Game                                   │
└─────────────────────────────────────────────────┘
```

Add section about shared components:

```markdown
## Shared Components

This scene uses the standard town scene pattern (see Castle Menu):

- **SceneTitleComponent**: Header with scene title and party gold
- **CharacterCardComponent**: Individual party member cards with inspect action
- **SceneFooterComponent**: Horizontal navigation menu with keyboard shortcuts
- **ConfirmationDialogComponent**: Modal dialog for leave game confirmation

### Character Card Configuration

- **Visible Fields**: race, class, level, hp, ac
- **Actions**: inspect (navigate to character inspection)
- **Variant**: default (vertical stats layout)

### Footer Menu Configuration

| Menu Item        | Shortcut | Enabled When        |
|-----------------|----------|---------------------|
| Training Grounds| T        | Always              |
| Maze            | M        | Party exists        |
| Castle          | C        | Always              |
| Utilities       | U        | Always              |
| Leave Game      | L        | Always              |
```

**Step 3: Commit**

```bash
git add docs/ui/scenes/07-edge-of-town.md
git commit -m "docs(edge-of-town): update scene documentation for refactored layout

- Update ASCII mockup to show header/footer/card grid
- Document shared component usage
- Add character card configuration details
- Add footer menu configuration table
- Reference Castle Menu as pattern example"
```

---

## Task 19: Final Integration Test

**Files:**
- Create: `src/app/edge-of-town/__tests__/edge-of-town.integration.spec.ts`

**Step 1: Write integration test**

Create new file with full navigation flow test:

```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EdgeOfTownComponent } from '../edge-of-town.component';
import { GameStateService } from '../../../services/GameStateService';
import { Character } from '../../../types/Character';
import { Race } from '../../../types/Race';
import { CharacterClass } from '../../../types/CharacterClass';
import { CharacterStatus } from '../../../types/CharacterStatus';
import { Alignment } from '../../../types/Alignment';

describe('EdgeOfTownComponent Integration', () => {
  let component: EdgeOfTownComponent;
  let gameState: GameStateService;
  let router: Router;

  const createTestCharacter = (id: string, name: string): Character => ({
    id,
    name,
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    level: 1,
    hp: 10,
    maxHp: 10,
    attributes: { strength: 15, intelligence: 10, piety: 10, vitality: 12, agility: 10, luck: 10 },
    status: CharacterStatus.OK,
    alignment: Alignment.GOOD,
    age: 20,
    gold: 0,
    inventory: [],
    equippedArmor: null,
    equippedWeapon: null,
    equippedShield: null,
    ac: 10,
    experiencePoints: 0,
    spellsKnown: [],
    spellPointsByLevel: [0,0,0,0,0,0,0]
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EdgeOfTownComponent]
    });

    const fixture = TestBed.createComponent(EdgeOfTownComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  it('complete workflow: form party, navigate to maze', () => {
    // Setup: Create characters and form party
    const char1 = createTestCharacter('char-1', 'Hero');
    const char2 = createTestCharacter('char-2', 'Sidekick');

    gameState.updateState(state => ({
      ...state,
      roster: new Map([
        ['char-1', char1],
        ['char-2', char2]
      ]),
      party: {
        ...state.party,
        members: ['char-1', 'char-2'],
        gold: 500
      }
    }));

    // Action: Navigate to maze
    component.handleFooterAction('maze');

    // Assert: Navigation successful
    expect(router.navigate).toHaveBeenCalledWith(['/camp']);
    expect(component.messageText()).toBeNull();
  });

  it('blocks maze entry without party', () => {
    // Setup: No party
    gameState.updateState(state => ({
      ...state,
      party: { ...state.party, members: [] }
    }));

    // Action: Try to navigate to maze
    component.handleFooterAction('maze');

    // Assert: Navigation blocked, error shown
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.messageText()).toBeTruthy();
    expect(component.messageType()).toBe('error');
  });

  it('leave game workflow: show dialog, confirm, save', async () => {
    // Action: Initiate leave game
    component.handleFooterAction('leave-game');

    // Assert: Confirmation dialog shown
    expect(component.showLeaveConfirmation()).toBe(true);

    // Action: Cancel
    component.cancelLeaveGame();

    // Assert: Dialog hidden, no navigation
    expect(component.showLeaveConfirmation()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();

    // Action: Initiate again and confirm
    component.handleFooterAction('leave-game');
    await component.confirmLeaveGame();

    // Assert: Success message shown (window.close fails in test)
    expect(component.messageText()).toBe('Game saved successfully. You can now close this window.');
    expect(component.messageType()).toBe('success');
  });
});
```

**Step 2: Run integration test**

```bash
npm test -- edge-of-town.integration
```

Expected: All integration tests pass

**Step 3: Commit**

```bash
git add src/app/edge-of-town/__tests__/edge-of-town.integration.spec.ts
git commit -m "test(edge-of-town): add integration tests for complete workflows

- Test party formation to maze entry flow
- Test maze entry validation blocking
- Test leave game confirmation workflow
- Verify end-to-end behavior with real data"
```

---

## Task 20: Final Review and Cleanup

**Files:**
- Review all modified files

**Step 1: Run complete test suite**

```bash
npm test
```

Expected: All tests pass across entire project

**Step 2: Run linter**

```bash
npm run lint
```

Expected: No linting errors

**Step 3: Build production bundle**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "refactor(edge-of-town): complete scene refactor to match Castle Menu pattern

BREAKING CHANGE: Complete UI reimplementation of Edge of Town scene

## Summary
- Replaced custom header with SceneTitleComponent (shows party gold)
- Replaced text-based party list with CharacterCardComponent grid
- Replaced vertical MenuComponent with SceneFooterComponent
- Replaced custom exit dialog with ConfirmationDialogComponent
- Added unified message area for error/info/success feedback
- Updated SCSS to match Castle Menu vertical flexbox layout

## Components Used
- SceneTitleComponent (shared)
- SceneFooterComponent (shared)
- CharacterCardComponent (shared)
- ConfirmationDialogComponent (shared)

## Preserved Functionality
- All navigation paths (Training, Maze, Castle, Utilities, Leave)
- Maze entry validation (requires party)
- Exit confirmation workflow (save and quit)
- Keyboard shortcuts (T, M, C, U, L, ESC)
- Conditional menu enabling (Maze disabled without party)

## Testing
- 25+ unit tests (>80% coverage)
- 3 integration tests for complete workflows
- Manual testing checklist verified
- All tests passing

## Documentation
- Updated docs/ui/scenes/07-edge-of-town.md
- Added ASCII mockup with new layout
- Documented shared component usage

Closes #XX (link to issue if exists)"
```

---

## Summary

This implementation plan refactors the Edge of Town scene to match the Castle Menu pattern using shared components. The refactor:

1. **Replaces all old UI elements** with modern shared components
2. **Maintains all business logic** (navigation, validation, confirmation)
3. **Follows TDD approach** with tests written before implementation
4. **Uses frequent, small commits** (20 commits total)
5. **Achieves >80% test coverage** with unit and integration tests
6. **Updates documentation** to reflect new structure

The final result is a consistent, maintainable scene that matches the established pattern across all town scenes.

---

**Execution Options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach would you prefer?
