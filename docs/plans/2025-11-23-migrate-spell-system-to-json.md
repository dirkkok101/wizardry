# Migrate Spell System to JSON Loading Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform spell system from hardcoded TypeScript to JSON-driven with runtime loading, establishing JSON as single source of truth.

**Architecture:** Create unified spell schema that merges JSON and TypeScript field requirements. Implement SpellDataLoader service to fetch and validate all 56 spell JSON files at game initialization. Replace hardcoded SPELL_CACHE with runtime-loaded data using Zod for type validation.

**Tech Stack:** TypeScript, Angular, Zod (runtime validation), Fetch API, JSON

**Current Problem:**
- 56 spell JSON files + 52 hardcoded spells = 100% duplication
- Schema incompatibility (JSON uses different field names than TypeScript)
- Critical bugs: TILTOWAIT level mismatch, MALIKTO behavior wrong
- No loading mechanism - JSON files unused at runtime

**Solution:** Make JSON the authoritative source, load at runtime, eliminate hardcoded data.

---

## Phase 1: Design Unified Schema

### Task 1: Create Unified Spell Schema Interface

**Files:**
- Create: `src/types/SpellDefinition.ts`
- Read: `src/services/SpellCastingService.ts` (see current SpellData interface)
- Read: `data/spells/halito.json` (example JSON structure)
- Read: `docs/data-format/spells-json.md` (JSON schema documentation)

**Step 1: Read existing schemas to understand all fields**

Read files to collect:
- TypeScript SpellData fields (src/services/SpellCastingService.ts:23-48)
- JSON schema fields (data/spells/halito.json)
- Field conflicts to resolve

**Step 2: Create SpellDefinition.ts with unified interface**

Create: `src/types/SpellDefinition.ts`

```typescript
/**
 * Unified spell definition schema
 * Combines fields from JSON files and runtime TypeScript needs
 */
export interface SpellDefinition {
  // Identity
  id: string
  name: string
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7

  // Type fields (resolves conflict between JSON and TS)
  casterType: 'mage' | 'priest'  // Was "type" in TypeScript (which class can cast)
  category: 'offensive' | 'healing' | 'utility' | 'buff' | 'debuff'  // Was "type" in JSON

  // Targeting
  target: 'single' | 'group' | 'all_enemies' | 'all_allies' | 'self' | 'dead_body' | 'ashes'

  // Context
  castableIn: Array<'combat' | 'dungeon' | 'town'>

  // Damage
  damage?: {
    dice: string  // "1d8", "3d6", etc.
    type: 'fire' | 'cold' | 'lightning' | 'holy' | 'air'
  }

  // Healing
  healing?: {
    dice?: string  // "1d8" or undefined for full heal
    type: 'normal' | 'full'  // 'full' for MALIKTO
  }

  // AC Modification (PORFIC, MATU, etc.)
  acModifier?: number  // Negative = better defense

  // Status Effects
  statusEffect?: 'ASLEEP' | 'BLIND' | 'SILENCED' | 'INVISIBLE' | 'PARALYZED' | 'POISONED'

  // Special Effects (boolean flags)
  instantDeath?: boolean  // MAKANITO, BADI, MABADI
  resurrection?: boolean  // KADORTO, DI
  resurrectionSuccessRate?: number  // 0.50 for KADORTO, 0.90 for DI
  dispelMagic?: boolean  // ZILWAN
  transformation?: boolean  // HAMAN, MAHAMAN
  undeadOnly?: boolean  // BADIOS
  ignoresAC?: boolean  // LAKANITO

  // Utility Effects
  utility?: 'reveal_stats' | 'identify_foe' | 'identify_trap' | 'extended_light' |
            'locate_person' | 'teleport' | 'recall' | 'show_coordinates'

  // Success Rates
  teleportSuccessRate?: number  // MALOR: 0.75
  recallSuccessRate?: 'level_based'  // LOKTOFEIT: level * 2%, max 95%

  // Description
  description: string

  // Failure (from JSON)
  failureResult?: string  // What happens on failure
}

/**
 * Runtime spell data after loading and validation
 * This is what SpellCastingService will use
 */
export interface LoadedSpell extends SpellDefinition {
  loaded: true  // Marker that this came from JSON
  validatedAt: number  // Timestamp
}
```

**Step 3: Commit schema definition**

```bash
git add src/types/SpellDefinition.ts
git commit -m "feat(spells): add unified spell definition schema

Merge JSON and TypeScript schemas into single interface:
- Resolves type field conflict (casterType vs category)
- Unifies target terminology
- Includes all fields from both sources
- Prepared for JSON loading"
```

