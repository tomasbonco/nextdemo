---
name: nextdemo-record
description: Use when the user asks to create a NextDemo recording script, demo video script, or Playwright-based screen recording for their Electron app
---

# NextDemo Recording Scripts

Create Playwright scripts that record Electron app demos using the `nextdemo`
package. Scripts *declare* videos; the CLI (`nextdemo record <script>`) loads
them, applies any `--only`/`--skip` filters, and dispatches each video with its
own Electron instance. Supports macOS, Windows, and Linux (auto-spawns Xvfb in
headless CI).

## Script Structure

```typescript
import { video, defineConfig, APP } from 'nextdemo'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mainJs = path.join(__dirname, 'main.js')

// Optional: shared defaults merged into every video() call below.
defineConfig({
  app: { args: [mainJs] },
  config: {
    chrome: { style: 'macos', theme: 'dark' },
    output: { width: 768, height: 500 },
  },
})

video('feature-demo', {
  page: { url: 'file:///.../feature-demo.html' },  // framework navigates before capture
  onStart: async ({ session }) => {
    // runs at frame 0 — use for initial framing, hide cursor, etc.
    await session.frame('#hero', 'close-up', { duration: 0 })
  },
}, async ({ session, page }) => {
  // capture is live as soon as this body starts
  await page.waitForTimeout(1000)
  await session.frame('#button', 'close-up')
  await page.click('#button')
  await page.waitForTimeout(500)
  // body-end = capture-end; no session.stop() needed
})

video.only('focused', { app: { args: [mainJs] } }, async ({ session, page }) => { /* ... */ })  // only this one runs
video.skip('wip',    { app: { args: [mainJs] } }, async ({ session, page }) => { /* ... */ })  // never runs
```

**Capture a URL without your own Electron app:** omit `app.args` and set `page.url`. NextDemo launches a bundled default Electron main (blank `BrowserWindow`) and navigates it. You need at least one of `app.args` or `page.url` — supplying neither is an error.

```sh
nextdemo record record.mjs                            # all videos
nextdemo record record.mjs --only feature-demo        # one video
nextdemo record record.mjs --only 'feat-*'            # glob
nextdemo record record.mjs --skip wip                 # skip pattern
nextdemo record record.mjs --only a --only b          # multiple (OR)
```

## API

`import { video, defineConfig, APP } from 'nextdemo'`

| Function | Description |
|----------|-------------|
| `video(name, opts, fn)` | Register a video. `name` must match `[A-Za-z0-9_-]+`. `fn` receives `{ session, page }`. |
| `video.only(name, opts, fn)` | Register and force to be the only one run (combined with other `.only`s / CLI `--only` via OR). |
| `video.skip(name, opts, fn)` | Register but skip. Useful for temporary disabling. |
| `defineConfig(defaults)` | Set module-scoped defaults merged into every subsequent `video(...)` call. Call at most once per file. |
| `APP` | Sentinel for `session.frame(APP, ...)` / `session.zoom(APP, ...)` to frame the full window. |

### VideoOptions

| Field | Type | Notes |
|-------|------|-------|
| `app` | `LaunchOptions?` | Playwright Electron launch options (`args`, `executablePath`, `env`, ...). If `args` is omitted, NextDemo launches a bundled default Electron main (blank `BrowserWindow`) and you must supply `page.url`. |
| `app.persistSession` | `boolean?` | Default `false`. Only applies when `args` is omitted. When `false`, each run gets a fresh in-memory Electron partition so cookies, localStorage, IndexedDB, and cache do not leak between recordings. Set `true` if you need state to survive across runs. |
| `app.cookies.rewriteSameSite` | `boolean?` | Default `true`. Only applies when `args` is omitted. Rewrites response `Set-Cookie` headers to `SameSite=None; Secure` so third-party cookies work when the window starts at `about:blank` and then navigates to a real origin. Set `false` only if you are specifically testing SameSite enforcement. |
| `page.url` | `string?` | If set, navigates here before capture (waits for `domcontentloaded`). Required when `app.args` is omitted. |
| `page.waitFor` | `string?` | CSS selector to wait for before `onStart`. |
| `config` | `ProjectConfig?` | Render/output config (background, chrome, zoom, output, masks, window size). See sections below. |
| `onStart` | `(ctx) => Promise<void>?` | Runs before frame 0; calls stamp at frame 0. Use for initial framing, hide cursor, create masks. |
| `outDir` | `string?` | Override final MP4 output directory. |
| `fps` | `number?` | Override capture fps for this video. Default 30. |

