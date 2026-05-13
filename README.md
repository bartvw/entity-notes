# Entity Notes

An [Obsidian](https://obsidian.md) plugin that displays color-coded pills next to wikilinks that point to entity notes, making it easy to see at a glance what type of entity each link represents. It also provides a quick way to create new entity notes: type a dangling wikilink followed by a trigger tag (e.g. `[[Project Alpha]] #project`), click the inline button, and the plugin creates a structured note with YAML frontmatter.

## Features

### Entity pills

The plugin scans your notes for wikilinks that point to entity notes (notes with an `entity-type` property or matching tags) and displays a colored pill badge after each link. The pill shows the entity type name and uses the configured color — all purely visual, never written to the file.

![pill example](https://placehold.co/400x40/1a1a1a/ffffff?text=[[Project+Alpha]]+[project])

Pills appear in Live Preview, Source mode, and Reading mode.

### Creating entities from dangling links

The main way to create entity notes is by converting dangling (unresolved) wikilinks:

1. Write a wikilink that doesn't yet have a note, followed by a trigger tag:
   ```
   [[Project Alpha]] #project
   ```
2. A `→ Project` button appears after `#project`.
3. Click it. The plugin:
   - Creates `Entities/Projects/Project Alpha.md` with frontmatter (no note body)
   - Strips `#project` from the source line, leaving `[[Project Alpha]]` in place — which now resolves to the new note
   - Renders a `project` pill badge after the link

#### Multiple entities on one line

A line can have multiple buttons — one per unresolved wikilink+tag pair:

```
[[Alice]] #person [[Project Alpha]] #project
```

Each button converts only its own wikilink. Clicking `→ Person` creates `Alice.md` and strips `#person`; the rest of the line is unchanged until you click `→ Project`.

### Line conversion

When the trigger tag appears on a line without a preceding unresolved wikilink, the entire line is converted:

1. Type a line containing a trigger tag:
   ```
   Redesign the onboarding flow #project
   ```
2. A small `→ Project` button appears immediately after `#project`.
3. Click it. The plugin:
   - Creates `Entities/Projects/Redesign the onboarding flow.md` with frontmatter and a note body
   - Replaces the line with `[[Redesign the onboarding flow]]`
   - Renders a colored `project` pill badge after the link

List items are handled naturally — `- Met Alice #person` becomes `- [[Met Alice]]`.

## Default entity types

| Name           | Trigger tag      | Target folder              | Pill color |
|----------------|------------------|----------------------------|------------|
| Person         | `#person`        | `Entities/People`          | ![#4a90d9](https://placehold.co/12x12/4a90d9/4a90d9.png) `#4a90d9` |
| Idea           | `#idea`          | `Entities/Ideas`           | ![#f5a623](https://placehold.co/12x12/f5a623/f5a623.png) `#f5a623` |
| Accomplishment | `#accomplishment`| `Entities/Accomplishments` | ![#7ed321](https://placehold.co/12x12/7ed321/7ed321.png) `#7ed321` |
| Feedback       | `#feedback`      | `Entities/Feedback`        | ![#9b59b6](https://placehold.co/12x12/9b59b6/9b59b6.png) `#9b59b6` |
| Project        | `#project`       | `Entities/Projects`        | ![#e74c3c](https://placehold.co/12x12/e74c3c/e74c3c.png) `#e74c3c` |
| Task           | `#task`          | `Entities/Tasks`           | ![#1abc9c](https://placehold.co/12x12/1abc9c/1abc9c.png) `#1abc9c` |

All defaults can be edited or deleted, and you can add your own entity types.

## Settings

### Global

- **Convert on enter** (default: off) — when enabled, pressing Enter at the end of a matched line triggers conversion immediately, without clicking the button. All matches on the line are converted at once. A newline is still inserted as normal.
- **Identify entities by** (default: Entity-type property) — controls how the plugin recognises entity notes for pill display:
  - *Entity-type property* — the `entity-type` frontmatter field must be present and match an entity type id. At most one pill per link.
  - *Tag* — the `tags` frontmatter field must contain one or more entity type ids. One pill per matching tag; a single note can match multiple types.

### Frontmatter fields

Each of the five standard frontmatter fields has an **enabled** toggle and a configurable **field name** (the YAML key written to created notes). All are on by default with the names shown in the [Created note format](#created-note-format) section. You can rename them (e.g. `title` → `note-title`) to match your vault's property conventions; existing notes are not affected.

> **Note:** When using *Entity-type property* mode, disabling the `entity-type` field will prevent pills from appearing on newly created entity notes.

### Per entity type

- **Name** — display label shown on the button and pill
- **Trigger tag** — the hashtag that activates detection (e.g. `#person`)
- **Target folder** — vault path where notes are created
- **Color** — background color of the pill badge
- **Enabled** — disable an entity type without deleting it
- **Frontmatter template** — extra key-value fields written into every created note

Changes take effect immediately without reloading the plugin.

## Created note format

**Line conversion** creates a note with frontmatter and a body:

```markdown
---
title: "Redesign the onboarding flow"
entity-type: "project"
tags:
  - project
created: "2026-03-22"
source-note: "[[Daily Note 2026-03-22]]"
---

Redesign the onboarding flow
```

The note body contains the line text with the trigger tag and list markers stripped. Wikilinks embedded in the line are preserved in full in both the title field and the body, while the filename strips the brackets (`[[Alice]]` → `Alice`).

**Wikilink conversion** creates a note with frontmatter only (no body). The title field is the bare link text.

All five standard fields are optional and their names are configurable (see [Frontmatter fields](#frontmatter-fields) above). Fields from the frontmatter template are appended after the standard fields. Template tags are merged into the `tags` list; any template key that matches a standard field name is ignored (standard fields always win).

## Installation

### Manual

1. Download `main.js`, `styles.css`, and `manifest.json` from the latest release.
2. Copy them to `<vault>/.obsidian/plugins/entity-notes/`.
3. Enable the plugin in Obsidian → Settings → Community plugins.

### Development

```bash
git clone https://github.com/bartvw/entity-notes
cd entity-notes
pnpm install
pnpm run dev   # watch mode
```

Copy (or symlink) the folder into `<vault>/.obsidian/plugins/entity-notes/` and enable it in Obsidian.

## FAQ

**Does it work alongside [TaskNotes](https://github.com/callumalpass/tasknotes)?**
Yes — it's designed to complement TaskNotes. Both plugins can be active at the same time.

**Does it work with [Templater](https://github.com/SilentVoid13/Templater)?**
Yes. Enable the "Trigger Templater on new file creation" setting in Templater and it will apply your template to each newly created entity note.

---

## License

MIT — see [LICENSE](LICENSE).

Inspired by the inline task-to-note conversion pattern in [TaskNotes](https://github.com/callumalpass/tasknotes) by Callum Alpass.
