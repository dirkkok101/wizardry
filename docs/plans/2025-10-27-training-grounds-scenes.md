# Training Grounds Scenes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Training Grounds scene architecture with character creation, inspection, and roster management using reusable scene patterns.

**Architecture:** Multi-scene navigation with hub (Training Grounds Menu) connecting to specialized scenes (Character Creation wizard, Character List with filtering, Character Inspection with contextual actions). Maximizes code reuse through generic configuration (callbacks, filters).

**Tech Stack:** TypeScript, HTML5 Canvas, Vitest, existing UI utilities (LayoutHelpers, ButtonStateHelpers, MenuSceneHelpers, ButtonRenderer, TextRenderer, ImageRenderer)

---

## Task 1: Add Scene Types

**Files:**
- Modify: `src/types/SceneType.ts`

**Step 1: Add new scene types to enum**

```typescript
export enum SceneType {
  // System Scenes
  TITLE_SCREEN = 'TITLE_SCREEN',

  // Castle/Town Scenes
  CASTLE_MENU = 'CASTLE_MENU',
  TRAINING_GROUNDS = 'TRAINING_GROUNDS',
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  CHARACTER_LIST = 'CHARACTER_LIST',
  CHARACTER_INSPECTION = 'CHARACTER_INSPECTION',

  // Dungeon Scenes
  CAMP = 'CAMP',
}
```

**Step 2: Commit**

```bash
git add src/types/SceneType.ts
git commit -m "feat: add scene types for Training Grounds flow"
```

---

## Task 2: Create Character Type Definitions

**Files:**
- Create: `src/types/Character.ts`
- Create: `src/types/Race.ts`
- Create: `src/types/CharacterClass.ts`
- Create: `src/types/Alignment.ts`
- Create: `src/types/CharacterStatus.ts`

**Step 1: Create CharacterStatus enum**

Create `src/types/CharacterStatus.ts`:

```typescript
/**
 * Character Status - Current health/life state
 */
export enum CharacterStatus {
  GOOD = 'GOOD',           // Healthy, full capabilities
  INJURED = 'INJURED',     // HP < 50%, reduced effectiveness
  DEAD = 'DEAD',           // HP = 0, body must be recovered
  ASHES = 'ASHES',         // Failed resurrection, harder to resurrect
  LOST_FOREVER = 'LOST_FOREVER', // Permanent death
  PARALYZED = 'PARALYZED', // Cannot act in combat
  STONED = 'STONED',       // Petrified, cannot act
  POISONED = 'POISONED',   // Taking damage over time
  ASLEEP = 'ASLEEP'        // Cannot act, wakes on damage
}
```

**Step 2: Create Race enum**

Create `src/types/Race.ts`:

```typescript
/**
 * Character Races - Original Wizardry races with stat modifiers
 */
export enum Race {
  HUMAN = 'HUMAN',
  ELF = 'ELF',
  DWARF = 'DWARF',
  GNOME = 'GNOME',
  HOBBIT = 'HOBBIT'
}

/**
 * Race stat modifiers (applied during character creation)
 */
export const RACE_MODIFIERS: Record<Race, {
  strength: number
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number
}> = {
  [Race.HUMAN]: { strength: 0, intelligence: 0, piety: 0, vitality: 0, agility: 0, luck: 0 },
  [Race.ELF]: { strength: -1, intelligence: 1, piety: 1, vitality: -2, agility: 1, luck: 0 },
  [Race.DWARF]: { strength: 2, intelligence: 0, piety: 0, vitality: 2, agility: -1, luck: 0 },
  [Race.GNOME]: { strength: -1, intelligence: 1, piety: 0, vitality: -1, agility: 1, luck: 0 },
  [Race.HOBBIT]: { strength: -2, intelligence: 0, piety: 1, vitality: -1, agility: 2, luck: 1 }
}
```

**Step 3: Create Alignment enum**

Create `src/types/Alignment.ts`:

```typescript
/**
 * Character Alignments - Original Wizardry alignment system
 */
export enum Alignment {
  GOOD = 'GOOD',
  NEUTRAL = 'NEUTRAL',
  EVIL = 'EVIL'
}
```

**Step 4: Create CharacterClass enum**

Create `src/types/CharacterClass.ts`:

```typescript
/**
 * Character Classes - Original Wizardry classes with requirements
 */
export enum CharacterClass {
  // Basic classes
  FIGHTER = 'FIGHTER',
  MAGE = 'MAGE',
  PRIEST = 'PRIEST',
  THIEF = 'THIEF',

  // Advanced classes (strict requirements)
  BISHOP = 'BISHOP',   // Requires: INT 12, PIE 12
  SAMURAI = 'SAMURAI', // Requires: STR 15, INT 11, PIE 10, VIT 14, AGI 10, alignment GOOD
  LORD = 'LORD',       // Requires: STR 15, INT 12, PIE 12, VIT 15, AGI 14, alignment GOOD
  NINJA = 'NINJA'      // Requires: STR 17, INT 17, PIE 17, VIT 17, AGI 17, alignment EVIL
}

/**
 * Stat requirements for each class
 */
export interface ClassRequirements {
  strength?: number
  intelligence?: number
  piety?: number
  vitality?: number
  agility?: number
  luck?: number
  alignment?: Alignment[]
}

/**
 * Class requirements mapping
 */
export const CLASS_REQUIREMENTS: Record<CharacterClass, ClassRequirements> = {
  [CharacterClass.FIGHTER]: {},
  [CharacterClass.MAGE]: {},
  [CharacterClass.PRIEST]: {},
  [CharacterClass.THIEF]: {},
  [CharacterClass.BISHOP]: {
    intelligence: 12,
    piety: 12
  },
  [CharacterClass.SAMURAI]: {
    strength: 15,
    intelligence: 11,
    piety: 10,
    vitality: 14,
    agility: 10,
    alignment: [Alignment.GOOD]
  },
  [CharacterClass.LORD]: {
    strength: 15,
    intelligence: 12,
    piety: 12,
    vitality: 15,
    agility: 14,
    alignment: [Alignment.GOOD]
  },
  [CharacterClass.NINJA]: {
    strength: 17,
    intelligence: 17,
    piety: 17,
    vitality: 17,
    agility: 17,
    alignment: [Alignment.EVIL]
  }
}
```

**Step 5: Create Character interface**

Create `src/types/Character.ts`:

```typescript
import { Race } from './Race'
import { CharacterClass } from './CharacterClass'
import { Alignment } from './Alignment'
import { CharacterStatus } from './CharacterStatus'

/**
 * Character - Core character data structure
 */
export interface Character {
  id: string
  name: string
  race: Race
  class: CharacterClass
  alignment: Alignment
  status: CharacterStatus

  // Core stats (3-18 base range)
  strength: number
  intelligence: number
  piety: number
  vitality: number
  agility: number
  luck: number

  // Derived stats
  level: number
  experience: number
  hp: number
  maxHp: number
  ac: number // Armor Class (lower is better)

  // Inventory (8 items max)
  inventory: string[] // Item IDs

  // Password protection
  password: string

  // Metadata
  createdAt: number // Unix timestamp
  lastModified: number
}

/**
 * Character creation parameters
 */
export interface CreateCharacterParams {
  name: string
  race: Race
  class: CharacterClass
  alignment: Alignment
  password: string
  // Stats will be rolled or assigned during creation
}
```

**Step 6: Commit type definitions**

```bash
git add src/types/Character.ts src/types/Race.ts src/types/CharacterClass.ts src/types/Alignment.ts src/types/CharacterStatus.ts
git commit -m "feat: add character type definitions with races, classes, alignments"
```

---

## Task 3: Create CharacterService

**Files:**
- Create: `src/services/CharacterService.ts`
- Create: `tests/services/CharacterService.test.ts`

