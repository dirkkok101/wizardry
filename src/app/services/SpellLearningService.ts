import { Character } from '@models/Character';
import { SpellDataLoader } from './SpellDataLoader';
import { RandomService } from './RandomService';
import { ClassService } from './ClassService';

interface Spell {
  id: string;
  name: string;
  level: number;
  type: 'MAGE' | 'PRIEST';
}

interface SpellLearningResult {
  updatedCharacter: Character;
  newSpells: Spell[];
}

export class SpellLearningService {
  static isCaster(character: Character): boolean {
    const classData = ClassService.getClassData(character.class);
    return classData.spellAccess !== null;
  }

  static hasMageSpells(character: Character): boolean {
    const classData = ClassService.getClassData(character.class);
    return classData.spellAccess?.mage !== undefined;
  }

  static hasPriestSpells(character: Character): boolean {
    const classData = ClassService.getClassData(character.class);
    return classData.spellAccess?.priest !== undefined;
  }

  private static getSpellLevelRequirements(
    character: Character,
    casterType: 'mage' | 'priest',
  ): number[] | undefined {
    const classData = ClassService.getClassData(character.class);
    return classData.spellLevelAccess?.[casterType];
  }

  private static getMaxSpellLevel(character: Character, casterType: 'mage' | 'priest'): number {
    const classData = ClassService.getClassData(character.class);
    const access =
      casterType === 'mage' ? classData.spellAccess?.mage : classData.spellAccess?.priest;
    return access?.maxLevel ?? 7;
  }

  /**
   * Get highest spell level available to character at current level.
   * Uses class data from JSON files for spell level requirements.
   */
  static getAvailableSpellLevel(character: Character): number {
    if (!this.isCaster(character)) {
      return 0;
    }

    const classData = ClassService.getClassData(character.class);
    let maxLevel = 0;

    if (classData.spellLevelAccess?.mage) {
      const mageReqs = classData.spellLevelAccess.mage;
      const maxMageSpellLevel = classData.spellAccess?.mage?.maxLevel ?? 7;
      for (let i = 0; i < mageReqs.length && i < maxMageSpellLevel; i++) {
        if (character.level >= mageReqs[i]) {
          maxLevel = Math.max(maxLevel, i + 1);
        }
      }
    }

    if (classData.spellLevelAccess?.priest) {
      const priestReqs = classData.spellLevelAccess.priest;
      const maxPriestSpellLevel = classData.spellAccess?.priest?.maxLevel ?? 7;
      for (let i = 0; i < priestReqs.length && i < maxPriestSpellLevel; i++) {
        if (character.level >= priestReqs[i]) {
          maxLevel = Math.max(maxLevel, i + 1);
        }
      }
    }

    return maxLevel;
  }

  /**
   * Learn initial spells for a newly created spellcaster.
   * Level 1 spellcasters learn all level 1 spells of their type.
   * Bishops learn all level 1 spells from both mage and priest lists.
   * Returns updated character with initial spells added to knownSpells.
   */
  static learnInitialSpells(character: Character): SpellLearningResult {
    if (!this.isCaster(character)) {
      return { updatedCharacter: character, newSpells: [] };
    }

    // Check if spells are loaded
    if (!SpellDataLoader.isLoaded()) {
      console.warn('SpellDataLoader not loaded, cannot learn initial spells');
      return { updatedCharacter: character, newSpells: [] };
    }

    const hasMage = this.hasMageSpells(character);
    const hasPriest = this.hasPriestSpells(character);

    const allSpells = SpellDataLoader.getAllSpells();
    const knownSpellIds = new Set(character.knownSpells || []);
    const learnedSpells: Spell[] = [];

    // Learn all level 1 mage spells if character has mage casting
    if (hasMage) {
      for (const spell of allSpells.values()) {
        if (spell.casterType === 'mage' && spell.level === 1 && !knownSpellIds.has(spell.id)) {
          learnedSpells.push({
            id: spell.id,
            name: spell.name,
            level: spell.level,
            type: 'MAGE',
          });
          knownSpellIds.add(spell.id);
        }
      }
    }

    // Learn all level 1 priest spells if character has priest casting
    if (hasPriest) {
      for (const spell of allSpells.values()) {
        if (spell.casterType === 'priest' && spell.level === 1 && !knownSpellIds.has(spell.id)) {
          learnedSpells.push({
            id: spell.id,
            name: spell.name,
            level: spell.level,
            type: 'PRIEST',
          });
          knownSpellIds.add(spell.id);
        }
      }
    }

    const updatedCharacter: Character = {
      ...character,
      knownSpells: Array.from(knownSpellIds),
    };

    return {
      updatedCharacter,
      newSpells: learnedSpells,
    };
  }

  /**
   * Calculate spell learning chance based on INT or PIE.
   *
   * Formula (authentic Wizardry 1):
   *   LearnChance = (INT or PIE) / 30
   *
   * Examples:
   *   INT 11: 36.7% chance per spell
   *   INT 15: 50% chance per spell
   *   INT 18: 60% chance per spell
   *
   * Bishops use the lower of INT/PIE for learning (both types slower).
   */
  static getSpellLearnChance(character: Character, spellType: 'MAGE' | 'PRIEST'): number {
    let relevantStat: number;
    const classData = ClassService.getClassData(character.class);

    // Check if this is a Bishop (has both mage and priest spells)
    const isBishop =
      classData.spellAccess?.mage !== undefined && classData.spellAccess?.priest !== undefined;

    if (isBishop) {
      // Bishops learn slower - use the relevant stat but at 2/3 rate
      relevantStat = spellType === 'MAGE' ? character.intelligence : character.piety;
      return (relevantStat / 30) * 0.67; // Bishop penalty
    }

    // Use INT for mage spells, PIE for priest spells
    if (spellType === 'MAGE') {
      relevantStat = character.intelligence;
    } else {
      relevantStat = character.piety;
    }

    return relevantStat / 30;
  }

