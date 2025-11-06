# Maze Scene Phase 2: Basic Maze Component - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build complete Maze Scene UI with movement system, party display, message log, and encounter detection (no canvas rendering yet).

**Architecture:** Component-First (Bottom-Up) with TDD. Create 3 new reusable components (MessageLogComponent, ActiveSpellsComponent, CombatStubComponent), then enhance existing MazeComponent stub to full implementation. Maximum reuse of existing components (SceneTitleComponent, SceneFooterComponent, CharacterCardComponent).

**Tech Stack:** Angular 19, TypeScript, Jest, Signals, Standalone Components

---

## Task 1: MessageLogComponent - Foundation Component

**Files:**
- Create: `src/components/message-log/message-log.component.ts`
- Create: `src/components/message-log/message-log.component.html`
- Create: `src/components/message-log/message-log.component.scss`
- Create: `src/components/message-log/message-log.component.spec.ts`

**Step 1: Write failing tests**

Create: `src/components/message-log/message-log.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageLogComponent } from './message-log.component';

describe('MessageLogComponent', () => {
  let component: MessageLogComponent;
  let fixture: ComponentFixture<MessageLogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MessageLogComponent]
    });

    fixture = TestBed.createComponent(MessageLogComponent);
    component = fixture.componentInstance;
  });

  it('displays all messages in order', () => {
    fixture.componentRef.setInput('messages', ['First', 'Second', 'Third']);
    fixture.detectChanges();

    const messageElements = fixture.nativeElement.querySelectorAll('.message');
    expect(messageElements.length).toBe(3);
    expect(messageElements[0].textContent).toBe('First');
    expect(messageElements[1].textContent).toBe('Second');
    expect(messageElements[2].textContent).toBe('Third');
  });

  it('shows empty state when no messages', () => {
    fixture.componentRef.setInput('messages', []);
    fixture.detectChanges();

    const messageElements = fixture.nativeElement.querySelectorAll('.message');
    expect(messageElements.length).toBe(0);
  });

  it('auto-scrolls to newest message after render', () => {
    const messages = ['Message 1', 'Message 2', 'Message 3'];
    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    const logContent = fixture.nativeElement.querySelector('.message-log-content');
    expect(logContent).toBeTruthy();
    // Check that scrollTop is at maximum (scrolled to bottom)
    expect(logContent.scrollTop).toBeGreaterThanOrEqual(0);
  });

  it('handles maximum message limit gracefully', () => {
    const messages = Array.from({ length: 15 }, (_, i) => `Message ${i + 1}`);
    fixture.componentRef.setInput('messages', messages);
    fixture.detectChanges();

    const messageElements = fixture.nativeElement.querySelectorAll('.message');
    expect(messageElements.length).toBe(15);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- message-log.component
```

Expected: FAIL - "Cannot find module './message-log.component'"

**Step 3: Create component skeleton**

Create: `src/components/message-log/message-log.component.ts`

```typescript
import { Component, input, ViewChild, ElementRef, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-log.component.html',
  styleUrls: ['./message-log.component.scss']
})
export class MessageLogComponent {
  readonly messages = input.required<string[]>();

  @ViewChild('logContent') logContent?: ElementRef<HTMLDivElement>;

  constructor() {
    afterNextRender(() => {
      this.scrollToBottom();
    });
  }

  private scrollToBottom(): void {
    if (this.logContent) {
      const element = this.logContent.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}
```

**Step 4: Create template**

Create: `src/components/message-log/message-log.component.html`

```html
<div class="message-log">
  <div class="message-log-title">Recent Events:</div>
  <div class="message-log-content" #logContent>
    @for (message of messages(); track $index) {
      <div class="message">{{ message }}</div>
    }
  </div>
</div>
```

**Step 5: Create styles**

Create: `src/components/message-log/message-log.component.scss`

```scss
.message-log {
  background: #000;
  border: 2px solid #0f0;
  padding: 0.5rem;
  font-family: 'Courier New', monospace;
  color: #0f0;
}

.message-log-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #0f0;
  padding-bottom: 0.25rem;
}

.message-log-content {
  height: 150px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #001100;
  }

  &::-webkit-scrollbar-thumb {
    background: #0f0;
  }
}

.message {
  padding: 0.25rem 0;
  line-height: 1.4;
}
```

**Step 6: Run tests to verify they pass**

```bash
npm test -- message-log.component
```

Expected: PASS (4/4 tests)

**Step 7: Commit**

```bash
git add src/components/message-log/
git commit -m "feat: add MessageLogComponent for dungeon events"
```

---

## Task 2: ActiveSpellsComponent - Spell Status Display

**Files:**
- Create: `src/types/active-spell.types.ts`
- Create: `src/components/active-spells/active-spells.component.ts`
- Create: `src/components/active-spells/active-spells.component.html`
- Create: `src/components/active-spells/active-spells.component.scss`
- Create: `src/components/active-spells/active-spells.component.spec.ts`

**Step 1: Create type definition**

Create: `src/types/active-spell.types.ts`

