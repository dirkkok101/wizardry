# Maze Visual Guide: CRT Retro Aesthetic

**Complete documentation of the CRT visual polish system for Wizardry 1 Maze Scene.**

---

## Overview

The Wizardry 1 remake uses a carefully crafted CRT (Cathode Ray Tube) retro aesthetic to evoke the feeling of early 1980s computer displays. This document details all visual effects, CSS custom properties, component styles, and usage guidelines to maintain visual consistency throughout the application.

**Design Philosophy:**
- **Authentic Retro Feel:** Phosphor green monochrome display with scanlines and glow effects
- **Performance First:** All effects use CSS/SVG, no heavy canvas filters
- **Responsive Design:** Adapts gracefully from desktop to mobile
- **Accessibility:** High contrast, clear text, readable at all sizes
- **Immersive Experience:** Consistent theme across all UI components

---

## Color Palette

### Primary Colors

| Variable | Hex/RGBA | Usage |
|----------|----------|-------|
| `--crt-green` | `#0f0` (`#00ff00`) | Primary text and UI elements |
| `--crt-green-dark` | `#080` (`#008800`) | Dimmed/disabled text |
| `--crt-green-dim` | `rgba(0, 255, 0, 0.6)` | Transparent borders, overlays |
| `--crt-green-glow` | `rgba(0, 255, 0, 0.8)` | Glow/shadow effects |
| `--crt-black` | `#000` (`#000000`) | Pure black background |

### Background Colors

| Variable | RGBA | Usage |
|----------|------|-------|
| `--crt-bg-dark` | `rgba(0, 20, 0, 0.9)` | Footer, darkest panels |
| `--crt-bg-medium` | `rgba(0, 20, 0, 0.6)` | Standard panels, cards |
| `--crt-bg-light` | `rgba(0, 20, 0, 0.8)` | Lighter backgrounds (reserved) |

### Legacy SCSS Variables

These are defined in `src/styles/variables.scss` for backward compatibility:

| Variable | Hex | Equivalent CSS Custom Property |
|----------|-----|-------------------------------|
| `$color-bg-black` | `#000000` | `--crt-black` |
| `$color-text-green` | `#00ff00` | `--crt-green` |
| `$color-text-bright` | `#00ff88` | Brighter variant |
| `$color-text-dim` | `#008800` | `--crt-green-dark` |
| `$color-amber` | `#ffaa00` | Gold/currency display |
| `$color-error` | `#ff0000` | Error messages |

**Migration Note:** New components should prefer CSS custom properties (`var(--crt-*)`) over SCSS variables for consistency and runtime theming support.

---

## Visual Effects

### 1. Scanline Effect

**Purpose:** Mimics horizontal scan lines of CRT monitors

**Implementation:**
```scss
&::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 1;
}
```

**Applied To:**
- Maze canvas (fine 2px scanlines)
- Body element (global 4px scanlines)

**Performance:** Pure CSS, no JavaScript required

---

### 2. Phosphor Glow Effect

**Purpose:** Simulates phosphor screen glow characteristic of CRT displays

**Glow Levels:**

| Variable | Box Shadow | Usage |
|----------|-----------|-------|
| `--crt-glow-sm` | `0 0 3px var(--crt-green-glow)` | Small text, subtle highlights |
| `--crt-glow-md` | `0 0 5px var(--crt-green-glow), 0 0 10px rgba(0, 255, 0, 0.4)` | Titles, emphasized text |
| `--crt-glow-lg` | `0 0 10px var(--crt-green-glow), 0 0 20px rgba(0, 255, 0, 0.6)` | Buttons on hover, strong emphasis |

**Implementation Examples:**

```scss
// Small glow for character names
.character-name {
  text-shadow: var(--crt-glow-sm);
}

// Medium glow for scene titles
app-scene-title h1 {
  text-shadow: var(--crt-glow-md);
  letter-spacing: 2px;
}

// Large glow for interactive elements on hover
.menu__item:hover {
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}
```

