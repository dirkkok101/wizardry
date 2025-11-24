#!/usr/bin/env ts-node
/**
 * Spell Validation Script
 *
 * Validates all spell JSON files against research documentation:
 * - docs/research/spell-reference.md
 * - docs/game-design/04-spells.md
 */

import * as fs from 'fs';
import * as path from 'path';

interface SpellData {
  id: string;
  name: string;
  level: number;
  casterType: 'mage' | 'priest';
  category: string;
  target: string;
  description: string;
  castableIn: string[];
  damage?: {
    dice?: string;
    type?: string;
  };
  healing?: {
    dice?: string;
    type?: string;
  };
  effect?: any;
}

interface SpellLevelData {
  level: number;
  id: string;
  description: string;
  target: string;
  damage?: any;
  healing?: any;
  effect?: any;
  [key: string]: any;
}

interface ConsolidatedSpellData {
  name: string;
  casterType: 'mage' | 'priest';
  category: string;
  castableIn: string[];
  levels: SpellLevelData[];
}

interface ValidationResult {
  totalSpells: number;
  mageSpells: number;
  priestSpells: number;
  byLevel: Record<string, number>;
  errors: string[];
  warnings: string[];
  spells: SpellData[];
}

// Helper functions for consolidated format
function isConsolidatedFormat(rawSpell: any): rawSpell is ConsolidatedSpellData {
  return Array.isArray(rawSpell.levels) && rawSpell.levels.length > 0;
}

function flattenConsolidatedSpell(fileData: ConsolidatedSpellData): SpellData[] {
  const spells: SpellData[] = [];

  for (const levelData of fileData.levels) {
    const spell: SpellData = {
      id: levelData.id,
      name: fileData.name,
      level: levelData.level,
      casterType: fileData.casterType,
      category: fileData.category,
      target: levelData.target,
      castableIn: fileData.castableIn,
      description: levelData.description,
      // Copy level-specific fields
      ...(levelData.damage && { damage: levelData.damage }),
      ...(levelData.healing && { healing: levelData.healing }),
      ...(levelData.effect && { effect: levelData.effect })
    };

    spells.push(spell);
  }

  return spells;
}

// Expected spell counts from research documentation
const EXPECTED_MAGE_SPELLS: Record<number, string[]> = {
  1: ['DUMAPIC', 'HALITO', 'KATINO', 'MOGREF'],
  2: ['DILTO', 'MELITO', 'SOPIC'],
  3: ['MAHALITO', 'MOLITO'],
  4: ['DALTO', 'LAHALITO', 'MORLIS'],
  5: ['MADALTO', 'LAKANITO', 'ZILWAN'],
  6: ['HAMAN', 'LOMILWA', 'MAHAMAN', 'MALOR', 'TILTOWAIT'],
  7: ['TILTOWAIT', 'MAHAMAN', 'HAMAN'] // Note: Level 7 versions
};

const EXPECTED_PRIEST_SPELLS: Record<number, string[]> = {
  1: ['BADIOS', 'DIOS', 'KALKI', 'MILWA', 'PORFIC'],
  2: ['CALFO', 'MANIFO', 'MATU', 'MONTINO'],
  3: ['BAMATU', 'BADIAL', 'DIAL', 'LATUMAPIC', 'LOMILWA'],
  4: ['BADIALMA', 'BAMORDI', 'DALTO', 'KANDI', 'KATU', 'LATUMOFIS', 'MAPORFIC'],
  5: ['BADI', 'DIAL', 'KADORTO', 'LOKTOFEIT', 'MABADI', 'BADIALMA'],
  6: ['LORTO', 'MALIKTO', 'BADI'],
  7: ['DI', 'MABADI', 'MALIKTO']
};

function validateSpellObject(spell: SpellData, filePath: string): string[] {
  const errors: string[] = [];

  // Required fields
  if (!spell.id) errors.push(`${filePath}: Missing 'id' field`);
  if (!spell.name) errors.push(`${filePath}: Missing 'name' field`);
  if (!spell.level) errors.push(`${filePath}: Missing 'level' field`);
  if (!spell.casterType) errors.push(`${filePath}: Missing 'casterType' field`);
  if (!spell.category) errors.push(`${filePath}: Missing 'category' field`);
  if (!spell.target) errors.push(`${filePath}: Missing 'target' field`);
  if (!spell.description) errors.push(`${filePath}: Missing 'description' field`);
  if (!spell.castableIn || spell.castableIn.length === 0) {
    errors.push(`${filePath}: Missing or empty 'castableIn' field`);
  }

  // Validate casterType
  if (spell.casterType && !['mage', 'priest'].includes(spell.casterType)) {
    errors.push(`${filePath}: Invalid casterType '${spell.casterType}' (must be 'mage' or 'priest')`);
  }

  // Validate level range
  if (spell.level && (spell.level < 1 || spell.level > 7)) {
    errors.push(`${filePath}: Invalid level ${spell.level} (must be 1-7)`);
  }

  // Validate category-specific fields
  // Offensive spells need either 'damage' OR 'effect' (instant death, petrification use 'effect')
  if (spell.category === 'offensive' && !spell.damage && !spell.effect) {
    errors.push(`${filePath}: Offensive spell missing 'damage' or 'effect' field`);
  }
  if (spell.category === 'healing' && !spell.healing) {
    errors.push(`${filePath}: Healing spell missing 'healing' field`);
  }

  return errors;
}