### Callback context `{ session, page }`

- `session` — **recording directives only**. No escape hatch to Playwright.
- `page` — the **Playwright Page**, proxied for action tracking. `page.click / fill / type / hover / press / selectOption / check / uncheck` automatically emit recording events (cursor ripples, typing animation, key-combo overlays). Everything else on `page` passes through to vanilla Playwright.

### Session methods

| Method | Description |
|--------|-------------|
| `session.frame(selector, framing?, opts?)` | Frame camera on element — backward-looking: the camera is already in position before the next action plays. Framing: `'super-close-up'`, `'close-up'` (default), `'medium'`, `'wide'`. Optional `opts: { duration?: number, easing?: string }` overrides transition. |
| `session.frame(APP, framing?, opts?)` | Frame camera on full app window. Use `session.frame(APP, 'wide')` to reset to full view. |
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

### Framing Levels

When zooming to a CSS selector, the element must fit in frame with padding around it. When zooming to `APP`, framing controls how much of the desktop is visible.

| Level | Element | APP |
|-------|---------|-----|
| `'super-close-up'` | Crops slightly into the element. Typing, dramatic detail, single field focus | Slight crop into the window. Tight focus on content |
| `'close-up'` | Minimal padding around element (default for elements). Buttons, small components | Window fills the frame. Focus on the app |
| `'medium'` | Generous padding, shows context. Checkboxes (show labels), form groups, cards | Window with some background (default starting shot) |
| `'wide'` | Lots of surrounding UI visible. Establishing shots, showing effect of an action | Full desktop, window at actual size, lots of background. Establishing/closing shots |

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
video('demo', {
  app: { args: [mainJs] },
  config: {
    zoom: { initial_zoom: 'medium' },  // start with window + some background
  },
}, async ({ session, page }) => { /* ... */ });
```

For element-specific starting framing, cursor visibility, masks, or follow modes that must apply from the very first rendered frame, use the `onStart` field of `VideoOptions` (see the API table above). All session calls inside `onStart` stamp at frame 0, so the video opens in the exact composed state you set up.

## Pause / Resume

Skip boring parts of a recording (loading screens, network delays) without stopping capture. Frames between `pause()` and `resume()` are dropped from the final video, and the gap is seamlessly bridged with smooth cursor and zoom interpolation.

```typescript
await session.pause();
await page.click('#load-data');
await page.waitForSelector('.data-table', { state: 'visible' });
await session.resume();

// Continue — viewer sees instant result
await session.frame('.data-table', 'medium');
await page.waitForTimeout(1000);
```

### Pause as Scene Setup

Use pause to compose the opening shot of a new scene. Set up zooms, masks, and cursor positions — all with `duration: 0` — so the viewer sees the final state instantly on resume.

```typescript
await session.pause();
await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(2000);

// Compose the shot while paused — all instant
await page.hover('#target-element');                                 // position cursor
await session.frame('#target-element', 'close-up', { duration: 0 }); // frame the shot
const mask = await session.mask('#sensitive', { color: [0,0,0,1] });
await mask.show();                                                    // mask ready

