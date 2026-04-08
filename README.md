# NextDemo

Screen recording & editing tool for creating polished demo videos of your Electron apps.

## Install

```bash
npm install nextdemo
```

## AI Skill

NextDemo ships with a recording skill that teaches your AI assistant how to write NextDemo recording scripts. Install it for your editor:

### Claude Code

```
/plugin marketplace add tomasbonco/nextdemo
/plugin install nextdemo-record@tomasbonco-nextdemo
```

### Cursor

Download the skill into your project:

```bash
mkdir -p .cursor/skills/nextdemo-record
curl -fsSL https://raw.githubusercontent.com/tomasbonco/nextdemo/main/skills/nextdemo-record/SKILL.md \
  -o .cursor/skills/nextdemo-record/SKILL.md
```

Or install globally:

```bash
mkdir -p ~/.cursor/skills/nextdemo-record
curl -fsSL https://raw.githubusercontent.com/tomasbonco/nextdemo/main/skills/nextdemo-record/SKILL.md \
  -o ~/.cursor/skills/nextdemo-record/SKILL.md
```

### Other editors

Any editor supporting the [Agent Skills](https://agentskills.io) standard can use [`skills/nextdemo-record/SKILL.md`](skills/nextdemo-record/SKILL.md). Download it into your editor's skills directory with the same `curl` command above, pointed at the right path.

For editors without skills support, you can paste the contents of [`SKILL.md`](skills/nextdemo-record/SKILL.md) directly into your AI assistant's context.

## Recording Script Example

See [examples/showcase.mjs](examples/showcase.mjs) for a full showcase recording script.

## Links

- [Website](https://nextdemo.app)
- [npm](https://www.npmjs.com/package/nextdemo)

## License

This repository (the Claude Code plugin files — skill definitions, example scripts, and manifests) is licensed under the [MIT License](LICENSE).

**NextDemo itself**, the CLI tool this plugin invokes, is proprietary software licensed separately under its own EULA. See [nextdemo.app](https://nextdemo.app) for details.
