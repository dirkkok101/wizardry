# Task 18: Character Inspection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create context-aware character inspection component displaying full character sheet, equipment, inventory, spell list, and stats from Tavern, Castle Menu, or Camp.

**Architecture:** Standalone component receiving characterId and returnTo via query params. Signal-based reactive display. Read-only view (no equipment changes in Phase 6).

**Tech Stack:** Angular 19, TypeScript 5.5+, Jest, ActivatedRoute query params, Signal-based state

---

## Implementation Tasks (Concise Format)

### Task 18.1: Character Inspection Component Scaffold

**Create Component:**
- `src/app/character-inspection/character-inspection.component.ts`
- `src/app/character-inspection/character-inspection.component.html`
- `src/app/character-inspection/character-inspection.component.scss`
- `src/app/character-inspection/__tests__/character-inspection.component.spec.ts`

**Core Logic:**
```typescript
export class CharacterInspectionComponent implements OnInit {
  readonly characterId = signal<string | null>(null)
  readonly returnTo = signal<string>('castle-menu')
  readonly character = computed(() => {
    const id = this.characterId()
    if (!id) return null
    return this.gameState.state().roster.get(id) || null
  })

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.characterId.set(params['characterId'])
      this.returnTo.set(params['returnTo'] || 'castle-menu')
    })
  }

  returnToPrevious() {
    this.router.navigate([`/${this.returnTo()}`])
  }
}
```

**Tests (10 tests):**
- Loads character by ID from query params
- Sets return navigation from query params
- Displays character name, class, level
- Shows stats (STR, INT, PIE, VIT, AGI, LUK)
- Displays HP, gold, experience
- Shows inventory items (8 max)
- Shows equipped weapon and armor
- Shows known spells for casters
- Handles missing character ID (error)
- Navigates back to correct scene

### Task 18.2: Character Sheet Template

**Display Sections:**
1. **Header**: Name, Class, Level, Alignment
2. **Stats Panel**: 6 base stats (3-18 range)
3. **Status Panel**: HP/MaxHP, Gold, XP, Status
4. **Equipment**: Weapon, Armor (equipped items)
5. **Inventory**: 8 item slots (IDs resolved to Item objects)
6. **Spells**: Known spells (for Mage/Priest/Bishop only)
7. **Back Button**: Return to previous scene

**Styling**: Monospace font, green text for OK status, red for DEAD, tabular layout

### Task 18.3: Add Route

**Update `src/app/app.routes.ts`:**
```typescript
{
  path: 'character-inspection',
  component: CharacterInspectionComponent
}
```

**Commit**: `feat(character-inspection): add character sheet display component`

---

## Summary

**Tests**: ~10 component tests
**Features**: Read-only character sheet, context-aware navigation
**Estimated Time**: 2-3 hours