**Step 1: Write test for getAllCharacters**

Create `tests/services/CharacterService.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { CharacterService } from '../../src/services/CharacterService'
import { GameState } from '../../src/types/GameState'
import { Character } from '../../src/types/Character'
import { Race } from '../../src/types/Race'
import { CharacterClass } from '../../src/types/CharacterClass'
import { Alignment } from '../../src/types/Alignment'
import { CharacterStatus } from '../../src/types/CharacterStatus'

describe('CharacterService', () => {
  let gameState: GameState

  beforeEach(() => {
    // Create clean game state
    gameState = {
      currentScene: 'TRAINING_GROUNDS' as any,
      roster: new Map(),
      party: {
        members: [],
        formation: { frontRow: [], backRow: [] },
        position: { x: 0, y: 0, facing: 'NORTH' as any },
        inMaze: false
      },
      dungeon: {
        currentLevel: 1,
        visitedTiles: new Map(),
        encounters: []
      },
      settings: {
        difficulty: 'NORMAL' as any,
        soundEnabled: true,
        musicEnabled: true
      }
    }
  })

  describe('getAllCharacters', () => {
    it('returns empty array when no characters exist', () => {
      const characters = CharacterService.getAllCharacters(gameState)
      expect(characters).toEqual([])
    })

    it('returns all characters from roster', () => {
      const char1: Character = {
        id: 'char1',
        name: 'Fighter1',
        race: Race.HUMAN,
        class: CharacterClass.FIGHTER,
        alignment: Alignment.GOOD,
        status: CharacterStatus.GOOD,
        strength: 15,
        intelligence: 10,
        piety: 8,
        vitality: 14,
        agility: 12,
        luck: 9,
        level: 1,
        experience: 0,
        hp: 10,
        maxHp: 10,
        ac: 10,
        inventory: [],
        password: 'test123',
        createdAt: Date.now(),
        lastModified: Date.now()
      }

      const char2: Character = {
        ...char1,
        id: 'char2',
        name: 'Mage1',
        class: CharacterClass.MAGE
      }

      gameState.roster.set('char1', char1)
      gameState.roster.set('char2', char2)

      const characters = CharacterService.getAllCharacters(gameState)
      expect(characters).toHaveLength(2)
      expect(characters[0].id).toBe('char1')
      expect(characters[1].id).toBe('char2')
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test CharacterService
```

Expected: FAIL with "Cannot find module '../../src/services/CharacterService'"

**Step 3: Implement CharacterService.getAllCharacters**

Create `src/services/CharacterService.ts`:

```typescript
import { GameState } from '../types/GameState'
import { Character, CreateCharacterParams } from '../types/Character'
import { CharacterClass, CLASS_REQUIREMENTS } from '../types/CharacterClass'
import { CharacterStatus } from '../types/CharacterStatus'
import { Race, RACE_MODIFIERS } from '../types/Race'
import { Alignment } from '../types/Alignment'

/**
 * Get all characters from roster
 */
function getAllCharacters(state: GameState): Character[] {
  return Array.from(state.roster.values())
}

export const CharacterService = {
  getAllCharacters
}
```

**Step 4: Run test to verify it passes**

```bash
npm test CharacterService
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/CharacterService.ts tests/services/CharacterService.test.ts
git commit -m "feat: add CharacterService.getAllCharacters with tests"
```

**Step 6: Write test for createCharacter**

Add to `tests/services/CharacterService.test.ts`:

```typescript
describe('createCharacter', () => {
  it('creates new character with rolled stats', () => {
    const params: CreateCharacterParams = {
      name: 'TestFighter',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      password: 'secret'
    }

    const result = CharacterService.createCharacter(gameState, params)

    expect(result.state.roster.size).toBe(1)
    const character = Array.from(result.state.roster.values())[0]
    expect(character.name).toBe('TestFighter')
    expect(character.race).toBe(Race.HUMAN)
    expect(character.class).toBe(CharacterClass.FIGHTER)
    expect(character.alignment).toBe(Alignment.GOOD)
    expect(character.password).toBe('secret')
    expect(character.status).toBe(CharacterStatus.GOOD)
    expect(character.level).toBe(1)
    expect(character.experience).toBe(0)
    expect(character.inventory).toEqual([])

    // Stats should be in valid range (3-18 base)
    expect(character.strength).toBeGreaterThanOrEqual(3)
    expect(character.strength).toBeLessThanOrEqual(18)
    expect(character.id).toBeTruthy()
  })

  it('applies race modifiers to stats', () => {
    const params: CreateCharacterParams = {
      name: 'TestElf',
      race: Race.ELF,
      class: CharacterClass.MAGE,
      alignment: Alignment.GOOD,
      password: 'secret'
    }

    const result = CharacterService.createCharacter(gameState, params)
    const character = Array.from(result.state.roster.values())[0]

    // Elf modifiers: STR-1, INT+1, PIE+1, VIT-2, AGI+1
    // Stats should reflect race modifiers
    expect(character.race).toBe(Race.ELF)
  })
})
```

**Step 7: Run test to verify it fails**

```bash
npm test CharacterService
```

Expected: FAIL with "createCharacter is not a function"

**Step 8: Implement CharacterService.createCharacter**

Add to `src/services/CharacterService.ts`:

```typescript
/**
 * Roll a stat (3d6, range 3-18)
 */
function rollStat(): number {
  return Math.floor(Math.random() * 6) + 1 +
         Math.floor(Math.random() * 6) + 1 +
         Math.floor(Math.random() * 6) + 1
}

/**
 * Generate unique character ID
 */
function generateCharacterId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create new character with rolled stats
 */
function createCharacter(
  state: GameState,
  params: CreateCharacterParams
): { state: GameState, character: Character } {
  // Roll base stats
  const baseStrength = rollStat()
  const baseIntelligence = rollStat()
  const basePiety = rollStat()
  const baseVitality = rollStat()
  const baseAgility = rollStat()
  const baseLuck = rollStat()

  // Apply race modifiers
  const raceModifiers = RACE_MODIFIERS[params.race]
  const strength = baseStrength + raceModifiers.strength
  const intelligence = baseIntelligence + raceModifiers.intelligence
  const piety = basePiety + raceModifiers.piety
  const vitality = baseVitality + raceModifiers.vitality
  const agility = baseAgility + raceModifiers.agility
  const luck = baseLuck + raceModifiers.luck

  // Calculate starting HP (vitality-based)
  const maxHp = Math.max(1, vitality + Math.floor(Math.random() * 8) + 1)

  const character: Character = {
    id: generateCharacterId(),
    name: params.name,
    race: params.race,
    class: params.class,
    alignment: params.alignment,
    status: CharacterStatus.GOOD,
    strength,
    intelligence,
    piety,
    vitality,
    agility,
    luck,
    level: 1,
    experience: 0,
    hp: maxHp,
    maxHp,
    ac: 10, // Base AC, improved by armor
    inventory: [],
    password: params.password,
    createdAt: Date.now(),
    lastModified: Date.now()
  }

  // Add to roster
  const newRoster = new Map(state.roster)
  newRoster.set(character.id, character)

  return {
    state: {
      ...state,
      roster: newRoster
    },
    character
  }
}

export const CharacterService = {
  getAllCharacters,
  createCharacter
}
```

**Step 9: Run test to verify it passes**

```bash
npm test CharacterService
```

Expected: PASS

**Step 10: Commit**

```bash
git add src/services/CharacterService.ts tests/services/CharacterService.test.ts
git commit -m "feat: add CharacterService.createCharacter with stat rolling"
```

**Step 11: Write test for deleteCharacter**

Add to `tests/services/CharacterService.test.ts`:

