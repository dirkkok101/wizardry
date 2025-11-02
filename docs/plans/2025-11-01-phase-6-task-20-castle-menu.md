# Task 20: Castle Menu Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance Castle Menu to display current party roster, party gold, and provide quick access to character inspection and roster management.

**Architecture:** Update existing CastleMenuComponent with party display panel. Add character inspection navigation. Update menu items based on party state.

**Tech Stack:** Angular 19, Signal-based party display, Existing MenuComponent

---

## Implementation Tasks (Concise Format)

### Task 20.1: Party Display Panel

**Update CastleMenuComponent:**
```typescript
readonly currentParty = computed(() => this.gameState.party())
readonly partyCharacters = computed(() => {
  const party = this.currentParty()
  const state = this.gameState.state()
  return party.members
    .map(id => state.roster.get(id))
    .filter((char): char is Character => char !== undefined)
})

handleInspectCharacter(charId: string) {
  this.router.navigate(['/character-inspection'], {
    queryParams: { characterId: charId, returnTo: 'castle-menu' }
  })
}
```

**Tests (8 tests):**
- Displays party roster (0-6 members)
- Shows party gold
- Shows "No party formed" when empty
- Character click navigates to inspection
- Displays character name, class, level, HP
- Shows status indicators (OK, DEAD, etc.)
- Updates reactively when party changes
- Returns from inspection to castle menu

### Task 20.2: Enhanced Template

**Add Party Panel Section:**
```html
<div class="castle-menu">
  <header>
    <h1>CASTLE MENU</h1>
  </header>

  <aside class="party-panel">
    <h2>CURRENT PARTY</h2>
    @if (partyCharacters().length === 0) {
      <p class="no-party">No party formed</p>
      <p class="hint">Visit Tavern to form a party</p>
    } @else {
      <div class="party-gold">GOLD: {{ currentParty().gold || 0 }}</div>
      <ul class="party-list">
        @for (char of partyCharacters(); track char.id; let i = $index) {
          <li class="party-member" (click)="handleInspectCharacter(char.id)">
            <span class="position">{{ i + 1 }}.</span>
            <span class="name">{{ char.name }}</span>
            <span class="class">{{ char.class }}</span>
            <span class="level">Lv {{ char.level }}</span>
            <span class="hp">{{ char.hp }}/{{ char.maxHp }}</span>
            <span class="status" [class.dead]="char.status !== 'OK'">
              {{ char.status }}
            </span>
          </li>
        }
      </ul>
    }
  </aside>

  <main>
    <app-menu [items]="menuItems" (select)="handleMenuSelect($event)" />
  </main>
</div>
```

**Styling:**
- Party panel on left sidebar (300px width)
- Main menu on right
- Party member hover effect
- Status color coding (green=OK, red=DEAD)
- Responsive layout

**Commit**: `feat(castle-menu): add party roster display and inspection`

### Task 20.3: Dynamic Menu Items

**Update Menu Based on State:**
```typescript
readonly menuItems = computed(() => {
  const baseItems: MenuItem[] = [
    { id: 'tavern', label: 'GILGAMESH\'S TAVERN', enabled: true, shortcut: 'T' },
    { id: 'training', label: 'TRAINING GROUNDS', enabled: true, shortcut: 'G' },
    { id: 'inn', label: 'ADVENTURER\'S INN', enabled: true, shortcut: 'I' },
    { id: 'shop', label: 'BOLTAC\'S SHOP', enabled: true, shortcut: 'S' },
    { id: 'temple', label: 'TEMPLE OF CANT', enabled: true, shortcut: 'M' },
    { id: 'utilities', label: 'UTILITIES', enabled: true, shortcut: 'U' },
    { id: 'edge-of-town', label: 'EDGE OF TOWN', enabled: this.hasParty(), shortcut: 'E' }
  ]
  return baseItems
})

private hasParty(): boolean {
  return this.currentParty().members.length > 0
}
```

**Tests (5 tests):**
- Edge of Town enabled when party exists
- Edge of Town disabled when no party
- All town services always enabled
- Menu item shortcut keys work
- Navigation to selected service

---

## Summary

**Tests**: ~13 tests (8 display + 5 menu)
**Features**: Party display, character inspection, dynamic menu
**Estimated Time**: 1-2 hours
