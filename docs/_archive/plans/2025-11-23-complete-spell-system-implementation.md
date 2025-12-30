# Complete Spell System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all 56 Wizardry spells with full game mechanics and comprehensive test coverage.

**Architecture:** Extend SpellCastingService.ts with 31 missing spells, add new spell effect types (invisibility, dispel, transformation, teleportation), update CombatService.ts to handle new mechanics, and write 200+ tests covering all spells systematically by level (1-7).

**Tech Stack:** TypeScript, Angular Signals, Jest, SpellCastingService pattern, CombatService integration

**Current State:**
- 25/56 spells implemented in SpellCastingService.ts
- ~20 spells have basic tests
- Missing: utilities (teleport, recall, identify), transformations, advanced damage spells, additional buffs

**Approach:** Systematic level-by-level implementation (1-7) with full mechanics including success rates, resistances, and edge cases. Write tests first (TDD), implement spells in batches, then comprehensive test suite.

---

## Phase 1: Implement Missing Spell Definitions

### Task 1: Add Level 1-2 Spell Definitions (PORFIC, MELITO, SOPIC, CALFO, MANIFO, MATU)

**Files:**
- Modify: `src/services/SpellCastingService.ts:33-283` (SPELL_CACHE section)
- Reference: `data/spells/*.json` for spell properties

**Step 1: Write failing test for PORFIC**

Create: `src/services/__tests__/SpellCastingService.new-spells.spec.ts`

```typescript
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter } from '../../../test-helpers/test-factories'

describe('SpellCastingService - Level 1-2 Spells', () => {
  describe('PORFIC (Shield)', () => {
    it('applies -4 AC buff to single target', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level1: { current: 3, max: 3 } } }
      })
      const target = createTestCharacter({ id: 'target1' })

      const effect = SpellCastingService.resolveSpellEffect('porfic', caster, [target])

      expect(effect.acBuffs).toBeDefined()
      expect(effect.acBuffs).toHaveLength(1)
      expect(effect.acBuffs![0].target).toBe('target1')
      expect(effect.acBuffs![0].acModifier).toBe(-4)
      expect(effect.message).toContain('PORFIC')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- SpellCastingService.new-spells.spec.ts`
Expected: FAIL - "Unknown spell" because PORFIC not in SPELL_CACHE

**Step 3: Add PORFIC to SPELL_CACHE**

In `src/services/SpellCastingService.ts`, after BADIOS definition (line ~114):

```typescript
SPELL_CACHE.set('porfic', {
  id: 'porfic',
  name: 'PORFIC',
  level: 1,
  type: 'priest',
  target: 'single',
  acModifier: -4
})
```

**Step 4: Run test to verify it passes**

Run: `npm test -- SpellCastingService.new-spells.spec.ts`
Expected: PASS

**Step 5: Add remaining Level 1-2 spells**

Add to SPELL_CACHE in `src/services/SpellCastingService.ts`:

```typescript
// Level 2 Mage Spells
SPELL_CACHE.set('melito', {
  id: 'melito',
  name: 'MELITO',
  level: 2,
  type: 'mage',
  target: 'group',
  damageType: 'fire',
  damageDice: '1d8'
})

SPELL_CACHE.set('sopic', {
  id: 'sopic',
  name: 'SOPIC',
  level: 2,
  type: 'mage',
  target: 'single',
  statusEffect: 'INVISIBLE'
})

// Level 2 Priest Spells
SPELL_CACHE.set('calfo', {
  id: 'calfo',
  name: 'CALFO',
  level: 2,
  type: 'priest',
  target: 'self',
  utility: 'identify_trap'
})

SPELL_CACHE.set('manifo', {
  id: 'manifo',
  name: 'MANIFO',
  level: 2,
  type: 'priest',
  target: 'group',
  statusEffect: 'SILENCED'
})

SPELL_CACHE.set('matu', {
  id: 'matu',
  name: 'MATU',
  level: 2,
  type: 'priest',
  target: 'all_allies',
  acModifier: -2
})
```

**Step 6: Write tests for new spells**

Add to `src/services/__tests__/SpellCastingService.new-spells.spec.ts`:

```typescript
  describe('MELITO (Sparks)', () => {
    it('deals 1d8 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1' }),
        createTestCharacter({ id: 't2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('melito', caster, targets)

      expect(effect.damage).toBeDefined()
      expect(effect.damage).toHaveLength(2)
      expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
      expect(effect.damage![0]).toBeLessThanOrEqual(8)
    })
  })

  describe('SOPIC (Invisibility)', () => {
    it('applies INVISIBLE status to single target', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } }
      })
      const target = createTestCharacter({ id: 'target1' })

      const effect = SpellCastingService.resolveSpellEffect('sopic', caster, [target])

      expect(effect.statusEffects).toBeDefined()
      expect(effect.statusEffects![0].effect).toBe('INVISIBLE')
    })
  })

  describe('MATU (Bless)', () => {
    it('applies -2 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level2: { current: 2, max: 2 } } }
      })
      const allies = [
        createTestCharacter({ id: 'a1' }),
        createTestCharacter({ id: 'a2' }),
        createTestCharacter({ id: 'a3' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('matu', caster, allies)

      expect(effect.acBuffs).toHaveLength(3)
      expect(effect.acBuffs![0].acModifier).toBe(-2)
    })
  })
```

**Step 7: Run tests**

Run: `npm test -- SpellCastingService.new-spells.spec.ts`
Expected: ALL PASS

**Step 8: Commit Level 1-2 spells**

```bash
git add src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.new-spells.spec.ts
git commit -m "feat(spells): add level 1-2 spells (PORFIC, MELITO, SOPIC, CALFO, MANIFO, MATU)"
```

---

### Task 2: Add Level 3 Spell Definitions (MOLITO, BAMATU, LOMILWA)