---

### 3. Border and Panel Effects

**Border Style:**
```scss
--crt-border: 2px solid var(--crt-green);
```

**Panel Shadow Effect:**
```scss
.crt-panel {
  background: var(--crt-bg-medium);
  border: var(--crt-border);
  border-radius: 4px;
  box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.1),  // Inner glow
              0 2px 5px rgba(0, 255, 0, 0.2);        // Outer shadow
}
```

**Purpose:** Creates depth and luminous quality typical of CRT screens

---

### 4. Image Rendering

**Canvas Pixelation:**
```scss
.maze-canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

**Purpose:** Prevents anti-aliasing blur on pixel art, maintains sharp retro aesthetic

**Browser Support:**
- `pixelated` - Modern browsers (Chrome, Firefox, Safari)
- `crisp-edges` - Fallback for older browsers

---

## Component Styling

### Maze Canvas Component

**File:** `src/components/maze-view/maze-view.component.scss`

```scss
.maze-canvas {
  display: block;
  width: 100%;
  height: 100%;
  max-width: 600px;
  max-height: 600px;
  background: var(--crt-black);
  border: var(--crt-border);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  cursor: crosshair;

  // CRT phosphor glow effect
  filter: drop-shadow(0 0 3px var(--crt-green-glow))
          drop-shadow(0 0 8px rgba(0, 255, 0, 0.4));

  // Scanline overlay
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.15),
      rgba(0, 0, 0, 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
    pointer-events: none;
    z-index: 1;
  }

  // Subtle screen curvature
  border-radius: 4px;
  box-shadow: inset 0 0 20px rgba(0, 255, 0, 0.1);
}
```

**Visual Effects Applied:**
1. Green phosphor glow around canvas edges
2. Horizontal scanlines (2px interval)
3. Inset shadow for screen depth
4. Pixelated rendering for sharp pixels
5. Subtle rounded corners (4px)

---

### Scene Footer Component

**File:** `src/components/scene-footer/scene-footer.component.scss`

```scss
.scene-footer {
  background: var(--crt-bg-dark);
  border-top: var(--crt-border);
  padding: 1rem;
  box-shadow: 0 -2px 10px rgba(0, 255, 0, 0.3);

  // Menu items styled as glowing buttons
  .menu__item {
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid rgba(0, 255, 0, 0.5);
    color: var(--crt-green);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-shadow: 0 0 2px var(--crt-green-dim);

    &:hover:not(.menu__item--disabled) {
      background: rgba(0, 255, 0, 0.1);
      border-color: var(--crt-green);
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
      transform: translateY(-2px);
    }

    &:active:not(.menu__item--disabled) {
      transform: translateY(0);
    }

    &--disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
  }
}
```

**Interactive Effects:**
- Hover: Brightens background, intensifies glow, lifts element
- Active: Returns to baseline position (tactile feedback)
- Disabled: 30% opacity, no interaction

**Responsive Adjustments (Mobile):**
```scss
@media (max-width: 768px) {
  .scene-footer {
    padding: 0.75rem;

    .menu__item {
      padding: 0.4rem 0.75rem;
      font-size: 0.75rem;
    }
  }
}
```

---

### Scene Title Component

**File:** `src/components/scene-title/scene-title.component.scss`

Enhanced with CRT glow effect:

```scss
app-scene-title {
  border-bottom: var(--crt-border);
  box-shadow: 0 2px 10px rgba(0, 255, 0, 0.3);

  ::ng-deep h1 {
    text-shadow: var(--crt-glow-md);
    letter-spacing: 2px;
  }
}
```

**Typography Effects:**
- Medium glow on title text
- Increased letter spacing (2px) for retro aesthetic
- Green border glow beneath header

---

### Character Card Component

**File:** `src/components/character-card/character-card.component.scss`

Enhanced for maze scene:

```scss
app-character-card {
  ::ng-deep .character-card {
    background: var(--crt-bg-medium);
    border: 2px solid var(--crt-green-dim);
    box-shadow: inset 0 0 5px rgba(0, 255, 0, 0.1),
                0 2px 5px rgba(0, 255, 0, 0.2);

    .character-name {
      text-shadow: var(--crt-glow-sm);
    }
  }
}
```

**Visual Hierarchy:**
- Semi-transparent green background
- Dimmed border for secondary emphasis
- Small glow on character names
- Inset shadow for depth

---

## Global Utility Classes

**File:** `src/styles/variables.scss`

### CRT Text Class

```scss
.crt-text {
  font-family: 'Courier New', monospace;
  color: var(--crt-green);
  text-shadow: var(--crt-glow-sm);
}
```

**Usage:** Apply to any text element for instant CRT styling

**Example:**
```html
<div class="crt-text">SYSTEM READY</div>
```

---

### CRT Panel Class

```scss
.crt-panel {
  background: var(--crt-bg-medium);
  border: var(--crt-border);
  border-radius: 4px;
  box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.1),
              0 2px 5px rgba(0, 255, 0, 0.2);
}
```

**Usage:** Apply to container elements for consistent panel styling

**Example:**
```html
<div class="crt-panel">
  <h2>Party Status</h2>
  <ul>...</ul>
