# Camp Scene Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a minimal Camp scene as a pre-dungeon staging area where players can inspect characters, cast spells, reorder party formation, and enter the maze.

**Architecture:** Follow Castle Menu pattern (SceneTitle + party grid + SceneFooter). All state derived from GameStateService via computed signals. Character cards with dynamic actions (Inspect, Cast, Move Up/Down). Navigation to Character Inspection, Spell Casting (stub), and Maze (stub) scenes.

**Tech Stack:** Angular 19, TypeScript, Jest, Angular Signals, Angular Router

---

## Task 1: Add CAMP to SceneType Enum

**Files:**
- Modify: `src/types/Scene.ts`

**Step 1: Add CAMP to SceneType enum**

Open `src/types/Scene.ts` and add CAMP to the enum:

```typescript
export enum SceneType {
  TITLE_SCREEN = 'TITLE_SCREEN',
  CASTLE_MENU = 'CASTLE_MENU',
  TRAINING_GROUNDS = 'TRAINING_GROUNDS',
  TAVERN = 'TAVERN',
  TEMPLE = 'TEMPLE',
  SHOP = 'SHOP',
  INN = 'INN',
  UTILITIES = 'UTILITIES',
  CHARACTER_INSPECTION = 'CHARACTER_INSPECTION',
  CAMP = 'CAMP',  // Add this
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types/Scene.ts
git commit -m "feat: add CAMP scene type to enum"
```

---

## Task 2: Create Stub Spell Casting Scene

**Files:**
- Create: `src/app/spell-casting/spell-casting.component.ts`
- Create: `src/app/spell-casting/spell-casting.component.html`
- Create: `src/app/spell-casting/spell-casting.component.scss`

**Step 1: Create spell-casting component file**

Create `src/app/spell-casting/spell-casting.component.ts`:

```typescript
import { Component, OnInit, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GameStateService } from '../../services/GameStateService';

@Component({
  selector: 'app-spell-casting',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spell-casting.component.html',
  styleUrls: ['./spell-casting.component.scss']
})
export class SpellCastingComponent implements OnInit {
  private readonly queryParams = toSignal(this.route.queryParams);

  readonly characterId = computed(() =>
    this.queryParams()?.['characterId'] || null
  );

  readonly returnTo = computed(() =>
    this.queryParams()?.['returnTo'] || 'castle-menu'
  );

  constructor(
    private readonly gameState: GameStateService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // No scene update - this is a temporary stub
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.returnToPrevious();
  }

  returnToPrevious(): void {
    this.router.navigate([`/${this.returnTo()}`]);
  }
}
```

**Step 2: Create spell-casting template**

Create `src/app/spell-casting/spell-casting.component.html`:

```html
<div class="spell-casting-stub">
  <h1>Spell Casting</h1>
  <p>Coming in Phase 7: Dungeon Navigation and Combat System</p>
  <p class="character-id">Character ID: {{ characterId() }}</p>
  <button (click)="returnToPrevious()">Return (ESC)</button>
</div>
```

**Step 3: Create spell-casting styles**

Create `src/app/spell-casting/spell-casting.component.scss`:

```scss
.spell-casting-stub {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 1rem;

  h1 {
    font-size: 2rem;
  }

  .character-id {
    font-style: italic;
    color: #666;
  }

  button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    cursor: pointer;
  }
}
```

**Step 4: Add route to app.routes.ts**

Modify `src/app/app.routes.ts` and add the spell-casting route:

```typescript
import { SpellCastingComponent } from './spell-casting/spell-casting.component';

export const routes: Routes = [
  // ... existing routes ...
  {
    path: 'spell-casting',
    component: SpellCastingComponent
  },
  // ... rest of routes ...
];
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/spell-casting/
git add src/app/app.routes.ts
git commit -m "feat: add spell casting stub scene for Phase 7"
```

---

## Task 3: Create Stub Maze Scene

**Files:**
- Create: `src/app/maze/maze.component.ts`
- Create: `src/app/maze/maze.component.html`
- Create: `src/app/maze/maze.component.scss`

**Step 1: Create maze component file**

Create `src/app/maze/maze.component.ts`:

```typescript
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';

@Component({
  selector: 'app-maze',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './maze.component.html',
  styleUrls: ['./maze.component.scss']
})
export class MazeComponent implements OnInit {
  constructor(
    private readonly gameState: GameStateService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // No scene update - this is a temporary stub
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.returnToCamp();
  }

  returnToCamp(): void {
    this.router.navigate(['/camp']);
  }
}
```

**Step 2: Create maze template**

Create `src/app/maze/maze.component.html`:

```html
<div class="maze-stub">
  <h1>Maze</h1>
  <p>Coming in Phase 7: Dungeon Navigation and Combat System</p>
  <p>Press ESC to return to Camp</p>
</div>
```

**Step 3: Create maze styles**

Create `src/app/maze/maze.component.scss`:

```scss
.maze-stub {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 1rem;

  h1 {
    font-size: 2rem;
  }

  p {
    font-size: 1.2rem;
    color: #666;
  }
}
```