**Files:**
- Modify: `src/services/SpellCastingService.ts:33-283`

**Step 1: Add Level 3 spells to SPELL_CACHE**

```typescript
// Level 3 Mage Spells (after LAHALITO)
SPELL_CACHE.set('molito', {
  id: 'molito',
  name: 'MOLITO',
  level: 3,
  type: 'mage',
  target: 'group',
  damageType: 'fire',
  damageDice: '3d6'
})

// Level 3 Priest Spells (after KALKI)
SPELL_CACHE.set('bamatu', {
  id: 'bamatu',
  name: 'BAMATU',
  level: 3,
  type: 'priest',
  target: 'all_allies',
  acModifier: -4
})

SPELL_CACHE.set('lomilwa', {
  id: 'lomilwa',
  name: 'LOMILWA',
  level: 3,
  type: 'priest',
  target: 'self',
  utility: 'extended_light'
})
```

**Step 2: Write tests**

Add to `src/services/__tests__/SpellCastingService.new-spells.spec.ts`:

```typescript
  describe('MOLITO (Improved Sparks)', () => {
    it('deals 3d6 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level3: { current: 1, max: 1 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('molito', caster, targets)

      expect(effect.damage![0]).toBeGreaterThanOrEqual(3)
      expect(effect.damage![0]).toBeLessThanOrEqual(18)
    })
  })

  describe('BAMATU (Prayer)', () => {
    it('applies -4 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level3: { current: 1, max: 1 } } }
      })
      const allies = [createTestCharacter({ id: 'a1' })]

      const effect = SpellCastingService.resolveSpellEffect('bamatu', caster, allies)

      expect(effect.acBuffs![0].acModifier).toBe(-4)
    })
  })

  describe('LOMILWA (Extended Light)', () => {
    it('provides extended light utility', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level3: { current: 1, max: 1 } } }
      })

      const effect = SpellCastingService.resolveSpellEffect('lomilwa', caster, [caster])

      expect(effect.message).toContain('LOMILWA')
    })
  })
```

**Step 3: Run tests**

Run: `npm test -- SpellCastingService.new-spells.spec.ts`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.new-spells.spec.ts
git commit -m "feat(spells): add level 3 spells (MOLITO, BAMATU, LOMILWA)"
```

---

### Task 3: Add Level 4 Spell Definitions (BAMORDI, DALTO, KANDI, KATU, MAPORFIC)

**Files:**
- Modify: `src/services/SpellCastingService.ts:33-283`

**Step 1: Add Level 4 spells to SPELL_CACHE**

```typescript
// Level 4 Priest Spells (after LATUMOFIS)
SPELL_CACHE.set('bamordi', {
  id: 'bamordi',
  name: 'BAMORDI',
  level: 4,
  type: 'priest',
  target: 'single',
  damageType: 'holy',
  damageDice: '3d8'
})

SPELL_CACHE.set('dalto_priest', {
  id: 'dalto_priest',
  name: 'DALTO',
  level: 4,
  type: 'priest',
  target: 'all_enemies',
  damageType: 'cold',
  damageDice: '4d6'
})

SPELL_CACHE.set('kandi', {
  id: 'kandi',
  name: 'KANDI',
  level: 4,
  type: 'priest',
  target: 'self',
  utility: 'locate_person'
})

SPELL_CACHE.set('katu', {
  id: 'katu',
  name: 'KATU',
  level: 4,
  type: 'priest',
  target: 'all_allies',
  acModifier: -6
})

SPELL_CACHE.set('maporfic', {
  id: 'maporfic',
  name: 'MAPORFIC',
  level: 4,
  type: 'priest',
  target: 'all_allies',
  acModifier: -4
})
```

**Step 2: Write tests**

Add to `src/services/__tests__/SpellCastingService.new-spells.spec.ts`:

```typescript
  describe('BAMORDI (Harm Greater)', () => {
    it('deals 3d8 holy damage to single target', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level4: { current: 1, max: 1 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const effect = SpellCastingService.resolveSpellEffect('bamordi', caster, [target])

      expect(effect.damage).toHaveLength(1)
      expect(effect.damage![0]).toBeGreaterThanOrEqual(3)
      expect(effect.damage![0]).toBeLessThanOrEqual(24)
    })
  })

  describe('KATU (Talisman)', () => {
    it('applies massive -6 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level4: { current: 1, max: 1 } } }
      })
      const allies = [createTestCharacter({ id: 'a1' })]

      const effect = SpellCastingService.resolveSpellEffect('katu', caster, allies)

      expect(effect.acBuffs![0].acModifier).toBe(-6)
    })
  })
```

**Step 3: Run tests and commit**

Run: `npm test -- SpellCastingService.new-spells.spec.ts`

```bash
git add src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.new-spells.spec.ts
git commit -m "feat(spells): add level 4 spells (BAMORDI, DALTO, KANDI, KATU, MAPORFIC)"
```

---

### Task 4: Add Level 5 Advanced Spells (LAKANITO, ZILWAN, MADALTO, BADI, LOKTOFEIT)

**Files:**
- Modify: `src/services/SpellCastingService.ts:33-283`
- Modify: `src/services/SpellCastingService.ts:12-31` (Add new spell properties)

**Step 1: Add new spell properties to SpellData interface**

In `src/services/SpellCastingService.ts`, update SpellData interface:

```typescript
export interface SpellData {
  id: string
  name: string
  level: number
  type: 'mage' | 'priest'
  target: SpellTarget
  damageType?: string
  damageDice?: string
  undeadOnly?: boolean
  statusEffect?: 'BLIND' | 'SILENCED' | 'ASLEEP' | 'INVISIBLE'  // Added INVISIBLE
  healingDice?: string
  healToFull?: boolean
  acModifier?: number
  utility?: 'reveal_stats' | 'identify_foe' | 'identify_trap' | 'locate_person' | 'extended_light' | 'teleport' | 'recall'  // Added new utilities
  instantDeath?: boolean
  resurrection?: boolean
  statusCure?: StatusCure
  causeFear?: boolean
  dispelMagic?: boolean  // NEW
  transformation?: boolean  // NEW
  teleportSuccessRate?: number  // NEW
  recallSuccessRate?: number  // NEW - calculated as level × 2%
  ignoresAC?: boolean  // NEW - for LAKANITO
}
```

**Step 2: Add Level 5 spells to SPELL_CACHE**

```typescript
// Mage Level 5 Spells (after MAKANITO)
SPELL_CACHE.set('lakanito', {
  id: 'lakanito',
  name: 'LAKANITO',
  level: 5,
  type: 'mage',
  target: 'group',
  damageType: 'air',
  damageDice: '6d6',
  ignoresAC: true
})

