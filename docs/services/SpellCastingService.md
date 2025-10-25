# SpellCastingService

**Pure function service for spell resolution and effect application.**

## Responsibility

Resolves spell casting including spell point deduction, effect application, targeting validation, and spell failure handling.

## API Reference

### castSpell

Cast spell and apply effects.

**Signature**:
```typescript
function castSpell(
  caster: Character,
  spell: Spell,
  target: CombatTarget,
  context: CastContext
): SpellResult
```

**Parameters**:
- `caster`: Character casting spell
- `spell`: Spell being cast
- `target`: Target (ally, enemy, group, party)
- `context`: Combat state or dungeon state

**Returns**: Spell result with effects applied and spell points deducted

**Throws**:
- `InsufficientSpellPointsError` if caster has no points for spell level
- `SpellNotLearnedError` if spell not in caster's spell book
- `InvalidTargetError` if spell cannot target selected target type

**Example**:
```typescript
const priest = createCharacter({
  class: 'Priest',
  spellBook: new Set(['dios']),
  priestSpellPoints: new Map([[1, 3]])  // 3 Level 1 points
})
const fighter = createCharacter({ hp: 10, maxHP: 50 })
const dios = getSpell('dios')  // 1d8 healing

const result = SpellCastingService.castSpell(priest, dios, fighter, combatState)
// result.caster.priestSpellPoints.get(1) = 2 (deducted 1 point)
// result.target.hp = 10 + 1d8 (healed)
```

### deductSpellPoints

Deduct spell point from appropriate pool.

**Signature**:
```typescript
function deductSpellPoints(
  character: Character,
  spell: Spell
): Character
```

**Parameters**:
- `character`: Spellcaster
- `spell`: Spell being cast (determines level and type)

**Returns**: New character with spell point deducted

**Throws**:
- `InsufficientSpellPointsError` if no points remaining

**Example**:
```typescript
const mage = createCharacter({
  mageSpellPoints: new Map([[3, 2]])  // 2 Level 3 points
})
const mahalito = getSpell('mahalito')  // Level 3 mage spell

const updated = SpellCastingService.deductSpellPoints(mage, mahalito)
// updated.mageSpellPoints.get(3) = 1 (deducted 1 point)
```

### validateTarget

Validate spell can target selected target type.

**Signature**:
```typescript
function validateTarget(
  spell: Spell,
  target: CombatTarget
): boolean
```

**Parameters**:
- `spell`: Spell with target type specification
- `target`: Proposed target

**Returns**: True if valid target

**Target Types**:
- `self`: Caster only
- `single_ally`: One party member
- `party`: All party members
- `single_enemy`: One enemy
- `enemy_group`: One monster group
- `all_enemies`: All monster groups
- `location`: Coordinates (MALOR only)

**Example**:
```typescript
const dios = getSpell('dios')  // target: 'single_ally'
const fighter = createCharacter()

const valid = SpellCastingService.validateTarget(dios, fighter)
// Result: true

const halito = getSpell('halito')  // target: 'enemy_group'
const invalid = SpellCastingService.validateTarget(halito, fighter)
// Result: false (cannot target ally with offensive spell)
```

### applyHealingEffect

Apply healing spell effect.

**Signature**:
```typescript
function applyHealingEffect(
  target: Character,
  healingDice: string
): Character
```

**Parameters**:
- `target`: Character to heal
- `healingDice`: Healing amount (e.g. '1d8', '2d8', 'full')

**Returns**: Character with HP restored (capped at maxHP)

**Example**:
```typescript
const wounded = createCharacter({ hp: 10, maxHP: 50 })

const healed = SpellCastingService.applyHealingEffect(wounded, '1d8')
// healed.hp = 10 + (roll 1d8) = 14-18 HP

const fullyHealed = SpellCastingService.applyHealingEffect(wounded, 'full')
// fullyHealed.hp = 50 (maxHP)
```

### applyOffensiveEffect

Apply offensive spell damage.