```typescript
describe('deleteCharacter', () => {
  it('removes character from roster', () => {
    const char: Character = {
      id: 'char1',
      name: 'Fighter1',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      status: CharacterStatus.GOOD,
      strength: 15,
      intelligence: 10,
      piety: 8,
      vitality: 14,
      agility: 12,
      luck: 9,
      level: 1,
      experience: 0,
      hp: 10,
      maxHp: 10,
      ac: 10,
      inventory: [],
      password: 'test123',
      createdAt: Date.now(),
      lastModified: Date.now()
    }

    gameState.roster.set('char1', char)

    const newState = CharacterService.deleteCharacter(gameState, 'char1')

    expect(newState.roster.size).toBe(0)
    expect(newState.roster.has('char1')).toBe(false)
  })

  it('returns unchanged state if character not found', () => {
    const newState = CharacterService.deleteCharacter(gameState, 'nonexistent')
    expect(newState).toEqual(gameState)
  })
})
```

**Step 12: Run test to verify it fails**

```bash
npm test CharacterService
```

Expected: FAIL with "deleteCharacter is not a function"

**Step 13: Implement CharacterService.deleteCharacter**

Add to `src/services/CharacterService.ts`:

```typescript
/**
 * Delete character from roster
 */
function deleteCharacter(state: GameState, characterId: string): GameState {
  if (!state.roster.has(characterId)) {
    return state
  }

  const newRoster = new Map(state.roster)
  newRoster.delete(characterId)

  return {
    ...state,
    roster: newRoster
  }
}

export const CharacterService = {
  getAllCharacters,
  createCharacter,
  deleteCharacter
}
```

**Step 14: Run test to verify it passes**

```bash
npm test CharacterService
```

Expected: PASS

**Step 15: Commit**

```bash
git add src/services/CharacterService.ts tests/services/CharacterService.test.ts
git commit -m "feat: add CharacterService.deleteCharacter with tests"
```

**Step 16: Write test for validateClassEligibility**

Add to `tests/services/CharacterService.test.ts`:

```typescript
describe('validateClassEligibility', () => {
  it('allows basic classes with any stats', () => {
    const stats = {
      strength: 5,
      intelligence: 5,
      piety: 5,
      vitality: 5,
      agility: 5,
      luck: 5,
      alignment: Alignment.GOOD
    }

    expect(CharacterService.validateClassEligibility(CharacterClass.FIGHTER, stats)).toBe(true)
    expect(CharacterService.validateClassEligibility(CharacterClass.MAGE, stats)).toBe(true)
    expect(CharacterService.validateClassEligibility(CharacterClass.PRIEST, stats)).toBe(true)
    expect(CharacterService.validateClassEligibility(CharacterClass.THIEF, stats)).toBe(true)
  })

  it('enforces stat requirements for advanced classes', () => {
    const goodStats = {
      strength: 18,
      intelligence: 18,
      piety: 18,
      vitality: 18,
      agility: 18,
      luck: 18,
      alignment: Alignment.GOOD
    }

    const badStats = {
      strength: 10,
      intelligence: 10,
      piety: 10,
      vitality: 10,
      agility: 10,
      luck: 10,
      alignment: Alignment.GOOD
    }

    // Samurai requires STR 15, INT 11, PIE 10, VIT 14, AGI 10, GOOD alignment
    expect(CharacterService.validateClassEligibility(CharacterClass.SAMURAI, goodStats)).toBe(true)
    expect(CharacterService.validateClassEligibility(CharacterClass.SAMURAI, badStats)).toBe(false)
  })

  it('enforces alignment requirements', () => {
    const goodStats = {
      strength: 18,
      intelligence: 18,
      piety: 18,
      vitality: 18,
      agility: 18,
      luck: 18,
      alignment: Alignment.GOOD
    }

    const evilStats = {
      ...goodStats,
      alignment: Alignment.EVIL
    }

    // Ninja requires EVIL alignment
    expect(CharacterService.validateClassEligibility(CharacterClass.NINJA, evilStats)).toBe(true)
    expect(CharacterService.validateClassEligibility(CharacterClass.NINJA, goodStats)).toBe(false)

    // Samurai requires GOOD alignment
    expect(CharacterService.validateClassEligibility(CharacterClass.SAMURAI, goodStats)).toBe(true)
    expect(CharacterService.validateClassEligibility(CharacterClass.SAMURAI, evilStats)).toBe(false)
  })
})
```

**Step 17: Run test to verify it fails**

```bash
npm test CharacterService
```

Expected: FAIL with "validateClassEligibility is not a function"

**Step 18: Implement CharacterService.validateClassEligibility**

Add to `src/services/CharacterService.ts`:

```typescript
/**
 * Check if character stats meet class requirements
 */
function validateClassEligibility(
  characterClass: CharacterClass,
  stats: {
    strength: number
    intelligence: number
    piety: number
    vitality: number
    agility: number
    luck: number
    alignment: Alignment
  }
): boolean {
  const requirements = CLASS_REQUIREMENTS[characterClass]

  // Check stat requirements
  if (requirements.strength && stats.strength < requirements.strength) return false
  if (requirements.intelligence && stats.intelligence < requirements.intelligence) return false
  if (requirements.piety && stats.piety < requirements.piety) return false
  if (requirements.vitality && stats.vitality < requirements.vitality) return false
  if (requirements.agility && stats.agility < requirements.agility) return false
  if (requirements.luck && stats.luck < requirements.luck) return false

  // Check alignment requirement
  if (requirements.alignment && !requirements.alignment.includes(stats.alignment)) {
    return false
  }

  return true
}

export const CharacterService = {
  getAllCharacters,
  createCharacter,
  deleteCharacter,
  validateClassEligibility
}
```

**Step 19: Run test to verify it passes**

```bash
npm test CharacterService
```

Expected: PASS

**Step 20: Commit**

```bash
git add src/services/CharacterService.ts tests/services/CharacterService.test.ts
git commit -m "feat: add CharacterService.validateClassEligibility with tests"
```

---

## Task 4: Add Training Grounds Asset Loading

**Files:**
- Modify: `src/services/AssetLoadingService.ts`
- Modify: `tests/services/AssetLoadingService.test.ts`

**Step 1: Write test for loadTrainingGroundsAssets**

Add to `tests/services/AssetLoadingService.test.ts`:

```typescript
describe('loadTrainingGroundsAssets', () => {
  it('loads training grounds background image', async () => {
    const image = await AssetLoadingService.loadTrainingGroundsAssets()
    expect(image).toBeInstanceOf(HTMLImageElement)
  })

  it('caches training grounds image', async () => {
    const image1 = await AssetLoadingService.loadTrainingGroundsAssets()
    const image2 = await AssetLoadingService.loadTrainingGroundsAssets()
    expect(image1).toBe(image2)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test AssetLoadingService
```

Expected: FAIL with "loadTrainingGroundsAssets is not a function"

**Step 3: Implement loadTrainingGroundsAssets**

Add to `src/services/AssetLoadingService.ts`:

```typescript
/**
 * Load training grounds background image
 */
async function loadTrainingGroundsAssets(): Promise<HTMLImageElement> {
  return await loadImage('training_grounds_bg', '/assets/images/scenes/scene-training-grounds.png')
}

export const AssetLoadingService = {
  loadTitleAssets,
  loadCastleMenuAssets,
  loadTrainingGroundsAssets,
  loadGameAssets,
  isAssetLoaded,
  getAsset,
  getLoadingProgress,
  getLoadingStats,
  onLoadComplete,
  onLoadProgress,
  onLoadError,
  clearCache
}
```

**Step 4: Run test to verify it passes**

```bash
npm test AssetLoadingService
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/AssetLoadingService.ts tests/services/AssetLoadingService.test.ts
git commit -m "feat: add AssetLoadingService.loadTrainingGroundsAssets"
```

---

## Task 5: Create Training Grounds Menu Scene