---

### Task 2: Install Zod for Runtime Validation

**Files:**
- Modify: `package.json` (add zod dependency)
- Create: `src/validation/spell-schema.ts`

**Step 1: Install Zod**

Run: `npm install zod`
Expected: zod added to dependencies

**Step 2: Create Zod validation schema**

Create: `src/validation/spell-schema.ts`

```typescript
import { z } from 'zod'

/**
 * Zod schema for runtime validation of spell JSON files
 * Ensures loaded spells match TypeScript interface
 */
export const SpellDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4),
    z.literal(5), z.literal(6), z.literal(7)
  ]),
  casterType: z.enum(['mage', 'priest']),
  category: z.enum(['offensive', 'healing', 'utility', 'buff', 'debuff']),
  target: z.enum(['single', 'group', 'all_enemies', 'all_allies', 'self', 'dead_body', 'ashes']),
  castableIn: z.array(z.enum(['combat', 'dungeon', 'town'])),

  // Optional fields
  damage: z.object({
    dice: z.string(),
    type: z.enum(['fire', 'cold', 'lightning', 'holy', 'air'])
  }).optional(),

  healing: z.object({
    dice: z.string().optional(),
    type: z.enum(['normal', 'full'])
  }).optional(),

  acModifier: z.number().optional(),
  statusEffect: z.enum(['ASLEEP', 'BLIND', 'SILENCED', 'INVISIBLE', 'PARALYZED', 'POISONED']).optional(),

  instantDeath: z.boolean().optional(),
  resurrection: z.boolean().optional(),
  resurrectionSuccessRate: z.number().min(0).max(1).optional(),
  dispelMagic: z.boolean().optional(),
  transformation: z.boolean().optional(),
  undeadOnly: z.boolean().optional(),
  ignoresAC: z.boolean().optional(),

  utility: z.enum([
    'reveal_stats', 'identify_foe', 'identify_trap', 'extended_light',
    'locate_person', 'teleport', 'recall', 'show_coordinates'
  ]).optional(),

  teleportSuccessRate: z.number().min(0).max(1).optional(),
  recallSuccessRate: z.literal('level_based').optional(),

  description: z.string(),
  failureResult: z.string().optional()
})

export type ValidatedSpell = z.infer<typeof SpellDefinitionSchema>
```

**Step 3: Commit Zod schema**

```bash
git add package.json package-lock.json src/validation/spell-schema.ts
git commit -m "feat(spells): add Zod validation schema

Install zod for runtime type validation
Create validation schema matching SpellDefinition interface
Ensures JSON files conform to expected structure"
```

---

## Phase 2: Update JSON Files to Unified Schema

### Task 3: Create JSON Migration Script

**Files:**
- Create: `scripts/migrate-spell-json.ts`
- Read: `data/spells/halito.json` (example current format)

**Step 1: Create migration script**

Create: `scripts/migrate-spell-json.ts`

