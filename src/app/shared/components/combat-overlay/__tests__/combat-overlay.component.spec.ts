import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CombatOverlayComponent } from '../combat-overlay.component'
import { VictoryRewards, ItemDrop } from '@services/VictoryService'

describe('CombatOverlayComponent', () => {
  let component: CombatOverlayComponent
  let fixture: ComponentFixture<CombatOverlayComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CombatOverlayComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(CombatOverlayComponent)
    component = fixture.componentInstance
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('Victory Overlay', () => {
    const createRewards = (overrides: Partial<VictoryRewards> = {}): VictoryRewards => ({
      totalXP: 1500,
      xpPerCharacter: 250,
      totalGold: 500,
      livingCharacterCount: 6,
      items: [],
      ...overrides
    })

    const createItem = (overrides: Partial<ItemDrop> = {}): ItemDrop => ({
      itemId: 'sword-long',
      itemName: 'Long Sword',
      identified: true,
      ...overrides
    })

    it('should not show victory overlay when showVictoryOverlay is false', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', false)
      fixture.componentRef.setInput('victoryRewards', createRewards())
      fixture.detectChanges()

      const victoryOverlay = fixture.nativeElement.querySelector('.victory-overlay')
      expect(victoryOverlay).toBeNull()
    })

    it('should show victory overlay when showVictoryOverlay is true', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.detectChanges()

      const victoryOverlay = fixture.nativeElement.querySelector('.victory-overlay')
      expect(victoryOverlay).toBeTruthy()
    })

    it('should display VICTORY! text', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.detectChanges()

      const victoryText = fixture.nativeElement.querySelector('.victory-text')
      expect(victoryText.textContent).toBe('VICTORY!')
    })

    it('should not show rewards panel when victoryRewards is null', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', null)
      fixture.detectChanges()

      const rewardsPanel = fixture.nativeElement.querySelector('.rewards-panel')
      expect(rewardsPanel).toBeNull()
    })

    it('should display total XP when rewards exist', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({ totalXP: 2500 }))
      fixture.detectChanges()

      const xpItem = fixture.nativeElement.querySelector('.reward-item.xp')
      expect(xpItem).toBeTruthy()
      const xpValue = xpItem.querySelector('.reward-value')
      expect(xpValue.textContent).toContain('2,500')
    })

    it('should display XP per character', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({ xpPerCharacter: 417 }))
      fixture.detectChanges()

      const xpItem = fixture.nativeElement.querySelector('.reward-item.xp')
      const xpDetail = xpItem.querySelector('.reward-detail')
      expect(xpDetail.textContent).toContain('417 per character')
    })

    it('should display total gold when rewards exist', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({ totalGold: 1234 }))
      fixture.detectChanges()

      const goldItem = fixture.nativeElement.querySelector('.reward-item.gold')
      expect(goldItem).toBeTruthy()
      const goldValue = goldItem.querySelector('.reward-value')
      expect(goldValue.textContent).toContain('1,234')
    })

    it('should not show items section when items array is empty', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({ items: [] }))
      fixture.detectChanges()

      const itemsSection = fixture.nativeElement.querySelector('.items-section')
      expect(itemsSection).toBeNull()
    })

    it('should show items section when items exist', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem()]
      }))
      fixture.detectChanges()

      const itemsSection = fixture.nativeElement.querySelector('.items-section')
      expect(itemsSection).toBeTruthy()
    })

    it('should display identified item name', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem({ itemName: 'Enchanted Dagger', identified: true })]
      }))
      fixture.detectChanges()

      const itemEntry = fixture.nativeElement.querySelector('.item-entry')
      expect(itemEntry.textContent.trim()).toBe('Enchanted Dagger')
    })

    it('should display "??? (Unidentified)" for unidentified items', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem({ itemName: 'Secret Weapon', identified: false })]
      }))
      fixture.detectChanges()

      const itemEntry = fixture.nativeElement.querySelector('.item-entry')
      expect(itemEntry.textContent.trim()).toBe('??? (Unidentified)')
    })

    it('should apply .unidentified class to unidentified items', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem({ identified: false })]
      }))
      fixture.detectChanges()

      const itemEntry = fixture.nativeElement.querySelector('.item-entry')
      expect(itemEntry.classList.contains('unidentified')).toBe(true)
    })

    it('should not apply .unidentified class to identified items', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem({ identified: true })]
      }))
      fixture.detectChanges()

      const itemEntry = fixture.nativeElement.querySelector('.item-entry')
      expect(itemEntry.classList.contains('unidentified')).toBe(false)
    })

    it('should display multiple items', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [
          createItem({ itemId: 'item-1', itemName: 'Sword' }),
          createItem({ itemId: 'item-2', itemName: 'Shield' }),
          createItem({ itemId: 'item-3', itemName: 'Potion', identified: false })
        ]
      }))
      fixture.detectChanges()

      const itemEntries = fixture.nativeElement.querySelectorAll('.item-entry')
      expect(itemEntries.length).toBe(3)
    })

    it('should show continue hint when rewards panel is visible', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards())
      fixture.detectChanges()

      const continueHint = fixture.nativeElement.querySelector('.continue-hint')
      expect(continueHint).toBeTruthy()
      expect(continueHint.textContent).toContain('Press ENTER to continue')
    })

    describe('Accessibility', () => {
      it('should have role="dialog" on victory overlay', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.detectChanges()

        const victoryOverlay = fixture.nativeElement.querySelector('.victory-overlay')
        expect(victoryOverlay.getAttribute('role')).toBe('dialog')
      })

      it('should have aria-labelledby pointing to victory heading', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.detectChanges()

        const victoryOverlay = fixture.nativeElement.querySelector('.victory-overlay')
        expect(victoryOverlay.getAttribute('aria-labelledby')).toBe('victory-heading')

        const heading = fixture.nativeElement.querySelector('#victory-heading')
        expect(heading).toBeTruthy()
        expect(heading.textContent).toBe('VICTORY!')
      })

      it('should have aria-modal="true" on victory overlay', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.detectChanges()

        const victoryOverlay = fixture.nativeElement.querySelector('.victory-overlay')
        expect(victoryOverlay.getAttribute('aria-modal')).toBe('true')
      })

      it('should have role="status" on rewards panel', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.componentRef.setInput('victoryRewards', createRewards())
        fixture.detectChanges()

        const rewardsPanel = fixture.nativeElement.querySelector('.rewards-panel')
        expect(rewardsPanel.getAttribute('role')).toBe('status')
      })

      it('should have aria-live="polite" on rewards panel', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.componentRef.setInput('victoryRewards', createRewards())
        fixture.detectChanges()

        const rewardsPanel = fixture.nativeElement.querySelector('.rewards-panel')
        expect(rewardsPanel.getAttribute('aria-live')).toBe('polite')
      })
    })
  })
})
