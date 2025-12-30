# InnService

**Pure function service for inn rest mechanics and restoration.**

## Responsibility

Manages resting at inn including HP restoration, spell point restoration, and status effect removal.

> **IMPORTANT (Apple II Accuracy)**: Despite what the original manual claims, **resting at the Inn does NOT cause aging** in the Apple II version. This is a known bug in the original game that we faithfully reproduce. Age only increases through class changes, temple services, and disbanding the party.

## Spell Point Restoration

Per original Wizardry 1 mechanics, **only the Stables restore spell points**.

| Room Type | HP/Week | Spell Points |
|-----------|---------|--------------|
| Stables | 0 | **ALL restored** |
| Barracks | 1 | None |
| Double | 3 | None |
| Private | 7 | None |
| Royal Suite | 10 | None |

**Gameplay Loop:** The optimal strategy is to use Stables (free) to restore spell points, cast healing spells, and repeat. Paid rooms provide faster HP healing but no spell point recovery.

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
- Restore HP (Stables: none, Paid rooms: varies by room type)
- Restore spell points ONLY if resting in Stables (per original Wizardry 1)
- Remove temporary status effects (poison, paralysis, sleep)
- **NO aging occurs** (Apple II bug - manual says otherwise but code doesn't age)
- Deduct gold for rest cost (Stables are free)

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

const result = InnService.restAtInn(party, 'stables')
// result.party.members[0].hp = 10 (unchanged - stables don't heal HP)
// result.party.members[0].age = 20 (NO aging - Apple II bug)
// result.party.members[0].spellPoints = max (fully restored)
// result.party.gold = 100 (stables are free)
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

Restore all spell points to maximum for a character.

**Per original Wizardry 1:** This function is ONLY called when resting in Stables. Paid rooms (Barracks, Double, Private, Royal Suite) do NOT restore spell points.

**Signature**:
```typescript
function restoreSpellPoints(character: Character): Character
```

**Parameters**:
- `character`: Character to restore spell points

**Returns**: Character with all spell point pools refilled (both mage and priest for Bishop)

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

### Note on Aging Functions

**Per original Apple II Wizardry 1**: Inn resting does NOT cause aging despite what the manual claims. The following functions are NOT used for inn resting:
- `applyAging` - Not applicable to inn rest
- `applyVitalityLoss` - Not applicable to inn rest
- `checkOldAgeDeath` - Not applicable to inn rest

**Aging only occurs through**:
- Class change: 4-7 years ((1d3+3) years + 44 weeks)
- Temple services: 1-52 weeks (random per visit)
- Disbanding party: 25 weeks per character

## Dependencies

Uses:
- `RandomService` (aging, vitality loss, death risk)
- `ValidationService` (validate sufficient gold)

## Testing

See [InnService.test.ts](../../tests/services/InnService.test.ts)

**Key test cases**:
- Stables restore all spell points to max (per original Wizardry 1)
- Stables do NOT restore HP (only paid rooms heal HP)
- Stables are free (no gold cost)
- Paid rooms (Barracks, Double, Private, Royal Suite) restore HP at varying rates
- Paid rooms do NOT restore spell points
- Rest removes poison, paralysis, sleep
- Rest does not remove dead/ashes/stone
- **Rest does NOT age characters** (Apple II bug - faithful reproduction)
- Insufficient gold throws error for paid rooms

## Related

- [Combat Formulas](../research/combat-formulas.md) - Aging and VIM formulas
- [RestAtInnCommand](../commands/RestAtInnCommand.md) - Uses this service
- [TownService](./TownService.md) - Inn access validation
- [Town System](../systems/town-system.md) - Town services overview
- [TempleService](./TempleService.md) - Resurrection for dead characters