```typescript
import * as fs from 'fs'
import * as path from 'path'

/**
 * Migrates old spell JSON format to unified schema
 * Resolves field conflicts and fixes known bugs
 */

interface OldSpellJSON {
  id: string
  name: string
  level: number
  type: string  // OLD: "offensive", "healing", etc. (this is category)
  target: string
  damage?: string
  damageType?: string
  healing?: string
  description: string
  castableIn: string[]
  [key: string]: any
}

interface NewSpellJSON {
  id: string
  name: string
  level: number
  casterType: 'mage' | 'priest'  // NEW: determined from spell lists
  category: string  // OLD type field renamed
  target: string
  damage?: { dice: string; type: string }
  healing?: { dice?: string; type: 'normal' | 'full' }
  description: string
  castableIn: string[]
  [key: string]: any
}

// Spell lists from game data
const MAGE_SPELLS = [
  'halito', 'mogref', 'katino', 'dumapic', 'dilto', 'sopic',
  'mahalito', 'molito', 'morlis', 'dalto_mage', 'lahalito',
  'madalto', 'lakanito', 'zilwan', 'masopic', 'haman', 'malor',
  'mahaman', 'tiltowait'
]

const PRIEST_SPELLS = [
  'dios', 'badios', 'milwa', 'porfic', 'calfo', 'manifo',
  'montino', 'dial', 'latumapic', 'matu', 'bamatu', 'dialko',
  'latumofis', 'lomilwa', 'dalto_priest', 'litokan', 'kandi',
  'di', 'badi', 'lorto', 'mabadi', 'loktofeit', 'malikto',
  'kadorto', 'madi', 'mamorlis', 'bamordi', 'makanito',
  'katu', 'maporfic'
]

function migrateSpell(oldSpell: OldSpellJSON): NewSpellJSON {
  const newSpell: NewSpellJSON = {
    id: oldSpell.id,
    name: oldSpell.name,
    level: oldSpell.level,
    casterType: MAGE_SPELLS.includes(oldSpell.id) ? 'mage' : 'priest',
    category: oldSpell.type,  // Rename type → category
    target: normalizeTarget(oldSpell.target),
    description: oldSpell.description,
    castableIn: oldSpell.castableIn
  }

  // Convert damage format
  if (oldSpell.damage && oldSpell.damageType) {
    newSpell.damage = {
      dice: oldSpell.damage,
      type: oldSpell.damageType as any
    }
  }

  // Convert healing format
  if (oldSpell.healing) {
    newSpell.healing = {
      dice: oldSpell.healing === 'full' ? undefined : oldSpell.healing,
      type: oldSpell.healing === 'full' ? 'full' : 'normal'
    }
  }

  // Copy other fields
  const skipFields = ['type', 'damage', 'damageType', 'healing']
  for (const [key, value] of Object.entries(oldSpell)) {
    if (!skipFields.includes(key) && !(key in newSpell)) {
      newSpell[key] = value
    }
  }

  // Apply bug fixes
  return applyBugFixes(newSpell)
}

function normalizeTarget(target: string): string {
  const mapping: Record<string, string> = {
    'enemy_group': 'group',
    'single_ally': 'single',
    'single_enemy': 'single',
    'all_allies': 'all_allies',
    'all_enemies': 'all_enemies'
  }
  return mapping[target] || target
}

function applyBugFixes(spell: NewSpellJSON): NewSpellJSON {
  // Fix TILTOWAIT level: 6 → 7
  if (spell.id === 'tiltowait' && spell.level === 6) {
    console.log('Fixing TILTOWAIT level: 6 → 7')
    spell.level = 7
  }

  // Fix MALIKTO: offensive/petrify → healing/full_heal
  if (spell.id === 'malikto') {
    console.log('Fixing MALIKTO: changing from offensive to healing/full')
    spell.category = 'healing'
    spell.healing = { type: 'full' }
    delete (spell as any).effect
  }

  return spell
}

// Main migration
const spellsDir = path.join(__dirname, '../data/spells')
const files = fs.readdirSync(spellsDir).filter(f => f.endsWith('.json'))

console.log(`Migrating ${files.length} spell files...`)

for (const file of files) {
  const filepath = path.join(spellsDir, file)
  const oldSpell: OldSpellJSON = JSON.parse(fs.readFileSync(filepath, 'utf8'))
  const newSpell = migrateSpell(oldSpell)

  fs.writeFileSync(filepath, JSON.stringify(newSpell, null, 2) + '\n')
  console.log(`✓ ${file}`)
}

console.log('Migration complete!')
```

**Step 2: Run migration script**

Run: `npx ts-node scripts/migrate-spell-json.ts`
Expected: "Migrating 56 spell files... Migration complete!"

**Step 3: Verify migration**

Run: `git diff data/spells/tiltowait.json`
Expected: See level change 6 → 7

Run: `git diff data/spells/malikto.json`
Expected: See category change offensive → healing

**Step 4: Commit migrated JSON files**

```bash
git add data/spells/*.json scripts/migrate-spell-json.ts
git commit -m "refactor(spells): migrate all 56 JSON files to unified schema

Run migration script to update spell JSON files:
- Rename 'type' field to 'category' (offensive/healing/etc)
- Add 'casterType' field (mage/priest)
- Normalize target terminology
- Convert damage/healing to object format
- Fix TILTOWAIT level bug (6 → 7)
- Fix MALIKTO behavior (offensive → healing/full)"
```

---

## Phase 3: Implement JSON Loading

### Task 4: Create SpellDataLoader Service

**Files:**
- Create: `src/services/SpellDataLoader.ts`
- Create: `src/services/__tests__/SpellDataLoader.spec.ts`

**Step 1: Write failing test for SpellDataLoader**

Create: `src/services/__tests__/SpellDataLoader.spec.ts`

