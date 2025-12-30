# ResurrectionService

**Pure function service for character resurrection via DI and KADORTO spells.**

## Responsibility

Manages resurrection mechanics, calculates resurrection success rates, handles DI spell (resurrect from death) and KADORTO spell (raise from ashes), and manages resurrection failure consequences (death → ashes → lost forever).

## API Reference

### resurrectWithDI

Attempt to resurrect dead character with DI spell.

**Signature**:
```typescript
function resurrectWithDI(
  gameState: GameState,
  characterId: string,
  casterLevel: number
): { success: boolean; gameState: GameState }
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character to resurrect
- `casterLevel`: Priest level (affects success rate)

**Returns**: Success flag and new game state

**Throws**:
- `CharacterNotFoundError` if character doesn't exist
- `CharacterNotDeadError` if character not in "dead" state (use KADORTO for ashes)

**Example**:
```typescript
// Level 13 priest casts DI
const result = ResurrectionService.resurrectWithDI(gameState, "char-123", 13)
// result.success === true (~90% success rate)
// result.gameState.roster.get("char-123").status === "alive"
// result.gameState.roster.get("char-123").hp === 1 (resurrected with 1 HP)

// Failed resurrection
const failed = ResurrectionService.resurrectWithDI(gameState, "char-456", 7)
// failed.success === false (~10% failure rate)
// failed.gameState.roster.get("char-456").status === "ashes" (now ashes)
```

### raiseWithKADORTO

Attempt to raise character from ashes with KADORTO spell.

**Signature**:
```typescript
function raiseWithKADORTO(
  gameState: GameState,
  characterId: string,
  casterLevel: number
): { success: boolean; gameState: GameState }
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: ID of character to raise
- `casterLevel`: Priest level (affects success rate)

**Returns**: Success flag and new game state

**Throws**:
- `CharacterNotFoundError` if character doesn't exist
- `CharacterNotAshesError` if character not in "ashes" state

**Example**:
```typescript
// Level 13 priest casts KADORTO
const result = ResurrectionService.raiseWithKADORTO(gameState, "char-123", 13)
// result.success === true (~50% success rate)
// result.gameState.roster.get("char-123").status === "alive"
// result.gameState.roster.get("char-123").hp === 1

// Failed resurrection
const failed = ResurrectionService.raiseWithKADORTO(gameState, "char-456", 7)
// failed.success === false (~50% failure rate)
// failed.gameState.roster.has("char-456") === false (lost forever)
```

### calculateDISuccessRate

Calculate DI spell success rate.

**Signature**:
```typescript
function calculateDISuccessRate(
  casterLevel: number,
  targetVitality: number
): number
```

**Parameters**:
- `casterLevel`: Priest's character level
- `targetVitality`: Target character's VIT stat

**Returns**: Success probability (0.0-1.0)

**Example**:
```typescript
const successRate = ResurrectionService.calculateDISuccessRate(13, 12)
// successRate = 0.90 (90% success)

const lowRate = ResurrectionService.calculateDISuccessRate(7, 8)
// lowRate = 0.75 (75% success, lower level priest)
```

### calculateKADORTOSuccessRate

Calculate KADORTO spell success rate.

**Signature**:
```typescript
function calculateKADORTOSuccessRate(
  casterLevel: number,
  targetVitality: number
): number
```

**Parameters**:
- `casterLevel`: Priest's character level
- `targetVitality`: Target character's VIT stat

**Returns**: Success probability (0.0-1.0)

**Example**:
```typescript
const successRate = ResurrectionService.calculateKADORTOSuccessRate(13, 12)
// successRate = 0.50 (50% success)

const lowRate = ResurrectionService.calculateKADORTOSuccessRate(7, 8)
// lowRate = 0.30 (30% success, much riskier at low level)
```

### canResurrect

Check if character can be resurrected with DI.

**Signature**:
```typescript
function canResurrect(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: `true` if character is "dead" (not ashes or lost)

**Example**:
```typescript
const canRes = ResurrectionService.canResurrect(deadCharacter)
// canRes === true (DI spell can resurrect)

