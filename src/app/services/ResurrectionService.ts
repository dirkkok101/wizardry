import { Character } from '@models/Character';
import { ServiceType } from '@models/ServiceType';
import { CharacterStatus } from '@models/CharacterStatus';
import { RandomService } from './RandomService';

export interface ResurrectionResult {
  success: boolean;
  newVitality: number;
  newStatus: CharacterStatus;
  characterLost: boolean;
}

export class ResurrectionService {
  static getSuccessRate(character: Character, service: ServiceType): number {
    switch (service) {
      case ServiceType.CURE_POISON:
      case ServiceType.CURE_PARALYSIS:
      case ServiceType.CURE_STONED:
        return 100;

      case ServiceType.RESURRECT:
      case ServiceType.RESTORE:
        // Authentic Wizardry 1: (4 × Vitality)%
        // Source: docs/reference/combat-formulas.md - Resurrection Mechanics
        return character.vitality * 4;

      default:
        return 100;
    }
  }

  static isResurrectionService(service: ServiceType): boolean {
    return service === ServiceType.RESURRECT || service === ServiceType.RESTORE;
  }

  static canAttemptResurrection(character: Character): { canAttempt: boolean; reason?: string } {
    // Character with VIT 3 will drop to VIT 2 after attempt, which causes permanent loss
    // Authentic Wizardry 1: VIT < 3 after attempt = character lost forever
    if (character.vitality <= 3) {
      return {
        canAttempt: false,
        reason: `${character.name}'s vitality is too low (${character.vitality}). Resurrection attempt would result in permanent loss.`,
      };
    }
    return { canAttempt: true };
  }

  static attemptResurrection(character: Character, service: ServiceType): ResurrectionResult {
    const successRate = this.getSuccessRate(character, service);
    const success = RandomService.chance(successRate);

    // Authentic Wizardry 1: VIT decreases by 1 on EVERY attempt (success or failure)
    // Source: docs/reference/combat-formulas.md
    const newVitality = character.vitality - 1;

    // Character is permanently lost if VIT drops to 2 or below
    const characterLost = newVitality <= 2;

    let newStatus: CharacterStatus;
    if (characterLost) {
      newStatus = CharacterStatus.LOST;
    } else if (success) {
      newStatus = CharacterStatus.OK;
    } else {
      // Failure progression: DEAD → ASHES, ASHES → LOST
      newStatus = service === ServiceType.RESURRECT ? CharacterStatus.ASHES : CharacterStatus.LOST;
    }

    return {
      success: success && !characterLost,
      newVitality,
      newStatus,
      characterLost,
    };
  }

  static attemptService(character: Character, service: ServiceType): boolean {
    if (!this.isResurrectionService(service)) {
      return true; // Cure services always succeed
    }
    const result = this.attemptResurrection(character, service);
    return result.success;
  }
}
