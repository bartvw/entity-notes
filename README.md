# Entity Notes

An [Obsidian](https://obsidian.md) plugin for creating **entity notes on the fly**. While you write, drop a dangling `[[wikilink]]` for a person, project, or idea, tag it with `#person` / `#project` / `#idea`, and click the inline button — the plugin spins up a structured Markdown note for that entity with pre-filled YAML frontmatter, and the dangling link now resolves to it.

Every link in your vault that points to an entity note is decorated with a small colored pill showing its type, so you can see at a glance which links are people, which are projects, and which are ideas — in Live Preview, Source mode, and Reading mode.

## How it works

### Tag a dangling link to turn it into an entity

The main workflow: as you write, link to entities that don't exist yet and tag them.

1. Type a dangling wikilink followed by a trigger tag:
   ```
   Had coffee with [[Alice]] #person about [[Project Alpha]] #project
   ```
2. A small `→ Person` button appears after `#person`, and a `→ Project` button appears after `#project`. Each one is independent and converts only its own link.
3. Click `→ Person`. The plugin:
   - Creates `Entities/People/Alice.md` with frontmatter
   - Strips `#person` from the line, leaving `[[Alice]]` in place — now resolving to the new note
   - Renders a colored `person` pill after the link (decoration only — not written to the file)
4. Click `→ Project` to do the same for `Project Alpha`.

The line ends up as:

```
Had coffee with [[Alice]] about [[Project Alpha]]
```

…and renders as:

```
Had coffee with [[Alice]] [person] about [[Project Alpha]] [project]
```

### Pills follow your entity notes everywhere

Once a note is an entity, every wikilink pointing at it gets a pill, no matter where the link lives. The pill is a visual decoration only — it's never written into your files. Color and label come from the entity type's settings.

### Convert a whole line instead

If a line doesn't have a dangling wikilink in front of the trigger tag, the entire line is converted instead:

```
Redesign the onboarding flow #project
```

Click `→ Project` and the line becomes `[[Redesign the onboarding flow]]`, with a new note created at `Entities/Projects/Redesign the onboarding flow.md`. List items are handled naturally — `- Met Alice #person` becomes `- [[Met Alice]]`.

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

- **Convert on enter** (default: off) — when enabled, pressing Enter at the end of a matched line triggers conversion immediately, without clicking the button. All matches on the line are converted at once. A newline is still inserted as normal.
- **Identify entities by** (default: Entity-type property) — controls how the plugin recognises which notes are entity notes (and which type) so it can render pills:
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

**Dangling-link conversion** creates a note with frontmatter only (no body). The title field is the bare link text.

```markdown
---
title: "Alice"
entity-type: "person"
tags:
  - person
created: "2026-05-13"
source-note: "[[Daily Note 2026-05-13]]"
---
```

**Line conversion** creates a note with frontmatter and a body:

```markdown
---
title: "Redesign the onboarding flow"
entity-type: "project"
tags:
  - project
created: "2026-05-13"
source-note: "[[Daily Note 2026-05-13]]"
---

Redesign the onboarding flow
```

The body contains the line text with the trigger tag and list markers stripped. Wikilinks embedded in the line are preserved in full in both the title field and the body, while the filename strips the brackets (`[[Alice]]` → `Alice`).

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
