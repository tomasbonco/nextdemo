---
name: nextdemo-record
description: Use when the user asks to create a NextDemo recording script, demo video script, or Playwright-based screen recording for their Electron app
---

# NextDemo Recording Scripts

Create Playwright scripts that record Electron app demos using `@nextdemo/playwright`. Scripts run via `nextdemo record <script>` which captures the window, tracks cursor, and produces a video. Supports macOS, Windows, and Linux (auto-spawns Xvfb in headless CI).

## Script Structure

```typescript
import pkg from 'nextdemo/playwright';
const { nextdemo, APP } = pkg;
import { _electron as electron } from 'playwright';

// 1. Launch the Electron app
const app = await electron.launch({
  executablePath: '/path/to/electron-app',  // or use args for npm-based apps
});
const window = await app.firstWindow();
await window.waitForLoadState('domcontentloaded');

// 2. Start recording
const session = await nextdemo.startRecording({ app, fps: 30 });

// 3. Perform demo actions with directing
await session.page.waitForTimeout(1500);           // establishing shot
await session.frame('.feature-area', 'medium');    // draw attention
await session.page.click('#button');
await session.page.waitForTimeout(1000);           // let viewer see result
await session.frame(APP, 'wide');                  // pull back to show context

// 4. Stop and close
await session.stop();
await app.close();
```

## API

| Function | Description |
|----------|-------------|
| `nextdemo.startRecording({ app, fps?, name?, config? })` | Start capture. Returns `RecordingSession`. |
| `session.frame(selector, framing?, opts?)` | Frame camera on element — backward-looking: the camera is already in position before the next action plays. Framing: `'super-close-up'`, `'close-up'` (default), `'medium'`, `'wide'`. Optional `opts: { duration?: number, easing?: string }` overrides transition. |
| `session.frame(APP, framing?, opts?)` | Frame camera on full app window. `APP` imported from `@nextdemo/playwright`. Use `session.frame(APP, 'wide')` to reset to full view. |
| `session.zoom(selector, framing?, opts?)` | Zoom camera to element — the transition starts now (forward-looking). The viewer watches the camera travel. Same framing levels and opts as `frame()`. |
| `session.zoom(APP, framing?, opts?)` | Zoom camera to full app window (forward-looking). The viewer watches the camera travel. |
| `session.pause()` | Pause recording. Frames captured while paused are skipped in the final video. |
| `session.resume()` | Resume recording after a pause. The gap is seamlessly bridged — no visible discontinuity. |
| `session.mask(selector, opts?)` | Create a mask layer over an element. Returns `MaskHandle`. See Masks section. |
| `session.followCursor(opts?)` | Viewport tracks cursor. Optional `{ zoom: 'medium', duration: 500 }`. Prefer calling without zoom param to inherit current zoom state — set zoom level separately before enabling. |
| `session.stopFollowing()` | Stop following cursor or followType. Viewport freezes at current position. |
| `session.followType(selector, opts?)` | Follow text caret in an input/textarea/contenteditable — auto-zooms and tracks typing. `opts: { zoom?: Framing, cursor?: boolean, duration?: number }`. Defaults: zoom `'super-close-up'`, cursor hidden. Call `stopFollowing()` to end. |
| `session.hideCursor()` | Hide the mouse cursor from the recording. |
| `session.showCursor()` | Show the mouse cursor in the recording. |
| `session.showKeys(keys)` | Show keyboard shortcut overlay. `keys` is `"Cmd+S"` or `["⌘", "S"]`. Auto-captured for modifier combos via `page.keyboard.press()`. |
| `session.stop()` | Stop recording. Finalizes video file. |

### Framing Levels — Elements

When zooming to a CSS selector, the element must fit in frame. Padding is added around it.

| Level | Effect | When to use |
|-------|--------|-------------|
| `'super-close-up'` | Crops slightly into the element | Typing, dramatic detail, single field focus |
| `'close-up'` | Minimal padding around element | Default. Buttons, small components |
| `'medium'` | Generous padding, shows context | Checkboxes (show labels), form groups, cards |
| `'wide'` | Lots of surrounding UI visible | Establishing shots, showing effect of an action |

### Framing Levels — APP

When zooming to `APP`, framing controls how much of the desktop is visible.

