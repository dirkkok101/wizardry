// src/test-helpers/test-factories.ts
import { Character } from '../types/Character'
import { Party, GameState } from '../types/GameState'
import { Race } from '../types/Race'
import { CharacterClass } from '../types/CharacterClass'
import { Alignment } from '../types/Alignment'
import { CharacterStatus } from '../types/CharacterStatus'
import { SceneType } from '../types/SceneType'
import { MonsterInstance, CombatState, CombatCommand, MonsterGroup } from '../types/Combat'
import { MonsterService } from '../services/MonsterService'

/**
 * Test factory: Create a test character with default values
 * @param overrides - Partial character properties to override defaults
 */
export function createTestCharacter(overrides: Partial<Character> = {}): Character {
  const id = overrides.id || `char-${Math.random().toString(36).substr(2, 9)}`
  const vitality = overrides.vitality !== undefined ? overrides.vitality : 10

  return {
    id,
    name: 'TestChar',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.NEUTRAL,
    status: CharacterStatus.OK,
    strength: 10,
    intelligence: 10,
    piety: 10,
    vitality,
    agility: 10,
    luck: 10,
    level: 1,
    experience: 0,
    age: 15,
    hp: 10,
    maxHp: 10,
    ac: 10,
    vim: {
      max: vitality,
      current: vitality
    },
    knownSpells: [],
    inventory: [],
    gold: 100, // Default starting gold (90-190 in authentic Wizardry 1)
    ...overrides
  }
}

/**
 * Test factory: Create an empty party
 */
export function createEmptyParty(): Party {
  return {
    members: [],
    formation: {
      frontRow: [],
      backRow: []
    },
    position: {
      level: 1,
      x: 0,
      y: 0,
      facing: 'NORTH'
    },
    light: false,
    gold: 0
  }
}

/**
 * Test factory: Create a party with specified members
 * @param memberIds - Array of character IDs to add to party
 */
export function createPartyWithMembers(memberIds: string[]): Party {
  return {
    members: [...memberIds],
    formation: {
      frontRow: memberIds.slice(0, 3),
      backRow: memberIds.slice(3, 6)
    },
    position: {
      level: 1,
      x: 0,
      y: 0,
      facing: 'NORTH'
    },
    light: false,
    gold: 0
  }
}

/**
 * Test factory: Create a full party (6 members)
 */
export function createFullParty(): Party {
  const memberIds = Array.from({ length: 6 }, (_, i) => `char-${i}`)
  return createPartyWithMembers(memberIds)
}

/**
 * Test factory: Create a minimal GameState for testing
 * @param overrides - Partial GameState properties to override defaults
 */
export function createTestGameState(overrides?: Partial<GameState>): GameState {
  return {
    currentScene: SceneType.CASTLE_MENU,
    roster: new Map(),
    party: createEmptyParty(),
    dungeon: {
      currentLevel: 1,
      position: { x: 0, y: 0, facing: 'NORTH' },
      lightActive: false,
      lightRadius: 0,
      teleportCount: 0,
      visitedTiles: new Set(),
      defeatedEncounters: [],
      unlockedDoors: new Set(),
      openDoors: new Set()
    },
    settings: {
      difficulty: 'NORMAL',
      soundEnabled: true,
      musicEnabled: true,
      encountersEnabled: true
    },
    ...overrides
  }
}

/**
 * Test factory: Create a test monster instance (synchronous, for simple tests)
 *
 * WARNING: This creates a hardcoded kobold monster for testing purposes only.
 * For realistic monster data from JSON, use createMonsterFromData() or MonsterService directly.
 *
 * @param overrides - Partial monster properties to override defaults
 */
export function createTestMonster(overrides: Partial<MonsterInstance> = {}): MonsterInstance {
  return {
    id: `monster-${Math.random().toString(36).substr(2, 9)}`,
    monsterId: 'kobold',
    name: 'Kobold',
    hp: 5,
    maxHp: 5,
    ac: 8,
    damage: [{ dice: '1d4', min: 1, max: 4 }],
    xp: 415,
    status: 'ALIVE',
    level: 1,
    agility: 10,
    undead: false,
    ...overrides
  }
}