await session.resume();
// Viewer sees: cursor on target, close-up framed, mask applied — no transition
```

**Every `frame()` call during pause must use `duration: 0`.** There's no point animating what won't be seen.

## Masks

Create overlay layers on elements for spotlight effects, blur/redaction, and cover/reveal animations. Each mask is tied to a CSS selector and composited between the content and cursor layers (so masks scale naturally with zoom).

```typescript
const mask = await session.mask(selector, opts?)
```

**MaskOptions:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `color` | `[r, g, b, a]` | `[0, 0, 0, 0]` | RGBA — RGB values 0–255, alpha 0–1 |
| `blur` | `number` | `0` | Blur strength 0–1 |
| `distance` | `number` | `0` | Padding around element in output px. **Negative values crop into the element** (mask smaller than element) |
| `feather` | `number` | `0` | Soft-edge gradient width in output px |
| `inverted` | `boolean` | `false` | `true` = spotlight (dark overlay with element cut out) |
| `borderRadius` | `number` | inherited | Override corner radius in output px. Use `0` for sharp rectangular mask |
| `z` | `number` | `0` | Layer order for compositing (higher = on top) |

**Pixel units:** `distance`, `feather`, and `borderRadius` are in **output video pixels** — what you specify is what you see at the final output resolution, regardless of internal render resolution.

**MaskHandle methods:**

| Method | Description |
|--------|-------------|
| `mask.fadeIn(duration_ms)` | Animate opacity to target over duration |
| `mask.fadeOut(duration_ms)` | Animate opacity to 0 over duration |
| `mask.show()` | Instant show (fadeIn with 0ms) |
| `mask.hide()` | Instant hide (fadeOut with 0ms) |
| `mask.morph(props, duration_ms)` | Animate any mask properties including re-targeting to a different selector |

**MorphProps** (all optional): `selector`, `color`, `blur`, `distance`, `feather`, `z`.

### Spotlight (inverted mask)

Dark overlay with the target element cut out to draw attention:

```typescript
const spotlight = await session.mask('.pricing-card', {
  color: [0, 0, 0, 0.6],
  inverted: true,
  distance: 8,
  feather: 4,
});
await spotlight.fadeIn(400);
await page.waitForTimeout(2000);     // viewer focuses on the card
await spotlight.fadeOut(400);
```

### Other patterns

- **Blur / redaction:** `await session.mask('.password-input', { blur: 0.5 })` → `.show()` … `.hide()`.
- **Cover / reveal:** solid opaque mask (`color: [255,255,255,1]`) → `.show()`, wait, `.fadeOut(800)` reveals content dramatically.
- **Morphing spotlight:** reuse one mask across steps — `await spotlight.morph({ selector: '.step-2' }, 500)` then `.morph({ selector: '.step-3' }, 500)` to walk attention through a sequence.

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

When `image` is set, the PNG replaces the entire title bar — background, traffic lights, everything. The image is stretched to fit the rendered title bar dimensions.

### Cursors

Default cursors are pixel-art style (Minecraft-like blocky design). Override with custom PNGs per cursor type.

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

Keyboard shortcuts render as an overlay when modifier combos are pressed. Auto-captured from `page.keyboard.press()` for combos with modifiers (Cmd, Ctrl, Alt, Shift). Use `session.showKeys()` to trigger manually.

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

## Custom Interstitial Screens

For title cards, chapter dividers, or branded content between scenes — anything that doesn't exist in the app itself — offer to create a local HTML file and navigate the Electron window to it during a pause.

```typescript
await session.pause();
await page.goto(`file://${path.join(__dirname, 'title-card.html')}`, {
  waitUntil: 'domcontentloaded',
});
await session.frame(APP, 'close-up', { duration: 0 });
await session.resume();
await page.waitForTimeout(2500);  // hold the title card
```

Write a minimal HTML file (centered `<h1>` + `<p>` on a matching background) next to the recording script. Style it to match the video's visual identity — same background color/gradient, fonts, and palette as the recording config. These screens should feel like part of the video, not a jarring cut to a different aesthetic.

**Offer to create these HTML files** whenever the user describes content that isn't part of their app: section titles, "before vs. after" cards, feature lists, step numbers, branded intros/outros, or callout screens.

## Directing Principles

**You are not writing E2E tests.** You are directing a professional product tour. Every decision — zoom level, timing, camera move — should be driven by **intent**: what does the viewer need to focus on right now?

### `frame` vs `zoom` — Choose the Right Camera Move

| Use | When |
|-----|------|
| `session.frame(selector, level)` | The transition is backward-looking — by the time the viewer sees the next action, the framing is already set. |
| `session.zoom(selector, level)` | The transition is forward-looking — the viewer watches the camera travel to the target. |

**Tip:** pass `{ duration: 0 }` to snap the camera into the new framing instantly, without animation — e.g. `await session.frame('.hero', 'close-up', { duration: 0 })`.

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
await page.click('.task:nth-child(1) .checkbox');
await session.frame('.task:nth-child(2) .checkbox', 'close-up');
await page.click('.task:nth-child(2) .checkbox');
await session.frame('.task:nth-child(3) .checkbox', 'close-up');
await page.click('.task:nth-child(3) .checkbox');

// GOOD — one frame to the list, click through naturally
await session.frame('.task-list', 'medium');
await page.waitForTimeout(600);
await page.click('.task:nth-child(1) .checkbox');
await page.waitForTimeout(400);
await page.click('.task:nth-child(2) .checkbox');
await page.waitForTimeout(400);
await page.click('.task:nth-child(3) .checkbox');
```

