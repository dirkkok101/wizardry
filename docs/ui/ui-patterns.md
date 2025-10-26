# UI Patterns

**Reusable interface patterns used across Wizardry 1 scenes.**

---

## Overview

This document codifies the 7 core UI patterns that appear throughout Wizardry 1's interface. These patterns ensure consistency, predictability, and usability across all 14 scenes.

**Pattern Philosophy:**
- **Simplicity:** Single-keystroke inputs, minimal steps
- **Consistency:** Same patterns behave identically across scenes
- **Predictability:** User learns once, applies everywhere
- **Safety:** Confirmations for destructive actions
- **Accessibility:** Keyboard-first, clear visual feedback

---

## Pattern Catalog

1. **Standard Menu Pattern** - Primary navigation interface
2. **Character Selection Pattern** - Numbered character lists
3. **Single-Keystroke Input Pattern** - Immediate key response
4. **Error Handling Pattern** - Consistent error messaging
5. **Confirmation Dialog Pattern** - Destructive action warnings
6. **Multi-Step Transaction Pattern** - Shopping, services, complex operations
7. **List Navigation Pattern** - Paginated content browsing

---

## 1. Standard Menu Pattern

**Used In:** Castle Menu, Edge of Town, Tavern, Temple, Shop, Inn, Camp

**Description:** Display location title, optional state info, and menu of actions with single-letter shortcuts. This is the foundational pattern for most scenes in the game.

### Visual Pattern

```
┌─────────────────────────────────────┐
│  LOCATION NAME                      │
├─────────────────────────────────────┤
│  [Optional State Display Area]      │
│  e.g., Party roster, gold, etc.     │
│                                     │
├─────────────────────────────────────┤
│  (X)Action 1                        │
│  (Y)Action 2                        │
│  (Z)Action 3                        │
│  (L)eave                            │
└─────────────────────────────────────┘
```

### Input Handling

- **Single keystroke** (no Enter needed)
- **Case-insensitive** (both 'G' and 'g' work)
- **First letter** of action name
- **Invalid key** → error beep/message
- **(L)eave** always returns to parent scene

### Example: Castle Menu

```
┌─────────────────────────────────────┐
│  CASTLE                             │
├─────────────────────────────────────┤
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  (G)ILGAMESH'S TAVERN               │
│  (T)EMPLE OF CANT                   │
│  (B)OLTAC'S TRADING POST            │
│  (A)DVENTURER'S INN                 │
│  (E)DGE OF TOWN                     │
└─────────────────────────────────────┘
```

### TypeScript Implementation

```typescript
interface MenuPattern {
  title: string
  stateDisplay?: React.ReactNode
  actions: MenuAction[]
}

interface MenuAction {
  key: string           // Single letter (e.g., 'G')
  label: string         // Display text (e.g., "ILGAMESH'S TAVERN")
  handler: () => void   // Action to execute
  enabled: boolean      // Is action currently available
  tooltip?: string      // Optional help text
}

function renderMenu(menu: MenuPattern): void {
  displayTitle(menu.title)

  if (menu.stateDisplay) {
    displayState(menu.stateDisplay)
  }

  displayActions(menu.actions)

  waitForKeystroke((key) => {
    const action = menu.actions.find(
      a => a.key.toLowerCase() === key.toLowerCase()
    )

    if (action && action.enabled) {
      action.handler()
    } else {
      showError("INVALID SELECTION")
    }
  })
}
```

### Variants

**A. Simple Menu (Castle Menu):**
- Title only, no state display
- 5-6 action options
- Clean and minimal

**B. Menu with State (Tavern):**
- Title + party roster display
- Actions reference the displayed state
- Example: Party roster shown, then (A)dd/(R)emove actions

**C. Menu with Context (Camp):**
- Title + location context (level, position)
- Actions change based on dungeon state
- Example: Show depth and facing direction

---

## 2. Character Selection Pattern

**Used In:** Tavern, Camp, Shop, Temple, Inn, Training Grounds

**Description:** Display numbered list of characters or party slots, prompt for selection by number. Handles both party members (1-6) and full roster (all characters).

### Visual Pattern

```
Select Character:

1. Gandalf     Mage   5    15/15 HP  OK
2. Corak       Fight  4    28/30 HP  OK
3. Thief       Thief  3     8/10 HP  WOUNDED
4. (empty)
5. (empty)
6. (empty)

Enter number (1-6):
```