| Level | Effect | When to use |
|-------|--------|-------------|
| `'wide'` | Full desktop — window at actual size, lots of background | Establishing/closing shots |
| `'medium'` | Window with some background visible | Default starting shot |
| `'close-up'` | Window fills the frame | Focus on the app |
| `'super-close-up'` | Slight crop into the window | Tight focus on content |

### Per-Frame/Zoom Duration Override

Override the default transition duration (600ms) on any `frame()` or `zoom()` call. Use `easing` for cinematic effect.

```typescript
await session.frame('.header', 'medium', { duration: 300 });              // fast 300ms transition
await session.frame(APP, 'wide', { duration: 7500, easing: 'ease-out' }); // slow cinematic pull-back
await session.frame('.button', 'close-up');                               // uses default 600ms
await session.frame('.field', 'close-up', { duration: 0 });              // instant (use during pause)
```

### Initial Zoom

Control the starting zoom via config. Defaults to `'wide'` (full desktop).

```typescript
const session = await nextdemo.startRecording({
  app,
  config: {
    zoom: { initial_zoom: "medium" },  // start with window + some background
  },
});
```

## Pause / Resume

Skip boring parts of a recording (loading screens, network delays) without stopping capture. Frames between `pause()` and `resume()` are dropped from the final video, and the gap is seamlessly bridged with smooth cursor and zoom interpolation.

```typescript
// Perform setup that's not interesting to watch
await session.pause();
await session.page.click('#load-data');
await session.page.waitForSelector('.data-table', { state: 'visible' });
await session.resume();

// Continue — viewer sees instant result
await session.frame('.data-table', 'medium');
await session.page.waitForTimeout(1000);
```

### Pause as Scene Setup

Use pause to compose the opening shot of a new scene. Set up zooms, masks, and cursor positions — all with `duration: 0` — so the viewer sees the final state instantly on resume.

```typescript
await session.pause();
await session.page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
await session.page.waitForTimeout(2000);

// Compose the shot while paused — all instant
await session.page.hover('#target-element');                         // position cursor
await session.frame('#target-element', 'close-up', { duration: 0 }); // frame the shot
const mask = await session.mask('#sensitive', { color: [0,0,0,1] });
await mask.show();                                                // mask ready

await session.resume();
// Viewer sees: cursor on target, close-up framed, mask applied — no transition
```

**Every `frame()` call during pause must use `duration: 0`.** There's no point animating what won't be seen.

### When to Use Pause/Resume

| Scenario | Approach |
|----------|----------|
| Waiting for network/loading spinners | Pause before, resume after load |
| Setting up app state (navigation, config) | Pause during boring setup |
| Composing the opening shot of a scene | Pause, set zoom/mask/cursor, resume |
| Skipping repetitive steps | Pause, do the steps, resume |
| Everything the viewer should see | Don't pause — let it record |

## Masks

Create overlay layers on elements for spotlight effects, blur/redaction, and cover/reveal animations. Each mask is tied to a CSS selector and composited between the content and cursor layers (so masks scale naturally with zoom).

### Creating Masks

```typescript
const mask = await session.mask(selector, opts?)
```

**MaskOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `color` | `[r, g, b, a]` | `[0, 0, 0, 0]` | RGBA — RGB values 0–255, alpha 0–1 |
| `blur` | `number` | `0` | Blur strength 0–1 |
| `distance` | `number` | `0` | Padding around element in px. **Negative values crop into the element** (mask smaller than element) |
| `feather` | `number` | `0` | Soft-edge gradient in px |
| `inverted` | `boolean` | `false` | `true` = spotlight (dark overlay with element cut out) |
| `borderRadius` | `number` | inherited | Override corner radius. Use `0` for sharp rectangular mask |
| `z` | `number` | `0` | Layer order for compositing (higher = on top) |

### MaskHandle Methods

| Method | Description |
|--------|-------------|
| `mask.fadeIn(duration_ms)` | Animate opacity to target over duration |
| `mask.fadeOut(duration_ms)` | Animate opacity to 0 over duration |
| `mask.show()` | Instant show (fadeIn with 0ms) |
| `mask.hide()` | Instant hide (fadeOut with 0ms) |
| `mask.morph(props, duration_ms)` | Animate any mask properties including re-targeting to a different selector |

**MorphProps** (all optional): `selector`, `color`, `blur`, `distance`, `feather`, `z`.

### Spotlight / Focus Effect