### 3. Breathing Room

Add wait times so the viewer can absorb what they see. This is not a speed test.

```typescript
// After framing in — let viewer orient themselves
await session.frame('.form-group', 'close-up');
await page.waitForTimeout(800);

// After a significant action — let viewer see the result
await page.click('#submit');
await page.waitForTimeout(1200);

// Before framing out — let the close-up linger
await page.waitForTimeout(600);
await session.frame(APP, 'wide');

// After framing out — let viewer see the full picture
await page.waitForTimeout(1500);
```

### 4. Shot Progression

Follow cinematic shot structure: **establish → focus → act → reveal**.

```typescript
// ESTABLISH: Wide shot, let viewer see the whole app
await page.waitForTimeout(1500);

// FOCUS: Frame to the area of interest
await session.frame('.task-list', 'medium');
await page.waitForTimeout(800);

// ACT: Perform the interaction
await page.click('.task:nth-child(3) .checkbox');
await page.waitForTimeout(800);

// REVEAL: Pull back to show the effect (stats updated, list changed, etc.)
await session.frame(APP, 'wide');
await page.waitForTimeout(1500);
```

Not every shot needs all four beats. If the focus is already where it needs to be, skip the zoom. If the result is visible in the current frame, don't pull back.

### 5. Hover Before Clicking

Before every click, hover on the target element and wait 300ms. From the viewer's perspective, this is the difference between a cursor that teleports and clicks vs. one that lands, lets the element highlight, then acts. The hover state (color change, underline, tooltip) gives the viewer a visual cue that something is about to happen.

```typescript
// GOOD — cursor arrives, element highlights, then click
await page.hover('.submit-button');
await page.waitForTimeout(300);
await page.click('.submit-button');

// BAD — click teleports, viewer can't track what happened
await page.click('.submit-button');
```

