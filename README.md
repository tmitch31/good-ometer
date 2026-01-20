# GOOD-OMETER

A projection-ready analog gauge for live events, designed with a light steampunk aesthetic (brass + iron + rivets). Operates entirely offline using keyboard controls.

---

## Quick Start (macOS)

### Method 1: Double-Click (Recommended)
1. Navigate to the project folder in Finder
2. Double-click `index.html`
3. The app will open in your default browser

### Method 2: Local Server (If browser blocks local files)
```bash
cd /path/to/good-ometer
python3 -m http.server 8000
```
Then open: `http://localhost:8000`

---

## Operator Controls

### Direct Level Jumping
- **1-6** → Jump directly to that level

### Stepping
- **↑** (Arrow Up) → Step up one level (max 6)
- **↓** (Arrow Down) → Step down one level (min 1)

### Special Commands
- **R** → Reset to Level 1
- **SPACE** → Trigger "applause wobble" (needle wiggles, stays at current level)
- **H** → Toggle help overlay

---

## The Six Levels

1. **Resting** – Needle at far left
2. **Slightly Rising** – Needle begins to move
3. **Halfway** – Needle at center
4. **Strong Movement** – Needle rises confidently
5. **Near the Top** – Needle approaching max
6. **Fully Charged** – Needle at far right

---

## Visual Design

- **Aesthetic:** Analog, mechanical, handcrafted
- **Materials:** Brushed brass face + dark iron outer ring + rivets
- **Text:** "GOOD-OMETER" appears engraved/embossed into the metal
- **No Modern UI:** No cards, no progress bars, no percentages, no numbers on the face
- **Motion:** Smooth transitions with slight overshoot (feels like a physical mechanism)
- **Breathing Effect:** Extremely subtle ambient glow (won't distract during events)

---

## Projection Setup

1. **Connect your Mac to projector** (HDMI or DisplayPort)
2. **Set display mode:**
   - **Mirror Display** (recommended) – same content on both screens
   - **Extend Display** – drag browser to projector screen, then fullscreen
3. **Enter fullscreen:**
   - Press `Command + Shift + F` (Chrome/Edge)
   - Or press `Command + Control + F` (Safari)
4. **Test all keyboard controls** before the event starts
5. **Keep help overlay off** during the event (press `H` to hide it)

---

## Technical Details

### Files
- `index.html` – Main structure with SVG gauge
- `styles.css` – Steampunk aesthetic + 16:9 responsive layout
- `app.js` – Keyboard controls + needle animation logic
- `README.md` – This file

### Browser Compatibility
- ✅ Chrome (macOS)
- ✅ Safari (macOS)
- ✅ Edge (macOS)
- ✅ Firefox (macOS)

### Requirements
- No internet connection needed
- No frameworks or external libraries
- No build tools required
- Works on any modern browser

---

## Troubleshooting

**Needle doesn't move:**
- Check browser console for errors (press `F12` or `Command + Option + I`)
- Make sure `app.js` is in the same folder as `index.html`
- Try refreshing the page

**Browser blocks local files:**
- Use Method 2 (local server) from Quick Start section

**Keyboard shortcuts don't work:**
- Click inside the browser window to ensure it has focus
- Some browsers may capture certain shortcuts; try closing other apps

**Gauge looks too small on projector:**
- The gauge auto-scales to 90% viewport width
- Enter fullscreen mode for maximum size
- Check projector resolution settings

---

## Stage-Ready Checklist

Before your event:
- [ ] Test all keyboard shortcuts (1-6, arrows, R, Space, H)
- [ ] Verify needle transitions are smooth (no jitter)
- [ ] Hide help overlay (press H if visible)
- [ ] Enter fullscreen mode
- [ ] Confirm gauge is large and legible from a distance
- [ ] Check that projector aspect ratio is 16:9 (or close)

---

## Credits

Built with vanilla HTML/CSS/JavaScript for maximum reliability and offline functionality.

**Design Goals:**
- Analog/mechanical aesthetic (not digital)
- Stage-ready at a distance
- Keyboard-only operation (no mouse needed)
- Smooth, intentional motion with slight overshoot
- Zero dependencies, zero build tools

---

## License

Free to use for live events, presentations, and performances.