### Input Handling

- **Numeric input** (1-6 for party, 1-20+ for full roster)
- **Validation** of selection existence
- **Status check** (context-dependent)
- **Retry** on invalid input

### Example: Tavern - Add Character

```
┌─────────────────────────────────────┐
│  ADD CHARACTER TO PARTY             │
├─────────────────────────────────────┤
│  CURRENT PARTY:                     │
│  1. Gandalf    Mage   5   OK        │
│  2. Corak      Fight  4   OK        │
│  3. (Empty)                         │
│  4. (Empty)                         │
│  5. (Empty)                         │
│  6. (Empty)                         │
│                                     │
│  AVAILABLE CHARACTERS:              │
│  1. Thief      Thief  3   OK        │
│  2. PriestBob  Priest 4   DEAD      │
│  3. WizardX    Bishop 2   ASHES     │
│                                     │
│  Select character to add (1-3):     │
└─────────────────────────────────────┘
```

### TypeScript Implementation

```typescript
interface CharacterSelectionPattern {
  characters: (Character | null)[]  // Null = empty slot
  prompt: string
  validator: (character: Character | null) => ValidationResult
  showFullStatus?: boolean  // Show HP, status, etc.
}

interface ValidationResult {
  allowed: boolean
  reason?: string
}

function selectCharacter(pattern: CharacterSelectionPattern): Character | null {
  displayCharacterList(pattern.characters, pattern.showFullStatus)
  displayPrompt(pattern.prompt)

  const index = waitForNumericInput(1, pattern.characters.length)
  const character = pattern.characters[index - 1]

  const validation = pattern.validator(character)
  if (!validation.allowed) {
    showError(validation.reason)
    return null
  }

  return character
}

// Example validator: Temple resurrection
function canResurrect(character: Character | null): ValidationResult {
  if (!character) {
    return { allowed: false, reason: "Empty slot" }
  }

  if (character.status !== CharacterStatus.DEAD &&
      character.status !== CharacterStatus.ASHES) {
    return { allowed: false, reason: "Character is not dead" }
  }

  return { allowed: true }
}
```

### Variants

**A. Party Member Selection (1-6):**
```
CURRENT PARTY:
1. Gandalf    OK
2. Corak      OK
3. (empty)
4. (empty)
5. (empty)
6. (empty)

Select party member (1-6):
```

**B. Full Roster Selection (1-20+):**
```
ALL CHARACTERS:
1. Gandalf    OK       IN PARTY
2. Corak      OK       IN PARTY
3. Thief      DEAD     IN TOWN
4. Legolas    OK       IN TOWN
5. Aragorn    LOST     IN TOWN
...

Select character (1-20):
```

**C. Empty Slot Selection:**
```
PARTY SLOTS:
1. Gandalf    (occupied)
2. Corak      (occupied)
3. (empty)    ← select this
4. (empty)
5. (empty)
6. (empty)

Select empty slot (3-6):
```

---

## 3. Single-Keystroke Input Pattern

**Used In:** All scenes

**Description:** Accept single character input without requiring Enter key. Provides immediate feedback and response, making navigation fast and intuitive.

### Behavior

- **Immediate response** to keypress
- **Case-insensitive** (usually)
- **No buffering** (ignore rapid presses)
- **Visual feedback** on invalid input
- **Sound feedback** (optional beep)

### Example: Maze Navigation

User presses 'W' → Party immediately moves forward
User presses 'X' → BEEP + "INVALID KEY" message

### TypeScript Implementation

```typescript
function waitForSingleKeystroke(validKeys: string[]): Promise<string> {
  return new Promise((resolve) => {
    const handler = (event: KeyboardEvent) => {
      // Prevent default browser behavior
      event.preventDefault()

      const key = event.key.toUpperCase()

      if (validKeys.includes(key)) {
        document.removeEventListener('keydown', handler)
        resolve(key)
      } else {
        playErrorBeep()
        showErrorMessage("INVALID KEY", { duration: 1000 })
      }
    }

    document.addEventListener('keydown', handler)
  })
}

// Example usage: Castle Menu
const key = await waitForSingleKeystroke(['G', 'T', 'B', 'A', 'E'])

switch (key) {
  case 'G':
    navigateTo(SceneType.TAVERN)
    break
  case 'T':
    navigateTo(SceneType.TEMPLE)
    break
  // ... etc
}
```