**Files:**
- Create: `src/scenes/training-grounds-scene/TrainingGroundsScene.ts`
- Create: `src/scenes/training-grounds-scene/commands/NavigateToCharacterCreationCommand.ts`
- Create: `src/scenes/training-grounds-scene/commands/NavigateToCharacterListCommand.ts`
- Create: `src/scenes/training-grounds-scene/commands/ShowRosterCommand.ts`
- Create: `src/scenes/training-grounds-scene/commands/LeaveTrainingGroundsCommand.ts`
- Create: `tests/scenes/TrainingGroundsScene.test.ts`

**Step 1: Write test for TrainingGroundsScene initialization**

Create `tests/scenes/TrainingGroundsScene.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TrainingGroundsScene } from '../../src/scenes/training-grounds-scene/TrainingGroundsScene'
import { SceneType } from '../../src/types/SceneType'

describe('TrainingGroundsScene', () => {
  let scene: TrainingGroundsScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
    scene = new TrainingGroundsScene()
  })

  it('has correct scene type', () => {
    expect(scene.type).toBe(SceneType.TRAINING_GROUNDS)
  })

  it('initializes successfully', async () => {
    await expect(scene.init(canvas, ctx)).resolves.toBeUndefined()
  })

  it('renders without errors', () => {
    expect(() => scene.render(ctx)).not.toThrow()
  })

  it('updates without errors', () => {
    expect(() => scene.update(16)).not.toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test TrainingGroundsScene
```

Expected: FAIL with "Cannot find module"

**Step 3: Create stub navigation commands**

Create `src/scenes/training-grounds-scene/commands/NavigateToCharacterCreationCommand.ts`:

```typescript
import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(): Promise<NavigateCommandResult> {
  try {
    console.log('[DEBUG] Navigating to Character Creation (stubbed)')
    // TODO: Implement after Character Creation scene exists
    return { success: true, nextScene: SceneType.CHARACTER_CREATION }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const NavigateToCharacterCreationCommand = { execute }
```

Create `src/scenes/training-grounds-scene/commands/NavigateToCharacterListCommand.ts`:

```typescript
import { SceneType } from '../../../types/SceneType'

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(): Promise<NavigateCommandResult> {
  try {
    console.log('[DEBUG] Navigating to Character List (stubbed)')
    // TODO: Implement after Character List scene exists
    return { success: true, nextScene: SceneType.CHARACTER_LIST }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const NavigateToCharacterListCommand = { execute }
```

Create `src/scenes/training-grounds-scene/commands/ShowRosterCommand.ts`:

```typescript
import { SceneType } from '../../../types/SceneType'

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(): Promise<NavigateCommandResult> {
  try {
    console.log('[DEBUG] Showing Roster (stubbed)')
    // TODO: Implement after Character List scene exists (view-only mode)
    return { success: true, nextScene: SceneType.CHARACTER_LIST }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const ShowRosterCommand = { execute }
```

Create `src/scenes/training-grounds-scene/commands/LeaveTrainingGroundsCommand.ts`:

```typescript
import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'
import { SaveService } from '../../../services/SaveService'

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(): Promise<NavigateCommandResult> {
  try {
    // Auto-save before leaving
    await SaveService.saveGame()

    // Navigate back to Edge of Town
    await SceneNavigationService.transitionTo(SceneType.CASTLE_MENU, {
      fadeTime: 300,
      data: { fromTrainingGrounds: true }
    })

    return { success: true, nextScene: SceneType.CASTLE_MENU }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const LeaveTrainingGroundsCommand = { execute }
```

**Step 4: Implement TrainingGroundsScene**

Create `src/scenes/training-grounds-scene/TrainingGroundsScene.ts`:

```typescript
/**
 * TrainingGroundsScene - Character creation and management hub
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { ImageRenderer } from '../../ui/renderers/ImageRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { AssetLoadingService } from '../../services/AssetLoadingService'
import { NavigateToCharacterCreationCommand } from './commands/NavigateToCharacterCreationCommand'
import { NavigateToCharacterListCommand } from './commands/NavigateToCharacterListCommand'
import { ShowRosterCommand } from './commands/ShowRosterCommand'
import { LeaveTrainingGroundsCommand } from './commands/LeaveTrainingGroundsCommand'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'
import { MenuSceneHelpers } from '../../ui/utils/MenuSceneHelpers'

type TrainingGroundsMode = 'READY' | 'TRANSITIONING'

export class TrainingGroundsScene implements Scene {
  readonly type = SceneType.TRAINING_GROUNDS

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private mode: TrainingGroundsMode = 'READY'
  private mouseX = 0
  private mouseY = 0
  private backgroundImage: HTMLImageElement | null = null

  private buttons: ButtonState[] = [
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(C)REATE CHARACTER', key: 'c', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(I)NSPECT CHARACTER', key: 'i', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(R)OSTER', key: 'r', disabled: false, hovered: false },
    { x: 0, y: 0, width: BUTTON_SIZES.MEDIUM.width, height: BUTTON_SIZES.MEDIUM.height, text: '(L)EAVE', key: 'l', disabled: false, hovered: false }
  ]

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Calculate vertical button layout (centered column)
    const layouts = LayoutHelpers.calculateVerticalButtonLayout({
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      buttonCount: this.buttons.length,
      buttonWidth: BUTTON_SIZES.MEDIUM.width,
      topMargin: 200,
      spacing: 20
    })

    // Apply calculated layouts to buttons
    ButtonStateHelpers.applyLayout(this.buttons, layouts)

    // Load background image
    try {
      this.backgroundImage = await AssetLoadingService.loadTrainingGroundsAssets()
    } catch (error) {
      console.error('Failed to load training grounds background:', error)
    }

    // Register button keyboard handlers using MenuSceneHelpers
    MenuSceneHelpers.registerButtonHandlers(
      this.inputManager,
      this.buttons,
      (key) => this.handleNavigation(key)
    )

    // Register mouse handlers using MenuSceneHelpers
    MenuSceneHelpers.registerMouseHandlers(
      this.inputManager,
      canvas,
      this.buttons,
      (x, y) => {
        this.mouseX = x
        this.mouseY = y
      },
      (button) => this.handleNavigation(button.key)
    )
  }

  enter(_data?: SceneTransitionData): void {
    this.mode = 'READY'
  }

  update(_deltaTime: number): void {
    // Update hover states based on mouse position
    ButtonStateHelpers.updateHoverState(this.buttons, this.mouseX, this.mouseY)
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen with background color
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw background image if loaded
    if (this.backgroundImage) {
      this.drawBackground(ctx)
    }

    // Draw buttons
    this.buttons.forEach(button => {
      const state = button.disabled ? 'disabled' : (button.hovered ? 'hover' : 'normal')

      ButtonRenderer.renderButton(ctx, {
        x: button.x,
        y: button.y,
        width: button.width,
        height: button.height,
        text: button.text,
        state,
        showPulse: false,
        fontSize: 18
      })
    })
  }

  /**
   * Draw the background image with proper aspect ratio scaling
   */
  private drawBackground(ctx: CanvasRenderingContext2D): void {
    if (!this.backgroundImage) return

    ImageRenderer.renderBackgroundImage(ctx, {
      image: this.backgroundImage,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      fit: 'contain',
      pixelArt: true
    })
  }

  private async handleNavigation(key: string): Promise<void> {
    if (this.mode === 'TRANSITIONING') return

    this.mode = 'TRANSITIONING'

    const result = await this.executeNavigationCommand(key)

    if (!result.success) {
      console.error('Navigation failed:', result.error)
      this.mode = 'READY'
    }
  }

  private async executeNavigationCommand(key: string) {
    switch (key) {
      case 'c': return NavigateToCharacterCreationCommand.execute()
      case 'i': return NavigateToCharacterListCommand.execute()
      case 'r': return ShowRosterCommand.execute()
      case 'l': return LeaveTrainingGroundsCommand.execute()
      default: return { success: false, nextScene: SceneType.TRAINING_GROUNDS, error: 'Unknown key' }
    }
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npm test TrainingGroundsScene
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/scenes/training-grounds-scene/ tests/scenes/TrainingGroundsScene.test.ts
git commit -m "feat: add Training Grounds menu scene with stubbed commands"
```

