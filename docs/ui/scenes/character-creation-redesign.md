# Character Creation Scene

## Overview

Step-by-step wizard for creating new characters with a two-column layout: controls on the left, character preview on the right.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│              CHARACTER CREATION (SceneTitle)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────────┐ │
│  │ CONTROLS COLUMN         │  │ CHARACTER PREVIEW         │ │
│  │                         │  │                           │ │
│  │ Step 1 of 7      [Race] │  │ ┌───────────────────────┐ │ │
│  │ ─────────────────────── │  │ │ Race: HUMAN           │ │ │
│  │                         │  │ │ Alignment: GOOD       │ │ │
│  │ [1] Human  [2] Elf      │  │ │ Class: FIGHTER        │ │ │
│  │ [3] Dwarf  [4] Gnome    │  │ │ ─────────────────     │ │ │
│  │ [5] Hobbit              │  │ │ Points Remaining: 5   │ │ │
│  │                         │  │ │ ─────────────────     │ │ │
│  │ Description panel...    │  │ │ STR  12  [-][+] +1dmg │ │ │
│  │                         │  │ │ VIT  11  [-][+] +0HP  │ │ │
│  │ Press 1-5 to select     │  │ │ INT  10  [-][+] +0lrn │ │ │
│  │                         │  │ │ AGI  13  [-][+] +1AC  │ │ │
│  └─────────────────────────┘  │ │ PIE   9  [-][+] -1lrn │ │ │
│                               │ │ LUK  10  [-][+] +0%fl │ │ │
│                               │ │ ─────────────────     │ │ │
│                               │ │ Use +/- to allocate   │ │ │
│                               │ │ your bonus points     │ │ │
│                               │ └───────────────────────┘ │ │
│                               └───────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│          [BACK]  [REROLL]  [SAVE]  (SceneFooter)            │
└─────────────────────────────────────────────────────────────┘
```

## Wizard Steps

| Step | Title | Description |
|------|-------|-------------|
| 1 | Select Race | Choose from 5 races |
| 2 | Select Alignment | Choose Good, Neutral, or Evil |
| 3 | Select Class | Choose from 8 classes (eligibility based on alignment) |
| 4 | Roll Stats | Roll for bonus points |
| 5 | Allocate Stats | Distribute bonus points with +/- buttons |
| 6 | Name Character | Enter character name (1-15 chars) |
| 7 | Confirm | Review and save |

## Character Preview Card

The right column displays a `CharacterCreationStatsCardComponent` with **progressive reveal**:

### Progressive Reveal Pattern

| Selection Made | Fields Shown |
|---------------|--------------|
| None | Empty placeholder |
| Race | Race row |
| Alignment | Race + Alignment rows |
| Class | Race + Alignment + Class rows |
| Stats rolled | All above + Stats section with allocation |

### Stats Section

When stats are rolled, shows:
- **Instructions**: "Use +/- to allocate your bonus points"
- **Points Remaining**: Countdown of available bonus points
- **Stat rows**: Each stat with value, +/- buttons, and modifier

### Stat Modifier Display

| Stat | Modifier Formula | Display |
|------|-----------------|---------|
| STR | (stat-10)/2 | `+X dmg` |
| VIT | Tiered table | `+X HP/lvl` |
| INT | (stat-10)/2 | `+X learn` |
| AGI | (stat-10)/2 | `+X AC` |
| PIE | (stat-10)/2 | `+X learn` |
| LUK | (stat-10)*2 | `+X% flee` |

## Components Used

| Component | Purpose |
|-----------|---------|
| `SceneTitleComponent` | Header with "CHARACTER CREATION" |
| `SceneFooterComponent` | Navigation buttons |
| `CharacterCreationStatsCardComponent` | Right column preview with progressive reveal |
| `ConfirmationDialogComponent` | Cancel confirmation |

## Keyboard Shortcuts

| Key | Action | Step |
|-----|--------|------|
| 1-5 | Select race | Race |
| 1-3 | Select alignment | Alignment |
| 1-8 | Select class | Class |
| R | Roll/Reroll stats | Roll Stats |
| +/- | Allocate stats | Allocate |
| Enter | Confirm name | Name |
| Esc | Back/Cancel | Any |

## Class Eligibility

Classes have alignment restrictions:

| Class | Alignments |
|-------|------------|
| Fighter | Any |
| Mage | Any |
| Priest | Good, Evil |
| Thief | Neutral, Evil |
| Bishop | Good, Evil |
| Samurai | Good, Neutral |
| Lord | Good only |
| Ninja | Evil only |

Ineligible classes show:
- Grayed out (40% opacity)
- Red X marker
- Requirements tooltip (e.g., "Need: Evil")

## Stat Allocation Logic

### Base Formula
```
finalStat = raceBaseStat + allocatedPoints
```

### Constraints
- **Minimum**: Race base stat (cannot go below)
- **Maximum**: 18 (classic Wizardry cap)
- **Bonus Points**: Random roll (varies by race)

### Allocation Config
```typescript
interface AllocationConfig {
  bonusPoints: number        // Remaining to allocate
  baseStats: RaceBaseStats   // From race data
  allocatedStats: RolledStats // Current allocation
  maxStat: number            // 18
}
```

## State Management

Uses Angular signals for reactive state:

```typescript
// Current wizard step
currentStep = signal<WizardStep>('race')

