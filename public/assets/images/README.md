# Image Assets

## Title Screen

**REQUIRED**: Place the title screen image at:
```
public/assets/images/title.png
```

The title.png should be the beautiful title image provided by the user.

### Specifications
- Format: PNG
- Recommended size: 280x140 pixels (will be scaled 2x to 560x280)
- Style: Pixel art / retro bitmap
- Background: Transparent or black

### Temporary Placeholder
Until the actual image is added, you can create a simple placeholder by running:
```bash
# macOS/Linux with ImageMagick:
convert -size 280x140 xc:black -fill white -font Courier \
  -pointsize 24 -gravity center -annotate +0+0 "WIZARDRY" \
  public/assets/images/title.png

# Or use any 280x140 PNG image as a placeholder
```

### What happens if missing?
If title.png is missing, the AssetLoadingService will fail to load and display an error in the console. The title screen will show "Error Loading" on the start button.
