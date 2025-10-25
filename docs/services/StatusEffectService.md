# StatusEffectService

**Pure function service for status effect management (poison, paralyze, petrify, sleep, blind, silence).**

## Responsibility

Manages character status effects, applies status ailments, tracks status durations, calculates poison damage over time, and handles status effect removals and cures.

## API Reference

### applyStatusEffect

Apply a status effect to a character.

**Signature**:
```typescript
function applyStatusEffect(
  character: Character,
  effect: StatusEffect
): Character
```

**Parameters**:
- `character`: Character to afflict
- `effect`: Status effect to apply ("poison", "paralyze", "petrify", "sleep", "blind", "silence")

**Returns**: New character with status effect applied

**Example**:
```typescript
const poisoned = StatusEffectService.applyStatusEffect(character, {
  type: "poison",
  duration: -1, // permanent until cured
  damagePerTurn: 2
})
// poisoned.statusEffects includes poison effect
```

### removeStatusEffect

Remove a specific status effect from a character.

**Signature**:
```typescript
function removeStatusEffect(
  character: Character,
  effectType: StatusEffectType
): Character
```

**Parameters**:
- `character`: Character to cure
- `effectType`: Type of effect to remove

**Returns**: New character with effect removed

**Example**:
```typescript
const cured = StatusEffectService.removeStatusEffect(character, "poison")
// cured.statusEffects does not include poison
```

### hasStatusEffect

Check if character has a specific status effect.

**Signature**:
```typescript
function hasStatusEffect(
  character: Character,
  effectType: StatusEffectType
): boolean
```

**Parameters**:
- `character`: Character to check
- `effectType`: Status effect type

**Returns**: `true` if character has this status effect

**Example**:
```typescript
const isPoisoned = StatusEffectService.hasStatusEffect(character, "poison")
// isPoisoned === true

const isParalyzed = StatusEffectService.hasStatusEffect(character, "paralyze")
// isParalyzed === false
```

### processPoisonDamage

Process poison damage at end of combat round.

**Signature**:
```typescript
function processPoisonDamage(character: Character): Character
```

**Parameters**:
- `character`: Poisoned character

**Returns**: New character with HP reduced by poison damage

**Example**:
```typescript
// Character has poison effect with 2 damage per turn
const damaged = StatusEffectService.processPoisonDamage(character)
// damaged.hp = character.hp - 2
```

### canAct

Check if character can act (not paralyzed, asleep, or petrified).

**Signature**:
```typescript
function canAct(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: `true` if character can take actions

**Example**:
```typescript
const canAct = StatusEffectService.canAct(character)
// canAct === false (character is paralyzed)