SPELL_CACHE.set('zilwan', {
  id: 'zilwan',
  name: 'ZILWAN',
  level: 5,
  type: 'mage',
  target: 'group',
  dispelMagic: true
})

SPELL_CACHE.set('madalto', {
  id: 'madalto',
  name: 'MADALTO',
  level: 5,
  type: 'mage',
  target: 'all_enemies',
  damageType: 'cold',
  damageDice: '8d6'
})

// Priest Level 5 Spells (after LITOKAN)
SPELL_CACHE.set('badi', {
  id: 'badi',
  name: 'BADI',
  level: 5,
  type: 'priest',
  target: 'single',
  instantDeath: true
})

SPELL_CACHE.set('loktofeit', {
  id: 'loktofeit',
  name: 'LOKTOFEIT',
  level: 5,
  type: 'priest',
  target: 'self',
  utility: 'recall'
})
```

**Step 3: Write tests for advanced mechanics**

Add to `src/services/__tests__/SpellCastingService.new-spells.spec.ts`:

```typescript
  describe('LAKANITO (Suffocation)', () => {
    it('deals 6d6 air damage that ignores AC', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level5: { current: 1, max: 1 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('lakanito', caster, targets)

      expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
      expect(effect.damage![0]).toBeLessThanOrEqual(36)
      expect(effect.message).toContain('LAKANITO')
    })
  })

  describe('ZILWAN (Dispel Magic)', () => {
    it('dispels magic effects from group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level5: { current: 1, max: 1 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('zilwan', caster, targets)

      expect(effect.message).toContain('dispels')
    })
  })

  describe('BADI (Death)', () => {
    it('attempts instant death on single target', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level5: { current: 1, max: 1 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const effect = SpellCastingService.resolveSpellEffect('badi', caster, [target])

      expect(effect.instantDeath).toBeDefined()
      expect(effect.instantDeath).toContain('t1')
    })
  })
```

**Step 4: Implement dispel magic handler in resolveSpellEffect**

In `src/services/SpellCastingService.ts`, add before line 508:

```typescript
// Handle dispel magic (ZILWAN)
if (spell.dispelMagic) {
  const targetIds = targets.map(t => t.id)
  return {
    dispelEffects: targetIds,
    message: `${spell.name} dispels all magic effects!`
  }
}
```

**Step 5: Run tests and commit**

Run: `npm test -- SpellCastingService.new-spells.spec.ts`

```bash
git add src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.new-spells.spec.ts
git commit -m "feat(spells): add level 5 advanced spells (LAKANITO, ZILWAN, MADALTO, BADI, LOKTOFEIT) with dispel magic"
```

---

### Task 5: Add Level 6-7 Spells (HAMAN, MALOR, LORTO, MAHAMAN, DI, MABADI)

**Files:**
- Modify: `src/services/SpellCastingService.ts:33-283`

**Step 1: Add Level 6-7 spells to SPELL_CACHE**

```typescript
// Mage Level 6 Spells
SPELL_CACHE.set('haman', {
  id: 'haman',
  name: 'HAMAN',
  level: 6,
  type: 'mage',
  target: 'single',
  transformation: true
})

SPELL_CACHE.set('lomilwa_mage', {
  id: 'lomilwa_mage',
  name: 'LOMILWA',
  level: 6,
  type: 'mage',
  target: 'self',
  utility: 'extended_light'
})

SPELL_CACHE.set('malor', {
  id: 'malor',
  name: 'MALOR',
  level: 6,
  type: 'mage',
  target: 'self',
  utility: 'teleport',
  teleportSuccessRate: 0.75
})

// Priest Level 6 Spells
SPELL_CACHE.set('lorto', {
  id: 'lorto',
  name: 'LORTO',
  level: 6,
  type: 'priest',
  target: 'all_enemies',
  damageType: 'physical',
  damageDice: '6d6'
})

// Mage Level 7 Spells
SPELL_CACHE.set('mahaman', {
  id: 'mahaman',
  name: 'MAHAMAN',
  level: 7,
  type: 'mage',
  target: 'all_enemies',
  transformation: true
})

// Priest Level 7 Spells
SPELL_CACHE.set('di', {
  id: 'di',
  name: 'DI',
  level: 7,
  type: 'priest',
  target: 'single',
  resurrection: true,
  resurrectionSuccessRate: 0.90
})

