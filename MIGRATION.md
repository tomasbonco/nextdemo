<!-- Append-only, newest first. One section per breaking change. -->
<!-- New entries use the heading `## vNEXT — …`. The release script stamps vNEXT with the -->
<!-- real version on the next full (non-RC) release; RC releases leave it as vNEXT. -->

# Migration guide

Breaking changes to the NextDemo recording API, newest first. If you are editing a
recording script written against an older version and the SDK no longer recognizes
an API it uses, find it below.

## v1.4 — recording starts on the first `session.resume()`

**What changed.** A recording is now **paused until you call `session.resume()`**.
Compose the opening shot — navigate, wait for assets, set the camera — first; the
first `resume()` locks frame 0 and starts the timeline. This removes the two old
"frame 0" mechanisms:

- `onStart` (the `video()` option) — **removed**.
- `config.zoom.initial_zoom` — **removed**.

**Why.** The opening shot is usually chosen in the script body — a scene loop, or a
condition that picks the first scene — so `onStart` ran too early to compose it and
videos opened on a black, white, or half-loaded frame. Composing in the body and
revealing with `resume()` works for every case, including a dynamically-chosen
first scene.

**Migrate.** Move everything from `onStart` to the top of the body, replace any
`initial_zoom` with a `frame()` call, and end the setup with `session.resume()`.

Before:

```js
video('demo', {
  page: { url },
  config: { zoom: { initial_zoom: 'medium' } },
  onStart: async ({ session }) => {
    await session.frame(APP, 'medium', { duration: 0 })
    await session.music.start('./bed.mp3')
  },
}, async ({ session, page }) => {
  // … scenes …
})
```

After:

```js
video('demo', { page: { url } }, async ({ session, page }) => {
  await session.frame(APP, 'medium', { duration: 0 })  // was onStart + initial_zoom
  await session.music.start('./bed.mp3')               // anchors at frame 0
  await session.resume()                               // locks frame 0, timeline begins
  // … scenes …
})
```

If you want the video to open on the raw first paint instead of a composed shot,
call `session.resume()` as the first line, before doing anything else.

If you forget `resume()` entirely, the run still completes successfully — it prints
a loud error and produces a short held-frame video instead of a silent empty file,
so check your output.