// Selections
selectedRace = signal<Race | null>(null)
selectedAlignment = signal<Alignment | null>(null)
selectedClass = signal<CharacterClass | null>(null)
characterName = signal<string>('')

// Stats
rolledStats = signal<RolledStats | null>(null)
allocatedStats = signal<RolledStats | null>(null)

// Computed: partial character for preview
partialCharacter = computed(() => ({
  race: this.selectedRace(),
  alignment: this.selectedAlignment(),
  class: this.selectedClass(),
  ...this.computedStats()
}))

// Computed: allocation config
allocationConfig = computed(() => {
  if (!this.rolledStats()) return undefined
  return {
    bonusPoints: this.remainingBonusPoints(),
    baseStats: this.raceBaseStats(),
    allocatedStats: this.allocatedStats(),
    maxStat: 18
  }
})
```

## Validation

| Field | Rules |
|-------|-------|
| Race | Required |
| Alignment | Required |
| Class | Required, must be eligible |
| Stats | Must be rolled |
| Allocation | All bonus points must be allocated |
| Name | 1-15 characters, alphanumeric + spaces |

## Navigation

| Action | Destination |
|--------|-------------|
| Save (success) | Training Grounds |
| Back | Previous step (or Training Grounds from step 1) |
| Cancel | Training Grounds (with confirmation if data entered) |

## Success Flow

1. User clicks Save
2. Character created via `CharacterService.createCharacter()`
3. Success message: "{Name} created successfully!"
4. Navigate to Training Grounds after 2 seconds

## Visual Design

### Controls Column
- **Step header**: Gold text with step indicator (secondary text)
- **Buttons**: Dark cards with gold hover, selected state has gold glow
- **Description panels**: Dark background with gold left border
- **Hints**: Secondary text color, italic

### Character Preview
- Uses `CharacterCreationStatsCardComponent`
- Dark card background
- Gold accents for stat values
- +/- buttons with disabled states

### Text Colors
| Element | CSS Variable |
|---------|--------------|
| Step title | `--color-text-gold` |
| Step indicator | `--color-text-secondary` |
| Hints/instructions | `--color-text-secondary` |
| Empty placeholders | `--color-text-secondary` |
| Stat labels | `--color-text-secondary` |
| Stat values | `--color-text-gold` |

## Testing

### Unit Tests
- Step progression
- Selection handling
- Class eligibility calculation
- Stat allocation logic
- Form validation
- Keyboard shortcuts

### Integration Tests
- Complete character creation flow
- Character appears in roster after save
- Proper navigation on cancel/back

## File Locations

| File | Purpose |
|------|---------|
| `src/app/scenes/character-creation/character-creation.component.ts` | Main component |
| `src/app/scenes/character-creation/character-creation.component.html` | Template |
| `src/app/scenes/character-creation/character-creation.component.scss` | Styles |
| `src/app/shared/components/character-creation-stats-card/` | Preview card component |
