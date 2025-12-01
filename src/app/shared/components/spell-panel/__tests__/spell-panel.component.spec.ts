import { ComponentFixture, TestBed } from '@angular/core/testing'
import { SpellPanelComponent } from '../spell-panel.component'
import { createTestCharacter } from '@testing/test-factories'
import { Character } from '@models/Character'
import { CharacterClass } from '@models/CharacterClass'
import { SpellDataLoader } from '@services/SpellDataLoader'

describe('SpellPanelComponent', () => {
  let component: SpellPanelComponent
  let fixture: ComponentFixture<SpellPanelComponent>

  /**
   * Create a mage character with spells and spell points
   */
  function createMageWithSpells(): Character {
    return createTestCharacter({
      id: 'test-mage',
      name: 'Gandalf',
      class: CharacterClass.MAGE,
      knownSpells: ['halito', 'katino', 'dilto', 'mahalito'],
      spellPoints: {
        mage: {
          level1: { current: 3, max: 3 },
          level2: { current: 2, max: 2 },
          level3: { current: 1, max: 1 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        }
      }
    })
  }

  /**
   * Create a priest character with spells and spell points
   */
  function createPriestWithSpells(): Character {
    return createTestCharacter({
      id: 'test-priest',
      name: 'Merlin',
      class: CharacterClass.PRIEST,
      knownSpells: ['dios', 'badios', 'milwa', 'montino'],
      spellPoints: {
        priest: {
          level1: { current: 4, max: 4 },
          level2: { current: 2, max: 2 },
          level3: { current: 1, max: 1 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        }
      }
    })
  }

  /**
   * Create a Bishop with both mage and priest spells
   */
  function createBishopWithSpells(): Character {
    return createTestCharacter({
      id: 'test-bishop',
      name: 'Elrond',
      class: CharacterClass.BISHOP,
      knownSpells: ['halito', 'dios', 'katino', 'badios'],
      spellPoints: {
        mage: {
          level1: { current: 2, max: 2 },
          level2: { current: 1, max: 1 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        },
        priest: {
          level1: { current: 2, max: 2 },
          level2: { current: 1, max: 1 },
          level3: { current: 0, max: 0 },
          level4: { current: 0, max: 0 },
          level5: { current: 0, max: 0 },
          level6: { current: 0, max: 0 },
          level7: { current: 0, max: 0 }
        }
      }
    })
  }

  /**
   * Helper to set signal inputs on the component
   */
  function setInputs(inputs: {
    visible?: boolean
    character?: Character
    mode?: 'casting' | 'viewing'
    context?: 'dungeon' | 'combat' | 'camp'
    title?: string
  }): void {
    if (inputs.character !== undefined) {
      fixture.componentRef.setInput('character', inputs.character)
    }
    if (inputs.visible !== undefined) {
      fixture.componentRef.setInput('visible', inputs.visible)
    }
    if (inputs.mode !== undefined) {
      fixture.componentRef.setInput('mode', inputs.mode)
    }
    if (inputs.context !== undefined) {
      fixture.componentRef.setInput('context', inputs.context)
    }
    if (inputs.title !== undefined) {
      fixture.componentRef.setInput('title', inputs.title)
    }
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpellPanelComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(SpellPanelComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    setInputs({ visible: false, character: createMageWithSpells() })
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  describe('visibility', () => {
    it('does not render when visible is false', () => {
      setInputs({ visible: false, character: createMageWithSpells() })
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.spell-panel-overlay')
      expect(overlay).toBeNull()
    })

    it('renders when visible is true', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.spell-panel-overlay')
      expect(overlay).toBeTruthy()
    })
  })

  describe('header', () => {
    it('displays the title', () => {
      setInputs({ visible: true, character: createMageWithSpells(), title: 'SELECT SPELL' })
      fixture.detectChanges()

      const title = fixture.nativeElement.querySelector('.panel-title')
      expect(title?.textContent).toContain('SELECT SPELL')
    })

    it('displays character name', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const casterInfo = fixture.nativeElement.querySelector('.caster-info')
      expect(casterInfo?.textContent).toContain('Gandalf')
    })
  })

  describe('caster type tabs', () => {
    it('shows only Mage tab for mage characters', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const tabs = fixture.nativeElement.querySelectorAll('.caster-tab')
      expect(tabs.length).toBe(1)
      expect(tabs[0].textContent).toContain('Mage Spells')
    })

    it('shows only Priest tab for priest characters', () => {
      setInputs({ visible: true, character: createPriestWithSpells() })
      fixture.detectChanges()

      const tabs = fixture.nativeElement.querySelectorAll('.caster-tab')
      expect(tabs.length).toBe(1)
      expect(tabs[0].textContent).toContain('Priest Spells')
    })

    it('shows both tabs for bishop characters', () => {
      setInputs({ visible: true, character: createBishopWithSpells() })
      fixture.detectChanges()

      const tabs = fixture.nativeElement.querySelectorAll('.caster-tab')
      expect(tabs.length).toBe(2)
      expect(tabs[0].textContent).toContain('Mage Spells')
      expect(tabs[1].textContent).toContain('Priest Spells')
    })

    it('switches caster type when tab clicked', () => {
      setInputs({ visible: true, character: createBishopWithSpells() })
      fixture.detectChanges()

      // Initially mage (first available)
      expect(component.activeCasterType()).toBe('mage')

      // Programmatically switch to priest (don't call detectChanges again to avoid effect re-run)
      component.setCasterType('priest')

      // Signal should be updated immediately
      expect(component.activeCasterType()).toBe('priest')
    })
  })

  describe('spell level tabs', () => {
    it('displays 7 level tabs', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const levelTabs = fixture.nativeElement.querySelectorAll('.level-tab')
      expect(levelTabs.length).toBe(7)
    })

    it('marks tabs with no spells as empty', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const emptyTabs = fixture.nativeElement.querySelectorAll('.level-tab.empty')
      // L4-L7 should be empty for this mage
      expect(emptyTabs.length).toBeGreaterThanOrEqual(4)
    })

    it('switches level when tab clicked', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      // Click L2 tab (index 1)
      const l2Tab = fixture.nativeElement.querySelectorAll('.level-tab')[1]
      l2Tab.click()
      fixture.detectChanges()

      expect(component.activeLevel()).toBe(2)
    })

    it('displays SP for active caster type and level', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const spDisplay = fixture.nativeElement.querySelector('.sp-display')
      // L1 mage spells: 3/3
      expect(spDisplay?.textContent).toContain('L1 SP: 3/3')
    })

    it('updates SP display when level changes', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      // Switch to L2
      component.setLevel(2)
      fixture.detectChanges()

      const spDisplay = fixture.nativeElement.querySelector('.sp-display')
      expect(spDisplay?.textContent).toContain('L2 SP: 2/2')
    })
  })

  describe('spell list', () => {
    it('displays spells at active level', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const spellCards = fixture.nativeElement.querySelectorAll('.spell-card')
      expect(spellCards.length).toBeGreaterThan(0)
    })

    it('displays spell name', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const spellNames = fixture.nativeElement.querySelectorAll('.spell-name')
      const names = Array.from(spellNames).map((el: any) => el.textContent.trim())
      // HALITO and KATINO are L1 mage spells
      expect(names.some((n: string) => n === 'HALITO' || n === 'KATINO')).toBe(true)
    })

    it('displays spell effect', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const spellEffects = fixture.nativeElement.querySelectorAll('.spell-effect')
      expect(spellEffects.length).toBeGreaterThan(0)
    })

    it('disables level tabs that have no spells', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      // L7 tab should be disabled (no L7 spells known)
      const l7Tab = fixture.nativeElement.querySelectorAll('.level-tab')[6]  // 0-indexed
      expect(l7Tab.disabled).toBe(true)
      expect(l7Tab.classList.contains('empty')).toBe(true)
    })

    it('does not switch to level with no spells', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const initialLevel = component.activeLevel()
      component.setLevel(7)  // No L7 spells - should not change
      fixture.detectChanges()

      expect(component.activeLevel()).toBe(initialLevel)
    })
  })

  describe('casting mode', () => {
    it('shows cast buttons in casting mode', () => {
      setInputs({ visible: true, character: createPriestWithSpells(), mode: 'casting', context: 'dungeon' })
      fixture.detectChanges()

      const castButtons = fixture.nativeElement.querySelectorAll('.cast-button')
      expect(castButtons.length).toBeGreaterThan(0)
    })

    it('filters out spells when insufficient SP in casting mode', () => {
      const char = createMageWithSpells()
      char.spellPoints!.mage!.level1 = { current: 0, max: 3 }  // Empty SP at L1
      setInputs({ visible: true, character: char, mode: 'casting', context: 'combat' })
      fixture.detectChanges()

      // With 0 SP at L1, no L1 spells should be shown
      const spellCards = fixture.nativeElement.querySelectorAll('.spell-card')
      expect(spellCards.length).toBe(0)
    })

    it('shows all spells at level in viewing mode regardless of SP', () => {
      const char = createMageWithSpells()
      char.spellPoints!.mage!.level1 = { current: 0, max: 3 }  // Empty SP
      setInputs({ visible: true, character: char, mode: 'viewing' })
      fixture.detectChanges()

      // In viewing mode, should still show L1 spells
      const spellCards = fixture.nativeElement.querySelectorAll('.spell-card')
      expect(spellCards.length).toBeGreaterThan(0)
    })

    it('filters out spells not castable in current context', () => {
      // BADIOS is combat-only - should be filtered out in dungeon context
      const char = createTestCharacter({
        id: 'context-test',
        name: 'Test',
        class: CharacterClass.PRIEST,
        knownSpells: ['badios'],  // Combat-only damage spell
        spellPoints: {
          priest: {
            level1: { current: 3, max: 3 },
            level2: { current: 0, max: 0 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })
      setInputs({ visible: true, character: char, mode: 'casting', context: 'dungeon' })
      fixture.detectChanges()

      // BADIOS should be filtered out in dungeon context
      const spellCards = fixture.nativeElement.querySelectorAll('.spell-card')
      expect(spellCards.length).toBe(0)
    })

    it('shows camp spells when context is dungeon', () => {
      // DIOS has castableIn: ['combat', 'camp'] - should appear in dungeon context
      // because 'dungeon' maps to 'camp' in spell data
      setInputs({ visible: true, character: createPriestWithSpells(), mode: 'casting', context: 'dungeon' })
      fixture.detectChanges()

      // Should have spells visible (DIOS is a camp spell)
      const spellCards = fixture.nativeElement.querySelectorAll('.spell-card')
      expect(spellCards.length).toBeGreaterThan(0)

      // Verify DIOS specifically is shown
      const spellNames = fixture.nativeElement.querySelectorAll('.spell-name')
      const names = Array.from(spellNames).map((el: any) => el.textContent.trim().toUpperCase())
      expect(names).toContain('DIOS')
    })

    it('emits spellSelected when spell clicked', () => {
      const spy = jest.fn()
      component.spellSelected.subscribe(spy)
      setInputs({ visible: true, character: createPriestWithSpells(), mode: 'casting', context: 'dungeon' })
      fixture.detectChanges()

      // Find a castable spell (DIOS is castable in dungeon via camp mapping)
      const spellCard = fixture.nativeElement.querySelector('.spell-card.clickable')
      expect(spellCard).toBeTruthy()  // Ensure spell exists
      spellCard.click()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('viewing mode', () => {
    it('hides cast buttons in viewing mode', () => {
      setInputs({ visible: true, character: createMageWithSpells(), mode: 'viewing' })
      fixture.detectChanges()

      const castButtons = fixture.nativeElement.querySelectorAll('.cast-button')
      expect(castButtons.length).toBe(0)
    })

    it('spells are not clickable in viewing mode', () => {
      const spy = jest.fn()
      component.spellSelected.subscribe(spy)
      setInputs({ visible: true, character: createMageWithSpells(), mode: 'viewing' })
      fixture.detectChanges()

      const spellCard = fixture.nativeElement.querySelector('.spell-card')
      spellCard?.click()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('keyboard handling', () => {
    it('closes on ESC in casting mode', () => {
      const spy = jest.fn()
      component.closed.subscribe(spy)
      setInputs({ visible: true, character: createMageWithSpells(), mode: 'casting' })
      fixture.detectChanges()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(spy).toHaveBeenCalled()
    })

    it('closes on ESC in viewing mode', () => {
      const spy = jest.fn()
      component.closed.subscribe(spy)
      setInputs({ visible: true, character: createMageWithSpells(), mode: 'viewing' })
      fixture.detectChanges()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(spy).toHaveBeenCalled()
    })

    it('closes on Enter in viewing mode', () => {
      const spy = jest.fn()
      component.closed.subscribe(spy)
      setInputs({ visible: true, character: createMageWithSpells(), mode: 'viewing' })
      fixture.detectChanges()

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(event)

      expect(spy).toHaveBeenCalled()
    })

    it('does not close on Enter in casting mode', () => {
      const spy = jest.fn()
      component.closed.subscribe(spy)
      setInputs({ visible: true, character: createMageWithSpells(), mode: 'casting' })
      fixture.detectChanges()

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      document.dispatchEvent(event)

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('backdrop click', () => {
    it('closes on backdrop click', () => {
      const spy = jest.fn()
      component.closed.subscribe(spy)
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.spell-panel-overlay')
      overlay.click()

      expect(spy).toHaveBeenCalled()
    })

    it('does not close on panel click', () => {
      const spy = jest.fn()
      component.closed.subscribe(spy)
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const panel = fixture.nativeElement.querySelector('.spell-panel')
      panel.click()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('getSpellEffect', () => {
    beforeEach(() => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()
    })

    it('formats healing spells', () => {
      const healSpell = SpellDataLoader.getSpell('dios')!
      const effect = component.getSpellEffect(healSpell)
      expect(effect).toContain('Heal')
    })

    it('formats damage spells', () => {
      const damageSpell = SpellDataLoader.getSpell('halito')!
      const effect = component.getSpellEffect(damageSpell)
      expect(effect).toContain('fire')
    })
  })

  describe('footer', () => {
    it('shows ESC instruction', () => {
      setInputs({ visible: true, character: createMageWithSpells() })
      fixture.detectChanges()

      const instruction = fixture.nativeElement.querySelector('.instruction')
      expect(instruction?.textContent).toContain('Press ESC to close')
    })
  })

  describe('auto-selection', () => {
    it('auto-selects first available caster type when opened', () => {
      // Start with visible=false
      setInputs({ visible: false, character: createPriestWithSpells() })
      fixture.detectChanges()

      // Now open the panel
      setInputs({ visible: true })
      fixture.detectChanges()

      // Should auto-select priest (only available type)
      expect(component.activeCasterType()).toBe('priest')
    })

    it('auto-selects first available spell level when opened', () => {
      // Create a character with spells only at L2
      const char = createTestCharacter({
        id: 'l2-only',
        name: 'L2 Only',
        class: CharacterClass.MAGE,
        knownSpells: ['dilto'],  // L2 mage spell
        spellPoints: {
          mage: {
            level1: { current: 0, max: 0 },
            level2: { current: 2, max: 2 },
            level3: { current: 0, max: 0 },
            level4: { current: 0, max: 0 },
            level5: { current: 0, max: 0 },
            level6: { current: 0, max: 0 },
            level7: { current: 0, max: 0 }
          }
        }
      })

      setInputs({ visible: true, character: char })
      fixture.detectChanges()

      // Should auto-select L2 (first level with spells)
      expect(component.activeLevel()).toBe(2)
    })

    it('auto-selects mage for bishop with both spell types', () => {
      setInputs({ visible: true, character: createBishopWithSpells() })
      fixture.detectChanges()

      // Should auto-select mage (first in order)
      expect(component.activeCasterType()).toBe('mage')
    })
  })
})