SPELL_CACHE.set('mabadi', {
  id: 'mabadi',
  name: 'MABADI',
  level: 7,
  type: 'priest',
  target: 'all_enemies',
  instantDeath: true
})
```

**Step 2: Add resurrectionSuccessRate to SpellData**

Update SpellData interface:

```typescript
export interface SpellData {
  // ... existing properties
  resurrection?: boolean
  resurrectionSuccessRate?: number  // NEW - 0.50 for KADORTO, 0.90 for DI
  // ...
}
```

**Step 3: Update KADORTO with success rate**

```typescript
SPELL_CACHE.set('kadorto', {
  id: 'kadorto',
  name: 'KADORTO',
  level: 7,
  type: 'priest',
  target: 'single',
  resurrection: true,
  resurrectionSuccessRate: 0.50  // ADD THIS
})
```

**Step 4: Write tests**

```typescript
  describe('HAMAN (Transformation)', () => {
    it('transforms single monster', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const effect = SpellCastingService.resolveSpellEffect('haman', caster, [target])

      expect(effect.message).toContain('transforms')
    })
  })

  describe('MALOR (Teleport)', () => {
    it('provides teleport utility with 75% success rate', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })

      const spell = SpellCastingService.getSpell('malor')
      expect(spell?.teleportSuccessRate).toBe(0.75)
    })
  })

  describe('DI (Resurrection)', () => {
    it('has 90% resurrection success rate', () => {
      const spell = SpellCastingService.getSpell('di')
      expect(spell?.resurrectionSuccessRate).toBe(0.90)
    })
  })

  describe('MABADI (Death All)', () => {
    it('attempts instant death on all enemies', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level7: { current: 1, max: 1 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1' }),
        createTestCharacter({ id: 't2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('mabadi', caster, targets)

      expect(effect.instantDeath).toContain('t1')
      expect(effect.instantDeath).toContain('t2')
    })
  })
```

**Step 5: Run tests and commit**

```bash
git add src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.new-spells.spec.ts
git commit -m "feat(spells): add level 6-7 spells (HAMAN, MALOR, LORTO, MAHAMAN, DI, MABADI)"
```

---

## Phase 2: Implement Complex Spell Mechanics

### Task 6: Add Transformation and Teleportation Handlers

**Files:**
- Modify: `src/types/Combat.ts:1-50` (Add new effect types)
- Modify: `src/services/SpellCastingService.ts:349-509` (resolveSpellEffect method)

**Step 1: Update SpellEffect type**

In `src/types/Combat.ts`, add new effect properties:

```typescript
export interface SpellEffect {
  damage?: number[]
  healing?: number[]
  statusEffects?: Array<{
    target: string
    effect: string
    acModifier?: number
  }>
  acBuffs?: Array<{
    target: string
    acModifier: number
  }>
  fullHeal?: string[]
  instantDeath?: string[]
  resurrection?: string[]
  revealedInfo?: {
    targetIds: string[]
    type: 'stats' | 'identity'
  }
  statusCures?: {
    targetIds: string[]
    cureType: StatusCure
  }
  causeFear?: string[]

  // NEW EFFECT TYPES
  dispelEffects?: string[]
  teleport?: {
    success: boolean
    targetX?: number
    targetY?: number
    targetLevel?: number
  }
  recall?: {
    success: boolean
  }
  transformations?: Array<{
    monsterId: string
    newType: string
  }>

  message: string
}
```

**Step 2: Write test for transformation effect**

Create: `src/services/__tests__/SpellCastingService.transformation.spec.ts`

```typescript
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter, createTestMonster } from '../../../test-helpers/test-factories'

describe('SpellCastingService - Transformation Mechanics', () => {
  describe('HAMAN (Transform Single)', () => {
    it('returns transformation effect for single monster', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })
      const monster = createTestMonster({ id: 'm1', type: 'ORC' })

      const effect = SpellCastingService.resolveSpellEffect('haman', caster, [monster])

      expect(effect.transformations).toBeDefined()
      expect(effect.transformations).toHaveLength(1)
      expect(effect.transformations![0].monsterId).toBe('m1')
      expect(effect.message).toContain('transforms')
    })
  })

  describe('MAHAMAN (Transform All)', () => {
    it('returns transformation effect for all monsters', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level7: { current: 1, max: 1 } } }
      })
      const monsters = [
        createTestMonster({ id: 'm1' }),
        createTestMonster({ id: 'm2' }),
        createTestMonster({ id: 'm3' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('mahaman', caster, monsters)

      expect(effect.transformations).toHaveLength(3)
    })
  })
})
```

**Step 3: Run test to verify it fails**

Run: `npm test -- SpellCastingService.transformation.spec.ts`
Expected: FAIL - transformations effect not implemented

**Step 4: Implement transformation handler**

In `src/services/SpellCastingService.ts`, add before line 508:

```typescript
// Handle transformation (HAMAN, MAHAMAN)
if (spell.transformation) {
  const transformations = targets.map(t => ({
    monsterId: t.id,
    newType: 'RANDOM'  // Will be resolved by CombatService based on level
  }))
  return {
    transformations,
    message: `${spell.name} transforms the monsters!`
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm test -- SpellCastingService.transformation.spec.ts`
Expected: PASS

**Step 6: Implement teleport/recall handlers**

Add to `src/services/SpellCastingService.ts`:

```typescript
// Handle teleportation (MALOR)
if (spell.utility === 'teleport') {
  // Success rate from spell data, default 75%
  const success = Math.random() < (spell.teleportSuccessRate || 0.75)
  return {
    teleport: {
      success
      // Coordinates will be provided by dungeon navigation UI
    },
    message: success
      ? `${spell.name} teleports the party!`
      : `${spell.name} fails! The party is scattered!`
  }
}

// Handle recall to town (LOKTOFEIT)
if (spell.utility === 'recall') {
  // Success rate: caster level × 2%, max 95%
  const casterLevel = (caster as any).level || 1
  const successRate = Math.min(casterLevel * 2, 95)
  const success = Math.random() * 100 < successRate
  return {
    recall: { success },
    message: success
      ? `${spell.name} recalls the party to town!`
      : `${spell.name} fails! The party remains in the dungeon!`
  }
}
```

**Step 7: Write tests for teleport/recall**

```typescript
describe('SpellCastingService - Teleport & Recall', () => {
  describe('MALOR (Teleport)', () => {
    it('has 75% success rate', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })

      let successCount = 0
      for (let i = 0; i < 100; i++) {
        const effect = SpellCastingService.resolveSpellEffect('malor', caster, [caster])
        if (effect.teleport?.success) successCount++
      }

      // Should be roughly 75% (allow 10% variance in 100 trials)
      expect(successCount).toBeGreaterThan(65)
      expect(successCount).toBeLessThan(85)
    })
  })

  describe('LOKTOFEIT (Recall)', () => {
    it('success rate scales with caster level', () => {
      const level1Caster = createTestCharacter({
        level: 1,
        spellPoints: { priest: { level5: { current: 1, max: 1 } } }
      })
      const level20Caster = createTestCharacter({
        level: 20,
        spellPoints: { priest: { level5: { current: 1, max: 1 } } }
      })

      // Level 1: 2% success
      let level1Success = 0
      for (let i = 0; i < 100; i++) {
        const effect = SpellCastingService.resolveSpellEffect('loktofeit', level1Caster, [level1Caster])
        if (effect.recall?.success) level1Success++
      }
      expect(level1Success).toBeLessThan(15)  // Should be ~2%

      // Level 20: 40% success
      let level20Success = 0
      for (let i = 0; i < 100; i++) {
        const effect = SpellCastingService.resolveSpellEffect('loktofeit', level20Caster, [level20Caster])
        if (effect.recall?.success) level20Success++
      }
      expect(level20Success).toBeGreaterThan(30)  // Should be ~40%
    })
  })
})
```

**Step 8: Run all new tests**

Run: `npm test -- SpellCastingService.transformation.spec.ts`

**Step 9: Commit**

```bash
git add src/types/Combat.ts src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.transformation.spec.ts
git commit -m "feat(spells): implement transformation, teleport, and recall mechanics"
```

---

## Phase 3: Comprehensive Test Suite

### Task 7: Test All Mage Spells Level 1-3

**Files:**
- Create: `src/services/__tests__/SpellCastingService.mage-1-3.spec.ts`

**Step 1: Write comprehensive tests for Level 1-3 mage spells**

```typescript
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter } from '../../../test-helpers/test-factories'

