import { EmptyStateComponent } from '../empty-state.component'

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent

  beforeEach(() => {
    component = new EmptyStateComponent()
  })

  describe('default values', () => {
    it('variant defaults to "default"', () => {
      expect(component.variant).toBe('default')
    })

    it('subtitle defaults to undefined', () => {
      expect(component.subtitle).toBeUndefined()
    })
  })

  describe('inputs', () => {
    it('accepts title input', () => {
      component.title = 'No party formed'
      expect(component.title).toBe('No party formed')
    })

    it('accepts subtitle input', () => {
      component.subtitle = 'Visit the Tavern to recruit adventurers'
      expect(component.subtitle).toBe('Visit the Tavern to recruit adventurers')
    })

    it('accepts variant "default"', () => {
      component.variant = 'default'
      expect(component.variant).toBe('default')
    })

    it('accepts variant "inline"', () => {
      component.variant = 'inline'
      expect(component.variant).toBe('inline')
    })
  })

  describe('usage scenarios', () => {
    it('can be configured for Castle Menu empty state', () => {
      component.title = 'No party formed'
      component.subtitle = 'Visit the Tavern to recruit adventurers'
      component.variant = 'default'

      expect(component.title).toBe('No party formed')
      expect(component.subtitle).toBe('Visit the Tavern to recruit adventurers')
      expect(component.variant).toBe('default')
    })

    it('can be configured for Tavern inline empty state', () => {
      component.title = 'Empty'
      component.variant = 'inline'

      expect(component.title).toBe('Empty')
      expect(component.subtitle).toBeUndefined()
      expect(component.variant).toBe('inline')
    })

    it('can be configured for Temple empty state', () => {
      component.title = 'Your party is in good health'
      component.subtitle = 'No one requires the temple\'s services'
      component.variant = 'default'

      expect(component.title).toBe('Your party is in good health')
      expect(component.subtitle).toBe('No one requires the temple\'s services')
    })

    it('can be configured for Training Grounds empty state', () => {
      component.title = 'No characters available'
      component.subtitle = 'Create your first adventurer to begin!'
      component.variant = 'default'

      expect(component.title).toBe('No characters available')
      expect(component.subtitle).toBe('Create your first adventurer to begin!')
    })
  })
})
