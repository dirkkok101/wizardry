// src/test-helpers/test-factories.ts
import { Character } from '../types/Character'
import { Party } from '../types/GameState'
import { Race } from '../types/Race'
import { CharacterClass } from '../types/CharacterClass'
import { Alignment } from '../types/Alignment'
import { CharacterStatus } from '../types/CharacterStatus'

/**
 * Test factory: Create a test character with default values
 * @param overrides - Partial character properties to override defaults
 */
export function createTestCharacter(overrides: Partial<Character> = {}): Character {
  const id = overrides.id || `char-${Math.random().toString(36).substr(2, 9)}`
  const timestamp = Date.now()

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
    vitality: 10,
    agility: 10,
    luck: 10,
    level: 1,
    experience: 0,
    hp: 10,
    maxHp: 10,
    ac: 10,
    inventory: [],
    password: 'test',
    createdAt: timestamp,
    lastModified: timestamp,
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