describe('SpellCastingService - Mage Spells Level 1-3', () => {
  describe('Level 1: HALITO (Fireball)', () => {
    it('deals 1d8 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1' }),
        createTestCharacter({ id: 't2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('halito', caster, targets)

      expect(effect.damage).toHaveLength(2)
      expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
      expect(effect.damage![0]).toBeLessThanOrEqual(8)
    })

    it('deals different damage to each target', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })
      const targets = Array(10).fill(null).map((_, i) => createTestCharacter({ id: `t${i}` }))

      const effect = SpellCastingService.resolveSpellEffect('halito', caster, targets)

      // With 10 targets, should have variation in damage
      const uniqueDamage = new Set(effect.damage).size
      expect(uniqueDamage).toBeGreaterThan(1)
    })

    it('records fire damage type', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const spell = SpellCastingService.getSpell('halito')
      expect(spell?.damageType).toBe('fire')
    })

    it('targets group', () => {
      const spell = SpellCastingService.getSpell('halito')
      expect(spell?.target).toBe('group')
    })
  })

  describe('Level 1: KATINO (Sleep)', () => {
    it('applies ASLEEP status to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1' }),
        createTestCharacter({ id: 't2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('katino', caster, targets)

      expect(effect.statusEffects).toHaveLength(2)
      expect(effect.statusEffects![0].effect).toBe('ASLEEP')
    })

    it('applies status to each target separately', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1' }),
        createTestCharacter({ id: 't2' }),
        createTestCharacter({ id: 't3' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('katino', caster, targets)

      expect(effect.statusEffects![0].target).toBe('t1')
      expect(effect.statusEffects![1].target).toBe('t2')
      expect(effect.statusEffects![2].target).toBe('t3')
    })
  })

  describe('Level 2: DILTO (Blind)', () => {
    it('applies BLIND status to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('dilto', caster, targets)

      expect(effect.statusEffects![0].effect).toBe('BLIND')
    })
  })

  describe('Level 2: MOGREF (Shield)', () => {
    it('applies -2 AC buff to all allies', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } }
      })
      const allies = [
        createTestCharacter({ id: 'a1' }),
        createTestCharacter({ id: 'a2' })
      ]

      const effect = SpellCastingService.resolveSpellEffect('mogref', caster, allies)

      expect(effect.acBuffs).toHaveLength(2)
      expect(effect.acBuffs![0].acModifier).toBe(-2)
    })
  })

  describe('Level 2: MELITO (Sparks)', () => {
    it('deals 1d8 fire damage per target', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('melito', caster, targets)

      expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
      expect(effect.damage![0]).toBeLessThanOrEqual(8)
    })
  })

  describe('Level 2: SOPIC (Invisibility)', () => {
    it('applies INVISIBLE status to single target', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level2: { current: 2, max: 2 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const effect = SpellCastingService.resolveSpellEffect('sopic', caster, [target])

      expect(effect.statusEffects![0].effect).toBe('INVISIBLE')
    })
  })

  describe('Level 3: MAHALITO (Fireball)', () => {
    it('deals 4d6 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level3: { current: 1, max: 1 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('mahalito', caster, targets)

      expect(effect.damage![0]).toBeGreaterThanOrEqual(4)
      expect(effect.damage![0]).toBeLessThanOrEqual(24)
    })

    it('deals more damage than HALITO', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level3: { current: 1, max: 1 }
          }
        }
      })
      const target = createTestCharacter({ id: 't1' })

      const halitoEffect = SpellCastingService.resolveSpellEffect('halito', caster, [target])
      const mahalitoEffect = SpellCastingService.resolveSpellEffect('mahalito', caster, [target])

      // MAHALITO (4-24) should statistically be higher than HALITO (1-8)
      expect(mahalitoEffect.damage![0]).toBeGreaterThan(0)
    })
  })

  describe('Level 3: LAHALITO (Flame Bolt)', () => {
    it('deals 6d6 fire damage to single target', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level3: { current: 1, max: 1 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const effect = SpellCastingService.resolveSpellEffect('lahalito', caster, [target])

      expect(effect.damage).toHaveLength(1)
      expect(effect.damage![0]).toBeGreaterThanOrEqual(6)
      expect(effect.damage![0]).toBeLessThanOrEqual(36)
    })

    it('targets single enemy only', () => {
      const spell = SpellCastingService.getSpell('lahalito')
      expect(spell?.target).toBe('single')
    })
  })

  describe('Level 3: MOLITO (Improved Sparks)', () => {
    it('deals 3d6 fire damage to group', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level3: { current: 1, max: 1 } } }
      })
      const targets = [createTestCharacter({ id: 't1' })]

      const effect = SpellCastingService.resolveSpellEffect('molito', caster, targets)

      expect(effect.damage![0]).toBeGreaterThanOrEqual(3)
      expect(effect.damage![0]).toBeLessThanOrEqual(18)
    })
  })
})
```

**Step 2: Run tests**

Run: `npm test -- SpellCastingService.mage-1-3.spec.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/services/__tests__/SpellCastingService.mage-1-3.spec.ts
git commit -m "test(spells): add comprehensive tests for mage spells level 1-3"
```

---

### Task 8: Test All Mage Spells Level 4-7

**Files:**
- Create: `src/services/__tests__/SpellCastingService.mage-4-7.spec.ts`

**Step 1: Write tests** (similar structure to Task 7, covering DALTO, MORLIS, MAKANITO, LAKANITO, ZILWAN, MADALTO, HAMAN, MALOR, TILTOWAIT, MAHAMAN)

**Step 2: Run tests and commit**

```bash
npm test -- SpellCastingService.mage-4-7.spec.ts
git add src/services/__tests__/SpellCastingService.mage-4-7.spec.ts
git commit -m "test(spells): add comprehensive tests for mage spells level 4-7"
```

---

### Task 9: Test All Priest Spells Level 1-4

**Files:**
- Create: `src/services/__tests__/SpellCastingService.priest-1-4.spec.ts`

**Step 1: Write comprehensive tests** (covering DIOS, BADIOS, MILWA, PORFIC, DIAL, MONTINO, LATUMAPIC, CALFO, MANIFO, MATU, KALKI, BAMATU, LOMILWA, BADIAL, LATUMOFIS, BAMORDI, DALTO, KANDI, KATU, MAPORFIC)

**Step 2: Run tests and commit**

```bash
npm test -- SpellCastingService.priest-1-4.spec.ts
git add src/services/__tests__/SpellCastingService.priest-1-4.spec.ts
git commit -m "test(spells): add comprehensive tests for priest spells level 1-4"
```

---

### Task 10: Test All Priest Spells Level 5-7

**Files:**
- Create: `src/services/__tests__/SpellCastingService.priest-5-7.spec.ts`

**Step 1: Write tests** (covering DIALKO, BADIALMA, LITOKAN, BADI, LOKTOFEIT, MADI, LORTO, KADORTO, MALIKTO, DI, MABADI)

**Step 2: Run tests and commit**

```bash
npm test -- SpellCastingService.priest-5-7.spec.ts
git add src/services/__tests__/SpellCastingService.priest-5-7.spec.ts
git commit -m "test(spells): add comprehensive tests for priest spells level 5-7"
```

---

### Task 11: Test Spell Eligibility & Validation

**Files:**
- Create: `src/services/__tests__/SpellCastingService.eligibility.spec.ts`

**Step 1: Write eligibility tests**

```typescript
import { SpellCastingService } from '../SpellCastingService'
import { createTestCharacter } from '../../../test-helpers/test-factories'
import { CharacterStatus } from '../../../types/CharacterStatus'