/**
 * Test factory: Create monster instance from real data (synchronous)
 *
 * Uses MonsterService to create instance from loaded monster data.
 * Monsters are preloaded in setup-jest.ts via MonsterDataLoader.
 *
 * @param monsterId - Monster ID (e.g., 'kobold', 'werdna', 'greater_demon')
 * @returns MonsterInstance with validated data
 */
export function createMonsterFromData(monsterId: string): MonsterInstance {
  return MonsterService.createMonsterInstance(monsterId)
}

/**
 * Test factory: Create monster group from real data (synchronous)
 *
 * Creates a group of monsters with randomized count based on template.
 * Monsters are preloaded in setup-jest.ts via MonsterDataLoader.
 *
 * @param monsterId - Monster ID
 * @returns Array of MonsterInstances
 */
export function createMonsterGroup(monsterId: string): MonsterInstance[] {
  return MonsterService.generateMonsterGroup(monsterId)
}

/**
 * Test factory: Create a test combat state
 * @param overrides - Partial combat state properties to override defaults
 */
export function createTestCombatState(overrides: Partial<CombatState> = {}): CombatState {
  const defaultGroups: MonsterGroup[] = [
    {
      id: 'A',
      monsters: [createTestMonster()],
      formation: 'front'
    }
  ]

  return {
    monsterGroups: defaultGroups,
    commandQueue: [],
    roundNumber: 1,
    combatLog: [],
    canFlee: true,
    statusEffects: new Map(),
    acModifiers: new Map(),
    statusDurations: new Map(),
    ...overrides
  }
}

/**
 * Test factory: Create a test combat command
 * @param overrides - Partial command properties to override defaults
 */
export function createTestCombatCommand(overrides: Partial<CombatCommand> = {}): CombatCommand {
  const actor = createTestCharacter()
  return {
    id: `cmd-${Math.random().toString(36).substr(2, 9)}`,
    actor,
    type: 'ATTACK',
    initiative: 5,
    ...overrides
  }
}

/**
 * Test factory: Create a combat party with characters and roster
 */
export function createCombatParty(): { party: Character[], roster: Map<string, Character> } {
  const char1 = createTestCharacter({ id: 'char1', name: 'Fighter', hp: 15, maxHp: 15 })
  const char2 = createTestCharacter({ id: 'char2', name: 'Mage', hp: 8, maxHp: 8 })
  const party = [char1, char2]
  const roster = new Map([
    [char1.id, char1],
    [char2.id, char2]
  ])
  return { party, roster }
}

/**
 * Test factory: Create a combat state for UI testing with sensible defaults
 * @param overrides - Partial combat state properties to override defaults
 */
export function createTestCombatStateForUI(overrides?: {
  monsterGroups?: MonsterGroup[]
  roundNumber?: number
  canFlee?: boolean
  commandQueue?: CombatCommand[]
  combatLog?: string[]
}): CombatState {
  const defaultMonsters = MonsterService.generateMonsterGroup('kobold')
  const defaultGroups: MonsterGroup[] = [
    {
      id: 'A',
      monsters: defaultMonsters,
      formation: 'front'
    }
  ]

  return {
    monsterGroups: overrides?.monsterGroups || defaultGroups,
    commandQueue: overrides?.commandQueue || [],
    roundNumber: overrides?.roundNumber || 1,
    combatLog: overrides?.combatLog || ['Combat begins!'],
    canFlee: overrides?.canFlee ?? true,
    statusEffects: new Map(),
    acModifiers: new Map(),
    statusDurations: new Map()
  }
}

/**
 * Test factory: Create a GameState with combat initialized
 * @param overrides - Partial properties to override defaults
 */
export function createTestGameStateWithCombat(overrides?: {
  combat?: CombatState
  party?: Partial<Party>
  roster?: Map<string, Character>
}): GameState {
  const baseState = createTestGameState()

  return {
    ...baseState,
    combat: overrides?.combat || createTestCombatStateForUI(),
    party: { ...baseState.party, ...overrides?.party },
    roster: overrides?.roster || baseState.roster
  }
}