function validateSpellFile(filePath: string): { spells: SpellData[]; errors: string[] } {
  const allErrors: string[] = [];
  const spells: SpellData[] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rawData: any = JSON.parse(content);

    // Detect format and convert to array of spells
    const spellObjects = isConsolidatedFormat(rawData)
      ? flattenConsolidatedSpell(rawData)
      : [rawData as SpellData];

    // Validate each spell
    for (const spell of spellObjects) {
      const errors = validateSpellObject(spell, filePath);
      allErrors.push(...errors);
      if (errors.length === 0) {
        spells.push(spell);
      }
    }

    return { spells, errors: allErrors };
  } catch (e) {
    allErrors.push(`${filePath}: Failed to parse JSON - ${(e as Error).message}`);
    return { spells: [], errors: allErrors };
  }
}

function validateAllSpells(): ValidationResult {
  const spellsDir = path.join(__dirname, '../data/spells');
  const files = fs.readdirSync(spellsDir).filter(f => f.endsWith('.json'));

  const result: ValidationResult = {
    totalSpells: 0,
    mageSpells: 0,
    priestSpells: 0,
    byLevel: {},
    errors: [],
    warnings: [],
    spells: []
  };

  // Validate each spell file
  for (const file of files) {
    const filePath = path.join(spellsDir, file);
    const { spells, errors } = validateSpellFile(filePath);

    if (errors.length > 0) {
      result.errors.push(...errors);
    }

    // A file can contain multiple spells (consolidated format)
    for (const spell of spells) {
      result.spells.push(spell);
      result.totalSpells++;

      if (spell.casterType === 'mage') {
        result.mageSpells++;
      } else if (spell.casterType === 'priest') {
        result.priestSpells++;
      }

      const levelKey = `${spell.casterType}_${spell.level}`;
      result.byLevel[levelKey] = (result.byLevel[levelKey] || 0) + 1;
    }
  }

  // Check for missing spells
  for (let level = 1; level <= 7; level++) {
    const expectedMage = EXPECTED_MAGE_SPELLS[level] || [];
    const actualMage = result.spells.filter(s => s.casterType === 'mage' && s.level === level);

    for (const spellName of expectedMage) {
      const found = actualMage.find(s => s.name === spellName);
      if (!found) {
        result.errors.push(`Missing mage spell: ${spellName} (level ${level})`);
      }
    }

    const expectedPriest = EXPECTED_PRIEST_SPELLS[level] || [];
    const actualPriest = result.spells.filter(s => s.casterType === 'priest' && s.level === level);

    for (const spellName of expectedPriest) {
      const found = actualPriest.find(s => s.name === spellName);
      if (!found) {
        result.errors.push(`Missing priest spell: ${spellName} (level ${level})`);
      }
    }
  }

  // Check for extra spells not in research
  for (const spell of result.spells) {
    const expected = spell.casterType === 'mage'
      ? EXPECTED_MAGE_SPELLS[spell.level] || []
      : EXPECTED_PRIEST_SPELLS[spell.level] || [];

    if (!expected.includes(spell.name)) {
      result.warnings.push(`Extra spell found: ${spell.name} (${spell.casterType} level ${spell.level})`);
    }
  }

  return result;
}

function printReport(result: ValidationResult) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                   SPELL VALIDATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('SUMMARY');
  console.log('-------');
  console.log(`Total Spells:  ${result.totalSpells}`);
  console.log(`Mage Spells:   ${result.mageSpells}`);
  console.log(`Priest Spells: ${result.priestSpells}`);
  console.log('');

  console.log('BREAKDOWN BY LEVEL');
  console.log('------------------');

  // Mage spells by level
  console.log('\nMage Spells:');
  for (let level = 1; level <= 7; level++) {
    const count = result.byLevel[`mage_${level}`] || 0;
    const expected = (EXPECTED_MAGE_SPELLS[level] || []).length;
    const status = count === expected ? '✓' : '✗';
    const spells = result.spells
      .filter(s => s.casterType === 'mage' && s.level === level)
      .map(s => s.name)
      .join(', ');
    console.log(`  Level ${level}: ${count}/${expected} ${status} - ${spells || '(none)'}`);
  }

  // Priest spells by level
  console.log('\nPriest Spells:');
  for (let level = 1; level <= 7; level++) {
    const count = result.byLevel[`priest_${level}`] || 0;
    const expected = (EXPECTED_PRIEST_SPELLS[level] || []).length;
    const status = count === expected ? '✓' : '✗';
    const spells = result.spells
      .filter(s => s.casterType === 'priest' && s.level === level)
      .map(s => s.name)
      .join(', ');
    console.log(`  Level ${level}: ${count}/${expected} ${status} - ${spells || '(none)'}`);
  }

  // Errors
  if (result.errors.length > 0) {
    console.log('\n\nERRORS');
    console.log('------');
    result.errors.forEach(err => console.log(`  ✗ ${err}`));
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log('\n\nWARNINGS');
    console.log('--------');
    result.warnings.forEach(warn => console.log(`  ⚠ ${warn}`));
  }

  // Final status
  console.log('\n═══════════════════════════════════════════════════════════════');
  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('STATUS: ✓ ALL SPELLS VALIDATED');
  } else if (result.errors.length === 0) {
    console.log('STATUS: ⚠ VALIDATION PASSED WITH WARNINGS');
  } else {
    console.log('STATUS: ✗ VALIDATION FAILED');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run validation
const result = validateAllSpells();
printReport(result);

// Exit with error code if validation failed
process.exit(result.errors.length > 0 ? 1 : 0);
