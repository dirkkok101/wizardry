/**
 * SaveMigration - Schema migration system for save data
 *
 * Provides a versioned migration pipeline to upgrade old save formats
 * to the current schema version without data loss.
 */

import { SaveVersionError } from './SaveErrors'

/**
 * Interface for a single schema migration
 */
export interface SchemaMigration {
  fromVersion: number
  toVersion: number
  description: string
  migrate: (data: any) => any
}

/**
 * Registry of all migrations between schema versions
 *
 * Each migration transforms save data from one version to the next.
 * Migrations should be additive and preserve existing valid data.
 */
const MIGRATIONS: SchemaMigration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    description: 'Character refactor - remove password/gold/timestamps, add age/vim/spellPoints/knownSpells',
    migrate: migrateV1ToV2
  }
]

/**
 * Migrate save data from v1 to v2
 *
 * v1 Character had: password, gold, createdAt, lastModified
 * v2 Character has: age, vim, spellPoints (serialized Map), knownSpells (serialized Set)
 */
function migrateV1ToV2(data: any): any {
  const migratedRoster = data.state.roster.map(([id, character]: [string, any]) => {
    // Remove deprecated v1 fields
    const { password, gold, createdAt, lastModified, ...rest } = character

    // Add v2 fields with sensible defaults
    return [id, {
      ...rest,
      age: character.age ?? 18,
      vim: character.vim ?? character.maxHp ?? 10,
      // spellPoints: serialized as array of [level, points] entries
      spellPoints: character.spellPoints ?? [],
      // knownSpells: serialized as array of spell IDs
      knownSpells: character.knownSpells ?? []
    }]
  })

  return {
    ...data,
    schemaVersion: 2,
    state: {
      ...data.state,
      roster: migratedRoster
    }
  }
}

/**
 * Get the migration path from one version to another
 *
 * @param fromVersion - Current schema version of save data
 * @param toVersion - Target schema version
 * @returns Array of migrations to apply in order
 * @throws SaveVersionError if no valid migration path exists
 */
export function getMigrationPath(fromVersion: number, toVersion: number): SchemaMigration[] {
  // Already at target version
  if (fromVersion === toVersion) {
    return []
  }

  // Cannot downgrade
  if (fromVersion > toVersion) {
    throw new SaveVersionError(
      `Save is from a newer version (v${fromVersion}), cannot downgrade to v${toVersion}`
    )
  }

  // Build migration path
  const path: SchemaMigration[] = []
  let currentVersion = fromVersion

  while (currentVersion < toVersion) {
    const migration = MIGRATIONS.find(m => m.fromVersion === currentVersion)

    if (!migration) {
      throw new SaveVersionError(
        `No migration path from v${currentVersion} to v${toVersion}`
      )
    }

    path.push(migration)
    currentVersion = migration.toVersion
  }

  return path
}

/**
 * Run all necessary migrations on save data
 *
 * @param saveData - The save data object with schemaVersion and state
 * @param targetVersion - Target schema version (usually current SAVE_SCHEMA_VERSION)
 * @returns Migrated save data at target version
 * @throws SaveVersionError if migration is not possible
 */
export function runMigrations(saveData: any, targetVersion: number): any {
  // Handle missing schemaVersion as v1 (oldest format)
  const currentVersion = saveData.schemaVersion ?? 1

  // Get migration path
  const migrations = getMigrationPath(currentVersion, targetVersion)

  // No migrations needed
  if (migrations.length === 0) {
    return saveData
  }

  // Apply migrations sequentially
  let result = saveData

  for (const migration of migrations) {
    console.log(`Migrating save from v${migration.fromVersion} to v${migration.toVersion}: ${migration.description}`)
    result = migration.migrate(result)
  }

  return result
}

// Re-export SaveVersionError for convenience
export { SaveVersionError } from './SaveErrors'
