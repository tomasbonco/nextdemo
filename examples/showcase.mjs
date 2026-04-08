/**
 * NextDemo Showcase — a promo video demonstrating all key features:
 *
 *   1. Zooms (multiple framing levels)
 *   2. Custom cursor (default pixel-art)
 *   3. Cursor follow
 *   4. Custom background
 *   5. Keyboard events (overlay)
 *   6. Masking (blur, spotlight)
 *
 * Run:
 *   cd examples/showcase && npm install playwright && npm install ../..
 *   nextdemo record examples/showcase/record.mjs
 *
 * Prerequisites:
 *   - NextDemo landing page running at http://localhost:5173
 */
import pkg from 'nextdemo/playwright';
const { nextdemo, APP } = pkg;
import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mainJs = path.join(__dirname, 'main.js');

// ─── Launch Electron ────────────────────────────────────────────────────────

const app = await electron.launch({ args: [mainJs] });
const window = await app.firstWindow();
await window.waitForLoadState('domcontentloaded');
await window.waitForTimeout(1000);

// ─── Start recording ────────────────────────────────────────────────────────

const session = await nextdemo.startRecording({
  app,
  fps: 30,
  name: 'showcase_sm',
  config: {
    background: {
      type: 'image',
      path: path.join(__dirname, 'background.jpg'), // Image by Martin Martz [https://unsplash.com/@martz90] on Unsplash [https://unsplash.com]
    },
    chrome: {
      style: 'macos',
      theme: 'dark',
      corner_radius: 12,
    },
    keyboard: {
      enabled: true,
      fade_duration_frames: 60,
    },
    zoom: {
      initial_zoom: 'medium',
      default_transition_ms: 500,
    },
    output: {
      width: 768,
      height: 500,
      quality: 0.5,
      virtual_display_width: 1920,                                           
      virtual_display_height: 1080  
    }
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 1: CLI Interface — "Make a showcase video where"
// Features: ZOOM, CURSOR
// ═════════════════════════════════════════════════════════════════════════════

await session.followType('#prompt-input', { duration: 0 });
await session.page.click('#prompt-input');
await session.page.waitForTimeout(300);
await session.page.type('#prompt-input', 'Make a showcase video where', { delay: 100 });
await session.page.waitForTimeout(600);
await session.stopFollowing()

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 2: Nike — Product page interaction
// Features: ZOOM (image → Add to Bag), CURSOR (click effect)
// ═════════════════════════════════════════════════════════════════════════════

await session.pause();
await session.page.goto(
  'https://www.nike.com/t/metcon-10-mens-workout-shoes-WWGl2m1D/HJ1875-002',
  { waitUntil: 'domcontentloaded', timeout: 30000 },
);

await session.page.waitForTimeout(1000);

// Dismiss cookie / consent modals
await session.page.evaluate(() => {
  document.querySelector('#modal-root')?.remove();
  const accept = document.querySelector('[data-testid="dialog-accept-button"]')
    || document.querySelector('#hf_cookie_text_cookieaccept')
    || [...document.querySelectorAll('button')].find(b => /accept/i.test(b.textContent));
  if (accept) accept.click();
});
await session.page.waitForTimeout(500);

// Scroll "Add to Bag" into the middle of the viewport
await session.page.evaluate(() => {
  const btn = document.querySelector('[data-testid="add-to-cart-btn"]')
    || [...document.querySelectorAll('button')].find(b => /add to bag/i.test(b.textContent));
  if (btn) btn.scrollIntoView({ block: 'center', behavior: 'instant' });
});
await session.page.waitForTimeout(500);

// Pre-zoom on the product image while paused (viewer sees instant cut)
await session.frame('[data-testid="HeroImg"]', 'close-up', { duration: 0 });
await session.page.waitForTimeout(600);

await session.resume();
await session.page.waitForTimeout(1500);

// Dismiss modal again if it reappeared
await session.page.evaluate(() => document.querySelector('#modal-root')?.remove());
await session.page.waitForTimeout(300);

// Refocus to Add to Bag (medium) — while the zoom animates, pick the size in parallel
await session.frame(
  '[data-testid="add-to-cart-btn"], button:has-text("Add to Bag")',
  'medium',
);
// Cursor moves to size selector during the zoom transition
await session.page.click(
  'label:has-text("M 14"), [data-testid="size-M14"], input[value*="M 14"]',
);
await session.page.waitForTimeout(800);

// Click Add to Bag
await session.page.click(
  '[data-testid="add-to-cart-btn"], button:has-text("Add to Bag")',
);
await session.page.waitForTimeout(1000);

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 3: GitHub Login — Form fill with blurred password
// Features: MASKING (blur for redaction)
// ═════════════════════════════════════════════════════════════════════════════

await session.pause();
await session.page.goto('https://github.com/login', {
  waitUntil: 'domcontentloaded',
  timeout: 30000,
});
await session.page.waitForSelector('#login_field', { timeout: 10000 });
await session.page.waitForTimeout(1000);
await session.resume();

// Fill email — instant focus
await session.frame('#login_field', 'close-up', { duration: 0 });
await session.page.click('#login_field');
await session.page.type('#login_field', 'joe@example.com', { delay: 60 });
await session.page.waitForTimeout(600);

// Solid black cover on password — hard edges, no transparency
const passwordCover = await session.mask('#password', {
  color: [180, 180, 180, 1],
  distance: -15,
  feather: 5,
  //borderRadius: 0
});

// Type password — mask fades in as typing begins, expanding left
await session.frame('#password', 'close-up', { duration: 200 });
await session.page.click('#password');
await session.page.type('#password', 'su', { delay: 60 });
await passwordCover.fadeIn(400);
await session.page.type('#password', 'p3r-s3cret!@#456', { delay: 50 });
await session.page.waitForTimeout(600);

// Click Sign In and immediately cut
await session.page.click('input[name="commit"]');
await session.page.waitForTimeout(30);
await session.pause();
await passwordCover.hide();

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 4: Apple iPhone 17 Pro — Keyboard arrow navigation
// Features: KEYBOARD EVENTS (overlay)
// ═════════════════════════════════════════════════════════════════════════════

await session.page.goto('https://www.apple.com/iphone-17-pro/', {
  waitUntil: 'domcontentloaded',
  timeout: 30000,
});
await session.page.waitForTimeout(3000);

// Scroll the gallery into view
await session.page.evaluate(() => {
  const el = document.querySelector('.all-access-pass__element.aap-media-card-gallery__timed-dotnav');
  if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
});
await session.page.waitForTimeout(500);

// Focus the trigger element for keyboard interaction
await session.page.click('#media-card-gallery-item-2-trigger');
await session.page.waitForTimeout(300);

// Instant close shot on the background while paused
await session.frame('.all-access-pass__element.aap-media-card-gallery__timed-dotnav', 'close-up', { duration: 0 });
await session.hideCursor();

await session.resume();
await session.page.waitForTimeout(1000);

// Press Right arrow twice — keyboard overlay shows the key
await session.page.keyboard.press('ArrowRight');
await session.page.waitForTimeout(1200);

await session.page.keyboard.press('ArrowRight');
await session.page.waitForTimeout(1500);

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 5: Cloudflare Workers — Cursor follow from AI Agents to Multiplayer
// Features: CURSOR FOLLOW
// ═════════════════════════════════════════════════════════════════════════════

await session.pause();
await session.showCursor();
await session.page.goto('https://workers.cloudflare.com/', {
  waitUntil: 'domcontentloaded',
  timeout: 30000,
});
await session.page.waitForTimeout(3000);

// Scroll the architecture tabs into view
await session.page.evaluate(() => {
  const el = document.querySelector('#architecture-tab-0');
  if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
});
await session.page.waitForTimeout(500);

// Position cursor on AI Agents tab and close shot while paused
await session.page.hover('#architecture-tab-0');
await session.frame('#architecture-tab-0', 'medium', { duration: 0 });

await session.resume();
await session.page.waitForTimeout(50);

// Enable cursor follow — keep close-up zoom level while tracking
await session.followCursor();
await session.page.waitForTimeout(750);
await session.hideCursor();

// Move from AI Agents to Multiplayer
await session.page.click('#architecture-tab-3');
await session.stopFollowing();
await session.page.waitForTimeout(300);
await session.zoom(APP, 'wide', { duration: 8000, easing: 'ease-out' });
await session.page.waitForTimeout(4000);

// ═════════════════════════════════════════════════════════════════════════════
// SCENE 6: Zoom out — Chrome & background showcase
// Features: CUSTOM BACKGROUND, CHROME (window frame)
// ═════════════════════════════════════════════════════════════════════════════

// Quick page montage while zoomed out — chrome + background stay visible
await session.pause();
await session.page.goto('https://github.com', {
  waitUntil: 'domcontentloaded',
  timeout: 20000,
});
await session.page.waitForTimeout(2000);
await session.resume();
await session.page.waitForTimeout(1500);

await session.pause();
await session.page.goto('https://stripe.com', {
  waitUntil: 'domcontentloaded',
  timeout: 20000,
});
await session.page.waitForTimeout(2000);
await session.resume();
await session.page.waitForTimeout(1500);

await session.pause();
await session.page.goto('https://linear.app', {
  waitUntil: 'domcontentloaded',
  timeout: 20000,
});

await session.resume();
await session.page.waitForTimeout(2000);


// ═════════════════════════════════════════════════════════════════════════════
// SCENE 7: NextDemo landing — Spotlight mask on hero CTA
// Features: MASKING (spotlight / inverted)
// ═════════════════════════════════════════════════════════════════════════════

await session.pause();
await session.page.waitForTimeout(100);
await session.page.goto('http://localhost:5173', {
  waitUntil: 'networkidle',
  timeout: 15000,
});
await session.page.waitForTimeout(1000);
await session.showCursor();

// Spotlight mask — only the hero CTA is visible
const spotlight = await session.mask('section#hero a:has-text("Get NextDemo")', {
  color: [0, 0, 0, 1],
  inverted: true,
  distance: 7,
  feather: 15,
});

// Focus on the Get Nextdemo button in the hero section
await session.frame('section#hero a:has-text("Get NextDemo")', 'wide', { duration: 0 });
await spotlight.show();

await session.resume();
await session.page.waitForTimeout(2500);
await session.page.hover('section#hero a:has-text("Get NextDemo")');
await session.page.waitForTimeout(400);

// Click the CTA
await session.page.click('section#hero a:has-text("Get NextDemo")');

// ─── Fin ────────────────────────────────────────────────────────────────────

await session.stop();
await app.close();