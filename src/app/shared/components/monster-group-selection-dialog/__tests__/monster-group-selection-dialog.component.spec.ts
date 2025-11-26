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
      fixture.componentRef.setInput('visible', false)
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      expect(overlay).toBeNull()
    })

    it('should render when visible is true', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('groups', mockGroups)
      fixture.detectChanges()

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      expect(overlay).not.toBeNull()
    })

    it('should display custom prompt', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('prompt', 'CHOOSE YOUR TARGET')
      fixture.componentRef.setInput('groups', mockGroups)
      fixture.detectChanges()

      // SelectionDialogComponent uses .dialog-title for the header
      const header = fixture.nativeElement.querySelector('.dialog-title')
      expect(header?.textContent).toContain('CHOOSE YOUR TARGET')
    })
  })

  describe('group display', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('groups', mockGroups)
      fixture.detectChanges()
    })

    it('should display all groups', () => {
      // Now using SelectionListComponent's .selection-item class
      const groupItems = fixture.nativeElement.querySelectorAll('.selection-item')
      expect(groupItems.length).toBe(3)
    })

    it('should display group letter and name', () => {
      fixture.componentRef.setInput('groups', [{ id: 'A', displayName: '3 ORCS', enabled: true }])
      fixture.detectChanges()

      const letter = fixture.nativeElement.querySelector('.group-letter')
      const name = fixture.nativeElement.querySelector('.group-name')

      expect(letter?.textContent).toContain('A)')
      expect(name?.textContent).toContain('3 ORCS')
    })

    it('should apply correct data-group attribute', () => {
      const groupA = fixture.nativeElement.querySelector('[data-group="A"]')
      const groupB = fixture.nativeElement.querySelector('[data-group="B"]')
      const groupC = fixture.nativeElement.querySelector('[data-group="C"]')

      expect(groupA).not.toBeNull()
      expect(groupB).not.toBeNull()
      expect(groupC).not.toBeNull()
    })

    it('should show disabled groups with disabled styling', () => {
      fixture.componentRef.setInput('groups', [{ id: 'A', displayName: '3 ORCS', enabled: false }])
      fixture.detectChanges()

      // SelectionListComponent applies .disabled class to selection-item
      const groupItem = fixture.nativeElement.querySelector('.selection-item')
      expect(groupItem?.classList.contains('disabled')).toBe(true)
    })
  })

  describe('keyboard handling', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('groups', mockGroups)
      fixture.detectChanges()
    })

    it('should emit groupSelected when pressing A', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith('A')
    })

    it('should emit groupSelected when pressing B', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith('B')
    })

    it('should emit groupSelected when pressing C', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith('C')
    })

    it('should handle uppercase letters', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'A' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith('A')
    })

    it('should emit cancelled when pressing ESC', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalled()
    })

    it('should not emit for disabled group', () => {
      fixture.componentRef.setInput('groups', [{ id: 'A', displayName: '3 ORCS', enabled: false }])
      fixture.detectChanges()

      const spy = jest.spyOn(component.groupSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      fixture.detectChanges()

      expect(spy).not.toHaveBeenCalled()
    })

    it('should not emit for non-existent group', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }))
      fixture.detectChanges()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('mouse interaction', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('groups', mockGroups)
      fixture.detectChanges()
    })

    it('should emit groupSelected when clicking on a group', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')

      const items = fixture.nativeElement.querySelectorAll('.selection-item')
      items[1].click() // Click group B
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith('B')
    })

    it('should not emit for disabled group click', () => {
      fixture.componentRef.setInput('groups', [{ id: 'A', displayName: '3 ORCS', enabled: false }])
      fixture.detectChanges()

      const spy = jest.spyOn(component.groupSelected, 'emit')

      const item = fixture.nativeElement.querySelector('.selection-item')
      item.click()
      fixture.detectChanges()

      expect(spy).not.toHaveBeenCalled()
    })

    it('should emit cancelled when clicking backdrop', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      const overlay = fixture.nativeElement.querySelector('.dialog-overlay')
      overlay.click()
      fixture.detectChanges()

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('computed signals', () => {
    it('should convert groups to selectable options with shortcuts', () => {
      fixture.componentRef.setInput('groups', mockGroups)
      fixture.detectChanges()

      const selectableGroups = component.selectableGroups()

      expect(selectableGroups.length).toBe(3)
      expect(selectableGroups[0].shortcut).toBe('A')
      expect(selectableGroups[1].shortcut).toBe('B')
      expect(selectableGroups[2].shortcut).toBe('C')
    })
  })

  describe('option selection handler', () => {
    it('should emit group ID when option selected', () => {
      const spy = jest.spyOn(component.groupSelected, 'emit')

      component.onOptionSelected({
        id: 'B',
        displayName: '5 ZOMBIES',
        enabled: true,
        shortcut: 'B'
      })

      expect(spy).toHaveBeenCalledWith('B')
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
