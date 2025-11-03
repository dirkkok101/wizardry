# PartyService

**Pure function service for party management.**

## Responsibility

Manages party composition, formation (front/back rows), membership changes, gold management, and formation movement. Handles validation of party size constraints, alignment rules, and provides utilities for gold operations at the party level (replacing individual character gold).

## API Reference

### canAddCharacterToParty

Validate if character can be added to party. Checks party size, alignment conflicts, character status, and duplicates.

**Signature**:
```typescript
function canAddCharacterToParty(
  party: Party,
  character: Character,
  allCharacters: Map<string, Character>
): ValidationResult
```

**Parameters**:
- `party`: Current party state
- `character`: Character to validate
- `allCharacters`: Full character roster

**Returns**: ValidationResult object with `allowed` boolean and optional `reason` string

**Example**:
```typescript
const validation = PartyService.canAddCharacterToParty(party, character, roster);
if (!validation.allowed) {
  console.error(validation.reason); // "Good and Evil cannot party together"
}
```

**Validation Rules**:
- Character not already in party
- Party size < 6
- Character status is OK
- No alignment conflict (Good vs Evil)

---

## Gold Management Functions

Gold is now managed at the party level. Individual characters no longer have a `gold` field. All town services (Shop, Temple, Inn) deduct from and add to the party's shared gold pool.

### getPartyGold

Get current party gold amount.

**Signature**:
```typescript
function getPartyGold(state: GameState): number
```

**Parameters**:
- `state`: Current game state

**Returns**: Party's gold amount

**Example**:
```typescript
const gold = getPartyGold(state); // 500
```

### addPartyGold

Add gold to party immutably.

**Signature**:
```typescript
function addPartyGold(state: GameState, amount: number): GameState
```

**Parameters**:
- `state`: Current game state
- `amount`: Gold to add

**Returns**: New game state with updated party gold

**Example**:
```typescript
const newState = addPartyGold(state, 100);
// newState.party.gold = oldState.party.gold + 100
```

### removePartyGold

Remove gold from party immutably. Never goes below zero.

**Signature**:
```typescript
function removePartyGold(state: GameState, amount: number): GameState
```

**Parameters**:
- `state`: Current game state
- `amount`: Gold to remove

**Returns**: New game state with updated party gold (minimum 0)

**Example**:
```typescript
const newState = removePartyGold(state, 50);
// newState.party.gold = max(0, oldState.party.gold - 50)
```

### hasEnoughGold

Check if party has enough gold for a purchase.

**Signature**:
```typescript
function hasEnoughGold(state: GameState, amount: number): boolean
```

**Parameters**:
- `state`: Current game state
- `amount`: Required gold amount

**Returns**: True if party gold >= amount

**Example**:
```typescript
if (hasEnoughGold(state, 100)) {
  // Proceed with purchase
}
```

---

## Formation Movement Functions

Formation movement functions reorder party members and automatically recalculate the formation. The first 3 members form the front row, the next 3 form the back row.

### moveCharacterUp

Move character up in party order (swap with previous member). Automatically recalculates formation.

**Signature**:
```typescript
function moveCharacterUp(state: GameState, characterId: string): GameState
```

**Parameters**:
- `state`: Current game state
- `characterId`: Character to move up

**Returns**: New game state with reordered party and updated formation

**Example**:
```typescript
const newState = moveCharacterUp(state, "char-2");
// Character at index 2 swaps with character at index 1
// Formation recalculated (first 3 → front row, next 3 → back row)
```

**Notes**:
- If character is at index 0, returns state unchanged
- If character not found, returns state unchanged
- Formation auto-recalculates based on new order

### moveCharacterDown

Move character down in party order (swap with next member). Automatically recalculates formation.

**Signature**:
```typescript
function moveCharacterDown(state: GameState, characterId: string): GameState
```

**Parameters**:
- `state`: Current game state
- `characterId`: Character to move down

**Returns**: New game state with reordered party and updated formation

**Example**:
```typescript
const newState = moveCharacterDown(state, "char-1");
// Character at index 1 swaps with character at index 2
// Formation recalculated (first 3 → front row, next 3 → back row)
```

**Notes**:
- If character is at last index, returns state unchanged
- If character not found, returns state unchanged
- Formation auto-recalculates based on new order

## Dependencies

Uses:
- `Character` type - Character entity definition
- `Party` type - Party entity definition
- `GameState` type - Global game state
- `Alignment` enum - Character alignment values
- `CharacterStatus` enum - Character status values
- `isDefined` utility - Type guard for filtering

**Note**: PartyService is a pure function module with no service dependencies. All functions take state as input and return new state without side effects.

## Testing

Test files:
- [PartyService.spec.ts](../../src/services/__tests__/PartyService.spec.ts) - canAddCharacterToParty validation tests
- [PartyService.gold.spec.ts](../../src/services/__tests__/PartyService.gold.spec.ts) - Gold management function tests
- [PartyService.formation.spec.ts](../../src/services/__tests__/PartyService.formation.spec.ts) - Formation movement tests

**Key test cases**:
- **Validation**: Party size limits, alignment conflicts, character status checks, duplicate prevention
- **Gold Management**: Getting party gold, adding gold, removing gold (with floor at 0), checking gold sufficiency
- **Formation Movement**: Moving characters up/down in order, edge cases (first/last position), formation auto-recalculation

## Related

**Services that use PartyService:**
- [ShopService](./ShopService.md) - Uses hasEnoughGold, removePartyGold, addPartyGold
- [TempleService](./TempleService.md) - Uses hasEnoughGold, removePartyGold
- [InnService](./InnService.md) - Uses hasEnoughGold, removePartyGold

**Components that use PartyService:**
- [TavernComponent](../../src/app/tavern/tavern.component.ts) - Party formation and member management
- [CastleMenuComponent](../../src/app/castle-menu/castle-menu.component.ts) - Party gold display

**See also:**
- [GameState Type](../../src/types/GameState.ts) - Party interface definition
- [Party Gold Migration](../plans/2025-11-03-tavern-redesign.md) - Migration from character gold to party gold