```typescript
import { SpellDataLoader } from '../SpellDataLoader'
import { SpellDefinition } from '../../types/SpellDefinition'

describe('SpellDataLoader', () => {
  describe('loadAllSpells', () => {
    it('loads and validates all spell JSON files', async () => {
      const spells = await SpellDataLoader.loadAllSpells()

      expect(spells.size).toBeGreaterThan(50)  // Should have 56 spells
      expect(spells.has('halito')).toBe(true)
      expect(spells.has('dios')).toBe(true)
    })

    it('validates spell structure with Zod', async () => {
      const spells = await SpellDataLoader.loadAllSpells()
      const halito = spells.get('halito')

      expect(halito).toBeDefined()
      expect(halito!.id).toBe('halito')
      expect(halito!.name).toBe('HALITO')
      expect(halito!.level).toBe(1)
      expect(halito!.casterType).toBe('mage')
    })

    it('caches loaded spells to avoid reloading', async () => {
      const spells1 = await SpellDataLoader.loadAllSpells()
      const spells2 = await SpellDataLoader.loadAllSpells()

      expect(spells1).toBe(spells2)  // Same object reference
    })
  })

  describe('getSpell', () => {
    it('returns spell by ID after loading', async () => {
      await SpellDataLoader.loadAllSpells()
      const halito = SpellDataLoader.getSpell('halito')

      expect(halito).toBeDefined()
      expect(halito!.name).toBe('HALITO')
    })

    it('returns undefined for unknown spell', async () => {
      await SpellDataLoader.loadAllSpells()
      const unknown = SpellDataLoader.getSpell('fakespell')

      expect(unknown).toBeUndefined()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- SpellDataLoader.spec.ts`
Expected: FAIL with "Cannot find module '../SpellDataLoader'"

**Step 3: Implement SpellDataLoader**

Create: `src/services/SpellDataLoader.ts`

```typescript
import { SpellDefinition, LoadedSpell } from '../types/SpellDefinition'
import { SpellDefinitionSchema } from '../validation/spell-schema'

/**
 * Service for loading and validating spell data from JSON files
 * Implements caching to prevent multiple loads
 */
export class SpellDataLoader {
  private static spellCache: Map<string, LoadedSpell> | null = null
  private static loadPromise: Promise<Map<string, LoadedSpell>> | null = null

  /**
   * List of all spell IDs (one JSON file per spell)
   */
  private static readonly SPELL_IDS = [
    // Mage spells
    'halito', 'mogref', 'katino', 'dumapic', 'dilto', 'sopic',
    'mahalito', 'molito', 'morlis', 'dalto_mage', 'lahalito',
    'madalto', 'lakanito', 'zilwan', 'masopic', 'haman', 'malor',
    'mahaman', 'tiltowait',
    // Priest spells
    'dios', 'badios', 'milwa', 'porfic', 'calfo', 'manifo',
    'montino', 'dial', 'latumapic', 'matu', 'bamatu', 'dialko',
    'latumofis', 'lomilwa', 'dalto_priest', 'litokan', 'kandi',
    'di', 'badi', 'lorto', 'mabadi', 'loktofeit', 'malikto',
    'kadorto', 'madi', 'mamorlis', 'bamordi', 'makanito',
    'katu', 'maporfic', 'melito', 'lamorlis'
  ]

  /**
   * Load all spell JSON files and validate them
   * Returns cached results on subsequent calls
   */
  static async loadAllSpells(): Promise<Map<string, LoadedSpell>> {
    // Return cached result if available
    if (this.spellCache) {
      return this.spellCache
    }

    // Return in-progress load if one exists
    if (this.loadPromise) {
      return this.loadPromise
    }

    // Start new load
    this.loadPromise = this.performLoad()
    this.spellCache = await this.loadPromise
    return this.spellCache
  }

  /**
   * Internal method to perform the actual loading
   */
  private static async performLoad(): Promise<Map<string, LoadedSpell>> {
    const spells = new Map<string, LoadedSpell>()
    const loadedAt = Date.now()

    // Load all spells in parallel
    const loadPromises = this.SPELL_IDS.map(async (spellId) => {
      try {
        const response = await fetch(`/assets/spells/${spellId}.json`)
        if (!response.ok) {
          throw new Error(`Failed to load ${spellId}: ${response.statusText}`)
        }

        const json = await response.json()

        // Validate with Zod
        const validated = SpellDefinitionSchema.parse(json)

        // Convert to LoadedSpell
        const loadedSpell: LoadedSpell = {
          ...validated,
          loaded: true,
          validatedAt: loadedAt
        }

        spells.set(spellId, loadedSpell)
      } catch (error) {
        console.error(`Error loading spell ${spellId}:`, error)
        throw error  // Fail fast on any error
      }
    })

    await Promise.all(loadPromises)

    console.log(`Loaded ${spells.size} spells`)
    return spells
  }

  /**
   * Get a specific spell by ID
   * Must call loadAllSpells first
   */
  static getSpell(spellId: string): LoadedSpell | undefined {
    if (!this.spellCache) {
      throw new Error('Spells not loaded. Call loadAllSpells() first.')
    }
    return this.spellCache.get(spellId)
  }

  /**
   * Get all loaded spells
   */
  static getAllSpells(): Map<string, LoadedSpell> {
    if (!this.spellCache) {
      throw new Error('Spells not loaded. Call loadAllSpells() first.')
    }
    return this.spellCache
  }

  /**
   * Clear cache (for testing)
   */
  static clearCache(): void {
    this.spellCache = null
    this.loadPromise = null
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- SpellDataLoader.spec.ts`
Expected: Tests will fail because assets not in /assets/ yet