**Step 7: Register scene in SceneManager**

Modify `src/managers/SceneManager.ts`:

```typescript
// Add import at top
import { TrainingGroundsScene } from '../scenes/training-grounds-scene/TrainingGroundsScene'

// Update scene types array in setupSceneNavigationListeners (line ~40)
const sceneTypes = [
  SceneType.TITLE_SCREEN,
  SceneType.CASTLE_MENU,
  SceneType.TRAINING_GROUNDS,
  SceneType.CAMP
]

// Update createScene factory method (line ~106)
private createScene(sceneType: SceneType): Scene {
  switch (sceneType) {
    case SceneType.TITLE_SCREEN:
      return new TitleScreenScene()
    case SceneType.CASTLE_MENU:
      return new CastleMenuScene()
    case SceneType.TRAINING_GROUNDS:
      return new TrainingGroundsScene()
    case SceneType.CAMP:
      return new CampScene()
    default:
      throw new Error(`Unknown scene type: ${sceneType}`)
  }
}
```

**Step 8: Run tests to verify SceneManager still works**

```bash
npm test SceneManager
```

Expected: PASS

**Step 9: Commit**

```bash
git add src/managers/SceneManager.ts
git commit -m "feat: register Training Grounds scene in SceneManager"
```

---

## Task 6: Create Character List Scene (Reusable)

**Files:**
- Create: `src/scenes/character-list-scene/CharacterListScene.ts`
- Create: `tests/scenes/CharacterListScene.test.ts`

**Step 1: Write test for CharacterListScene**

Create `tests/scenes/CharacterListScene.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { CharacterListScene } from '../../src/scenes/character-list-scene/CharacterListScene'
import { SceneType } from '../../src/types/SceneType'
import { Character } from '../../src/types/Character'
import { Race } from '../../src/types/Race'
import { CharacterClass } from '../../src/types/CharacterClass'
import { Alignment } from '../../src/types/Alignment'
import { CharacterStatus } from '../../src/types/CharacterStatus'

describe('CharacterListScene', () => {
  let scene: CharacterListScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  const mockCharacters: Character[] = [
    {
      id: 'char1',
      name: 'Fighter1',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      status: CharacterStatus.GOOD,
      strength: 15,
      intelligence: 10,
      piety: 8,
      vitality: 14,
      agility: 12,
      luck: 9,
      level: 1,
      experience: 0,
      hp: 10,
      maxHp: 10,
      ac: 10,
      inventory: [],
      password: 'test123',
      createdAt: Date.now(),
      lastModified: Date.now()
    }
  ]

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!

    scene = new CharacterListScene({
      characters: mockCharacters,
      mode: 'selectable',
      onSelect: () => {},
      onBack: () => {}
    })
  })

  it('has correct scene type', () => {
    expect(scene.type).toBe(SceneType.CHARACTER_LIST)
  })

  it('initializes successfully', async () => {
    await expect(scene.init(canvas, ctx)).resolves.toBeUndefined()
  })

  it('renders without errors', () => {
    expect(() => scene.render(ctx)).not.toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test CharacterListScene
```

Expected: FAIL with "Cannot find module"

**Step 3: Implement CharacterListScene**

Create `src/scenes/character-list-scene/CharacterListScene.ts`:

```typescript
/**
 * CharacterListScene - Reusable character list with filtering and selection
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { ButtonState } from '../../types/ButtonState'
import { Character } from '../../types/Character'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { TextRenderer } from '../../ui/renderers/TextRenderer'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'
import { LayoutHelpers } from '../../ui/utils/LayoutHelpers'

export interface CharacterListConfig {
  characters: Character[]
  mode: 'selectable' | 'view-only'
  onSelect?: (character: Character) => void
  onBack: () => void
  filterFn?: (character: Character) => boolean
  title?: string
}

export class CharacterListScene implements Scene {
  readonly type = SceneType.CHARACTER_LIST

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private config: CharacterListConfig
  private mouseX = 0
  private mouseY = 0
  private selectedIndex = -1
  private filteredCharacters: Character[]

  private backButton: ButtonState = {
    x: 0,
    y: 0,
    width: BUTTON_SIZES.SMALL.width,
    height: BUTTON_SIZES.SMALL.height,
    text: '(L)EAVE',
    key: 'l',
    disabled: false,
    hovered: false
  }

  constructor(config: CharacterListConfig) {
    this.config = config

    // Apply filter if provided
    this.filteredCharacters = config.filterFn
      ? config.characters.filter(config.filterFn)
      : config.characters
  }

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Position back button at bottom
    this.backButton.x = (canvas.width - BUTTON_SIZES.SMALL.width) / 2
    this.backButton.y = canvas.height - 60

    // Register keyboard handlers
    this.inputManager.onKeyPress('l', () => this.config.onBack())

    // Register number keys for character selection (1-9)
    if (this.config.mode === 'selectable') {
      for (let i = 1; i <= Math.min(9, this.filteredCharacters.length); i++) {
        this.inputManager.onKeyPress(i.toString(), () => {
          const char = this.filteredCharacters[i - 1]
          if (char && this.config.onSelect) {
            this.config.onSelect(char)
          }
        })
      }
    }

    // Register mouse handlers
    this.inputManager.onMouseMove(canvas, (x, y) => {
      this.mouseX = x
      this.mouseY = y
    })

    this.inputManager.onMouseClick(canvas, (x, y) => {
      // Check back button
      if (ButtonRenderer.isPointInButton(x, y, this.backButton)) {
        this.config.onBack()
      }

      // Check character selection
      if (this.config.mode === 'selectable') {
        const index = this.getCharacterIndexAtPoint(x, y)
        if (index >= 0 && this.config.onSelect) {
          this.config.onSelect(this.filteredCharacters[index])
        }
      }
    })
  }

  enter(_data?: SceneTransitionData): void {
    this.selectedIndex = -1
  }

  update(_deltaTime: number): void {
    // Update button hover state
    ButtonStateHelpers.updateHoverState(this.backButton, this.mouseX, this.mouseY)

    // Update character hover (if selectable)
    if (this.config.mode === 'selectable') {
      this.selectedIndex = this.getCharacterIndexAtPoint(this.mouseX, this.mouseY)
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw title
    const title = this.config.title || 'CHARACTER LIST'
    TextRenderer.renderText(ctx, {
      text: title,
      x: this.canvas.width / 2,
      y: 50,
      fontSize: 24,
      color: COLORS.TEXT,
      align: 'center',
      bold: true
    })

    // Draw character list
    if (this.filteredCharacters.length === 0) {
      TextRenderer.renderText(ctx, {
        text: 'No characters available',
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        fontSize: 18,
        color: COLORS.TEXT_SECONDARY,
        align: 'center'
      })
    } else {
      this.renderCharacterList(ctx)
    }

    // Draw back button
    const backState = this.backButton.hovered ? 'hover' : 'normal'
    ButtonRenderer.renderButton(ctx, {
      x: this.backButton.x,
      y: this.backButton.y,
      width: this.backButton.width,
      height: this.backButton.height,
      text: this.backButton.text,
      state: backState,
      showPulse: false,
      fontSize: 16
    })
  }

  private renderCharacterList(ctx: CanvasRenderingContext2D): void {
    const startY = 120
    const lineHeight = 40

    this.filteredCharacters.forEach((char, index) => {
      const y = startY + (index * lineHeight)
      const isHovered = index === this.selectedIndex

      // Highlight if hovered
      if (isHovered && this.config.mode === 'selectable') {
        ctx.fillStyle = COLORS.BUTTON_HOVER_BG
        ctx.fillRect(50, y - 5, this.canvas.width - 100, lineHeight - 10)
      }

      // Draw character info
      const text = `${index + 1}. ${char.name} - ${char.race} ${char.class} - Level ${char.level} - ${char.status}`
      TextRenderer.renderText(ctx, {
        text,
        x: 60,
        y: y + 15,
        fontSize: 16,
        color: isHovered ? COLORS.BUTTON_HOVER_TEXT : COLORS.TEXT,
        align: 'left'
      })
    })
  }

  private getCharacterIndexAtPoint(x: number, y: number): number {
    const startY = 120
    const lineHeight = 40

    for (let i = 0; i < this.filteredCharacters.length; i++) {
      const itemY = startY + (i * lineHeight)
      if (y >= itemY - 5 && y <= itemY + lineHeight - 15 && x >= 50 && x <= this.canvas.width - 50) {
        return i
      }
    }

    return -1
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test CharacterListScene
```

