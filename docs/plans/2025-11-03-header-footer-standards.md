# Header/Footer Standards Documentation & Tavern Scene Fix

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document standard header/footer patterns for all scenes and add missing header/footer to Tavern scene.

**Architecture:** Update scene-template.md to enforce header/footer on all scenes. Tavern gets SceneTitleComponent (with party gold) and SceneFooterComponent (horizontal interactive menu). Party gold system documented as shared pool only.

**Tech Stack:** Angular 19, TypeScript, Markdown documentation

---

## Task 1: Update scene-template.md with Header Standards

**Files:**
- Modify: `docs/ui/scene-template.md` (add after "UI Layout" section)

**Step 1: Add Header Components section**

Add after the "Screen Regions" subsection in "UI Layout":

```markdown
### Header Components

**Purpose:** Provide consistent scene identification and context across all game screens.

**Standard Header Layout:**

Minimal (title only):
```
┌─────────────────────────────────────────┐
│  SCENE TITLE                            │
└─────────────────────────────────────────┘
```

With metadata (title + party gold):
```
┌─────────────────────────────────────────┐
│  SCENE TITLE        PARTY GOLD: 150 GP  │
└─────────────────────────────────────────┘
```

With location context (dungeon scenes):
```
┌─────────────────────────────────────────┐
│  MAZE LEVEL 1            N              │
│  (5,8)                   Facing North   │
└─────────────────────────────────────────┘
```

**Three Variants:**

1. **Minimal Header** - Title only
   - Use for: Castle Menu, Edge of Town, Title Screen
   - Component: `<app-scene-title title="CASTLE" />`

2. **Header with Metadata** - Title + party gold
   - Use for: Tavern, Shop, Temple, Inn (any scene with commerce/services)
   - Component: `<app-scene-title title="GILGAMESH'S TAVERN" [showPartyGold]="true" />`
   - Party gold appears right-aligned
   - Format: "PARTY GOLD: X GP"

3. **Header with Location Context** - Title + position + facing
   - Use for: Maze, Camp, Combat
   - Shows dungeon level, coordinates, facing direction
   - Updates in real-time as party moves

**Implementation:**

All scenes MUST use `SceneTitleComponent` - no hardcoded headers in templates.

Import in component:
```typescript
import { SceneTitleComponent } from '../../components/scene-title/scene-title.component';

@Component({
  // ...
  imports: [CommonModule, SceneTitleComponent, /* other imports */]
})
```

Template usage:
```html
<app-scene-title
  title="SCENE NAME"
  [showPartyGold]="true"  <!-- Optional: for commerce scenes -->
/>
```

**Party Gold Display:**

The party gold system uses a **shared gold pool** for all party members. There is no individual character gold or "divvy gold" functionality. Gold transactions affect the party total directly.

Show party gold in header for:
- Tavern (party formation, adding/removing characters)
- Shop (buying/selling equipment)
- Temple (healing, resurrection services with cost)
- Inn (room rental costs)
```

**Step 2: Commit template header documentation**

```bash
git add docs/ui/scene-template.md
git commit -m "docs: add header standards to scene template"
```

---

## Task 2: Update scene-template.md with Footer Standards

**Files:**
- Modify: `docs/ui/scene-template.md` (add after "Header Components" section)

**Step 1: Add Footer Components section**

Add after the "Header Components" section:

```markdown
### Footer Components

**Purpose:** Provide consistent horizontal interactive menu with contextual actions across all screens.

**Standard Footer Layout:**

Minimal (single action):
```
┌─────────────────────────────────────────┐
│  [Main Content]                         │
├─────────────────────────────────────────┤
│  ESC: Return to Castle                  │
└─────────────────────────────────────────┘
```

Multiple contextual actions:
```
┌─────────────────────────────────────────┐
│  [Main Content]                         │
├─────────────────────────────────────────┤
│  ESC: Leave  |  I: Inspect  |  ?: Help  │
└─────────────────────────────────────────┘
```

**Key Design Rules:**

1. **Horizontal layout** - All actions in single row, separated by ` | `
2. **ESC/back action first** (leftmost position)
3. **Interactive** - Items are selectable via shortcuts or mouse clicking
4. **Contextual** - Items change or enable/disable based on scene state
5. **Format**: `KEY: Action Label` (e.g., "D: Divvy Gold", "ESC: Leave")
6. **State-aware** - Disabled items shown dimmed or omitted entirely

**Implementation:**

All scenes MUST use `SceneFooterComponent` for horizontal interactive menu.

Import in component:
```typescript
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { MenuItem } from '../../components/menu/menu.component';

