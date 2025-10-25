# InnService

**Pure function service for inn rest mechanics and restoration.**

## Responsibility

Manages resting at inn including HP restoration, spell point restoration, status effect removal, aging, and vitality loss.

## API Reference

### restAtInn

Rest party at inn.

**Signature**:
```typescript
function restAtInn(party: Party): RestResult
```

**Parameters**:
- `party`: Party resting at inn

**Returns**: Rest result with restored party and cost

**Effects**:
- Restore all HP to maximum
- Restore all spell points to maximum
- Remove temporary status effects (poison, paralysis, sleep)
- Age all characters slightly (~0.1 years)
- Reduce vitality (VIM) slightly (~0.05)
- Deduct gold for rest cost

**Throws**:
- `InsufficientGoldError` if party cannot afford rest

**Example**:
```typescript
const party = createParty({
  gold: 100,
  members: [
    createCharacter({ hp: 10, maxHP: 50, age: 20 }),
    createCharacter({ hp: 5, maxHP: 30, age: 25 })
  ]
})

const result = InnService.restAtInn(party)
// result.party.members[0].hp = 50 (restored)
// result.party.members[0].age ≈ 20.1 (aged)
// result.party.members[1].hp = 30 (restored)
// result.party.gold = 100 - cost
// result.cost = 10 (example, actual formula needs research)
```

### calculateRestCost

Calculate gold cost for resting.

**Signature**:
```typescript
function calculateRestCost(party: Party): number
```

**Parameters**:
- `party`: Party to calculate cost for

**Returns**: Gold cost

**Formula** (needs research):
```typescript
// Possible: base cost per character or based on party level
Cost = base_per_character × party.members.length
```

**Example**:
```typescript
const party = createParty({ members: [char1, char2, char3] })

const cost = InnService.calculateRestCost(party)
// Result: 30 (example: 10 gold per character)
```

### restoreHP

Restore all party HP to maximum.

**Signature**:
```typescript
function restoreHP(party: Party): Party
```

**Parameters**:
- `party`: Party to restore

**Returns**: Party with all members at maxHP

**Example**:
```typescript
const damaged = createParty({
  members: [
    createCharacter({ hp: 10, maxHP: 50 }),
    createCharacter({ hp: 5, maxHP: 30 })
  ]
})

const restored = InnService.restoreHP(damaged)
// restored.members[0].hp = 50
// restored.members[1].hp = 30
```

### restoreSpellPoints

Restore all spell points to maximum.

**Signature**:
```typescript
function restoreSpellPoints(character: Character): Character
```

**Parameters**:
- `character`: Character to restore spell points

**Returns**: Character with all spell point pools refilled

**Example**:
```typescript
const mage = createCharacter({
  mageSpellPoints: new Map([[1, 0], [2, 0], [3, 0]]),  // Depleted
  maxMageSpellPoints: new Map([[1, 3], [2, 2], [3, 1]])  // Max values
})

const restored = InnService.restoreSpellPoints(mage)
// restored.mageSpellPoints = Map { 1 → 3, 2 → 2, 3 → 1 } (fully restored)
```

### removeTemporaryStatus

Remove temporary status effects.

**Signature**:
```typescript
function removeTemporaryStatus(character: Character): Character
```

**Parameters**:
- `character`: Character with status effects

**Returns**: Character with temporary effects removed

**Removes**:
- Poison
- Paralysis
- Sleep
- Silence

**Does NOT Remove**:
- Dead
- Ashes
- Stone (petrified)
- Level drain

**Example**:
```typescript
const poisoned = createCharacter({
  status: ['poisoned', 'paralyzed']
})

const cured = InnService.removeTemporaryStatus(poisoned)
// cured.status = [] (temporary effects removed)

const dead = createCharacter({ status: ['dead'] })
const stillDead = InnService.removeTemporaryStatus(dead)
// stillDead.status = ['dead'] (permanent status not removed)
```

### applyAging

Apply aging effects from rest.

**Signature**:
```typescript
function applyAging(character: Character): Character
```

**Parameters**:
- `character`: Character to age

**Returns**: Character with increased age

**Formula**:
```typescript
AgeIncrease = ~0.1 years per rest
// Exact formula needs research
```

**Example**:
```typescript
const young = createCharacter({ age: 20 })

const aged = InnService.applyAging(young)
// aged.age ≈ 20.1
```

### applyVitalityLoss

Apply vitality (VIM) reduction from rest.

**Signature**:
```typescript
function applyVitalityLoss(character: Character): Character
```

**Parameters**:
- `character`: Character to reduce vitality

**Returns**: Character with reduced VIM

**Formula**:
```typescript
VIM_Loss = ~0.05 vim per rest
// Affects resurrection success rate
```

**Example**:
```typescript
const character = createCharacter({ vitality: 100 })

const reduced = InnService.applyVitalityLoss(character)
// reduced.vitality ≈ 99.95
```

### checkOldAgeDeath

Check if character dies from old age during rest.

**Signature**:
```typescript
function checkOldAgeDeath(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: True if character dies from old age

**Risk Factors**:
- Age >= 50: Increased death risk
- Age >= 70: High death risk
- Age >= 90: Very high death risk

**Example**:
```typescript
const old = createCharacter({ age: 75 })

const dies = InnService.checkOldAgeDeath(old)
// Result: true or false (age-based probability)
```

## Dependencies

Uses:
- `RandomService` (aging, vitality loss, death risk)
- `ValidationService` (validate sufficient gold)

## Testing

See [InnService.test.ts](../../tests/services/InnService.test.ts)

**Key test cases**:
- Rest restores all HP to max
- Rest restores all spell points to max
- Rest removes poison, paralysis, sleep
- Rest does not remove dead/ashes/stone
- Rest ages characters ~0.1 years
- Rest reduces VIM ~0.05
- Rest costs gold
- Insufficient gold throws error
- Old age death risk increases with age
- Multiple rests compound aging

## Related

- [Combat Formulas](../research/combat-formulas.md) - Aging and VIM formulas
- [RestAtInnCommand](../commands/RestAtInnCommand.md) - Uses this service
- [TownService](./TownService.md) - Inn access validation
- [Town System](../systems/town-system.md) - Town services overview
- [TempleService](./TempleService.md) - Resurrection for dead characters