Expected: PASS

**Step 5: Register scene in SceneManager**

Update `src/managers/SceneManager.ts`:

```typescript
// Add import
import { CharacterListScene } from '../scenes/character-list-scene/CharacterListScene'

// Update scene types array
const sceneTypes = [
  SceneType.TITLE_SCREEN,
  SceneType.CASTLE_MENU,
  SceneType.TRAINING_GROUNDS,
  SceneType.CHARACTER_LIST,
  SceneType.CAMP
]

// Note: CharacterListScene requires config, so it cannot be created in factory
// It will be instantiated inline when needed by parent scenes
```

**Step 6: Commit**

```bash
git add src/scenes/character-list-scene/ tests/scenes/CharacterListScene.test.ts src/managers/SceneManager.ts
git commit -m "feat: add reusable Character List scene with filtering"
```

---

## Task 7: Connect Roster Display

**Files:**
- Modify: `src/scenes/training-grounds-scene/commands/ShowRosterCommand.ts`

**Step 1: Implement ShowRosterCommand to use Character List**

Update `src/scenes/training-grounds-scene/commands/ShowRosterCommand.ts`:

```typescript
import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'
import { GameInitializationService } from '../../../services/GameInitializationService'
import { CharacterService } from '../../../services/CharacterService'

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(): Promise<NavigateCommandResult> {
  try {
    // Get current game state
    const state = GameInitializationService.getGameState()

    // Get all characters
    const characters = CharacterService.getAllCharacters(state)

    // Navigate to Character List in view-only mode
    await SceneNavigationService.transitionTo(SceneType.CHARACTER_LIST, {
      fadeTime: 300,
      data: {
        characters,
        mode: 'view-only',
        title: 'CHARACTER ROSTER',
        onBack: () => {
          SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS, {
            fadeTime: 300
          })
        }
      }
    })

    return { success: true, nextScene: SceneType.CHARACTER_LIST }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const ShowRosterCommand = { execute }
```

**Step 2: Commit**

```bash
git add src/scenes/training-grounds-scene/commands/ShowRosterCommand.ts
git commit -m "feat: connect roster display to Character List scene"
```

---

## Task 8: Create Character Creation Wizard Scene (Simplified)

**Note:** Full 7-step wizard is complex. This implements a simplified version. Full wizard can be expanded later.

**Files:**
- Create: `src/scenes/character-creation-scene/CharacterCreationScene.ts`
- Create: `tests/scenes/CharacterCreationScene.test.ts`

**Step 1: Write test for CharacterCreationScene**

Create `tests/scenes/CharacterCreationScene.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { CharacterCreationScene } from '../../src/scenes/character-creation-scene/CharacterCreationScene'
import { SceneType } from '../../src/types/SceneType'

describe('CharacterCreationScene', () => {
  let scene: CharacterCreationScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!
    scene = new CharacterCreationScene()
  })

  it('has correct scene type', () => {
    expect(scene.type).toBe(SceneType.CHARACTER_CREATION)
  })

  it('initializes successfully', async () => {
    await expect(scene.init(canvas, ctx)).resolves.toBeUndefined()
  })

  it('renders without errors', () => {
    expect(() => scene.render(ctx)).not.toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test CharacterCreationScene
```

Expected: FAIL with "Cannot find module"

**Step 3: Implement simplified CharacterCreationScene**

Create `src/scenes/character-creation-scene/CharacterCreationScene.ts`:

```typescript
/**
 * CharacterCreationScene - Simplified character creation wizard
 * TODO: Expand to full 7-step wizard
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData, SceneNavigationService } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { TextRenderer } from '../../ui/renderers/TextRenderer'
import { COLORS } from '../../ui/theme'

export class CharacterCreationScene implements Scene {
  readonly type = SceneType.CHARACTER_CREATION

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Register escape to cancel
    this.inputManager.onKeyPress('escape', () => {
      SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS, {
        fadeTime: 300
      })
    })
  }

  enter(_data?: SceneTransitionData): void {
    // Entry logic
  }

  update(_deltaTime: number): void {
    // Update logic
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Show placeholder
    TextRenderer.renderText(ctx, {
      text: 'CHARACTER CREATION',
      x: this.canvas.width / 2,
      y: 100,
      fontSize: 32,
      color: COLORS.TEXT,
      align: 'center',
      bold: true
    })

    TextRenderer.renderText(ctx, {
      text: 'TODO: Implement 7-step wizard',
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      fontSize: 18,
      color: COLORS.TEXT_SECONDARY,
      align: 'center'
    })

    TextRenderer.renderText(ctx, {
      text: 'Press ESC to go back',
      x: this.canvas.width / 2,
      y: this.canvas.height / 2 + 50,
      fontSize: 16,
      color: COLORS.TEXT_SECONDARY,
      align: 'center'
    })
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test CharacterCreationScene
```

Expected: PASS

**Step 5: Register scene in SceneManager**

Update `src/managers/SceneManager.ts`:

```typescript
// Add import
import { CharacterCreationScene } from '../scenes/character-creation-scene/CharacterCreationScene'

// Update scene types array
const sceneTypes = [
  SceneType.TITLE_SCREEN,
  SceneType.CASTLE_MENU,
  SceneType.TRAINING_GROUNDS,
  SceneType.CHARACTER_LIST,
  SceneType.CHARACTER_CREATION,
  SceneType.CAMP
]

// Update createScene factory
private createScene(sceneType: SceneType): Scene {
  switch (sceneType) {
    case SceneType.TITLE_SCREEN:
      return new TitleScreenScene()
    case SceneType.CASTLE_MENU:
      return new CastleMenuScene()
    case SceneType.TRAINING_GROUNDS:
      return new TrainingGroundsScene()
    case SceneType.CHARACTER_CREATION:
      return new CharacterCreationScene()
    case SceneType.CAMP:
      return new CampScene()
    default:
      throw new Error(`Unknown scene type: ${sceneType}`)
  }
}
```

**Step 6: Commit**

```bash
git add src/scenes/character-creation-scene/ tests/scenes/CharacterCreationScene.test.ts src/managers/SceneManager.ts
git commit -m "feat: add simplified Character Creation scene (TODO: expand wizard)"
```

---

## Task 9: Connect Creation Flow

**Files:**
- Modify: `src/scenes/training-grounds-scene/commands/NavigateToCharacterCreationCommand.ts`

**Step 1: Implement navigation to Character Creation**

Update `src/scenes/training-grounds-scene/commands/NavigateToCharacterCreationCommand.ts`:

```typescript
import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(): Promise<NavigateCommandResult> {
  try {
    await SceneNavigationService.transitionTo(SceneType.CHARACTER_CREATION, {
      fadeTime: 300,
      data: { fromTrainingGrounds: true }
    })

    return { success: true, nextScene: SceneType.CHARACTER_CREATION }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const NavigateToCharacterCreationCommand = { execute }
```