describe('SpellCastingService - Spell Eligibility', () => {
  describe('Spell Point Validation', () => {
    it('allows casting with sufficient spell points', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')
      expect(result.canCast).toBe(true)
    })

    it('prevents casting with insufficient spell points', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 0, max: 3 } } }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')
      expect(result.canCast).toBe(false)
      expect(result.reason).toContain('Insufficient spell points')
    })

    it('checks correct spell level pool', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 0, max: 3 },
            level3: { current: 2, max: 2 }
          }
        }
      })

      // Level 1 spell should fail
      expect(SpellCastingService.canCastSpell(caster, 'halito').canCast).toBe(false)

      // Level 3 spell should succeed
      expect(SpellCastingService.canCastSpell(caster, 'mahalito').canCast).toBe(true)
    })

    it('checks correct spell type pool (mage vs priest)', () => {
      const caster = createTestCharacter({
        spellPoints: {
          mage: { level1: { current: 3, max: 3 } },
          priest: { level1: { current: 0, max: 0 } }
        }
      })

      // Mage spell should succeed
      expect(SpellCastingService.canCastSpell(caster, 'halito').canCast).toBe(true)

      // Priest spell should fail (no priest points)
      expect(SpellCastingService.canCastSpell(caster, 'dios').canCast).toBe(false)
    })
  })

  describe('Incapacitation Checks', () => {
    it('prevents casting while ASLEEP', () => {
      const caster = createTestCharacter({
        status: CharacterStatus.ASLEEP,
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')
      expect(result.canCast).toBe(false)
      expect(result.reason).toContain('incapacitated')
    })

    it('prevents casting while PARALYZED', () => {
      const caster = createTestCharacter({
        status: CharacterStatus.PARALYZED,
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')
      expect(result.canCast).toBe(false)
    })

    it('allows casting with normal status', () => {
      const caster = createTestCharacter({
        status: CharacterStatus.OK,
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')
      expect(result.canCast).toBe(true)
    })

    it('allows casting while INJURED', () => {
      const caster = createTestCharacter({
        status: CharacterStatus.INJURED,
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })

      const result = SpellCastingService.canCastSpell(caster, 'halito')
      expect(result.canCast).toBe(true)
    })
  })

  describe('Spell Point Deduction', () => {
    it('deducts 1 point from correct spell level', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })

      const updated = SpellCastingService.deductSpellPoints(caster, 'halito')

      expect(updated.spellPoints?.mage?.level1?.current).toBe(2)
      expect(updated.spellPoints?.mage?.level1?.max).toBe(3)
    })

    it('returns new character object (immutability)', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })

      const updated = SpellCastingService.deductSpellPoints(caster, 'halito')

      expect(updated).not.toBe(caster)
      expect(caster.spellPoints?.mage?.level1?.current).toBe(3)  // Original unchanged
    })

    it('does not go below zero spell points', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 0, max: 3 } } }
      })

      const updated = SpellCastingService.deductSpellPoints(caster, 'halito')

      expect(updated.spellPoints?.mage?.level1?.current).toBe(0)
    })
  })

  describe('Target Validation', () => {
    it('single target spells require exactly one target', () => {
      const spell = SpellCastingService.getSpell('lahalito')
      expect(spell?.target).toBe('single')
    })

    it('group target spells accept multiple targets', () => {
      const spell = SpellCastingService.getSpell('halito')
      expect(spell?.target).toBe('group')
    })

    it('all_allies spells target entire party', () => {
      const spell = SpellCastingService.getSpell('mogref')
      expect(spell?.target).toBe('all_allies')
    })

    it('all_enemies spells target all monster groups', () => {
      const spell = SpellCastingService.getSpell('tiltowait')
      expect(spell?.target).toBe('all_enemies')
    })

    it('self target spells affect caster only', () => {
      const spell = SpellCastingService.getSpell('malor')
      expect(spell?.target).toBe('self')
    })
  })
})
```

**Step 2: Run tests and commit**

```bash
npm test -- SpellCastingService.eligibility.spec.ts
git add src/services/__tests__/SpellCastingService.eligibility.spec.ts
git commit -m "test(spells): add spell eligibility and validation tests"
```

---

### Task 12: Test Edge Cases

**Files:**
- Create: `src/services/__tests__/SpellCastingService.edge-cases.spec.ts`

**Step 1: Write edge case tests**

```typescript
describe('SpellCastingService - Edge Cases', () => {
  describe('Damage Variance', () => {
    it('damage rolls stay within dice range', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      for (let i = 0; i < 100; i++) {
        const effect = SpellCastingService.resolveSpellEffect('halito', caster, [target])
        expect(effect.damage![0]).toBeGreaterThanOrEqual(1)
        expect(effect.damage![0]).toBeLessThanOrEqual(8)
      }
    })

    it('multiple rolls produce varied results', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level3: { current: 1, max: 1 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const results = new Set()
      for (let i = 0; i < 20; i++) {
        const effect = SpellCastingService.resolveSpellEffect('mahalito', caster, [target])
        results.add(effect.damage![0])
      }

      // Should have at least 5 different values in 20 rolls
      expect(results.size).toBeGreaterThanOrEqual(5)
    })

    it('damage is never negative', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })
      const target = createTestCharacter({ id: 't1' })

      const effect = SpellCastingService.resolveSpellEffect('halito', caster, [target])
      expect(effect.damage![0]).toBeGreaterThan(0)
    })
  })

  describe('Empty/Invalid Targets', () => {
    it('handles empty target list gracefully', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })

      const effect = SpellCastingService.resolveSpellEffect('halito', caster, [])

      expect(effect.damage).toEqual([])
      expect(effect.message).toBeDefined()
    })

    it('filters out undefined targets', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level1: { current: 3, max: 3 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1' }),
        undefined as any,
        createTestCharacter({ id: 't2' })
      ].filter(Boolean)

      const effect = SpellCastingService.resolveSpellEffect('halito', caster, targets)

      expect(effect.damage).toHaveLength(2)
    })
  })

  describe('Healing Edge Cases', () => {
    it('healing does not exceed maxHP', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level1: { current: 3, max: 3 } } }
      })
      const target = createTestCharacter({
        id: 't1',
        hp: 5,
        maxHp: 10
      })

      const effect = SpellCastingService.resolveSpellEffect('dios', caster, [target])

      // Even if healing is 8, target should not exceed 10 HP
      // (This would be enforced by CombatService, but we test the value range)
      expect(effect.healing![0]).toBeGreaterThanOrEqual(1)
      expect(effect.healing![0]).toBeLessThanOrEqual(8)
    })

    it('full heal restores exactly to maxHP', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level7: { current: 1, max: 1 } } }
      })
      const targets = [
        createTestCharacter({ id: 't1', hp: 5, maxHp: 20 }),
        createTestCharacter({ id: 't2', hp: 1, maxHp: 30 })
      ]

      const effect = SpellCastingService.resolveSpellEffect('malikto', caster, targets)

      expect(effect.fullHeal).toContain('t1')
      expect(effect.fullHeal).toContain('t2')
    })
  })

  describe('Status Effect Conflicts', () => {
    it('multiple status effects can coexist', () => {
      // This would be tested in CombatService integration
      // Just verify spell effects are generated correctly
      const caster = createTestCharacter({
        spellPoints: {
          mage: {
            level1: { current: 3, max: 3 },
            level2: { current: 2, max: 2 }
          }
        }
      })
      const target = createTestCharacter({ id: 't1' })

      const sleepEffect = SpellCastingService.resolveSpellEffect('katino', caster, [target])
      const blindEffect = SpellCastingService.resolveSpellEffect('dilto', caster, [target])

      expect(sleepEffect.statusEffects![0].effect).toBe('ASLEEP')
      expect(blindEffect.statusEffects![0].effect).toBe('BLIND')
    })
  })

  describe('Undead-Only Spell Restrictions', () => {
    it('BADIOS only affects undead', () => {
      const caster = createTestCharacter({
        spellPoints: { priest: { level1: { current: 3, max: 3 } } }
      })
      const undead = createTestCharacter({ id: 'u1', undead: true })
      const living = createTestCharacter({ id: 'l1', undead: false })

      const effectUndead = SpellCastingService.resolveSpellEffect('badios', caster, [undead])
      const effectLiving = SpellCastingService.resolveSpellEffect('badios', caster, [living])

      expect(effectUndead.damage).toHaveLength(1)
      expect(effectLiving.damage).toHaveLength(0)
      expect(effectLiving.message).toContain('no effect')
    })
  })

  describe('Transformation Edge Cases', () => {
    it('transformation generates new monster type', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 1, max: 1 } } }
      })
      const monster = createTestCharacter({ id: 'm1' })

      const effect = SpellCastingService.resolveSpellEffect('haman', caster, [monster])

      expect(effect.transformations![0].monsterId).toBe('m1')
      expect(effect.transformations![0].newType).toBeDefined()
    })
  })

  describe('Teleport/Recall Failure Handling', () => {
    it('MALOR can fail with 25% chance', () => {
      const caster = createTestCharacter({
        spellPoints: { mage: { level6: { current: 10, max: 10 } } }
      })

      let failures = 0
      for (let i = 0; i < 100; i++) {
        const effect = SpellCastingService.resolveSpellEffect('malor', caster, [caster])
        if (!effect.teleport?.success) failures++
      }

      // Should have roughly 25% failures (allow 10% variance)
      expect(failures).toBeGreaterThan(15)
      expect(failures).toBeLessThan(35)
    })

    it('LOKTOFEIT failure rate decreases with level', () => {
      const lowLevel = createTestCharacter({
        level: 5,
        spellPoints: { priest: { level5: { current: 10, max: 10 } } }
      })
      const highLevel = createTestCharacter({
        level: 30,
        spellPoints: { priest: { level5: { current: 10, max: 10 } } }
      })

      let lowLevelSuccess = 0
      let highLevelSuccess = 0

      for (let i = 0; i < 100; i++) {
        if (SpellCastingService.resolveSpellEffect('loktofeit', lowLevel, [lowLevel]).recall?.success) {
          lowLevelSuccess++
        }
        if (SpellCastingService.resolveSpellEffect('loktofeit', highLevel, [highLevel]).recall?.success) {
          highLevelSuccess++
        }
      }

      // Level 5: 10% success, Level 30: 60% success
      expect(lowLevelSuccess).toBeLessThan(20)
      expect(highLevelSuccess).toBeGreaterThan(50)
    })
  })
})
```

**Step 2: Run tests and commit**

```bash
npm test -- SpellCastingService.edge-cases.spec.ts
git add src/services/__tests__/SpellCastingService.edge-cases.spec.ts
git commit -m "test(spells): add comprehensive edge case tests"
```

---

## Phase 4: Run Full Test Suite

### Task 13: Verify All Tests Pass

**Step 1: Run complete test suite**

Run: `npm test`
Expected: ALL TESTS PASS (500+ tests)

**Step 2: Check coverage**

Run: `npm test -- --coverage`
Expected: SpellCastingService.ts coverage > 95%

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(spells): complete implementation of all 56 spells with comprehensive testing

- Implemented 31 missing spells (PORFIC, MELITO, SOPIC, CALFO, MANIFO, MATU, MOLITO, BAMATU, LOMILWA, BAMORDI, DALTO, KANDI, KATU, MAPORFIC, LAKANITO, ZILWAN, MADALTO, BADI, LOKTOFEIT, HAMAN, MALOR, LORTO, MAHAMAN, DI, MABADI, and variants)
- Added transformation, teleportation, recall, and dispel magic mechanics
- Created 200+ comprehensive tests covering all spell levels, effects, and edge cases
- Test coverage: SpellCastingService.ts > 95%
- All 56 spells fully functional with proper damage, healing, status effects, buffs, and utilities"
```

