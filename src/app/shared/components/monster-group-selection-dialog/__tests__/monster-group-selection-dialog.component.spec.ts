import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MonsterGroupSelectionDialogComponent, MonsterGroupOption } from '../monster-group-selection-dialog.component'

describe('MonsterGroupSelectionDialogComponent', () => {
  let component: MonsterGroupSelectionDialogComponent
  let fixture: ComponentFixture<MonsterGroupSelectionDialogComponent>

  const mockGroups: MonsterGroupOption[] = [
    { id: 'A', displayName: '3 ORCS', enabled: true },
    { id: 'B', displayName: '5 ZOMBIES', enabled: true },
    { id: 'C', displayName: '2 GOBLINS', enabled: true }
  ]

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonsterGroupSelectionDialogComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(MonsterGroupSelectionDialogComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  describe('visibility', () => {
    it('should not render when visible is false', () => {
      component.visible = false
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      expect(overlay).toBeNull()
    })

    it('should render when visible is true', () => {
      component.visible = true
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      expect(overlay).not.toBeNull()
    })

    it('should display custom prompt', () => {
      component.visible = true
      component.prompt = 'CHOOSE YOUR TARGET'
      fixture.detectChanges()

      const header = fixture.nativeElement.querySelector('.dialog-header h2')
      expect(header?.textContent).toBe('CHOOSE YOUR TARGET')
    })
  })

  describe('group display', () => {
    it('should display all groups', () => {
      component.visible = true
      component.groups = mockGroups
      fixture.detectChanges()

      const groupItems = fixture.nativeElement.querySelectorAll('.group-item')
      expect(groupItems.length).toBe(3)
    })

    it('should display group letter and name', () => {
      component.visible = true
      component.groups = [{ id: 'A', displayName: '3 ORCS', enabled: true }]
      fixture.detectChanges()

      const letter = fixture.nativeElement.querySelector('.group-letter')
      const name = fixture.nativeElement.querySelector('.group-name')

      expect(letter?.textContent).toBe('A)')
      expect(name?.textContent).toBe('3 ORCS')
    })

    it('should apply correct data-group attribute', () => {
      component.visible = true
      component.groups = mockGroups
      fixture.detectChanges()

      const groupA = fixture.nativeElement.querySelector('[data-group="A"]')
      const groupB = fixture.nativeElement.querySelector('[data-group="B"]')
      const groupC = fixture.nativeElement.querySelector('[data-group="C"]')

      expect(groupA).not.toBeNull()
      expect(groupB).not.toBeNull()
      expect(groupC).not.toBeNull()
    })

    it('should not show disabled groups with disabled styling', () => {
      component.visible = true
      component.groups = [
        { id: 'A', displayName: '3 ORCS', enabled: false }
      ]
      fixture.detectChanges()

      const groupItem = fixture.nativeElement.querySelector('.group-item')
      expect(groupItem?.classList.contains('disabled')).toBe(true)
    })
  })

  describe('keyboard handling', () => {
    beforeEach(() => {
      component.visible = true
      component.groups = mockGroups
      fixture.detectChanges()
    })

    it('should emit groupSelected when pressing A', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')
      const event = new KeyboardEvent('keydown', { key: 'a' })

      component.handleKeyPress(event)

      expect(spy).toHaveBeenCalledWith('A')
    })

    it('should emit groupSelected when pressing B', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')
      const event = new KeyboardEvent('keydown', { key: 'b' })

      component.handleKeyPress(event)

      expect(spy).toHaveBeenCalledWith('B')
    })

    it('should emit groupSelected when pressing C', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')
      const event = new KeyboardEvent('keydown', { key: 'c' })

      component.handleKeyPress(event)

      expect(spy).toHaveBeenCalledWith('C')
    })

    it('should handle uppercase letters', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')
      const event = new KeyboardEvent('keydown', { key: 'A' })

      component.handleKeyPress(event)

      expect(spy).toHaveBeenCalledWith('A')
    })

    it('should emit cancelled when pressing ESC', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      const event = new KeyboardEvent('keydown', { key: 'Escape' })

      component.handleKeyPress(event)

      expect(spy).toHaveBeenCalled()
    })

    it('should not emit for disabled group', () => {
      component.groups = [
        { id: 'A', displayName: '3 ORCS', enabled: false }
      ]
      const spy = jest.spyOn(component.groupSelected, 'emit')
      const event = new KeyboardEvent('keydown', { key: 'a' })

      component.handleKeyPress(event)

      expect(spy).not.toHaveBeenCalled()
    })

    it('should not emit for non-existent group', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')
      const event = new KeyboardEvent('keydown', { key: 'd' })

      component.handleKeyPress(event)

      expect(spy).not.toHaveBeenCalled()
    })

    it('should not handle keys when not visible', () => {
      component.visible = false
      const spy = jest.spyOn(component.groupSelected, 'emit')
      const event = new KeyboardEvent('keydown', { key: 'a' })

      component.handleKeyPress(event)

      expect(spy).not.toHaveBeenCalled()
    })

    it('should ignore other keys', () => {
      const groupSpy = jest.spyOn(component.groupSelected, 'emit')
      const cancelSpy = jest.spyOn(component.cancelled, 'emit')
      const event = new KeyboardEvent('keydown', { key: 'Enter' })

      component.handleKeyPress(event)

      expect(groupSpy).not.toHaveBeenCalled()
      expect(cancelSpy).not.toHaveBeenCalled()
    })
  })

  describe('backdrop interaction', () => {
    beforeEach(() => {
      component.visible = true
      component.groups = mockGroups
      fixture.detectChanges()
    })

    it('should emit cancelled when clicking backdrop', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      component.onBackdropClick()

      expect(spy).toHaveBeenCalled()
    })

    it('should not emit cancelled when clicking dialog content', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      const mockEvent = { stopPropagation: jest.fn() } as unknown as Event

      component.onDialogClick(mockEvent)

      expect(spy).not.toHaveBeenCalled()
      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('auto-focus', () => {
    it('should focus dialog when visible', () => {
      const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus')

      component.visible = true
      component.groups = mockGroups
      fixture.detectChanges()

      // Trigger ngAfterViewChecked to call focus
      component.ngAfterViewChecked()

      expect(focusSpy).toHaveBeenCalled()
      focusSpy.mockRestore()
    })

    it('should reset focus flag when hidden', () => {
      component.visible = true
      fixture.detectChanges()
      component.ngAfterViewChecked()

      component.visible = false
      fixture.detectChanges()
      component.ngAfterViewChecked()

      // hasFocused should be reset
      expect(component['hasFocused']).toBe(false)
    })
  })
})
