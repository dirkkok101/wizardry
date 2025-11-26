import { ComponentFixture, TestBed } from '@angular/core/testing'
import { TierSelectionComponent, TierOption } from '../tier-selection.component'

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
      const options = fixture.nativeElement.querySelectorAll('.option-row')
      expect(options.length).toBe(4)
    })
  })

  describe('affordability', () => {
    it('should mark affordable options as enabled', () => {
      const options = component.optionsWithAffordability()
      expect(options[0].affordable).toBe(true) // Free
      expect(options[1].affordable).toBe(true) // 10 gp
      expect(options[2].affordable).toBe(true) // 50 gp
      expect(options[3].affordable).toBe(false) // 500 gp
    })

    it('should apply disabled class to unaffordable options', () => {
      fixture.detectChanges()
      const disabledOptions = fixture.nativeElement.querySelectorAll('.option-row.disabled')
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
    })
  })

  describe('keyboard navigation', () => {
    it('should move selection down on ArrowDown', () => {
      expect(component.selectedIndex()).toBe(0)

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      component.handleKeyPress(event)

      expect(component.selectedIndex()).toBe(1)
    })

    it('should move selection up on ArrowUp', () => {
      component.selectedIndex.set(2)

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' })
      component.handleKeyPress(event)

      expect(component.selectedIndex()).toBe(1)
    })

    it('should skip disabled options when navigating', () => {
      component.selectedIndex.set(2) // Medium (affordable)

      // Move down should skip to wrap around since expensive is disabled
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' })
      component.handleKeyPress(event)

      // Should wrap to first affordable option
      expect(component.selectedIndex()).toBe(0)
    })

    it('should emit optionSelected on Enter', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')
      component.selectedIndex.set(1)

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      component.handleKeyPress(event)

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'cheap' }))
    })

    it('should not emit on Enter if current option is disabled', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')
      component.selectedIndex.set(3) // Expensive (disabled)

      const event = new KeyboardEvent('keydown', { key: 'Enter' })
      component.handleKeyPress(event)

      expect(spy).not.toHaveBeenCalled()
    })

    it('should emit cancelled on Escape', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      component.handleKeyPress(event)

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('keyboard shortcuts', () => {
    it('should select option by shortcut key', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      const event = new KeyboardEvent('keydown', { key: 'C' })
      component.handleKeyPress(event)

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'cheap' }))
    })

    it('should be case-insensitive for shortcuts', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      const event = new KeyboardEvent('keydown', { key: 'm' })
      component.handleKeyPress(event)

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'medium' }))
    })

    it('should not select disabled option by shortcut', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      const event = new KeyboardEvent('keydown', { key: 'E' })
      component.handleKeyPress(event)

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('mouse interaction', () => {
    it('should emit optionSelected on click', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      component.selectOption({ ...testOptions[1], affordable: true }, 1)

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'cheap' }))
    })

    it('should not emit on click of disabled option', () => {
      const spy = jest.spyOn(component.optionSelected, 'emit')

      component.selectOption({ ...testOptions[3], affordable: false }, 3)

      expect(spy).not.toHaveBeenCalled()
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
