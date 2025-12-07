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

      const victoryOverlay = fixture.nativeElement.querySelector('.victory-fullbleed')
      expect(victoryOverlay).toBeNull()
    })

    it('should show victory overlay when showVictoryOverlay is true', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.detectChanges()

      const victoryOverlay = fixture.nativeElement.querySelector('.victory-fullbleed')
      expect(victoryOverlay).toBeTruthy()
    })

    it('should display VICTORY! text', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.detectChanges()

      const victoryTitle = fixture.nativeElement.querySelector('.victory-title')
      expect(victoryTitle.textContent.trim()).toContain('V I C T O R Y')
    })

    it('should not show rewards panel when victoryRewards is null', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', null)
      fixture.detectChanges()

      const rewardsArea = fixture.nativeElement.querySelector('.victory-rewards-area')
      expect(rewardsArea).toBeNull()
    })

    it('should display total XP when rewards exist', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({ totalXP: 2500 }))
      fixture.detectChanges()

      const xpBadge = fixture.nativeElement.querySelector('.reward-badge.xp')
      expect(xpBadge).toBeTruthy()
      const xpValue = xpBadge.querySelector('.reward-value')
      expect(xpValue.textContent).toContain('2,500')
    })

    it('should display XP label in badge', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({ xpPerCharacter: 417 }))
      fixture.detectChanges()

      const xpBadge = fixture.nativeElement.querySelector('.reward-badge.xp')
      const xpLabel = xpBadge.querySelector('.reward-label')
      expect(xpLabel.textContent).toContain('XP')
    })

    it('should display total gold when rewards exist', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({ totalGold: 1234 }))
      fixture.detectChanges()

      const goldBadge = fixture.nativeElement.querySelector('.reward-badge.gold')
      expect(goldBadge).toBeTruthy()
      const goldValue = goldBadge.querySelector('.reward-value')
      expect(goldValue.textContent).toContain('1,234')
    })

    it('should not show items row when items array is empty', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({ items: [] }))
      fixture.detectChanges()

      const itemsRow = fixture.nativeElement.querySelector('.items-row')
      expect(itemsRow).toBeNull()
    })

    it('should show items row when items exist', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem()]
      }))
      fixture.detectChanges()

      const itemsRow = fixture.nativeElement.querySelector('.items-row')
      expect(itemsRow).toBeTruthy()
    })

    it('should display identified item name', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem({ itemName: 'Enchanted Dagger', identified: true })]
      }))
      fixture.detectChanges()

      const itemTag = fixture.nativeElement.querySelector('.item-tag')
      expect(itemTag.textContent.trim()).toBe('Enchanted Dagger')
    })

    it('should display "???" for unidentified items', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem({ itemName: 'Secret Weapon', identified: false })]
      }))
      fixture.detectChanges()

      const itemTag = fixture.nativeElement.querySelector('.item-tag')
      expect(itemTag.textContent.trim()).toBe('???')
    })

    it('should apply .unidentified class to unidentified items', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem({ identified: false })]
      }))
      fixture.detectChanges()

      const itemTag = fixture.nativeElement.querySelector('.item-tag')
      expect(itemTag.classList.contains('unidentified')).toBe(true)
    })

    it('should not apply .unidentified class to identified items', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards({
        items: [createItem({ identified: true })]
      }))
      fixture.detectChanges()

      const itemTag = fixture.nativeElement.querySelector('.item-tag')
      expect(itemTag.classList.contains('unidentified')).toBe(false)
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

      const itemTags = fixture.nativeElement.querySelectorAll('.item-tag')
      expect(itemTags.length).toBe(3)
    })

    it('should show rewards area when victoryRewards is provided', () => {
      fixture.componentRef.setInput('visible', true)
      fixture.componentRef.setInput('showVictoryOverlay', true)
      fixture.componentRef.setInput('victoryRewards', createRewards())
      fixture.detectChanges()

      const rewardsArea = fixture.nativeElement.querySelector('.victory-rewards-area')
      expect(rewardsArea).toBeTruthy()
    })

    describe('Accessibility', () => {
      it('should have role="dialog" on victory overlay', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.detectChanges()

        const victoryOverlay = fixture.nativeElement.querySelector('.victory-fullbleed')
        expect(victoryOverlay.getAttribute('role')).toBe('dialog')
      })

      it('should have aria-labelledby pointing to victory heading', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.detectChanges()

        const victoryOverlay = fixture.nativeElement.querySelector('.victory-fullbleed')
        expect(victoryOverlay.getAttribute('aria-labelledby')).toBe('victory-heading')

        const heading = fixture.nativeElement.querySelector('#victory-heading')
        expect(heading).toBeTruthy()
        expect(heading.textContent.trim()).toContain('V I C T O R Y')
      })

      it('should have aria-modal="true" on victory overlay', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.detectChanges()

        const victoryOverlay = fixture.nativeElement.querySelector('.victory-fullbleed')
        expect(victoryOverlay.getAttribute('aria-modal')).toBe('true')
      })

      it('should have role="status" on rewards area', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.componentRef.setInput('victoryRewards', createRewards())
        fixture.detectChanges()

        const rewardsArea = fixture.nativeElement.querySelector('.victory-rewards-area')
        expect(rewardsArea.getAttribute('role')).toBe('status')
      })

      it('should have aria-live="polite" on rewards area', () => {
        fixture.componentRef.setInput('visible', true)
        fixture.componentRef.setInput('showVictoryOverlay', true)
        fixture.componentRef.setInput('victoryRewards', createRewards())
        fixture.detectChanges()

        const rewardsArea = fixture.nativeElement.querySelector('.victory-rewards-area')
        expect(rewardsArea.getAttribute('aria-live')).toBe('polite')
      })
    })
  })
})