Dark overlay with the target element cut out to draw attention:

```typescript
const spotlight = await session.mask('.pricing-card', {
  color: [0, 0, 0, 0.6],
  inverted: true,
  distance: 8,
  feather: 4,
});
await spotlight.fadeIn(400);
await session.page.waitForTimeout(2000);     // viewer focuses on the card
await spotlight.fadeOut(400);
```

### Blur / Redaction

Blur sensitive content like passwords or personal information:

```typescript
const redaction = await session.mask('.password-input', { blur: 0.5 });
await redaction.show();
// ... continue demo with blurred field ...
await redaction.hide();
```

### Cover / Reveal

Overlay that fades away to reveal content dramatically:

```typescript
const cover = await session.mask('.app-container', {
  color: [255, 255, 255, 1],
});
await cover.show();
await session.page.waitForTimeout(500);
await cover.fadeOut(800);                    // content revealed
```

### Morphing Between Targets

Animate a mask from one element to another (e.g., a moving spotlight):

```typescript
const spotlight = await session.mask('.step-1', {
  color: [0, 0, 0, 0.6],
  inverted: true,
  distance: 8,
});
await spotlight.fadeIn(300);
await session.page.waitForTimeout(1500);

// Move spotlight to step 2
await spotlight.morph({ selector: '.step-2' }, 500);
await session.page.waitForTimeout(1500);

// Move to step 3
await spotlight.morph({ selector: '.step-3' }, 500);
await session.page.waitForTimeout(1500);
await spotlight.fadeOut(300);
```

## Visual Customization

The `config` object controls the video's visual style. All fields are optional — omit any you don't need.

### Background

```typescript
config: {
  background: {
    type: "solid", color: "#1a1a2e",                    // solid color
    // OR
    type: "gradient", gradient: {
      type: "linear", angle: 135,                       // or "radial"
      stops: [
        { color: "#1a1a2e", position: 0.0 },
        { color: "#0f0f23", position: 1.0 },
      ],
    },
    // OR
    type: "image", path: path.join(__dirname, "bg.png"), // background image
  },
}
```

### Chrome (Window Title Bar)

```typescript
config: {
  chrome: {
    style: "macos",        // "macos" | "windows" | "none"
    theme: "dark",         // "dark" | "light"
    corner_radius: 12,     // rounded window corners (default: 10)
    image: path.join(__dirname, "header.png"),  // custom header image (replaces entire title bar)
  },
}
```

When `image` is set, the PNG replaces the entire title bar — background, traffic lights, everything. The image is stretched to fit the rendered title bar dimensions. Use this for fully custom window chrome.

### Cursors

The default cursors are pixel-art style (Minecraft-like blocky design). You can override them with custom PNG images per cursor type.

```typescript
config: {
  cursor: {
    visible: true,
    scale: 1.5,            // cursor size multiplier
    arrow_image: path.join(__dirname, "my-arrow.png"),   // custom arrow cursor PNG
    ibeam_image: path.join(__dirname, "my-ibeam.png"),   // custom I-beam cursor PNG
    click_effect: {
      enabled: true,
      type: "ripple",
      color: "#ffffff40",
      duration_frames: 20,
      radius: 30,
    },
  },
}
```

Custom cursor PNGs should have transparency (RGBA). The hotspot is at the top-left corner. The image is scaled so its height maps to ~35px at scale 1.0. Each cursor type is independent — setting only `arrow_image` keeps the built-in pixel-art I-beam.

### Keyboard Overlay

Keyboard shortcuts are rendered as an overlay when modifier combos are pressed. Auto-captured from `page.keyboard.press()` for combos with modifiers (Cmd, Ctrl, Alt, Shift). Use `session.showKeys()` to trigger manually.

```typescript
config: {
  keyboard: {
    enabled: true,             // show keyboard overlay (default: true)
    fade_duration_frames: 45,  // how long the overlay lingers (default: 45)
    scale: 5.0,                // badge size multiplier (default: 5.0)
    theme: "auto",             // "auto" | "light" | "dark" (default: "auto" — adapts to content brightness)
  },
}
```

### Zoom

```typescript
config: {
  zoom: {
    initial_zoom: "medium",       // starting zoom: "wide" (default) | "medium" | "close-up" | "super-close-up"
    default_transition_ms: 600,   // default zoom transition duration in ms (default: 600)
  },
}
```

