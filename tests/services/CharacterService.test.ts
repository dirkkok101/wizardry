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
