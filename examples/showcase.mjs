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
 * Run from the meta workspace: `just record-showcase`.
 *
 * Prerequisites:
 *   - NextDemo landing page running at http://localhost:5173
 */
import { video, APP } from 'nextdemo';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexHtml = `file://${path.join(__dirname, 'index.html')}`;

video('showcase', {
  page: { url: indexHtml },
  fps: 30,
  config: {
    window: { width: 1440, height: 900 },
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
      quality: 0.92,
      virtual_display_width: 1920,
      virtual_display_height: 1080,
    },
  },
  onStart: async ({ session }) => {
    await session.followType('#prompt-input', { duration: 0 });
  }
}, async ({ session, page }) => {
  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 1: CLI Interface — "Make a showcase video where"
  // Features: ZOOM, CURSOR
  // ═══════════════════════════════════════════════════════════════════════════

  await page.click('#prompt-input');
  await page.waitForTimeout(300);
  await page.type('#prompt-input', 'Make a showcase video where', { delay: 100 });
  await page.waitForTimeout(600);
  await session.stopFollowing();

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 2: Father's Coffee — Product page interaction
  // Features: ZOOM (image → Add to cart), CURSOR (click effect)
  // ═══════════════════════════════════════════════════════════════════════════

  await session.pause();
  await page.goto(
    'https://fathers.cz/kava/filtr/kolumbie-chapata',
    { waitUntil: 'domcontentloaded', timeout: 30000 },
  );

  // Wait for CookieScript banner (the lib fathers.cz uses) and dismiss it.
  // "#cookiescript_accept" is the library's stable id for the "Vše přijmout" button.
  await page.waitForSelector('#cookiescript_accept', { timeout: 5000 }).catch(() => {});
  await page.evaluate(() => {
    document.querySelector('#cookiescript_accept')?.click();
  });
  await page.waitForTimeout(500);

  // The page renders two responsive gallery versions. At 1440px (Electron
  // recording width) the desktop hero is img.w-full with alt "CHAPATA F 300G";
  // the mobile version (img.size-full) is display:none. Match the desktop one
  // specifically or Playwright picks the hidden mobile element first.
  const heroImage = 'img.w-full[alt="CHAPATA F 300G"]';
  await page.waitForSelector(heroImage, { state: 'visible', timeout: 10000 });

  // Pre-zoom on the product image while paused (viewer sees instant cut).
  // At 1440x900 the image, variants, and cart button are all in the initial
  // viewport — no scrolling needed between frames.
  await session.frame(heroImage, 'close-up', { duration: 0 });
  await page.waitForTimeout(600);

  await session.resume();
  await page.waitForTimeout(1500);

  // Refocus to Do košíku (medium) — while the zoom animates, pick the weight in parallel.
  await session.frame(
    'button:has-text("Do košíku"), a:has-text("Do košíku")',
    'medium',
  );
  // Cursor moves to weight selector during the zoom transition
  await page.click('button:has-text("1 kg")');
  await page.waitForTimeout(800);

  // Click Do košíku
  await page.click('button:has-text("Do košíku")');
  await page.waitForTimeout(1000);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 3: GitHub Login — Form fill with blurred password
  // Features: MASKING (blur for redaction)
  // ═══════════════════════════════════════════════════════════════════════════

  await session.pause();
  await page.goto('https://github.com/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForSelector('#login_field', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await session.resume();

  // Fill email — instant focus
  await session.frame('#login_field', 'close-up', { duration: 0 });
  await page.click('#login_field');
  await page.type('#login_field', 'joe@example.com', { delay: 60 });
  await page.waitForTimeout(600);

  // Solid black cover on password — hard edges, no transparency
  const passwordCover = await session.mask('#password', {
    color: [180, 180, 180, 1],
    distance: -10,
    feather: 7,
    //borderRadius: 0
  });

  // Type password — mask fades in as typing begins, expanding left
  await session.frame('#password', 'close-up', { duration: 200 });
  await page.click('#password');
  await page.type('#password', 'su', { delay: 60 });
  await passwordCover.fadeIn(400);
  await page.type('#password', 'p3r-s3cret!@#456', { delay: 50 });
  await page.waitForTimeout(600);

  // Click Sign In and immediately cut
  await page.click('input[name="commit"]');
  await page.waitForTimeout(30);
  await session.pause();
  await passwordCover.hide();

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 4: Linear — Keyboard scroll through hero sections
  // Features: KEYBOARD EVENTS (overlay)
  // ═══════════════════════════════════════════════════════════════════════════

  await session.pause();
  await page.goto('https://linear.app', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  // Dismiss cookie / consent popup if present
  await page.evaluate(() => {
    const accept = document.querySelector('#onetrust-accept-btn-handler, [data-testid="cookie-accept"]')
      || [...document.querySelectorAll('button')].find(b => /accept/i.test(b.textContent));
    if (accept) accept.click();
  });
  await page.waitForTimeout(500);

  // Pre-frame at medium zoom while paused
  await session.frame(APP, 'medium', { duration: 0 });
  session.hideCursor();

  await session.resume();
  await page.waitForTimeout(1000);

  // Press Down arrow twice — keyboard overlay surfaces the key; scroll-linked
  // hero animates between presses
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(1200);

  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(1500);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 5: Cloudflare Workers — Cursor follow from AI Agents to Multiplayer
  // Features: CURSOR FOLLOW
  // ═══════════════════════════════════════════════════════════════════════════

  await session.pause();
  session.showCursor();
  await page.goto('https://workers.cloudflare.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Dismiss cookie / consent popup
  await page.evaluate(() => {
    const accept = document.querySelector('#onetrust-accept-btn-handler')
      || document.querySelector('.onetrust-close-btn-handler')
      || [...document.querySelectorAll('button')].find(b => /accept/i.test(b.textContent));
    if (accept) accept.click();
  });
  await page.waitForTimeout(500);

  // Scroll the architecture tabs into view
  await page.evaluate(() => {
    const el = document.querySelector('#architecture-tab-0');
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await page.waitForTimeout(500);

  // Position cursor on AI Agents tab and close shot while paused
  await page.hover('#architecture-tab-0');
  await session.frame('#architecture-tab-0', 'medium', { duration: 0 });

  await session.resume();
  await page.waitForTimeout(50);

  // Enable cursor follow — keep close-up zoom level while tracking
  await session.followCursor();
  await page.waitForTimeout(750);
  session.hideCursor();

  // Move from AI Agents to Multiplayer. The zoom-out starts here and runs
  // continuously across Scene 6's locale swaps — the camera never stops.
  // session.pause() freezes the zoom animation's clock, so the zoom only
  // progresses during on-camera time (EN beat + 3 locale beats = 6s).
  await page.click('#architecture-tab-3');
  await session.stopFollowing();
  await page.waitForTimeout(300);

  // Kick off the long zoom-out. NOT awaited — we interleave locale swaps below.
  const zoomOut = session.zoom(APP, 'wide', { duration: 6000, easing: 'ease-out' });

  // EN beat — zoom plays for ~1.5s while viewer reads the English page
  await page.waitForTimeout(1500);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 6: Cloudflare Workers × 4 locales — One continuous zoom-out, camera
  // keeps moving while the page swaps between languages underneath. The
  // section heading above the architecture tabs localizes in DE/FR/ES; tab
  // labels and panel text stay English and anchor the camera visually.
  // Features: CUSTOM BACKGROUND, CHROME, localization story
  // ═══════════════════════════════════════════════════════════════════════════

  const workerLocales = [
    'https://workers.cloudflare.com/de-de/',
    'https://workers.cloudflare.com/fr-fr/',
    'https://workers.cloudflare.com/es-es/',
  ];

  for (const url of workerLocales) {
    await session.pause();
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    // Dismiss OneTrust cookie banner (reappears per-session per-domain).
    await page.evaluate(() => {
      const accept = document.querySelector('#onetrust-accept-btn-handler')
        || document.querySelector('.onetrust-close-btn-handler')
        || [...document.querySelectorAll('button')].find(b => /accept/i.test(b.textContent));
      if (accept) accept.click();
    });
    await page.waitForTimeout(1500);

    // Restore Scene 5's scroll position and reactivate the Multiplayer tab so
    // the page layout matches across locales. All happens while paused —
    // viewer doesn't see the scroll jump or the tab activation.
    await page.evaluate(() => {
      const el = document.querySelector('#architecture-tab-0');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    await page.click('#architecture-tab-3');
    await page.waitForTimeout(300);

    // Do NOT re-frame the camera here — the zoomOut animation is running and
    // we want it to continue uninterrupted when we resume.
    await session.resume();
    await page.waitForTimeout(1500);
  }

  // Ensure the zoom has fully completed before Scene 7 begins.
  await zoomOut;


  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE 7: NextDemo landing — Spotlight mask on hero CTA
  // Features: MASKING (spotlight / inverted)
  // ═══════════════════════════════════════════════════════════════════════════

  await session.pause();
  await page.waitForTimeout(100);
  await page.goto('http://localhost:5173', {
    waitUntil: 'networkidle',
    timeout: 15000,
  });
  await page.waitForTimeout(1000);
  session.showCursor();

  // Ensure the hero CTA is fully in the viewport before framing/masking
  await page.evaluate(() => {
    const btn = document.querySelector('section#hero a');
    if (btn) btn.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  await page.waitForTimeout(300);

  // Spotlight mask — only the hero CTA is visible
  const spotlight = await session.mask('section#hero a:has-text("Get NextDemo")', {
    color: [0, 0, 0, 1],
    inverted: true,
    distance: 10,
    feather: 15,
  });

  // Focus on the Get Nextdemo button in the hero section
  await session.frame('section#hero a:has-text("Get NextDemo")', 'wide', { duration: 0 });
  await spotlight.show();

  await session.resume();
  await page.waitForTimeout(2500);
  await page.hover('section#hero a:has-text("Get NextDemo")');
  await page.waitForTimeout(400);

  // Click the CTA
  await page.click('section#hero a:has-text("Get NextDemo")');
});