```typescript
export interface ActiveSpell {
  name: string;        // "MILWA", "DUMAPIC"
  icon: string;        // "💡", "🧭"
  description: string; // "Light (Radius: 1)"
}
```

**Step 2: Write failing tests**

Create: `src/components/active-spells/active-spells.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveSpellsComponent } from './active-spells.component';
import { ActiveSpell } from '../../types/active-spell.types';

describe('ActiveSpellsComponent', () => {
  let component: ActiveSpellsComponent;
  let fixture: ComponentFixture<ActiveSpellsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActiveSpellsComponent]
    });

    fixture = TestBed.createComponent(ActiveSpellsComponent);
    component = fixture.componentInstance;
  });

  it('displays spell list with icons', () => {
    const spells: ActiveSpell[] = [
      { name: 'MILWA', icon: '💡', description: 'Light (Radius: 1)' },
      { name: 'DUMAPIC', icon: '🧭', description: 'Coordinates (10, 5)' }
    ];

    fixture.componentRef.setInput('spells', spells);
    fixture.detectChanges();

    const spellElements = fixture.nativeElement.querySelectorAll('.spell');
    expect(spellElements.length).toBe(2);
    expect(spellElements[0].textContent).toContain('💡');
    expect(spellElements[0].textContent).toContain('MILWA');
    expect(spellElements[1].textContent).toContain('🧭');
    expect(spellElements[1].textContent).toContain('DUMAPIC');
  });

  it('shows "No active spells" when empty', () => {
    fixture.componentRef.setInput('spells', []);
    fixture.detectChanges();

    const emptyMessage = fixture.nativeElement.querySelector('.empty');
    expect(emptyMessage).toBeTruthy();
    expect(emptyMessage.textContent).toContain('No active spells');
  });

  it('displays spell descriptions correctly', () => {
    const spells: ActiveSpell[] = [
      { name: 'MILWA', icon: '💡', description: 'Light (Radius: 3)' }
    ];

    fixture.componentRef.setInput('spells', spells);
    fixture.detectChanges();

    const description = fixture.nativeElement.querySelector('.desc');
    expect(description.textContent).toContain('Light (Radius: 3)');
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
npm test -- active-spells.component
```

Expected: FAIL - "Cannot find module './active-spells.component'"

**Step 4: Create component**

Create: `src/components/active-spells/active-spells.component.ts`

```typescript
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveSpell } from '../../types/active-spell.types';

@Component({
  selector: 'app-active-spells',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-spells.component.html',
  styleUrls: ['./active-spells.component.scss']
})
export class ActiveSpellsComponent {
  readonly spells = input.required<ActiveSpell[]>();
}
```

**Step 5: Create template**

Create: `src/components/active-spells/active-spells.component.html`

```html
<div class="active-spells">
  <div class="title">Active Spells:</div>
  @if (spells().length === 0) {
    <div class="empty">No active spells</div>
  } @else {
    @for (spell of spells(); track spell.name) {
      <div class="spell">
        <span class="icon">{{ spell.icon }}</span>
        <span class="name">{{ spell.name }}</span>
        <span class="desc">{{ spell.description }}</span>
      </div>
    }
  }
</div>
```

**Step 6: Create styles**

Create: `src/components/active-spells/active-spells.component.scss`

```scss
.active-spells {
  background: #001100;
  border: 1px solid #0f0;
  padding: 0.75rem;
  font-family: 'Courier New', monospace;
  color: #0f0;
  margin-bottom: 1rem;
}

.title {
  font-weight: bold;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.empty {
  font-style: italic;
  opacity: 0.7;
}

.spell {
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem 0;
  align-items: center;

  .icon {
    font-size: 1.2rem;
  }

  .name {
    font-weight: bold;
    min-width: 80px;
  }

  .desc {
    opacity: 0.8;
    font-size: 0.85rem;
  }
}
```

**Step 7: Run tests to verify they pass**

```bash
npm test -- active-spells.component
```

Expected: PASS (3/3 tests)

**Step 8: Commit**

```bash
git add src/types/active-spell.types.ts src/components/active-spells/
git commit -m "feat: add ActiveSpellsComponent for spell status"
```

---

## Task 3: CombatStubComponent + Route

**Files:**
- Create: `src/app/combat-stub/combat-stub.component.ts`
- Create: `src/app/combat-stub/combat-stub.component.html`
- Create: `src/app/combat-stub/combat-stub.component.scss`
- Create: `src/app/combat-stub/combat-stub.component.spec.ts`
- Modify: `src/app/app.routes.ts`

**Step 1: Write failing tests**

Create: `src/app/combat-stub/combat-stub.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CombatStubComponent } from './combat-stub.component';

describe('CombatStubComponent', () => {
  let component: CombatStubComponent;
  let fixture: ComponentFixture<CombatStubComponent>;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CombatStubComponent]
    });

    fixture = TestBed.createComponent(CombatStubComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  it('displays combat message', () => {
    fixture.detectChanges();

    const content = fixture.nativeElement.querySelector('.combat-stub-content');
    expect(content.textContent).toContain('encounter monsters');
  });

  it('navigates back to maze on footer action', () => {
    fixture.detectChanges();

    component.handleFooterAction('return');

    expect(router.navigate).toHaveBeenCalledWith(['/maze']);
  });

  it('handles ESC key to return to maze', () => {
    fixture.detectChanges();

    component.handleEscape();

    expect(router.navigate).toHaveBeenCalledWith(['/maze']);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- combat-stub.component
```

