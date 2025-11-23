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
   * Complete list of 56 spells including level variants
   */
  private static readonly SPELL_IDS = [
    // Mage spells
    'halito', 'mogref', 'katino', 'dumapic', 'dilto', 'sopic',
    'mahalito', 'molito', 'morlis', 'dalto', 'lahalito',
    'madalto', 'lakanito', 'zilwan', 'masopic', 'haman', 'malor',
    'mahaman', 'tiltowait', 'melito', 'lomilwa_mage',
    'haman_7', 'mahaman_7', 'tiltowait_7',
    // Priest spells
    'dios', 'badios', 'milwa', 'porfic', 'calfo', 'manifo',
    'montino', 'dial', 'latumapic', 'matu', 'bamatu', 'dialko',
    'latumofis', 'lomilwa', 'dalto_priest', 'litokan', 'kandi',
    'di', 'badi', 'lorto', 'mabadi', 'loktofeit', 'malikto',
    'kadorto', 'madi', 'mamorlis', 'bamordi', 'makanito',
    'katu', 'maporfic', 'badial', 'badialma', 'kalki',
    'badi_6', 'dial_5', 'badialma_5', 'mabadi_7', 'malikto_7', 'lomilwa_priest'
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
