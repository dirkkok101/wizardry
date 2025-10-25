# CombatService

**Pure function service for combat resolution and round management.**

## Responsibility

Manages combat round resolution, initiative calculation, attack resolution, and damage application. Handles combat state transitions and victory/defeat conditions.

## API Reference

### initiateComat

Start combat encounter with monster groups.

**Signature**:
```typescript
function initiateCombat(
  party: Party,
  monsterGroups: MonsterGroup[]
): CombatState
```

**Parameters**:
- `party`: Current party state
- `monsterGroups`: Array of monster groups (1-4 groups)

**Returns**: New combat state with initiative order

**Example**:
```typescript
const monsters = [
  { type: 'ORC', count: 5, hp: [8, 7, 8, 6, 8] },
  { type: 'KOBOLD', count: 3, hp: [3, 4, 3] }
]
const combat = CombatService.initiateCombat(party, monsters)
// combat.round === 1
// combat.phase === 'INPUT'
```

### calculateInitiative

Calculate initiative order for combat round.

**Signature**:
```typescript
function calculateInitiative(combatState: CombatState): Combatant[]
```

**Parameters**:
- `combatState`: Current combat state

**Returns**: Array of combatants sorted by initiative (fastest first)

**Formula**: `random(0-9) + AGI_modifier`, minimum 1

**Example**:
```typescript
const order = CombatService.calculateInitiative(combat)
// order[0] has highest initiative, acts first
```

### resolveAttack

Resolve single attack action.

**Signature**:
```typescript
function resolveAttack(
  attacker: Combatant,
  target: Combatant,
  weapon?: Weapon
): AttackResult
```

**Parameters**:
- `attacker`: Attacking combatant
- `target`: Target combatant
- `weapon`: Optional weapon (uses equipped if not provided)

**Returns**: Attack result with damage, hit status, critical

**Throws**:
- `InvalidTargetError` if target is already dead

**Example**:
```typescript
const result = CombatService.resolveAttack(fighter, orc)
// result.hit === true
// result.damage === 12
// result.critical === false
```

### resolveRound

Resolve complete combat round.

**Signature**:
```typescript
function resolveRound(combatState: CombatState): CombatState
```

**Parameters**:
- `combatState`: Current combat state with player actions

**Returns**: New combat state after all actions resolved

**Example**:
```typescript
const newCombat = CombatService.resolveRound(combat)
// All combatants have acted
// Round incremented
// Dead combatants removed
```

### calculateHitChance

Calculate probability of attack hitting target.

**Signature**:
```typescript
function calculateHitChance(
  attacker: Combatant,
  target: Combatant
): number
```

**Parameters**:
- `attacker`: Attacking combatant
- `target`: Target combatant

**Returns**: Hit chance percentage (0-95)

**Formula**: `(HPCALCMD + targetAC + 29) × 5%`, capped at 95%

**Example**:
```typescript
const chance = CombatService.calculateHitChance(fighter, orc)
// chance === 75 (75% hit chance)
```

### calculateDamage

Calculate damage from successful hit.

**Signature**:
```typescript
function calculateDamage(
  attacker: Combatant,
  weapon: Weapon,
  isCritical: boolean
): number
```

**Parameters**:
- `attacker`: Attacking combatant
- `weapon`: Weapon used
- `isCritical`: Whether attack was critical hit

**Returns**: Damage amount (minimum 1)

**Formula**: `WeaponDice + STR_modifier`

**Example**:
```typescript
const damage = CombatService.calculateDamage(
  fighter,
  { name: "Sword", damage: "1d8" },
  false
)
// damage = 1d8 + STR_modifier
```

### checkCombatEnd

Check if combat has ended (victory or defeat).

**Signature**:
```typescript
function checkCombatEnd(combatState: CombatState): CombatEndResult | null
```

**Parameters**:
- `combatState`: Current combat state

**Returns**: Combat end result if ended, null if ongoing

**Example**:
```typescript
const result = CombatService.checkCombatEnd(combat)
if (result?.outcome === 'VICTORY') {
  // Award XP and treasure
}
```

### applyDamage

Apply damage to combatant.

**Signature**:
```typescript
function applyDamage(
  combatant: Combatant,
  damage: number
): Combatant
```

**Parameters**:
- `combatant`: Target combatant
- `damage`: Damage amount

**Returns**: New combatant with reduced HP

**Example**:
```typescript
const damaged = CombatService.applyDamage(orc, 12)
// damaged.hp = orc.hp - 12
// damaged.status includes 'DEAD' if hp <= 0
```

### getAttacksPerRound

Calculate number of attacks for combatant.

**Signature**:
```typescript
function getAttacksPerRound(combatant: Combatant): number
```

**Parameters**:
- `combatant`: Combatant to check

**Returns**: Number of attacks (1-10)

**Formula**:
- Fighter/Samurai/Lord: `1 + floor(level/5)`, max 10
- Ninja: `2 + floor(level/5)`, max 10
- Others: 1

**Example**:
```typescript
const attacks = CombatService.getAttacksPerRound(ninja)
// Level 10 Ninja: 2 + floor(10/5) = 4 attacks
```

### checkCriticalHit

Determine if attack is critical hit.

**Signature**:
```typescript
function checkCriticalHit(attacker: Combatant): boolean
```

**Parameters**:
- `attacker`: Attacking combatant

**Returns**: True if critical hit

**Formula**: `(2 × level)%`, max 50%

**Example**:
```typescript
const isCrit = CombatService.checkCriticalHit(fighter)
// Level 10: 20% chance
// Level 25+: 50% chance
```

## Dependencies

Uses:
- `DamageService` - Damage calculation
- `InitiativeService` - Initiative ordering
- `AttackService` - Attack resolution
- `MonsterService` - Monster stat loading
- `RandomService` - RNG for rolls

## Testing

See [CombatService.test.ts](../../tests/services/CombatService.test.ts)

**Key test cases**:
- Combat initiation with multiple groups
- Initiative calculation with various AGI values
- Attack hit/miss resolution
- Damage calculation with STR modifiers
- Critical hit detection
- Multiple attacks per round
- Combat end conditions (victory/defeat/flee)
- Round resolution order

## Related

- [Combat System](../systems/combat-system.md) - System overview
- [Combat Flow Diagram](../diagrams/combat-flow.md)
- [AttackCommand](../commands/AttackCommand.md) - Uses this service
- [Combat Formulas](../research/combat-formulas.md) - Validated formulas