### Special Cases

**Numbers (Character Selection):**
```typescript
// Accept numeric input for character selection
const key = await waitForSingleKeystroke(['1', '2', '3', '4', '5', '6'])
const index = parseInt(key) - 1
```

**Cancel/Escape:**
```typescript
// Allow Escape to cancel
const key = await waitForSingleKeystroke(['Y', 'N', 'ESCAPE'])
if (key === 'ESCAPE') {
  return null  // Cancel operation
}
```

### Accessibility Considerations

- Support both uppercase and lowercase
- Provide visual focus indicators
- Allow Escape to cancel where appropriate
- Show valid keys prominently in UI
- Optional: Show keyboard shortcuts in tooltips

---

## 4. Error Handling Pattern

**Used In:** All scenes

**Description:** Consistent error messaging and recovery across all interfaces. Categorizes errors by severity and provides appropriate feedback.

### Error Types

**A. Invalid Input:**
```
[BEEP]
INVALID SELECTION
```
*User pressed wrong key in menu*
*Recovery: Remain in current scene, wait for valid input*

**B. Precondition Failed:**
```
YOU CANNOT DO THAT NOW.
You must have at least one character created.
```
*User tried to enter dungeon without party*
*Recovery: Show reason, return to menu*

**C. Insufficient Resources:**
```
YOU DON'T HAVE ENOUGH GOLD.
Cost: 500 GP
You have: 250 GP
```
*User tried to buy item without enough money*
*Recovery: Return to shop menu*

**D. Character State Violation:**
```
THIS CHARACTER IS DEAD.
Visit the Temple of Cant for resurrection.
```
*User tried to equip item on dead character*
*Recovery: Return to previous menu*

### Visual Pattern

```
┌─────────────────────────────────────┐
│  ⚠ ERROR                            │
├─────────────────────────────────────┤
│  [Error Message]                    │
│  [Optional Details]                 │
│                                     │
│  Press any key to continue...       │
└─────────────────────────────────────┘
```

### TypeScript Implementation

```typescript
type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'FATAL'

interface GameError {
  severity: ErrorSeverity
  message: string
  details?: string
  canRetry: boolean
  soundEffect?: 'beep' | 'error' | 'warning'
}

function handleError(error: GameError): void {
  // Play appropriate sound
  if (error.soundEffect) {
    playSound(error.soundEffect)
  }

  // Display error UI
  displayErrorMessage(error.message)

  if (error.details) {
    displayErrorDetails(error.details)
  }

  // Handle based on severity
  if (error.canRetry) {
    displayPrompt("Press any key to continue...")
    waitForAnyKey()
  } else if (error.severity === 'FATAL') {
    // Return to safe scene (Castle Menu or Title Screen)
    returnToSafeScene()
  }
}

// Example error definitions
const ERRORS = {
  NO_CHARACTERS: {
    severity: 'WARNING',
    message: 'NO CHARACTERS CREATED.',
    details: 'Visit Edge of Town → Training Grounds to create characters.',
    canRetry: true,
    soundEffect: 'warning'
  },

  PARTY_IN_MAZE: {
    severity: 'ERROR',
    message: 'YOUR PARTY IS IN THE MAZE.',
    details: 'You must return to town first.',
    canRetry: false,
    soundEffect: 'error'
  },

  INSUFFICIENT_GOLD: {
    severity: 'INFO',
    message: 'YOU DON\'T HAVE ENOUGH GOLD.',
    details: null,
    canRetry: true,
    soundEffect: 'beep'
  }
}
```

---

## 5. Confirmation Dialog Pattern

**Used In:** Delete Character, Sell Item, Leave Game, Character Death

**Description:** Require explicit confirmation for destructive or irreversible actions. Prevents accidental data loss.

### Visual Pattern

```
┌─────────────────────────────────────┐
│  CONFIRM ACTION                     │
├─────────────────────────────────────┤
│  Are you sure you want to:          │
│  DELETE CHARACTER "Gandalf"?        │
│                                     │
│  This action CANNOT be undone!      │
│                                     │
│  (Y)es  (N)o                        │
└─────────────────────────────────────┘
```

### When to Use