**Step 5: Update angular.json to copy spell JSON files**

Modify: `angular.json`

Find the assets array and add:
```json
{
  "glob": "**/*.json",
  "input": "data/spells",
  "output": "/assets/spells"
}
```

**Step 6: Run tests again**

Run: `npm test -- SpellDataLoader.spec.ts`
Expected: PASS (all tests green)

**Step 7: Commit SpellDataLoader**

```bash
git add src/services/SpellDataLoader.ts src/services/__tests__/SpellDataLoader.spec.ts angular.json
git commit -m "feat(spells): implement JSON spell data loader

Create SpellDataLoader service:
- Loads all 56 spell JSON files from /assets/spells/
- Validates with Zod schema
- Implements caching to prevent duplicate loads
- Parallel loading for performance
- Add tests for loading and validation
- Configure angular.json to copy JSON files to assets"
```

---

### Task 5: Refactor SpellCastingService to Use Loaded Data

**Files:**
- Modify: `src/services/SpellCastingService.ts` (remove hardcoded spells, use loader)
- Modify: `src/services/__tests__/SpellCastingService.spec.ts`

**Step 1: Update SpellCastingService tests to preload spells**

Modify: `src/services/__tests__/SpellCastingService.spec.ts`

Add to top of file:
```typescript
import { SpellDataLoader } from '../SpellDataLoader'

// Load spells before all tests
beforeAll(async () => {
  await SpellDataLoader.loadAllSpells()
})

// Clean up after tests
afterAll(() => {
  SpellDataLoader.clearCache()
})
```

**Step 2: Run tests to verify they still fail**

Run: `npm test -- SpellCastingService.spec.ts`
Expected: Still passing (using hardcoded data)

**Step 3: Replace hardcoded SPELL_CACHE with loader**

Modify: `src/services/SpellCastingService.ts`

Remove lines 51-552 (all SPELL_CACHE.set() calls)

Replace with:
```typescript
import { SpellDataLoader } from './SpellDataLoader'
import { LoadedSpell } from '../types/SpellDefinition'

// Remove old interface
// export interface SpellData { ... }

// Use LoadedSpell from SpellDefinition
export type SpellData = LoadedSpell

export class SpellCastingService {
  /**
   * Get spell data by ID
   * Spells must be loaded first via SpellDataLoader
   */
  static getSpell(spellId: string): SpellData | undefined {
    return SpellDataLoader.getSpell(spellId)
  }

  /**
   * Get all available spells for a character
   */
  static getAvailableSpells(character: Character): SpellData[] {
    const allSpells = SpellDataLoader.getAllSpells()
    const available: SpellData[] = []

    if (!character.spellPoints) {
      return []
    }

    // Filter by caster type and available spell points
    for (const spell of allSpells.values()) {
      const spellType = spell.casterType
      const pool = spellType === 'mage'
        ? character.spellPoints.mage
        : character.spellPoints.priest

      if (!pool) continue

      const levelKey = `level${spell.level}` as keyof typeof pool
      const levelPool = pool[levelKey]

      if (levelPool && levelPool.current > 0) {
        if (character.knownSpells?.includes(spell.id)) {
          available.push(spell)
        }
      }
    }

    return available
  }

  // Rest of methods unchanged...
  static canCastSpell(caster: Character, spellId: string): {
    canCast: boolean
    reason?: string
  } {
    const spell = this.getSpell(spellId)
    // ... rest of implementation unchanged
  }
}
```