**Step 4: Add route to app.routes.ts**

Modify `src/app/app.routes.ts` and add the maze route:

```typescript
import { MazeComponent } from './maze/maze.component';

export const routes: Routes = [
  // ... existing routes ...
  {
    path: 'maze',
    component: MazeComponent
  },
  // ... rest of routes ...
];
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/maze/
git add src/app/app.routes.ts
git commit -m "feat: add maze stub scene for Phase 7"
```

---

## Task 4: Create CampComponent Structure

**Files:**
- Create: `src/app/camp/camp.component.ts`
- Create: `src/app/camp/camp.component.html`
- Create: `src/app/camp/camp.component.scss`
- Create: `src/app/camp/__tests__/camp.component.spec.ts`

**Step 1: Write failing component test**

Create `src/app/camp/__tests__/camp.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampComponent } from '../camp.component';
import { GameStateService } from '../../../services/GameStateService';
import { SaveService } from '../../../services/SaveService';
import { Router } from '@angular/router';

describe('CampComponent', () => {
  let component: CampComponent;
  let fixture: ComponentFixture<CampComponent>;
  let mockGameStateService: jest.Mocked<GameStateService>;
  let mockSaveService: jest.Mocked<SaveService>;
  let mockRouter: jest.Mocked<Router>;

  beforeEach(async () => {
    mockGameStateService = {
      state: jest.fn(),
      party: jest.fn(),
      updateState: jest.fn()
    } as any;

    mockSaveService = {
      saveGame: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockRouter = {
      navigate: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [CampComponent],
      providers: [
        { provide: GameStateService, useValue: mockGameStateService },
        { provide: SaveService, useValue: mockSaveService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CampComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- camp.component`
Expected: FAIL with "Cannot find module '../camp.component'"

**Step 3: Create minimal CampComponent**

Create `src/app/camp/camp.component.ts`:

```typescript
import { Component, OnInit, computed, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameStateService } from '../../services/GameStateService';
import { SaveService } from '../../services/SaveService';
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { CharacterCardComponent } from '../../components/character-card/character-card.component';
import { SceneType } from '../../types/Scene';
import { Character } from '../../types/Character';
import { CharacterAction, CharacterActionEvent } from '../../components/character-card/character-card.component';
import { MenuItem } from '../../components/scene-footer/scene-footer.component';

@Component({
  selector: 'app-camp',
  standalone: true,
  imports: [
    CommonModule,
    SceneTitleComponent,
    SceneFooterComponent,
    CharacterCardComponent
  ],
  templateUrl: './camp.component.html',
  styleUrls: ['./camp.component.scss']
})
export class CampComponent implements OnInit {
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly gameState: GameStateService,
    private readonly saveService: SaveService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Update scene
    this.gameState.updateState(state => ({
      ...state,
      currentScene: SceneType.CAMP
    }));

    // Auto-save on entry
    this.saveService.saveGame(this.gameState.state(), 1);
  }

  @HostListener('window:keydown.escape')
  handleEscape(): void {
    this.returnToCastle();
  }

  returnToCastle(): void {
    this.router.navigate(['/castle-menu']);
  }
}
```

**Step 4: Create minimal template**

Create `src/app/camp/camp.component.html`:

```html
<div class="camp-container">
  <app-scene-title title="CAMP" />
  <p>Camp scene placeholder</p>
</div>
```

**Step 5: Create minimal styles**

Create `src/app/camp/camp.component.scss`:

```scss
.camp-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
```

**Step 6: Run test to verify it passes**

Run: `npm test -- camp.component`
Expected: PASS - component should create

**Step 7: Add route to app.routes.ts**

Modify `src/app/app.routes.ts` and add the camp route:

```typescript
import { CampComponent } from './camp/camp.component';

export const routes: Routes = [
  // ... existing routes ...
  {
    path: 'camp',
    component: CampComponent
  },
  // ... rest of routes ...
];
```

**Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 9: Commit**

```bash
git add src/app/camp/
git add src/app/app.routes.ts
git commit -m "feat: create camp component structure with auto-save"
```

---

## Task 5: Add Party Display with Computed Signals

**Files:**
- Modify: `src/app/camp/camp.component.ts`
- Modify: `src/app/camp/camp.component.html`
- Modify: `src/app/camp/__tests__/camp.component.spec.ts`

**Step 1: Write failing test for party display**

Add to `src/app/camp/__tests__/camp.component.spec.ts`:

