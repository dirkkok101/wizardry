# UI Design System

This document defines the Modern Retro-Fantasy design system used throughout the Wizardry remake.

## Aesthetic Philosophy

The design system balances **retro dungeon crawler aesthetics** with **modern UI polish**:

- **Primary palette**: Deep blacks and charcoals with gold/amber accents
- **Typography**: Fantasy serif for display, monospace for stats
- **Effects**: Soft gold glows instead of harsh green CRT effects
- **Cards**: Dark backgrounds with subtle gold borders

## Quick Reference

### Scene Layout Pattern

Every scene follows this flex container structure:

```html
<div class="scene-container">
  <app-scene-title title="SCENE NAME" [showPartyGold]="true" />
  <div class="scene-content">
    <!-- Main content with flex: 1 -->
  </div>
  <app-scene-footer [menuItems]="items" (itemSelected)="handle($event)" />
</div>
```

```scss
.scene-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color-bg-darkest);
}

.scene-content {
  flex: 1;
  min-height: 0;  // Critical: allows shrinking
  overflow: hidden;
  padding: var(--space-2);
}
```

### Character Display Options

| Component | Use Case | Example |
|-----------|----------|---------|
| **CharacterPanelComponent** | Party display (Castle Menu, Tavern, Maze) | Formation columns with HP bars |
| **CharacterCardComponent** | Detail views, character creation | Full stats with configurable fields |
| **Compact list** | Available characters, selection lists | Single-row items with actions |

### CharacterPanelComponent

```html
<app-character-panel
  [characters]="characters()"
  [actions]="getActions"
  [visibleActionTypes]="['inspect', 'cast-spell']"
  (actionClick)="handleAction($event)"
/>
```

**visibleActionTypes presets:**
- Maze: `['inspect', 'cast-spell']` (default)
- Tavern party: `['remove', 'inspect', 'moveUp', 'moveDown']`
- Castle Menu: `['inspect']`

### Compact List Pattern

For available characters or selection lists:

```html
<div class="character-list">
  @for (char of characters(); track char.id) {
    <div class="list-item">
      <span class="char-name">{{ char.name }}</span>
      <span class="char-info">{{ getClassAbbr(char.class) }} Lv{{ char.level }}</span>
      <div class="list-actions">
        <button class="action-btn" (click)="onAction(char.id)">Action</button>
      </div>
    </div>
  }
</div>
```

```scss
.character-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow-y: auto;
}

.list-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--card-border-radius);

  &:hover {
    border-color: var(--color-gold-dim);
    background: var(--color-bg-card-hover);
  }

  .char-name {
    font-family: var(--font-display);
    color: var(--color-text-gold);
  }

  .char-info {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }
}

.action-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-gold);
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  font-family: var(--font-body);
  cursor: pointer;
  border-radius: 2px;

  &:hover {
    background: var(--color-gold-primary);
    color: var(--color-bg-darkest);
  }
}
```

### Section Headers

Use consistent `.row-title` class for all section headers:

```html
<h3 class="row-title">Section Name</h3>
```

```scss
.row-title {
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  color: var(--color-gold-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-1);
  margin: 0;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
```

## Color Palette

### Core Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-bg-darkest` | `#0a0a0a` | Scene backgrounds |
| `--color-bg-card` | `#1a1a1a` | Card backgrounds |
| `--color-bg-card-hover` | `#252525` | Card hover |
| `--color-gold-primary` | `#d4a574` | Primary accent |
| `--color-text-gold` | `#d4a574` | Gold text |
| `--color-text-primary` | `#e0e0e0` | Primary text |
| `--color-text-secondary` | `#a0a0a0` | Secondary text |
| `--color-text-muted` | `#666` | Muted text |
| `--color-border` | `#333` | Borders |

### Status Colors

| Status | Variable |
|--------|----------|
| OK | `--color-status-ok` (#22c55e) |
| Poisoned | `--color-status-poisoned` (#a855f7) |
| Dead | `--color-status-dead` (#6b7280) |

### HP Colors

| Threshold | Variable |
|-----------|----------|
| >50% | `--color-hp-healthy` (#22c55e) |
| 25-50% | `--color-hp-warning` (#f59e0b) |
| <25% | `--color-hp-critical` (#ef4444) |

## Typography

| Variable | Value | Usage |
|----------|-------|-------|
| `--font-display` | `'Cinzel', serif` | Titles, headers |
| `--font-body` | `'JetBrains Mono', monospace` | Stats, buttons |
| `--font-size-xs` | `0.75rem` (12px) | Labels |
| `--font-size-sm` | `0.875rem` (14px) | Body |
| `--font-size-lg` | `1.125rem` (18px) | Section headers |
| `--font-size-xl` | `1.5rem` (24px) | Scene titles |

## Spacing

| Variable | Value |
|----------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |

## Responsive

### MacBook Air 13" (1440x900)

```scss
@media (max-height: 900px) {
  // Reduce padding and gaps
  .scene-content { padding: var(--space-2); }
  .formation-layout { gap: var(--space-2); }
}
```

## Implementation Checklist

When creating/updating a scene:

1. ✅ Use flex container pattern (container → content → footer)
2. ✅ Set `min-height: 0` on content area for proper shrinking
3. ✅ Use CSS custom properties (no legacy SCSS variables)
4. ✅ Use `--font-display` for titles, `--font-body` for content
5. ✅ Apply `.row-title` class for section headers
6. ✅ Add `@media (max-height: 900px)` for tighter spacing
7. ✅ Test footer visibility on smaller screens

## Completed Scenes

| Scene | Status | Pattern Used |
|-------|--------|--------------|
| Castle Menu | ✅ | CharacterPanel (2 columns) |
| Tavern | ✅ | Compact list + CharacterPanel |
| Temple | Needs update | - |
| Shop | Needs update | - |
| Inn | Needs update | - |
| Training Grounds | Needs update | - |
