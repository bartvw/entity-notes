# entity-notes — Behavior Specification

This document defines the expected behavior of the entity-notes plugin. It is the source of truth for implementation and acceptance criteria. When in doubt about intended behavior, defer to this file.

---

## Overview

The plugin monitors the active editor for lines containing a configured trigger tag (e.g. `#idea`, `#project`). When a matching line is found that has not yet been converted, an inline button appears immediately after the trigger tag. A line can have multiple buttons when it contains multiple unresolved wikilinks each followed by a trigger tag. Clicking a button creates a dedicated Markdown note for that entity, and replaces the relevant portion of the source line with a wikilink to the new note followed by a styled entity pill. The pill is rendered as a CM6 decoration — it is not written to the file.

---

## Default entity types

The plugin ships with the following entity types pre-configured. All are enabled by default. The user can edit, disable, or delete any of them, and add new ones.

| Entity type    | Trigger tag      | Default target folder      | Default color |
|----------------|------------------|----------------------------|---------------|
| Person         | `#person`        | `Entities/People`          | `#4a90d9`     |
| Idea           | `#idea`          | `Entities/Ideas`           | `#f5a623`     |
| Accomplishment | `#accomplishment`| `Entities/Accomplishments` | `#7ed321`     |
| Feedback       | `#feedback`      | `Entities/Feedback`        | `#9b59b6`     |
| Project        | `#project`       | `Entities/Projects`        | `#e74c3c`     |
| Task           | `#task`          | `Entities/Tasks`           | `#1abc9c`     |

---

## Pattern detection

### When a line matches
A line is considered a match when ALL of the following are true:
- It contains a trigger tag belonging to a configured and enabled entity type
- It is not inside a code block or frontmatter block

The trigger tag can appear in two forms, each with different conversion behavior:

#### Case 1: tag after an unresolved wikilink
The tag appears directly after an unresolved wikilink — a `[[wikilink]]` that does not yet resolve to an existing note in the vault. The tag must be the first non-whitespace token after the closing `]]`; any amount of whitespace between `]]` and the tag is allowed.

- The entity note title is derived from the wikilink text.
- After conversion, only the tag (and the whitespace between `]]` and the tag) is removed. The wikilink remains in place and now resolves to the newly created note.
- Any other content on the line is left unchanged.

Example:
```
- [[Project Alpha]] #project
```
After conversion:
```
- [[Project Alpha]]
```

#### Case 2: tag on a line without a preceding unresolved wikilink
The tag appears anywhere on a line that does not have an unresolved wikilink directly before it.

- The entity note title is derived from the full line text minus the trigger tag.
- After conversion, the entire line is replaced with the wikilink to the new note.

Example:
```
Project Alpha #project
```
After conversion:
```
[[Project Alpha]]
```

