import { SpriteService } from '../SpriteService'
import { Race } from '@models/Race'
import { CharacterClass } from '@models/CharacterClass'

describe('SpriteService', () => {
  describe('getAllSprites', () => {
    it('returns all 20 available sprites', () => {
      const sprites = SpriteService.getAllSprites()
      expect(sprites).toHaveLength(20)
    })

    it('returns sprites with expected structure', () => {
      const sprites = SpriteService.getAllSprites()
      for (const sprite of sprites) {
        expect(sprite.id).toMatch(/^[a-z]+_[a-z]+$/)
        expect(sprite.url).toContain('/assets/sprites/characters/')
        expect(sprite.url.endsWith('.png')).toBe(true)
        expect(sprite.displayName).toBeTruthy()
        expect(sprite.race).toBeTruthy()
        expect(sprite.classType).toBeTruthy()
      }
    })

    it('covers all race and base class combinations', () => {
      const sprites = SpriteService.getAllSprites()
      const races = ['human', 'elf', 'dwarf', 'gnome', 'hobbit']
      const classes = ['fighter', 'mage', 'priest', 'thief']

      for (const race of races) {
        for (const cls of classes) {
          const found = sprites.find(s => s.race === race && s.classType === cls)
          expect(found).toBeDefined()
        }
      }
    })
  })

  describe('getSpriteById', () => {
    it('returns sprite for valid ID', () => {
      const sprite = SpriteService.getSpriteById('human_fighter')
      expect(sprite).toBeDefined()
      expect(sprite?.id).toBe('human_fighter')
      expect(sprite?.displayName).toBe('Human Fighter')
    })

    it('returns undefined for invalid ID', () => {
      const sprite = SpriteService.getSpriteById('invalid_sprite')
      expect(sprite).toBeUndefined()
    })
  })

  describe('suggestSprite', () => {
    it('suggests human_fighter for Human Fighter', () => {
      const sprite = SpriteService.suggestSprite(Race.HUMAN, CharacterClass.FIGHTER)
      expect(sprite?.id).toBe('human_fighter')
    })

    it('suggests elf_mage for Elf Mage', () => {
      const sprite = SpriteService.suggestSprite(Race.ELF, CharacterClass.MAGE)
      expect(sprite?.id).toBe('elf_mage')
    })

    it('suggests dwarf_priest for Dwarf Priest', () => {
      const sprite = SpriteService.suggestSprite(Race.DWARF, CharacterClass.PRIEST)
      expect(sprite?.id).toBe('dwarf_priest')
    })

    it('suggests gnome_thief for Gnome Thief', () => {
      const sprite = SpriteService.suggestSprite(Race.GNOME, CharacterClass.THIEF)
      expect(sprite?.id).toBe('gnome_thief')
    })

    describe('advanced class mappings', () => {
      it('maps Bishop to priest sprite type', () => {
        const sprite = SpriteService.suggestSprite(Race.ELF, CharacterClass.BISHOP)
        expect(sprite?.id).toBe('elf_priest')
      })

      it('maps Samurai to fighter sprite type', () => {
        const sprite = SpriteService.suggestSprite(Race.HUMAN, CharacterClass.SAMURAI)
        expect(sprite?.id).toBe('human_fighter')
      })

      it('maps Lord to fighter sprite type', () => {
        const sprite = SpriteService.suggestSprite(Race.HOBBIT, CharacterClass.LORD)
        expect(sprite?.id).toBe('hobbit_fighter')
      })

      it('maps Ninja to thief sprite type', () => {
        const sprite = SpriteService.suggestSprite(Race.DWARF, CharacterClass.NINJA)
        expect(sprite?.id).toBe('dwarf_thief')
      })
    })
  })

  describe('getSpriteUrl', () => {
    it('returns explicit spriteId URL when set', () => {
      const url = SpriteService.getSpriteUrl({
        spriteId: 'elf_mage',
        race: Race.HUMAN,
        class: CharacterClass.FIGHTER
      })
      expect(url).toBe('/assets/sprites/characters/elf_mage.png')
    })

    it('derives URL from race+class when spriteId not set', () => {
      const url = SpriteService.getSpriteUrl({
        race: Race.DWARF,
        class: CharacterClass.THIEF
      })
      expect(url).toBe('/assets/sprites/characters/dwarf_thief.png')
    })

    it('derives URL from race+class when spriteId is undefined', () => {
      const url = SpriteService.getSpriteUrl({
        spriteId: undefined,
        race: Race.GNOME,
        class: CharacterClass.MAGE
      })
      expect(url).toBe('/assets/sprites/characters/gnome_mage.png')
    })

    it('falls back to derived URL for invalid spriteId', () => {
      const url = SpriteService.getSpriteUrl({
        spriteId: 'invalid_sprite',
        race: Race.HOBBIT,
        class: CharacterClass.PRIEST
      })
      expect(url).toBe('/assets/sprites/characters/hobbit_priest.png')
    })

    it('handles advanced classes correctly', () => {
      const url = SpriteService.getSpriteUrl({
        race: Race.ELF,
        class: CharacterClass.BISHOP
      })
      expect(url).toBe('/assets/sprites/characters/elf_priest.png')
    })
  })

  describe('carousel navigation', () => {
    describe('getNextSprite', () => {
      it('returns next sprite in sequence', () => {
        const next = SpriteService.getNextSprite('human_fighter')
        expect(next.id).toBe('human_mage')
      })

      it('wraps around at end of list', () => {
        const sprites = SpriteService.getAllSprites()
        const lastSprite = sprites[sprites.length - 1]
        const next = SpriteService.getNextSprite(lastSprite.id)
        expect(next.id).toBe(sprites[0].id)
      })

      it('returns first sprite for invalid ID', () => {
        const next = SpriteService.getNextSprite('invalid_id')
        const sprites = SpriteService.getAllSprites()
        expect(next.id).toBe(sprites[0].id)
      })
    })

    describe('getPreviousSprite', () => {
      it('returns previous sprite in sequence', () => {
        const prev = SpriteService.getPreviousSprite('human_mage')
        expect(prev.id).toBe('human_fighter')
      })

      it('wraps around at start of list', () => {
        const sprites = SpriteService.getAllSprites()
        const firstSprite = sprites[0]
        const prev = SpriteService.getPreviousSprite(firstSprite.id)
        expect(prev.id).toBe(sprites[sprites.length - 1].id)
      })

      it('returns last sprite for invalid ID', () => {
        const prev = SpriteService.getPreviousSprite('invalid_id')
        const sprites = SpriteService.getAllSprites()
        expect(prev.id).toBe(sprites[sprites.length - 1].id)
      })
    })

    describe('getSpriteAtIndex', () => {
      it('returns sprite at valid index', () => {
        const sprite = SpriteService.getSpriteAtIndex(0)
        expect(sprite.id).toBe('human_fighter')
      })

      it('wraps positive overflow', () => {
        const total = SpriteService.getSpriteCount()
        const sprite = SpriteService.getSpriteAtIndex(total)
        expect(sprite.id).toBe('human_fighter')
      })

      it('wraps negative index', () => {
        const total = SpriteService.getSpriteCount()
        const sprite = SpriteService.getSpriteAtIndex(-1)
        const sprites = SpriteService.getAllSprites()
        expect(sprite.id).toBe(sprites[total - 1].id)
      })
    })
  })

  describe('getSpriteIndex', () => {
    it('returns correct index for valid sprite', () => {
      const index = SpriteService.getSpriteIndex('human_fighter')
      expect(index).toBe(0)
    })

    it('returns -1 for invalid sprite', () => {
      const index = SpriteService.getSpriteIndex('invalid_id')
      expect(index).toBe(-1)
    })
  })

  describe('getSpriteCount', () => {
    it('returns 20', () => {
      expect(SpriteService.getSpriteCount()).toBe(20)
    })
  })
})
