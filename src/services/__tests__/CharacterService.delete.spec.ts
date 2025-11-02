import { CharacterService } from '../CharacterService';
import { GameState } from '../../types/GameState';
import { createTestCharacter, createEmptyParty } from '../../test-helpers/test-factories';
import { SceneType } from '../../types/SceneType';

describe('CharacterService', () => {
  describe('deleteCharacter', () => {
    it('removes character from roster', () => {
      const char1 = createTestCharacter({ id: 'char-1', name: 'Gandalf' });
      const char2 = createTestCharacter({ id: 'char-2', name: 'Frodo' });

      const initialState: GameState = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([
          [char1.id, char1],
          [char2.id, char2]
        ]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL',
          soundEnabled: true,
          musicEnabled: true
        }
      };

      const newState = CharacterService.deleteCharacter(initialState, 'char-1');

      expect(newState.roster.has('char-1')).toBe(false);
      expect(newState.roster.has('char-2')).toBe(true);
      expect(newState.roster.size).toBe(1);
    });

    it('returns same state if character does not exist', () => {
      const initialState: GameState = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map(),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL',
          soundEnabled: true,
          musicEnabled: true
        }
      };

      const newState = CharacterService.deleteCharacter(initialState, 'nonexistent');

      expect(newState).toEqual(initialState);
    });

    it('throws error if character is in party', () => {
      const char = createTestCharacter({ id: 'char-1', name: 'Gandalf' });

      const initialState: GameState = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: {
          members: [char.id],
          formation: { frontRow: [char.id], backRow: [] },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0
        },
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL',
          soundEnabled: true,
          musicEnabled: true
        }
      };

      expect(() => {
        CharacterService.deleteCharacter(initialState, 'char-1');
      }).toThrow('Cannot delete character: character is in party');
    });

    it('creates immutable update (does not mutate original)', () => {
      const char = createTestCharacter({ id: 'char-1' });
      const initialState: GameState = {
        currentScene: SceneType.TRAINING_GROUNDS,
        roster: new Map([[char.id, char]]),
        party: createEmptyParty(),
        dungeon: {
          currentLevel: 1,
          visitedTiles: new Map(),
          encounters: []
        },
        settings: {
          difficulty: 'NORMAL',
          soundEnabled: true,
          musicEnabled: true
        }
      };
      const originalSize = initialState.roster.size;

      const newState = CharacterService.deleteCharacter(initialState, 'char-1');

      expect(initialState.roster.size).toBe(originalSize);
      expect(newState.roster).not.toBe(initialState.roster);
    });
  });
});