- **Deleting characters** (permanent loss)
- **Selling items** (cannot repurchase same item)
- **Leaving game** (unsaved progress warning)
- **Risky actions** (e.g., kick door, flee combat)

### TypeScript Implementation

```typescript
interface ConfirmationDialog {
  title: string
  message: string
  warning?: string  // Red text, emphasized
  confirmKey: string  // Usually 'Y'
  cancelKey: string   // Usually 'N'
  defaultToSafe?: boolean  // Default to 'N' on invalid input
}

async function confirm(dialog: ConfirmationDialog): Promise<boolean> {
  displayTitle(dialog.title)
  displayMessage(dialog.message)

  if (dialog.warning) {
    displayWarning(dialog.warning)  // Red, bold text
  }

  displayPrompt(`(${dialog.confirmKey})es  (${dialog.cancelKey})o`)

  const key = await waitForSingleKeystroke([
    dialog.confirmKey,
    dialog.cancelKey
  ])

  return key === dialog.confirmKey
}

// Example: Delete character
const confirmed = await confirm({
  title: 'DELETE CHARACTER',
  message: `Delete character "${character.name}"?`,
  warning: 'This action CANNOT be undone!',
  confirmKey: 'Y',
  cancelKey: 'N',
  defaultToSafe: true
})

if (confirmed) {
  deleteCharacter(character)
  showMessage('Character deleted.')
}
```

### Safety Guidelines

- **Always warn** for destructive actions
- **Use (Y)es/(N)o** for binary choices
- **Default to safe option** (No) on invalid input
- **Provide clear consequences** in message
- **Double confirmation** for critical actions (optional)

### Example: Leave Game with Unsaved Progress

```
┌─────────────────────────────────────┐
│  LEAVE GAME                         │
├─────────────────────────────────────┤
│  Your party is IN THE MAZE.         │
│  Progress since last town visit     │
│  will be LOST.                      │
│                                     │
│  Are you sure? (Y/N)                │
└─────────────────────────────────────┘
```

---

## 6. Multi-Step Transaction Pattern

**Used In:** Shop (buy/sell), Temple (resurrect), Inn (rest), Training Grounds (create character)

**Description:** Guide user through multi-step process with validation at each step. Ensures complex operations are completed correctly.

### Flow Structure

```
Step 1: Select Action
  → What do you want to do?

Step 2: Select Target (if needed)
  → Which character?

Step 3: Select Item/Service
  → What item/service?

Step 4: Confirm Transaction
  → Confirm details and cost? (Y/N)

Step 5: Execute
  → Process transaction
  → Update state
  → Show result
```

### Example: Shop - Buy Item

```
┌─────────────────────────────────────┐
│  BOLTAC'S TRADING POST              │
├─────────────────────────────────────┤
│  Step 1: Select Action              │
│  (B)uy  (S)ell  (I)dentify          │
│  User presses: B                    │
├─────────────────────────────────────┤
│  Step 2: Select Character           │
│  Who is buying?                     │
│  1. Gandalf (500 GP)                │
│  2. Corak (300 GP)                  │
│  User enters: 1                     │
├─────────────────────────────────────┤
│  Step 3: Select Item                │
│  ITEMS FOR SALE:                    │
│  1. Long Sword    200 GP            │
│  2. Chain Mail    300 GP            │
│  User enters: 1                     │
├─────────────────────────────────────┤
│  Step 4: Confirm                    │
│  Buy Long Sword for 200 GP?         │
│  Gandalf has 500 GP.                │
│  (Y)es  (N)o                        │
│  User presses: Y                    │
├─────────────────────────────────────┤
│  Step 5: Execute                    │
│  TRANSACTION COMPLETE               │
│  Gandalf purchased Long Sword       │
│  Remaining gold: 300 GP             │
└─────────────────────────────────────┘
```

### TypeScript Implementation

