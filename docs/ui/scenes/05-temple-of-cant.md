# Temple of Cant

## Overview

**Description:** Healing and resurrection service center. The only place to cure ailments, heal poison/paralysis, and resurrect dead party members.

**Scene Type:** Safe Zone (auto-saves after services)

**Location in Game Flow:** Critical recovery hub - essential for maintaining party health and recovering from death

---

## Entry Conditions

### From Where

**Parent Scene(s):**
- Castle Menu → (T)emple of Cant → Temple

**Direct Access:**
- Accessible directly from Castle Menu
- One of the primary town services

### Requirements

**State Requirements:**
- [ ] None (always accessible from Castle)

**Note:** Temple automatically displays list of characters needing help. If no characters need help, shows message and returns to Castle.

### State Prerequisites

```typescript
interface TempleEntryState {
  characterRoster: Character[]  // All characters
  afflictedCharacters: Character[]  // Characters needing help
  partyMembers: Character[]  // For payment selection
}
```

---

## UI Layout

### Screen Regions

- **Header:** "TEMPLE OF CANT" title
- **Content:** Grid of character cards showing afflicted characters
- **Footer:** Service menu with keyboard shortcuts
- **Dialog:** Confirmation dialog for service execution

### ASCII Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  TEMPLE OF CANT                              Gold: 1,500    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  │ Gandalf         │  │ Corak           │  │ PriestBob       │
│  │ Mage Lvl 5      │  │ Fighter Lvl 3   │  │ Priest Lvl 7    │
│  │ HP: 15/25       │  │ HP: 0/20        │  │ HP: 0/30        │
│  │ POISONED        │  │ DEAD            │  │ ASHES           │
│  │                 │  │                 │  │                 │
│  │ [Inspect]       │  │ [Inspect]       │  │ [Inspect]       │
│  │ [Cure (250g)]   │  │ [Resurrect(750g)]│ │ [Restore(3500g)]│
│  └─────────────────┘  └─────────────────┘  └─────────────────┘
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  (ESC) Return to Castle                                     │
└─────────────────────────────────────────────────────────────┘
```

**Empty State (when no afflicted characters):**

```
┌─────────────────────────────────────────────────────────────┐
│  TEMPLE OF CANT                              Gold: 1,500    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│              Your party is in good health.                  │
│        No one requires the temple's services at this time.  │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  (ESC) Return to Castle                                     │
└─────────────────────────────────────────────────────────────┘
```

**Visual Notes:**
- Character cards automatically filter to show only afflicted characters
- **Character-specific actions on cards**: Each card shows service button based on status
  - POISONED → "Cure Poison (Xg)" button
  - PARALYZED → "Cure Paralysis (Xg)" button
  - DEAD → "Resurrect (Xg)" button
  - ASHES → "Restore (Xg)" button
- Service buttons are disabled if party can't afford the tithe
- **Party-level actions in footer**: Only navigation (ESC to return)
- Confirmation dialog shows before executing service

**Design Principle:**
- **Footer menu** = Party-level actions (navigation only)
- **Character cards** = Character-specific actions (services with costs)

---

## Service Flow

### Overall Process

1. **Entry:** Temple displays afflicted characters in grid with service buttons
2. **Character Selection:** Player clicks service button on specific character card
3. **Confirmation Dialog:** Shows character name, service action, and cost
4. **Service Execution:** Deducts party gold and performs service
5. **Result Display:** Success or error message shown
6. **UI Update:** Character removed from grid if cured, buttons update if gold changes

**Key Design Principles:**
- **Character-specific actions on cards**: Services apply to individual characters, so buttons are on cards
- **Party-level actions in footer**: Only navigation (ESC to return to Castle)
- Uses party gold pool (no payer selection)
- Service buttons show cost and are disabled if unaffordable
- Both keyboard (via card focus) and mouse (click) supported

---

## Available Services

### Cure Poison

**Description:** Remove poison status from character

**Automatic Service:** Selected when character has POISONED status

**Requirements:**
- Character status = POISONED
- Payer has sufficient gold

**Flow:**
1. Character with POISONED status selected
2. Display tithe cost
3. Select payer
4. Deduct gold
5. Remove poison status
6. Set HP to 1 (if at 0)
7. Show success message

**Tithe Calculation:**

```typescript
function calculatePoisonCureTithe(character: Character): number {
  const baseCost = 50
  const levelMultiplier = character.level
  return baseCost * levelMultiplier
}
```

**Validation:**

```typescript
function canCurePoison(character: Character, payer: Character | Party): { allowed: boolean; reason?: string } {
  if (character.status !== CharacterStatus.POISONED) {
    return { allowed: false, reason: "Character is not poisoned" }
  }

  const tithe = calculatePoisonCureTithe(character)
  if (!hasEnoughGold(payer, tithe)) {
    return { allowed: false, reason: "Not enough gold" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.status = CharacterStatus.OK`
- `character.poisoned = false`
- `character.hp = Math.max(character.hp, 1)`
- `payer.gold -= tithe` (or `party.pooledGold -= tithe`)
- Auto-save after service

**UI Feedback:**
- Success: "[Name] is cured of poison!"
- Failure: "Not enough gold for tithe"

**Success Rate:** 100% (always succeeds if paid)

---

### Cure Paralysis

**Description:** Remove paralysis status from character

**Automatic Service:** Selected when character has PARALYZED status

**Requirements:**
- Character status = PARALYZED
- Payer has sufficient gold

**Flow:**
1. Character with PARALYZED status selected
2. Display tithe cost
3. Select payer
4. Deduct gold
5. Remove paralysis status
6. Show success message

**Tithe Calculation:**

```typescript
function calculateParalysisCureTithe(character: Character): number {
  const baseCost = 100
  const levelMultiplier = character.level
  return baseCost * levelMultiplier
}
```

**Validation:**

```typescript
function canCureParalysis(character: Character, payer: Character | Party): { allowed: boolean; reason?: string } {
  if (character.status !== CharacterStatus.PARALYZED) {
    return { allowed: false, reason: "Character is not paralyzed" }
  }

  const tithe = calculateParalysisCureTithe(character)
  if (!hasEnoughGold(payer, tithe)) {
    return { allowed: false, reason: "Not enough gold" }
  }

  return { allowed: true }
}
```

**State Changes:**
- `character.status = CharacterStatus.OK`
- `character.paralyzed = false`
- `payer.gold -= tithe` (or `party.pooledGold -= tithe`)
- Auto-save after service

**UI Feedback:**
- Success: "[Name] can move again!"
- Failure: "Not enough gold for tithe"

**Success Rate:** 100% (always succeeds if paid)

---

### Resurrection (from DEAD)

**Description:** Attempt to restore dead character to life

**Automatic Service:** Selected when character has DEAD status

**Requirements:**
- Character status = DEAD
- Payer has sufficient gold

**Flow:**
1. Character with DEAD status selected
2. Display tithe cost
3. Select payer
4. Deduct gold
5. Roll resurrection check (based on Vitality)
6. On success: Character restored to life (1 HP)
7. On failure: Character becomes ASHES
8. Show result message

**Tithe Calculation:**

```typescript
function calculateResurrectionTithe(character: Character): number {
  const baseCost = 250
  const levelMultiplier = character.level
  return baseCost * levelMultiplier
}
```

**Success Calculation:**

```typescript
function calculateResurrectionChance(character: Character): number {
  const baseChance = 50
  const vitalityBonus = character.vitality * 2
  return Math.min(baseChance + vitalityBonus, 95)  // Max 95%
}

function attemptResurrection(character: Character): boolean {
  const chance = calculateResurrectionChance(character)
  const roll = random(1, 100)
  return roll <= chance
}
```

**Validation:**

```typescript
function canResurrect(character: Character, payer: Character | Party): { allowed: boolean; reason?: string } {
  if (character.status !== CharacterStatus.DEAD) {
    return { allowed: false, reason: "Character is not dead" }
  }

  const tithe = calculateResurrectionTithe(character)
  if (!hasEnoughGold(payer, tithe)) {
    return { allowed: false, reason: "Not enough gold" }
  }

  return { allowed: true }
}
```

**State Changes:**

**On Success:**
- `character.status = CharacterStatus.OK`
- `character.hp = 1`
- `payer.gold -= tithe`
- Auto-save

**On Failure:**
- `character.status = CharacterStatus.ASHES`
- `payer.gold -= tithe` (still charged!)
- Auto-save

**UI Feedback:**
- Success: "[Name] is restored to life!"
- Failure: "[Name] cannot be resurrected and is now ASHES!"

**Success Rate:** Based on Vitality (50% + VIT × 2%, max 95%)

---

### Restoration (from ASHES)

**Description:** Last chance resurrection from ashes (advanced service)

**Automatic Service:** Selected when character has ASHES status

**Requirements:**
- Character status = ASHES
- Payer has sufficient gold (very expensive!)

**Flow:**
1. Character with ASHES status selected
2. Display tithe cost (very high)
3. Select payer
4. Deduct gold
5. Roll restoration check (lower success rate)
6. On success: Character restored to life (1 HP)
7. On failure: Character becomes LOST (permanent death)
8. Show result message

**Tithe Calculation:**

```typescript
function calculateRestorationTithe(character: Character): number {
  const baseCost = 500  // Very expensive!
  const levelMultiplier = character.level
  return baseCost * levelMultiplier
}
```

**Success Calculation:**

```typescript
function calculateRestorationChance(character: Character): number {
  const baseChance = 25  // Lower base than resurrection
  const vitalityBonus = character.vitality
  return Math.min(baseChance + vitalityBonus, 50)  // Max 50%
}

function attemptRestoration(character: Character): boolean {
  const chance = calculateRestorationChance(character)
  const roll = random(1, 100)
  return roll <= chance
}
```

**Validation:**

```typescript
function canRestore(character: Character, payer: Character | Party): { allowed: boolean; reason?: string } {
  if (character.status !== CharacterStatus.ASHES) {
    return { allowed: false, reason: "Character is not ashes" }
  }

  const tithe = calculateRestorationTithe(character)
  if (!hasEnoughGold(payer, tithe)) {
    return { allowed: false, reason: "Not enough gold" }
  }

  return { allowed: true }
}
```

**State Changes:**

**On Success:**
- `character.status = CharacterStatus.OK`
- `character.hp = 1`
- `payer.gold -= tithe`
- Auto-save

**On Failure:**
- `character.status = CharacterStatus.LOST`
- `payer.gold -= tithe` (still charged!)
- Auto-save

**UI Feedback:**
- Success: "[Name] is miraculously restored to life!"
- Failure: "[Name] is LOST FOREVER!"
- Warning: "This is your last chance. Failure will result in permanent death."

**Success Rate:** Based on Vitality (25% + VIT, max 50%)

**Note:** LOST is permanent death. Character cannot be recovered and must be deleted.

---

## Additional Actions

### Return to Castle (ESC)

**Description:** Navigate back to Castle Menu

**Key Binding:** ESC

**Requirements:**
- None (always available)

**Flow:**
1. User presses ESC
2. Navigate to Castle Menu via Angular Router
3. Scene transition handled by SceneNavigationService

**Implementation:**

```typescript
handleFooterAction(itemId: string): void {
  if (itemId === 'return') {
    this.router.navigate(['/castle-menu']);
    return;
  }
  // ... service selection logic
}
```

**State Changes:**
- Scene navigation handled by router
- No state changes (services only modify state on confirmation)

**Transitions:**
- → Castle Menu

---

## Navigation

### Keyboard Shortcuts

| Action | Key | Enabled When | Effect |
|--------|-----|--------------|--------|
| Return to Castle | ESC | Always | Navigate to Castle Menu |
| Confirm Service | Enter/Y | Dialog open | Execute pending service |
| Cancel Service | Esc/N | Dialog open | Close confirmation dialog |

**Note:** Temple services (Cure Poison, Cure Paralysis, Resurrect, Restore) are accessed via
character card buttons, not footer menu shortcuts. This follows the design principle that
character-specific actions belong on character cards, while party-level actions belong in the footer.

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Return | ESC | Castle Menu | Always available |

### Parent Scene

- Castle Menu → (T) → Temple

### Child Scenes

- None (single-scene flow with confirmation dialog)

---

## State Management

### Component Signals

```typescript
interface TempleComponentState {
  // Confirmation dialog state
  showConfirmation: signal<boolean>
  confirmationMessage: signal<string>
  pendingService: signal<{ type: ServiceType; characterId: string } | null>
  errorMessage: signal<string | null>

  // Computed properties
  currentParty: computed<Party>
  afflictedCharacters: computed<Character[]>
  footerMenuItems: computed<MenuItem[]>
}

enum ServiceType {
  CURE_POISON = 'CURE_POISON',
  CURE_PARALYSIS = 'CURE_PARALYSIS',
  RESURRECT = 'RESURRECT',
  RESTORE = 'RESTORE'
}
```

**Notes:**
- Single-state architecture (no view machine modes)
- Service menu items enabled/disabled via computed signal
- Confirmation dialog for service execution
- Error messages displayed inline

### Global State Changes

**On Entry:**
- `state.currentScene = SceneType.TEMPLE`
- Load afflicted characters
- If no afflicted characters: show message and return to Castle

**On Service Success:**
- Update character status
- Update payer gold
- Auto-save

**On Service Failure (resurrection/restoration):**
- Update character status (ASHES or LOST)
- Update payer gold (still charged!)
- Auto-save

**On Exit:**
- Auto-return to Castle Menu
- Save all changes

### Persistence

- **Auto-save:** Yes, after each service
- **Manual save:** No (auto-saves are sufficient)
- **Safe zone:** Yes (but services can fail!)

---

## Implementation Notes

### Component Architecture

**Component:** `TempleComponent` (Angular standalone component)

**Imports:**
- `SceneTitleComponent` - Header with scene title
- `SceneFooterComponent` - Footer menu with keyboard shortcuts
- `CharacterCardComponent` - Display afflicted characters
- `ConfirmationDialogComponent` - Service confirmation

**Services Used:**
- `GameStateService` - Reactive game state management
- `TempleService.performService()` - Execute service with state updates
- `TempleService.calculateTithe()` - Calculate service cost
- `Router` - Navigation to Castle Menu and Character Inspection

**Key Methods:**
- `handleFooterAction(itemId)` - Process service selection
- `confirmService()` - Execute service via TempleService
- `cancelService()` - Close confirmation dialog
- `handleCharacterAction(event)` - Navigate to character inspection

### Edge Cases

1. **No afflicted characters:**
   - Show "No one needs help" message
   - Auto-return to Castle Menu
   - No services available

2. **Not enough gold:**
   - Cannot perform service
   - Show "Not enough gold" error
   - Return to Castle Menu

3. **Resurrection failure:**
   - Character becomes ASHES (more severe)
   - Gold still deducted
   - Must pay even more for restoration

4. **Restoration failure:**
   - Character becomes LOST (permanent death)
   - Gold still deducted
   - Character cannot be recovered

5. **Character LOST:**
   - No service available
   - Must delete character from roster
   - Permanent consequence

6. **Party pool for payment:**
   - Can use party pooled gold
   - Useful when individual members don't have enough

7. **High Vitality advantage:**
   - Characters with high VIT have better resurrection chance
   - Encourages investing in Vitality
   - Max 95% for resurrection, 50% for restoration

### Technical Considerations

- **Service type detection:** Automatic based on character status
- **Success rate calculation:** Based on Vitality stat
- **Gold deduction:** Even on failure (risk management)
- **Auto-save timing:** After each service completion
- **LOST status:** Permanent, requires manual roster cleanup

---

## Testing Scenarios

### Test 1: Cure Poison

```
1. Character has POISONED status
2. From Castle Menu, press (T)
3. Verify Temple displays poisoned character
4. Select character
5. Verify tithe cost displayed
6. Select payer with enough gold
7. Verify gold deducted
8. Verify character status = OK
9. Verify auto-save triggered
10. Verify auto-return to Castle Menu
```

### Test 2: Successful Resurrection

```
1. Character has DEAD status
2. Enter Temple
3. Select dead character
4. Verify tithe cost displayed (expensive!)
5. Select payer
6. Verify resurrection attempt
7. If success: verify character restored to life (1 HP)
8. Verify gold deducted
9. Verify auto-save triggered
```

### Test 3: Failed Resurrection

```
1. Character has DEAD status
2. Enter Temple
3. Select dead character
4. Pay tithe
5. Resurrection fails (based on VIT roll)
6. Verify character becomes ASHES
7. Verify gold still deducted
8. Verify warning message shown
9. Verify auto-save triggered
```

### Test 4: Restoration from Ashes

```
1. Character has ASHES status
2. Enter Temple
3. Select character in ashes
4. Verify very high tithe cost
5. Verify low success rate warning
6. Select payer (may need party pool)
7. Pay tithe
8. Roll restoration attempt
9. If success: character restored
10. If failure: character becomes LOST
11. Verify gold deducted either way
```

### Test 5: No Afflicted Characters

```
1. All characters are OK
2. Enter Temple
3. Verify "No one needs help" message
4. Verify auto-return to Castle Menu
5. No services performed
```

---

## Related Documentation

- [Castle Menu](./01-castle-menu.md) - Parent scene
- [Character Status](../../systems/character-system.md) - Status conditions
- [Death and Resurrection](../../systems/resurrection-system.md) - Mechanics
- [Economy System](../../systems/economy-system.md) - Tithe costs
- [Navigation Map](../navigation-map.md) - Complete navigation flow
