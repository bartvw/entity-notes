# entity-notes — Behavior Specification

This document defines the expected behavior of the entity-notes plugin. It is the source of truth for implementation and acceptance criteria. When in doubt about intended behavior, defer to this file.

---

## Overview

The plugin monitors the active editor for lines containing a configured trigger tag (e.g. `#idea`, `#person`). When a matching line is found that has not yet been converted, an inline button appears at the end of the line. Clicking the button creates a dedicated Markdown note for that entity, removes the trigger tag from the source line, and replaces it with a wikilink to the new note.

---

## Default entity types

The plugin ships with the following entity types pre-configured. All are enabled by default. The user can edit, disable, or delete any of them, and add new ones.

| Entity type   | Trigger tag      | Default target folder  |
|---------------|------------------|------------------------|
| Person        | `#person`        | `Entities/People`      |
| Idea          | `#idea`          | `Entities/Ideas`       |
| Accomplishment| `#accomplishment`| `Entities/Accomplishments` |
| Feedback      | `#feedback`      | `Entities/Feedback`    |
| Project       | `#project`       | `Entities/Projects`    |
| Task          | `#task`          | `Entities/Tasks`       |

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
- The source line is modified: the trigger tag is removed and a `[[NoteFilename]]` wikilink is appended.
- The modification preserves the rest of the line content exactly.

### Example

Before:
```
Redesign the onboarding flow #project
```

After conversion:
```
Redesign the onboarding flow [[Redesign the onboarding flow]]
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

## Settings

### Entity type fields
Each entity type has:
- `id` — unique identifier, lowercase, no spaces (e.g. `person`)
- `name` — display label (e.g. `Person`)
- `triggerTag` — the hashtag that triggers detection (e.g. `#person`)
- `targetFolder` — vault path for created notes (e.g. `Entities/People`)
- `enabled` — boolean, defaults to true; disabled entity types are ignored by the editor plugin
- `frontmatterTemplate` — key-value pairs added to created note frontmatter, defaults to empty
- `basesFile` — reserved for future use; not exposed in the UI and not used in v1

### Settings UI behavior
- Entity types are listed with their name and trigger tag visible
- Each entry has an enabled toggle, an edit button, and a delete button
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
