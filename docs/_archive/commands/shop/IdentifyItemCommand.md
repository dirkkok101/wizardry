# IdentifyItemCommand

**Identify unknown item using Bishop or Thief abilities.**

## Responsibility

Reveals the true properties of an unidentified item, exposing whether it's cursed, its enhancement bonus, and special properties. Only Bishops and high-level Thieves can attempt identification, with success chance based on character level and intelligence.

## Command Flow

### Preconditions
1. Item exists in character's inventory
2. Character is Bishop or Thief class
3. Item is currently unidentified
4. Character is alive and not ashed

### Services Called
1. **EquipmentService.identifyItem** - Attempt identification
2. **CharacterService.canIdentify** - Validate character can identify
3. **RandomService.roll** - Determine identification success
4. **EventService.createEvent** - Log identification attempt

### Events Created
```typescript
{
  type: "ITEM_IDENTIFIED",
  characterId: string,
  itemId: string,
  success: boolean,
  itemName: string,
  properties: ItemProperties,
  timestamp: number
}
```

### State Changes
1. Item identification status updated (if successful)
2. Item properties revealed
3. Cursed status exposed
4. Event added to game log

## API Reference

**Signature**:
```typescript
function execute(state: GameState, params: {
  characterId: string,
  itemId: string
}): GameState
```

**Parameters**:
- `state` - Current game state
- `params.characterId` - Character attempting identification
- `params.itemId` - Item to identify

**Returns**: New game state with item identified (if successful)

**Throws**:
- `CharacterNotFoundError` - Character ID invalid
- `ItemNotFoundError` - Item not in character inventory
- `CannotIdentifyError` - Character is not Bishop/Thief
- `AlreadyIdentifiedError` - Item is already identified
- `CharacterDeadError` - Cannot identify when dead/ashed

## Preconditions

### Character Validation
```typescript
// Character must exist and be alive
const character = state.roster.get(characterId)
if (!character) throw new CharacterNotFoundError()
if (character.status === 'ASHES' || character.status === 'DEAD') {
  throw new CharacterDeadError()
}
```

### Class Validation
```typescript
// Only Bishop and Thief can identify
if (!CharacterService.canIdentify(character)) {
  throw new CannotIdentifyError(
    `${character.class} cannot identify items. Requires Bishop or Thief.`
  )
}
```

### Item Validation
```typescript
// Item must be in character's inventory
const item = character.inventory.find(i => i.id === itemId)
if (!item) throw new ItemNotFoundError()

// Item must be unidentified
if (item.identified) {
  throw new AlreadyIdentifiedError(`${item.name} is already identified`)
}
```

## Services Used

### EquipmentService
- **identifyItem** - Perform identification attempt
- **getItemProperties** - Reveal item properties on success

### CharacterService
- **canIdentify** - Check if character can attempt identification
- **getIdentifyChance** - Calculate success probability

### RandomService
- **roll** - Determine identification success

### EventService
- **createEvent** - Create ITEM_IDENTIFIED event

## Events Created

### ITEM_IDENTIFIED Event (Success)
```typescript
{
  id: "evt-12348",
  type: "ITEM_IDENTIFIED",
  timestamp: 1635725100000,
  characterId: "char-abc",
  characterName: "Gandalf the Bishop",
  itemId: "item-sword-unknown",
  success: true,
  itemName: "Long Sword +2",
  properties: {
    identified: true,
    cursed: false,
    bonus: 2,
    damage: "3d5",
    special: null
  },
  identifyChance: 85
}
```

### ITEM_IDENTIFIED Event (Failure)
```typescript
{
  id: "evt-12349",
  type: "ITEM_IDENTIFIED",
  timestamp: 1635725200000,
  characterId: "char-def",
  characterName: "Robin the Thief",
  itemId: "item-ring-unknown",
  success: false,
  itemName: "Unknown Ring",
  properties: null,
  identifyChance: 45
}
```

## Identification Mechanics

### Success Chance Formula
```typescript
// Bishop: High INT + Level bonus
const bishopChance = Math.min(
  95,
  (character.stats.int * 3) + (character.level * 5)
)

// Thief: Moderate INT + Level bonus
const thiefChance = Math.min(
  75,
  (character.stats.int * 2) + (character.level * 4)
)
```

### Character Level Requirements
- **Bishop**: Can attempt at any level (base 30% at level 1)
- **Thief**: Effective at level 3+ (base 20% at level 1)
- **Other Classes**: Cannot attempt identification

### Identification Benefits
1. **Reveals Cursed Items**: Prevents equipping cursed gear
2. **Shows Enhancement Bonus**: +1, +2, +3 bonuses exposed
3. **Exposes Special Properties**: Regeneration, protections, etc.
4. **Enables Informed Decisions**: Know before equipping

## Testing

### Test Cases

