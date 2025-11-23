import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ES module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Migrates old spell JSON format to unified schema
 * Resolves field conflicts and fixes known bugs
 */

interface OldSpellJSON {
  id: string
  name: string
  level: number
  type: string  // OLD: "offensive", "healing", etc. (this is category)
  target: string
  damage?: string
  damageType?: string
  healing?: string
  description: string
  castableIn: string[]
  effect?: string
  [key: string]: any
}

interface NewSpellJSON {
  id: string
  name: string
  level: number
  casterType: 'mage' | 'priest'  // NEW: determined from spell lists
  category: string  // OLD type field renamed
  target: string
  damage?: { dice: string; type: string }
  healing?: { dice?: string; type: 'normal' | 'full' }
  description: string
  castableIn: string[]
  [key: string]: any
}

// Spell lists from game data
const MAGE_SPELLS = [
  'halito', 'mogref', 'katino', 'dumapic', 'dilto', 'sopic',
  'mahalito', 'molito', 'morlis', 'dalto', 'lahalito',
  'madalto', 'lakanito', 'zilwan', 'masopic', 'haman', 'malor',
  'mahaman', 'tiltowait', 'melito', 'lomilwa_mage',
  // Level variants
  'haman_7', 'mahaman_7', 'tiltowait_7'
]

const PRIEST_SPELLS = [
  'dios', 'badios', 'milwa', 'porfic', 'calfo', 'manifo',
  'montino', 'dial', 'latumapic', 'matu', 'bamatu', 'dialko',
  'latumofis', 'lomilwa', 'dalto_priest', 'litokan', 'kandi',
  'di', 'badi', 'lorto', 'mabadi', 'loktofeit', 'malikto',
  'kadorto', 'madi', 'mamorlis', 'bamordi', 'makanito',
  'katu', 'maporfic', 'badial', 'badialma', 'kalki',
  // Level variants
  'badi_6', 'dial_5', 'badialma_5', 'mabadi_7', 'malikto_7', 'lomilwa_priest'
]

function migrateSpell(oldSpell: OldSpellJSON): NewSpellJSON {
  const newSpell: NewSpellJSON = {
    id: oldSpell.id,
    name: oldSpell.name,
    level: oldSpell.level,
    casterType: MAGE_SPELLS.includes(oldSpell.id) ? 'mage' : 'priest',
    category: oldSpell.type,  // Rename type → category
    target: normalizeTarget(oldSpell.target),
    description: oldSpell.description,
    castableIn: oldSpell.castableIn
  }

  // Convert damage format
  if (oldSpell.damage && oldSpell.damageType) {
    newSpell.damage = {
      dice: normalizeDice(oldSpell.damage),
      type: oldSpell.damageType as any
    }
  }

  // Convert healing format
  if (oldSpell.healing) {
    newSpell.healing = {
      dice: oldSpell.healing === 'full' ? undefined : oldSpell.healing,
      type: oldSpell.healing === 'full' ? 'full' : 'normal'
    }
  }

  // Copy other fields
  const skipFields = ['type', 'damage', 'damageType', 'healing', 'effect']
  for (const [key, value] of Object.entries(oldSpell)) {
    if (!skipFields.includes(key) && !(key in newSpell)) {
      newSpell[key] = value
    }
  }

  // Apply bug fixes
  return applyBugFixes(newSpell)
}

function normalizeTarget(target: string): string {
  const mapping: Record<string, string> = {
    'enemy_group': 'group',
    'single_ally': 'single',
    'single_enemy': 'single',
    'all_allies': 'all_allies',
    'all_enemies': 'all_enemies'
  }
  return mapping[target] || target
}

function normalizeDice(damage: string): string {
  // Convert "massive" to actual dice notation
  if (damage === 'massive') {
    return '10d10'
  }
  return damage
}

function applyBugFixes(spell: NewSpellJSON): NewSpellJSON {
  // Fix TILTOWAIT: level 6 → 7, damage "massive" → "10d10"
  if (spell.id === 'tiltowait' && spell.level === 6) {
    console.log('Fixing TILTOWAIT: level 6 → 7, damage "massive" → "10d10"')
    spell.level = 7
    if (spell.damage) {
      spell.damage.dice = '10d10'
      spell.damage.type = 'fire'
    }
  }

  // Fix MALIKTO: offensive/petrify → healing/full_heal, level 6 → 7
  if (spell.id === 'malikto' && spell.category === 'offensive') {
    console.log('Fixing MALIKTO: level 6 → 7, changing from offensive to healing/full')
    spell.level = 7
    spell.category = 'healing'
    spell.healing = { type: 'full' }
    spell.target = 'all_allies'
    spell.description = 'Fully restores all party members to maximum HP'
    delete (spell as any).effect
    delete spell.damage
  }

  return spell
}

// Main migration
const spellsDir = path.join(__dirname, '../data/spells')
const files = fs.readdirSync(spellsDir).filter(f => f.endsWith('.json'))

console.log(`Migrating ${files.length} spell files...`)

for (const file of files) {
  const filepath = path.join(spellsDir, file)
  const oldSpell: OldSpellJSON = JSON.parse(fs.readFileSync(filepath, 'utf8'))
  const newSpell = migrateSpell(oldSpell)

  fs.writeFileSync(filepath, JSON.stringify(newSpell, null, 2) + '\n')
  console.log(`✓ ${file}`)
}

console.log('Migration complete!')
