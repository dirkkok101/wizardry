import { TestBed } from '@angular/core/testing'
import { PartyTableComponent } from '../party-table.component'
import { GameStateService } from '@services/GameStateService'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'
import { createTestCharacter, createTestGameState } from '@testing/test-factories'
import { Character } from '@models/Character'
import { signal } from '@angular/core'

describe('PartyTableComponent', () => {
  let component: PartyTableComponent
  let mockGameStateService: { state: ReturnType<typeof signal> }

  beforeEach(() => {
    // Create a mock GameStateService with a signal
    const initialState = createTestGameState()
    mockGameStateService = {
      state: signal(initialState)
    }

    TestBed.configureTestingModule({
      imports: [PartyTableComponent],
      providers: [
        { provide: GameStateService, useValue: mockGameStateService }
      ]
    })

    component = TestBed.createComponent(PartyTableComponent).componentInstance
  })

  describe('getClassAbbr', () => {
    it('returns FIG for FIGHTER', () => {
      expect(component.getClassAbbr(CharacterClass.FIGHTER)).toBe('FIG')
    })

    it('returns MAG for MAGE', () => {
      expect(component.getClassAbbr(CharacterClass.MAGE)).toBe('MAG')
    })

    it('returns PRI for PRIEST', () => {
      expect(component.getClassAbbr(CharacterClass.PRIEST)).toBe('PRI')
    })

    it('returns THI for THIEF', () => {
      expect(component.getClassAbbr(CharacterClass.THIEF)).toBe('THI')
    })

    it('handles unknown class with substring fallback', () => {
      expect(component.getClassAbbr('UNKNOWN' as CharacterClass)).toBe('UNK')
    })
  })

  describe('getStatusCode', () => {
    it('returns OK for OK status', () => {
      expect(component.getStatusCode(CharacterStatus.OK)).toBe('OK')
    })

    it('returns DED for DEAD status', () => {
      expect(component.getStatusCode(CharacterStatus.DEAD)).toBe('DED')
    })

    it('returns PSN for POISONED status', () => {
      expect(component.getStatusCode(CharacterStatus.POISONED)).toBe('PSN')
    })

    it('returns UNK for unknown status', () => {
      expect(component.getStatusCode('UNKNOWN' as CharacterStatus)).toBe('UNK')
    })
  })

  describe('getStatusColor', () => {
    it('returns green for OK', () => {
      expect(component.getStatusColor(CharacterStatus.OK)).toBe('var(--crt-green)')
    })

    it('returns red for DEAD', () => {
      expect(component.getStatusColor(CharacterStatus.DEAD)).toBe('#ef4444')
    })

    it('returns default green for unknown status', () => {
      expect(component.getStatusColor('UNKNOWN' as CharacterStatus)).toBe('var(--crt-green)')
    })
  })

  describe('formatHP', () => {
    it('formats HP as current/max without HP suffix', () => {
      const char = createTestCharacter({ hp: 7, maxHp: 10 })
      expect(component.formatHP(char)).toBe('7/10')
    })

    it('handles zero HP', () => {
      const char = createTestCharacter({ hp: 0, maxHp: 10 })
      expect(component.formatHP(char)).toBe('0/10')
    })
  })

  describe('getActionsForCharacter', () => {
    it('returns static actions array when actions is an array', () => {
      const actions = [{ type: 'inspect' }, { type: 'cast-spell' }]
      component.actions = actions
      const char = createTestCharacter()
      expect(component.getActionsForCharacter(char)).toBe(actions)
    })

    it('returns function result when actions is a function', () => {
      const inspectOnly = [{ type: 'inspect' }]
      const withCast = [{ type: 'inspect' }, { type: 'cast-spell' }]

      component.actions = (char: Character) => {
        return char.class === CharacterClass.MAGE ? withCast : inspectOnly
      }

      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER })
      const mage = createTestCharacter({ class: CharacterClass.MAGE })

      expect(component.getActionsForCharacter(fighter)).toEqual(inspectOnly)
      expect(component.getActionsForCharacter(mage)).toEqual(withCast)
    })
  })

  describe('getActionIcon', () => {
    it('returns I for inspect', () => {
      expect(component.getActionIcon('inspect')).toBe('I')
    })

    it('returns C for cast-spell', () => {
      expect(component.getActionIcon('cast-spell')).toBe('C')
    })

    it('returns up arrow for moveUp', () => {
      expect(component.getActionIcon('moveUp')).toBe('↑')
    })

    it('returns down arrow for moveDown', () => {
      expect(component.getActionIcon('moveDown')).toBe('↓')
    })

    it('returns first char uppercase for unknown action', () => {
      expect(component.getActionIcon('custom')).toBe('C')
      expect(component.getActionIcon('attack')).toBe('A')
    })
  })

  describe('getActionTooltip', () => {
    it('returns tooltip for inspect', () => {
      expect(component.getActionTooltip('inspect')).toBe('Inspect character')
    })

    it('returns tooltip for cast-spell', () => {
      expect(component.getActionTooltip('cast-spell')).toBe('Cast spell')
    })

    it('returns tooltip for moveUp', () => {
      expect(component.getActionTooltip('moveUp')).toBe('Move to front row')
    })

    it('returns tooltip for moveDown', () => {
      expect(component.getActionTooltip('moveDown')).toBe('Move to back row')
    })

    it('returns action type for unknown', () => {
      expect(component.getActionTooltip('custom-action')).toBe('custom-action')
    })
  })

  describe('onActionClick', () => {
    it('emits event with characterId and actionType', () => {
      const emitSpy = jest.spyOn(component.actionClick, 'emit')
      const char = createTestCharacter({ id: 'test-char-456' })

      component.onActionClick(char, 'inspect')

      expect(emitSpy).toHaveBeenCalledWith({
        characterId: 'test-char-456',
        actionType: 'inspect'
      })
    })
  })

  describe('isIncapacitated', () => {
    it('returns true for DEAD', () => {
      const char = createTestCharacter({ status: CharacterStatus.DEAD })
      expect(component.isIncapacitated(char)).toBe(true)
    })

    it('returns true for ASHES', () => {
      const char = createTestCharacter({ status: CharacterStatus.ASHES })
      expect(component.isIncapacitated(char)).toBe(true)
    })

    it('returns true for LOST', () => {
      const char = createTestCharacter({ status: CharacterStatus.LOST })
      expect(component.isIncapacitated(char)).toBe(true)
    })

    it('returns false for OK', () => {
      const char = createTestCharacter({ status: CharacterStatus.OK })
      expect(component.isIncapacitated(char)).toBe(false)
    })

    it('returns false for POISONED', () => {
      const char = createTestCharacter({ status: CharacterStatus.POISONED })
      expect(component.isIncapacitated(char)).toBe(false)
    })
  })

  describe('computed signals', () => {
    it('frontRowCharacters returns characters from front row', () => {
      const char1 = createTestCharacter({ id: 'char1', name: 'Fighter1' })
      const char2 = createTestCharacter({ id: 'char2', name: 'Fighter2' })

      const state = createTestGameState({
        roster: new Map([
          ['char1', char1],
          ['char2', char2]
        ]),
        party: {
          members: ['char1', 'char2'],
          formation: {
            frontRow: ['char1', 'char2'],
            backRow: []
          },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0
        }
      })

      mockGameStateService.state.set(state)

      const frontRow = component.frontRowCharacters()
      expect(frontRow).toHaveLength(2)
      expect(frontRow[0].id).toBe('char1')
      expect(frontRow[1].id).toBe('char2')
    })

    it('backRowCharacters returns characters from back row', () => {
      const char1 = createTestCharacter({ id: 'char1', name: 'Mage1' })
      const char2 = createTestCharacter({ id: 'char2', name: 'Priest1' })

      const state = createTestGameState({
        roster: new Map([
          ['char1', char1],
          ['char2', char2]
        ]),
        party: {
          members: ['char1', 'char2'],
          formation: {
            frontRow: [],
            backRow: ['char1', 'char2']
          },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0
        }
      })

      mockGameStateService.state.set(state)

      const backRow = component.backRowCharacters()
      expect(backRow).toHaveLength(2)
      expect(backRow[0].id).toBe('char1')
      expect(backRow[1].id).toBe('char2')
    })

    it('isPartyEmpty returns true when no characters', () => {
      const state = createTestGameState({
        roster: new Map(),
        party: {
          members: [],
          formation: {
            frontRow: [],
            backRow: []
          },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0
        }
      })

      mockGameStateService.state.set(state)

      expect(component.isPartyEmpty()).toBe(true)
    })

    it('isPartyEmpty returns false when party has characters', () => {
      const char1 = createTestCharacter({ id: 'char1' })

      const state = createTestGameState({
        roster: new Map([['char1', char1]]),
        party: {
          members: ['char1'],
          formation: {
            frontRow: ['char1'],
            backRow: []
          },
          position: { level: 1, x: 0, y: 0, facing: 'NORTH' },
          light: false,
          gold: 0
        }
      })

      mockGameStateService.state.set(state)

      expect(component.isPartyEmpty()).toBe(false)
    })
  })
})