</div>
```

---

## Typography

### Font Stack

```scss
font-family: 'Courier New', monospace;
```

**Rationale:** Courier New is universally available and evokes 1980s computer terminals

**Fallback Chain:**
1. Courier New (preferred)
2. Courier (macOS fallback)
3. monospace (system fallback)

### Font Sizes

| Variable | Size | Usage |
|----------|------|-------|
| `$font-size-base` | `16px` | Standard body text |
| `$font-size-large` | `20px` | Character names, emphasis |
| `$font-size-small` | `14px` | Secondary info, shortcuts |

### Text Effects

```scss
// Letter spacing for titles
letter-spacing: 2px;

// Text shadow for glow
text-shadow: var(--crt-glow-sm);   // Subtle
text-shadow: var(--crt-glow-md);   // Medium
```

---

## Layout and Spacing

### Screen Dimensions

```scss
$screen-width: 640px;   // 4:3 aspect ratio width
$screen-height: 480px;  // 4:3 aspect ratio height
```

**Purpose:** Maintains retro 640x480 VGA resolution proportions

### Spacing Scale

```scss
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
```

**Usage Guidelines:**
- `xs` - Minimal gaps between related elements
- `sm` - Button padding, tight layouts
- `md` - Standard padding, default gaps
- `lg` - Section spacing, panel padding
- `xl` - Major layout separations

---

## Responsive Breakpoints

### Desktop (Default)
- Full canvas size (600x600px max)
- 2-column grid layout for maze + party panel
- Standard padding and spacing

### Tablet (768px and below)

```scss
@media (max-width: 768px) {
  grid-template-columns: 1fr;  // Single column
  grid-template-rows: auto 1fr;

  .maze-viewport {
    min-height: 300px;
    max-height: 400px;
  }

  .scene-footer {
    padding: 0.75rem;  // Reduced padding
  }
}
```

### Mobile (480px and below)

```scss
@media (max-width: 480px) {
  .maze-viewport {
    min-height: 250px;
    max-height: 300px;
  }

  .party-grid {
    grid-template-columns: 1fr 1fr;  // 2-column character cards
    gap: 0.25rem;
  }

  .scene-footer .menu__item {
    padding: 0.4rem 0.75rem;
    font-size: 0.75rem;
  }
}
```

**Design Principles:**
1. Content priority: Canvas remains visible on all screens
2. Touch targets: Minimum 44px height on mobile
3. Font scaling: Reduce to 0.75rem on smallest screens
4. Padding reduction: Maximize usable screen space

---

## Animation and Transitions

### Hover Transitions

```scss
.menu__item {
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
}
```

**Timing:** 0.2s (200ms) - Fast enough to feel instant, slow enough to see

**Properties Animated:**
- `background-color` - Fade in/out
- `border-color` - Glow intensity
- `box-shadow` - Glow spread
- `transform` - Lift effect

### Loading Animation

```scss
@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}
```

**Usage:** Loading overlay while assets load or maps generate

---

## Accessibility Considerations

### High Contrast

The green-on-black color scheme provides excellent contrast:
- Contrast ratio: 11.08:1 (exceeds WCAG AAA standard of 7:1)
- Readable in bright and dim lighting conditions

### Text Readability

- Minimum font size: 14px (mobile)
- Monospace font: Consistent character width aids readability
- Text shadows: Subtle, don't impair legibility

### Focus States

```scss
.menu__item:focus {
  outline: 2px solid var(--crt-green);
  outline-offset: 2px;
}
```

**Keyboard Navigation:** All interactive elements must have visible focus states

### Motion Sensitivity

All animations use CSS transitions/animations. Users with motion preferences can disable:

```scss
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Performance Guidelines