### When a line does not match
- The trigger tag belongs to a disabled entity type
- The line is inside a fenced code block (``` ``` ```) or YAML frontmatter (`---`)
- The line contains only the trigger tag and nothing else (no meaningful content to use as a title)

### Multiple matches on one line

**Case 1 (multiple possible):** a line can produce more than one convert button. Each unresolved wikilink that is directly followed by a trigger tag produces its own button, placed immediately after that tag. The buttons are independent — clicking any one of them converts only the wikilink it belongs to.

Example — two buttons, one per tag:
```
[[Alice]] #person [[Project Alpha]] #project
```

**Case 2 (at most one):** when no Case 1 matches exist on the line, at most one full-line button is shown. If multiple trigger tags appear, the leftmost one wins.

---

## The inline button

- Rendered as a small button immediately after the matching trigger tag in the editor
- Label: `→ <EntityType.name>` (e.g. `→ Person`, `→ Idea`)
- Only visible in Live Preview and Source mode, not in Reading mode
- Disappears immediately after conversion (the line now contains a wikilink)
- If the line is edited so the trigger tag is removed, the button disappears
- If a new trigger tag is added to a line, the button appears

---

## Note creation

### Filename
- Derived from the source text (the wikilink text for a wikilink conversion; the full line minus the trigger tag for a line conversion), after trimming whitespace
- Wikilinks are unwrapped: `[[Alice]]` becomes `Alice` in the filename (brackets stripped, inner text preserved)
- Sanitized: remove characters not allowed in Obsidian filenames (`* " \ / < > : | ?`)
- If a note with that filename already exists in the target folder, append a number: `Title 2`, `Title 3`, etc.

### Location
- Created in the `targetFolder` configured for the entity type
- If the target folder does not exist, create it

### Frontmatter
Every created note gets YAML frontmatter. All five standard fields are optional and configurable via global settings: each field has a **name** (the YAML property key written to the file) and an **enabled** toggle (default on). The default names are shown below:

```yaml
---
title: "<derived title>"                         # name configurable; omitted when disabled
entity-type: "<EntityType.id>"                   # name configurable; omitted when disabled
tags:                                            # name configurable; omitted when disabled
  - "<EntityType.id>"
created: "<YYYY-MM-DD>"                          # name configurable; omitted when disabled
source-note: "[[OriginalNoteName]]"              # name configurable; omitted when disabled
<...fields from EntityType.frontmatterTemplate...>
---
```

The **title field** value depends on the conversion type:
- **Wikilink conversion**: the bare wikilink text, without brackets (identical to the filename). For `[[Project Alpha]] #project` this is `Project Alpha`.
- **Line conversion**: the line text (minus the trigger tag, leading whitespace, and list/task markers), with any embedded wikilinks preserved in full. For `- Expand on [[Dark mode]] concept #idea` this is `Expand on [[Dark mode]] concept`, while the filename strips the brackets to `Expand on Dark mode concept`.

The `tags` list is seeded with the entity type id. If `frontmatterTemplate` includes additional tags, they are merged into the list rather than replacing it. If a template field's key matches the configured name of any standard field, the standard field wins.

> **Note:** When **Identify entities by** is set to "Entity-type property" (the default), the entity-type field must be present in the created note's frontmatter for pills to appear. Disabling this field in that mode will prevent pills from appearing for all newly created entity notes. When using "Tag" mode, the entity-type field is not needed for pill detection.

### Note body
- **Wikilink conversion**: the note body is empty. The wikilink itself becomes the note's filename and title, so repeating it in the body adds no value.
- **Line conversion**: the note body contains the line text with the trigger tag, leading whitespace, and list/task markers stripped — the same content as the title field. Wikilinks are preserved in full.

### Behavior after creation
- The note is created silently. It is not opened or focused.
- **Wikilink conversion**: only the trigger tag (and any whitespace before it) is removed; the wikilink remains and now resolves to the new note.
- **Line conversion**: the entire source line is replaced with just the wikilink: `[[NoteFilename]]`; if the line was a list item, the list marker is preserved: `- [[NoteFilename]]`; leading whitespace (indentation) is preserved.

---

## The entity pill

After conversion, the plugin detects lines (or rendered HTML) containing a wikilink to a known entity note and renders a styled pill badge after the link. The pill is visual only — it is never written to the file.

- Rendered after the wikilink on the same line
- Displays the entity type name (e.g. `project`, `idea`)
- Background color is user-configurable per entity type in settings; defaults are provided for all six built-in types
- Visible in Live Preview, Source mode, and Reading mode
- Uses `createEl` / DOM API, not `innerHTML`
- The pill is re-rendered whenever the document or viewport changes, consistent with the `EntityButtonPlugin` update cycle

### Entity identification

The plugin needs to determine whether a linked note is an entity note, and which entity type it belongs to. This is controlled by the **Identify entities by** setting:

| Mode | How a note is identified | Pills per link |
|------|--------------------------|----------------|
| **Entity-type property** (default) | The configured entity-type frontmatter field (default `entity-type`) must be present and its value must match an enabled entity type id. | At most one |
| **Tag** | The configured tags frontmatter field (default `tags`) must contain values matching enabled entity type ids. | One per matching tag |

In Tag mode a single note can match multiple entity types (e.g. `tags: [person, project]`), and a pill is rendered for each match. In Entity-type property mode at most one pill is rendered per link.

When using Tag mode, the entity-type field is not required for pill detection. When using Entity-type property mode, the entity-type field must be enabled and present for pills to appear.

### Implementation by mode

| Mode | Mechanism |
|------|-----------|
| Live Preview / Source | CM6 `Decoration.widget` via `EntityButtonPlugin` (`EntityPillWidget`) |
| Reading | `MarkdownPostProcessor` that finds `<a class="internal-link">` elements and inserts a pill `<span>` after each one that resolves to a known entity note |

The two mechanisms produce identical visual output, using the same CSS class and inline `backgroundColor` style. Both use the same pure helper (`resolveEntityFromFrontmatter`) to determine the entity type from a note's cached frontmatter.

### Example

Before:
```
Redesign the onboarding flow #project
```

After conversion, the file contains:
```
[[Redesign the onboarding flow]]
```

Rendered in the editor (the pill is a visual decoration, not stored in the file):
```
[[Redesign the onboarding flow]]  [project]
```

Created note at `Entities/Projects/Redesign the onboarding flow.md`:
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

---

## Convert on Enter

When the **Convert on Enter** setting is enabled, pressing Enter at the end of a matched line converts all matches on that line at once. The inline buttons remain visible on unconverted lines and continue to work as normal — both methods are available simultaneously.

### Behavior

- The conversion fires when the user presses Enter and the cursor is at or after the last non-whitespace character on a matched line.
- If the cursor is not at the end of the line (e.g. the user is editing mid-line), Enter behaves normally and no conversion occurs.
- All matches on the line are converted in a single operation: if the line has multiple unresolved wikilinks each followed by a tag, all their tags are stripped and all their notes are created before the line is updated. The result is identical to clicking each button individually.
- After conversion fires, a newline is inserted and the cursor moves to the next line, as it would with a normal Enter press.
- If the line no longer matches at the moment Enter is pressed (e.g. the trigger tag was just deleted), Enter behaves normally and inserts a newline.
- The setting is global — it applies to all entity types.
- Default: **off**.

---

## Settings

### Global settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Convert on Enter | Boolean | Off | When enabled, pressing Enter at the end of a matched line converts it immediately. |
| Identify entities by | Enum | Entity-type property | How the plugin determines whether a linked note is an entity note for pill display. Options: **Entity-type property** (matches the configured entity-type field value against entity type ids) or **Tag** (matches the configured tags field values against entity type ids). |

#### Frontmatter fields

Each of the five standard frontmatter fields has two configurable properties:

| Field | Name (default) | Enabled (default) | Notes |
|-------|---------------|-------------------|-------|
| Title | `title` | On | For a wikilink conversion: the bare link text (same as the filename). For a line conversion: the line text minus the trigger tag and list/task markers, with embedded wikilinks preserved in full; the filename additionally strips the wikilink brackets. |
| Entity type | `entity-type` | On | **Required for entity pills to appear.** Disabling this field prevents pills from appearing for all newly created entity notes. |
| Tags | `tags` | On | A tags list seeded with the entity type id. |
| Created | `created` | On | The date the note was created (YYYY-MM-DD). |
| Source note | `source-note` | On | A wikilink back to the note where the entity was first mentioned. |

The **name** is the YAML property key written into the created note. Changing it (e.g. `title` → `note-title`) affects all notes created after the change; existing notes are not updated.

### Entity type fields
Each entity type has:
- `id` — unique identifier, lowercase, no spaces (e.g. `person`)
- `name` — display label (e.g. `Person`)
- `triggerTag` — the hashtag that triggers detection (e.g. `#person`)
- `targetFolder` — vault path for created notes (e.g. `Entities/People`)
- `color` — background color for the entity pill (e.g. `#4a90d9`); a sensible default is provided for each built-in type
- `enabled` — boolean, defaults to true; disabled entity types are ignored by the editor plugin
- `frontmatterTemplate` — key-value pairs added to created note frontmatter, defaults to empty
- `basesFile` — reserved for future use; not exposed in the UI and not used in v1

### Settings UI behavior
- The five frontmatter fields are displayed as a table with three columns: description, field name input, and enabled toggle
- Disabling a field greys out its name input
- Changing a field name takes effect for all notes created after saving; existing notes are not modified
- Entity types are listed with their name, trigger tag, and color pill visible
- Each entry has an enabled toggle, an edit button, and a delete button
- Editing an entity type exposes a color picker for the pill color
- A button allows adding a new entity type
- Deleting an entity type does not delete any notes already created by it
- Changes take effect immediately without restarting the plugin
- `basesFile` is not exposed in the UI in v1

---

## Edge cases

- **Empty vault folder**: created silently on first use
- **Note filename collision**: append incrementing number as described above
- **Source note has no title**: use the source file's basename
- **Line is a list item** (e.g. `- Met Sarah #person`): strip the list marker from the derived title, so the note is named `Met Sarah` not `- Met Sarah`
- **Indented list item** (e.g. `  - Met Sarah #person`): preserve the leading whitespace in the replaced line (`  - [[Met Sarah]]`); strip both the indentation and list marker from the derived title
- **Unresolved link followed by tag** (e.g. `[[Sarah]] #person` where `Sarah.md` does not exist): wikilink conversion — filename is `Sarah`, title field is `Sarah`, note body is empty, only `#person` and the preceding whitespace are stripped from the source line
- **Multiple unresolved links on one line** (e.g. `[[Alice]] #person [[Project Alpha]] #project`): each unresolved wikilink+tag pair produces its own button; clicking one converts only that wikilink; pressing Enter (when Convert on Enter is enabled) converts all of them at once
- **Resolved wikilink with tag and no other content** (e.g. `[[Alice]] #person` where `Alice.md` already exists): no match — the wikilink is resolved so wikilink conversion does not apply, and there is no meaningful plain-text content for line conversion
- **Trigger tag mid-line** (e.g. `#person Sarah attended the meeting`): still matches; title derived from full line text minus the tag
- **Multiple spaces around tag**: normalize to single space when building the modified line
- **The source note is untitled / new unsaved note**: use `Untitled` as the `source-note` value

---

## Out of scope for v1

- Opening the created note after conversion
- Bases `.base` file generation (designed for, but not implemented in v1)
- Undo support for the conversion action
- Mobile-specific behavior
- Syncing entity types across devices (settings sync is handled by Obsidian natively)