```typescript
interface TransactionStep<TInput, TContext> {
  prompt: string
  validate: (input: TInput, context: TContext) => ValidationResult
  execute: (input: TInput, context: TContext) => StepResult<TContext>
  canCancel?: boolean  // Allow (L)eave to cancel
}

interface StepResult<TContext> {
  success: boolean
  context: TContext  // Updated context for next step
  continue: boolean  // Proceed to next step?
  message?: string
}

async function executeTransaction<TContext>(
  steps: TransactionStep<any, TContext>[],
  initialContext: TContext
): Promise<TransactionResult> {
  let context = initialContext

  for (const step of steps) {
    displayPrompt(step.prompt)

    const input = await waitForInput()

    // Allow cancellation
    if (step.canCancel && input === 'L') {
      return { success: false, cancelled: true }
    }

    // Validate input
    const validation = step.validate(input, context)
    if (!validation.allowed) {
      showError(validation.reason)
      return { success: false, step: step.prompt }
    }

    // Execute step
    const result = step.execute(input, context)
    context = result.context

    if (result.message) {
      showMessage(result.message)
    }

    if (!result.continue) {
      return { success: result.success, context }
    }
  }

  return { success: true, context }
}
```

### Cancellation Behavior

- **Allow (L)eave at each step** (except final confirmation)
- **Return to parent scene** without changes
- **No partial transactions** (all-or-nothing)
- **Clear feedback** on cancellation

---

## 7. List Navigation Pattern

**Used In:** Shop (item catalog), Spell selection, Inventory, Character roster

**Description:** Navigate long lists with pagination or scrolling. Handles catalogs too large to fit on one screen.

### Visual Pattern

```
┌─────────────────────────────────────┐
│  BOLTAC'S TRADING POST              │
├─────────────────────────────────────┤
│  WEAPONS FOR SALE:       (Page 1/3) │
│                                     │
│  1. Long Sword         500 GP       │
│  2. Short Sword        300 GP       │
│  3. Dagger             100 GP       │
│  4. Mace               400 GP       │
│  5. Staff              200 GP       │
│                                     │
│  (N)ext  (P)rev  (#)Select  (L)eave │
└─────────────────────────────────────┘
```

### Input Handling

- **(N)ext** - Next page
- **(P)rev** - Previous page
- **Number** - Select item on current page
- **(L)eave** - Exit without selecting

### TypeScript Implementation

```typescript
interface ListNavigation<T> {
  items: T[]
  itemsPerPage: number
  currentPage: number
  renderItem: (item: T, index: number) => string
  title?: string
}

async function navigateList<T>(list: ListNavigation<T>): Promise<T | null> {
  while (true) {
    // Calculate pagination
    const totalPages = Math.ceil(list.items.length / list.itemsPerPage)
    const startIndex = (list.currentPage - 1) * list.itemsPerPage
    const endIndex = Math.min(startIndex + list.itemsPerPage, list.items.length)
    const pageItems = list.items.slice(startIndex, endIndex)

    // Display current page
    if (list.title) {
      displayTitle(list.title)
    }
    displayPageInfo(list.currentPage, totalPages)

    pageItems.forEach((item, idx) => {
      const displayIndex = idx + 1
      const renderedItem = list.renderItem(item, displayIndex)
      displayListItem(displayIndex, renderedItem)
    })

    displayNavigationPrompt('(N)ext  (P)rev  (#)Select  (L)eave')

    // Wait for input
    const validKeys = ['N', 'P', 'L', ...pageItems.map((_, i) => `${i + 1}`)]
    const key = await waitForSingleKeystroke(validKeys)

    // Handle navigation
    if (key === 'N') {
      list.currentPage = Math.min(list.currentPage + 1, totalPages)
    } else if (key === 'P') {
      list.currentPage = Math.max(list.currentPage - 1, 1)
    } else if (key === 'L') {
      return null  // Cancel
    } else {
      // Selection
      const index = parseInt(key) - 1
      const globalIndex = startIndex + index
      return list.items[globalIndex]
    }
  }
}

// Example: Shop item catalog
const selectedItem = await navigateList({
  items: shopInventory,
  itemsPerPage: 10,
  currentPage: 1,
  renderItem: (item, idx) => `${item.name.padEnd(20)} ${item.price} GP`,
  title: 'ITEMS FOR SALE'
})

if (selectedItem) {
  purchaseItem(selectedItem)
}
```

### Variants

**A. Simple List (< 10 items):**
- No pagination needed
- Show all items at once
- Number selection only

**B. Paginated List (10+ items):**
- Show 5-10 items per page
- Next/Previous navigation
- Page indicator (e.g., "Page 2/5")

**C. Filtered List:**
- Add filter option (e.g., "Show weapons only")
- Filter applied before pagination
- Show filter status in header

