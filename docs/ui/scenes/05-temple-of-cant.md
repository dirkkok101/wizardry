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
- **Main:** List of afflicted characters
- **Sidebar:** Service costs and payer selection
- **Status:** Character condition details
- **Messages:** Service results (success/failure)

### ASCII Mockup

```
┌─────────────────────────────────────┐
│  TEMPLE OF CANT                     │
├─────────────────────────────────────┤
│  CHARACTERS NEEDING HELP:           │
│                                     │
│  1. Gandalf    POISONED             │
│  2. Corak      DEAD                 │
│  3. PriestBob  ASHES                │
│                                     │
│  Select character (1-3):            │
│                                     │
├─────────────────────────────────────┤
│  Service: RESURRECTION              │
│  Tithe Required: 500 gold           │
│                                     │
│  Who will pay?                      │
│  1. Gandalf  (300 gp)               │
│  2. Thief    (150 gp)               │
│  3. Party Pool (200 gp)             │
│                                     │
│  Select payer (1-3):                │
└─────────────────────────────────────┘
```

**Visual Notes:**
- Automatically filters to only show afflicted characters
- Tithe cost displayed before service
- Payer selection shows available gold for each option
- Success/failure results shown prominently

---

## Service Flow

### Overall Process

1. **Entry:** Temple displays afflicted characters
2. **Selection:** Player selects character to help
3. **Service Identification:** Temple determines required service
4. **Tithe Calculation:** Cost based on service and character level
5. **Payer Selection:** Choose who pays (party member or party pool)
6. **Service Attempt:** Roll for success (resurrection only)
7. **Result:** Success message or failure consequences
8. **Return:** Automatic return to Castle Menu

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

### (L) Leave Temple

**Description:** Return to Castle Menu (if no service selected)

**Key Binding:** L (case-insensitive) or ESC

**Requirements:**
- None (always available before service selection)

**Flow:**
1. User presses 'L' or ESC
2. Cancel service selection
3. Return to Castle Menu

**Validation:**

```typescript
function canLeaveTemple(state: GameState): { allowed: boolean; reason?: string } {
  return { allowed: true }  // Always allowed
}
```

**State Changes:**
- `state.currentScene = SceneType.CASTLE_MENU`
- No changes saved (service not performed)

**UI Feedback:**
- No feedback message (instant transition)

**Transitions:**
- → Castle Menu

---

### Invalid Key

**Description:** User presses any other key

**Behavior:**
- Beep sound (optional)
- Error message: "INVALID SELECTION"
- Remain in Temple

---

## Navigation

### Exits

| Action | Key | Destination | Condition |
|--------|-----|-------------|-----------|
| Select Character | 1-N | Service Flow | Character needs help |
| Leave | (L)/ESC | Castle Menu | Before service |
| Auto-return | N/A | Castle Menu | After service |

### Parent Scene

- Castle Menu → (T) → Temple

### Child Scenes

- Temple → Service → Temple (result display)
- Temple → Auto-return → Castle Menu

---

## State Management

### Scene State

```typescript
interface TempleState {
  mode: 'CHARACTER_SELECT' | 'PAYER_SELECT' | 'SERVICE_RESULT'
  selectedCharacter: Character | null
  requiredService: ServiceType | null
  tithe: number
  payer: Character | Party | null
  serviceSuccess: boolean | null
}

enum ServiceType {
  CURE_POISON = 'CURE_POISON',
  CURE_PARALYSIS = 'CURE_PARALYSIS',
  RESURRECT = 'RESURRECT',
  RESTORE = 'RESTORE'
}
```

**Notes:**
- Automatic service type detection based on character status
- Multi-step flow: select character → select payer → perform service
- Auto-return to Castle Menu after service

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

### Services Used

- `TempleService.getAfflictedCharacters(roster)`
- `TempleService.calculateTithe(character, serviceType)`
- `TempleService.curePoison(character)`
- `TempleService.cureParalysis(character)`
- `TempleService.attemptResurrection(character)`
- `TempleService.attemptRestoration(character)`
- `SaveService.autoSave(state)`

### Commands

- `SelectCharacterCommand` - Choose character to help
- `SelectPayerCommand` - Choose who pays
- `PerformServiceCommand` - Execute service
- `LeaveTempleCommand` - Return to Castle

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