const cannotRes = ResurrectionService.canResurrect(ashesCharacter)
// cannotRes === false (need KADORTO, not DI)
```

### canRaiseFromAshes

Check if character can be raised from ashes with KADORTO.

**Signature**:
```typescript
function canRaiseFromAshes(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: `true` if character status is "ashes"

**Example**:
```typescript
const canRaise = ResurrectionService.canRaiseFromAshes(ashesCharacter)
// canRaise === true (KADORTO can raise)

const cannotRaise = ResurrectionService.canRaiseFromAshes(deadCharacter)
// cannotRaise === false (use DI instead)
```

### getResurrectionCost

Get gold cost for temple resurrection.

**Signature**:
```typescript
function getResurrectionCost(
  character: Character,
  resurrectionType: "DI" | "KADORTO"
): number
```

**Parameters**:
- `character`: Character to resurrect
- `resurrectionType`: Type of resurrection

**Returns**: Gold cost for temple service

**Example**:
```typescript
const diCost = ResurrectionService.getResurrectionCost(character, "DI")
// diCost = 200 (temple charges 200 gold for DI)

const kadortoCost = ResurrectionService.getResurrectionCost(character, "KADORTO")
// kadortoCost = 500 (temple charges 500 gold for KADORTO)
```

### resurrectAtTemple

Resurrect character at temple (guaranteed success, costs gold).

**Signature**:
```typescript
function resurrectAtTemple(
  gameState: GameState,
  characterId: string,
  resurrectionType: "DI" | "KADORTO"
): GameState
```

**Parameters**:
- `gameState`: Current game state
- `characterId`: Character to resurrect
- `resurrectionType`: DI or KADORTO

**Returns**: New game state with character resurrected, gold deducted

**Throws**:
- `CharacterNotFoundError` if character doesn't exist
- `InsufficientGoldError` if party doesn't have enough gold
- `InvalidResurrectionTypeError` if wrong resurrection type for character state

**Example**:
```typescript
// Temple DI resurrection (guaranteed success)
const newState = ResurrectionService.resurrectAtTemple(gameState, "char-123", "DI")
// newState.roster.get("char-123").status === "alive"
// newState.party.gold -= 200
```

### applyResurrectionPenalty

Apply stat penalties for resurrection (VIT loss).

**Signature**:
```typescript
function applyResurrectionPenalty(character: Character): Character
```

**Parameters**:
- `character`: Resurrected character

**Returns**: Character with reduced VIT (permanent penalty)

**Example**:
```typescript
const originalVIT = character.stats.vit // 12
const penalized = ResurrectionService.applyResurrectionPenalty(character)
// penalized.stats.vit = 11 (lost 1 VIT permanently)
```

### getResurrectionMessage

Get message for resurrection result.

**Signature**:
```typescript
function getResurrectionMessage(
  characterName: string,
  success: boolean,
  resurrectionType: "DI" | "KADORTO"
): string
```

**Parameters**:
- `characterName`: Character name
- `success`: Whether resurrection succeeded
- `resurrectionType`: DI or KADORTO

**Returns**: Formatted message string

**Example**:
```typescript
const successMsg = ResurrectionService.getResurrectionMessage("Gandalf", true, "DI")
// successMsg = "Gandalf has been resurrected! (1 HP)"

const failMsg = ResurrectionService.getResurrectionMessage("Gandalf", false, "DI")
// failMsg = "Gandalf's body crumbles to ashes..."

const lostMsg = ResurrectionService.getResurrectionMessage("Gandalf", false, "KADORTO")
// lostMsg = "Gandalf is lost forever..."
```

## Dependencies

Uses:
- `DeathService` (manage death state transitions)
- `CharacterService` (apply stat penalties)
- `RandomService` (RNG for resurrection rolls)
- `ValidationService` (validate character states)

## Testing

See [ResurrectionService.test.ts](../../tests/services/ResurrectionService.test.ts)

**Key test cases**:
- Resurrect with DI (success)
- Resurrect with DI (failure, turns to ashes)
- Resurrect living character with DI (throws error)
- Raise with KADORTO (success)
- Raise with KADORTO (failure, lost forever)
- Raise dead character with KADORTO (throws error, need DI)
- Calculate DI success rate (various levels and VIT)
- Calculate KADORTO success rate (various levels and VIT)
- Check if can resurrect (dead vs ashes vs lost)
- Check if can raise from ashes (ashes only)
- Get resurrection cost (DI vs KADORTO)
- Resurrect at temple (guaranteed success, costs gold)
- Resurrect at temple without gold (throws error)
- Apply resurrection penalty (VIT loss)
- Get resurrection messages (success and failure)
- Character not found throws error

## Related

- [DeathService](./DeathService.md) - Manages death state
- [BodyRecoveryService](./BodyRecoveryService.md) - Retrieves bodies from dungeon
- [TempleService](./TempleService.md) - Temple resurrection services
- [SpellService](./SpellService.md) - DI and KADORTO spell casting
- [DI Spell](../research/spell-reference.md) - DI spell details
- [KADORTO Spell](../research/spell-reference.md) - KADORTO spell details
- [Death & Recovery Game Design](../game-design/09-death-recovery.md) - Resurrection mechanics