### CSS-Only Effects

All CRT effects use CSS/SVG - no JavaScript overhead:
- Scanlines: CSS gradients
- Glow: CSS box-shadow and text-shadow
- Borders: CSS borders
- Animations: CSS transitions

**Performance Target:** 60fps on all devices

### Canvas Rendering

The maze canvas uses hardware-accelerated rendering:
```typescript
// Request animation frame for smooth 60fps
requestAnimationFrame(renderMaze);
```

**Optimization Techniques:**
1. Draw only changed tiles (dirty rectangle tracking)
2. Use offscreen canvas for complex operations
3. Batch draw calls
4. Pre-render static elements

### Mobile Performance

**Concerns:**
- Scanline overlays can impact low-end devices
- Multiple box-shadows may reduce frame rate

**Solutions:**
```scss
@media (max-width: 480px) {
  // Simplify effects on mobile
  .maze-canvas {
    filter: none;  // Remove drop-shadow on low-end devices
  }
}
```

---

## Browser Compatibility

### Supported Browsers

- Chrome/Edge 90+ (full support)
- Firefox 88+ (full support)
- Safari 14+ (full support)
- Mobile Safari iOS 14+ (full support)
- Chrome Android 90+ (full support)

### CSS Feature Requirements

| Feature | Fallback |
|---------|----------|
| CSS Custom Properties | Required (no fallback) |
| `image-rendering: pixelated` | `crisp-edges` for older browsers |
| CSS Grid | Flexbox fallback not needed (modern browsers only) |
| `::before` pseudo-elements | Required for scanlines |
| `filter: drop-shadow()` | Optional (degrades gracefully) |

### Testing Strategy

1. Visual regression tests on Chrome, Firefox, Safari
2. Mobile testing on iOS and Android devices
3. Performance profiling on low-end devices
4. Accessibility audit with screen readers

---

## Usage Examples

### Example 1: Adding CRT Theme to New Component

```scss
// my-component.component.scss
.my-component {
  background: var(--crt-bg-medium);
  border: var(--crt-border);
  border-radius: 4px;
  padding: 1rem;
  color: var(--crt-green);
  font-family: 'Courier New', monospace;

  h2 {
    text-shadow: var(--crt-glow-md);
    margin-bottom: 1rem;
  }

  .item {
    padding: 0.5rem;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(0, 255, 0, 0.1);
      box-shadow: var(--crt-glow-sm);
    }
  }
}
```

---

### Example 2: Creating Glowing Button

```html
<button class="crt-button">ENGAGE</button>
```

