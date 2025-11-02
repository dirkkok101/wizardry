// src/app/__tests__/integration/character-creation.integration.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { CharacterCreationComponent } from '../../character-creation/character-creation.component'
import { GameStateService } from '../../../services/GameStateService'
import { Race } from '../../../types/Race'
import { Alignment } from '../../../types/Alignment'
import { CharacterClass } from '../../../types/CharacterClass'
import { CharacterStatus } from '../../../types/CharacterStatus'
import { RaceService } from '../../../services/RaceService'
import { ClassService } from '../../../services/ClassService'

// Mock race data for testing
const mockRaceData = {
  human: { id: 'human', name: 'Human', baseStats: { strength: 8, intelligence: 8, piety: 8, vitality: 8, agility: 8, luck: 8 }, savingThrowBonus: {}, statTotal: 48, description: 'Versatile', strengths: ['Balanced'], weaknesses: ['None'], bestClasses: ['Any'] },
  elf: { id: 'elf', name: 'Elf', baseStats: { strength: 7, intelligence: 9, piety: 9, vitality: 6, agility: 9, luck: 8 }, savingThrowBonus: {}, statTotal: 48, description: 'Magical', strengths: ['INT', 'PIE'], weaknesses: ['VIT'], bestClasses: ['Mage', 'Priest'] },
  dwarf: { id: 'dwarf', name: 'Dwarf', baseStats: { strength: 10, intelligence: 7, piety: 8, vitality: 10, agility: 7, luck: 8 }, savingThrowBonus: {}, statTotal: 50, description: 'Tough', strengths: ['STR', 'VIT'], weaknesses: ['AGI'], bestClasses: ['Fighter'] },
  gnome: { id: 'gnome', name: 'Gnome', baseStats: { strength: 7, intelligence: 7, piety: 10, vitality: 8, agility: 10, luck: 7 }, savingThrowBonus: {}, statTotal: 49, description: 'Clever', strengths: ['Balanced'], weaknesses: ['STR'], bestClasses: ['Thief', 'Mage'] },
  hobbit: { id: 'hobbit', name: 'Hobbit', baseStats: { strength: 5, intelligence: 7, piety: 6, vitality: 6, agility: 10, luck: 12 }, savingThrowBonus: {}, statTotal: 46, description: 'Lucky', strengths: ['LUC', 'AGI'], weaknesses: ['STR', 'VIT'], bestClasses: ['Thief'] }
}

