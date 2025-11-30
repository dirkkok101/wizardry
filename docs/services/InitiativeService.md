# InitiativeService

**Pure function service for combat initiative calculation.**

## Responsibility

Calculates initiative order for all combatants (party members and monsters) at the start of each combat round.

## API Reference

### calculateInitiative

Calculate initiative for a single combatant.

**Signature**:
```typescript
function calculateInitiative(combatant: Combatant): number
```

**Parameters**:
- `combatant`: Character or monster combatant

**Returns**: Initiative value (1-10 range for characters, 2-9 for monsters)

**CRITICAL**: Lower initiative acts FIRST (like D&D)

**Formula**:
```typescript
// Characters
Initiative = 1d10 + AgilityModifier
Clamped to range 1-10

// Monsters (different formula!)
Initiative = 1d8 + 1  // Range: 2-9
// Monsters do NOT use agility modifiers
```

**Agility Modifiers** (Higher AGI = LOWER initiative = FASTER):

| AGI | Modifier | Range | Effect |
|-----|----------|-------|--------|
| 3 | +2 | 3-10 | Slowest (acts late) |
| 4-5 | +1 | 2-10 | Slow |
| 6-7 | 0 | 1-10 | Average |
| 8-14 | -1 | 1-9 | Fast |
| 15-16 | -2 to -3 | 1-7 | Very fast |
| 17-18 | -4 to -5 | 1-5 | Fastest (acts early) |

**Example**:
```typescript
const ninja = createCharacter({ stats: { agi: 18 } })

const initiative = InitiativeService.calculateInitiative(ninja)
// Result: 1-5 range (1d10 - 5, clamped to 1-10)
// This ninja will almost always act before monsters (who roll 2-9)
```

### calculateRoundOrder

Calculate initiative for all combatants and return sorted turn order.

**Signature**:
```typescript
function calculateRoundOrder(
  party: Character[],
  enemies: Monster[][]
): CombatantInitiative[]
```

**Parameters**:
- `party`: All party members in combat
- `enemies`: All monster groups in combat

**Returns**: Array of combatants sorted by initiative (**lowest first** = fastest)

**Tie-breaker**: Characters act before monsters on initiative ties

**Example**:
```typescript
const party = [fighter, mage, priest]
const enemies = [[orc1, orc2], [goblin1, goblin2, goblin3]]

const turnOrder = InitiativeService.calculateRoundOrder(party, enemies)
// turnOrder[0] = combatant with LOWEST initiative acts FIRST
// turnOrder[last] = combatant with HIGHEST initiative acts LAST
// On ties, party members act before monsters
```

### getAgilityModifier

Get initiative modifier based on agility stat.

**Signature**:
```typescript
function getAgilityModifier(agility: number): number
```

**Parameters**:
- `agility`: Combatant's agility stat (3-18+)

**Returns**: Initiative modifier (-5 to +2)

Note: Higher AGI gives NEGATIVE modifiers (which means LOWER initiative = FASTER)

**Example**:
```typescript
const fastModifier = InitiativeService.getAgilityModifier(18)
// Result: -5 (fast - acts early due to low initiative)

const slowModifier = InitiativeService.getAgilityModifier(3)
// Result: +2 (slow - acts late due to high initiative)
```

## Dependencies

Uses:
- `RandomService` (generate random initiative rolls)

## Testing

See [InitiativeService.test.ts](../../tests/services/InitiativeService.test.ts)

**Key test cases**:
- AGI 3 initiative range (3-10, slow)
- AGI 6-7 initiative range (1-10, average)
- AGI 15-16 initiative range (1-7, fast)
- AGI 18 initiative range (1-5, fastest)
- Monster initiative range (2-9, no AGI modifiers)
- Multiple combatants sorted correctly (lowest first)
- Ties resolved: characters before monsters
- Empty party/enemy handling
- Turn order includes all combatants

## Related

- [Combat Formulas](../research/combat-formulas.md) - Initiative formula source
- [CombatService](./CombatService.md) - Uses initiative for round resolution
- [AttackCommand](../commands/AttackCommand.md) - Executes in initiative order