---

## Pattern Usage Matrix

| Scene | Menu | Char Select | Keystroke | Error | Confirm | Transaction | List Nav |
|-------|:----:|:-----------:|:---------:|:-----:|:-------:|:-----------:|:--------:|
| Title Screen | ✓ | - | ✓ | ✓ | - | - | - |
| Castle Menu | ✓ | - | ✓ | ✓ | - | - | - |
| Training Grounds | ✓ | - | ✓ | ✓ | ✓ | ✓ | - |
| Tavern | ✓ | ✓ | ✓ | ✓ | - | - | - |
| Shop | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Temple | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Inn | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Edge of Town | ✓ | - | ✓ | ✓ | ✓ | - | - |
| Utilities | ✓ | - | ✓ | ✓ | - | - | - |
| Camp | ✓ | ✓ | ✓ | ✓ | - | - | - |
| Maze | - | - | ✓ | ✓ | - | - | - |
| Combat | - | - | ✓ | ✓ | - | - | - |
| Chest | ✓ | ✓ | ✓ | ✓ | - | ✓ | - |
| Char Inspect | - | - | ✓ | ✓ | - | - | - |

**Legend:**
- ✓ = Pattern used in this scene
- - = Pattern not used in this scene

---

## Accessibility Considerations

### Keyboard Navigation

- **All actions accessible via keyboard** (no mouse required)
- **Clear visual focus indicators** for current selection
- **Logical tab order** (if using Tab key navigation)
- **Escape key support** for canceling operations

### Visual Feedback

- **Clear action prompts** (e.g., "(Y)es (N)o")
- **Error messages stand out** (color, position, icon)
- **Success confirmations** after operations
- **Status indicators** for character health, inventory, etc.

### Consistent Behavior

- **Same keys do same things** across all scenes
- **(L)eave always returns** to parent scene
- **Number keys select** from numbered lists
- **Letter keys activate** menu options

### Audio Feedback (Optional)

- **Success sound** for valid actions
- **Error beep** for invalid input
- **Confirmation chime** for transactions
- **Warning sound** for dangerous actions

---

## Implementation Notes

### Pattern Services

```typescript
interface UIPatternService {
  // Pattern 1: Standard Menu
  renderMenu(menu: MenuPattern): Promise<string>

  // Pattern 2: Character Selection
  selectCharacter(pattern: CharacterSelectionPattern): Promise<Character | null>

  // Pattern 3: Single-Keystroke Input
  waitForKeystroke(validKeys: string[]): Promise<string>

  // Pattern 4: Error Handling
  showError(error: GameError): void

  // Pattern 5: Confirmation Dialog
  confirm(dialog: ConfirmationDialog): Promise<boolean>

  // Pattern 6: Multi-Step Transaction
  executeTransaction<T>(steps: TransactionStep<T>[]): Promise<TransactionResult>

  // Pattern 7: List Navigation
  navigateList<T>(list: ListNavigation<T>): Promise<T | null>
}
```

### Reusable Components

When implementing these patterns in React/TypeScript, create reusable components:

- `<MenuComponent>` - Standard menu renderer (Pattern 1)
- `<CharacterList>` - Character selection list (Pattern 2)
- `<KeystrokeInput>` - Single-key input handler (Pattern 3)
- `<ErrorDisplay>` - Error message display (Pattern 4)
- `<ConfirmDialog>` - Confirmation dialog (Pattern 5)
- `<TransactionWizard>` - Multi-step transaction flow (Pattern 6)
- `<ListNavigator>` - Paginated list navigation (Pattern 7)

### State Management Integration

All patterns should integrate with global state management:

```typescript
// Example: Menu pattern with state
function renderMenuWithState(
  menu: MenuPattern,
  state: GameState
): Promise<GameState> {
  return new Promise((resolve) => {
    renderMenu({
      ...menu,
      actions: menu.actions.map(action => ({
        ...action,
        handler: () => {
          const newState = action.handler(state)
          resolve(newState)
        }
      }))
    })
  })
}
```

---

## Related Documentation

- [Individual Scenes](./scenes/) - See patterns in context
- [State Management](./state-management.md) - State transitions and persistence
- [Input Reference](./input-reference.md) - Complete key bindings reference
- [Navigation Map](./navigation-map.md) - Scene flow and transitions
