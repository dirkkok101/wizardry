import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MonsterSpriteOverlayComponent, SpriteAnimationState } from '../monster-sprite-overlay.component'
import { MonsterGroup } from '@models/Combat'
import { createTestMonster } from '@testing/test-factories'

describe('MonsterSpriteOverlayComponent', () => {
  let component: MonsterSpriteOverlayComponent
  let fixture: ComponentFixture<MonsterSpriteOverlayComponent>

  const createTestGroup = (
    id: 'A' | 'B' | 'C' | 'D',
    formation: 'front' | 'back' = 'front',
    monsterCount = 3,
    identified = true
  ): MonsterGroup => ({
    id,
    monsters: Array.from({ length: monsterCount }, (_, i) =>
      createTestMonster({
        id: `${id}-${i}`,
        name: 'Kobold',
        monsterId: 'kobold',
        hp: 10,
        maxHp: 10
      })
    ),
    formation,
    identified
  })

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonsterSpriteOverlayComponent]
    }).compileComponents()

    fixture = TestBed.createComponent(MonsterSpriteOverlayComponent)
    component = fixture.componentInstance
  })

  describe('rendering', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy()
    })

    it('should display front row groups', () => {
      fixture.componentRef.setInput('monsterGroups', [createTestGroup('A', 'front')])
      fixture.detectChanges()

      expect(component.frontRowGroups().length).toBe(1)
      expect(component.backRowGroups().length).toBe(0)
    })

    it('should display back row groups', () => {
      fixture.componentRef.setInput('monsterGroups', [createTestGroup('B', 'back')])
      fixture.detectChanges()

      expect(component.frontRowGroups().length).toBe(0)
      expect(component.backRowGroups().length).toBe(1)
    })

    it('should separate front and back row groups correctly', () => {
      fixture.componentRef.setInput('monsterGroups', [
        createTestGroup('A', 'front'),
        createTestGroup('B', 'back'),
        createTestGroup('C', 'front'),
        createTestGroup('D', 'back')
      ])
      fixture.detectChanges()

      expect(component.frontRowGroups().length).toBe(2)
      expect(component.backRowGroups().length).toBe(2)
    })
  })

  describe('getFirstMonster', () => {
    it('should return first monster from group', () => {
      const group = createTestGroup('A')
      const result = component.getFirstMonster(group)
      expect(result).toBe(group.monsters[0])
    })

    it('should return undefined for empty monster array', () => {
      const group: MonsterGroup = {
        id: 'A',
        monsters: [],
        formation: 'front',
        identified: true
      }
      const result = component.getFirstMonster(group)
      expect(result).toBeUndefined()
    })
  })

  describe('getSpriteUrl', () => {
    it('should generate correct sprite URL for monster', () => {
      const monster = createTestMonster({ monsterId: 'kobold' })
      const url = component.getSpriteUrl(monster)
      expect(url).toBe('/assets/monsters/sprites/kobold.png')
    })

    it('should return unknown sprite URL for undefined monster', () => {
      const url = component.getSpriteUrl(undefined)
      expect(url).toBe('/assets/monsters/sprites/unknown.png')
    })
  })

  describe('sprite error tracking', () => {
    it('should track sprite errors by monsterId', () => {
      expect(component.hasSpriteError('kobold')).toBe(false)

      component.onSpriteError('kobold')

      expect(component.hasSpriteError('kobold')).toBe(true)
    })

    it('should return true for undefined monsterId', () => {
      expect(component.hasSpriteError(undefined)).toBe(true)
    })

    it('should track multiple sprite errors independently', () => {
      component.onSpriteError('kobold')
      component.onSpriteError('orc')

      expect(component.hasSpriteError('kobold')).toBe(true)
      expect(component.hasSpriteError('orc')).toBe(true)
      expect(component.hasSpriteError('goblin')).toBe(false)
    })
  })

  describe('getAliveCount', () => {
    it('should count alive monsters correctly', () => {
      const group = createTestGroup('A', 'front', 4)
      group.monsters[0].hp = 0 // Kill one monster
      group.monsters[2].hp = 0 // Kill another

      expect(component.getAliveCount(group)).toBe(2)
    })

    it('should return 0 for all dead monsters', () => {
      const group = createTestGroup('A', 'front', 3)
      group.monsters.forEach(m => (m.hp = 0))

      expect(component.getAliveCount(group)).toBe(0)
    })

    it('should return full count when all alive', () => {
      const group = createTestGroup('A', 'front', 5)

      expect(component.getAliveCount(group)).toBe(5)
    })
  })

  describe('hasAliveMonsters', () => {
    it('should return true when some monsters are alive', () => {
      const group = createTestGroup('A', 'front', 3)
      group.monsters[0].hp = 0

      expect(component.hasAliveMonsters(group)).toBe(true)
    })

    it('should return false when all monsters are dead', () => {
      const group = createTestGroup('A', 'front', 3)
      group.monsters.forEach(m => (m.hp = 0))

      expect(component.hasAliveMonsters(group)).toBe(false)
    })
  })

  describe('targeting', () => {
    it('should emit groupClicked when targetable group is clicked', () => {
      fixture.componentRef.setInput('isTargetingMode', true)
      const emitSpy = jest.spyOn(component.groupClicked, 'emit')

      component.onGroupClick('A')

      expect(emitSpy).toHaveBeenCalledWith('A')
    })

    it('should not emit groupClicked when not in targeting mode', () => {
      fixture.componentRef.setInput('isTargetingMode', false)
      const emitSpy = jest.spyOn(component.groupClicked, 'emit')

      component.onGroupClick('A')

      expect(emitSpy).not.toHaveBeenCalled()
    })
  })

  describe('animations', () => {
    it('should detect active damage-flash animation on group', () => {
      const anim: SpriteAnimationState = {
        groupId: 'A',
        monsterIndex: 0,
        animation: 'damage-flash'
      }
      fixture.componentRef.setInput('animationQueue', [anim])
      fixture.detectChanges()

      expect(component.hasGroupAnimation('A', 'damage-flash')).toBe(true)
      expect(component.hasGroupAnimation('A', 'dying')).toBe(false)
      expect(component.hasGroupAnimation('B', 'damage-flash')).toBe(false)
    })

    it('should detect active dying animation on group', () => {
      const anim: SpriteAnimationState = {
        groupId: 'B',
        monsterIndex: 1,
        animation: 'dying'
      }
      fixture.componentRef.setInput('animationQueue', [anim])
      fixture.detectChanges()

      expect(component.hasGroupAnimation('B', 'dying')).toBe(true)
    })

    it('should emit animationComplete for all monsters when group animation ends', () => {
      const anims: SpriteAnimationState[] = [
        { groupId: 'A', monsterIndex: 0, animation: 'damage-flash' },
        { groupId: 'A', monsterIndex: 1, animation: 'damage-flash' },
        { groupId: 'A', monsterIndex: 2, animation: 'damage-flash' }
      ]
      fixture.componentRef.setInput('animationQueue', anims)
      fixture.detectChanges()

      const emitSpy = jest.spyOn(component.animationComplete, 'emit')

      component.onGroupAnimationEnd('A')

      expect(emitSpy).toHaveBeenCalledTimes(3)
    })

    it('should clear animations after group animation ends', () => {
      const anim: SpriteAnimationState = {
        groupId: 'A',
        monsterIndex: 0,
        animation: 'damage-flash'
      }
      fixture.componentRef.setInput('animationQueue', [anim])
      fixture.detectChanges()

      expect(component.hasGroupAnimation('A', 'damage-flash')).toBe(true)

      component.onGroupAnimationEnd('A')

      expect(component.hasGroupAnimation('A', 'damage-flash')).toBe(false)
    })

    it('should not affect other groups when animation ends', () => {
      const anims: SpriteAnimationState[] = [
        { groupId: 'A', monsterIndex: 0, animation: 'damage-flash' },
        { groupId: 'B', monsterIndex: 0, animation: 'damage-flash' }
      ]
      fixture.componentRef.setInput('animationQueue', anims)
      fixture.detectChanges()

      component.onGroupAnimationEnd('A')

      expect(component.hasGroupAnimation('A', 'damage-flash')).toBe(false)
      expect(component.hasGroupAnimation('B', 'damage-flash')).toBe(true)
    })
  })

  describe('ARIA accessibility', () => {
    it('should generate correct ARIA label for alive group', () => {
      const group = createTestGroup('A', 'front', 3)
      fixture.componentRef.setInput('monsterGroups', [group])
      fixture.detectChanges()

      const label = component.getGroupAriaLabel(group)

      expect(label).toContain('Group A')
      expect(label).not.toContain('defeated')
    })

    it('should include defeated status in ARIA label', () => {
      const group = createTestGroup('A', 'front', 3)
      group.monsters.forEach(m => (m.hp = 0))
      fixture.componentRef.setInput('monsterGroups', [group])
      fixture.detectChanges()

      const label = component.getGroupAriaLabel(group)

      expect(label).toContain('Group A')
      expect(label).toContain('defeated')
    })

    it('should include selected status in ARIA label', () => {
      const group = createTestGroup('A', 'front', 3)
      fixture.componentRef.setInput('monsterGroups', [group])
      fixture.componentRef.setInput('selectedGroupId', 'A')
      fixture.detectChanges()

      const label = component.getGroupAriaLabel(group)

      expect(label).toContain('selected')
    })
  })

  describe('getSpriteAltText', () => {
    it('should generate descriptive alt text', () => {
      const group = createTestGroup('A', 'front', 3)
      fixture.componentRef.setInput('monsterGroups', [group])
      fixture.detectChanges()

      const altText = component.getSpriteAltText(group)

      expect(altText).toContain('Group A')
    })
  })

  describe('edge cases', () => {
    it('should handle empty monster groups array', () => {
      fixture.componentRef.setInput('monsterGroups', [])
      fixture.detectChanges()

      expect(component.frontRowGroups().length).toBe(0)
      expect(component.backRowGroups().length).toBe(0)
    })

    it('should handle group with empty monsters array', () => {
      const emptyGroup: MonsterGroup = {
        id: 'A',
        monsters: [],
        formation: 'front',
        identified: true
      }

      expect(component.getFirstMonster(emptyGroup)).toBeUndefined()
      expect(component.getAliveCount(emptyGroup)).toBe(0)
      expect(component.hasAliveMonsters(emptyGroup)).toBe(false)
      expect(component.getSpriteInitial(emptyGroup)).toBe('?')
    })
  })

  describe('getGroupColor', () => {
    it('should return correct colors for each group', () => {
      expect(component.getGroupColor('A')).toBe('#ff6b6b')
      expect(component.getGroupColor('B')).toBe('#4ecdc4')
      expect(component.getGroupColor('C')).toBe('#ffe66d')
      expect(component.getGroupColor('D')).toBe('#a8e6cf')
    })
  })

  describe('getRevealDelay', () => {
    it('should calculate front row delays', () => {
      expect(component.getRevealDelay(0, false)).toBe('0ms')
      expect(component.getRevealDelay(1, false)).toBe('100ms')
      expect(component.getRevealDelay(2, false)).toBe('200ms')
    })

    it('should calculate back row delays with offset', () => {
      expect(component.getRevealDelay(0, true)).toBe('300ms')
      expect(component.getRevealDelay(1, true)).toBe('400ms')
      expect(component.getRevealDelay(2, true)).toBe('500ms')
    })
  })
})