// Mock class data for testing
const mockClassData = {
  fighter: { id: 'fighter', name: 'Fighter', description: 'Warrior', requirements: { str: 11 }, alignmentRestrictions: [], equipmentRestrictions: { weapons: ['all'], armor: ['all'], shields: ['all'], helmets: ['all'] }, hitDice: '1d10', spellAccess: null, attacksPerLevel: { '1+': 1 }, xpTable: [2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 900000, 1300000], specialAbilities: [], canIdentifyItems: false, canDispelUndead: false, canCriticalHit: true },
  mage: { id: 'mage', name: 'Mage', description: 'Wizard', requirements: {}, alignmentRestrictions: [], equipmentRestrictions: { weapons: ['dagger', 'staff'], armor: ['robes'], shields: [], helmets: [] }, hitDice: '1d4', spellAccess: { mage: { minLevel: 1, maxLevel: 7 } }, attacksPerLevel: { '1+': 1 }, xpTable: [2400, 4800, 9600, 19200, 38400, 76800, 150000, 300000, 600000, 1080000, 1560000], specialAbilities: ['Cast mage spells'], canIdentifyItems: false, canDispelUndead: false, canCriticalHit: false },
  priest: { id: 'priest', name: 'Priest', description: 'Cleric', requirements: {}, alignmentRestrictions: [], equipmentRestrictions: { weapons: ['mace', 'staff', 'flail'], armor: ['all'], shields: ['all'], helmets: ['all'] }, hitDice: '1d8', spellAccess: { priest: { minLevel: 1, maxLevel: 7 } }, attacksPerLevel: { '1+': 1 }, xpTable: [2200, 4400, 8800, 17600, 35200, 70400, 137500, 275000, 550000, 990000, 1430000], specialAbilities: ['Cast priest spells'], canIdentifyItems: false, canDispelUndead: true, canCriticalHit: false },
  thief: { id: 'thief', name: 'Thief', description: 'Rogue', requirements: {}, alignmentRestrictions: [], equipmentRestrictions: { weapons: ['dagger', 'short-sword'], armor: ['leather'], shields: [], helmets: [] }, hitDice: '1d6', spellAccess: null, attacksPerLevel: { '1+': 1 }, xpTable: [1800, 3600, 7200, 14400, 28800, 57600, 112500, 225000, 450000, 810000, 1170000], specialAbilities: ['Pick locks'], canIdentifyItems: true, canDispelUndead: false, canCriticalHit: true },
  bishop: { id: 'bishop', name: 'Bishop', description: 'Dual caster', requirements: { int: 12, pie: 12 }, alignmentRestrictions: [], equipmentRestrictions: { weapons: ['mace', 'staff'], armor: ['robes'], shields: [], helmets: [] }, hitDice: '1d6', spellAccess: { mage: { minLevel: 1, maxLevel: 7 }, priest: { minLevel: 1, maxLevel: 7 } }, attacksPerLevel: { '1+': 1 }, xpTable: [2600, 5200, 10400, 20800, 41600, 83200, 162500, 325000, 650000, 1170000, 1690000], specialAbilities: ['Cast both spell types'], canIdentifyItems: true, canDispelUndead: true, canCriticalHit: false },
  samurai: { id: 'samurai', name: 'Samurai', description: 'Warrior-mage', requirements: { str: 15, int: 11, pie: 10, vit: 14, agi: 10 }, alignmentRestrictions: ['good'], equipmentRestrictions: { weapons: ['all'], armor: ['all'], shields: ['all'], helmets: ['all'] }, hitDice: '1d8', spellAccess: { mage: { minLevel: 4, maxLevel: 6 } }, attacksPerLevel: { '1+': 1 }, xpTable: [3000, 6000, 12000, 24000, 48000, 96000, 187500, 375000, 750000, 1350000, 1950000], specialAbilities: [], canIdentifyItems: false, canDispelUndead: false, canCriticalHit: true },
  lord: { id: 'lord', name: 'Lord', description: 'Holy warrior', requirements: { str: 15, int: 12, pie: 12, vit: 15, agi: 14 }, alignmentRestrictions: ['good'], equipmentRestrictions: { weapons: ['all'], armor: ['all'], shields: ['all'], helmets: ['all'] }, hitDice: '1d10', spellAccess: { priest: { minLevel: 3, maxLevel: 6 } }, attacksPerLevel: { '1+': 1 }, xpTable: [2800, 5600, 11200, 22400, 44800, 89600, 175000, 350000, 700000, 1260000, 1820000], specialAbilities: [], canIdentifyItems: false, canDispelUndead: true, canCriticalHit: true },
  ninja: { id: 'ninja', name: 'Ninja', description: 'Assassin', requirements: { str: 17, int: 17, pie: 17, vit: 17, agi: 17 }, alignmentRestrictions: ['evil'], equipmentRestrictions: { weapons: ['all'], armor: ['leather', 'chain'], shields: [], helmets: [] }, hitDice: '1d6', spellAccess: null, attacksPerLevel: { '1+': 2 }, xpTable: [3200, 6400, 12800, 25600, 51200, 102400, 200000, 400000, 800000, 1440000, 2080000], specialAbilities: ['Critical hit'], canIdentifyItems: true, canDispelUndead: false, canCriticalHit: true }
}

