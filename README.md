# Entity Notes

An [Obsidian](https://obsidian.md) plugin that watches your editor for lines containing user-configured trigger tags (e.g. `#person`, `#project`) and shows an inline button next to each match. Clicking the button creates a dedicated Markdown note for that entity with pre-filled YAML frontmatter, replaces the original line with a wikilink to the new note, and renders a colored pill badge next to the link.

## How it works

1. Type a line containing a trigger tag, for example:
   ```
   Redesign the onboarding flow #project
   ```
2. A small `→ Project` button appears at the end of the line.
3. Click it. The plugin:
   - Creates `Entities/Projects/Redesign the onboarding flow.md` with frontmatter
   - Replaces the line with `[[Redesign the onboarding flow]]`
   - Renders a colored `project` pill badge after the link (decoration only — not written to the file)

List items are handled naturally — `- Met Alice #person` becomes `- [[Met Alice]]`.

## Default entity types

| Name           | Trigger tag      | Target folder              | Pill color |
|----------------|------------------|----------------------------|------------|
| Person         | `#person`        | `Entities/People`          | ![#4a90d9](https://placehold.co/12x12/4a90d9/4a90d9.png) `#4a90d9` |
| Idea           | `#idea`          | `Entities/Ideas`           | ![#f5a623](https://placehold.co/12x12/f5a623/f5a623.png) `#f5a623` |
| Accomplishment | `#accomplishment`| `Entities/Accomplishments` | ![#7ed321](https://placehold.co/12x12/7ed321/7ed321.png) `#7ed321` |
| Feedback       | `#feedback`      | `Entities/Feedback`        | ![#9b59b6](https://placehold.co/12x12/9b59b6/9b59b6.png) `#9b59b6` |
| Project        | `#project`       | `Entities/Projects`        | ![#e74c3c](https://placehold.co/12x12/e74c3c/e74c3c.png) `#e74c3c` |

All defaults can be edited or deleted, and you can add your own entity types.

## Settings

### Global

- **Convert on enter** (default: off) — when enabled, pressing Enter at the end of a matched line triggers the conversion immediately, without clicking the button. A newline is still inserted as normal. The button remains visible and continues to work alongside this setting.

### Per entity type

- **Name** — display label shown on the button and pill
- **Trigger tag** — the hashtag that activates detection (e.g. `#person`)
- **Target folder** — vault path where notes are created
- **Color** — background color of the pill badge
- **Enabled** — disable an entity type without deleting it
- **Frontmatter template** — extra key-value fields written into every created note

Changes take effect immediately without reloading the plugin.

## Created note format

```yaml
---
title: "Redesign the onboarding flow"
entity-type: "project"
tags:
  - project
created: "2026-03-22"
source-note: "[[Daily Note 2026-03-22]]"
---
```

Standard fields (`title`, `entity-type`, `tags`, `created`, `source-note`) are always included. Fields from the frontmatter template are appended. If the template defines additional tags, they are merged into the `tags` list rather than replacing it.

## Installation

### Manual

1. Download `main.js`, `styles.css`, and `manifest.json` from the latest release.
2. Copy them to `<vault>/.obsidian/plugins/entity-notes/`.
3. Enable the plugin in Obsidian → Settings → Community plugins.

### Development

```bash
git clone https://github.com/bartvw/entity-notes
cd entity-notes
npm install
npm run dev   # watch mode
```

Copy (or symlink) the folder into `<vault>/.obsidian/plugins/entity-notes/` and enable it in Obsidian.

## FAQ

**Does it work alongside [TaskNotes](https://github.com/callumalpass/tasknotes)?**
Yes — it's designed to complement TaskNotes. Just don't configure `#task` as an entity type in this plugin, since TaskNotes already owns that tag.

**Does it work with [Templater](https://github.com/SilentVoid13/Templater)?**
Yes. Enable the "Trigger Templater on new file creation" setting in Templater and it will apply your template to each newly created entity note.

---

## License

MIT — see [LICENSE](LICENSE).

Inspired by the inline task-to-note conversion pattern in [TaskNotes](https://github.com/callumalpass/tasknotes) by Callum Alpass.
