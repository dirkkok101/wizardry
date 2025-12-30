# Character Card Components

## Overview

The character display system uses three specialized card components for different contexts:

| Component | Location | Purpose |
|-----------|----------|---------|
| `CharacterCardComponent` | `src/app/shared/components/character-card/` | Roster display (Training Grounds, Tavern available list) |
| `CharacterDetailCardComponent` | `src/app/shared/components/character-detail-card/` | Full character inspection (Character Inspection scene) |
| `CharacterCreationStatsCardComponent` | `src/app/shared/components/character-creation-stats-card/` | Character creation wizard |

All follow the **Presentational Component** pattern - no service injection, pure display and event emission.

---

## CharacterCardComponent

Basic character card for roster displays with action buttons.

### Location
`src/app/shared/components/character-card/character-card.component.ts`

### Inputs
- `character: Character` - Character data to display
- `variant: 'default' | 'compact'` - Display variant (default: 'default')

### Outputs
- `inspect: EventEmitter<string>` - Emits character ID when Inspect clicked
- `delete: EventEmitter<string>` - Emits character ID when Delete clicked

### Display Elements
1. **Header**: Character name + status badge (color-coded)
2. **Body**: Race, Class, Level
3. **Actions**: Inspect and Delete buttons

### Usage
```html
<app-character-card
  [character]="character"
  variant="compact"
  (inspect)="handleInspect($event)"
  (delete)="handleDelete($event)"
/>
```

### Used By
- TrainingGroundsComponent
- TavernComponent (available characters list)

---

## CharacterDetailCardComponent

Full character display with comprehensive stats, combat info, and actions.

### Location
`src/app/shared/components/character-detail-card/character-detail-card.component.ts`

### Inputs
- `character: Character` - Full character data (required)
- `inspectionMode: InspectionMode` - Context: 'TAVERN' | 'TRAINING_GROUNDS' | 'CAMP'
- `actions: CharacterAction[]` - Available action buttons
- `showXpProgress: boolean` - Whether to show XP progress bar (default: true)

### Outputs
- `actionClick: EventEmitter<CharacterActionEvent>` - Emits when action button clicked

### Display Sections
1. **Header**: Race, Class, Level, Alignment, Status badge
2. **Attributes**: STR, VIT, INT, AGI, PIE, LUK with modifiers
3. **Combat Stats**: HP (with bar), AC, Attacks/round, Damage
4. **XP & History**: XP (with progress bar), Age, Deaths, Kills
5. **Spell Points**: Mage/Priest spell slots (casters only)
6. **Actions**: Configurable action buttons

### Stat Modifier Display

| Stat | Modifier | Display Example |
|------|----------|-----------------|
| STR | (stat-10)/2 | `+2 dmg` |
| VIT | Tiered table | `+2 HP/lvl` |
| INT | (stat-10)/2 | `+3 learn` |
| AGI | (stat-10)/2 | `+2 AC` |
| PIE | (stat-10)/2 | `+2 learn` |
| LUK | (stat-10)*2 | `+8% flee` |

### Usage
```html
<app-character-detail-card
  [character]="character"
  [inspectionMode]="'TAVERN'"
  [actions]="characterActions"
  [showXpProgress]="true"
  (actionClick)="onAction($event)"
/>
```

### Used By
- CharacterInspectionComponent
- MazeComponent (inspect panel)

---

## CharacterCreationStatsCardComponent

Dedicated component for the character creation wizard with progressive reveal and stat allocation.

### Location
`src/app/shared/components/character-creation-stats-card/character-creation-stats-card.component.ts`

### Inputs
- `partialCharacter: PartialCharacter` - Partial character data being built
- `allocationConfig: AllocationConfig` - Stat allocation state

### Outputs
- `allocate: EventEmitter<{ stat: StatKey; delta: number }>` - Emits stat allocation changes

### Types
```typescript
interface PartialCharacter {
  race?: Race
  alignment?: Alignment
  class?: CharacterClass
  name?: string
  strength?: number
  intelligence?: number
  piety?: number
  vitality?: number
  agility?: number
  luck?: number
}

interface AllocationConfig {
  bonusPoints: number        // Remaining points to allocate
  baseStats: RaceBaseStats   // Race base stats
  allocatedStats: RolledStats // Currently allocated points
  maxStat: number            // Maximum stat value (18)
}

type StatKey = 'strength' | 'intelligence' | 'piety' | 'vitality' | 'agility' | 'luck'
```

### Features
1. **Progressive Reveal**: Shows fields as they become available
   - Race row (always visible once selected)
   - Alignment row (visible after race)
   - Class row (visible after alignment)
   - Stats section (visible after roll)

2. **Stat Allocation**: +/- buttons for each stat
   - Increment: available when bonus points > 0 and stat < max
   - Decrement: available when allocated points > 0

3. **Instructions**: "Use +/- to allocate your bonus points"

4. **Bonus Points Display**: Shows remaining points to allocate

### Stat Modifier Display (same as DetailCard)

| Stat | Display |
|------|---------|
| STR | `+X dmg` |
| VIT | `+X HP/lvl` |
| INT | `+X learn` |
| AGI | `+X AC` |
| PIE | `+X learn` |
| LUK | `+X% flee` |

### Usage
```html
<app-character-creation-stats-card
  [partialCharacter]="partialCharacter()"
  [allocationConfig]="allocationConfig()"
  (allocate)="handleAllocation($event)"
/>
```

### Used By
- CharacterCreationComponent

---

## Design Rationale

### Why Three Components?

1. **Single Responsibility**: Each component has a focused purpose
   - CharacterCard: Simple roster display
   - CharacterDetailCard: Full inspection view
   - CharacterCreationStatsCard: Creation wizard with allocation

2. **No Creation Mode in DetailCard**: Previously `CharacterDetailCard` had a `cardMode: 'view' | 'creation'` input. This was removed because:
   - Creation needs progressive reveal (fields appear as selected)
   - Creation has stat allocation buttons
   - Creation has different layout (no XP, no combat stats yet)
   - Mixing modes made the component complex

3. **Consistent Modifier Display**: All components show the same modifier format so users learn what stats affect.

---

## Visual Design

All cards follow the Modern Retro-Fantasy design system:

- **Background**: `var(--color-bg-card)` (#1a1a1a)
- **Border**: `1px solid var(--color-border)` (#333)
- **Gold accents**: `var(--color-gold-primary)` (#d4a574)
- **Typography**: `var(--font-body)` for stats, `var(--font-display)` for names

### Status Colors
| Status | Color |
|--------|-------|
| OK | `--color-status-ok` (#22c55e) |
| Poisoned | `--color-status-poisoned` (#a855f7) |
| Dead | `--color-status-dead` (#6b7280) |
| Ashes | `--color-status-ashes` (#991b1b) |

---

## Testing

Each component has comprehensive tests:

- `character-card/__tests__/character-card.component.spec.ts`
- `character-detail-card/__tests__/character-detail-card.component.spec.ts`
- `character-creation-stats-card/__tests__/character-creation-stats-card.component.spec.ts`

Tests cover:
- Rendering character data
- Event emission
- Conditional display (spell points, actions)
- Stat modifier calculations
- Progressive reveal (creation card)
- Allocation logic (creation card)