### Full Example

```typescript
const session = await nextdemo.startRecording({
  app,
  fps: 30,
  name: "demo",
  config: {
    background: {
      type: "gradient",
      gradient: {
        type: "radial", angle: 0,
        stops: [
          { color: "#1a1a2e", position: 0.0 },
          { color: "#0f0f23", position: 1.0 },
        ],
      },
    },
    chrome: {
      corner_radius: 12,
      image: path.join(__dirname, "header.png"),
    },
    cursor: {
      scale: 1.5,
      arrow_image: path.join(__dirname, "cursor-arrow.png"),
      ibeam_image: path.join(__dirname, "cursor-ibeam.png"),
    },
    zoom: {
      default_transition_ms: 500,   // slightly faster transitions
    },
  },
});
```

## Directing Principles

**You are not writing E2E tests.** You are directing a professional product tour. Every decision — zoom level, timing, camera move — should be driven by **intent**: what does the viewer need to focus on right now?

### `frame` vs `zoom` — Choose the Right Camera Move

| Use | When |
|-----|------|
| `session.frame(selector, level)` | The camera should already be in position before the next action plays (most common). The transition is backward-looking — by the time the viewer sees the action, the framing is set. |
| `session.zoom(selector, level)` | The viewer should watch the camera travel to the target. Reserve for cinematic moments: a dramatic slow pull-back, a deliberate reveal, or a reel climax. |

In practice, nearly all routine camera moves use `frame()`. Use `zoom()` only when the camera movement itself is part of the story — for example, `session.zoom(APP, 'wide', { duration: 7500, easing: 'ease-out' })` as a slow cinematic closing shot.

### 1. Intent Drives Framing

Before writing any shot, ask: **what is the primary focus?** The answer determines zoom level, timing, and whether to zoom at all. Don't zoom reflexively — zoom when focus needs to shift.

| Intent | Framing | Example |
|--------|---------|---------|
| Show the result of filling a form | Stay wide — the result matters, not the typing | Keep `'wide'` or `'medium'`, fill the form, viewer sees the outcome in context |
| Show the process of filling a form | Go closer — the typing is the story | `'close-up'` on form area, type with delay |
| Stress that a specific input controls something | Tight focus on the field | `'super-close-up'` on the field, type, then pull back to show effect |
| Highlight a specific checkbox matters | Zoom to the row, then click | `'medium'` on the parent row so label is readable, pause, click |
| Complete routine checkboxes quickly | Don't zoom per checkbox | Stay at current framing, click through them |

**If unsure about intent, ask the user:** "What should the viewer focus on here — the action itself, or its result?"

### 2. Minimize Zoom Changes

Every zoom transition costs viewer attention. Don't zoom to every element before clicking — only zoom when focus genuinely needs to shift.

```typescript
// BAD — unnecessary zoom churn, viewer gets dizzy
await session.frame('.task:nth-child(1) .checkbox', 'close-up');
await session.page.click('.task:nth-child(1) .checkbox');
await session.frame('.task:nth-child(2) .checkbox', 'close-up');
await session.page.click('.task:nth-child(2) .checkbox');
await session.frame('.task:nth-child(3) .checkbox', 'close-up');
await session.page.click('.task:nth-child(3) .checkbox');

// GOOD — one frame to the list, click through naturally
await session.frame('.task-list', 'medium');
await session.page.waitForTimeout(600);
await session.page.click('.task:nth-child(1) .checkbox');
await session.page.waitForTimeout(400);
await session.page.click('.task:nth-child(2) .checkbox');
await session.page.waitForTimeout(400);
await session.page.click('.task:nth-child(3) .checkbox');
```

### 3. Breathing Room

Add wait times so the viewer can absorb what they see. This is not a speed test.

```typescript
// After framing in — let viewer orient themselves
await session.frame('.form-group', 'close-up');
await session.page.waitForTimeout(800);

// After a significant action — let viewer see the result
await session.page.click('#submit');
await session.page.waitForTimeout(1200);

// Before framing out — let the close-up linger
await session.page.waitForTimeout(600);
await session.frame(APP, 'wide');

// After framing out — let viewer see the full picture
await session.page.waitForTimeout(1500);
```

### 4. Shot Progression

Follow cinematic shot structure: **establish → focus → act → reveal**.

