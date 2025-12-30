import { Character } from '@models/Character';
import { ServiceType } from '@models/ServiceType';
import { GameState } from '@models/GameState';
import { CharacterStatus } from '@models/CharacterStatus';
import * as PartyService from './PartyService';
import { ResurrectionService } from './ResurrectionService';
import { TownConfigLoader } from './TownConfigLoader';

interface ServiceResult {
  success: boolean;
  error?: string;
  state?: GameState;
  ageIncrease?: number;
}

export class TempleService {
  static calculateTithe(character: Character, service: ServiceType): number {
    const baseCost = TownConfigLoader.getTempleServiceCost(service);
    return baseCost * character.level;
  }

  static getServiceAgeIncrease(service: ServiceType): number {
    return TownConfigLoader.getTempleServiceAgeIncrease(service);
  }

  static performService(
    state: GameState,
    characterId: string,
    service: ServiceType,
  ): ServiceResult {
    const character = state.roster.get(characterId);
    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    const cost = this.calculateTithe(character, service);

    if (!PartyService.hasEnoughGold(state, cost)) {
      return { success: false, error: 'Insufficient party gold' };
    }

    let newState = PartyService.removePartyGold(state, cost);

    const isResurrection = ResurrectionService.isResurrectionService(service);

    if (isResurrection) {
      const canAttempt = ResurrectionService.canAttemptResurrection(character);
      if (!canAttempt.canAttempt) {
        return { success: false, error: canAttempt.reason, state: newState };
      }
    }

    let newStatus = character.status;
    let newHp = character.hp;
    let newVitality = character.vitality;
    let errorMessage: string | undefined;

    if (isResurrection) {
      const result = ResurrectionService.attemptResurrection(character, service);
      newStatus = result.newStatus;
      newVitality = result.newVitality;

      if (result.characterLost) {
        newHp = 0;
        errorMessage = `${character.name}'s vitality was too low. They are lost forever.`;
      } else if (result.success) {
        newHp = service === ServiceType.RESURRECT ? 1 : character.maxHp;
      } else {
        newHp = 0;
        errorMessage =
          service === ServiceType.RESURRECT
            ? `Resurrection failed. ${character.name} has turned to ashes.`
            : `Restoration failed. ${character.name} is lost forever.`;
      }
    } else {
      newStatus = CharacterStatus.OK;
    }

    const ageIncrease = this.getServiceAgeIncrease(service);

    const updatedCharacter: Character = {
      ...character,
      status: newStatus,
      hp: newHp,
      vitality: newVitality,
      age: character.age + ageIncrease,
    };

    newState = {
      ...newState,
      roster: new Map(newState.roster).set(characterId, updatedCharacter),
    };

    if (errorMessage) {
      return { success: false, error: errorMessage, state: newState, ageIncrease };
    }

    return { success: true, state: newState, ageIncrease };
  }
}