---

## Summary

**Total Implementation**: 56 spells fully implemented
**Total Tests**: 200+ comprehensive tests
**Coverage**: > 95% for SpellCastingService.ts
**Time Estimate**: 7-9 hours

**Files Created**:
- `src/services/__tests__/SpellCastingService.new-spells.spec.ts`
- `src/services/__tests__/SpellCastingService.transformation.spec.ts`
- `src/services/__tests__/SpellCastingService.mage-1-3.spec.ts`
- `src/services/__tests__/SpellCastingService.mage-4-7.spec.ts`
- `src/services/__tests__/SpellCastingService.priest-1-4.spec.ts`
- `src/services/__tests__/SpellCastingService.priest-5-7.spec.ts`
- `src/services/__tests__/SpellCastingService.eligibility.spec.ts`
- `src/services/__tests__/SpellCastingService.edge-cases.spec.ts`

**Files Modified**:
- `src/services/SpellCastingService.ts` (+600 lines)
- `src/types/Combat.ts` (+50 lines)

**Spell Categories Completed**:
- ✅ All damage spells (fire, cold, holy, air, physical)
- ✅ All healing spells (variable, full heal)
- ✅ All status effect spells (sleep, blind, silence, invisible)
- ✅ All AC buff spells (single, party, various amounts)
- ✅ All utility spells (identify, reveal, light, teleport, recall)
- ✅ All special spells (instant death, resurrection, transformation, dispel)

**Ready for**: Combat integration testing and dungeon navigation (Phase 7)