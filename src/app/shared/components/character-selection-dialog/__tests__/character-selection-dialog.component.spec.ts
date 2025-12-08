import { ComponentFixture, TestBed } from '@angular/core/testing'
import {
  CharacterSelectionDialogComponent,
  CharacterOption
} from '../character-selection-dialog.component'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'

describe('CharacterSelectionDialogComponent', () => {
  let component: CharacterSelectionDialogComponent
  let fixture: ComponentFixture<CharacterSelectionDialogComponent>

  /**
   * Create test character options
   */
  function createCharacterOptions(): CharacterOption[] {
    return [
      {
        character: createTestCharacter({
          id: 'char-1',
          name: 'Dirk',
          class: CharacterClass.FIGHTER,
          level: 1,
          hp: 3,
          maxHp: 4,
          status: CharacterStatus.OK
        }),
        index: 1,
        enabled: true
      },
      {
        character: createTestCharacter({
          id: 'char-2',
          name: 'Michael',
          class: CharacterClass.FIGHTER,
          level: 1,
          hp: 4,
          maxHp: 4,
          status: CharacterStatus.OK
        }),
        index: 2,
        enabled: true
      },
      {
        character: createTestCharacter({
          id: 'char-3',
          name: 'Fred',
          class: CharacterClass.THIEF,
          level: 1,
          hp: 5,
          maxHp: 5,
          status: CharacterStatus.OK
        }),
        index: 3,
        enabled: true
      }
    ]
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharacterSelectionDialogComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(CharacterSelectionDialogComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    fixture.componentRef.setInput('visible', false)
    fixture.componentRef.setInput('characters', [])
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  describe('visibility', () => {
    it('does not render when visible is false', () => {
      fixture.componentRef.setInput('visible', false)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      expect(overlay).toBeNull()
    })

    it('renders when visible is true', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      expect(overlay).toBeTruthy()
    })
  })

  describe('header', () => {
    it('displays the prompt', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.componentRef.setInput('prompt', 'SELECT TARGET')
      fixture.detectChanges()

      const title = fixture.nativeElement.querySelector('.panel-title')
      expect(title?.textContent).toContain('SELECT TARGET')
    })

    it('displays custom prompt', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.componentRef.setInput('prompt', 'HEAL WHO?')
      fixture.detectChanges()

      const title = fixture.nativeElement.querySelector('.panel-title')
      expect(title?.textContent).toContain('HEAL WHO?')
    })
  })

  describe('character cards (via CharacterPanel)', () => {
    it('displays character cards for each enabled option', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const cards = fixture.nativeElement.querySelectorAll('.character-card')
      expect(cards.length).toBe(3)
    })

    it('displays character sprite', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const sprites = fixture.nativeElement.querySelectorAll('.card-sprite img')
      expect(sprites.length).toBe(3)
      // Sprites should have src attributes
      expect(sprites[0]?.getAttribute('src')).toBeTruthy()
    })

    it('displays character name', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const names = fixture.nativeElement.querySelectorAll('.char-name')
      expect(names[0]?.textContent).toContain('Dirk')
      expect(names[1]?.textContent).toContain('Michael')
      expect(names[2]?.textContent).toContain('Fred')
    })

    it('displays class abbreviation and level', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const classInfo = fixture.nativeElement.querySelectorAll('.char-class')
      expect(classInfo[0]?.textContent).toContain('FIG')
      expect(classInfo[0]?.textContent).toContain('Lv1')
      expect(classInfo[2]?.textContent).toContain('THI')
    })

    it('shows [Select] button for enabled characters', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const allButtons = fixture.nativeElement.querySelectorAll('.action-btn')
      const selectCount = Array.from(allButtons).filter(
        (btn: Element) => btn.textContent?.includes('Select')
      ).length
      expect(selectCount).toBe(3)
    })

    it('does not show cards for disabled characters', () => {
      const options: CharacterOption[] = [
        {
          character: createTestCharacter({
            id: 'disabled',
            name: 'Disabled',
            class: CharacterClass.FIGHTER,
            status: CharacterStatus.OK
          }),
          index: 1,
          enabled: false
        },
        {
          character: createTestCharacter({
            id: 'enabled',
            name: 'Enabled',
            class: CharacterClass.MAGE,
            status: CharacterStatus.OK
          }),
          index: 2,
          enabled: true
        }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      // Only enabled characters are shown
      const cards = fixture.nativeElement.querySelectorAll('.character-card')
      expect(cards.length).toBe(1)
      const names = fixture.nativeElement.querySelectorAll('.char-name')
      expect(names[0]?.textContent).toContain('Enabled')
    })

    it('adds incapacitated class for dead characters', () => {
      const options: CharacterOption[] = [
        {
          character: createTestCharacter({
            id: 'dead',
            name: 'DeadChar',
            class: CharacterClass.FIGHTER,
            hp: 0,
            status: CharacterStatus.DEAD
          }),
          index: 1,
          enabled: true
        }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const card = fixture.nativeElement.querySelector('.character-card')
      expect(card?.classList.contains('incapacitated')).toBe(true)
    })

    it('shows status code badge', () => {
      const options: CharacterOption[] = [
        {
          character: createTestCharacter({
            id: 'poisoned',
            name: 'PoisonedChar',
            class: CharacterClass.FIGHTER,
            status: CharacterStatus.POISONED
          }),
          index: 1,
          enabled: true
        }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const statuses = fixture.nativeElement.querySelectorAll('.char-status')
      expect(statuses[0]?.textContent).toContain('PSN')
    })
  })

  describe('scrollable grid layout', () => {
    it('uses auto-fill grid for characters', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const grid = fixture.nativeElement.querySelector('.character-grid')
      expect(grid).toBeTruthy()
    })
  })

  describe('click selection', () => {
    it('emits characterSelected when [Select] button clicked', () => {
      const spy = jest.spyOn(component.characterSelected, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      // Find the first Select button
      const allButtons = Array.from(fixture.nativeElement.querySelectorAll('.action-btn'))
      const selectBtn = allButtons.find((btn: Element) =>
        btn.textContent?.includes('Select')
      ) as HTMLElement
      selectBtn?.click()

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dirk' }))
    })
  })

  describe('keyboard handling', () => {
    it('cancels on ESC key press', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(spy).toHaveBeenCalled()
    })

    it('does not handle ESC when not visible', () => {
      const cancelSpy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', false)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(cancelSpy).not.toHaveBeenCalled()
    })
  })

  describe('backdrop click', () => {
    it('cancels on backdrop click', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      overlay.click()

      expect(spy).toHaveBeenCalled()
    })

    it('does not cancel on panel click', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const panel = fixture.nativeElement.querySelector('.dialog-panel')
      panel.click()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('enabledCharacters computed', () => {
    it('filters to only enabled characters', () => {
      const options: CharacterOption[] = [
        { character: createTestCharacter({ id: 'a' }), index: 1, enabled: true },
        { character: createTestCharacter({ id: 'b' }), index: 2, enabled: false },
        { character: createTestCharacter({ id: 'c' }), index: 3, enabled: true }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const enabled = component.enabledCharacters()
      expect(enabled.length).toBe(2)
      expect(enabled.map(c => c.id)).toEqual(['a', 'c'])
    })
  })

  describe('getActionsForCharacter', () => {
    it('returns select action', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', [])
      fixture.detectChanges()

      const char = createTestCharacter()
      const actions = component.getActionsForCharacter(char)

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe('select')
    })
  })

  describe('handleActionClick', () => {
    it('emits characterSelected event for select action', () => {
      const spy = jest.spyOn(component.characterSelected, 'emit')
      const options = createCharacterOptions()
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      component.handleActionClick({
        characterId: 'char-1',
        actionType: 'select'
      })

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'char-1', name: 'Dirk' }))
    })

    it('does not emit if character not found', () => {
      const spy = jest.spyOn(component.characterSelected, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      component.handleActionClick({
        characterId: 'non-existent',
        actionType: 'select'
      })

      expect(spy).not.toHaveBeenCalled()
    })

    it('does not emit for non-select actions', () => {
      const spy = jest.spyOn(component.characterSelected, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      component.handleActionClick({
        characterId: 'char-1',
        actionType: 'inspect'  // Different action type
      })

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('footer', () => {
    it('displays click instruction', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const instruction = fixture.nativeElement.querySelector('.instruction')
      expect(instruction?.textContent).toContain('Click to select, ESC to cancel')
    })
  })

  describe('empty state', () => {
    it('shows no characters message when empty', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', [])
      fixture.detectChanges()

      const empty = fixture.nativeElement.querySelector('.no-characters')
      expect(empty?.textContent).toContain('No characters available')
    })

    it('shows no characters message when all disabled', () => {
      const options: CharacterOption[] = [
        { character: createTestCharacter({ id: 'a' }), index: 1, enabled: false }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const empty = fixture.nativeElement.querySelector('.no-characters')
      expect(empty?.textContent).toContain('No characters available')
    })
  })
})
