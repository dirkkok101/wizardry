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
  })

  describe('visibility', () => {
    it('shows dialog when visible=true', () => {
      component.visible = true
      component.spells = [createSpellOption()]
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-overlay')).toBeTruthy()
    })

    it('hides dialog when visible=false', () => {
      component.visible = false
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-overlay')).toBeFalsy()
    })

    it('auto-focuses dialog when visible', () => {
      component.visible = true
      component.spells = [createSpellOption()]
      fixture.detectChanges()

      component.ngAfterViewChecked()

      const compiled = fixture.nativeElement
      const overlay = compiled.querySelector('.dialog-overlay')
      expect(overlay.getAttribute('tabindex')).toBe('0')
      expect(component['hasFocused']).toBe(true)
    })

    it('resets hasFocused flag when dialog becomes invisible', () => {
      component.visible = true
      fixture.detectChanges()
      component.ngAfterViewChecked()

      expect(component['hasFocused']).toBe(true)

      component.visible = false
      component.ngAfterViewChecked()

      expect(component['hasFocused']).toBe(false)
    })
  })

  describe('spell display', () => {
    it('displays spell name and level', () => {
      component.visible = true
      component.spells = [createSpellOption({
        spell: createTestSpell({ name: 'DIOS', level: 1 })
      })]
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-name').textContent).toContain('DIOS')
      expect(compiled.querySelector('.spell-level').textContent).toContain('Lv1')
    })

    it('displays spell points', () => {
      component.visible = true
      component.spells = [createSpellOption({
        spellPoints: { current: 2, max: 5 }
      })]
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.sp-value').textContent).toContain('2/5')
    })

    it('shows caster name when provided', () => {
      const caster = createTestCharacter({ name: 'Gandalf' })
      component.visible = true
      component.caster = caster
      component.spells = [createSpellOption()]
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.caster-name').textContent).toContain('Gandalf')
    })

    it('shows custom prompt', () => {
      component.visible = true
      component.prompt = 'SELECT HEALING SPELL'
      component.spells = [createSpellOption()]
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-header h2').textContent).toContain('SELECT HEALING SPELL')
    })

    it('shows no spells message when empty', () => {
      component.visible = true
      component.spells = []
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.no-spells').textContent).toContain('No spells available')
    })

    it('marks disabled spells visually', () => {
      component.visible = true
      component.spells = [createSpellOption({ enabled: false })]
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-item.disabled')).toBeTruthy()
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
      component.visible = true
      component.spells = [
        createSpellOption({ index: 1, spell: createTestSpell({ id: 'spell1' }) }),
        createSpellOption({ index: 2, spell: createTestSpell({ id: 'spell2' }) }),
        createSpellOption({ index: 3, enabled: false, spell: createTestSpell({ id: 'spell3' }) })
      ]
      fixture.detectChanges()
    })

    it('selects spell when pressing number key', () => {
      jest.spyOn(component.spellSelected, 'emit')

      const event = new KeyboardEvent('keydown', { key: '1', bubbles: true })
      jest.spyOn(event, 'preventDefault')
      jest.spyOn(event, 'stopPropagation')

      component.handleKeyPress(event)

      expect(component.spellSelected.emit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'spell1' })
      )
      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('does not select disabled spell on key press', () => {
      jest.spyOn(component.spellSelected, 'emit')

      const event = new KeyboardEvent('keydown', { key: '3', bubbles: true })
      jest.spyOn(event, 'preventDefault')

      component.handleKeyPress(event)

      expect(component.spellSelected.emit).not.toHaveBeenCalled()
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('does not select spell for invalid index', () => {
      jest.spyOn(component.spellSelected, 'emit')

      const event = new KeyboardEvent('keydown', { key: '9', bubbles: true })
      jest.spyOn(event, 'preventDefault')

      component.handleKeyPress(event)

      expect(component.spellSelected.emit).not.toHaveBeenCalled()
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('cancels on Escape key', () => {
      jest.spyOn(component.cancelled, 'emit')

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      jest.spyOn(event, 'stopPropagation')

      component.handleKeyPress(event)

      expect(component.cancelled.emit).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('ignores key events when not visible', () => {
      component.visible = false
      jest.spyOn(component.spellSelected, 'emit')
      jest.spyOn(component.cancelled, 'emit')

      const event1 = new KeyboardEvent('keydown', { key: '1', bubbles: true })
      component.handleKeyPress(event1)

      const event2 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      component.handleKeyPress(event2)

      expect(component.spellSelected.emit).not.toHaveBeenCalled()
      expect(component.cancelled.emit).not.toHaveBeenCalled()
    })

    it('prevents propagation for unhandled keys', () => {
      const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true })
      jest.spyOn(event, 'preventDefault')
      jest.spyOn(event, 'stopPropagation')

      component.handleKeyPress(event)

      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('click interaction', () => {
    beforeEach(() => {
      component.visible = true
      component.spells = [
        createSpellOption({ spell: createTestSpell({ id: 'spell1' }) }),
        createSpellOption({ enabled: false, spell: createTestSpell({ id: 'spell2' }) })
      ]
      fixture.detectChanges()
    })

    it('selects spell when clicking enabled spell', () => {
      jest.spyOn(component.spellSelected, 'emit')

      const option = component.spells[0]
      component.onSpellClick(option)

      expect(component.spellSelected.emit).toHaveBeenCalledWith(option.spell)
    })

    it('does not select spell when clicking disabled spell', () => {
      jest.spyOn(component.spellSelected, 'emit')

      const option = component.spells[1]
      component.onSpellClick(option)

      expect(component.spellSelected.emit).not.toHaveBeenCalled()
    })

    it('cancels when clicking backdrop', () => {
      jest.spyOn(component.cancelled, 'emit')

      component.onBackdropClick()

      expect(component.cancelled.emit).toHaveBeenCalled()
    })

    it('prevents backdrop click when clicking dialog content', () => {
      const event = new Event('click', { bubbles: true })
      jest.spyOn(event, 'stopPropagation')

      component.onDialogClick(event)

      expect(event.stopPropagation).toHaveBeenCalled()
    })
  })
})