**Signature**:
```typescript
function applyOffensiveEffect(
  targets: Combatant[],
  spell: Spell
): Combatant[]
```

**Parameters**:
- `targets`: Enemies targeted by spell
- `spell`: Offensive spell with damage dice

**Returns**: Targets with damage applied

**Example**:
```typescript
const orcs = [
  createMonster({ name: 'Orc', hp: 20 }),
  createMonster({ name: 'Orc', hp: 20 })
]
const halito = getSpell('halito')  // 1d8 fire damage to group

const damaged = SpellCastingService.applyOffensiveEffect(orcs, halito)
// Each orc takes 1d8 damage (distributed across group)
```

### applyBuffEffect

Apply buff/debuff effect.

**Signature**:
```typescript
function applyBuffEffect(
  target: Combatant,
  buff: BuffEffect
): Combatant
```

**Parameters**:
- `target`: Combatant receiving buff
- `buff`: Buff specification (AC, stats, etc.)

**Returns**: Combatant with buff applied

**Example**:
```typescript
const fighter = createCharacter({ ac: 5 })
const porfic = { type: 'ac', value: -4, duration: 'battle' }  // PORFIC spell

const buffed = SpellCastingService.applyBuffEffect(fighter, porfic)
// buffed.ac = 1 (5 - 4, better armor class)
```

### resolveSpellFailure

Resolve spell failure for special spells.

**Signature**:
```typescript
function resolveSpellFailure(
  spell: Spell,
  casterLevel: number
): boolean
```

**Parameters**:
- `spell`: Spell being cast
- `casterLevel`: Caster's character level

**Returns**: True if spell succeeds

**Failure Rates**:
- Most spells: Never fail (100% success)
- LOKTOFEIT (Recall): Level × 2% success
- DI (Resurrect): ~90% success, 10% → ashes
- KADORTO (Raise Ashes): ~50% success, 50% → lost forever

**Example**:
```typescript
const loktofeit = getSpell('loktofeit')
const success = SpellCastingService.resolveSpellFailure(loktofeit, 10)
// Success chance: 10 × 2% = 20%

const di = getSpell('di')
const resurrectSuccess = SpellCastingService.resolveSpellFailure(di, 13)
// Success chance: ~90%
```

### getCastableContext

Determine if spell can be cast in current context.

**Signature**:
```typescript
function getCastableContext(spell: Spell): CastContext[]
```

**Parameters**:
- `spell`: Spell to check

**Returns**: Array of contexts where spell is castable

**Contexts**:
- `combat`: During battle
- `dungeon`: Exploring dungeon
- `town`: In town (rare)

**Example**:
```typescript
const halito = getSpell('halito')
const contexts = SpellCastingService.getCastableContext(halito)
// Result: ['combat'] (offensive spell only in combat)

const dios = getSpell('dios')
const healContexts = SpellCastingService.getCastableContext(dios)
// Result: ['combat', 'dungeon', 'town'] (can heal anywhere)
```

## Dependencies

Uses:
- `DamageService` (calculate spell damage)
- `RandomService` (damage rolls, failure rolls)
- `ValidationService` (validate targets, spell points)

## Testing

See [SpellCastingService.test.ts](../../tests/services/SpellCastingService.test.ts)

**Key test cases**:
- Cast spell deducts 1 point from correct pool
- Mage spells use mage pools, priest use priest pools
- Healing spells restore HP (capped at maxHP)
- Offensive spells deal damage to targets
- Buff spells apply effects
- Target validation rejects invalid targets
- Spell point validation throws on insufficient points
- LOKTOFEIT failure rate scales with level
- DI/KADORTO resurrection mechanics
- Context validation (combat vs dungeon vs town)

## Related

- [Spell Reference](../research/spell-reference.md) - All 65+ spells
- [Spell System](../systems/spell-system.md) - Spell system overview
- [CastSpellCommand](../commands/CastSpellCommand.md) - Uses this service
- [SpellLearningService](./SpellLearningService.md) - Learn spells on level-up
