/**
 * Tests for SaveMigration - schema migration system for save data
 */
import { runMigrations, getMigrationPath, SaveVersionError } from '../SaveMigration'

describe('SaveMigration', () => {
  describe('getMigrationPath', () => {
    it('returns empty array when already at target version', () => {
      const path = getMigrationPath(2, 2)
      expect(path).toEqual([])
    })

    it('returns migration path from v1 to v2', () => {
      const path = getMigrationPath(1, 2)
      expect(path).toHaveLength(1)
      expect(path[0].fromVersion).toBe(1)
      expect(path[0].toVersion).toBe(2)
    })

    it('throws SaveVersionError for future version (cannot downgrade)', () => {
      expect(() => getMigrationPath(3, 2)).toThrow(SaveVersionError)
      expect(() => getMigrationPath(3, 2)).toThrow('cannot downgrade')
    })

    it('throws SaveVersionError when no migration path exists', () => {
      // If we're at version 0 and there's no migration from 0 to anything
      expect(() => getMigrationPath(0, 2)).toThrow(SaveVersionError)
    })
  })

  describe('runMigrations', () => {
    it('returns unchanged data when already at target version', () => {
      const saveData = {
        schemaVersion: 2,
        state: { foo: 'bar' }
      }

      const result = runMigrations(saveData, 2)

      expect(result).toEqual(saveData)
      expect(result.schemaVersion).toBe(2)
    })

    it('migrates v1 save data to v2', () => {
      // v1 Character had: password, gold, createdAt, lastModified
      // v2 Character has: age, vim, spellPoints (Map->Array), knownSpells (Set->Array)
      const v1SaveData = {
        schemaVersion: 1,
        state: {
          roster: [
            ['char-1', {
              id: 'char-1',
              name: 'TestChar',
              password: 'secret123',
              gold: 500,
              createdAt: '2024-01-01',
              lastModified: '2024-01-02',
              level: 5,
              hp: 30,
              maxHp: 30,
              status: 'OK'
            }]
          ],
          party: { gold: 1000 }
        }
      }

      const result = runMigrations(v1SaveData, 2)

      expect(result.schemaVersion).toBe(2)

      // Character should have v1 fields removed
      const [, character] = result.state.roster[0]
      expect(character.password).toBeUndefined()
      expect(character.gold).toBeUndefined()
      expect(character.createdAt).toBeUndefined()
      expect(character.lastModified).toBeUndefined()

      // Character should have v2 fields with defaults
      expect(character.age).toBeDefined()
      expect(character.vim).toBeDefined()
      expect(character.spellPoints).toBeDefined()
      expect(character.knownSpells).toBeDefined()
    })

    it('preserves existing v2 fields during migration', () => {
      const v1SaveData = {
        schemaVersion: 1,
        state: {
          roster: [
            ['char-1', {
              id: 'char-1',
              name: 'ExistingChar',
              password: 'old',
              gold: 100,
              level: 10,
              hp: 50,
              maxHp: 50
            }]
          ],
          party: { gold: 2000, members: ['char-1'] },
          currentScene: 'CASTLE_MENU'
        }
      }

      const result = runMigrations(v1SaveData, 2)

      // Preserved fields
      const [, character] = result.state.roster[0]
      expect(character.id).toBe('char-1')
      expect(character.name).toBe('ExistingChar')
      expect(character.level).toBe(10)
      expect(character.hp).toBe(50)
      expect(character.maxHp).toBe(50)

      // Party data preserved
      expect(result.state.party.gold).toBe(2000)
      expect(result.state.party.members).toEqual(['char-1'])
    })

    it('throws SaveVersionError for future versions', () => {
      const futureData = {
        schemaVersion: 99,
        state: {}
      }

      expect(() => runMigrations(futureData, 2)).toThrow(SaveVersionError)
      expect(() => runMigrations(futureData, 2)).toThrow('cannot downgrade')
    })

    it('handles missing schemaVersion as v1', () => {
      const oldSaveData = {
        // No schemaVersion field - very old save
        state: {
          roster: [['char-1', { id: 'char-1', name: 'OldChar' }]],
          party: { gold: 100 }
        }
      }

      const result = runMigrations(oldSaveData, 2)

      expect(result.schemaVersion).toBe(2)
    })

    it('logs migration progress', () => {
      const consoleSpy = jest.spyOn(console, 'log')

      const v1SaveData = {
        schemaVersion: 1,
        state: {
          roster: [],
          party: { gold: 0 }
        }
      }

      runMigrations(v1SaveData, 2)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Migrating save from v1 to v2')
      )

      consoleSpy.mockRestore()
    })
  })
})
