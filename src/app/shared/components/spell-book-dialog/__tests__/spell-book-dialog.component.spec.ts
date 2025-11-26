import { ComponentFixture, TestBed } from '@angular/core/testing'
import { SpellBookDialogComponent } from '../spell-book-dialog.component'
import { SpellDataLoader } from '@services/SpellDataLoader'
import { createTestCharacter } from '@testing/test-factories'
import { Character } from '@types/Character'

describe('SpellBookDialogComponent', () => {
  let component: SpellBookDialogComponent
  let fixture: ComponentFixture<SpellBookDialogComponent>

  const mockMageSpell = {
    id: 'halito',
    name: 'HALITO',
    level: 1,
    casterType: 'mage' as const,
    category: 'damage',
    target: 'single',
    description: 'Little fire',
    castableIn: ['dungeon', 'combat']
  }

  const mockPriestSpell = {
    id: 'dios',
    name: 'DIOS',
    level: 1,
    casterType: 'priest' as const,
    category: 'healing',
    target: 'single',
    description: 'Minor healing',
    castableIn: ['dungeon', 'combat']
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpellBookDialogComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(SpellBookDialogComponent)
    component = fixture.componentInstance

    // Mock SpellDataLoader.getSpell
    jest.spyOn(SpellDataLoader, 'getSpell').mockImplementation((id: string) => {
      if (id === 'halito') return mockMageSpell as any
      if (id === 'dios') return mockPriestSpell as any
      return null
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('creates component', () => {
    expect(component).toBeTruthy()
  })

  describe('visibility', () => {
    it('shows dialog when visible=true and character exists', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-overlay')).toBeTruthy()
    })

    it('hides dialog when visible=false', () => {
      component.visible = false
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-overlay')).toBeFalsy()
    })

    it('hides dialog when character is null', () => {
      component.visible = true
      component.character = null
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-overlay')).toBeFalsy()
    })
  })

  describe('accessibility', () => {
    it('has role="dialog" attribute', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const overlay = compiled.querySelector('.dialog-overlay')
      expect(overlay.getAttribute('role')).toBe('dialog')
    })

    it('has aria-modal="true" attribute', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const overlay = compiled.querySelector('.dialog-overlay')
      expect(overlay.getAttribute('aria-modal')).toBe('true')
    })

    it('has aria-labelledby pointing to title', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const overlay = compiled.querySelector('.dialog-overlay')
      expect(overlay.getAttribute('aria-labelledby')).toBe('spell-book-title')
      expect(compiled.querySelector('#spell-book-title')).toBeTruthy()
    })
  })

  describe('spell display', () => {
    it('shows character name in header', () => {
      component.visible = true
      component.character = createTestCharacter({ name: 'Gandalf', knownSpells: ['halito'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.dialog-header h2').textContent).toContain("Gandalf's Spell Book")
    })

    it('shows no spells message when character has no spells', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: [] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.no-spells').textContent).toContain('No spells learned yet')
    })

    it('displays mage spell section for mage spells', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-section.mage')).toBeTruthy()
      expect(compiled.querySelector('.spell-section.mage .section-title').textContent).toContain('Mage Spells')
    })

    it('displays priest spell section for priest spells', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['dios'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-section.priest')).toBeTruthy()
      expect(compiled.querySelector('.spell-section.priest .section-title').textContent).toContain('Priest Spells')
    })

    it('displays both sections for hybrid caster', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito', 'dios'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-section.mage')).toBeTruthy()
      expect(compiled.querySelector('.spell-section.priest')).toBeTruthy()
    })

    it('displays spell name and description', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      expect(compiled.querySelector('.spell-name').textContent).toContain('HALITO')
      expect(compiled.querySelector('.spell-desc').textContent).toContain('Little fire')
    })
  })

  describe('spell grouping', () => {
    it('groups spells by level', () => {
      const level2Mage = {
        id: 'mahalito',
        name: 'MAHALITO',
        level: 2,
        casterType: 'mage' as const,
        category: 'damage',
        target: 'group',
        description: 'Big fire',
        castableIn: ['combat']
      }

      jest.spyOn(SpellDataLoader, 'getSpell').mockImplementation((id: string) => {
        if (id === 'halito') return mockMageSpell as any
        if (id === 'mahalito') return level2Mage as any
        return null
      })

      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito', 'mahalito'] })
      fixture.detectChanges()

      const compiled = fixture.nativeElement
      const levelGroups = compiled.querySelectorAll('.spell-level')
      expect(levelGroups.length).toBe(2)
    })

    it('sorts spells by caster type (mage first), then level', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['dios', 'halito'] })

      const entries = component.spellEntries

      expect(entries[0].casterType).toBe('mage')
      expect(entries[1].casterType).toBe('priest')
    })
  })

  describe('keyboard interaction', () => {
    beforeEach(() => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()
    })

    it('closes on Escape key', () => {
      jest.spyOn(component.closed, 'emit')

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      jest.spyOn(event, 'preventDefault')
      jest.spyOn(event, 'stopPropagation')

      component.handleKeyPress(event)

      expect(component.closed.emit).toHaveBeenCalled()
      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
    })

    it('closes on Enter key', () => {
      jest.spyOn(component.closed, 'emit')

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      jest.spyOn(event, 'preventDefault')

      component.handleKeyPress(event)

      expect(component.closed.emit).toHaveBeenCalled()
    })

    it('closes on Space key', () => {
      jest.spyOn(component.closed, 'emit')

      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      jest.spyOn(event, 'preventDefault')

      component.handleKeyPress(event)

      expect(component.closed.emit).toHaveBeenCalled()
    })

    it('ignores key events when not visible', () => {
      component.visible = false
      jest.spyOn(component.closed, 'emit')

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      component.handleKeyPress(event)

      expect(component.closed.emit).not.toHaveBeenCalled()
    })
  })

  describe('click interaction', () => {
    beforeEach(() => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()
    })

    it('closes when clicking backdrop', () => {
      jest.spyOn(component.closed, 'emit')

      component.onBackdropClick()

      expect(component.closed.emit).toHaveBeenCalled()
    })

    it('prevents backdrop click when clicking dialog content', () => {
      const event = new Event('click', { bubbles: true })
      jest.spyOn(event, 'stopPropagation')

      component.onDialogClick(event)

      expect(event.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('auto-focus', () => {
    it('focuses dialog when becoming visible', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()

      component.ngAfterViewChecked()

      expect(component['hasFocused']).toBe(true)
    })

    it('resets hasFocused flag when dialog becomes invisible', () => {
      component.visible = true
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      fixture.detectChanges()
      component.ngAfterViewChecked()

      expect(component['hasFocused']).toBe(true)

      component.visible = false
      component.ngAfterViewChecked()

      expect(component['hasFocused']).toBe(false)
    })
  })

  describe('helper methods', () => {
    it('hasMageSpells returns true when mage spells exist', () => {
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      expect(component.hasMageSpells).toBe(true)
    })

    it('hasMageSpells returns false when no mage spells', () => {
      component.character = createTestCharacter({ knownSpells: ['dios'] })
      expect(component.hasMageSpells).toBe(false)
    })

    it('hasPriestSpells returns true when priest spells exist', () => {
      component.character = createTestCharacter({ knownSpells: ['dios'] })
      expect(component.hasPriestSpells).toBe(true)
    })

    it('hasAnySpells returns true when any spells exist', () => {
      component.character = createTestCharacter({ knownSpells: ['halito'] })
      expect(component.hasAnySpells).toBe(true)
    })

    it('hasAnySpells returns false when no spells', () => {
      component.character = createTestCharacter({ knownSpells: [] })
      expect(component.hasAnySpells).toBe(false)
    })
  })
})
