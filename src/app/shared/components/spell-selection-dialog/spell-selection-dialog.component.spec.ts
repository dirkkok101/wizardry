import { ComponentFixture, TestBed } from '@angular/core/testing'
import { SpellSelectionDialogComponent, SpellOption } from './spell-selection-dialog.component'
import { createTestCharacter } from '@testing/test-factories'
import { SpellData } from '@services/SpellCastingService'

describe('SpellSelectionDialogComponent', () => {
  let component: SpellSelectionDialogComponent
  let fixture: ComponentFixture<SpellSelectionDialogComponent>

  // Helper to create a test spell
  const createTestSpell = (overrides: Partial<SpellData> = {}): SpellData => ({
    id: 'test_spell',
    name: 'Test Spell',
    level: 1,
    casterType: 'mage',
    category: 'healing',
    target: 'single',
    description: 'Test description',
    castableIn: ['dungeon'],
    ...overrides
  })

  // Helper to create a spell option
  const createSpellOption = (overrides: Partial<SpellOption> = {}): SpellOption => ({
    spell: createTestSpell(),
    index: 1,
    enabled: true,
    spellPoints: { current: 3, max: 5 },
    ...overrides
  })

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpellSelectionDialogComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(SpellSelectionDialogComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  describe('visibility', () => {
    it('shows dialog when visible=true', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('spells', [createSpellOption()])
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-overlay')).toBeTruthy()
    })

    it('hides dialog when visible=false', () => {
      fixture.componentRef.setInput('visible', false)
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-overlay')).toBeFalsy()
    })

    it('dialog overlay has tabindex for focus', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('spells', [createSpellOption()])
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const overlay = compiled.querySelector('.dialog-overlay')
      expect(overlay.getAttribute('tabindex')).toBe('0')
    })
  })

  describe('spell display', () => {
    it('displays spell name and level', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('spells', [createSpellOption({
        spell: createTestSpell({ name: 'DIOS', level: 1 })
      })])
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-name').textContent).toContain('DIOS')
      expect(compiled.querySelector('.spell-level').textContent).toContain('Lv1')
    })

    it('displays spell points', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('spells', [createSpellOption({
        spellPoints: { current: 2, max: 5 }
      })])
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.sp-value').textContent).toContain('2/5')
    })

    it('shows caster name when provided', () => {
      const caster = createTestCharacter({ name: 'Gandalf' })
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('caster', caster)
      fixture.componentRef.setInput('spells', [createSpellOption()])
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.caster-name').textContent).toContain('Gandalf')
    })

    it('shows custom prompt', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('prompt', 'SELECT HEALING SPELL')
      fixture.componentRef.setInput('spells', [createSpellOption()])
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-header h2').textContent).toContain('SELECT HEALING SPELL')
    })

    it('shows no spells message when empty', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('spells', [])
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.no-spells').textContent).toContain('No spells available')
    })

    it('marks disabled spells visually', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('spells', [createSpellOption({ enabled: false })])
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      // SelectionListComponent uses .selection-item.disabled
      expect(compiled.querySelector('.selection-item.disabled')).toBeTruthy()
    })
  })

  describe('spell effect descriptions', () => {
    it('shows healing effect', () => {
      const spell = createTestSpell({
        healing: { dice: '1d8', type: 'normal' }
      })

      const effect = component.getSpellEffect(spell)

      expect(effect).toBe('Heal 1d8')
    })

    it('shows damage effect', () => {
      const spell = createTestSpell({
        damage: { dice: '2d6', type: 'fire' }
      })

      const effect = component.getSpellEffect(spell)

      expect(effect).toBe('2d6 fire')
    })

    it('shows status cure effect', () => {
      const spell = createTestSpell({
        statusCure: 'poison'
      })

      const effect = component.getSpellEffect(spell)

      expect(effect).toBe('Cure poison')
    })

    it('shows utility effect', () => {
      const spell = createTestSpell({
        utility: 'extended_light'
      })

      const effect = component.getSpellEffect(spell)

      expect(effect).toBe('Light')
    })

    it('shows resurrection effect', () => {
      const spell = createTestSpell({
        resurrection: true,
        resurrectionSuccessRate: 0.9
      })

      const effect = component.getSpellEffect(spell)

      expect(effect).toBe('Resurrect (90%)')
    })

    it('shows AC modifier effect', () => {
      const spell = createTestSpell({
        acModifier: -2
      })

      const effect = component.getSpellEffect(spell)

      expect(effect).toBe('AC -2')
    })

    it('falls back to description', () => {
      const spell = createTestSpell({
        description: 'Mystery spell'
      })

      const effect = component.getSpellEffect(spell)

      expect(effect).toBe('Mystery spell')
    })
  })

  describe('target descriptions', () => {
    it('returns Single for single target', () => {
      const spell = createTestSpell({ target: 'single' })
      expect(component.getTargetDescription(spell)).toBe('Single')
    })

    it('returns Party for party target', () => {
      const spell = createTestSpell({ target: 'party' })
      expect(component.getTargetDescription(spell)).toBe('Party')
    })

    it('returns Self for self target', () => {
      const spell = createTestSpell({ target: 'self' })
      expect(component.getTargetDescription(spell)).toBe('Self')
    })

    it('returns Dead for dead_body target', () => {
      const spell = createTestSpell({ target: 'dead_body' })
      expect(component.getTargetDescription(spell)).toBe('Dead')
    })
  })

  describe('caster type badge', () => {
    it('returns M for mage spells', () => {
      const spell = createTestSpell({ casterType: 'mage' })
      expect(component.getCasterTypeBadge(spell)).toBe('M')
    })

    it('returns P for priest spells', () => {
      const spell = createTestSpell({ casterType: 'priest' })
      expect(component.getCasterTypeBadge(spell)).toBe('P')
    })
  })

  describe('keyboard interaction', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('spells', [
        createSpellOption({ index: 1, spell: createTestSpell({ id: 'spell1' }) }),
        createSpellOption({ index: 2, spell: createTestSpell({ id: 'spell2' }) }),
        createSpellOption({ index: 3, enabled: false, spell: createTestSpell({ id: 'spell3' }) })
      ])
      fixture.detectChanges()
    })

    it('selects spell when pressing number key', () => {
      const spy = jest.spyOn(component.spellSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'spell1' })
      )
    })

    it('does not select disabled spell on key press', () => {
      const spy = jest.spyOn(component.spellSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }))
      fixture.detectChanges()

      expect(spy).not.toHaveBeenCalled()
    })

    it('does not select spell for invalid index', () => {
      const spy = jest.spyOn(component.spellSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }))
      fixture.detectChanges()

      expect(spy).not.toHaveBeenCalled()
    })

    it('cancels on Escape key', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalled()
    })

    it('ignores key events when not visible', () => {
      fixture.componentRef.setInput('visible', false)
      fixture.detectChanges()

      const spellSpy = jest.spyOn(component.spellSelected, 'emit')
      const cancelSpy = jest.spyOn(component.cancelled, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      fixture.detectChanges()

      expect(spellSpy).not.toHaveBeenCalled()
      expect(cancelSpy).not.toHaveBeenCalled()
    })
  })

  describe('click interaction', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('spells', [
        createSpellOption({ spell: createTestSpell({ id: 'spell1' }) }),
        createSpellOption({ index: 2, enabled: false, spell: createTestSpell({ id: 'spell2' }) })
      ])
      fixture.detectChanges()
    })

    it('selects spell when clicking enabled spell', () => {
      const spy = jest.spyOn(component.spellSelected, 'emit')

      // SelectionListComponent uses .selection-item
      const items = fixture.nativeElement.querySelectorAll('.selection-item')
      items[0].click()
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'spell1' }))
    })

    it('does not select spell when clicking disabled spell', () => {
      const spy = jest.spyOn(component.spellSelected, 'emit')

      const items = fixture.nativeElement.querySelectorAll('.selection-item')
      items[1].click()
      fixture.detectChanges()

      expect(spy).not.toHaveBeenCalled()
    })

    it('cancels when clicking backdrop', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      overlay.click()
      fixture.detectChanges()

      expect(spy).toHaveBeenCalled()
    })

    it('does not cancel when clicking dialog content', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      const content = fixture.nativeElement.querySelector('.dialog-content')
      content.click()
      fixture.detectChanges()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('computed signals', () => {
    it('should convert spells to selectable options with shortcuts', () => {
      fixture.componentRef.setInput('spells', [
        createSpellOption({ index: 1, spell: createTestSpell({ id: 'spell1' }) }),
        createSpellOption({ index: 2, spell: createTestSpell({ id: 'spell2' }) })
      ])
      fixture.detectChanges()

      const selectableSpells = component.selectableSpells()

      expect(selectableSpells.length).toBe(2)
      expect(selectableSpells[0].shortcut).toBe('1')
      expect(selectableSpells[0].id).toBe('spell1')
      expect(selectableSpells[1].shortcut).toBe('2')
      expect(selectableSpells[1].id).toBe('spell2')
    })
  })

  describe('option selection handler', () => {
    it('should emit spell when option selected', () => {
      const spy = jest.spyOn(component.spellSelected, 'emit')
      const spell = createTestSpell({ id: 'test_spell' })

      component.onOptionSelected({
        spell,
        index: 1,
        enabled: true,
        spellPoints: { current: 3, max: 5 },
        id: 'test_spell',
        shortcut: '1'
      })

      expect(spy).toHaveBeenCalledWith(spell)
    })
  })

  describe('cancellation handler', () => {
    it('should emit cancelled when onCancelled called', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      component.onCancelled()

      expect(spy).toHaveBeenCalled()
    })
  })
})