  /**
   * Learn new spells when leveling up using INT/PIE-based chance.
   *
   * Per authentic Wizardry mechanics, characters can retry failed spells on each level-up.
   * For each unlearned spell at ALL accessible spell levels:
   *   Roll against LearnChance = (INT or PIE) / 30
   *   If successful, add spell to known spells
   *
   * Returns updated character with new spells added to knownSpells.
   */
  static learnNewSpells(
    character: Character,
    oldLevel: number,
    newLevel: number,
  ): SpellLearningResult {
    if (!this.isCaster(character)) {
      return { updatedCharacter: character, newSpells: [] };
    }

    const hasMage = this.hasMageSpells(character);
    const hasPriest = this.hasPriestSpells(character);

    const learnedSpells: Spell[] = [];
    const knownSpellIds = new Set(character.knownSpells || []);
    const allSpells = SpellDataLoader.getAllSpells();

    // Learn mage spells
    if (hasMage) {
      const requirements = this.getSpellLevelRequirements(character, 'mage');
      if (requirements) {
        const mageSpells = this.attemptLearnSpells(
          character,
          oldLevel,
          newLevel,
          requirements,
          'mage',
          allSpells,
          knownSpellIds,
        );
        learnedSpells.push(...mageSpells);
      }
    }

    // Learn priest spells
    if (hasPriest) {
      const requirements = this.getSpellLevelRequirements(character, 'priest');
      if (requirements) {
        const priestSpells = this.attemptLearnSpells(
          character,
          oldLevel,
          newLevel,
          requirements,
          'priest',
          allSpells,
          knownSpellIds,
        );
        learnedSpells.push(...priestSpells);
      }
    }

    const updatedCharacter: Character = {
      ...character,
      knownSpells: Array.from(knownSpellIds),
    };

    return {
      updatedCharacter,
      newSpells: learnedSpells,
    };
  }

  /**
   * Attempt to learn spells from a specific caster type.
   * Per authentic Wizardry mechanics:
   * - First spell of each circle is GUARANTEED when the circle is first unlocked
   * - Characters can retry failed spells on each level-up using INT/30 or PIE/30 chance
   *
   * Uses class data from JSON for max spell level (e.g., Samurai/Lord may have caps).
   */
  private static attemptLearnSpells(
    character: Character,
    oldLevel: number,
    newLevel: number,
    requirements: number[],
    casterType: 'mage' | 'priest',
    allSpells: Map<string, { id: string; name: string; level: number; casterType: string }>,
    knownSpellIds: Set<string>,
  ): Spell[] {
    const learnedSpells: Spell[] = [];

    // Get max spell level for this class from JSON data
    const maxSpellLevel = this.getMaxSpellLevel(character, casterType);

    // Attempt to learn spells at ALL accessible spell levels (not just newly unlocked)
    // This allows retrying failed spells on each level-up per authentic Wizardry mechanics
    for (let spellLevel = 1; spellLevel <= maxSpellLevel; spellLevel++) {
      // Requirements array is 0-indexed, spell levels are 1-indexed
      const reqLevel = requirements[spellLevel - 1];
      if (reqLevel === undefined) {
        continue; // No requirement defined for this spell level
      }

      // Check if this spell level is accessible at the new character level
      if (newLevel < reqLevel) {
        continue; // Not accessible yet
      }

      // Check if this spell circle was JUST unlocked (first spell guaranteed)
      const isNewlyUnlockedCircle = oldLevel < reqLevel && newLevel >= reqLevel;
      let guaranteedFirstSpell = isNewlyUnlockedCircle;

      // Get available spells at this level (sort by ID for consistent ordering)
      const circleSpells = Array.from(allSpells.values())
        .filter((s) => s.casterType === casterType && s.level === spellLevel)
        .sort((a, b) => a.id.localeCompare(b.id));

      for (const spell of circleSpells) {
        if (knownSpellIds.has(spell.id)) {
          continue; // Already known
        }

        const spellType = casterType === 'mage' ? 'MAGE' : 'PRIEST';

        // First spell of a newly unlocked circle is guaranteed (authentic Wizardry 1)
        if (guaranteedFirstSpell) {
          learnedSpells.push({
            id: spell.id,
            name: spell.name,
            level: spell.level,
            type: spellType,
          });
          knownSpellIds.add(spell.id);
          guaranteedFirstSpell = false; // Only one guaranteed spell per circle
          continue;
        }

        // Roll for learning (authentic Wizardry formula: INT/30 or PIE/30)
        const learnChance = this.getSpellLearnChance(character, spellType);

        if (RandomService.roll(learnChance)) {
          learnedSpells.push({
            id: spell.id,
            name: spell.name,
            level: spell.level,
            type: spellType,
          });
          knownSpellIds.add(spell.id);
        }
      }
    }

    return learnedSpells;
  }
}
