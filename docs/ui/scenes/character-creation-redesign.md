# Character Creation Scene (Redesigned)

## Overview

Form-based character creation with 2-column layout and progressive enabling. All 5 sections visible from start, enabled as prerequisites are met.

## Layout

```
┌─────────────────────────────────────────────────┐
│         CHARACTER CREATION (SceneTitle)         │
├──────────────────────┬──────────────────────────┤
│ LEFT COLUMN          │ RIGHT COLUMN             │
│                      │                          │
│ 1. CHOOSE RACE       │ 4. CHOOSE CLASS          │
│    [Human] [Elf]     │    [Fighter] [Mage]      │
│    [Dwarf] [Gnome]   │    [Priest] [Thief]      │
│    [Hobbit]          │    [Bishop] [Samurai]    │
│    Description...    │    [Lord] [Ninja]        │
│    Base Stats...     │    Description...        │
│                      │                          │
│ 2. CHOOSE ALIGNMENT  │ 5. NAME CHARACTER        │
│    [Good] [Neutral]  │    Name: [________]      │
│    [Evil]            │                          │
│                      │                          │
│ 3. ROLL STATS        │                          │
│    [ROLL DICE]       │                          │
│    STR: 8 + 7 = 15   │                          │
│    INT: 8 + 12 = 20  │                          │
│    ...               │                          │
├──────────────────────┴──────────────────────────┤
│              [Success/Error Message]            │
├─────────────────────────────────────────────────┤
│ [SAVE] [CANCEL] [BACK TO TRAINING GROUNDS]      │
│           (SceneFooter with Menu)               │
└─────────────────────────────────────────────────┘
```

## Progressive Enabling

| Section | Enabled When | Disabled Appearance |
|---------|-------------|---------------------|
| 1. Race | Always | N/A |
| 2. Alignment | Race selected | 40% opacity, no clicks |
| 3. Stats | Alignment selected | 40% opacity, no clicks |
| 4. Class | Stats rolled | 40% opacity, no clicks |
| 5. Name | Class selected | 40% opacity, no clicks |
| Save button | Name entered | Disabled in footer |

## Data Formula

**NEW (Data-Driven):**
```
finalStat = raceBaseStats[stat] + rolled_amount
Example: Human STR = 8 (base) + 7 (rolled) = 15 (final)
```

**Display Format:**
```
STR: 8 + 7 = 15
     ↑   ↑   ↑
   base roll final
```

## Class Eligibility

- All 8 classes always visible
- Ineligible classes grayed out with ✗ indicator
- Only eligible classes clickable
- Eligibility recalculated on stat reroll

## Keyboard Shortcuts

- `R` - Roll/reroll stats (when alignment selected)
- `S` - Save character (when form complete)
- `Esc` - Cancel (shows confirmation if form has data)
- `B` - Back to training grounds

## Components Used

- `SceneTitleComponent` - Reusable header
- `SceneFooterComponent` - Reusable footer with MenuComponent
- `ConfirmationDialogComponent` - Cancel confirmation

## State Management

- Signal-based reactive state
- Computed signals for derived state
- No wizard state machine
- Progressive reset on upstream changes

## Success Flow

1. Save character
2. Show success message: "{Name} created successfully!"
3. Wait 2 seconds
4. Reset form to empty state
5. Allow creating another character

## Data Flow

The character creation process uses a cascading data flow through services:

```
RaceService
  ↓
  └─→ Provides base stats for selected race
      ↓
      ↓ (Race selection triggers)
      ↓
ClassService
  ├─→ Evaluates class eligibility based on current stats
  ├─→ Gray out ineligible classes (show ✗)
  └─→ Only eligible classes are clickable
      ↓
      ↓ (Stats rolled or modified)
      ↓
ClassService (re-evaluate)
  └─→ Recalculate eligibility for new stats
      ↓
      ↓ (Class selected)
      ↓
CharacterService
  └─→ Create character with final stats and class
```

## Component Structure

```
CharacterCreationScene
├── SceneTitleComponent
│   └── Displays "CHARACTER CREATION"
│
├── Main Form Container (2 columns)
│   │
│   ├── LEFT COLUMN
│   │   ├── 1. Race Selection
│   │   │   ├── Button group: Human, Elf, Dwarf, Gnome, Hobbit
│   │   │   ├── Race description
│   │   │   └── Base stats table
│   │   │
│   │   ├── 2. Alignment Selection
│   │   │   └── Button group: Good, Neutral, Evil
│   │   │
│   │   └── 3. Stat Rolling
│   │       ├── [ROLL DICE] button
│   │       └── Stat display with formula:
│   │           STR: 8 + 7 = 15
│   │           INT: 8 + 12 = 20
│   │           (etc. for all 6 stats)
│   │
│   └── RIGHT COLUMN
│       ├── 4. Class Selection
│       │   ├── Button grid: 8 classes (2x4)
│       │   ├── Ineligible classes: grayed + ✗
│       │   ├── Only eligible classes clickable
│       │   └── Class description
│       │
│       └── 5. Character Name
│           └── Text input field
│
├── Message Display Area
│   └── Success/Error messages centered
│
└── SceneFooterComponent
    └── Menu: [SAVE] [CANCEL] [BACK TO TRAINING GROUNDS]
```

## Success Message and Form Reset

When a character is successfully created:

1. Character is saved to roster via `CharacterService.createCharacter()`
2. Success message displays: **"{CharacterName} created successfully!"**
3. Wait 2 seconds for user acknowledgment
4. Automatically reset entire form to empty state:
   - Race: no selection
   - Alignment: no selection
   - Stats: cleared (awaiting new roll)
   - Class: no selection
   - Name: empty text field
5. Focus returns to race selection
6. User can immediately create another character

This flow allows batch character creation in a single session without navigating away and back.

## Navigation Options

From the character creation scene, users can:

- **[SAVE]** - Save character and reset form (enabled only when name is entered)
- **[CANCEL]** - Close form with confirmation dialog if form has data
- **[BACK TO TRAINING GROUNDS]** - Return to Training Grounds scene
- **Esc key** - Same as cancel (confirmation if data present)
- **B key** - Same as back button

## Form Validation

- **Race**: Required (must select one)
- **Alignment**: Required (must select one)
- **Stats**: Required (must roll at least once)
- **Class**: Required (must select an eligible class)
- **Name**: Required (minimum 1 character, maximum 20 characters)

All sections must be complete before save button becomes enabled.

## Testing Strategy

### Unit Tests

- Race selection enabling/disabling alignment section
- Alignment selection enabling/disabling stats section
- Stats rolling enables class section
- Class selection enables name section
- Name entry enables save button
- Progressive reset on upstream changes
- Class eligibility calculation with recalculation on stat reroll
- Keyboard shortcuts (R, S, Esc, B)
- Success message display and form reset after save

### Integration Tests

- Complete character creation flow from race to save
- Character appears in roster after save
- Form properly resets for next character creation
- Navigation back to training grounds preserves other state

## Accessibility

- All form sections have proper labels
- Disabled sections have visual indicators (opacity + no cursor)
- Keyboard shortcuts fully support gameplay without mouse
- Success/error messages are screen-reader compatible
- Form inputs have proper ARIA attributes