```typescript
// ESTABLISH: Wide shot, let viewer see the whole app
await session.page.waitForTimeout(1500);

// FOCUS: Frame to the area of interest
await session.frame('.task-list', 'medium');
await session.page.waitForTimeout(800);

// ACT: Perform the interaction
await session.page.click('.task:nth-child(3) .checkbox');
await session.page.waitForTimeout(800);

// REVEAL: Pull back to show the effect (stats updated, list changed, etc.)
await session.frame(APP, 'wide');
await session.page.waitForTimeout(1500);
```

Not every shot needs all four beats. If the focus is already where it needs to be, skip the zoom. If the result is visible in the current frame, don't pull back.

### 5. Parallel Actions — Zoom + Cursor Together

When refocusing to a new area, move the cursor simultaneously with the frame instead of sequentially. `session.frame()` returns immediately after sending the command — the animation plays during subsequent actions.

```typescript
// GOOD — frame and cursor move in parallel, feels natural
await session.frame('.add-to-cart', 'medium');
await session.page.click('.size-selector');        // cursor moves DURING frame transition
await session.page.waitForTimeout(800);

// BAD — sequential, feels robotic
await session.frame('.add-to-cart', 'medium');
await session.page.waitForTimeout(500);            // wait for frame to finish
await session.page.click('.size-selector');        // then move cursor separately
```

### 6. Cursor Follow for Multi-Step Sequences

When the user performs several actions in sequence (clicking through tabs, filling a form), use `followCursor` to keep the camera tracking naturally. Set zoom level before enabling — don't pass zoom param to `followCursor()`.

```typescript
await session.frame('#first-tab', 'medium', { duration: 0 });  // set zoom level
await session.followCursor();                                    // inherit zoom, start tracking
await session.page.click('.option-1');
await session.page.waitForTimeout(600);
await session.page.click('.option-2');
await session.stopFollowing();
```

### 7. Typing — Match the Intent

Typing isn't always a close-up moment. Zoom level depends on what the shot is about.

```typescript
// Intent: SHOWCASE the typing (e.g., naming a project, entering a key value)
await session.frame('#project-name', 'super-close-up');
await session.page.waitForTimeout(400);
await session.page.click('#project-name');
await session.page.type('#project-name', 'Ship v2.0 release', { delay: 80 });
await session.page.waitForTimeout(600);

// Intent: FILL a form (typing is necessary, not the focus)
// Stay at current zoom, type quickly, move on
await session.page.fill('#email', 'user@example.com');
await session.page.fill('#company', 'Acme Corp');
await session.page.waitForTimeout(400);
```

### 8. Select/Dropdown Interactions Need Space

Dropdowns open overlays that need time to render and be seen.

```typescript
await session.frame('.form-group-with-select', 'close-up');
await session.page.waitForTimeout(500);
await session.page.click('#category-select');
await session.page.waitForTimeout(400);           // let dropdown open
await session.page.selectOption('#category-select', 'urgent');
await session.page.waitForTimeout(600);           // let viewer see selection
```

### 9. Use Pause to Skip the Boring Parts

Don't make the viewer watch loading screens or repetitive setup. Pause, do the boring work, resume.

```typescript
// BAD — viewer watches a 3-second loading spinner
await session.page.click('#load-dashboard');
await session.page.waitForSelector('.dashboard', { state: 'visible' });

// GOOD — skip the wait, viewer sees instant result
await session.page.click('#load-dashboard');
await session.pause();
await session.page.waitForSelector('.dashboard', { state: 'visible' });
await session.resume();
await session.page.waitForTimeout(800);           // let viewer absorb the result
```

### 10. Spotlights Direct Attention

When a screen is busy, use an inverted mask to darken everything except the element you're about to interact with.

```typescript
// Spotlight the feature before interacting
const spotlight = await session.mask('.key-feature', {
  color: [0, 0, 0, 0.5],
  inverted: true,
  distance: 8,
  feather: 4,
});
await spotlight.fadeIn(300);
await session.page.waitForTimeout(1200);          // viewer reads the spotlit area
await spotlight.fadeOut(200);
await session.page.waitForTimeout(200);
await session.page.click('.key-feature button');
```

## Key Playwright Actions for Demos