```typescript
import { signal } from '@angular/core';
import { CharacterStatus } from '../../../types/Character';

describe('CampComponent', () => {
  // ... existing setup ...

  describe('party display', () => {
    it('should compute party characters from game state', () => {
      const mockState = {
        party: {
          members: ['char1', 'char2'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: ['char2'] }
        },
        roster: new Map([
          ['char1', { id: 'char1', name: 'Fighter', class: 'FIGHTER', level: 1, status: CharacterStatus.OK } as Character],
          ['char2', { id: 'char2', name: 'Mage', class: 'MAGE', level: 1, status: CharacterStatus.OK } as Character]
        ])
      };

      mockGameStateService.state.mockReturnValue(mockState);
      mockGameStateService.party.mockReturnValue(signal(mockState.party));

      fixture.detectChanges();

      const chars = component.partyCharacters();
      expect(chars).toHaveLength(2);
      expect(chars[0].name).toBe('Fighter');
      expect(chars[1].name).toBe('Mage');
    });

    it('should return empty array when no party members', () => {
      const mockState = {
        party: { members: [], gold: 0, formation: { frontRow: [], backRow: [] } },
        roster: new Map()
      };

      mockGameStateService.state.mockReturnValue(mockState);
      mockGameStateService.party.mockReturnValue(signal(mockState.party));

      fixture.detectChanges();

      expect(component.partyCharacters()).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- camp.component`
Expected: FAIL with "component.partyCharacters is not a function"

**Step 3: Implement computed signals**

Modify `src/app/camp/camp.component.ts` and add after the errorMessage signal:

```typescript
readonly currentParty = computed(() => this.gameState.party());

readonly partyCharacters = computed(() => {
  const party = this.currentParty();
  const state = this.gameState.state();
  return party.members
    .map(id => state.roster.get(id))
    .filter((char): char is Character => char !== undefined);
});
```

**Step 4: Run test to verify it passes**

Run: `npm test -- camp.component`
Expected: PASS

**Step 5: Update template to display party**

Modify `src/app/camp/camp.component.html`:

```html
<div class="camp-container">
  <app-scene-title title="CAMP" />

  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }

  <section class="party-section">
    <h2>PARTY</h2>
    <div class="party-members">
      @for (char of partyCharacters(); track char.id) {
        <app-character-card
          [character]="char"
          [visibleFields]="['class', 'level', 'hp', 'ac']"
          [actions]="[]"
          variant="default">
        </app-character-card>
      }
      @empty {
        <p class="no-party">No party members</p>
      }
    </div>
  </section>
</div>
```

**Step 6: Update styles**

Modify `src/app/camp/camp.component.scss`:

```scss
.camp-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  gap: 1rem;
  padding: 1rem;
}

.error-message {
  background-color: #f44336;
  color: white;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
}

.party-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  h2 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }
}

.party-members {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  overflow-y: auto;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.no-party {
  font-style: italic;
  color: #666;
  text-align: center;
  padding: 2rem;
  border: 2px dashed #ccc;
  border-radius: 4px;
}
```

**Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add src/app/camp/
git commit -m "feat: add party roster display to camp"
```

---

## Task 6: Add Character Actions (Inspect, Cast)

**Files:**
- Modify: `src/app/camp/camp.component.ts`
- Modify: `src/app/camp/camp.component.html`
- Modify: `src/app/camp/__tests__/camp.component.spec.ts`

**Step 1: Write failing tests for character actions**

Add to `src/app/camp/__tests__/camp.component.spec.ts`:

```typescript
describe('CampComponent', () => {
  // ... existing setup ...

  describe('character actions', () => {
    it('should provide inspect action for all characters', () => {
      const char = {
        id: 'char1',
        name: 'Fighter',
        class: 'FIGHTER',
        level: 1,
        status: CharacterStatus.OK
      } as Character;

      const actions = component.getActionsForCharacter(char);

      expect(actions).toContainEqual({ type: 'inspect', enabled: true });
    });

    it('should provide cast action only for spellcasters', () => {
      const mage = { id: 'mage1', class: 'MAGE' } as Character;
      const fighter = { id: 'fighter1', class: 'FIGHTER' } as Character;

      expect(component.getActionsForCharacter(mage)).toContainEqual(
        expect.objectContaining({ type: 'cast', enabled: true })
      );
      expect(component.getActionsForCharacter(fighter)).not.toContainEqual(
        expect.objectContaining({ type: 'cast' })
      );
    });

    it('should navigate to character inspection on inspect action', () => {
      component.handleActionClick({ characterId: 'char1', actionType: 'inspect' });

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/character-inspection'],
        { queryParams: { characterId: 'char1', returnTo: 'camp' } }
      );
    });

    it('should navigate to spell casting on cast action', () => {
      component.handleActionClick({ characterId: 'char1', actionType: 'cast' });

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/spell-casting'],
        { queryParams: { characterId: 'char1', returnTo: 'camp' } }
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- camp.component`
Expected: FAIL with "component.getActionsForCharacter is not a function"

**Step 3: Implement character action methods**

Modify `src/app/camp/camp.component.ts` and add these methods:

```typescript
getActionsForCharacter(character: Character): CharacterAction[] {
  const canCast = this.isSpellCaster(character);

  return [
    { type: 'inspect', enabled: true },
    ...(canCast ? [{ type: 'cast', enabled: true }] : [])
  ];
}

isSpellCaster(character: Character): boolean {
  return ['MAGE', 'PRIEST', 'BISHOP', 'SAMURAI', 'LORD'].includes(character.class);
}

handleActionClick(event: CharacterActionEvent): void {
  switch (event.actionType) {
    case 'inspect':
      this.onInspectCharacter(event.characterId);
      break;
    case 'cast':
      this.onCastSpell(event.characterId);
      break;
  }
}

onInspectCharacter(characterId: string): void {
  this.router.navigate(['/character-inspection'], {
    queryParams: { characterId, returnTo: 'camp' }
  });
}

onCastSpell(characterId: string): void {
  this.router.navigate(['/spell-casting'], {
    queryParams: { characterId, returnTo: 'camp' }
  });
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- camp.component`
Expected: PASS

**Step 5: Update template with action handler**

Modify `src/app/camp/camp.component.html` and update the character card:

```html
<app-character-card
  [character]="char"
  [visibleFields]="['class', 'level', 'hp', 'ac']"
  [actions]="getActionsForCharacter(char)"
  variant="default"
  (actionClick)="handleActionClick($event)">
</app-character-card>
```

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/camp/
git commit -m "feat: add inspect and cast actions to camp characters"
```

---

## Task 7: Add Move Up/Down Actions

**Files:**
- Modify: `src/app/camp/camp.component.ts`
- Modify: `src/app/camp/__tests__/camp.component.spec.ts`

**Step 1: Write failing tests for move actions**

Add to `src/app/camp/__tests__/camp.component.spec.ts`:

```typescript
import { moveCharacterUp, moveCharacterDown } from '../../../services/PartyService';

// Mock the PartyService functions
jest.mock('../../../services/PartyService', () => ({
  moveCharacterUp: jest.fn(),
  moveCharacterDown: jest.fn()
}));

describe('CampComponent', () => {
  // ... existing setup ...

  describe('move actions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should provide move up action for characters not at position 0', () => {
      const mockState = {
        party: {
          members: ['char1', 'char2', 'char3'],
          gold: 100,
          formation: { frontRow: ['char1', 'char2'], backRow: ['char3'] }
        },
        roster: new Map([
          ['char1', { id: 'char1', name: 'Fighter', class: 'FIGHTER' } as Character],
          ['char2', { id: 'char2', name: 'Mage', class: 'MAGE' } as Character],
          ['char3', { id: 'char3', name: 'Priest', class: 'PRIEST' } as Character]
        ])
      };

      mockGameStateService.state.mockReturnValue(mockState);
      mockGameStateService.party.mockReturnValue(signal(mockState.party));
      fixture.detectChanges();

      const char2 = mockState.roster.get('char2')!;
      const actions = component.getActionsForCharacter(char2);

      expect(actions).toContainEqual(
        expect.objectContaining({ type: 'moveUp', enabled: true })
      );
    });

    it('should disable move up for first character', () => {
      const mockState = {
        party: {
          members: ['char1'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: [] }
        },
        roster: new Map([
          ['char1', { id: 'char1', name: 'Fighter', class: 'FIGHTER' } as Character]
        ])
      };

      mockGameStateService.state.mockReturnValue(mockState);
      mockGameStateService.party.mockReturnValue(signal(mockState.party));
      fixture.detectChanges();

      const char1 = mockState.roster.get('char1')!;
      const actions = component.getActionsForCharacter(char1);

      expect(actions).toContainEqual(
        expect.objectContaining({ type: 'moveUp', enabled: false })
      );
    });

    it('should call moveCharacterUp on move up action', () => {
      const mockState = {
        party: { members: ['char1', 'char2'], gold: 100, formation: { frontRow: ['char1', 'char2'], backRow: [] } },
        roster: new Map()
      };
      const newState = { ...mockState, party: { ...mockState.party, members: ['char2', 'char1'] } };

      mockGameStateService.state.mockReturnValue(mockState);
      (moveCharacterUp as jest.Mock).mockReturnValue(newState);

      component.handleActionClick({ characterId: 'char2', actionType: 'moveUp' });

      expect(moveCharacterUp).toHaveBeenCalledWith(mockState, 'char2');
      expect(mockGameStateService.updateState).toHaveBeenCalled();
    });

    it('should call moveCharacterDown on move down action', () => {
      const mockState = {
        party: { members: ['char1', 'char2'], gold: 100, formation: { frontRow: ['char1', 'char2'], backRow: [] } },
        roster: new Map()
      };
      const newState = { ...mockState, party: { ...mockState.party, members: ['char2', 'char1'] } };

      mockGameStateService.state.mockReturnValue(mockState);
      (moveCharacterDown as jest.Mock).mockReturnValue(newState);

      component.handleActionClick({ characterId: 'char1', actionType: 'moveDown' });

      expect(moveCharacterDown).toHaveBeenCalledWith(mockState, 'char1');
      expect(mockGameStateService.updateState).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- camp.component`
Expected: FAIL - move actions not implemented

**Step 3: Implement move action methods**

Modify `src/app/camp/camp.component.ts`:

Add import at top:
```typescript
import { moveCharacterUp, moveCharacterDown } from '../../services/PartyService';
```

Update `getActionsForCharacter` method:
```typescript
getActionsForCharacter(character: Character): CharacterAction[] {
  const party = this.currentParty();
  const position = party.members.indexOf(character.id);
  const canMoveUp = position > 0;
  const canMoveDown = position < party.members.length - 1;
  const canCast = this.isSpellCaster(character);

  return [
    { type: 'inspect', enabled: true },
    ...(canCast ? [{ type: 'cast', enabled: true }] : []),
    { type: 'moveUp', enabled: canMoveUp },
    { type: 'moveDown', enabled: canMoveDown }
  ];
}
```

Update `handleActionClick` method to add move cases:
```typescript
handleActionClick(event: CharacterActionEvent): void {
  switch (event.actionType) {
    case 'inspect':
      this.onInspectCharacter(event.characterId);
      break;
    case 'cast':
      this.onCastSpell(event.characterId);
      break;
    case 'moveUp':
      this.onMoveUp(event.characterId);
      break;
    case 'moveDown':
      this.onMoveDown(event.characterId);
      break;
  }
}
```

Add move methods:
```typescript
onMoveUp(characterId: string): void {
  const newState = moveCharacterUp(this.gameState.state(), characterId);
  this.gameState.updateState(() => newState);
}

onMoveDown(characterId: string): void {
  const newState = moveCharacterDown(this.gameState.state(), characterId);
  this.gameState.updateState(() => newState);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- camp.component`
Expected: PASS

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/camp/
git commit -m "feat: add move up/down actions for party reordering"
```

---

## Task 8: Add Footer Menu with Maze Entry Validation

**Files:**
- Modify: `src/app/camp/camp.component.ts`
- Modify: `src/app/camp/camp.component.html`
- Modify: `src/app/camp/__tests__/camp.component.spec.ts`

**Step 1: Write failing tests for footer menu**

Add to `src/app/camp/__tests__/camp.component.spec.ts`:

```typescript
describe('CampComponent', () => {
  // ... existing setup ...

  describe('footer menu', () => {
    it('should enable maze entry when all party members are OK or WOUNDED', () => {
      const mockState = {
        party: {
          members: ['char1', 'char2'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: ['char2'] }
        },
        roster: new Map([
          ['char1', { id: 'char1', status: CharacterStatus.OK } as Character],
          ['char2', { id: 'char2', status: CharacterStatus.WOUNDED } as Character]
        ])
      };

      mockGameStateService.state.mockReturnValue(mockState);
      mockGameStateService.party.mockReturnValue(signal(mockState.party));
      fixture.detectChanges();

      expect(component.canEnterMaze()).toBe(true);

      const menuItems = component.footerMenuItems();
      const mazeItem = menuItems.find(item => item.id === 'maze');
      expect(mazeItem?.enabled).toBe(true);
    });

    it('should disable maze entry when party member is DEAD', () => {
      const mockState = {
        party: {
          members: ['char1', 'char2'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: ['char2'] }
        },
        roster: new Map([
          ['char1', { id: 'char1', status: CharacterStatus.OK } as Character],
          ['char2', { id: 'char2', status: CharacterStatus.DEAD } as Character]
        ])
      };

      mockGameStateService.state.mockReturnValue(mockState);
      mockGameStateService.party.mockReturnValue(signal(mockState.party));
      fixture.detectChanges();

      expect(component.canEnterMaze()).toBe(false);

      const menuItems = component.footerMenuItems();
      const mazeItem = menuItems.find(item => item.id === 'maze');
      expect(mazeItem?.enabled).toBe(false);
    });

    it('should disable maze entry when no party members', () => {
      const mockState = {
        party: { members: [], gold: 0, formation: { frontRow: [], backRow: [] } },
        roster: new Map()
      };

      mockGameStateService.state.mockReturnValue(mockState);
      mockGameStateService.party.mockReturnValue(signal(mockState.party));
      fixture.detectChanges();

      expect(component.canEnterMaze()).toBe(false);
    });

    it('should navigate to maze when entering maze with valid party', () => {
      const mockState = {
        party: {
          members: ['char1'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: [] }
        },
        roster: new Map([
          ['char1', { id: 'char1', status: CharacterStatus.OK } as Character]
        ])
      };

      mockGameStateService.state.mockReturnValue(mockState);
      mockGameStateService.party.mockReturnValue(signal(mockState.party));
      fixture.detectChanges();

      component.enterMaze();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/maze']);
      expect(component.errorMessage()).toBeNull();
    });

    it('should show error when entering maze with dead party member', () => {
      const mockState = {
        party: {
          members: ['char1'],
          gold: 100,
          formation: { frontRow: ['char1'], backRow: [] }
        },
        roster: new Map([
          ['char1', { id: 'char1', status: CharacterStatus.DEAD } as Character]
        ])
      };

      mockGameStateService.state.mockReturnValue(mockState);
      mockGameStateService.party.mockReturnValue(signal(mockState.party));
      fixture.detectChanges();

      component.enterMaze();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(component.errorMessage()).toBe('Some party members are dead - visit Temple first');
    });

    it('should navigate to castle on castle menu action', () => {
      component.handleFooterAction('castle');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/castle-menu']);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- camp.component`
Expected: FAIL - validation methods not implemented

**Step 3: Implement maze entry validation**

Modify `src/app/camp/camp.component.ts`:

Add import at top:
```typescript
import { CharacterStatus } from '../../types/Character';
```

Add computed signals after partyCharacters:
```typescript
readonly canEnterMaze = computed(() => {
  const party = this.currentParty();
  const state = this.gameState.state();

  if (party.members.length === 0) return false;

  return party.members.every(memberId => {
    const char = state.roster.get(memberId);
    return char?.status === CharacterStatus.OK ||
           char?.status === CharacterStatus.WOUNDED;
  });
});

readonly footerMenuItems = computed((): MenuItem[] => {
  const canEnter = this.canEnterMaze();
  return [
    {
      id: 'maze',
      label: 'Enter Maze',
      shortcut: 'M',
      enabled: canEnter
    },
    {
      id: 'castle',
      label: 'Return to Castle',
      shortcut: 'ESC',
      enabled: true
    }
  ];
});
```

Add footer action handler:
```typescript
handleFooterAction(itemId: string): void {
  switch(itemId) {
    case 'maze':
      this.enterMaze();
      break;
    case 'castle':
      this.returnToCastle();
      break;
  }
}

enterMaze(): void {
  if (!this.canEnterMaze()) {
    this.errorMessage.set('Some party members are dead - visit Temple first');
    setTimeout(() => this.errorMessage.set(null), 3000);
    return;
  }
  this.router.navigate(['/maze']);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- camp.component`
Expected: PASS

**Step 5: Update template with footer**

Modify `src/app/camp/camp.component.html` and add footer at the end:

```html
<div class="camp-container">
  <app-scene-title title="CAMP" />

  @if (errorMessage()) {
    <div class="error-message">{{ errorMessage() }}</div>
  }

  <section class="party-section">
    <h2>PARTY</h2>
    <div class="party-members">
      @for (char of partyCharacters(); track char.id) {
        <app-character-card
          [character]="char"
          [visibleFields]="['class', 'level', 'hp', 'ac']"
          [actions]="getActionsForCharacter(char)"
          variant="default"
          (actionClick)="handleActionClick($event)">
        </app-character-card>
      }
      @empty {
        <p class="no-party">No party members</p>
      }
    </div>
  </section>

  <app-scene-footer
    [menuItems]="footerMenuItems()"
    (itemSelected)="handleFooterAction($event)" />
</div>
```

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/camp/
git commit -m "feat: add footer menu with maze entry validation"
```

---

## Task 9: Add Integration Test

**Files:**
- Create: `src/app/camp/__tests__/camp.integration.spec.ts`

**Step 1: Write integration test**

Create `src/app/camp/__tests__/camp.integration.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CampComponent } from '../camp.component';
import { GameStateService } from '../../../services/GameStateService';
import { SaveService } from '../../../services/SaveService';
import { CharacterStatus } from '../../../types/Character';
import { Character } from '../../../types/Character';

describe('CampComponent Integration', () => {
  let component: CampComponent;
  let fixture: ComponentFixture<CampComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CampComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);

    jest.spyOn(router, 'navigate').mockImplementation(() => Promise.resolve(true));
  });

  it('should complete full inspection flow: Camp → Character Inspection → Camp', async () => {
    const gameState = TestBed.inject(GameStateService);
    const char1: Character = {
      id: 'char1',
      name: 'Fighter',
      class: 'FIGHTER',
      race: 'HUMAN',
      alignment: 'GOOD',
      level: 1,
      experience: 0,
      strength: 15,
      intelligence: 10,
      piety: 10,
      vitality: 14,
      agility: 12,
      luck: 10,
      hp: 20,
      maxHp: 20,
      armorClass: 5,
      status: CharacterStatus.OK,
      gold: 100,
      inventory: [],
      knownSpells: [],
      spellPoints: {}
    };

    // Set up game state
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['char1'],
        gold: 100,
        formation: { frontRow: ['char1'], backRow: [] }
      },
      roster: new Map([['char1', char1]])
    }));

    fixture.detectChanges();

    // Verify party displays
    expect(component.partyCharacters()).toHaveLength(1);
    expect(component.partyCharacters()[0].name).toBe('Fighter');

    // Click inspect action
    component.handleActionClick({ characterId: 'char1', actionType: 'inspect' });

    // Verify navigation to character inspection with return route
    expect(router.navigate).toHaveBeenCalledWith(
      ['/character-inspection'],
      { queryParams: { characterId: 'char1', returnTo: 'camp' } }
    );
  });

  it('should complete full cast flow: Camp → Spell Casting → Camp', async () => {
    const gameState = TestBed.inject(GameStateService);
    const mage: Character = {
      id: 'mage1',
      name: 'Gandalf',
      class: 'MAGE',
      race: 'HUMAN',
      alignment: 'GOOD',
      level: 3,
      experience: 1000,
      strength: 10,
      intelligence: 18,
      piety: 10,
      vitality: 10,
      agility: 12,
      luck: 10,
      hp: 15,
      maxHp: 15,
      armorClass: 8,
      status: CharacterStatus.OK,
      gold: 50,
      inventory: [],
      knownSpells: ['DUMAPIC'],
      spellPoints: { 1: 3 }
    };

    // Set up game state
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['mage1'],
        gold: 100,
        formation: { frontRow: [], backRow: ['mage1'] }
      },
      roster: new Map([['mage1', mage]])
    }));

    fixture.detectChanges();

    // Verify mage has cast action
    const actions = component.getActionsForCharacter(mage);
    expect(actions).toContainEqual(expect.objectContaining({ type: 'cast', enabled: true }));

    // Click cast action
    component.handleActionClick({ characterId: 'mage1', actionType: 'cast' });

    // Verify navigation to spell casting with return route
    expect(router.navigate).toHaveBeenCalledWith(
      ['/spell-casting'],
      { queryParams: { characterId: 'mage1', returnTo: 'camp' } }
    );
  });

  it('should block maze entry with dead party member', async () => {
    const gameState = TestBed.inject(GameStateService);
    const deadChar: Character = {
      id: 'dead1',
      name: 'Deceased',
      class: 'FIGHTER',
      race: 'HUMAN',
      alignment: 'GOOD',
      level: 1,
      experience: 0,
      strength: 15,
      intelligence: 10,
      piety: 10,
      vitality: 14,
      agility: 12,
      luck: 10,
      hp: 0,
      maxHp: 20,
      armorClass: 5,
      status: CharacterStatus.DEAD,
      gold: 0,
      inventory: [],
      knownSpells: [],
      spellPoints: {}
    };

    // Set up game state with dead character
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['dead1'],
        gold: 100,
        formation: { frontRow: ['dead1'], backRow: [] }
      },
      roster: new Map([['dead1', deadChar]])
    }));

    fixture.detectChanges();

    // Verify maze entry is disabled
    expect(component.canEnterMaze()).toBe(false);

    const menuItems = component.footerMenuItems();
    const mazeItem = menuItems.find(item => item.id === 'maze');
    expect(mazeItem?.enabled).toBe(false);

    // Try to enter maze
    component.enterMaze();

    // Verify error shown and no navigation
    expect(component.errorMessage()).toBe('Some party members are dead - visit Temple first');
    expect(router.navigate).not.toHaveBeenCalledWith(['/maze']);
  });

  it('should allow maze entry with valid party', async () => {
    const gameState = TestBed.inject(GameStateService);
    const char1: Character = {
      id: 'char1',
      name: 'Fighter',
      class: 'FIGHTER',
      race: 'HUMAN',
      alignment: 'GOOD',
      level: 1,
      experience: 0,
      strength: 15,
      intelligence: 10,
      piety: 10,
      vitality: 14,
      agility: 12,
      luck: 10,
      hp: 20,
      maxHp: 20,
      armorClass: 5,
      status: CharacterStatus.OK,
      gold: 100,
      inventory: [],
      knownSpells: [],
      spellPoints: {}
    };

    // Set up game state
    gameState.updateState(state => ({
      ...state,
      party: {
        members: ['char1'],
        gold: 100,
        formation: { frontRow: ['char1'], backRow: [] }
      },
      roster: new Map([['char1', char1]])
    }));

    fixture.detectChanges();

    // Verify maze entry is enabled
    expect(component.canEnterMaze()).toBe(true);

    // Enter maze
    component.enterMaze();

    // Verify navigation
    expect(router.navigate).toHaveBeenCalledWith(['/maze']);
    expect(component.errorMessage()).toBeNull();
  });
});
```

**Step 2: Run integration test**

Run: `npm test -- camp.integration`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/camp/__tests__/camp.integration.spec.ts
git commit -m "test: add camp component integration tests"
```