const canActHealthy = StatusEffectService.canAct(healthyCharacter)
// canActHealthy === true
```

### canCastSpells

Check if character can cast spells (not silenced).

**Signature**:
```typescript
function canCastSpells(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: `true` if character can cast spells

**Example**:
```typescript
const canCast = StatusEffectService.canCastSpells(character)
// canCast === false (character is silenced by MANIFO)

const canCastNormal = StatusEffectService.canCastSpells(normalCharacter)
// canCastNormal === true
```

### isIncapacitated

Check if character is incapacitated (dead, petrified, or paralyzed).

**Signature**:
```typescript
function isIncapacitated(character: Character): boolean
```

**Parameters**:
- `character`: Character to check

**Returns**: `true` if character cannot participate in combat

**Example**:
```typescript
const incapacitated = StatusEffectService.isIncapacitated(character)
// incapacitated === true (character is petrified)
```

### updateStatusDurations

Update status effect durations (decrement at end of round).

**Signature**:
```typescript
function updateStatusDurations(character: Character): Character
```

**Parameters**:
- `character`: Character with status effects

**Returns**: New character with durations decremented, expired effects removed

**Example**:
```typescript
// Sleep effect with 2 rounds remaining
const updated = StatusEffectService.updateStatusDurations(character)
// updated.statusEffects: sleep effect now has 1 round remaining

// After another round
const expired = StatusEffectService.updateStatusDurations(updated)
// expired.statusEffects: sleep effect removed (duration expired)
```

### curePoison

Cure poison status effect.

**Signature**:
```typescript
function curePoison(character: Character): Character
```

**Parameters**:
- `character`: Poisoned character

**Returns**: New character with poison removed

**Example**:
```typescript
const cured = StatusEffectService.curePoison(character)
// cured.statusEffects does not include poison
```

### cureParalysis

Cure paralysis status effect.

**Signature**:
```typescript
function cureParalysis(character: Character): Character
```

**Parameters**:
- `character`: Paralyzed character

**Returns**: New character with paralysis removed

**Example**:
```typescript
const cured = StatusEffectService.cureParalysis(character)
// cured.statusEffects does not include paralyze
```

### cureStone

Cure petrification (turn character back from stone).

**Signature**:
```typescript
function cureStone(character: Character): Character
```

**Parameters**:
- `character`: Petrified character

**Returns**: New character with petrification removed

**Example**:
```typescript
const cured = StatusEffectService.cureStone(character)
// cured.statusEffects does not include petrify
// cured.status === "alive" (was "petrified")
```

### cureAllStatusEffects

Remove all status effects from character (full cure).

**Signature**:
```typescript
function cureAllStatusEffects(character: Character): Character
```

**Parameters**:
- `character`: Character to cure

**Returns**: New character with all status effects removed

**Example**:
```typescript
// Character has poison, blind, and silence
const fullyCured = StatusEffectService.cureAllStatusEffects(character)
// fullyCured.statusEffects = [] (all effects removed)
```

### getStatusEffectDescription

Get human-readable description of status effect.

**Signature**:
```typescript
function getStatusEffectDescription(effect: StatusEffect): string
```

**Parameters**:
- `effect`: Status effect

**Returns**: Description string

**Example**:
```typescript
const desc = StatusEffectService.getStatusEffectDescription({
  type: "poison",
  duration: -1,
  damagePerTurn: 2
})
// desc = "Poisoned (2 damage per round)"
```

### getAllActiveEffects

Get all active status effects for a character.

**Signature**:
```typescript
function getAllActiveEffects(character: Character): StatusEffect[]
```

**Parameters**:
- `character`: Character to check

**Returns**: Array of active status effects

**Example**:
```typescript
const effects = StatusEffectService.getAllActiveEffects(character)
// effects = [
//   { type: "poison", duration: -1, damagePerTurn: 2 },
//   { type: "blind", duration: 3 }
// ]
```

### isLethalStatus

Check if status effect can cause death.

**Signature**:
```typescript
function isLethalStatus(effectType: StatusEffectType): boolean
```

**Parameters**:
- `effectType`: Status effect type

**Returns**: `true` if effect can kill character

**Example**:
```typescript
const isLethal = StatusEffectService.isLethalStatus("poison")
// isLethal === true (poison damage can reduce HP to 0)

const notLethal = StatusEffectService.isLethalStatus("blind")
// notLethal === false (blind doesn't kill)
```

## Dependencies

Uses:
- `CharacterService` (update character HP from poison damage)
- `ValidationService` (validate status effect types)

## Testing

See [StatusEffectService.test.ts](../../tests/services/StatusEffectService.test.ts)

**Key test cases**:
- Apply status effect (poison, paralyze, petrify, sleep, blind, silence)
- Apply duplicate status effect (does not stack)
- Remove status effect
- Remove non-existent status effect (no-op)
- Check if character has status effect
- Process poison damage (reduces HP)
- Process poison damage when HP reaches 0 (character dies)
- Check if character can act (paralyzed cannot act)
- Check if character can cast spells (silenced cannot cast)
- Check if character is incapacitated (petrified/paralyzed/dead)
- Update status durations (decrement each round)
- Update status durations (remove expired effects)
- Cure poison
- Cure paralysis
- Cure stone (petrification)
- Cure all status effects
- Get status effect description
- Get all active effects
- Check if status is lethal (poison yes, blind no)

## Related

- [CombatService](./CombatService.md) - Applies status effects from attacks
- [SpellService](./SpellService.md) - Status effect spells (KATINO, MORLIS, MANIFO)
- [TempleService](./TempleService.md) - Temple cures status effects
- [DeathService](./DeathService.md) - Handles death from poison
- [Monster Reference](../research/monster-reference.md) - Monsters with status attacks
- [Spell Reference](../research/spell-reference.md) - Status effect spells
