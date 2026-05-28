---
name: nextdemo-record
description: Use when the user wants to record a polished demo video of a web app, CLI, or Electron app. NextDemo captures via Playwright + Electron and produces studio-quality mp4 output with cursor effects, zooms, and transitions.
---

NextDemo is a screen recording tool for creating demo videos of apps. Use this skill when the user wants to capture an app demo, marketing reel, walkthrough, or tutorial video, and they want polished output (smooth zooms, cursor effects, code-friendly captures) rather than a raw screen recording.

## How to use this skill

1. **Confirm nextdemo is installed.** Run `nextdemo --version`. If the command isn't found, instruct the user to install it (`npm i -g nextdemo`) or invoke it on-demand via `npx nextdemo`. The skill cannot produce working scripts without the CLI — it is the runtime that captures the window.
2. **Load the authoring guide.** Run `nextdemo skill` and follow the guide it prints. That output is the version-coherent authoring guide for the user's installed CLI — it teaches exactly the primitives, options, and patterns that the user's binary supports. It is the source of truth for *how* to write a recording script.
3. **Surface any "Update available" banner.** If the first lines of `nextdemo skill`'s output begin with `Update available:`, relay that banner to the user before continuing. They may want to upgrade first to access the newest primitives, especially for a major bump (which carries an EULA change).

## Key behaviors to know before writing scripts

**Chrome (window frame) defaults to automatic.** When you record a mobile-emulated page — a phone-sized viewport or a page with touch/mobile emulation — NextDemo automatically renders a phone frame around it. You don't need to set `chrome.style` at all for mobile recordings. Set `style` explicitly (`"none"`, `"macos"`, `"windows"`) if you want a specific look or need to opt out of the phone frame, for example for a vertical export without a bezel.

**Cursor preset defaults to automatic.** The cursor follows the chrome: a phone frame gets a touch circle, anything else gets the arrow + I-beam. Override `chrome.style` and the cursor follows. To force a touch cursor without the phone bezel (e.g. for a chrome-less mobile export), set `preset: "mobile"` explicitly; set `preset: "default"` for the arrow regardless.