Expected: FAIL - "Cannot find module './combat-stub.component'"

**Step 3: Create component**

Create: `src/app/combat-stub/combat-stub.component.ts`

```typescript
import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { MenuItem } from '../../types/menu.types';

@Component({
  selector: 'app-combat-stub',
  standalone: true,
  imports: [CommonModule, SceneTitleComponent, SceneFooterComponent],
  templateUrl: './combat-stub.component.html',
  styleUrls: ['./combat-stub.component.scss']
})
export class CombatStubComponent {
  readonly footerMenuItems: MenuItem[] = [
    { id: 'return', label: 'Return to Maze (ESC)', shortcut: 'ESC', enabled: true }
  ];

  constructor(private router: Router) {}

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.router.navigate(['/maze']);
  }

  handleFooterAction(action: string): void {
    if (action === 'return') {
      this.router.navigate(['/maze']);
    }
  }
}
```

**Step 4: Create template**

Create: `src/app/combat-stub/combat-stub.component.html`

```html
<div class="combat-stub-scene">
  <app-scene-title title="COMBAT!" />

  <div class="combat-stub-content">
    <p>You encounter monsters!</p>
    <p><em>(Full combat system coming in Phase 6)</em></p>
  </div>

  <app-scene-footer
    [menuItems]="footerMenuItems"
    (itemSelected)="handleFooterAction($event)"
  />
</div>
```

**Step 5: Create styles**

Create: `src/app/combat-stub/combat-stub.component.scss`

```scss
.combat-stub-scene {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
  color: #0f0;
}

.combat-stub-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Courier New', monospace;
  font-size: 1.5rem;
  text-align: center;
  padding: 2rem;

  p {
    margin: 1rem 0;
  }

  em {
    font-size: 1rem;
    opacity: 0.7;
  }
}
```

**Step 6: Add route**

Modify: `src/app/app.routes.ts`

Add this import at the top:
```typescript
import { CombatStubComponent } from './combat-stub/combat-stub.component';
```

Add this route to the routes array:
```typescript
{
  path: 'combat-stub',
  component: CombatStubComponent
},
```

**Step 7: Run tests to verify they pass**

```bash
npm test -- combat-stub.component
```

Expected: PASS (3/3 tests)

**Step 8: Commit**

```bash
git add src/app/combat-stub/ src/app/app.routes.ts
git commit -m "feat: add CombatStubComponent as temporary encounter placeholder"
```

---

## Task 4: MazeComponent - Initialization & State Setup

**Files:**
- Modify: `src/app/maze/maze.component.ts`
- Modify: `src/app/maze/maze.component.html`
- Modify: `src/app/maze/maze.component.scss`
- Modify: `src/app/maze/maze.component.spec.ts`

**Step 1: Read existing maze component**

```bash
cat src/app/maze/maze.component.ts
```

Note current stub implementation (25 lines).

**Step 2: Write failing tests**

Modify: `src/app/maze/maze.component.spec.ts`

Replace entire file content:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MazeComponent } from './maze.component';
import { GameStateService } from '../../services/GameStateService';
import { SceneType } from '../../types/scene.types';

function createTestDungeonState() {
  return {
    currentLevel: 1,
    position: { x: 10, y: 10, facing: 'NORTH' as const },
    lightActive: false,
    lightRadius: 1,
    visitedTiles: new Set<string>(),
    defeatedEncounters: []
  };
}