---

## Task 10: Update Castle Menu to Navigate to Camp

**Files:**
- Modify: `src/app/castle-menu/castle-menu.component.ts`
- Modify: `src/app/castle-menu/__tests__/castle-menu.component.spec.ts`

**Step 1: Write failing test for camp navigation**

Add to `src/app/castle-menu/__tests__/castle-menu.component.spec.ts`:

```typescript
describe('CastleMenuComponent', () => {
  // ... existing tests ...

  it('should save game and navigate to camp when maze menu item clicked', async () => {
    const mockState = {
      party: { members: ['char1'], gold: 100, formation: { frontRow: ['char1'], backRow: [] } },
      roster: new Map([
        ['char1', { id: 'char1', name: 'Fighter', class: 'FIGHTER', status: CharacterStatus.OK } as Character]
      ])
    };

    mockGameStateService.state.mockReturnValue(mockState);
    mockGameStateService.party.mockReturnValue(signal(mockState.party));
    mockSaveService.saveGame.mockResolvedValue(undefined);

    fixture.detectChanges();

    await component.navigateToMaze();

    expect(mockSaveService.saveGame).toHaveBeenCalledWith(mockState, 1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/camp']);
  });
});
```

**Step 2: Run test to verify current behavior**

Run: `npm test -- castle-menu.component`
Expected: Check if test already passes or needs update