describe('Integration: Character Creation Flow', () => {
  let component: CharacterCreationComponent
  let fixture: ComponentFixture<CharacterCreationComponent>
  let gameState: GameStateService

  beforeAll(async () => {
    // Mock fetch for RaceService and ClassService
    global.fetch = jest.fn((url: string) => {
      const path = url.toString()

      for (const [key, data] of Object.entries(mockRaceData)) {
        if (path.includes(`/assets/races/${key}.json`)) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response)
        }
      }

      for (const [key, data] of Object.entries(mockClassData)) {
        if (path.includes(`/assets/classes/${key}.json`)) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response)
        }
      }

      return Promise.reject(new Error(`Not found: ${path}`))
    }) as jest.Mock

    await RaceService.initialize()
    await ClassService.initialize()
  })

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CharacterCreationComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            navigate: jest.fn()
          }
        }
      ]
    })

    fixture = TestBed.createComponent(CharacterCreationComponent)
    component = fixture.componentInstance
    gameState = TestBed.inject(GameStateService)

    component.ngOnInit()
  })

  it('completes full character creation wizard and adds to roster', () => {
    const initialRosterSize = gameState.state().roster.size

    // Step 1: Select race
    expect(component.currentStep()).toBe('RACE')
    component.selectRace(Race.HUMAN)

    expect(component.wizardState().selectedRace).toBe(Race.HUMAN)
    expect(component.currentStep()).toBe('ALIGNMENT')

    // Step 2: Select alignment
    component.selectAlignment(Alignment.GOOD)

    expect(component.wizardState().selectedAlignment).toBe(Alignment.GOOD)
    expect(component.currentStep()).toBe('STATS')

    // Step 3: Roll stats
    component.rollStats()

    expect(component.wizardState().rolledStats).toBeDefined()
    expect(component.wizardState().rolledStats!.bonusPoints).toBeGreaterThanOrEqual(7)

    // Step 4: Accept stats (advance to bonus allocation)
    component.acceptStats()

    expect(component.currentStep()).toBe('BONUS_POINTS')

    // Step 5: Allocate bonus points
    const bonusPoints = component.getAvailableBonusPoints()
    if (bonusPoints > 0) {
      component.allocateBonusPoint('strength', Math.min(bonusPoints, 5))
    }

    component.finishBonusAllocation()

    expect(component.currentStep()).toBe('CLASS')

    // Step 6: Select class
    const eligibleClasses = component.getEligibleClasses()
    expect(eligibleClasses.length).toBeGreaterThan(0)

    component.selectClass(eligibleClasses[0])

    expect(component.currentStep()).toBe('NAME_PASSWORD')

    // Step 7: Enter name and password
    component.setName('Gandalf')
    component.setPassword('wizard')

    component.finishNamePassword()

    expect(component.currentStep()).toBe('CONFIRM')

    // Step 8: Confirm character creation
    component.confirmCharacterCreation()

    // Verify character added to roster
    const finalRosterSize = gameState.state().roster.size
    expect(finalRosterSize).toBe(initialRosterSize + 1)

    // Verify character properties
    const roster = gameState.state().roster
    const gandalf = Array.from(roster.values()).find(c => c.name === 'Gandalf')

    expect(gandalf).toBeDefined()
    expect(gandalf!.race).toBe(Race.HUMAN)
    expect(gandalf!.alignment).toBe(Alignment.GOOD)
    expect(gandalf!.level).toBe(1)
    expect(gandalf!.status).toBe(CharacterStatus.OK)
    expect(gandalf!.class).toBe(eligibleClasses[0])

    // Verify success message shown
    expect(component.successMessage()).toContain('Gandalf')
    expect(component.successMessage()).toContain('created successfully')
  })

  it.skip('persists characters across wizard resets', async () => {
    // Create first character
    component.selectRace(Race.ELF)
    component.selectAlignment(Alignment.GOOD)
    component.rollStats()
    component.acceptStats()
    if (component.getAvailableBonusPoints() > 0) {
      component.allocateBonusPoint('intelligence', Math.min(component.getAvailableBonusPoints(), 3))
    }
    component.finishBonusAllocation()
    const eligibleClasses1 = component.getEligibleClasses()
    component.selectClass(eligibleClasses1[0])
    component.setName('Legolas')
    component.setPassword('elf123') // Password must be 4-8 characters
    component.finishNamePassword()
    component.confirmCharacterCreation()
    await fixture.whenStable()
    fixture.detectChanges()
    await fixture.whenStable()

    // Verify first character created and wizard reset
    const rosterAfterFirst = gameState.state().roster
    const legolas = Array.from(rosterAfterFirst.values()).find(c => c.name === 'Legolas')

    expect(legolas).toBeDefined()
    expect(legolas!.race).toBe(Race.ELF)
    expect(component.currentStep()).toBe('RACE') // Wizard should reset

    // Create second character
    component.selectRace(Race.DWARF)
    component.selectAlignment(Alignment.NEUTRAL)
    component.rollStats()
    component.acceptStats()
    if (component.getAvailableBonusPoints() > 0) {
      component.allocateBonusPoint('vitality', Math.min(component.getAvailableBonusPoints(), 3))
    }
    component.finishBonusAllocation()
    const eligibleClasses2 = component.getEligibleClasses()
    component.selectClass(eligibleClasses2[0])
    component.setName('Gimli')
    component.setPassword('dwarf123') // Password must be 4-8 characters
    component.finishNamePassword()
    component.confirmCharacterCreation()
    await fixture.whenStable()
    fixture.detectChanges()
    await fixture.whenStable()

    // Verify both characters in roster
    const finalRoster = gameState.state().roster
    const finalLegolas = Array.from(finalRoster.values()).find(c => c.name === 'Legolas')
    const gimli = Array.from(finalRoster.values()).find(c => c.name === 'Gimli')

    expect(finalLegolas).toBeDefined()
    expect(gimli).toBeDefined()
    expect(finalLegolas!.race).toBe(Race.ELF)
    expect(gimli!.race).toBe(Race.DWARF)
    expect(finalRoster.size).toBe(2)
  })
})
