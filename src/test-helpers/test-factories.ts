// src/test-helpers/test-factories.ts
import { Character } from '../types/Character'
import { Party, GameState } from '../types/GameState'
import { Race } from '../types/Race'
import { CharacterClass } from '../types/CharacterClass'
import { Alignment } from '../types/Alignment'
import { CharacterStatus } from '../types/CharacterStatus'
import { SceneType } from '../types/SceneType'

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
      defeatedEncounters: []
    },
    settings: {
      difficulty: 'NORMAL',
      soundEnabled: true,
      musicEnabled: true
    },
    ...overrides
  }
}