Apply this to every click in standard demos. In [swift reels](#swift-reel--dynamic-showcase-directing), skip the hover for speed — reserve hover + pause for the final interaction only.

### 6. Parallel Actions — Zoom + Cursor Together

When refocusing to a new area, move the cursor simultaneously with the frame instead of sequentially. `session.frame()` returns immediately after sending the command — the animation plays during subsequent actions.

```typescript
// GOOD — frame and cursor move in parallel, feels natural
await session.frame('.add-to-cart', 'medium');
await page.click('.size-selector');        // cursor moves DURING frame transition
await page.waitForTimeout(800);

// BAD — sequential, feels robotic
await session.frame('.add-to-cart', 'medium');
await page.waitForTimeout(500);            // wait for frame to finish
await page.click('.size-selector');        // then move cursor separately
```

### 7. Cursor Follow for Multi-Step Sequences

When the user performs several actions in sequence (clicking through tabs, filling a form), use `followCursor` to keep the camera tracking naturally. Set zoom level before enabling — don't pass zoom param to `followCursor()`.

```typescript
await session.frame('#first-tab', 'medium', { duration: 0 });  // set zoom level
await session.followCursor();                                    // inherit zoom, start tracking
await page.click('.option-1');
await page.waitForTimeout(600);
await page.click('.option-2');
await session.stopFollowing();
```

To start a recording in follow mode from frame 0, use `onStart`:

```typescript
video('demo', {
  app: { args: [mainJs] },
  onStart: async ({ session }) => {
    await session.frame('.task-list', 'medium', { duration: 0 });
    await session.followCursor();
  },
}, async ({ session, page }) => {
  // capture opens already tracking the cursor on .task-list
});
```

### 8. Typing — Match the Intent

Typing isn't always a close-up moment. Zoom level depends on what the shot is about.

```typescript
// Intent: SHOWCASE the typing (e.g., naming a project, entering a key value)
await session.frame('#project-name', 'super-close-up');
await page.waitForTimeout(400);
await page.click('#project-name');
await page.type('#project-name', 'Ship v2.0 release', { delay: 80 });
await page.waitForTimeout(600);

// Intent: FILL a form (typing is necessary, not the focus)
// Stay at current zoom, type quickly, move on
await page.fill('#email', 'user@example.com');
await page.fill('#company', 'Acme Corp');
await page.waitForTimeout(400);
```

### 9. Select/Dropdown Interactions Need Space

Dropdowns open overlays that need time to render and be seen. After selecting an option, always close the select element and wait 200ms before continuing — leaving it open causes visual artifacts in the recording.

```typescript
await session.frame('.form-group-with-select', 'close-up');
await page.waitForTimeout(500);
await page.click('#category-select');
await page.waitForTimeout(400);           // let dropdown open
await page.selectOption('#category-select', 'urgent');
await page.waitForTimeout(600);           // let viewer see selection
await page.click('#category-select');     // close the select
await page.waitForTimeout(200);           // wait for it to close
```

### 10. Use Pause to Skip the Boring Parts

Don't make the viewer watch loading screens or repetitive setup. Pause, do the boring work, resume.

```typescript
// BAD — viewer watches a 3-second loading spinner
await page.click('#load-dashboard');
await page.waitForSelector('.dashboard', { state: 'visible' });

// GOOD — skip the wait, viewer sees instant result
await page.click('#load-dashboard');
await session.pause();
await page.waitForSelector('.dashboard', { state: 'visible' });
await session.resume();
await page.waitForTimeout(800);           // let viewer absorb the result
```

### 11. Spotlights Direct Attention

When a screen is busy, use an inverted mask to darken everything except the element you're about to interact with.

```typescript
const spotlight = await session.mask('.key-feature', {
  color: [0, 0, 0, 0.5],
  inverted: true,
  distance: 8,
  feather: 4,
});
await spotlight.fadeIn(300);
await page.waitForTimeout(1200);          // viewer reads the spotlit area
await spotlight.fadeOut(200);
await page.waitForTimeout(200);
await page.click('.key-feature button');
```

## Key Playwright Actions for Demos

| Action | Usage | Notes |
|--------|-------|-------|
| `page.click(selector)` | Click element | Generates cursor movement + click effect |
| `page.fill(selector, text)` | Type into input | Clear + type (instant) |
| `page.type(selector, text, { delay })` | Type character by character | More cinematic with `delay: 60-100` |
| `page.hover(selector)` | Move cursor to element | Good before click for smooth cursor |
| `page.waitForTimeout(ms)` | Pause | Essential for pacing |
| `page.selectOption(sel, val)` | Select dropdown | Pair with waits before/after |
| `page.keyboard.press('Enter')` | Key press | Submit forms |
| `page.evaluate(fn)` | Run JS in app | Set up state before recording |

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
await page.goto('https://www.nike.com/...', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(5000);

// Nuke overlay roots — more reliable than clicking accept buttons
await page.evaluate(() => {
  document.querySelector('#modal-root')?.remove();
  const accept = [...document.querySelectorAll('button')].find(b => /accept/i.test(b.textContent));
  if (accept) accept.click();
});

// Re-check after resume — some sites re-inject modals
await session.resume();
await page.evaluate(() => document.querySelector('#modal-root')?.remove());
```

### Compound Selectors

External sites reuse class names. Combine multiple classes or use data-testid attributes for reliable targeting:

```typescript
// Specific — combines two classes
'.all-access-pass__element.aap-media-card-gallery__timed-dotnav'

// Fallback chains for elements that vary across deployments
'[data-testid="add-to-cart-btn"], button:has-text("Add to Bag")'
```

### Electron Setup

**Using the default main (`app.args` omitted) — nothing to configure.** NextDemo opens each recording in an ephemeral in-memory session and rewrites response `Set-Cookie` headers to `SameSite=None; Secure`, so real sites behave correctly out of the box:

- **Ephemeral session** — cart state, localStorage, and auth cookies from a previous run do not leak into this one. Without this, running a "click Add-to-Cart" recording twice fails because the site swaps the button for a quantity stepper. Set `app.persistSession: true` to keep state across runs.
- **SameSite rewrite** — the window starts at `about:blank`, so every navigation to a real origin looks cross-site. Without the rewrite, Lax/Strict cookies get dropped and consent banners, login redirects, and CSRF flows break silently. Set `app.cookies.rewriteSameSite: false` only when you are specifically testing SameSite enforcement.

**Using a custom main (`app.args: [mainJs]`) — you are on your own.** These defaults apply only to the bundled default main. If your custom main navigates to third-party sites, replicate both behaviors in your `main.js`: a fresh in-memory `session.fromPartition('ephemeral-' + process.pid + '-' + Date.now())` per run, and a `webRequest.onHeadersReceived` hook that rewrites every `Set-Cookie` to `SameSite=None; Secure`.

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
await page.goto('https://github.com', { waitUntil: 'domcontentloaded' });
await session.resume();
await page.waitForTimeout(1500);           // just a flash

// ... more pages ...

// Climax — slow cinematic zoom-out reveals chrome + background
await session.zoom(APP, 'wide', { duration: 7500, easing: 'ease-out' });
```

### One Slow Moment

In a fast reel, exactly ONE cinematic moment (5000–7500ms) makes the speed elsewhere feel intentional. Everything fast + one slow = dynamic. Everything the same speed = monotonous.

### End on the Action

No closing zoom-outs, no fadeOuts, no wind-down. End the video body immediately after the final click — capture stops when the body resolves.

```typescript
await page.click('#cta-button');
// body ends here — capture stops at peak impact
```

### Hover Only for the Final Payoff

Unlike standard demos where you [hover before every click](#5-hover-before-clicking), swift reels skip the hover for speed. Use click-only throughout. Reserve hover → wait → click for exactly one moment: the final interaction. The pause between hover and click builds anticipation against the backdrop of rapid-fire clicks.

```typescript
// Throughout the reel: just click (no hover)
await page.click('#some-button');

// Final scene: hover + anticipation + click
await page.hover('#final-cta');
await page.waitForTimeout(400);
await page.click('#final-cta');
```

### Montage Pages Don't Need Full Loads

For visual flashes in a montage, skip the load wait. Resume immediately — partial render is fine for a 1.5s glimpse.

## Parallel Recording

Declare multiple `video(...)` entries in one script and the CLI records/renders them in parallel — each video gets its own Electron instance. You don't manage concurrency manually; just declare the videos.

```typescript
defineConfig({ app: { args: [mainJs] } })

video('overview', {}, async ({ session, page }) => {
  await page.waitForTimeout(1500);
  await session.frame('.stats', 'medium');
  await page.click('#refresh-btn');
  await session.frame(APP, 'wide');
  await page.waitForTimeout(1500);
});

video('settings', { page: { waitFor: '[data-view="settings"]' } }, async ({ session, page }) => { /* ... */ });
video('deploy',   {},                                              async ({ session, page }) => { /* ... */ });
```

```bash
nextdemo record script.mjs                  # all videos; concurrency = CPU cores
nextdemo record script.mjs --concurrency 2  # limit (memory-constrained CI)
nextdemo record script.mjs --only deploy    # filter
```

**Rules:**
- Each `video(...)` is independent — its own Electron instance, its own output file.
- The `name` becomes the output filename — filesystem-safe (`[A-Za-z0-9_-]+`).
- Set up per-video state via `page.url` / `page.waitFor` / `onStart`.
- Use `defineConfig(...)` at the top of the file to avoid repeating shared `app` / `config`.

**Separate videos vs one long video:**

| Scenario | Approach |
|----------|----------|
| Multiple independent features to demo | Separate `video(...)` entries — they run in parallel |
| Multi-step flow through one app (e.g. wizard) | One `video(...)` — sequential scenes in a single body |
| Same feature, different configs/themes | Separate `video(...)` entries with different `config` |
| Long single recording | One `video(...)` |

## Project Setup

```bash
npm install playwright nextdemo
nextdemo activate <license-key>   # activate before first run
```

## Before Writing a Script

1. Read the user's app code to understand the UI (selectors, routes, features)
2. Ask what flow they want to demo if not specified
3. Plan your shot list: what does the viewer need to see, in what order?
4. **Consider splitting into multiple `video(...)` entries**: if demoing multiple independent features, declare each as its own `video(...)` so they record in parallel
5. Use realistic data in fills/inputs
6. Think like a director: establish → focus → act → reveal
7. Add comments explaining each section of the demo
