import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TierSelectionComponent, TierOption, TierOptionWithAffordability } from '../tier-selection.component'

describe('TierSelectionComponent', () => {
  let component: TierSelectionComponent
  let fixture: ComponentFixture<TierSelectionComponent>

  const testOptions: TierOption[] = [
    { id: 'free', name: 'Free Option', cost: 0, benefit: 'No benefit', shortcut: 'F' },
    { id: 'cheap', name: 'Cheap Option', cost: 10, costUnit: 'gp', benefit: '1 HP', shortcut: 'C' },
    { id: 'medium', name: 'Medium Option', cost: 50, costUnit: 'gp', benefit: '3 HP', shortcut: 'M' },
    { id: 'expensive', name: 'Expensive Option', cost: 500, costUnit: 'gp', benefit: '10 HP', shortcut: 'E' }
  ]

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TierSelectionComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(TierSelectionComponent)
    component = fixture.componentInstance
    // Use setInput for signal-based inputs
    fixture.componentRef.setInput('options', testOptions)
    fixture.componentRef.setInput('availableFunds', 100)
    fixture.detectChanges()
  })

  describe('initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy()
    })

    it('should display title', () => {
      fixture.componentRef.setInput('title', 'SELECT ROOM')
      fixture.detectChanges()
      const title = fixture.nativeElement.querySelector('.selection-title')
      expect(title.textContent).toContain('SELECT ROOM')
    })

    it('should display available funds', () => {
      const fundsDisplay = fixture.nativeElement.querySelector('.funds-value')
      expect(fundsDisplay.textContent).toContain('100')
    })

    it('should display all options', () => {
      // Now using SelectionListComponent's .selection-item class
      const options = fixture.nativeElement.querySelectorAll('.selection-item')
      expect(options.length).toBe(4)
    })
  })

  describe('affordability', () => {
    it('should mark affordable options as enabled', () => {
      const options = component.optionsWithAffordability()
      expect(options[0].affordable).toBe(true) // Free
      expect(options[0].enabled).toBe(true) // enabled should match affordable
      expect(options[1].affordable).toBe(true) // 10 gp
      expect(options[2].affordable).toBe(true) // 50 gp
      expect(options[3].affordable).toBe(false) // 500 gp
      expect(options[3].enabled).toBe(false) // enabled should match affordable
    })

    it('should apply disabled class to unaffordable options', () => {
      fixture.detectChanges()
      // SelectionListComponent uses .disabled class
      const disabledOptions = fixture.nativeElement.querySelectorAll('.selection-item.disabled')
      expect(disabledOptions.length).toBe(1)
    })

    it('should show unaffordable badge on disabled options', () => {
      fixture.detectChanges()
      const badges = fixture.nativeElement.querySelectorAll('.unaffordable-badge')
      expect(badges.length).toBe(1)
      expect(badges[0].textContent).toContain('CANNOT AFFORD')
    })

    it('should update affordability when funds change', () => {
      fixture.componentRef.setInput('availableFunds', 500)
      fixture.detectChanges()
      const options = component.optionsWithAffordability()
      expect(options.every(o => o.affordable)).toBe(true)
      expect(options.every(o => o.enabled)).toBe(true)
    })
  })

  describe('keyboard navigation', () => {
    // Keyboard navigation is now handled by SelectionListComponent
    // These tests verify the component integrates correctly by dispatching window events

    it('should emit optionSelected on Enter when option is selected', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      // Dispatch keyboard event to window (SelectionListComponent listens on window)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      fixture.detectChanges()

      // First option should be selected by default and emit
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'free' }))
    })

    it('should emit cancelled on Escape', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalled()
    })

    it('should navigate with arrow keys', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      // Navigate down
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      fixture.detectChanges()

      // Press Enter to select
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      fixture.detectChanges()

      // Should have selected the second option
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'cheap' }))
    })
  })

  describe('keyboard shortcuts', () => {
    it('should select option by shortcut key', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'C' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'cheap' }))
    })

    it('should be case-insensitive for shortcuts', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }))
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'medium' }))
    })

    it('should not select disabled option by shortcut', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'E' }))
      fixture.detectChanges()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('mouse interaction', () => {
    it('should emit optionSelected on click', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      // Click on the second option (cheap)
      const items = fixture.nativeElement.querySelectorAll('.selection-item')
      items[1].click()
      fixture.detectChanges()

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'cheap' }))
    })

    it('should not emit on click of disabled option', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      // Click on the expensive (disabled) option
      const items = fixture.nativeElement.querySelectorAll('.selection-item')
      items[3].click()
      fixture.detectChanges()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('option selection handler', () => {
    it('should emit TierOption without enabled field', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      const optionWithAffordability: TierOptionWithAffordability = {
        ...testOptions[1],
        affordable: true,
        enabled: true
      }

      component.onOptionSelected(optionWithAffordability)

      // Verify the emitted value doesn't have 'enabled' property
      expect(spy).toHaveBeenCalled()
      const emittedValue = spy.mock.calls[0][0]
      expect(emittedValue.id).toBe('cheap')
      expect(emittedValue).not.toHaveProperty('enabled')
      expect(emittedValue).not.toHaveProperty('affordable')
    })
  })

  describe('back option', () => {
    it('should show back button by default', () => {
      const backBtn = fixture.nativeElement.querySelector('.back-btn')
      expect(backBtn).toBeTruthy()
    })

    it('should hide back button when showBackOption is false', () => {
      fixture.componentRef.setInput('showBackOption', false)
      fixture.detectChanges()
      const backBtn = fixture.nativeElement.querySelector('.back-btn')
      expect(backBtn).toBeFalsy()
    })

    it('should emit cancelled on back button click', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      component.onBackClick()

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('free options', () => {
    it('should display FREE for zero-cost options', () => {
      fixture.detectChanges()
      const costs = fixture.nativeElement.querySelectorAll('.option-cost')
      expect(costs[0].textContent).toContain('FREE')
    })
  })
})