@Component({
  // ...
  imports: [CommonModule, SceneFooterComponent, /* other imports */]
})
```

Define menu items as computed signal:
```typescript
readonly footerMenuItems = computed((): MenuItem[] => [
  { id: 'leave', label: 'Return to Castle', shortcut: 'ESC', enabled: true },
  { id: 'action', label: 'Contextual Action', shortcut: 'KEY',
    enabled: this.canPerformAction() },
  { id: 'help', label: 'Help', shortcut: '?', enabled: true }
]);

handleFooterAction(itemId: string): void {
  switch(itemId) {
    case 'leave':
      this.navigateBack();
      break;
    case 'action':
      this.performAction();
      break;
    case 'help':
      this.showHelp();
      break;
  }
}
```

Template usage:
```html
<app-scene-footer
  [menuItems]="footerMenuItems()"
  (itemSelected)="handleFooterAction($event)"
/>
```

**Contextual Menu Design:**

- Return/Leave action typically uses 'L' or 'ESC' shortcut
- Scene-specific actions use intuitive letters (I for Inspect, ? for Help)
- Menu items can be conditionally enabled based on state
- Use computed signals for reactivity to state changes
```

**Step 2: Commit template footer documentation**

```bash
git add docs/ui/scene-template.md
git commit -m "docs: add footer standards to scene template"
```

---

## Task 3: Document Party Gold System

**Files:**
- Modify: `docs/services/PartyService.md` (add note to gold section)

**Step 1: Add party gold system clarification**

Find the "Gold Management" section in PartyService.md and add this note:

```markdown
**Party Gold System:**

The game uses a **shared gold pool** for all party members. Key points:

- Gold is stored at the party level (`party.gold`)
- All party members share the same gold amount
- There is NO individual character gold
- There is NO "divvy gold" or "split gold" functionality
- Gold transactions (shop purchases, temple services, inn costs) affect party total directly

This differs from the original Wizardry which allowed individual character gold. Our implementation simplifies gold management and prevents edge cases with character death/removal.
```

**Step 2: Commit party gold documentation**

```bash
git add docs/services/PartyService.md
git commit -m "docs: clarify party gold system (shared pool only)"
```

---

## Task 4: Add Header to Tavern Scene

**Files:**
- Modify: `src/app/tavern/tavern.component.ts` (add imports)
- Modify: `src/app/tavern/tavern.component.html` (add header at top)

**Step 1: Add SceneTitleComponent import**

In `src/app/tavern/tavern.component.ts`, add import at top:

```typescript
import { SceneTitleComponent } from '../components/scene-title/scene-title.component';
```

Then add to imports array in @Component decorator:

```typescript
@Component({
  selector: 'app-tavern',
  standalone: true,
  imports: [
    CommonModule,
    TavernCharacterCardComponent,
    SceneTitleComponent  // Add this line
  ],
  // ...
})
```

**Step 2: Add header to template**

In `src/app/tavern/tavern.component.html`, add at the very top (before existing content):

```html
<app-scene-title
  title="GILGAMESH'S TAVERN"
  [showPartyGold]="true"
/>
```

**Step 3: Run build to verify**

```bash
ng build --configuration production
```

Expected: Build succeeds with no errors

**Step 4: Commit header addition**

```bash
git add src/app/tavern/tavern.component.ts src/app/tavern/tavern.component.html
git commit -m "feat: add header with party gold to Tavern scene"
```

---

## Task 5: Add Footer to Tavern Scene

**Files:**
- Modify: `src/app/tavern/tavern.component.ts` (add imports, footer menu, handler)
- Modify: `src/app/tavern/tavern.component.html` (add footer at bottom)

**Step 1: Add SceneFooterComponent and MenuItem imports**

In `src/app/tavern/tavern.component.ts`, add imports:

```typescript
import { SceneFooterComponent } from '../../components/scene-footer/scene-footer.component';
import { MenuItem } from '../../components/menu/menu.component';
```

Add to imports array:

```typescript
imports: [
  CommonModule,
  TavernCharacterCardComponent,
  SceneTitleComponent,
  SceneFooterComponent  // Add this line
],
```

**Step 2: Add footer menu items computed signal**

In `TavernComponent` class, add:

```typescript
readonly footerMenuItems = computed((): MenuItem[] => [
  { id: 'leave', label: 'Return to Castle', shortcut: 'L', enabled: true }
]);
```

**Step 3: Add footer action handler**

In `TavernComponent` class, add method:

```typescript
handleFooterAction(itemId: string): void {
  switch(itemId) {
    case 'leave':
      this.sceneNavigationService.transitionTo(SceneType.CASTLE_MENU);
      break;
  }
}
```

**Step 4: Add footer to template**

In `src/app/tavern/tavern.component.html`, add at the very bottom (after existing content):

```html
<app-scene-footer
  [menuItems]="footerMenuItems()"
  (itemSelected)="handleFooterAction($event)"
/>
```

**Step 5: Run tests**

