# TempleService

**Pure function service for temple resurrection and status curing.**

## Responsibility

Manages temple services including resurrection from death and ashes, status effect curing, and cost calculation.

## API Reference

### resurrectFromDead

Resurrect character from dead status.

**Signature**:
```typescript
function resurrectFromDead(
  character: Character,
  paymentGold: number
): ResurrectionResult
```

**Parameters**:
- `character`: Dead character to resurrect
- `paymentGold`: Gold paid for resurrection

**Returns**: Resurrection result (success/failure + updated character)

**Cost Formula**:
```typescript
DeadCost = 100 × Level
```

**Success Rate**:
```typescript
SuccessRate ≈ 90% - (age penalties) - (vim penalties)

Success: Character returns to life (HP = 1)
Failure: Character turns to ashes
```

**Throws**:
- `InsufficientGoldError` if payment < cost
- `InvalidStatusError` if character not dead

**Example**:
```typescript
const dead = createCharacter({
  status: 'dead',
  level: 5,
  age: 25,
  vitality: 95
})
const cost = 5 × 100  // 500 gold

const result = TempleService.resurrectFromDead(dead, 500)
if (result.success) {
  // result.character.status = 'alive'
  // result.character.hp = 1
} else {
  // result.character.status = 'ashes'
}
```

### resurrectFromAshes

Resurrect character from ashes status.

**Signature**:
```typescript
function resurrectFromAshes(
  character: Character,
  paymentGold: number
): ResurrectionResult
```

**Parameters**:
- `character`: Ashes character to resurrect
- `paymentGold`: Gold paid for resurrection

**Returns**: Resurrection result (success/failure + updated character or null)

**Cost Formula**:
```typescript
AshesCost = 500 × Level
```

**Success Rate**:
```typescript
SuccessRate ≈ 50% - (age penalties) - (vim penalties)

Success: Character returns to life (HP = 1)
Failure: Character lost forever (permanent deletion)
```

**Throws**:
- `InsufficientGoldError` if payment < cost
- `InvalidStatusError` if character not ashes

**Example**:
```typescript
const ashes = createCharacter({
  status: 'ashes',
  level: 5,
  age: 30,
  vitality: 90
})
const cost = 5 × 500  // 2,500 gold

const result = TempleService.resurrectFromAshes(ashes, 2500)
if (result.success) {
  // result.character.status = 'alive'
  // result.character.hp = 1
} else {
  // result.character = null (lost forever)
}
```

### cureStatus

Cure status effect at temple.

**Signature**:
```typescript
function cureStatus(
  character: Character,
  statusEffect: StatusEffect,
  paymentGold: number
): CureResult
```

**Parameters**:
- `character`: Character with status effect
- `statusEffect`: Status to cure (poison, paralysis, stone)
- `paymentGold`: Gold paid for cure

**Returns**: Cure result with updated character

**Curable Effects**:
- Poison
- Paralysis
- Petrify (stone)
- Silence (rare, usually temporary)

**Not Curable**:
- Dead (requires resurrection)
- Ashes (requires resurrection)
- Level drain (permanent in Wizardry 1)

**Cost Formula** (needs research):
```typescript
CureCost = base_cost × character_level
// Varies by status effect
```

**Example**:
```typescript
const poisoned = createCharacter({
  status: ['poisoned'],
  level: 5
})
const cost = 50  // Example cost

const result = TempleService.cureStatus(poisoned, 'poisoned', 50)
// result.character.status = [] (cured)
```

### calculateResurrectionCost

Calculate resurrection cost.

**Signature**:
```typescript
function calculateResurrectionCost(
  character: Character,
  resurrectionType: 'dead' | 'ashes'
): number
```

**Parameters**:
- `character`: Character to resurrect
- `resurrectionType`: Type of resurrection needed

**Returns**: Gold cost

**Example**:
```typescript
const cost1 = TempleService.calculateResurrectionCost(level5Char, 'dead')
// Result: 500 gold (100 × 5)

const cost2 = TempleService.calculateResurrectionCost(level10Char, 'ashes')
// Result: 5,000 gold (500 × 10)
```

### calculateResurrectionChance

Calculate resurrection success probability.

**Signature**:
```typescript
function calculateResurrectionChance(
  character: Character,
  resurrectionType: 'dead' | 'ashes'
): number
```

**Parameters**:
- `character`: Character to resurrect
- `resurrectionType`: Type of resurrection

**Returns**: Success chance percentage

**Factors**:
- Base rate: 90% (dead) or 50% (ashes)
- Age penalty: Higher age reduces chance
- VIM penalty: Lower vitality reduces chance

**Example**:
```typescript
const young = createCharacter({ age: 20, vitality: 100 })
const chance1 = TempleService.calculateResurrectionChance(young, 'dead')
// Result: ~90% (high chance)

const old = createCharacter({ age: 70, vitality: 80 })
const chance2 = TempleService.calculateResurrectionChance(old, 'dead')
// Result: ~70% (penalties applied)

const ashesChance = TempleService.calculateResurrectionChance(young, 'ashes')
// Result: ~50% (much riskier)
```

### uncurseItem

Remove curse from cursed equipment.

**Signature**:
```typescript
function uncurseItem(
  character: Character,
  item: Item,
  paymentGold: number
): Character
```

**Parameters**:
- `character`: Character with cursed item
- `item`: Cursed item to uncurse
- `paymentGold`: Gold paid for uncurse service

**Returns**: Character with item uncursed (can now be removed)

**Example**:
```typescript
const cursed = createCharacter({
  equipment: {
    weapon: { name: 'Cursed Sword -2', cursed: true }
  }
})

const uncursed = TempleService.uncurseItem(cursed, cursedSword, 100)
// uncursed.equipment.weapon.cursed = false
// Can now unequip weapon
```

### getAvailableServices

Get available temple services for character.

**Signature**:
```typescript
function getAvailableServices(
  character: Character,
  partyGold: number
): TempleServiceOption[]
```

**Parameters**:
- `character`: Character needing services
- `partyGold`: Available gold

**Returns**: Array of affordable services

**Example**:
```typescript
const dead = createCharacter({ status: 'dead', level: 5 })
const services = TempleService.getAvailableServices(dead, 1000)
// Result: [
//   { service: 'resurrect_dead', cost: 500, affordable: true }
// ]

const ashes = createCharacter({ status: 'ashes', level: 10 })
const services2 = TempleService.getAvailableServices(ashes, 1000)
// Result: [
//   { service: 'resurrect_ashes', cost: 5000, affordable: false }
// ]
```

## Dependencies

Uses:
- `RandomService` (resurrection success rolls)
- `ValidationService` (validate payment, status)

## Testing

See [TempleService.test.ts](../../tests/services/TempleService.test.ts)

**Key test cases**:
- Resurrect dead costs 100 × level
- Resurrect ashes costs 500 × level
- Dead resurrection ~90% success rate
- Ashes resurrection ~50% success rate
- Failed dead resurrection → ashes
- Failed ashes resurrection → lost forever
- Age/VIM penalties reduce success chance
- Cure poison removes poison status
- Cure stone removes petrify status
- Insufficient gold throws error
- Uncurse removes curse from item
- Available services filtered by gold

## Related

- [Combat Formulas](../research/combat-formulas.md) - Resurrection formulas
- [ResurrectionService](./ResurrectionService.md) - DI/KADORTO spell resurrection
- [ResurrectCharacterCommand](../commands/ResurrectCharacterCommand.md) - Uses this service
- [TownService](./TownService.md) - Temple access validation
- [Town System](../systems/town-system.md) - Town services overview
