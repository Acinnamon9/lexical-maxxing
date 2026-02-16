# Brutalist UI Theme

A raw, unpolished, high-contrast theme for Lexical Maxxing that embodies brutalist design principles.

## Characteristics

### Visual Style
- **High Contrast**: Pure black (#000000) text on white (#FFFFFF) background
- **No Rounded Corners**: Everything is sharp and angular
- **Heavy Borders**: 3px solid borders on all elements
- **Bold Typography**: Heavy font weights (700-900), uppercase text, tight letter spacing
- **Box Shadows**: Offset shadows (6px-10px) with no blur
- **Monospace Code**: Courier New for all code elements
- **No Transitions**: Instant state changes, no smooth animations

### Design Philosophy
1. **Raw & Unpolished**: Embraces brutalist architecture's "truth to materials"
2. **Functional First**: Form follows function, no decorative elements
3. **Exposed Structure**: Grid layouts and structural elements are visible
4. **Heavy Weight**: Bold, impactful visual presence
5. **Anti-Smooth**: Rejects modern design's smoothness in favor of sharp edges

## Usage

### Enable Brutalist Theme

1. Navigate to Settings
2. Click on the "Appearance" section
3. Select "Brutalist" from the theme switcher
4. The entire app will transform to brutalist aesthetic

### Theme Features

**Buttons**:
- 3px solid black borders
- Uppercase text
- No rounded corners
- On hover: inverts colors and shifts position (translate 2px, 2px)
- Hard shadows instead of soft glows

**Inputs & Forms**:
- Heavy 3px borders
- Sharp focus outlines
- No placeholders or help text styling
- Monospace fonts for data entry

**Cards &  Panels**:
- 6px hard-drop shadows
- 3px borders on all sides
- No gradients or subtle effects

**Typography**:
- All headings are uppercase
- Font weights 700+ only
- Tight letter spacing (-0.02em)
- No serif fonts

**Links**:
- 2px thick underlines
- On hover: background inverts to black, text to white
- No subtle color changes

**Code Blocks**:
- Courier New monospace
- 3px borders
- Light gray background with black borders
- No syntax highlighting (or minimal)

**Tables**:
- Heavy borders on all cells
- Black background headers with white text
- Uppercase column names
- Visible separation between cells

## Technical Implementation

### CSS Classes

The brutalist theme is applied via the `.brutalist` className on the root `<html>` element.

**CSS Variables**:
```css
--background: #ffffff
--foreground: #000000
--border: #000000
--brutalist-border-width: 3px
--brutalist-shadow: 6px 6px 0 #000000
--brutalist-heavy-shadow: 10px 10px 0 #000000
```

**Special Overrides**:
- `border-radius: 0 !important` - Removes all rounded corners
- `transition: none` - Disables smooth transitions
- Grid gaps use border width for spacing

### Files Modified

1. **[app/globals.css](file:///s:/lexical-maxxing/app/globals.css)**
   - Added`.brutalist` theme variables
   - Added brutalist-specific element styles
   - Comprehensive overrides for buttons, inputs, cards, etc.

2. **[components/settings/AppearanceSection.tsx](file:///s:/lexical-maxxing/components/settings/AppearanceSection.tsx)**
   - Added "brutalist" to theme type definition
   - Added brutalist theme button
   - Updated theme switching logic

## Screenshots

*(The brutalist theme will be visible once you switch to it in Settings)*

**Expected Appearance**:
- Sharp, angular interfaces
- High contrast everywhere
- Heavy visual weight
- No smoothness or polish
- Functional and direct

## Best For

- Power users who want maximum clarity
- Developers who appreciate raw aesthetics
- Users who prefer function over form
- Anyone tired of overly-polished modern UIs
- Terminal enthusiasts transitioning to GUI

## Comparison

| Feature | Default | Dark | Solarized | **Brutalist** |
|---------|---------|------|-----------|---------------|
| Borders | Subtle | Subtle | Smooth | **Heavy 3px** |
| Corners | Rounded | Rounded | Rounded | **Sharp** |
| Shadows | Soft | Soft | Minimal | **Hard drops** |
| Typography | Mixed | Mixed | Light | **Bold/Black** |
| Transitions | Smooth | Smooth | Smooth | **None** |
| Colors | Varied | Varied | Warm | **B&W only** |

## Future Enhancements

Potential brutalist variations:
- **Brutalist Dark**: White on black inversion
- **Brutalist Red**: Accent color for warnings/errors
- **Brutalist Grid**: Visible grid overlay
- **Brutalist Terminal**: Full terminal aesthetic

---

**Embrace the raw. Embrace the brutal. 🏗️**