```bash
npm test -- tavern
```

Expected: All tavern tests pass (may need to update tests if they check DOM structure)

**Step 6: Build to verify compilation**

```bash
ng build --configuration production
```

Expected: Build succeeds

**Step 7: Commit footer addition**

```bash
git add src/app/tavern/tavern.component.ts src/app/tavern/tavern.component.html
git commit -m "feat: add footer navigation menu to Tavern scene"
```

---

## Task 6: Update Tavern Scene Documentation

**Files:**
- Modify: `docs/ui/scenes/03-gilgameshs-tavern.md` (update UI Layout section)

**Step 1: Update UI Layout section with header**

Find the "Screen Regions" section in `docs/ui/scenes/03-gilgameshs-tavern.md` and update the ASCII mockup to include header:

```markdown
### Screen Regions

```
┌─────────────────────────────────────────────────┐
│  GILGAMESH'S TAVERN        PARTY GOLD: 150 GP   │  ← Header
├─────────────────────────────────────────────────┤
│                                                 │
│  Available Characters         Active Party      │
│  ────────────────────         ──────────────    │
│  > Fred (THIEF)              Front Row:         │
│    Mary (MAGE)               1. Alice (FIGHTER) │
│    Bob (PRIEST)              2. Bob (PRIEST)    │
│                              3. Carol (MAGE)    │
│                              Back Row:          │
│                              4. Dave (THIEF)    │
│                              5. Eve (BISHOP)    │
│                              6. (empty)         │
│                                                 │
├─────────────────────────────────────────────────┤
│  L: Return to Castle                            │  ← Footer
└─────────────────────────────────────────────────┘
```
```

**Step 2: Add header and footer components to Implementation section**

Find or create "Implementation" section and add:

```markdown
**Header:**
- Uses `<app-scene-title>` with `title="GILGAMESH'S TAVERN"` and `[showPartyGold]="true"`
- Displays party's shared gold pool (not individual character gold)

**Footer:**
- Uses `<app-scene-footer>` with horizontal menu
- Single action: "L: Return to Castle"
- Future: Could add contextual actions (e.g., "I: Inspect" when character selected)
```

**Step 3: Commit documentation update**

```bash
git add docs/ui/scenes/03-gilgameshs-tavern.md
git commit -m "docs: update Tavern scene docs with header/footer"
```

---

## Task 7: Run Full Test Suite

**Files:**
- None (verification only)

**Step 1: Run all tests**

```bash
npm test
```

Expected: 786 tests passing (same as before)

**Step 2: Run production build**

```bash
ng build --configuration production
```

Expected: Build succeeds with no errors

**Step 3: Manual verification**

1. Start dev server: `npm start`
2. Navigate to Tavern scene
3. Verify header shows "GILGAMESH'S TAVERN" and party gold
4. Verify footer shows "L: Return to Castle"
5. Test footer action works (pressing L or clicking returns to Castle)

---

## Task 8: Final Commit and Cleanup

**Files:**
- All modified files

**Step 1: Verify all changes staged**

```bash
git status
```

Expected: All modified files should be committed from previous tasks

**Step 2: Create summary commit if needed**

If any files were missed:

```bash
git add -A
git commit -m "chore: finalize header/footer standards implementation"
```

**Step 3: Review commit history**

```bash
git log --oneline -10
```

Expected: Clean, descriptive commit messages for each logical change

---

## Success Criteria

- [x] scene-template.md documents header component standards (3 variants)
- [x] scene-template.md documents footer component standards (horizontal menu)
- [x] Party gold system documented as shared pool (no individual gold)
- [x] Tavern scene has header with party gold display
- [x] Tavern scene has footer with Return to Castle action
- [x] Tavern scene documentation updated with header/footer
- [x] All 786 tests passing
- [x] Production build succeeds
- [x] Manual verification: header and footer work in running app

---

## Notes for Engineer

**Key Architectural Points:**

1. **SceneTitleComponent** handles all header rendering - never hardcode headers
2. **SceneFooterComponent** wraps MenuComponent for horizontal menu at bottom
3. **Party gold is shared** - no individual character gold or divvy functionality
4. **Computed signals** provide reactivity for footer menu items based on state
5. **Horizontal menu format**: `KEY: Action | KEY: Action` with ESC first

**Testing Strategy:**

- Component tests should use instant transitions: `{ direction: 'instant' }`
- Footer menu items are tested via computed signal return values
- Integration tests verify navigation flow from footer actions

**Common Pitfalls:**

- Don't forget to add new components to imports array in @Component decorator
- Footer menu separator is ` | ` (space-pipe-space) not just `|`
- Party gold display format is "PARTY GOLD: X GP" not "Gold: X" or "X GP"
- ESC action should always be first (leftmost) in footer menu