| Action | Usage | Notes |
|--------|-------|-------|
| `session.page.click(selector)` | Click element | Generates cursor movement + click effect |
| `session.page.fill(selector, text)` | Type into input | Clear + type (instant) |
| `session.page.type(selector, text, { delay })` | Type character by character | More cinematic with `delay: 60-100` |
| `session.page.hover(selector)` | Move cursor to element | Good before click for smooth cursor |
| `session.page.waitForTimeout(ms)` | Pause | Essential for pacing |
| `session.page.selectOption(sel, val)` | Select dropdown | Pair with waits before/after |
| `session.page.keyboard.press('Enter')` | Key press | Submit forms |
| `session.page.evaluate(fn)` | Run JS in app | Set up state before recording |

## Pacing Reference

| Moment | Wait time |
|--------|-----------|
| Opening establishing shot | 1500–2000ms |
| After zooming in (let viewer orient) | 600–1000ms |
| After a click (let viewer see result) | 800–1200ms |
| After typing completes | 500–800ms |
| Before zooming out | 400–600ms |
| After zooming out to wide (closing shot) | 1200–1500ms |
| Between checkbox clicks (let viewer read) | 800–1000ms |
| After dropdown selection | 500–800ms |

## External Sites

When recording demos that navigate to external websites (Nike, GitHub, Apple, etc.):

### Dismiss Overlays

Cookie banners, consent modals, and promo popups block interactions. Remove them via `evaluate()` during pause:

```typescript
await session.pause();
await session.page.goto('https://www.nike.com/...', { waitUntil: 'domcontentloaded', timeout: 30000 });
await session.page.waitForTimeout(5000);

// Nuke overlay roots — more reliable than clicking accept buttons
await session.page.evaluate(() => {
  document.querySelector('#modal-root')?.remove();
  const accept = [...document.querySelectorAll('button')].find(b => /accept/i.test(b.textContent));
  if (accept) accept.click();
});

// Re-check after resume — some sites re-inject modals
await session.resume();
await session.page.evaluate(() => document.querySelector('#modal-root')?.remove());
```

### Compound Selectors

External sites reuse class names. Combine multiple classes or use data-testid attributes for reliable targeting:

```typescript
// Specific — combines two classes
'.all-access-pass__element.aap-media-card-gallery__timed-dotnav'

// Fallback chains for elements that vary across deployments
'[data-testid="add-to-cart-btn"], button:has-text("Add to Bag")'
```

### Electron Setup for External Sites

Allow third-party cookies and disable web security so external sites work correctly:

```javascript
const win = new BrowserWindow({
  webPreferences: { webSecurity: false },
});
```

## Swift Reel / Dynamic Showcase Directing

For fast-paced promo videos, reels, and feature showcases — different rules than educational/tutorial videos.

### Asymmetric Pacing

Don't spray uniform waits. Each wait should be categorized:

| Category | Duration | When |
|----------|----------|------|
| Hard cut | 30ms | Scene transitions (e.g., after Sign In click) |
| Transition | 200–600ms | Between fields, between actions |
| Feature moment | 1000–3000ms | Viewer needs to see the feature working |
| Cinematic | 5000–7500ms | One dramatic reveal (e.g., slow zoom-out) |

### No Establishing Shots

Context scenes use `duration: 0` and minimal holds. Get to the action immediately — the viewer doesn't need orientation, they need momentum.

### Build Montage to Climax

Show quick content changes first (pages flashing), then the dramatic slow reveal at the END. The cinematic moment is the crescendo, not the opener.

```typescript
// Quick page flashes
await session.pause();
await session.page.goto('https://github.com', ...);
await session.resume();
await session.page.waitForTimeout(1500);           // just a flash

// ... more pages ...

// Climax — slow cinematic zoom-out reveals chrome + background
await session.zoom(APP, 'wide', { duration: 7500, easing: 'ease-out' });
```

### One Slow Moment

In a fast reel, exactly ONE cinematic moment (5000–7500ms) makes the speed elsewhere feel intentional. Everything fast + one slow = dynamic. Everything the same speed = monotonous.

### End on the Action

No closing zoom-outs, no fadeOuts, no wind-down. `session.stop()` right after the final click.

```typescript
await session.page.click('#cta-button');
await session.stop();                              // end at peak impact
await app.close();
```

### Hover Only for the Final Payoff

Use click-only throughout. Reserve hover → wait → click for exactly one moment: the final interaction. The pause between hover and click builds anticipation.

