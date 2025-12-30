import { Character } from '@models/Character';
import { CharacterClass } from '@models/CharacterClass';
import { CharacterStatus } from '@models/CharacterStatus';
import { CharacterSpellPoints, SpellPointPool } from '@models/SpellPoints';
import { RandomService } from './RandomService';
import { ClassService } from './ClassService';
import { StatModifierService } from './StatModifierService';

interface StatChanges {
  strength?: number;
  intelligence?: number;
  piety?: number;
  vitality?: number;
  agility?: number;
  luck?: number;
}

interface LevelUpData {
  newLevel: number;
  hpIncrease: number;
  statChanges: StatChanges;
  diedFromVitalityLoss?: boolean;
}

interface LevelUpResult {
  updatedCharacter: Character;
  levelUpData: LevelUpData;
}

export const MAX_LEVEL = 13;

export class LevelUpService {
  static getXPRequirement(level: number, characterClass: CharacterClass): number {
    if (level < 1 || level > MAX_LEVEL) {
      return Infinity;
    }
    if (level === 1) {
      return 0;
    }
    return ClassService.getXpForLevel(characterClass, level);
  }

  static canLevelUp(character: Character): boolean {
    if (character.level >= MAX_LEVEL) {
      return false;
    }

    const requiredXP = this.getXPRequirement(character.level + 1, character.class);
    return character.experience >= requiredXP;
  }

  private static parseHitDie(hitDiceString: string): number {
    const match = hitDiceString.match(/1d(\d+)/);
    return match ? parseInt(match[1], 10) : 6;
  }

  private static hasBonusDice(characterClass: CharacterClass): boolean {
    const classData = ClassService.getClassData(characterClass);
    return !!classData.hitDiceBonus;
  }

  static rollHPWithReroll(
    character: Character,
    newMaxLev: number,
  ): { newMaxHp: number; hpIncrease: number } {
    const classData = ClassService.getClassData(character.class);
    const hitDie = this.parseHitDie(classData.hitDice);
    const vitBonus = StatModifierService.getVitalityHPModifier(character.vitality);

    const diceCount = this.hasBonusDice(character.class) ? newMaxLev + 1 : newMaxLev;

    let newRoll = 0;
    for (let i = 0; i < diceCount; i++) {
      newRoll += RandomService.rollDie(hitDie);
    }
    newRoll += newMaxLev * vitBonus;

    newRoll = Math.max(newMaxLev, newRoll);

    const newMaxHp = newRoll > character.maxHp ? newRoll : character.maxHp + 1;
    const hpIncrease = newMaxHp - character.maxHp;

    return { newMaxHp, hpIncrease };
  }

  /** @deprecated Use rollHPWithReroll instead */
  static rollHPIncrease(character: Character): number {
    const classData = ClassService.getClassData(character.class);
    const hitDie = this.parseHitDie(classData.hitDice);
    const roll = RandomService.rollDie(hitDie);
    const vitBonus = StatModifierService.getVitalityHPModifier(character.vitality);
    return Math.max(1, roll + vitBonus);
  }

  private static getVitalityBonus(vitality: number): number {
    return StatModifierService.getVitalityHPModifier(vitality);
  }

  static rollStatChanges(character: Character): StatChanges {
    const changes: StatChanges = {};
    const ageInYears = Math.floor(character.age / 52);

    const increaseThreshold = Math.min(95, Math.max(5, 130 - ageInYears));

    const stats: Array<keyof StatChanges> = [
      'strength',
      'intelligence',
      'piety',
      'vitality',
      'agility',
      'luck',
    ];

    stats.forEach((stat) => {
      if (RandomService.chance(75)) {
        const roll = RandomService.random(1, 100);
        const currentValue = character[stat];

        if (roll <= increaseThreshold) {
          if (currentValue < 18) {
            changes[stat] = 1;
          }
        } else {
          if (currentValue > 3) {
            if (currentValue !== 18 || RandomService.rollDie(6) === 1) {
              changes[stat] = -1;
            }
          }
        }
      }
    });

    return changes;
  }

  /** @deprecated Use rollStatChanges instead */
  static rollStatIncreases(character: Character): StatChanges {
    return this.rollStatChanges(character);
  }

  static performLevelUp(character: Character): LevelUpResult {
    const statChanges = this.rollStatChanges(character);
    const newLevel = character.level + 1;

    const newVitality = character.vitality + (statChanges.vitality || 0);

    const diedFromVitalityLoss = newVitality <= 2;

    const newMaxLev = Math.max(character.maxLev || character.level, newLevel);

    const { newMaxHp, hpIncrease } = this.rollHPWithReroll(character, newMaxLev);

    const updatedSpellPoints = this.calculateSpellPointsForLevel(character, newLevel);

    const updatedCharacter: Character = {
      ...character,
      level: newLevel,
      maxLev: newMaxLev,
      maxHp: newMaxHp,
      hp: diedFromVitalityLoss ? 0 : newMaxHp,
      strength: character.strength + (statChanges.strength || 0),
      intelligence: character.intelligence + (statChanges.intelligence || 0),
      piety: character.piety + (statChanges.piety || 0),
      vitality: Math.max(0, newVitality),
      agility: character.agility + (statChanges.agility || 0),
      luck: character.luck + (statChanges.luck || 0),
      spellPoints: updatedSpellPoints,
      status: diedFromVitalityLoss ? CharacterStatus.DEAD : character.status,
    };

    const levelUpData: LevelUpData = {
      newLevel,
      hpIncrease,
      statChanges,
      diedFromVitalityLoss,
    };

    return {
      updatedCharacter,
      levelUpData,
    };
  }

  static calculateSpellPointsForLevel(
    character: Character,
    newLevel: number,
  ): CharacterSpellPoints | undefined {
    const classData = ClassService.getClassData(character.class);

    if (!classData.spellAccess) {
      return character.spellPoints;
    }

    const calculatePool = (spellType: 'mage' | 'priest', maxSpellLevel: number): SpellPointPool => {
      const pool: SpellPointPool = {
        level1: { current: 0, max: 0 },
        level2: { current: 0, max: 0 },
        level3: { current: 0, max: 0 },
        level4: { current: 0, max: 0 },
        level5: { current: 0, max: 0 },
        level6: { current: 0, max: 0 },
        level7: { current: 0, max: 0 },
      };

      for (let spellLevel = 1; spellLevel <= 7; spellLevel++) {
        const reqLevel = ClassService.getSpellLevelRequirement(
          character.class,
          spellType,
          spellLevel,
        );

        if (reqLevel !== null && newLevel >= reqLevel && spellLevel <= maxSpellLevel) {
          const maxPoints = Math.min(9, newLevel - reqLevel + 2);
          const key = `level${spellLevel}` as keyof SpellPointPool;
          pool[key] = { current: maxPoints, max: maxPoints };
        }
      }

      return pool;
    };

    const spellPoints: CharacterSpellPoints = {};

    if (classData.spellAccess.mage) {
      spellPoints.mage = calculatePool('mage', classData.spellAccess.mage.maxLevel);
    }

    if (classData.spellAccess.priest) {
      spellPoints.priest = calculatePool('priest', classData.spellAccess.priest.maxLevel);
    }

    return spellPoints;
  }
}