**Step 3: Update navigateToMaze to go to /camp instead of /maze**

Modify `src/app/castle-menu/castle-menu.component.ts`:

Find the `navigateToMaze` method and update the navigation line:

```typescript
async navigateToMaze(): Promise<void> {
  const party = this.currentParty();
  if (!party || party.members.length === 0) {
    console.warn('Cannot enter maze without party members');
    return;
  }
  // Trigger auto-save before entering dungeon
  await this.saveService.saveGame(this.gameState.state(), 1);
  // Navigate to Camp (pre-dungeon staging area)
  this.router.navigate(['/camp']);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- castle-menu.component`
Expected: PASS

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/castle-menu/
git commit -m "feat: castle menu now navigates to camp instead of maze"
```

---

## Task 11: Run Full Test Suite

**Files:**
- N/A (verification task)

**Step 1: Run all tests**

Run: `npm test`
Expected: All tests PASS (including new camp tests)

**Step 2: Check for test failures**

If any tests fail, fix them before proceeding.

**Step 3: Run with coverage**

Run: `npm test -- --coverage`
Expected: Camp component should have >80% coverage

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Check test performance**

Verify test suite runs in <5 seconds (acceptable for this phase)

---

## Task 12: Manual Verification

**Files:**
- N/A (manual testing task)

**Step 1: Start development server**

Run: `npm start`

**Step 2: Navigate through flow**

1. Open browser to http://localhost:4200
2. Navigate to Castle Menu
3. Click "Maze" (should go to Camp)
4. Verify party roster displays
5. Click "Inspect" on a character
6. Verify navigates to Character Inspection with returnTo=camp
7. Click back to return to Camp
8. If party has a mage/priest, click "Cast"
9. Verify navigates to Spell Casting stub
10. Click back to return to Camp
11. Try "Move Up" and "Move Down" buttons
12. Verify party reorders
13. Click "Enter Maze"
14. Verify navigates to Maze stub
15. Press ESC in Maze to return to Camp
16. Press ESC in Camp to return to Castle

**Step 3: Test validation**

1. In Castle Menu, use browser dev tools to manually set a character status to DEAD
2. Navigate to Camp
3. Verify "Enter Maze" is disabled
4. Try clicking it (should show error message)
5. Verify error message displays and auto-clears after 3 seconds

**Step 4: Document any issues**

If any bugs found, create issue tickets or fix immediately.

---

## Task 13: Final Commit and Cleanup

**Files:**
- N/A (cleanup task)

**Step 1: Run final test suite**

Run: `npm test`
Expected: All tests PASS

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Review all changes**

Run: `git status`
Review all modified and new files.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete camp scene implementation

- Add CAMP scene type
- Create spell casting and maze stub scenes
- Implement camp component with party display
- Add character actions: inspect, cast, move up/down
- Add footer menu with maze entry validation
- Block maze entry if party has dead members
- Auto-save on camp entry
- Full test coverage with integration tests
- Update castle menu to navigate to camp"
```