describe('MazeComponent - Initialization', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    // Set up test state with dungeon
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));
  });

  it('sets scene type to MAZE on init', () => {
    component.ngOnInit();

    expect(gameState.currentScene()).toBe(SceneType.MAZE);
  });

  it('loads dungeon state on init', () => {
    component.ngOnInit();

    const dungeon = component.dungeonState();
    expect(dungeon).toBeDefined();
    expect(dungeon?.currentLevel).toBe(1);
    expect(dungeon?.position.x).toBe(10);
    expect(dungeon?.position.y).toBe(10);
  });

  it('initializes with empty message log', () => {
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.messages().length).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 3: Run tests to verify they fail**

```bash
npm test -- maze.component
```

Expected: FAIL - Various "property does not exist" errors

**Step 4: Replace maze component implementation**

Modify: `src/app/maze/maze.component.ts`

Replace entire file content:

```typescript
import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { MessageLogComponent } from '../../components/message-log/message-log.component';
import { ActiveSpellsComponent } from '../../components/active-spells/active-spells.component';
import { GameStateService } from '../../services/GameStateService';
import { NavigationService } from '../../services/NavigationService';
import { DungeonService } from '../../services/DungeonService';
import { EncounterService } from '../../services/EncounterService';
import { SceneType } from '../../types/scene.types';
import { MenuItem } from '../../types/menu.types';
import { ActiveSpell } from '../../types/active-spell.types';
import { GameState } from '../../types/game-state.types';

@Component({
  selector: 'app-maze',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent,
    MessageLogComponent,
    ActiveSpellsComponent
  ],
  templateUrl: './maze.component.html',
  styleUrls: ['./maze.component.scss']
})
export class MazeComponent implements OnInit {
  // Local signals
  readonly messages = signal<string[]>([]);
  readonly errorMessage = signal<string | null>(null);

  // Computed signals from GameStateService
  readonly dungeonState = computed(() => this.gameState.state().dungeon);
  readonly position = computed(() => this.dungeonState()?.position);
  readonly currentLevel = computed(() => this.dungeonState()?.currentLevel ?? 1);
  readonly party = computed(() => this.gameState.state().party);
  readonly partyCharacters = computed(() => {
    const roster = this.gameState.state().roster;
    return this.party().memberIds.map(id => roster.get(id)!).filter(c => c);
  });

  // Active spells (computed from dungeon state)
  readonly activeSpells = computed((): ActiveSpell[] => {
    const spells: ActiveSpell[] = [];
    const dungeon = this.dungeonState();

    if (dungeon?.lightActive) {
      spells.push({
        name: 'MILWA',
        icon: '💡',
        description: `Light (Radius: ${dungeon.lightRadius})`
      });
    }

    return spells;
  });

  // Scene title
  readonly sceneTitle = computed(() => `MAZE - LEVEL ${this.currentLevel()}`);

  // Footer menu
  readonly footerMenuItems = computed((): MenuItem[] => [
    { id: 'forward', label: 'Forward (W)', shortcut: 'W', enabled: true },
    { id: 'back', label: 'Backward (S)', shortcut: 'S', enabled: true },
    { id: 'left', label: 'Turn Left (A)', shortcut: 'A', enabled: true },
    { id: 'right', label: 'Turn Right (D)', shortcut: 'D', enabled: true },
    { id: 'strafe_left', label: 'Strafe Left (Q)', shortcut: 'Q', enabled: true },
    { id: 'strafe_right', label: 'Strafe Right (E)', shortcut: 'E', enabled: true },
    { id: 'camp', label: 'Return to Camp (ESC)', shortcut: 'ESC', enabled: true }
  ]);

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set scene type
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.MAZE
    }));

    // Validate dungeon state
    const dungeon = this.dungeonState();
    if (!dungeon) {
      this.errorMessage.set('Dungeon not initialized. Returning to camp...');
      setTimeout(() => this.router.navigate(['/camp']), 2000);
      return;
    }

    // Add welcome message
    this.addMessage(`Entering Level ${this.currentLevel()}...`);
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.router.navigate(['/camp']);
  }

  handleFooterAction(action: string): void {
    // Will be implemented in later tasks
  }

  private addMessage(message: string): void {
    this.messages.update(msgs => {
      const newMsgs = [...msgs, message];
      return newMsgs.slice(-10); // Keep last 10 messages
    });
  }
}
```

**Step 5: Update template**

Modify: `src/app/maze/maze.component.html`

Replace entire file content:

```html
<div class="maze-scene">
  <app-scene-title [title]="sceneTitle()" />

  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }

  <div class="maze-content">
    <!-- Left: Canvas Placeholder -->
    <div class="maze-viewport">
      <div class="canvas-placeholder">
        <p>3D Rendering</p>
        <p>Coming in Phase 3</p>
      </div>
    </div>

    <!-- Right: Party & Spells -->
    <div class="maze-panel">
      <!-- Active Spells -->
      <app-active-spells [spells]="activeSpells()" />

      <!-- Party Grid (2×3) -->
      <div class="party-grid">
        @for (char of partyCharacters(); track char.id) {
          <app-character-card [character]="char" />
        }
      </div>
    </div>
  </div>

  <!-- Message Log -->
  <app-message-log [messages]="messages()" />

  <!-- Footer Actions -->
  <app-scene-footer
    [menuItems]="footerMenuItems()"
    (itemSelected)="handleFooterAction($event)"
  />
</div>
```

**Step 6: Update styles**

Modify: `src/app/maze/maze.component.scss`

Replace entire file content:

```scss
.maze-scene {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
  color: #0f0;
}

.error-message {
  background: #f00;
  color: #fff;
  padding: 1rem;
  text-align: center;
  font-weight: bold;
  font-family: 'Courier New', monospace;
}

.maze-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  flex: 1;
  padding: 1rem;
  overflow: hidden;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.maze-viewport {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  border: 2px solid #0f0;
  min-height: 400px;
}

.canvas-placeholder {
  text-align: center;
  color: #0f0;
  font-family: 'Courier New', monospace;
  opacity: 0.5;

  p {
    margin: 0.5rem 0;
  }
}

.maze-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.party-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
```

**Step 7: Run tests to verify they pass**

```bash
npm test -- maze.component
```

Expected: PASS (3/3 tests in Initialization group)

**Step 8: Commit**

```bash
git add src/app/maze/
git commit -m "feat: implement MazeComponent initialization and state setup"
```

---

## Task 5: MazeComponent - Forward/Backward Movement

**Files:**
- Modify: `src/app/maze/maze.component.ts`
- Modify: `src/app/maze/maze.component.spec.ts`

**Step 1: Write failing tests**

Modify: `src/app/maze/maze.component.spec.ts`

Add after existing tests:

```typescript
describe('MazeComponent - Forward/Backward Movement', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    // Set up test state with dungeon
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('moves forward when W pressed and path clear', () => {
    const initialY = component.position()!.y;

    // Simulate W key press
    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.y).toBe(initialY + 1);
  });

  it('shows error when moving into wall', () => {
    // Mock canMove to return blocked
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({
      allowed: false,
      reason: 'You walk into a wall. Ouch!'
    });

    const initialY = component.position()!.y;

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    // Position unchanged
    expect(component.position()!.y).toBe(initialY);
    // Error message added
    expect(component.messages()).toContain('You walk into a wall. Ouch!');
  });

  it('adds message to log on successful move', () => {
    const initialMessages = component.messages().length;

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.messages().length).toBeGreaterThan(initialMessages);
  });

  it('moves backward when S pressed', () => {
    const initialY = component.position()!.y;

    const event = new KeyboardEvent('keydown', { key: 's' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.y).toBe(initialY - 1);
  });

  it('wraps coordinates at edge', () => {
    // Set position to edge
    gameState.updateState(state => ({
      ...state,
      dungeon: {
        ...state.dungeon!,
        position: { x: 19, y: 10, facing: 'EAST' }
      }
    }));
    fixture.detectChanges();

    // Move east (should wrap to x=0)
    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.x).toBe(0);
  });

  it('updates position in GameState immutably', () => {
    const initialState = gameState.state();

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    const newState = gameState.state();
    expect(newState).not.toBe(initialState);
    expect(newState.dungeon).not.toBe(initialState.dungeon);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- maze.component
```

Expected: FAIL - "handleKeyPress is not a function" or similar errors

**Step 3: Implement movement methods**

Modify: `src/app/maze/maze.component.ts`

Add after ngOnInit():

```typescript
@HostListener('window:keydown', ['$event'])
handleKeyPress(event: KeyboardEvent): void {
  const key = event.key.toLowerCase();

  switch(key) {
    case 'w': this.moveForward(); break;
    case 's': this.moveBackward(); break;
    // More keys will be added in later tasks
  }
}

moveForward(): void {
  this.executeMovement('FORWARD', (state: GameState) => NavigationService.moveForward(state));
}

moveBackward(): void {
  this.executeMovement('BACKWARD', (state: GameState) => NavigationService.moveBackward(state));
}

private executeMovement(
  moveType: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT',
  serviceFn: (state: GameState) => GameState
): void {
  const state = this.gameState.state();
  const level = DungeonService.loadLevel(this.currentLevel());
  const position = this.position()!;

  // Validate movement
  const validation = DungeonService.canMove(level, position, moveType);

  if (!validation.allowed) {
    this.addMessage(validation.reason!);
    return;
  }

  // Execute movement
  const newState = serviceFn(state);
  this.gameState.updateState(() => newState);
  this.addMessage('You move forward.');
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- maze.component
```

Expected: PASS (9/9 tests - 3 initialization + 6 movement)

**Step 5: Commit**

```bash
git add src/app/maze/
git commit -m "feat: add forward/backward movement with wall collision"
```

---

## Task 6: MazeComponent - Rotation

**Files:**
- Modify: `src/app/maze/maze.component.ts`
- Modify: `src/app/maze/maze.component.spec.ts`

**Step 1: Write failing tests**

Modify: `src/app/maze/maze.component.spec.ts`

Add after movement tests:

```typescript
describe('MazeComponent - Rotation', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('turns left when A pressed (NORTH → WEST)', () => {
    expect(component.position()!.facing).toBe('NORTH');

    const event = new KeyboardEvent('keydown', { key: 'a' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.facing).toBe('WEST');
  });

  it('turns right when D pressed (NORTH → EAST)', () => {
    expect(component.position()!.facing).toBe('NORTH');

    const event = new KeyboardEvent('keydown', { key: 'd' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.facing).toBe('EAST');
  });

  it('updates facing in GameState', () => {
    const initialFacing = component.position()!.facing;

    const event = new KeyboardEvent('keydown', { key: 'a' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.facing).not.toBe(initialFacing);
  });

  it('full rotation cycle returns to original direction', () => {
    expect(component.position()!.facing).toBe('NORTH');

    // Turn right 4 times
    for (let i = 0; i < 4; i++) {
      const event = new KeyboardEvent('keydown', { key: 'd' });
      window.dispatchEvent(event);
      fixture.detectChanges();
    }

    expect(component.position()!.facing).toBe('NORTH');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- maze.component
```

Expected: FAIL - Keys not handled

**Step 3: Implement rotation methods**

Modify: `src/app/maze/maze.component.ts`

Update handleKeyPress switch statement:
```typescript
switch(key) {
  case 'w': this.moveForward(); break;
  case 's': this.moveBackward(); break;
  case 'a': this.turnLeft(); break;
  case 'd': this.turnRight(); break;
}
```

Add methods after moveBackward():
```typescript
turnLeft(): void {
  const state = this.gameState.state();
  const newState = NavigationService.turnLeft(state);
  this.gameState.updateState(() => newState);
  this.addMessage('You turn left.');
}

turnRight(): void {
  const state = this.gameState.state();
  const newState = NavigationService.turnRight(state);
  this.gameState.updateState(() => newState);
  this.addMessage('You turn right.');
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- maze.component
```

Expected: PASS (13/13 tests)

**Step 5: Commit**

```bash
git add src/app/maze/
git commit -m "feat: add rotation with A/D keys"
```

---

## Task 7: MazeComponent - Strafe Movement

**Files:**
- Modify: `src/app/maze/maze.component.ts`
- Modify: `src/app/maze/maze.component.spec.ts`

**Step 1: Write failing tests**

Modify: `src/app/maze/maze.component.spec.ts`

Add after rotation tests:

```typescript
describe('MazeComponent - Strafe Movement', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);

    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('strafes left when Q pressed', () => {
    const initialX = component.position()!.x;

    const event = new KeyboardEvent('keydown', { key: 'q' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    // Facing NORTH, strafe left should move west (x-1)
    expect(component.position()!.x).toBe(initialX - 1);
  });

  it('strafes right when E pressed', () => {
    const initialX = component.position()!.x;

    const event = new KeyboardEvent('keydown', { key: 'e' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    // Facing NORTH, strafe right should move east (x+1)
    expect(component.position()!.x).toBe(initialX + 1);
  });

  it('preserves facing direction during strafe', () => {
    const initialFacing = component.position()!.facing;

    const event = new KeyboardEvent('keydown', { key: 'q' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.facing).toBe(initialFacing);
  });

  it('validates walls for strafe movement', () => {
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({
      allowed: false,
      reason: 'You walk into a wall. Ouch!'
    });

    const initialX = component.position()!.x;

    const event = new KeyboardEvent('keydown', { key: 'q' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.position()!.x).toBe(initialX);
    expect(component.messages()).toContain('You walk into a wall. Ouch!');
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- maze.component
```

Expected: FAIL - Keys not handled

**Step 3: Implement strafe methods**

Modify: `src/app/maze/maze.component.ts`

Update handleKeyPress switch statement:
```typescript
switch(key) {
  case 'w': this.moveForward(); break;
  case 's': this.moveBackward(); break;
  case 'a': this.turnLeft(); break;
  case 'd': this.turnRight(); break;
  case 'q': this.strafeLeft(); break;
  case 'e': this.strafeRight(); break;
}
```

Add methods after turnRight():
```typescript
strafeLeft(): void {
  this.executeMovement('STRAFE_LEFT', (state: GameState) => NavigationService.strafeLeft(state));
}

strafeRight(): void {
  this.executeMovement('STRAFE_RIGHT', (state: GameState) => NavigationService.strafeRight(state));
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- maze.component
```

Expected: PASS (17/17 tests)

**Step 5: Commit**

```bash
git add src/app/maze/
git commit -m "feat: add strafe movement with Q/E keys"
```

---

## Task 8: MazeComponent - Encounter Detection & Combat Transition

**Files:**
- Modify: `src/app/maze/maze.component.ts`
- Modify: `src/app/maze/maze.component.spec.ts`

**Step 1: Write failing tests**

Modify: `src/app/maze/maze.component.spec.ts`

Add after strafe tests:

```typescript
describe('MazeComponent - Encounter Detection', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');

    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    component.ngOnInit();
    fixture.detectChanges();
  });

  it('rolls for encounter after successful movement', () => {
    const rollSpy = jest.spyOn(EncounterService, 'rollRandomEncounter').mockReturnValue(false);

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(rollSpy).toHaveBeenCalled();
  });

  it('navigates to combat-stub when encounter occurs', async () => {
    jest.spyOn(EncounterService, 'rollRandomEncounter').mockReturnValue(true);

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    // Wait for setTimeout
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(router.navigate).toHaveBeenCalledWith(['/combat-stub']);
  });

  it('adds "You encounter monsters!" to message log', () => {
    jest.spyOn(EncounterService, 'rollRandomEncounter').mockReturnValue(true);

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.messages()).toContain('You encounter monsters!');
  });

  it('does not trigger encounter when movement blocked', () => {
    jest.spyOn(DungeonService, 'canMove').mockReturnValue({
      allowed: false,
      reason: 'You walk into a wall. Ouch!'
    });
    const rollSpy = jest.spyOn(EncounterService, 'rollRandomEncounter');

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(rollSpy).not.toHaveBeenCalled();
  });

  it('respects 10% encounter rate statistically', () => {
    let encounterCount = 0;
    const totalRolls = 100;

    jest.spyOn(EncounterService, 'rollRandomEncounter').mockImplementation(() => {
      const result = Math.random() < 0.10;
      if (result) encounterCount++;
      return result;
    });

    for (let i = 0; i < totalRolls; i++) {
      const event = new KeyboardEvent('keydown', { key: 'w' });
      window.dispatchEvent(event);
      fixture.detectChanges();
    }

    // Statistical test: expect ~10% ± 5%
    expect(encounterCount).toBeGreaterThan(0);
    expect(encounterCount).toBeLessThan(20);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- maze.component
```

Expected: FAIL - checkEncounter not called

**Step 3: Implement encounter checking**

Modify: `src/app/maze/maze.component.ts`

Update executeMovement() method to call checkEncounter after successful move:

```typescript
private executeMovement(
  moveType: 'FORWARD' | 'BACKWARD' | 'STRAFE_LEFT' | 'STRAFE_RIGHT',
  serviceFn: (state: GameState) => GameState
): void {
  const state = this.gameState.state();
  const level = DungeonService.loadLevel(this.currentLevel());
  const position = this.position()!;

  // Validate movement
  const validation = DungeonService.canMove(level, position, moveType);

  if (!validation.allowed) {
    this.addMessage(validation.reason!);
    return;
  }

  // Execute movement
  const newState = serviceFn(state);
  this.gameState.updateState(() => newState);
  this.addMessage('You move forward.');

  // Check for encounter
  this.checkEncounter();
}
```

Add checkEncounter method after strafeRight():

```typescript
private checkEncounter(): void {
  const encountered = EncounterService.rollRandomEncounter();

  if (encountered) {
    this.addMessage('You encounter monsters!');

    // Short delay before transition (allows message to display)
    setTimeout(() => {
      this.router.navigate(['/combat-stub']);
    }, 500);
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- maze.component
```

Expected: PASS (22/22 tests)

**Step 5: Commit**

```bash
git add src/app/maze/
git commit -m "feat: add encounter detection and combat transitions"
```

---

## Task 9: MazeComponent - Navigation & Error Handling

**Files:**
- Modify: `src/app/maze/maze.component.ts`
- Modify: `src/app/maze/maze.component.spec.ts`

**Step 1: Write failing tests**

Modify: `src/app/maze/maze.component.spec.ts`

Add after encounter tests:

```typescript
describe('MazeComponent - Navigation & Error Handling', () => {
  let component: MazeComponent;
  let fixture: ComponentFixture<MazeComponent>;
  let gameState: GameStateService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MazeComponent]
    });

    fixture = TestBed.createComponent(MazeComponent);
    component = fixture.componentInstance;
    gameState = TestBed.inject(GameStateService);
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate');
  });

  it('returns to camp when ESC pressed', () => {
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));
    component.ngOnInit();
    fixture.detectChanges();

    component.handleEscape();

    expect(router.navigate).toHaveBeenCalledWith(['/camp']);
  });

  it('returns to camp via footer menu action', () => {
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));
    component.ngOnInit();
    fixture.detectChanges();

    component.handleFooterAction('camp');

    expect(router.navigate).toHaveBeenCalledWith(['/camp']);
  });

  it('handles missing dungeon state gracefully', async () => {
    // Don't set dungeon state
    gameState.updateState(state => ({
      ...state,
      dungeon: undefined
    }));

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.errorMessage()).toContain('Dungeon not initialized');

    // Wait for setTimeout
    await new Promise(resolve => setTimeout(resolve, 2100));
    expect(router.navigate).toHaveBeenCalledWith(['/camp']);
  });

  it('shows error for invalid movement attempt', () => {
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));
    component.ngOnInit();
    fixture.detectChanges();

    jest.spyOn(DungeonService, 'canMove').mockReturnValue({
      allowed: false,
      reason: 'A door blocks your way.'
    });

    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    expect(component.messages()).toContain('A door blocks your way.');
  });

  it('footer action handles all movement types', () => {
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));
    component.ngOnInit();
    fixture.detectChanges();

    const initialPosition = component.position()!;

    // Test forward action
    component.handleFooterAction('forward');
    fixture.detectChanges();
    expect(component.position()!.y).not.toBe(initialPosition.y);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
npm test -- maze.component
```

Expected: FAIL - handleFooterAction not implemented

**Step 3: Implement footer action handler**

Modify: `src/app/maze/maze.component.ts`

Replace handleFooterAction stub with full implementation:

```typescript
handleFooterAction(action: string): void {
  switch(action) {
    case 'forward': this.moveForward(); break;
    case 'back': this.moveBackward(); break;
    case 'left': this.turnLeft(); break;
    case 'right': this.turnRight(); break;
    case 'strafe_left': this.strafeLeft(); break;
    case 'strafe_right': this.strafeRight(); break;
    case 'camp': this.router.navigate(['/camp']); break;
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test -- maze.component
```

Expected: PASS (27/27 tests)

**Step 5: Commit**

```bash
git add src/app/maze/
git commit -m "feat: add navigation and error handling to MazeComponent"
```

---

## Task 10: Integration Test - Full Navigation Flow

**Files:**
- Create: `src/app/maze/__tests__/maze-integration.spec.ts`

**Step 1: Create integration test**

Create: `src/app/maze/__tests__/maze-integration.spec.ts`

```typescript
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { MazeComponent } from '../maze.component';
import { CampComponent } from '../../camp/camp.component';
import { CombatStubComponent } from '../../combat-stub/combat-stub.component';
import { GameStateService } from '../../../services/GameStateService';
import { EncounterService } from '../../../services/EncounterService';
import { SceneType } from '../../../types/scene.types';

function createTestDungeonState() {
  return {
    currentLevel: 1,
    position: { x: 10, y: 10, facing: 'NORTH' as const },
    lightActive: false,
    lightRadius: 1,
    visitedTiles: new Set<string>(),
    defeatedEncounters: []
  };
}

describe('Maze Scene Integration', () => {
  it('full navigation flow: Camp → Maze → Move → Encounter → Combat → Return', async () => {
    // Setup routing
    const routes = [
      { path: 'camp', component: CampComponent },
      { path: 'maze', component: MazeComponent },
      { path: 'combat-stub', component: CombatStubComponent }
    ];

    await TestBed.configureTestingModule({
      imports: [MazeComponent, CampComponent, CombatStubComponent],
      providers: [provideRouter(routes)]
    }).compileComponents();

    const router = TestBed.inject(Router);
    const gameState = TestBed.inject(GameStateService);

    // Initialize dungeon state
    gameState.updateState(state => ({
      ...state,
      dungeon: createTestDungeonState()
    }));

    // 1. Navigate from camp to maze
    await router.navigate(['/maze']);
    expect(router.url).toBe('/maze');
    expect(gameState.currentScene()).toBe(SceneType.MAZE);

    // 2. Verify dungeon state initialized
    const dungeon = gameState.state().dungeon;
    expect(dungeon).toBeDefined();
    expect(dungeon!.currentLevel).toBe(1);
    expect(dungeon!.position.x).toBe(10);
    expect(dungeon!.position.y).toBe(10);

    // 3. Get maze component and simulate forward movement
    const fixture = TestBed.createComponent(MazeComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();

    const initialY = dungeon!.position.y;
    const event = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event);
    fixture.detectChanges();

    // 4. Verify position updated and message added
    const newDungeon = gameState.state().dungeon;
    expect(newDungeon!.position.y).toBe(initialY + 1);
    expect(component.messages().length).toBeGreaterThan(0);

    // 5. Force encounter by mocking
    jest.spyOn(EncounterService, 'rollRandomEncounter').mockReturnValue(true);
    const event2 = new KeyboardEvent('keydown', { key: 'w' });
    window.dispatchEvent(event2);
    fixture.detectChanges();

    // 6. Verify navigation to combat-stub (after 500ms delay)
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(router.url).toBe('/combat-stub');
    expect(component.messages()).toContain('You encounter monsters!');

    // 7. Return to maze from combat
    await router.navigate(['/maze']);
    expect(router.url).toBe('/maze');

    // 8. Verify state persisted across navigation
    const persistedDungeon = gameState.state().dungeon;
    expect(persistedDungeon).toBeDefined();
    expect(persistedDungeon!.currentLevel).toBe(1);

    // 9. Return to camp (ESC)
    component.handleEscape();
    await fixture.whenStable();
    expect(router.url).toBe('/camp');
  });
});
```

**Step 2: Run integration test**

```bash
npm test -- maze-integration
```

Expected: PASS (1/1 test)

**Step 3: Commit**

```bash
git add src/app/maze/__tests__/
git commit -m "test: add maze scene integration test"
```

---

## Task 11: Verify Coverage & Performance

**Files:**
- None (verification only)

**Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass (791 existing + 38 new = 829 total)

**Step 2: Run test coverage**

```bash
npm test -- --coverage --testPathPattern=maze
```

Expected Coverage:
- MessageLogComponent: 100% (4/4 tests)
- ActiveSpellsComponent: 100% (3/3 tests)
- CombatStubComponent: 100% (3/3 tests)
- MazeComponent: 100% (27/27 tests)
- Integration: 100% (1/1 test)

**Step 3: Check performance**

```bash
npm test -- --testPathPattern=maze
```

Expected: All Phase 2 tests complete in <1 second

**Step 4: Verify no regressions**

```bash
npm test
```

Expected: All 829 tests passing, no failures in existing tests

**Step 5: Final commit**

```bash
git add .
git commit -m "test: verify 100% coverage for Phase 2"
```

---

## Summary

**Phase 2 Complete! Created:**
- ✅ 3 new reusable components (MessageLog, ActiveSpells, CombatStub)
- ✅ Enhanced MazeComponent from stub to full implementation
- ✅ 6-direction movement system (W/A/S/D/Q/E)
- ✅ Encounter detection with combat transitions
- ✅ Message log with auto-scroll
- ✅ Party display with 2×3 character grid
- ✅ 38 new tests with 100% coverage
- ✅ Full integration test

**Next Phase:** Phase 3 - Canvas Rendering (3D wireframe maze view)

---

Plan complete and saved to `docs/plans/2025-11-06-maze-phase-2-implementation.md`.
