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

**Returns**: Initiative value (1-14 range)

**Formula**:
```typescript
Initiative = random(0-9) + AgilityModifier
Minimum = 1  // Can't go below 1
```

**Agility Modifiers**:
- AGI 3: -2 (min capped to 1)
- AGI 4-5: -1 (range 1-9)
- AGI 6-8: 0 (range 1-10)
- AGI 9-11: +1 (range 2-11)
- AGI 12-14: +2 (range 3-12)
- AGI 15-17: +3 (range 4-13)
- AGI 18+: +4 (range 5-14)

**Example**:
```typescript
const fighter = createCharacter({ stats: { agi: 15 } })

const initiative = InitiativeService.calculateInitiative(fighter)
// Result: 4-13 range (random(0-9) + 3)
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

**Returns**: Array of combatants sorted by initiative (highest first)

**Example**:
```typescript
const party = [fighter, mage, priest]
const enemies = [[orc1, orc2], [goblin1, goblin2, goblin3]]

const turnOrder = InitiativeService.calculateRoundOrder(party, enemies)
// turnOrder[0] = combatant with highest initiative acts first
// turnOrder[last] = combatant with lowest initiative acts last
```

### getAgilityModifier

Get initiative modifier based on agility stat.

**Signature**:
```typescript
function getAgilityModifier(agility: number): number
```

**Parameters**:
- `agility`: Combatant's agility stat (3-18+)

**Returns**: Initiative modifier (-2 to +4)

**Example**:
```typescript
const modifier = InitiativeService.getAgilityModifier(18)
// Result: +4

const lowModifier = InitiativeService.getAgilityModifier(3)
// Result: -2
```

## Dependencies

Uses:
- `RandomService` (generate random initiative rolls)

## Testing

See [InitiativeService.test.ts](../../tests/services/InitiativeService.test.ts)

**Key test cases**:
- AGI 3 initiative range (1 only, min capped)
- AGI 6-8 initiative range (1-10)
- AGI 15 initiative range (4-13)
- AGI 18+ initiative range (5-14)
- Multiple combatants sorted correctly
- Ties resolved randomly
- Empty party/enemy handling
- Turn order includes all combatants

## Related

- [Combat Formulas](../research/combat-formulas.md) - Initiative formula source
- [CombatService](./CombatService.md) - Uses initiative for round resolution
- [AttackCommand](../commands/AttackCommand.md) - Executes in initiative order