**Step 5: Push to remote (if ready)**

```bash
git push origin camp-scene-implementation
```

---

## Success Criteria

- ✅ Camp component renders party roster with character cards
- ✅ Character actions work (inspect, cast for spellcasters, move up/down)
- ✅ Party reordering works via move actions
- ✅ Maze entry validates party state (blocks dead members)
- ✅ Footer menu works (M enters maze if valid, ESC returns to castle)
- ✅ Auto-save triggers on camp entry
- ✅ Navigation flows work: Castle → Camp → Character Inspection → Camp
- ✅ Navigation flows work: Camp → Spell Casting → Camp
- ✅ Navigation flows work: Camp → Maze → Camp
- ✅ All tests pass with >80% coverage
- ✅ TypeScript compiles with no errors
- ✅ Manual testing confirms all features work

---

## Out of Scope (Deferred to Phase 7)

- Dungeon position tracking and initialization
- Spell casting scene full implementation
- Maze scene full implementation (3D rendering, movement)
- Character Inspection equipment management
- Combat system integration
- Encounter system
- Treasure and trap handling

---

## Notes

- This implementation focuses on Camp as a minimal staging area
- Stub scenes (Spell Casting, Maze) are placeholders for Phase 7
- All patterns follow existing architecture (Castle Menu, Tavern)
- TDD approach: tests written first, then implementation
- Frequent commits after each task completion
- DRY: Reuse existing components (SceneTitle, SceneFooter, CharacterCard)
- YAGNI: No extra features beyond core requirements