```typescript
// Throughout the video: just click
await session.page.click('#some-button');

// Final scene: hover + anticipation + click
await session.page.hover('#final-cta');
await session.page.waitForTimeout(400);
await session.page.click('#final-cta');
```

### Montage Pages Don't Need Full Loads

For visual flashes in a montage, skip the load wait. Resume immediately — partial render is fine for a 1.5s glimpse.

## Parallel Recording

Record multiple Electron windows simultaneously to cut CI/CD wall-clock time. Each window gets its own capture session; all render in parallel after captures complete.

### Pattern: Multiple Electron Instances

Launch separate `electron.launch()` calls, start all recordings with `Promise.all`, run scenarios in parallel:

```typescript
// Launch 3 separate Electron apps
const [app1, app2, app3] = await Promise.all([
  electron.launch({ args: [mainJs] }),
  electron.launch({ args: [mainJs] }),
  electron.launch({ args: [mainJs] }),
]);

// Navigate each to a different view BEFORE recording
const win2 = await app2.firstWindow();
await win2.click('[data-view="settings"]');

// Start all recordings at once
const [s1, s2, s3] = await Promise.all([
  nextdemo.startRecording({ app: app1, fps: 30, name: "overview" }),
  nextdemo.startRecording({ app: app2, fps: 30, name: "settings" }),
  nextdemo.startRecording({ app: app3, fps: 30, name: "deploy" }),
]);

// Run all scenarios in parallel
await Promise.all([
  (async () => {
    await s1.page.waitForTimeout(1500);
    await s1.frame('.stats', 'medium');
    await s1.page.click('#refresh-btn');
    await s1.frame(APP, 'wide');
    await s1.page.waitForTimeout(1500);
    await s1.stop();
  })(),
  (async () => {
    await s2.page.waitForTimeout(1500);
    await s2.frame('#toggle-dark', 'close-up');
    await s2.page.click('#toggle-dark');
    await s2.frame(APP, 'wide');
    await s2.page.waitForTimeout(1500);
    await s2.stop();
  })(),
  (async () => {
    await s3.page.waitForTimeout(1500);
    await s3.page.click('#deploy-btn');
    await s3.frame('.table-section', 'medium');
    await s3.page.waitForTimeout(1500);
    await s3.stop();
  })(),
]);

// Close all apps
await Promise.all([app1.close(), app2.close(), app3.close()]);
```

### Key Rules

- **One `electron.launch()` per window** — each window needs its own Electron process (separate PID for capture)
- **`name` is required** for each recording — it becomes the output filename
- **Set up views before recording** — navigate each window to its starting state before `startRecording()`
- **`Promise.all` for starts and scenarios** — recordings and actions run concurrently
- **Each scenario is a self-contained async IIFE** — independent zoom/action/stop lifecycle

### CLI

```bash
# Record with default concurrency (= CPU cores)
nextdemo record path/to/script.mjs

# Limit concurrency (useful in memory-constrained CI)
nextdemo record path/to/script.mjs --concurrency 2
```

### When to Use Parallel vs Sequential

| Scenario | Approach |
|----------|----------|
| Multiple independent features to demo | **Parallel** — separate Electron instances |
| Multi-step flow through one app (e.g. wizard) | **Sequential** — one app, sequential `startRecording`/`stop` pairs |
| Same feature, different configs/themes | **Parallel** — separate instances with different settings |
| Long single recording | **Sequential** — one session |

## Running

```bash
# Record (captures + renders all sessions, parallel by default)
nextdemo record path/to/script.mjs

# Record with limited concurrency
nextdemo record path/to/script.mjs --concurrency 2

# Activate a license
nextdemo activate <license-key>
```

## Project Setup

The script needs `nextdemo` (which exports `nextdemo/playwright`) and `playwright` installed:

```bash
npm install playwright
npm install /path/to/recordero/app
```

## Before Writing a Script

1. Read the user's app code to understand the UI (selectors, routes, features)
2. Ask what flow they want to demo if not specified
3. Plan your shot list: what does the viewer need to see, in what order?
4. **Consider parallelism**: if demoing multiple independent features, use separate Electron instances to record in parallel
5. Use realistic data in fills/inputs
6. Think like a director: establish → focus → act → reveal
7. Add comments explaining each section of the demo