**Step 4: Update resolveSpellEffect to use new schema fields**

Modify: `src/services/SpellCastingService.ts`

Update damage handling:
```typescript
// OLD:
if (spell.damageType && spell.damageDice) {
  const damage = validTargets.map(() => this.rollDice(spell.damageDice!))
  // ...
}

// NEW:
if (spell.damage) {
  const damage = validTargets.map(() => this.rollDice(spell.damage!.dice))
  return {
    damage,
    message: `${spell.name} deals ${damage.join(', ')} ${spell.damage.type} damage!`
  }
}
```

Update healing handling:
```typescript
// OLD:
if (spell.healingDice) {
  const healing = targets.map(() => this.rollDice(spell.healingDice!))
  // ...
}

// NEW:
if (spell.healing) {
  if (spell.healing.type === 'full') {
    // Full heal (MALIKTO)
    return {
      fullHeal: targets.map(t => t.id),
      message: `${spell.name} fully heals the party!`
    }
  } else if (spell.healing.dice) {
    const healing = targets.map(() => this.rollDice(spell.healing!.dice!))
    return {
      healing,
      message: `${spell.name} heals ${healing.join(', ')} HP!`
    }
  }
}
```

**Step 5: Run all spell tests**

Run: `npm test -- SpellCastingService`
Expected: All tests pass (should work with loaded data)

**Step 6: Commit refactored service**

```bash
git add src/services/SpellCastingService.ts src/services/__tests__/SpellCastingService.spec.ts
git commit -m "refactor(spells): migrate SpellCastingService to use loaded JSON data

Remove all hardcoded spell definitions (500+ lines deleted)
Use SpellDataLoader instead of SPELL_CACHE
Update field access to match unified schema:
- spell.damage.dice instead of spell.damageDice
- spell.damage.type instead of spell.damageType
- spell.healing.type for full heal detection
- spell.casterType instead of spell.type
Add spell preloading to test setup
All existing tests pass with JSON-loaded data"
```

---

## Phase 4: Integration & Testing

### Task 6: Integrate Spell Loading into Game Initialization

**Files:**
- Modify: `src/services/GameInitializationService.ts`
- Read: `src/services/AssetLoadingService.ts`

**Step 1: Add spell loading to game initialization**

Modify: `src/services/GameInitializationService.ts`

```typescript
import { SpellDataLoader } from './SpellDataLoader'

export class GameInitializationService {
  static async initializeGame(): Promise<GameState> {
    // Load spells first (required for character creation, combat, etc.)
    console.log('Loading spells...')
    await SpellDataLoader.loadAllSpells()
    console.log('Spells loaded successfully')

    // ... rest of initialization
  }
}
```

**Step 2: Test in development**

Run: `npm start`
Check browser console for: "Loading spells..." and "Spells loaded successfully"

**Step 3: Commit integration**

```bash
git add src/services/GameInitializationService.ts
git commit -m "feat(spells): integrate JSON loading into game initialization

Add spell loading to GameInitializationService
Spells load before game state initialization
Console logging for debugging"
```

---

### Task 7: Update All Test Files

**Files:**
- Modify: `src/services/__tests__/SpellCastingService.new-spells.spec.ts`
- Modify: `src/services/__tests__/SpellCastingService.edge-cases.spec.ts`
- Modify: `src/services/__tests__/SpellCastingService.eligibility.spec.ts`
- Modify: `src/services/__tests__/SpellLearningService.spec.ts`

**Step 1: Add spell preloading to all spell test files**

For each test file, add:
```typescript
import { SpellDataLoader } from '../SpellDataLoader'

beforeAll(async () => {
  await SpellDataLoader.loadAllSpells()
})

afterAll(() => {
  SpellDataLoader.clearCache()
})
```

**Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Commit test updates**

```bash
git add src/services/__tests__/*.spec.ts
git commit -m "test(spells): update all tests to preload JSON spell data

Add beforeAll hooks to load spells
Add afterAll hooks to clear cache
All 63+ spell tests passing with JSON data"
```

---

### Task 8: Remove SpellLearningService Hardcoded Lists

**Files:**
- Modify: `src/services/SpellLearningService.ts`

**Step 1: Replace hardcoded spell lists with loader queries**

Modify: `src/services/SpellLearningService.ts`

