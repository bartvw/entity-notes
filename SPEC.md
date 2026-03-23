# entity-notes — Behavior Specification

This document defines the expected behavior of the entity-notes plugin. It is the source of truth for implementation and acceptance criteria. When in doubt about intended behavior, defer to this file.

---

## Overview

The plugin monitors the active editor for lines containing a configured trigger tag (e.g. `#idea`, `#project`). When a matching line is found that has not yet been converted, an inline button appears at the end of the line. Clicking the button creates a dedicated Markdown note for that entity, and replaces the entire source line with a wikilink to the new note followed by a styled entity pill. The pill is rendered as a CM6 decoration — it is not written to the file.

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

### When a line does not match
- The trigger tag belongs to a disabled entity type
- The line is inside a fenced code block (``` ``` ```) or YAML frontmatter (`---`)
- The line contains only the trigger tag and nothing else (no meaningful content to use as a title)

### Multiple tags on one line
If a line contains multiple trigger tags from different entity types, match only the first one found (left to right). Do not show multiple buttons.

---

## The inline button

- Rendered as a small button at the end of the matching line in the editor
- Label: `→ <EntityType.name>` (e.g. `→ Person`, `→ Idea`)
- Only visible in Live Preview and Source mode, not in Reading mode
- Disappears immediately after conversion (the line now contains a wikilink)
- If the line is edited so the trigger tag is removed, the button disappears
- If a new trigger tag is added to a line, the button appears

---

## Note creation

### Filename
- Derived from the line text after stripping the trigger tag and trimming whitespace
- Sanitized: remove characters not allowed in Obsidian filenames (`* " \ / < > : | ?`)
- If a note with that filename already exists in the target folder, append a number: `Title 2`, `Title 3`, etc.

### Location
- Created in the `targetFolder` configured for the entity type
- If the target folder does not exist, create it

### Frontmatter
Every created note gets the following YAML frontmatter:

```yaml
---
title: "<derived from line text>"
entity-type: "<EntityType.id>"
tags:
  - "<EntityType.id>"
created: "<YYYY-MM-DD>"
source-note: "[[OriginalNoteName]]"
<...fields from EntityType.frontmatterTemplate...>
---
```

The `tags` list is seeded with the entity type id. If `frontmatterTemplate` includes additional tags, they are merged into the list rather than replacing it. If a template field conflicts with any other standard field name, the standard field wins.

### Note body
Empty after the frontmatter block. The user fills it in.

### Behavior after creation
- The note is created silently. It is not opened or focused.
- The entire source line is replaced with just the wikilink: `[[NoteFilename]]`
- If the line was a list item (e.g. `- `), the list marker is preserved: `- [[NoteFilename]]`
- Leading whitespace (indentation) is preserved: `  - [[NoteFilename]]` for an indented bullet

---

## The entity pill

After conversion, the plugin detects lines (or rendered HTML) containing a wikilink to a known entity note and renders a styled pill badge after the link. The pill is visual only — it is never written to the file.

- Rendered after the wikilink on the same line
- Displays the entity type name (e.g. `project`, `idea`)
- Background color is user-configurable per entity type in settings; defaults are provided for all six built-in types
- Visible in Live Preview, Source mode, and Reading mode
- Uses `createEl` / DOM API, not `innerHTML`
- The pill is re-rendered whenever the document or viewport changes, consistent with the `EntityButtonPlugin` update cycle

### Implementation by mode

| Mode | Mechanism |
|------|-----------|
| Live Preview / Source | CM6 `Decoration.widget` via `EntityButtonPlugin` (`EntityPillWidget`) |
| Reading | `MarkdownPostProcessor` that finds `<a class="internal-link">` elements and inserts a pill `<span>` after each one that resolves to a known entity note |

The two mechanisms produce identical visual output, using the same CSS class and inline `backgroundColor` style.

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
```

---

## Convert on Enter

When the **Convert on Enter** setting is enabled, pressing Enter at the end of a matched line triggers the same conversion as clicking the button. The inline button remains visible on unconverted lines and continues to work as normal — both methods are available simultaneously.

### Behavior

- The conversion fires when the user presses Enter and the cursor is at or after the last non-whitespace character on a matched line.
- If the cursor is not at the end of the line (e.g. the user is editing mid-line), Enter behaves normally and no conversion occurs.
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