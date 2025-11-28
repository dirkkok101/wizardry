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

  describe('character cards', () => {
    it('displays character cards for each option', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const cards = fixture.nativeElement.querySelectorAll('.character-card')
      expect(cards.length).toBe(3)
    })

    it('displays character number', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const numbers = fixture.nativeElement.querySelectorAll('.character-number')
      expect(numbers[0]?.textContent).toContain('1)')
      expect(numbers[1]?.textContent).toContain('2)')
      expect(numbers[2]?.textContent).toContain('3)')
    })

    it('displays character name', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const names = fixture.nativeElement.querySelectorAll('.character-name')
      expect(names[0]?.textContent).toContain('Dirk')
      expect(names[1]?.textContent).toContain('Michael')
      expect(names[2]?.textContent).toContain('Fred')
    })

    it('displays class abbreviation and level', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const classLevels = fixture.nativeElement.querySelectorAll('.class-level')
      expect(classLevels[0]?.textContent).toContain('FIG')
      expect(classLevels[0]?.textContent).toContain('Lv1')
      expect(classLevels[2]?.textContent).toContain('THI')
    })

    it('displays HP text', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const hpTexts = fixture.nativeElement.querySelectorAll('.hp-text')
      expect(hpTexts[0]?.textContent).toContain('HP: 3/4')
      expect(hpTexts[1]?.textContent).toContain('HP: 4/4')
    })

    it('shows critical styling for low HP', () => {
      const options: CharacterOption[] = [
        {
          character: createTestCharacter({
            id: 'low-hp',
            name: 'Dying',
            class: CharacterClass.FIGHTER,
            hp: 1,
            maxHp: 10,
            status: CharacterStatus.OK
          }),
          index: 1,
          enabled: true
        }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const hpText = fixture.nativeElement.querySelector('.hp-text')
      expect(hpText?.classList.contains('critical')).toBe(true)
    })

    it('shows [Select] button for enabled characters', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const buttons = fixture.nativeElement.querySelectorAll('.select-button')
      expect(buttons.length).toBe(3)
      expect(buttons[0]?.textContent).toContain('[Select]')
    })

    it('does not show [Select] button for disabled characters', () => {
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
        }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const buttons = fixture.nativeElement.querySelectorAll('.select-button')
      expect(buttons.length).toBe(0)
    })

    it('adds disabled class to disabled cards', () => {
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
        }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const card = fixture.nativeElement.querySelector('.character-card')
      expect(card?.classList.contains('disabled')).toBe(true)
    })

    it('adds dead class for dead characters', () => {
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
      expect(card?.classList.contains('dead')).toBe(true)
    })

    it('shows status badge for non-OK status', () => {
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

      const badge = fixture.nativeElement.querySelector('.status-badge')
      expect(badge).toBeTruthy()
      expect(badge?.textContent).toContain('POISONED')
    })

    it('does not show status badge for OK status', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const badges = fixture.nativeElement.querySelectorAll('.status-badge')
      expect(badges.length).toBe(0)
    })
  })

  describe('two-column layout', () => {
    it('uses single column for 3 or fewer characters', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const list = fixture.nativeElement.querySelector('.character-list')
      expect(list?.classList.contains('two-columns')).toBe(false)
    })

    it('uses two columns for more than 3 characters', () => {
      const options = [
        ...createCharacterOptions(),
        {
          character: createTestCharacter({
            id: 'char-4',
            name: 'Fourth',
            class: CharacterClass.MAGE,
            status: CharacterStatus.OK
          }),
          index: 4,
          enabled: true
        }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const list = fixture.nativeElement.querySelector('.character-list')
      expect(list?.classList.contains('two-columns')).toBe(true)
    })
  })

  describe('click selection', () => {
    it('emits characterSelected when card clicked', () => {
      const spy = jest.spyOn(component.characterSelected, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const card = fixture.nativeElement.querySelector('.character-card.clickable')
      card?.click()

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dirk' }))
    })

    it('emits characterSelected when [Select] button clicked', () => {
      const spy = jest.spyOn(component.characterSelected, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const button = fixture.nativeElement.querySelector('.select-button')
      button?.click()

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dirk' }))
    })

    it('does not emit when disabled card clicked', () => {
      const spy = jest.spyOn(component.characterSelected, 'emit')
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
        }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const card = fixture.nativeElement.querySelector('.character-card')
      card?.click()

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('keyboard handling', () => {
    it('selects character on 1-6 key press', () => {
      const spy = jest.spyOn(component.characterSelected, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const event = new KeyboardEvent('keydown', { key: '2' })
      document.dispatchEvent(event)

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Michael' }))
    })

    it('does not select disabled character on key press', () => {
      const spy = jest.spyOn(component.characterSelected, 'emit')
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
        }
      ]
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', options)
      fixture.detectChanges()

      const event = new KeyboardEvent('keydown', { key: '1' })
      document.dispatchEvent(event)

      expect(spy).not.toHaveBeenCalled()
    })

    it('cancels on ESC key press', () => {
      const spy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(spy).toHaveBeenCalled()
    })

    it('does not handle keys when not visible', () => {
      const selectSpy = jest.spyOn(component.characterSelected, 'emit')
      const cancelSpy = jest.spyOn(component.cancelled, 'emit')
      fixture.componentRef.setInput('visible', false)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(selectSpy).not.toHaveBeenCalled()
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

  describe('helper methods', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()
    })

    it('getClassAbbr returns correct abbreviation', () => {
      const fighter = createTestCharacter({ class: CharacterClass.FIGHTER })
      const mage = createTestCharacter({ class: CharacterClass.MAGE })
      const priest = createTestCharacter({ class: CharacterClass.PRIEST })
      const ninja = createTestCharacter({ class: CharacterClass.NINJA })

      expect(component.getClassAbbr(fighter)).toBe('FIG')
      expect(component.getClassAbbr(mage)).toBe('MAG')
      expect(component.getClassAbbr(priest)).toBe('PRI')
      expect(component.getClassAbbr(ninja)).toBe('NIN')
    })

    it('getHpPercent calculates correctly', () => {
      const char = createTestCharacter({ hp: 50, maxHp: 100 })
      expect(component.getHpPercent(char)).toBe(50)
    })

    it('getHpPercent handles zero maxHp', () => {
      const char = createTestCharacter({ hp: 0, maxHp: 0 })
      expect(component.getHpPercent(char)).toBe(0)
    })

    it('isCritical returns true for HP < 25%', () => {
      const low = createTestCharacter({ hp: 2, maxHp: 10 })
      const ok = createTestCharacter({ hp: 3, maxHp: 10 })

      expect(component.isCritical(low)).toBe(true)
      expect(component.isCritical(ok)).toBe(false)
    })

    it('isDead returns true for DEAD or ASHES status', () => {
      const dead = createTestCharacter({ status: CharacterStatus.DEAD })
      const ashes = createTestCharacter({ status: CharacterStatus.ASHES })
      const alive = createTestCharacter({ status: CharacterStatus.OK })

      expect(component.isDead(dead)).toBe(true)
      expect(component.isDead(ashes)).toBe(true)
      expect(component.isDead(alive)).toBe(false)
    })

    it('getStatusBadge returns null for OK and INJURED', () => {
      const ok = createTestCharacter({ status: CharacterStatus.OK })
      const injured = createTestCharacter({ status: CharacterStatus.INJURED })

      expect(component.getStatusBadge(ok)).toBeNull()
      expect(component.getStatusBadge(injured)).toBeNull()
    })

    it('getStatusBadge returns status for other statuses', () => {
      const poisoned = createTestCharacter({ status: CharacterStatus.POISONED })
      const dead = createTestCharacter({ status: CharacterStatus.DEAD })

      expect(component.getStatusBadge(poisoned)).toBe('POISONED')
      expect(component.getStatusBadge(dead)).toBe('DEAD')
    })
  })

  describe('footer', () => {
    it('displays keyboard instruction', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', createCharacterOptions())
      fixture.detectChanges()

      const instruction = fixture.nativeElement.querySelector('.instruction')
      expect(instruction?.textContent).toContain('Press 1-6 to select, ESC to cancel')
    })
  })

  describe('empty state', () => {
    it('shows no characters message when empty', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('characters', [])
      fixture.detectChanges()

      const empty = fixture.nativeElement.querySelector('.no-characters')
      expect(empty?.textContent).toContain('No valid targets')
    })
  })
})
