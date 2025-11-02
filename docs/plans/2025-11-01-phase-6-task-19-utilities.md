# Task 19: Utilities (Save/Load) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create Utilities menu with save/load game system using 3 save slots, each storing full game state with timestamp metadata.

**Architecture:** Use existing SaveService. Add save slot selection UI, metadata display (timestamp, party info, location). Confirmation dialogs for overwrite and delete.

**Tech Stack:** Angular 19, SaveService (IndexedDB), Signal-based state, ConfirmationDialogComponent

---

## Implementation Tasks (Concise Format)

### Task 19.1: Save Slot Metadata Service

**Extend SaveService:**
```typescript
interface SaveSlotMetadata {
  slotId: number
  timestamp: number
  partySize: number
  partyGold: number
  currentScene: SceneType
  partyLevel: number // Average party level
}

static async getSlotMetadata(slotId: number): Promise<SaveSlotMetadata | null>
static async saveGame(slotId: number, state: GameState): Promise<void>
static async loadGame(slotId: number): Promise<GameState | null>
static async deleteSave(slotId: number): Promise<void>
```

**Tests (8 tests):**
- Save game to slot 1
- Load game from slot 1
- Get slot metadata (timestamp, party info)
- Overwrite existing save
- Delete save slot
- Handle empty slot (returns null)
- Multiple slots (1, 2, 3) independent
- Metadata updates on save

### Task 19.2: Utilities Component

**Create Component:**
- `src/app/utilities/utilities.component.ts`
- Template with 3 save slots
- Each slot shows: slot number, timestamp, party info, or "EMPTY"

**Core Logic:**
```typescript
readonly saveSlots = signal<Array<SaveSlotMetadata | null>>([null, null, null])

async ngOnInit() {
  // Load metadata for all 3 slots
  for (let i = 1; i <= 3; i++) {
    const metadata = await SaveService.getSlotMetadata(i)
    this.saveSlots.update(slots => {
      const newSlots = [...slots]
      newSlots[i - 1] = metadata
      return newSlots
    })
  }
}

async saveToSlot(slotId: number) {
  const existing = this.saveSlots()[slotId - 1]
  if (existing) {
    // Show confirmation
    const confirmed = await this.confirmOverwrite()
    if (!confirmed) return
  }

  await SaveService.saveGame(slotId, this.gameState.state())
  this.successMessage.set(`Game saved to slot ${slotId}`)
  await this.refreshSlotMetadata()
}

async loadFromSlot(slotId: number) {
  const state = await SaveService.loadGame(slotId)
  if (!state) {
    this.errorMessage.set('No save data in this slot')
    return
  }

  this.gameState.setState(state)
  this.successMessage.set('Game loaded successfully')
  this.router.navigate(['/castle-menu'])
}
```

**Tests (15 tests):**
- Displays 3 save slots
- Shows "EMPTY" for unused slots
- Shows metadata for used slots (timestamp, party info)
- Saves game to empty slot
- Prompts confirmation before overwrite
- Loads game from slot
- Deletes save with confirmation
- Returns to castle after load
- Error when loading empty slot
- Success message after save
- Metadata refreshes after save

### Task 19.3: Template & Styling

**Slot Display:**
```html
<div class="save-slot">
  <div class="slot-number">SLOT {{ slotNumber }}</div>
  @if (metadata) {
    <div class="slot-data">
      <div class="timestamp">{{ formatDate(metadata.timestamp) }}</div>
      <div class="party-info">Party: {{ metadata.partySize }}, {{ metadata.partyGold }} gold</div>
      <div class="location">Location: {{ metadata.currentScene }}</div>
    </div>
    <button (click)="loadFromSlot(slotNumber)">LOAD</button>
    <button (click)="deleteSlot(slotNumber)">DELETE</button>
  } @else {
    <div class="empty">EMPTY</div>
    <button (click)="saveToSlot(slotNumber)">SAVE HERE</button>
  }
</div>
```

**Commit**: `feat(utilities): implement save/load system with 3 slots`

### Task 19.4: Add Route

**Update `app.routes.ts`:**
```typescript
{
  path: 'utilities',
  component: UtilitiesComponent
}
```

---

## Summary

**Tests**: ~23 tests (8 service + 15 component)
**Features**: 3-slot save/load, metadata display, confirmations
**Estimated Time**: 2-3 hours