```scss
.crt-button {
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid var(--crt-green-dim);
  color: var(--crt-green);
  font-family: 'Courier New', monospace;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-shadow: var(--crt-glow-sm);

  &:hover {
    background: rgba(0, 255, 0, 0.15);
    border-color: var(--crt-green);
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.6);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
}
```

---

### Example 3: Status Panel with Glow

```html
<div class="crt-panel status-panel">
  <h3>SYSTEM STATUS</h3>
  <div class="stat">
    <span class="label">LOCATION:</span>
    <span class="value">MAZE LEVEL 1</span>
  </div>
  <div class="stat">
    <span class="label">COORDINATES:</span>
    <span class="value">X:10 Y:5 FACING:N</span>
  </div>
</div>
```

```scss
.status-panel {
  h3 {
    color: var(--crt-green);
    text-shadow: var(--crt-glow-md);
    margin-bottom: 0.75rem;
    letter-spacing: 1px;
  }

  .stat {
    display: flex;
    justify-content: space-between;
    padding: 0.25rem 0;

    .label {
      color: var(--crt-green-dim);
    }

    .value {
      color: var(--crt-green);
      font-weight: bold;
    }
  }
}
```

---

## Maintenance Guidelines

### Adding New Visual Effects

1. **Define CSS Custom Properties First**
   ```scss
   :root {
     --new-effect-color: rgba(0, 255, 0, 0.5);
     --new-effect-shadow: 0 0 5px var(--new-effect-color);
   }
   ```

2. **Test Across Browsers**
   - Chrome DevTools for development
   - BrowserStack for cross-browser testing
   - Real devices for performance validation

3. **Document in This Guide**
   - Add to relevant section
   - Include code examples
   - Explain performance implications

### Updating Color Scheme

To modify the CRT color scheme (e.g., from green to amber):

1. Update CSS custom properties in `src/styles/variables.scss`
2. Change `--crt-green` to desired color
3. Adjust glow colors accordingly
4. Test contrast ratios (minimum 7:1)
5. Update this documentation

### Performance Monitoring

Watch for:
- Frame rate drops during canvas rendering
- Jank during transitions/animations
- Memory leaks from gradient re-renders

**Tools:**
- Chrome DevTools Performance tab
- Firefox Performance profiler
- Safari Web Inspector Timeline

---

## Visual Consistency Checklist

When creating new components, ensure:

- [ ] Uses `var(--crt-green)` for primary text
- [ ] Uses `var(--crt-bg-medium)` or `var(--crt-bg-dark)` for backgrounds
- [ ] Includes `border: var(--crt-border)` for panels
- [ ] Applies appropriate glow level (`--crt-glow-sm/md/lg`)
- [ ] Uses `'Courier New', monospace` font family
- [ ] Includes hover effects with 0.2s transition
- [ ] Has 4px border radius on panels/buttons
- [ ] Supports mobile breakpoints (768px, 480px)
- [ ] Passes WCAG AAA contrast requirements
- [ ] Tested at 60fps on target devices

---

## References

### Files

- `src/styles/variables.scss` - Color and spacing definitions
- `src/styles/retro-theme.scss` - Global CRT theme styles
- `src/components/maze-view/maze-view.component.scss` - Canvas effects
- `src/components/scene-footer/scene-footer.component.scss` - Footer styling
- `src/components/scene-title/scene-title.component.scss` - Title effects
- `src/components/character-card/character-card.component.scss` - Card styling

### Design Inspiration

- Wizardry 1 (1981) - Original Apple II version
- VT100 Terminal - Classic green phosphor CRT
- Fallout Pipboy UI - Modern interpretation of retro CRT
- Alien Isolation - Excellent CRT scanline implementation

### Technical Resources

- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [MDN: image-rendering](https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering)
- [CSS-Tricks: box-shadow](https://css-tricks.com/almanac/properties/b/box-shadow/)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-07 | Initial documentation for Phase 4 UI polish |

---

## License

This documentation is part of the Wizardry 1 remake project.
