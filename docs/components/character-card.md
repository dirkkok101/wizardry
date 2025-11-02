# CharacterCard Component

## Overview
Presentational component for displaying character information with action buttons.

## Type
**Presentational Component** - No service injection, pure display and event emission

## Location
`src/components/character-card/character-card.component.ts`

## Inputs
- `character: Character` - Character data to display
- `status: CharacterStatus` - Computed status (OK, IN_MAZE, DEAD, ASHES)

## Outputs
- `inspect: EventEmitter<string>` - Emits character ID when Inspect clicked
- `delete: EventEmitter<string>` - Emits character ID when Delete clicked

## Display Elements
1. **Header**: Character name + status badge (color-coded)
2. **Body**: Race, Class, Level
3. **Actions**: Inspect and Delete buttons

## Visual Design
- Wizardry green-on-black aesthetic
- Color-coded status badges:
  - `OK`: Green (#0f0)
  - `IN_MAZE`: Yellow (#ff0)
  - `DEAD`: Red (#f00)
  - `ASHES`: Dark Red (#a00)
- Hover effects on buttons
- Delete button turns red on hover

## Usage Example
```typescript
<app-character-card
  [character]="character"
  [status]="CharacterStatus.OK"
  (inspect)="handleInspect($event)"
  (delete)="handleDelete($event)">
</app-character-card>
```

## Responsibilities
✅ Display character data
✅ Emit user action events
❌ No business logic
❌ No service injection
❌ No state management

## Testing
- Renders all character data correctly
- Emits inspect event with character ID
- Emits delete event with character ID
- Displays status badge with correct color
- Buttons have correct hover states

## Dependencies
- `Character` type from `types/Character`
- `CharacterStatus` type from `types/CharacterStatus`

## Used By
- TrainingGroundsComponent
- (Future: Tavern, Temple, other roster displays)

## Design Rationale
Follows presentational component pattern to maximize reusability. Parent components compute derived data (like status) and handle all business logic. This component focuses solely on display and event emission.
