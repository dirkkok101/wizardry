#!/usr/bin/env node
/**
 * Spell Validation Script
 *
 * Validates all spell JSON files against research documentation:
 * - docs/research/spell-reference.md
 * - docs/game-design/04-spells.md
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Expected spell counts from research documentation
const EXPECTED_MAGE_SPELLS = {
  1: ['DUMAPIC', 'HALITO', 'KATINO', 'MOGREF'],
  2: ['DILTO', 'MELITO', 'SOPIC'],
  3: ['MAHALITO', 'MOLITO'],
  4: ['DALTO', 'LAHALITO', 'MORLIS'],
  5: ['MADALTO', 'LAKANITO', 'ZILWAN'],
  6: ['HAMAN', 'LOMILWA', 'MAHAMAN', 'MALOR', 'TILTOWAIT'],
  7: ['TILTOWAIT', 'MAHAMAN', 'HAMAN'] // Note: Level 7 versions
};

const EXPECTED_PRIEST_SPELLS = {
  1: ['BADIOS', 'DIOS', 'KALKI', 'MILWA', 'PORFIC'],
  2: ['CALFO', 'MANIFO', 'MATU', 'MONTINO'],
  3: ['BAMATU', 'BADIAL', 'DIAL', 'LATUMAPIC', 'LOMILWA'],
  4: ['BADIALMA', 'BAMORDI', 'DALTO', 'KANDI', 'KATU', 'LATUMOFIS', 'MAPORFIC'],
  5: ['BADI', 'DIAL', 'KADORTO', 'LOKTOFEIT', 'MABADI', 'BADIALMA'],
  6: ['LORTO', 'MALIKTO', 'BADI'],
  7: ['DI', 'MABADI', 'MALIKTO']
};

// Check if spell file is in consolidated format (has levels array)
function isConsolidatedFormat(rawSpell) {
  return Array.isArray(rawSpell.levels) && rawSpell.levels.length > 0;
}

// Flatten consolidated spell into individual spell objects
function flattenConsolidatedSpell(fileData) {
  const spells = [];

  for (const levelData of fileData.levels) {
    const spell = {
      id: levelData.id,
      name: fileData.name,
      level: levelData.level,
      casterType: fileData.casterType,
      category: fileData.category,
      target: levelData.target,
      castableIn: fileData.castableIn,
      description: levelData.description,
      // Copy level-specific fields
      ...levelData
    };

    // Remove the redundant fields that were copied from levelData
    delete spell.id;
    delete spell.target;
    delete spell.description;

    // Restore correct values
    spell.id = levelData.id;
    spell.target = levelData.target;
    spell.description = levelData.description;

    spells.push(spell);
  }

  return spells;
}

// Validate a single spell object
function validateSpellObject(spell, filePath) {
  const errors = [];

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
  if (spell.category === 'offensive' && !spell.damage && !spell.effect) {
    errors.push(`${filePath}: Offensive spell missing 'damage' or 'effect' field`);
  }
  if (spell.category === 'healing' && !spell.healing) {
    errors.push(`${filePath}: Healing spell missing 'healing' field`);
  }

  return errors;
}

function validateSpellFile(filePath) {
  const allErrors = [];
  const spells = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const rawData = JSON.parse(content);

    // Detect format and convert to array of spells
    const spellObjects = isConsolidatedFormat(rawData)
      ? flattenConsolidatedSpell(rawData)
      : [rawData];

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
    allErrors.push(`${filePath}: Failed to parse JSON - ${e.message}`);
    return { spells: [], errors: allErrors };
  }
}

function validateAllSpells() {
  const spellsDir = join(__dirname, '../data/spells');
  const files = readdirSync(spellsDir).filter(f => f.endsWith('.json'));

  const result = {
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
    const filePath = join(spellsDir, file);
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

function printReport(result) {
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
