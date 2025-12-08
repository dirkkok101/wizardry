import { ComponentFixture, TestBed } from '@angular/core/testing'
import {
  RosterManagementDialogComponent,
  RosterActionEvent
} from '../roster-management-dialog.component'
import { createTestCharacter } from '@testing/test-factories'
import { CharacterClass } from '@models/CharacterClass'
import { CharacterStatus } from '@models/CharacterStatus'

describe('RosterManagementDialogComponent', () => {
  let component: RosterManagementDialogComponent
  let fixture: ComponentFixture<RosterManagementDialogComponent>

  function createTestCharacters() {
    return [
      createTestCharacter({
        id: 'char-1',
        name: 'Dirk',
        class: CharacterClass.FIGHTER,
        level: 5,
        hp: 30,
        maxHp: 40,
        status: CharacterStatus.OK
      }),
      createTestCharacter({
        id: 'char-2',
        name: 'Michael',
        class: CharacterClass.MAGE,
        level: 3,
        hp: 12,
        maxHp: 15,
        status: CharacterStatus.OK
      }),
      createTestCharacter({
        id: 'char-3',
        name: 'Fred',
        class: CharacterClass.THIEF,
        level: 2,
        hp: 0,
        maxHp: 10,
        status: CharacterStatus.DEAD
      })
    ]
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RosterManagementDialogComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(RosterManagementDialogComponent)
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
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      expect(overlay).toBeNull()
    })

    it('renders when visible is true', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      expect(overlay).toBeTruthy()
    })
  })

  describe('header', () => {
    it('displays the prompt', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.componentRef.setInput('prompt', 'CHARACTER ROSTER')
      fixture.detectChanges()

      const title = fixture.nativeElement.querySelector('.panel-title')
      expect(title?.textContent).toContain('CHARACTER ROSTER')
    })

    it('displays custom prompt', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.componentRef.setInput('prompt', 'MANAGE CHARACTERS')
      fixture.detectChanges()

      const title = fixture.nativeElement.querySelector('.panel-title')
      expect(title?.textContent).toContain('MANAGE CHARACTERS')
    })
  })

  describe('character cards (via CharacterPanel)', () => {
    it('displays character cards for each character', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const cards = fixture.nativeElement.querySelectorAll('.character-card')
      expect(cards.length).toBe(3)
    })

    it('displays character sprite', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const sprites = fixture.nativeElement.querySelectorAll('.card-sprite img')
      expect(sprites.length).toBe(3)
      expect(sprites[0]?.getAttribute('src')).toBeTruthy()
    })

    it('displays character name', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const names = fixture.nativeElement.querySelectorAll('.char-name')
      expect(names[0]?.textContent).toContain('Dirk')
      expect(names[1]?.textContent).toContain('Michael')
      expect(names[2]?.textContent).toContain('Fred')
    })

    it('displays class abbreviation and level', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const classInfo = fixture.nativeElement.querySelectorAll('.char-class')
      expect(classInfo[0]?.textContent).toContain('FIG')
      expect(classInfo[0]?.textContent).toContain('Lv5')
      expect(classInfo[1]?.textContent).toContain('MAG')
    })

    it('adds incapacitated class for dead characters', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const cards = fixture.nativeElement.querySelectorAll('.character-card')
      // CharacterPanel adds .incapacitated instead of .dead
      expect(cards[2]?.classList.contains('incapacitated')).toBe(true)
    })

    it('shows status code badge', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      // CharacterPanel shows status codes like DED, PSN, etc.
      const statuses = fixture.nativeElement.querySelectorAll('.char-status')
      expect(statuses.length).toBe(3) // All characters have status shown
      expect(statuses[2]?.textContent).toContain('DED')
    })
  })

  describe('action buttons', () => {
    it('displays Inspect button for all characters', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const allButtons = fixture.nativeElement.querySelectorAll('.action-btn')
      const inspectCount = Array.from(allButtons).filter(
        (btn: Element) => btn.textContent?.includes('Inspect')
      ).length
      expect(inspectCount).toBe(3)
    })

    it('displays Delete button for all characters', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const allButtons = fixture.nativeElement.querySelectorAll('.action-btn')
      const deleteCount = Array.from(allButtons).filter(
        (btn: Element) => btn.textContent?.includes('Delete')
      ).length
      expect(deleteCount).toBe(3)
    })

    it('emits actionClick with inspect action', () => {
      const spy = jest.spyOn(component.actionClick, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      // Find the first Inspect button
      const allButtons = Array.from(fixture.nativeElement.querySelectorAll('.action-btn'))
      const inspectBtn = allButtons.find((btn: Element) =>
        btn.textContent?.includes('Inspect')
      ) as HTMLElement
      inspectBtn?.click()

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'inspect',
          character: expect.objectContaining({ name: 'Dirk' })
        })
      )
    })

    it('emits actionClick with delete action', () => {
      const spy = jest.spyOn(component.actionClick, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      // Find the first Delete button
      const allButtons = Array.from(fixture.nativeElement.querySelectorAll('.action-btn'))
      const deleteBtn = allButtons.find((btn: Element) =>
        btn.textContent?.includes('Delete')
      ) as HTMLElement
      deleteBtn?.click()

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          character: expect.objectContaining({ name: 'Dirk' })
        })
      )
    })
  })

  describe('keyboard handling', () => {
    it('cancels on ESC key press', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(spy).toHaveBeenCalled()
    })

    it('does not handle ESC when not visible', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', false)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('backdrop click', () => {
    it('cancels on backdrop click', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      overlay.click()

      expect(spy).toHaveBeenCalled()
    })

    it('does not cancel on panel click', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const panel = fixture.nativeElement.querySelector('.dialog-panel')
      panel.click()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('getActionsForCharacter', () => {
    it('returns inspect and delete actions for a character', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', [])
      fixture.detectChanges()

      const char = createTestCharacter({ class: CharacterClass.FIGHTER })
      const actions = component.getActionsForCharacter(char)

      expect(actions.find(a => a.type === 'inspect')).toBeTruthy()
      expect(actions.find(a => a.type === 'delete')).toBeTruthy()
      expect(actions.find(a => a.type === 'delete')?.variant).toBe('danger')
    })
  })

  describe('handleActionClick', () => {
    it('emits actionClick event with correct character and action', () => {
      const spy = jest.spyOn(component.actionClick, 'emit')
      const chars = createTestCharacters()
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', chars)
      fixture.detectChanges()

      component.handleActionClick({
        characterId: 'char-1',
        actionType: 'inspect'
      })

      expect(spy).toHaveBeenCalledWith({
        character: expect.objectContaining({ id: 'char-1', name: 'Dirk' }),
        action: 'inspect'
      })
    })

    it('does not emit if character not found', () => {
      const spy = jest.spyOn(component.actionClick, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      component.handleActionClick({
        characterId: 'non-existent',
        actionType: 'inspect'
      })

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('empty state', () => {
    it('shows no characters message when empty', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', [])
      fixture.detectChanges()

      const empty = fixture.nativeElement.querySelector('.no-characters')
      expect(empty?.textContent).toContain('No characters in roster')
    })
  })

  describe('footer', () => {
    it('displays ESC instruction', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createTestCharacters())
      fixture.detectChanges()

      const instruction = fixture.nativeElement.querySelector('.instruction')
      expect(instruction?.textContent).toContain('ESC to close')
    })
  })
})
