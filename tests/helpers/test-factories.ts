/**
 * Test factory functions for creating test data
 */

import { Character } from '../../src/types/Character'
import { GameState } from '../../src/types/GameState'
import { CharacterClass } from '../../src/types/CharacterClass'
import { Race } from '../../src/types/Race'
import { Alignment } from '../../src/types/Alignment'
import { CharacterStatus } from '../../src/types/CharacterStatus'
import { SceneType } from '../../src/types/SceneType'

/**
 * Create a test character with default or override values
 */
export function createTestCharacter(overrides?: Partial<Character>): Character {
  const defaults: Character = {
    id: `char_${Math.random().toString(36).substr(2, 9)}`,
    name: 'TestCharacter',
    race: Race.HUMAN,
    class: CharacterClass.FIGHTER,
    alignment: Alignment.GOOD,
    status: CharacterStatus.GOOD,
    strength: 15,
    intelligence: 10,
    piety: 10,
    vitality: 14,
    agility: 12,
    luck: 10,
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

  return {
    ...defaults,
    ...overrides
  }
}

/**
 * Create an empty party (no members)
 */
export function createEmptyParty() {
  return {
    members: [],
    formation: {
      frontRow: [],
      backRow: []
    },
    position: {
      x: 0,
      y: 0,
      facing: 'NORTH' as const
    },
    inMaze: false
  }
}

/**
 * Create a full party (6 members)
 */
export function createFullParty(characters: Character[]) {
  if (characters.length !== 6) {
    throw new Error('createFullParty requires exactly 6 characters')
  }

  return {
    members: characters.map(c => c.id),
    formation: {
      frontRow: characters.slice(0, 3).map(c => c.id),
      backRow: characters.slice(3, 6).map(c => c.id)
    },
    position: {
      x: 0,
      y: 0,
      facing: 'NORTH' as const
    },
    inMaze: false
  }
}

/**
 * Create initial game state
 */
export function createGameState(overrides?: Partial<GameState>): GameState {
  const defaults: GameState = {
    currentScene: SceneType.TITLE_SCREEN,
    roster: new Map(),
    party: createEmptyParty(),
    dungeon: {
      currentLevel: 1,
      visitedTiles: new Map(),
      encounters: []
    },
    settings: {
      difficulty: 'NORMAL' as const,
      soundEnabled: true,
      musicEnabled: true
    }
  }

  return {
    ...defaults,
    ...overrides
  }
}

/**
 * Create combat state (to be expanded later)
 */
export function createCombatState() {
  // Stub for future use
  return {}
}