```typescript
import { SpellDataLoader } from './SpellDataLoader'

// Remove hardcoded MAGE_SPELLS and PRIEST_SPELLS arrays

export class SpellLearningService {
  static getSpellsForLevel(
    characterClass: CharacterClass,
    level: number
  ): string[] {
    const allSpells = SpellDataLoader.getAllSpells()
    const casterType = this.getCasterType(characterClass)

    if (!casterType) {
      return []
    }

    // Filter spells by caster type and level
    const spells: string[] = []
    for (const spell of allSpells.values()) {
      if (spell.casterType === casterType && spell.level === level) {
        spells.push(spell.id)
      }
    }

    return spells.sort()
  }

  private static getCasterType(
    characterClass: CharacterClass
  ): 'mage' | 'priest' | null {
    switch (characterClass) {
      case CharacterClass.MAGE:
      case CharacterClass.BISHOP:
      case CharacterClass.SAMURAI:
        return 'mage'
      case CharacterClass.PRIEST:
      case CharacterClass.LORD:
        return 'priest'
      default:
        return null
    }
  }
}
```

**Step 2: Run SpellLearningService tests**

Run: `npm test -- SpellLearningService`
Expected: All tests pass

**Step 3: Commit refactored service**

```bash
git add src/services/SpellLearningService.ts
git commit -m "refactor(spells): use loaded data in SpellLearningService

Remove hardcoded MAGE_SPELLS and PRIEST_SPELLS arrays
Query SpellDataLoader by casterType and level
Dynamic spell discovery from JSON files"
```

---

## Phase 5: Verification & Documentation

### Task 9: Performance Testing

**Files:**
- Create: `src/services/__tests__/SpellDataLoader.performance.spec.ts`

**Step 1: Write performance test**

Create: `src/services/__tests__/SpellDataLoader.performance.spec.ts`

```typescript
import { SpellDataLoader } from '../SpellDataLoader'

describe('SpellDataLoader - Performance', () => {
  beforeEach(() => {
    SpellDataLoader.clearCache()
  })

  it('loads all spells in less than 500ms', async () => {
    const start = performance.now()
    await SpellDataLoader.loadAllSpells()
    const duration = performance.now() - start

    console.log(`Loaded spells in ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(500)
  })

  it('cache access is instant', async () => {
    await SpellDataLoader.loadAllSpells()

    const start = performance.now()
    const spells = await SpellDataLoader.loadAllSpells()
    const duration = performance.now() - start

    console.log(`Cache access in ${duration.toFixed(2)}ms`)
    expect(duration).toBeLessThan(1)  // Should be instant
    expect(spells.size).toBeGreaterThan(50)
  })
})
```

**Step 2: Run performance test**

Run: `npm test -- SpellDataLoader.performance`
Expected: PASS with console showing load time < 500ms

**Step 3: Commit performance test**

```bash
git add src/services/__tests__/SpellDataLoader.performance.spec.ts
git commit -m "test(spells): add performance tests for spell loading

Verify all 56 spells load in < 500ms
Verify cache access is instant
Log actual timing for monitoring"
```

---

### Task 10: Update Documentation

**Files:**
- Modify: `docs/systems/spell-system.md`
- Modify: `docs/data-format/spells-json.md`
- Modify: `docs/architecture.md`
- Create: `docs/guides/adding-new-spell.md`

**Step 1: Update spell system documentation**

Modify: `docs/systems/spell-system.md`

Add section:
```markdown
## Spell Data Loading

Spells are loaded from JSON files at game initialization:

1. **Source**: `data/spells/*.json` (56 individual files)
2. **Loading**: `SpellDataLoader.loadAllSpells()` called during game init
3. **Validation**: Zod schema validates each spell at load time
4. **Caching**: Loaded spells cached in memory for instant access
5. **Performance**: All spells load in ~300ms with parallel fetching

### JSON Schema

Each spell JSON file follows this structure:

```json
{
  "id": "halito",
  "name": "HALITO",
  "level": 1,
  "casterType": "mage",
  "category": "offensive",
  "target": "group",
  "damage": {
    "dice": "1d8",
    "type": "fire"
  },
  "description": "1d8 fire damage to enemy group",
  "castableIn": ["combat"]
}
```

See `docs/data-format/spells-json.md` for complete schema reference.
```

**Step 2: Create "Adding a New Spell" guide**

Create: `docs/guides/adding-new-spell.md`

```markdown
# How to Add a New Spell

This guide shows how to add a new spell to the game. No code changes required!

## Steps

### 1. Create JSON File

Create `data/spells/yourspell.json`:

```json
{
  "id": "yourspell",
  "name": "YOURSPELL",
  "level": 3,
  "casterType": "mage",
  "category": "offensive",
  "target": "single",
  "damage": {
    "dice": "4d6",
    "type": "lightning"
  },
  "description": "Powerful lightning bolt",
  "castableIn": ["combat"]
}
```

### 2. Add Spell ID to Loader

Edit `src/services/SpellDataLoader.ts`:

Add your spell ID to `SPELL_IDS` array:
```typescript
private static readonly SPELL_IDS = [
  // ... existing spells ...
  'yourspell'  // Add here
]
```

### 3. Build & Test

```bash
npm start
# Spell automatically loads at game start
```

### 4. Verify in Game

- Create a level 3+ mage
- Check spell learning at inn
- Your spell should appear in available spells

## Schema Reference

See `docs/data-format/spells-json.md` for all available fields.

## Examples

- **Damage spell**: See `data/spells/halito.json`
- **Healing spell**: See `data/spells/dios.json`
- **Utility spell**: See `data/spells/dumapic.json`
- **Buff spell**: See `data/spells/porfic.json`
```

**Step 3: Commit documentation**

```bash
git add docs/systems/spell-system.md docs/guides/adding-new-spell.md docs/data-format/spells-json.md docs/architecture.md
git commit -m "docs(spells): update documentation for JSON-driven spell system

Update spell-system.md with loading architecture
Create adding-new-spell.md guide
Update schema documentation
Reflect JSON as single source of truth"
```

---

### Task 11: Final Verification

**Step 1: Run complete test suite**

Run: `npm test`
Expected: All tests pass (1600+ tests)

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Manual testing in browser**

Run: `npm start`

Test:
1. Game loads without errors
2. Console shows "Loading spells..." → "Spells loaded successfully"
3. Create character → spell learning works
4. Start combat → spell casting works
5. Check Network tab: See 56 spell JSON requests

**Step 4: Create final summary commit**

```bash
git add -A
git commit -m "feat(spells): complete migration to JSON-driven spell system

BREAKING CHANGE: Spells now loaded from JSON files instead of hardcoded

Summary of changes:
- Created unified spell schema (SpellDefinition)
- Added Zod validation for runtime type safety
- Migrated all 56 spell JSON files to new schema
- Implemented SpellDataLoader service
- Refactored SpellCastingService to use loaded data
- Removed 500+ lines of hardcoded spell definitions
- Updated SpellLearningService for dynamic spell discovery
- Fixed TILTOWAIT level bug (6 → 7)
- Fixed MALIKTO behavior (offensive → full heal)
- Added performance tests (load time < 500ms)
- Updated all documentation

Benefits:
- Single source of truth (JSON files)
- Designer-friendly (edit JSON, no code changes)
- Eliminates duplication
- Bug fixes applied consistently
- Easier to add new spells

All 1600+ tests passing
Production build succeeds"
```

---

## Success Criteria

- ✅ Zero hardcoded spells in TypeScript (500+ lines removed)
- ✅ All 56 spells loaded from JSON files at runtime
- ✅ Unified schema resolves field conflicts
- ✅ Zod validation ensures type safety
- ✅ All existing tests pass (1600+ tests)
- ✅ Production build succeeds
- ✅ TILTOWAIT level bug fixed (6 → 7)
- ✅ MALIKTO behavior bug fixed (offensive → full heal)
- ✅ Loading time < 500ms (performance target met)
- ✅ Designer can add spell by editing JSON only (no code changes)
- ✅ Complete documentation updated

## Risks & Mitigations

**Risk: Runtime loading errors crash game**
- Mitigation: Comprehensive error handling in SpellDataLoader
- Mitigation: Fail fast on any validation error (better than silent corruption)
- Mitigation: Console logging for debugging

**Risk: Performance regression**
- Mitigation: Parallel loading (Promise.all)
- Mitigation: In-memory caching
- Mitigation: Performance tests verify < 500ms target

**Risk: Type safety loss**
- Mitigation: Zod validation at load time catches schema violations
- Mitigation: TypeScript interfaces still provide compile-time types
- Mitigation: LoadedSpell type ensures validated data

**Risk: Breaking existing tests**
- Mitigation: Add beforeAll hooks to preload spells
- Mitigation: Gradual migration (test each service separately)
- Mitigation: Keep test helper functions working

## Notes

- Execute in main branch or feature branch based on risk tolerance
- High complexity - touches multiple core systems
- Breaking change - requires spell data to load before game can start
- Consider adding loading spinner UI in future
- Future optimization: Could add localStorage cache for instant repeat loads
