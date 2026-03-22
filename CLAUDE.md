# entity-notes — Obsidian Plugin

An Obsidian plugin that watches the editor for lines matching user-configured patterns (e.g. `#person`, `#idea`) and shows an inline button next to matching lines. Clicking the button creates a dedicated Markdown note with pre-filled YAML frontmatter, replaces the original line with a wikilink to the new note, and the button disappears.

This is conceptually the same as the "inline task to note" flow in the TaskNotes plugin (https://github.com/callumalpass/tasknotes), but generalized to any user-defined entity type.

---

## Project structure

```
entity-notes/
  main.ts                        # Plugin entry point, registers editor extension, settings tab, and post-processor
  manifest.json                  # Obsidian plugin manifest
  styles.css                     # Plugin styles
  src/
    settings.ts                  # Settings interface, defaults, and SettingTab UI
    types.ts                     # Shared interfaces (EntityType, PluginSettings, etc.)
    editor/
      EntityButtonPlugin.ts      # CM6 ViewPlugin — scans lines, injects convert buttons and pills
      EntityWidget.ts            # CM6 WidgetType — renders the inline "→ note" button
      EntityPillWidget.ts        # CM6 WidgetType — renders the entity pill badge (Live Preview/Source)
      keymapUtils.ts             # Pure helpers: isCursorAtLineEnd, findMatchForEnter (testable without CM6)
      readingViewPill.ts         # Pure DOM helpers for injecting pills in Reading mode
    services/
      NoteCreator.ts             # Creates entity notes with YAML frontmatter
      PatternMatcher.ts          # Parses a line and returns the matching EntityType or null
  esbuild.config.mjs
  tsconfig.json
  package.json
```

---

## Architecture principles

Follow the same principles as TaskNotes:

- **Separation of concerns**: UI (editor widgets) is separate from business logic (services) and data (Obsidian's native metadataCache).
- **Native-first**: Use `app.metadataCache` and `app.vault` as the source of truth. No custom indexing or in-memory databases.
- **Unidirectional data flow**: User action → Service → File system → UI update. Never update UI directly from user input without going through the file system.
- **Configuration-driven**: Entity types and their properties are never hardcoded. Everything comes from settings.

---

## Key data types

```typescript
// An entity type configured by the user
interface EntityType {
  id: string;                   // unique identifier, lowercase, no spaces (e.g. "person")
  name: string;                 // display label (e.g. "Person")
  triggerTag: string;           // e.g. "#person"
  targetFolder: string;         // e.g. "Entities/People"
  color: string;                // background color for the entity pill (e.g. "#4a90d9")
  enabled: boolean;             // whether this entity type is active, defaults to true
  frontmatterTemplate: Record<string, unknown>;  // pre-filled YAML properties, defaults to {}
  basesFile?: string;           // reserved for future use — not implemented in v1
}

interface PluginSettings {
  entityTypes: EntityType[];
  convertOnEnter: boolean;       // trigger conversion on Enter at end of matched line, default false
}
```

---

## CodeMirror 6 rules — read carefully

Obsidian's editor is CodeMirror 6. All CM6 packages must be marked as **external** in the bundler. Never bundle your own copy.

In `esbuild.config.mjs`, ensure these are external:
```
"obsidian", "@codemirror/view", "@codemirror/state", "@codemirror/language",
"@codemirror/rangeset", "@codemirror/text", "@codemirror/state"
```

Imports must come from the packages Obsidian provides:
```typescript
import { ViewPlugin, Decoration, WidgetType, DecorationSet, EditorView } from "@codemirror/view";
import { Range } from "@codemirror/state";
```

The `EntityButtonPlugin` is a CM6 `ViewPlugin`. It:
1. Runs on every `update` where `update.docChanged || update.viewportChanged || settingsVersion changed`
2. Iterates visible line ranges with `view.visibleRanges`
3. For each line, calls `PatternMatcher` to check for a matching EntityType
4. If a match is found, adds a `Decoration.widget` (convert button) at the end of the line
5. Otherwise, checks if the line contains a `[[wikilink]]` to a known entity note and adds a pill `Decoration.widget` after the `]]`
6. Returns a `DecorationSet`

The `settingsVersion` counter on the plugin is incremented by `saveSettings()` and also by a `metadataCache.on('changed')` listener registered in `main.ts`. This causes the ViewPlugin to rebuild decorations immediately after settings changes or after a new note is indexed by the cache (so the pill appears right after conversion).

The `EntityButtonPlugin` also registers an Enter keymap at `Prec.highest` (so it runs before Obsidian's own handlers). When `convertOnEnter` is enabled and the cursor is at the end of a matched line, it fires `convertLine` and returns `false` to let the default handler still insert a newline. The synchronous match detection is extracted into `findMatchForEnter` in `keymapUtils.ts` for unit testability.

The `EntityWidget` is a CM6 `WidgetType`. It renders a small button element. On click, it calls `convertLine` (shared with the Enter keymap handler).

Reference: TaskNotes uses this same pattern in `src/editor/InstantConvertButtons.ts` and `src/editor/TaskLinkWidget.ts`.

---

## Note creation behavior

When the button is clicked, `NoteCreator`:
1. Extracts the note title from the line text (strips the trigger tag and list marker if present, sanitizes for use as a filename)
2. Creates the file at `{targetFolder}/{title}.md`
3. Writes YAML frontmatter from `EntityType.frontmatterTemplate`, plus:
   - `title: <derived from line text>`
   - `entity-type: <EntityType.id>`
   - `tags: [<EntityType.id>]` — seeded with the entity type id; merged with any tags from `frontmatterTemplate`
   - `created: <ISO date>`
   - `source-note: [[OriginalNoteName]]`
4. Replaces the entire source line with `[[title]]`, preserving any list marker (e.g. `- [[title]]`)

---

## Entity pill

After conversion, the plugin detects wikilinks to known entity notes (identified by `entity-type` in the note's frontmatter via `app.metadataCache`) and renders a styled pill badge after the link. The pill is visual only — never written to the file.

- Background color comes from `EntityType.color`
- Label is `EntityType.name` in lowercase
- Uses DOM API (`createElement` / `createEl`), not `innerHTML`

Two mechanisms, same visual output:

| Mode | Mechanism |
|------|-----------|
| Live Preview / Source | `EntityPillWidget` (CM6 `Decoration.widget`) in `EntityButtonPlugin` |
| Reading | `injectPillsIntoElement` from `readingViewPill.ts`, called by a `MarkdownPostProcessor` registered in `main.ts` |

---

## Settings UI

Global settings:
- **Convert on enter** — boolean toggle (default off); when enabled, pressing Enter at the end of a matched line triggers conversion

The settings tab allows the user to add, edit, and delete entity types. Each entity type exposes:
- Name (display label)
- Trigger tag (e.g. `#project`)
- Target folder
- Color (color picker for the entity pill)
- Enabled toggle
- Frontmatter template (editable key-value pairs)

`basesFile` is not exposed in the settings UI in v1.

On first install, seed the following default entity types:

| id             | name           | triggerTag       | targetFolder               | color     |
|----------------|----------------|------------------|----------------------------|-----------|
| person         | Person         | `#person`        | `Entities/People`          | `#4a90d9` |
| idea           | Idea           | `#idea`          | `Entities/Ideas`           | `#f5a623` |
| accomplishment | Accomplishment | `#accomplishment`| `Entities/Accomplishments` | `#7ed321` |
| feedback       | Feedback       | `#feedback`      | `Entities/Feedback`        | `#9b59b6` |
| project        | Project        | `#project`       | `Entities/Projects`        | `#e74c3c` |

---

## What to avoid

- Do not bundle `@codemirror/*` packages — they must be external.
- Do not maintain a custom in-memory index of notes. Use `app.metadataCache`.
- Do not hardcode entity types anywhere outside of the default settings.
- Do not touch `app.workspace.activeLeaf` directly for note creation — use `app.vault.create()` and let the user open the note if they want.
- Do not use `innerHTML` in widget rendering. Use `createEl` / DOM API.