/**
 * Animated backgrounds — `session.animateBg()`.
 *
 * Three things this example shows, in order:
 *   1. Cross-fade solid → solid (lerps RGBA components)
 *   2. Rotate the active gradient in place (angle 0° → 360° — the
 *      gradient stays "alive" rather than blending between stills)
 *   3. Cross-type fade — solid → radial gradient
 *
 * The window content is intentionally still; everything moving is the
 * canvas padding around it.
 *
 * Run:
 *   npx nextdemo record examples/animated-bg.mjs
 *
 * Pre-rendered preview: ./animated-bg.mp4
 */
import { video } from 'nextdemo';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Animated backgrounds</title>
  <style>
    :root { --paper: #f6f5f1; --ink: #1c1c1c; --accent: #d94f30; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; background: var(--paper); color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; }
    body { display: flex; flex-direction: column; padding: 48px 64px; gap: 24px; }
    h1 { margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -0.02em; }
    p.lede { margin: 0; font-size: 18px; color: #5a5a5a; max-width: 56ch; line-height: 1.4; }
    .panel { background: white; border: 1px solid #e6e3dc; border-radius: 12px; padding: 24px;
      box-shadow: 0 1px 0 rgba(0,0,0,.04); }
    .row { display: flex; gap: 16px; align-items: center; }
    .dot { width: 14px; height: 14px; border-radius: 50%; background: var(--accent); }
    code { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 14px;
      background: #efece5; padding: 2px 6px; border-radius: 4px; }
    .footer { margin-top: auto; font-size: 13px; color: #8c8c8c; }
  </style>
</head>
<body>
  <h1>Animated backgrounds</h1>
  <p class="lede">The window sits unchanged. The canvas around it is what's moving.</p>
  <div class="panel">
    <div class="row"><span class="dot"></span><strong>Recording target</strong></div>
    <p style="margin: 12px 0 0;">Watch the padding — that's the background.</p>
  </div>
  <div class="footer">Try: <code>session.animateBg({ gradient: { angle: 360 } }, 6000)</code></div>
</body></html>`;

const htmlPath = path.join(tmpdir(), `nextdemo-animated-bg-${Date.now()}.html`);
writeFileSync(htmlPath, HTML);

video('animated-bg', {
  page: { url: pathToFileURL(htmlPath).href },
  fps: 30,
  config: {
    window: { width: 1280, height: 720 },
    output: { width: 1920, height: 1080, quality: 0.9 },
    // Start on a deep navy gradient. The first animateBg() below will
    // rotate it; later calls switch shape/type via cross-type fade.
    background: {
      type: 'gradient',
      gradient: {
        type: 'linear',
        angle: 0,
        stops: [
          { color: '#0b1020', position: 0.0 },
          { color: '#d94f30', position: 0.5 },
          { color: '#f2b134', position: 1.0 },
        ],
      },
    },
    chrome: { style: 'macos', theme: 'light', corner_radius: 12 },
  },
}, async ({ session, page }) => {
  await page.waitForTimeout(800);

  // 1. Rotate the gradient in place — partial config, only the named
  //    fields change. Stops + type stay the same, angle sweeps 0 → 360
  //    over 5s. The seam visibly rotates across the canvas.
  await session.animateBg({ gradient: { angle: 360 } }, 5000);

  await page.waitForTimeout(400);

  // 2. Cross-type fade — full config switches background shape. Goes
  //    through the pixel-blend path because there's no parametric lerp
  //    between a linear gradient and a radial one.
  await session.animateBg({
    type: 'gradient',
    gradient: {
      type: 'radial',
      angle: 0,
      stops: [
        { color: '#f2b134', position: 0.0 },
        { color: '#d94f30', position: 0.6 },
        { color: '#0b1020', position: 1.0 },
      ],
    },
  }, 1800);

  await page.waitForTimeout(400);

  // 3. Collapse back to a solid — animates RGBA components in place.
  await session.animateBg({ type: 'solid', color: '#1f8a70' }, 1500);

  await page.waitForTimeout(800);
});
