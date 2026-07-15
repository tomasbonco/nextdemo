# NextDemo

**The demo records itself.**

Tell your agent what to demo — it writes the script, NextDemo renders the mp4. Cinematic zoom, spotlight masks, cursor tracking, keyboard overlays, pixel-perfect every time. Whenever the product changes, re-render in minutes instead of re-shooting.

Works for web apps, Electron apps, and mobile-web flows, driven through Playwright.

## Install

Paste this into your agent:

```
Install https://nextdemo.app/install.md
```

It checks Node.js and ffmpeg, installs NextDemo and this skill, activates your license, and records a verification clip to prove the pipeline works — then asks what you'd like to film. Works with Claude Code, Codex, Cursor, Gemini CLI, Copilot, Windsurf, or any agent that can fetch a URL and run shell commands.

<details>
<summary>Manual install</summary>

```
npm install nextdemo
npx skills add tomasbonco/nextdemo
nextdemo activate <license-key>
nextdemo --version
```

</details>

Full docs: [nextdemo.app/start](https://nextdemo.app/start)

## Links

- [Website](https://nextdemo.app)
- [npm](https://www.npmjs.com/package/nextdemo)

## License

Plugin files in this repository (skill definitions, manifests) are MIT licensed. NextDemo itself is proprietary — see [nextdemo.app/legal/eula](https://nextdemo.app/legal/eula).