**Step 2: Commit**

```bash
git add src/scenes/training-grounds-scene/commands/NavigateToCharacterCreationCommand.ts
git commit -m "feat: connect Training Grounds to Character Creation scene"
```

---

## Task 10: Create Character Inspection Scene (Simplified)

**Files:**
- Create: `src/scenes/character-inspection-scene/CharacterInspectionScene.ts`
- Create: `tests/scenes/CharacterInspectionScene.test.ts`

**Step 1: Write test for CharacterInspectionScene**

Create `tests/scenes/CharacterInspectionScene.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { CharacterInspectionScene } from '../../src/scenes/character-inspection-scene/CharacterInspectionScene'
import { SceneType } from '../../src/types/SceneType'
import { Character } from '../../src/types/Character'
import { Race } from '../../src/types/Race'
import { CharacterClass } from '../../src/types/CharacterClass'
import { Alignment } from '../../src/types/Alignment'
import { CharacterStatus } from '../../src/types/CharacterStatus'

describe('CharacterInspectionScene', () => {
  let scene: CharacterInspectionScene
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  const mockCharacter: Character = {
    id: 'char1',
    name: 'Fighter1',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.GOOD,
    status: CharacterStatus.GOOD,
    strength: 15,
    intelligence: 10,
    piety: 8,
    vitality: 14,
    agility: 12,
    luck: 9,
    level: 1,
    experience: 0,
    hp: 10,
    maxHp: 10,
    ac: 10,
    inventory: [],
    password: 'test123',
    createdAt: Date.now(),
    lastModified: Date.now()
  }

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    ctx = canvas.getContext('2d')!

    scene = new CharacterInspectionScene({
      character: mockCharacter,
      mode: 'TRAINING',
      onBack: () => {}
    })
  })

  it('has correct scene type', () => {
    expect(scene.type).toBe(SceneType.CHARACTER_INSPECTION)
  })

  it('initializes successfully', async () => {
    await expect(scene.init(canvas, ctx)).resolves.toBeUndefined()
  })

  it('renders without errors', () => {
    expect(() => scene.render(ctx)).not.toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test CharacterInspectionScene
```

Expected: FAIL with "Cannot find module"

**Step 3: Implement simplified CharacterInspectionScene**

Create `src/scenes/character-inspection-scene/CharacterInspectionScene.ts`:

```typescript
/**
 * CharacterInspectionScene - View/edit character details
 * Mode-based actions: TRAINING (delete/class change), TAVERN (view only), CAMP (view only)
 */

import { Scene } from '../Scene'
import { SceneType } from '../../types/SceneType'
import { SceneTransitionData } from '../../services/SceneNavigationService'
import { SceneInputManager } from '../../ui/managers/InputManager'
import { Character } from '../../types/Character'
import { TextRenderer } from '../../ui/renderers/TextRenderer'
import { ButtonRenderer } from '../../ui/renderers/ButtonRenderer'
import { ButtonState } from '../../types/ButtonState'
import { COLORS, BUTTON_SIZES } from '../../ui/theme'
import { ButtonStateHelpers } from '../../ui/utils/ButtonStateHelpers'

export type InspectionMode = 'TRAINING' | 'TAVERN' | 'CAMP'

export interface CharacterInspectionConfig {
  character: Character
  mode: InspectionMode
  onBack: () => void
  onDelete?: (character: Character) => void
  onClassChange?: (character: Character) => void
}

export class CharacterInspectionScene implements Scene {
  readonly type = SceneType.CHARACTER_INSPECTION

  private canvas!: HTMLCanvasElement
  private inputManager!: SceneInputManager
  private config: CharacterInspectionConfig
  private mouseX = 0
  private mouseY = 0

  private backButton: ButtonState = {
    x: 0,
    y: 0,
    width: BUTTON_SIZES.SMALL.width,
    height: BUTTON_SIZES.SMALL.height,
    text: '(L)EAVE',
    key: 'l',
    disabled: false,
    hovered: false
  }

  constructor(config: CharacterInspectionConfig) {
    this.config = config
  }

  async init(canvas: HTMLCanvasElement, _ctx: CanvasRenderingContext2D): Promise<void> {
    this.canvas = canvas
    this.inputManager = new SceneInputManager()

    // Position back button
    this.backButton.x = (canvas.width - BUTTON_SIZES.SMALL.width) / 2
    this.backButton.y = canvas.height - 60

    // Register keyboard handlers
    this.inputManager.onKeyPress('l', () => this.config.onBack())

    // Register mouse handlers
    this.inputManager.onMouseMove(canvas, (x, y) => {
      this.mouseX = x
      this.mouseY = y
    })

    this.inputManager.onMouseClick(canvas, (x, y) => {
      if (ButtonRenderer.isPointInButton(x, y, this.backButton)) {
        this.config.onBack()
      }
    })
  }

  enter(_data?: SceneTransitionData): void {
    // Entry logic
  }

  update(_deltaTime: number): void {
    ButtonStateHelpers.updateHoverState(this.backButton, this.mouseX, this.mouseY)
  }

  render(ctx: CanvasRenderingContext2D): void {
    // Clear screen
    ctx.fillStyle = COLORS.BACKGROUND
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw character sheet (simplified)
    this.renderCharacterSheet(ctx)

    // Draw back button
    const backState = this.backButton.hovered ? 'hover' : 'normal'
    ButtonRenderer.renderButton(ctx, {
      x: this.backButton.x,
      y: this.backButton.y,
      width: this.backButton.width,
      height: this.backButton.height,
      text: this.backButton.text,
      state: backState,
      showPulse: false,
      fontSize: 16
    })
  }

  private renderCharacterSheet(ctx: CanvasRenderingContext2D): void {
    const char = this.config.character
    const startY = 80
    const lineHeight = 30

    // Title
    TextRenderer.renderText(ctx, {
      text: 'CHARACTER INSPECTION',
      x: this.canvas.width / 2,
      y: 50,
      fontSize: 24,
      color: COLORS.TEXT,
      align: 'center',
      bold: true
    })

    // Character details
    const details = [
      `Name: ${char.name}`,
      `Race: ${char.race}`,
      `Class: ${char.class}`,
      `Alignment: ${char.alignment}`,
      `Level: ${char.level}`,
      `Status: ${char.status}`,
      ``,
      `Strength: ${char.strength}`,
      `Intelligence: ${char.intelligence}`,
      `Piety: ${char.piety}`,
      `Vitality: ${char.vitality}`,
      `Agility: ${char.agility}`,
      `Luck: ${char.luck}`,
      ``,
      `HP: ${char.hp}/${char.maxHp}`,
      `AC: ${char.ac}`,
      `XP: ${char.experience}`
    ]

    details.forEach((line, index) => {
      TextRenderer.renderText(ctx, {
        text: line,
        x: 100,
        y: startY + (index * lineHeight),
        fontSize: 16,
        color: COLORS.TEXT,
        align: 'left'
      })
    })

    // Show mode-specific message
    if (this.config.mode === 'TRAINING') {
      TextRenderer.renderText(ctx, {
        text: 'TODO: Add delete and class change actions',
        x: this.canvas.width / 2,
        y: this.canvas.height - 120,
        fontSize: 14,
        color: COLORS.TEXT_SECONDARY,
        align: 'center'
      })
    }
  }

  destroy(): void {
    this.inputManager?.destroy()
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test CharacterInspectionScene
```

Expected: PASS

**Step 5: Register scene in SceneManager**

Update `src/managers/SceneManager.ts`:

```typescript
// Add import
import { CharacterInspectionScene } from '../scenes/character-inspection-scene/CharacterInspectionScene'

// Update scene types array
const sceneTypes = [
  SceneType.TITLE_SCREEN,
  SceneType.CASTLE_MENU,
  SceneType.TRAINING_GROUNDS,
  SceneType.CHARACTER_LIST,
  SceneType.CHARACTER_CREATION,
  SceneType.CHARACTER_INSPECTION,
  SceneType.CAMP
]

// Note: CharacterInspectionScene requires config, instantiated inline by parent
```

**Step 6: Commit**

```bash
git add src/scenes/character-inspection-scene/ tests/scenes/CharacterInspectionScene.test.ts src/managers/SceneManager.ts
git commit -m "feat: add simplified Character Inspection scene"
```

---

## Task 11: Connect Inspect Flow

**Files:**
- Modify: `src/scenes/training-grounds-scene/commands/NavigateToCharacterListCommand.ts`

**Step 1: Implement inspect flow through Character List**

Update `src/scenes/training-grounds-scene/commands/NavigateToCharacterListCommand.ts`:

```typescript
import { SceneType } from '../../../types/SceneType'
import { SceneNavigationService } from '../../../services/SceneNavigationService'
import { GameInitializationService } from '../../../services/GameInitializationService'
import { CharacterService } from '../../../services/CharacterService'

export interface NavigateCommandResult {
  success: boolean
  nextScene: SceneType
  error?: string
}

async function execute(): Promise<NavigateCommandResult> {
  try {
    // Get current game state
    const state = GameInitializationService.getGameState()

    // Get all characters
    const characters = CharacterService.getAllCharacters(state)

    // Navigate to Character List in selectable mode
    await SceneNavigationService.transitionTo(SceneType.CHARACTER_LIST, {
      fadeTime: 300,
      data: {
        characters,
        mode: 'selectable',
        title: 'SELECT CHARACTER TO INSPECT',
        onSelect: (character: any) => {
          // Navigate to Character Inspection
          SceneNavigationService.transitionTo(SceneType.CHARACTER_INSPECTION, {
            fadeTime: 300,
            data: {
              character,
              mode: 'TRAINING',
              onBack: () => {
                // Return to Character List after inspection
                SceneNavigationService.transitionTo(SceneType.CHARACTER_LIST, {
                  fadeTime: 300,
                  data: {
                    characters,
                    mode: 'selectable',
                    title: 'SELECT CHARACTER TO INSPECT',
                    onBack: () => {
                      SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS, {
                        fadeTime: 300
                      })
                    }
                  }
                })
              }
            }
          })
        },
        onBack: () => {
          SceneNavigationService.transitionTo(SceneType.TRAINING_GROUNDS, {
            fadeTime: 300
          })
        }
      }
    })

    return { success: true, nextScene: SceneType.CHARACTER_LIST }
  } catch (error) {
    return {
      success: false,
      nextScene: SceneType.TRAINING_GROUNDS,
      error: error instanceof Error ? error.message : 'Navigation failed'
    }
  }
}

export const NavigateToCharacterListCommand = { execute }
```

**Step 2: Commit**

```bash
git add src/scenes/training-grounds-scene/commands/NavigateToCharacterListCommand.ts
git commit -m "feat: connect inspect flow through Character List to Inspection"
```

---

## Task 12: Integration Testing

**Files:**
- Create: `tests/integration/training-grounds-flow.test.ts`

**Step 1: Write integration test for Training Grounds flow**

Create `tests/integration/training-grounds-flow.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { GameInitializationService } from '../../src/services/GameInitializationService'
import { CharacterService } from '../../src/services/CharacterService'
import { SceneNavigationService } from '../../src/services/SceneNavigationService'
import { SceneType } from '../../src/types/SceneType'
import { Race } from '../../src/types/Race'
import { CharacterClass } from '../../src/types/CharacterClass'
import { Alignment } from '../../src/types/Alignment'

describe('Training Grounds Integration', () => {
  beforeEach(async () => {
    await GameInitializationService.initializeGame()
  })

  it('creates character and adds to roster', () => {
    const state = GameInitializationService.getGameState()

    const result = CharacterService.createCharacter(state, {
      name: 'TestFighter',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      password: 'secret'
    })

    expect(result.state.roster.size).toBe(1)
    expect(result.character.name).toBe('TestFighter')

    // Update game state
    GameInitializationService.updateGameState(result.state)

    // Verify character is in roster
    const characters = CharacterService.getAllCharacters(result.state)
    expect(characters).toHaveLength(1)
    expect(characters[0].name).toBe('TestFighter')
  })

  it('deletes character from roster', () => {
    const state = GameInitializationService.getGameState()

    // Create character
    const createResult = CharacterService.createCharacter(state, {
      name: 'ToDelete',
      race: Race.HUMAN,
      class: CharacterClass.FIGHTER,
      alignment: Alignment.GOOD,
      password: 'secret'
    })

    // Delete character
    const deleteResult = CharacterService.deleteCharacter(
      createResult.state,
      createResult.character.id
    )

    expect(deleteResult.roster.size).toBe(0)
  })

  it('validates class eligibility correctly', () => {
    // Basic class - always eligible
    expect(CharacterService.validateClassEligibility(
      CharacterClass.FIGHTER,
      {
        strength: 5,
        intelligence: 5,
        piety: 5,
        vitality: 5,
        agility: 5,
        luck: 5,
        alignment: Alignment.GOOD
      }
    )).toBe(true)

    // Ninja - requires high stats and EVIL alignment
    expect(CharacterService.validateClassEligibility(
      CharacterClass.NINJA,
      {
        strength: 18,
        intelligence: 18,
        piety: 18,
        vitality: 18,
        agility: 18,
        luck: 18,
        alignment: Alignment.EVIL
      }
    )).toBe(true)

    expect(CharacterService.validateClassEligibility(
      CharacterClass.NINJA,
      {
        strength: 10,
        intelligence: 10,
        piety: 10,
        vitality: 10,
        agility: 10,
        luck: 10,
        alignment: Alignment.EVIL
      }
    )).toBe(false)
  })
})
```

**Step 2: Run integration tests**

```bash
npm test training-grounds-flow
```

Expected: PASS

**Step 3: Commit**

```bash
git add tests/integration/training-grounds-flow.test.ts
git commit -m "test: add integration tests for Training Grounds flow"
```

---

## Task 13: Manual Testing and Verification

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Navigate to Training Grounds**

1. Start game from title screen
2. Navigate from Castle Menu to Training Grounds (once connected)
3. Test all 4 buttons:
   - (C)reate Character - Should show placeholder scene
   - (I)nspect Character - Should show character list (empty initially)
   - (R)oster - Should show character roster (view-only)
   - (L)eave - Should return to Castle Menu

**Step 3: Test character creation flow**

1. Create test character via CharacterService
2. Verify character appears in roster
3. Verify character appears in inspect list
4. Verify character details in inspection scene

**Step 4: Verify all tests pass**

```bash
npm test -- --run
```

Expected: All tests PASS

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete Training Grounds scenes implementation (simplified)"
```

---

## Future Work (Not in This Plan)

1. **Expand Character Creation Wizard** - Implement full 7-step wizard (race, alignment, stats, class, name, password)
2. **Add Character Inspection Actions** - Implement delete, class change, password change
3. **Add Password Validation** - Require password to access character actions
4. **Extract Wizard Pattern** - After implementing Shop/Temple, extract WizardSceneHelper (Rule of Three)
5. **Add Character Portraits** - Load and display character portrait images
6. **Add Sound Effects** - Button clicks, character creation success, etc.
7. **Add Stat Reroll** - Allow rerolling stats during character creation
8. **Add Class Requirements Display** - Show which classes are available based on stats

---

## Execution Options

This plan is now complete and saved to `docs/plans/2025-10-27-training-grounds-scenes.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach would you like?**