**Bishop Success**:
```typescript
test('bishop successfully identifies item', () => {
  const bishop = createBishop({
    level: 5,
    stats: { int: 16 },
    inventory: [unknownSword]
  })
  const state = createGameState({ roster: [bishop] })

  // Mock high roll for guaranteed success
  jest.spyOn(RandomService, 'roll').mockReturnValue(50)

  const result = IdentifyItemCommand.execute(state, {
    characterId: bishop.id,
    itemId: unknownSword.id
  })

  const updated = result.roster.get(bishop.id)!
  const identifiedItem = updated.inventory.find(i => i.id === unknownSword.id)
  expect(identifiedItem.identified).toBe(true)
  expect(identifiedItem.name).toBe('Long Sword +2')
})
```

**Thief Failure**:
```typescript
test('thief fails to identify item at low level', () => {
  const thief = createThief({
    level: 1,
    stats: { int: 10 },
    inventory: [unknownRing]
  })
  const state = createGameState({ roster: [thief] })

  // Mock low roll for guaranteed failure
  jest.spyOn(RandomService, 'roll').mockReturnValue(90)

  const result = IdentifyItemCommand.execute(state, {
    characterId: thief.id,
    itemId: unknownRing.id
  })

  const updated = result.roster.get(thief.id)!
  const item = updated.inventory.find(i => i.id === unknownRing.id)
  expect(item.identified).toBe(false)

  const lastEvent = result.eventLog[result.eventLog.length - 1]
  expect(lastEvent.success).toBe(false)
})
```

**Cursed Item Revealed**:
```typescript
test('reveals cursed item properties', () => {
  const bishop = createBishop({
    level: 10,
    stats: { int: 18 },
    inventory: [unknownCursedSword]
  })
  const state = createGameState({ roster: [bishop] })

  const result = IdentifyItemCommand.execute(state, {
    characterId: bishop.id,
    itemId: unknownCursedSword.id
  })

  const updated = result.roster.get(bishop.id)!
  const item = updated.inventory.find(i => i.id === unknownCursedSword.id)
  expect(item.identified).toBe(true)
  expect(item.cursed).toBe(true)
  expect(item.name).toContain('-1') // Cursed sword penalty
})
```

**Cannot Identify Wrong Class**:
```typescript
test('prevents fighter from identifying items', () => {
  const fighter = createFighter({ inventory: [unknownSword] })
  const state = createGameState({ roster: [fighter] })

  expect(() => IdentifyItemCommand.execute(state, {
    characterId: fighter.id,
    itemId: unknownSword.id
  })).toThrow(CannotIdentifyError)
})
```

**Already Identified**:
```typescript
test('prevents identifying already identified item', () => {
  const identifiedSword = { ...unknownSword, identified: true }
  const bishop = createBishop({ inventory: [identifiedSword] })
  const state = createGameState({ roster: [bishop] })

  expect(() => IdentifyItemCommand.execute(state, {
    characterId: bishop.id,
    itemId: identifiedSword.id
  })).toThrow(AlreadyIdentifiedError)
})
```

**Success Chance Calculation**:
```typescript
test('calculates correct identification chance', () => {
  const bishop = createBishop({
    level: 5,
    stats: { int: 16 }
  })
  const chance = CharacterService.getIdentifyChance(bishop)

  // Bishop: (INT * 3) + (Level * 5) = (16 * 3) + (5 * 5) = 73%
  expect(chance).toBe(73)
})

test('caps identification chance at 95%', () => {
  const highLevelBishop = createBishop({
    level: 20,
    stats: { int: 18 }
  })
  const chance = CharacterService.getIdentifyChance(highLevelBishop)

  expect(chance).toBe(95) // Capped at 95%
})
```

**Event Creation**:
```typescript
test('creates ITEM_IDENTIFIED event with full details', () => {
  const bishop = createBishop({ inventory: [unknownSword] })
  const state = createGameState({ roster: [bishop] })

  const result = IdentifyItemCommand.execute(state, {
    characterId: bishop.id,
    itemId: unknownSword.id
  })

  const lastEvent = result.eventLog[result.eventLog.length - 1]
  expect(lastEvent.type).toBe('ITEM_IDENTIFIED')
  expect(lastEvent.characterName).toContain('Bishop')
  expect(lastEvent.properties).toBeDefined()
  expect(lastEvent.identifyChance).toBeGreaterThan(0)
})
```

## Related

- [EquipmentService](../services/EquipmentService.md) - Item identification logic
- [CharacterService](../services/CharacterService.md) - Class ability checks
- [EquipItemCommand](../character/EquipItemCommand.md) - Equip identified items safely
- [VisitShopCommand](./VisitShopCommand.md) - Shop also identifies (for fee)
- [Equipment Reference](../research/equipment-reference.md) - All items and properties
- [Character Classes](../game-design/02-character-classes.md) - Bishop and Thief abilities
