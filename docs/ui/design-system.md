# UI Design System

This document defines the Modern Retro-Fantasy design system used throughout the Wizardry remake.

## Aesthetic Philosophy

The design system balances **retro dungeon crawler aesthetics** with **modern UI polish**:

- **Primary palette**: Deep blacks and charcoals with gold/amber accents
- **Typography**: Fantasy serif for display, monospace for stats
- **Effects**: Soft gold glows instead of harsh green CRT effects
- **Cards**: Dark backgrounds with subtle gold borders

This creates an atmosphere that honors the 1981 original while providing a polished modern experience.

## Color Palette

### Background Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-bg-darkest` | `#0a0a0a` | Primary scene backgrounds |
| `--color-bg-dark` | `#121212` | Secondary backgrounds |
| `--color-bg-card` | `#1a1a1a` | Card backgrounds |
| `--color-bg-card-hover` | `#252525` | Card hover state |

### Gold/Amber Accents

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-gold-primary` | `#d4a574` | Primary gold accent (borders, text) |
| `--color-gold-bright` | `#f4c430` | Bright gold (highlights, hover) |
| `--color-gold-dim` | `rgba(212, 165, 116, 0.6)` | Dimmed gold (secondary elements) |
| `--color-text-gold` | `#d4a574` | Gold text for emphasis |

### Text Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-text-primary` | `#e0e0e0` | Primary text |
| `--color-text-secondary` | `#a0a0a0` | Secondary/label text |
| `--color-text-muted` | `#666` | Disabled/muted text |

### Status Colors

| Status | Variable | Value |
|--------|----------|-------|
| OK | `--color-status-ok` | `#22c55e` |
| Poisoned | `--color-status-poisoned` | `#a855f7` |
| Paralyzed | `--color-status-paralyzed` | `#3b82f6` |
| Asleep | `--color-status-asleep` | `#6366f1` |
| Stoned | `--color-status-stoned` | `#78716c` |
| Dead | `--color-status-dead` | `#6b7280` |
| Ashes | `--color-status-ashes` | `#44403c` |
| Lost | `--color-status-lost` | `#1c1917` |

### HP Colors

| Threshold | Variable | Value |
|-----------|----------|-------|
| >50% | `--color-hp-healthy` | `#22c55e` |
| 25-50% | `--color-hp-warning` | `#f59e0b` |
| <25% | `--color-hp-critical` | `#ef4444` |

### Semantic Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-danger` | `#dc2626` | Error states, dangerous actions |
| `--color-warning` | `#f59e0b` | Warnings |
| `--color-magic` | `#818cf8` | Spell points, magic effects |

## Typography

### Font Families

| Variable | Value | Usage |
|----------|-------|-------|
| `--font-display` | `'Cinzel', Georgia, serif` | Scene titles, headers |
| `--font-body` | `'JetBrains Mono', monospace` | Stats, buttons, body text |

### Font Sizes

| Variable | Value | Pixels |
|----------|-------|--------|
| `--font-size-xs` | `0.75rem` | 12px |
| `--font-size-sm` | `0.875rem` | 14px |
| `--font-size-base` | `1rem` | 16px |
| `--font-size-lg` | `1.125rem` | 18px |
| `--font-size-xl` | `1.5rem` | 24px |

## Spacing System

Uses a 4px base unit:

| Variable | Value |
|----------|-------|
| `--space-1` | `0.25rem` (4px) |
| `--space-2` | `0.5rem` (8px) |
| `--space-3` | `0.75rem` (12px) |
| `--space-4` | `1rem` (16px) |
| `--space-6` | `1.5rem` (24px) |
| `--space-8` | `2rem` (32px) |

## Card System

### Card Properties

| Variable | Value |
|----------|-------|
| `--card-border-radius` | `4px` |
| `--card-border` | `1px solid var(--color-border)` |
| `--card-shadow` | `0 2px 8px rgba(0, 0, 0, 0.4)` |
| `--card-shadow-hover` | `0 4px 12px rgba(0, 0, 0, 0.5)` |

### Card Variants

#### CharacterCardComponent

Full-featured character display with two variants:

**Default variant** (`variant="default"`):
- Full height with dividers
- Larger padding and spacing
- Best for: dedicated character views, character creation

**Compact variant** (`variant="compact"`):
- Minimal height, no dividers
- Tight padding
- Best for: grids, dense layouts

```html
<!-- Default for detail views -->
<app-character-card [character]="char" />

<!-- Compact for dense layouts -->
<app-character-card [character]="char" variant="compact" />
```

#### CharacterPanelComponent

Ultra-compact vertical stack for space-constrained layouts:
- Single-line name + status code
- Class/Level + AC on one line
- Inline HP bar with percentage
- Weapon and spell points rows
- Best for: maze sidebars, formation columns

```html
<app-character-panel
  [characters]="frontRowCharacters()"
  [actions]="getActionsForCharacter"
  (actionClick)="handleAction($event)"
/>
```

## Shared Components

### SceneTitleComponent

Scene header with gold accent styling:

```html
<app-scene-title title="CASTLE" [showPartyGold]="true" />
```

Features:
- Cinzel display font
- Gold accent border-bottom
- Optional party gold display

### SceneFooterComponent

Footer menu with gold-themed buttons:

```html
<app-scene-footer
  [menuItems]="footerMenuItems()"
  (itemSelected)="handleFooterAction($event)"
/>
```

Features:
- Charcoal background
- Gold text for menu items
- Hover: gold highlight effect
- Keyboard shortcut support

### PartyCharacterGridComponent

Wraps CharacterCardComponent in a responsive grid:

```html
<app-party-character-grid
  source="party"
  variant="compact"
  [showFormation]="true"
  [visibleFields]="['class', 'level', 'hp']"
  [actions]="[{ type: 'inspect' }]"
  (actionClick)="handleAction($event)"
/>
```

## Responsive Design

### Target Screen: MacBook Air 13"

Primary design target is 1440x900 viewport.

### Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Desktop | >900px | Full layout |
| Tablet | 768-900px | Responsive grid adjustments |
| Mobile | <768px | Single column layout |

### Height-based Adjustments

```scss
@media (max-height: 900px) {
  // Tighter spacing for MacBook Air
  .party-section {
    padding: var(--space-2);
  }
}
```

## Animation Guidelines

### Transitions

| Variable | Value | Usage |
|----------|-------|-------|
| `--transition-fast` | `150ms ease` | Hovers, small interactions |
| `--transition-normal` | `250ms ease` | State changes |

### HP Bar Animation

Critical HP bars have a pulsing animation:

```scss
@keyframes pulse-critical {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

## Implementation Checklist

When creating a new scene:

1. Use `--color-bg-darkest` as the primary background
2. Import shared components (SceneTitle, SceneFooter)
3. Use CSS custom properties for all colors and spacing
4. Follow the card variant guidelines for character display
5. Add responsive breakpoints for smaller screens
6. Use `--font-display` for titles, `--font-body` for content

## File Reference

| File | Purpose |
|------|---------|
| `src/styles/variables.scss` | CSS custom properties |
| `src/styles/_design-tokens.scss` | SCSS variables |
| `src/styles/_card-mixins.scss` | Reusable card mixins |
| `src/index.html` | Google Fonts imports |
