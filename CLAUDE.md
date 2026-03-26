# entity-notes — Obsidian Plugin

An Obsidian plugin that watches the editor for lines matching user-configured patterns (e.g. `#person`, `#idea`) and shows an inline button next to matching lines. Clicking the button creates a dedicated Markdown note with pre-filled YAML frontmatter, replaces the original line with a wikilink to the new note, and the button disappears.

This is conceptually the same as the "inline task to note" flow in the TaskNotes plugin (https://github.com/callumalpass/tasknotes), but generalized to any user-defined entity type.

**Behavior specification:** See `SPEC.md` — it is the source of truth for intended behavior. When in doubt about how something should work, defer to that file.

---

## Development workflow

When implementing any non-trivial change, start by writing a failing test that captures the expected behavior before touching the implementation. Only proceed to the implementation once the failing test is in place. Skip this step only when a test is not feasible (e.g. pure UI/CM6 widget rendering that cannot run outside Obsidian).

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

// Each of the 5 standard frontmatter fields has a configurable YAML key name and enabled toggle
interface FrontmatterField {
  enabled: boolean;
  name: string;                 // the YAML property key written to the file (e.g. "title", "entity-type")
}

type EntityIdentificationMethod = 'entity-type-field' | 'tags';

interface PluginSettings {
  entityTypes: EntityType[];
  convertOnEnter: boolean;               // trigger conversion on Enter at end of matched line, default false
  entityIdentification: EntityIdentificationMethod; // how pills detect entity notes, default 'entity-type-field'
  titleField: FrontmatterField;          // default: { enabled: true, name: 'title' }
  entityTypeField: FrontmatterField;     // default: { enabled: true, name: 'entity-type' }
  tagsField: FrontmatterField;           // default: { enabled: true, name: 'tags' }
  createdField: FrontmatterField;        // default: { enabled: true, name: 'created' }
  sourceNoteField: FrontmatterField;     // default: { enabled: true, name: 'source-note' }
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
3. For each line, calls `PatternMatcher.matchAll()` to find all conversion opportunities
4. For each match, adds a `Decoration.widget` (convert button) **immediately after the trigger tag** — a line can have multiple buttons (one per unresolved wikilink+tag pair)
5. Otherwise, iterates all `[[wikilinks]]` on the line; for each that resolves to a known entity note, adds a pill `Decoration.widget` after the `]]`
6. Returns a `DecorationSet`

The `settingsVersion` counter on the plugin is incremented by `saveSettings()` and also by a `metadataCache.on('changed')` listener registered in `main.ts`. This causes the ViewPlugin to rebuild decorations immediately after settings changes or after a new note is indexed by the cache (so the pill appears right after conversion).

The `EntityButtonPlugin` also registers an Enter keymap at `Prec.highest` (so it runs before Obsidian's own handlers). When `convertOnEnter` is enabled and the cursor is at the end of a matched line, it fires `convertAllOnLine` (which converts **all** matches on the line at once) and returns `false` to let the default handler still insert a newline. The synchronous match detection is extracted into `findMatchForEnter` in `keymapUtils.ts` for unit testability.

The `EntityWidget` is a CM6 `WidgetType`. It renders a small button element. On click, it calls `convertLine` (handles the single match that button belongs to).

Reference: TaskNotes uses this same pattern in `src/editor/InstantConvertButtons.ts` and `src/editor/TaskLinkWidget.ts`.

---

## Note creation behavior

There are two conversion types depending on what precedes the trigger tag:

**Wikilink conversion** — the tag follows an unresolved `[[wikilink]]`:
- Filename and title field are the bare wikilink text (brackets stripped)
- The source line has only the trigger tag (and preceding whitespace) removed; the wikilink stays in place
- No note body is written

**Line conversion** — the tag appears on a line without a preceding unresolved wikilink:
- Filename is derived from the full line minus the tag and list markers, with wikilinks unwrapped (`[[Alice]]` → `Alice`), sanitized for the filesystem
- The entire source line is replaced with `[[filename]]`, preserving any list marker and leading indentation
- The note body is the line text with the tag and list markers stripped, wikilinks preserved in full

In both cases, `NoteCreator`:
1. Derives the filename (`deriveTitle`) and the title-field value (`deriveText`) from the line
2. Creates the file at `{targetFolder}/{filename}.md` (appends ` 2`, ` 3`, … on collision)
3. Writes YAML frontmatter. Each of the 5 standard fields is individually enabled/disabled and has a configurable YAML key name (from `PluginSettings`):
   - `title` field — the bare link text (wikilink conversion) or `deriveText` result (line conversion)
   - `entity-type` field — `EntityType.id`
   - `tags` field — seeded with `EntityType.id`; additional tags from `frontmatterTemplate` are merged in
   - `created` field — ISO date (YYYY-MM-DD)
   - `source-note` field — `[[SourceNoteName]]`
   - Extra fields from `EntityType.frontmatterTemplate` are appended; standard field names always win
4. For line conversion, appends the body text after a blank line following the frontmatter

---

## Entity pill

After conversion, the plugin detects wikilinks to known entity notes and renders a styled pill badge after the link. The pill is visual only — never written to the file.

Entity identification is controlled by `entityIdentification` in settings:
- `'entity-type-field'` (default) — the configured entity-type field (default key `entity-type`) must be present in the note's frontmatter and its value must match an enabled entity type id. At most one pill per link.
- `'tags'` — the configured tags field must contain one or more enabled entity type ids. One pill per matching tag.

Detection uses `resolveEntitiesFromFrontmatter` which reads `app.metadataCache` — no custom indexing.

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
- **Identify entities by** — enum (`entity-type-field` | `tags`), controls pill detection mode (see Entity pill section above)
- **Frontmatter fields table** — 5 rows (Title, Entity type, Tags, Created, Source note); each row has an editable field-name input and an enabled toggle; disabling a field greys out its name input

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

## Lifecycle and cleanup

- Register **all** event listeners through the framework so they are auto-cleaned on unload:
  - `this.registerEvent(this.app.vault.on(...))` — vault/metadataCache/workspace events
  - `this.registerDomEvent(el, type, cb)` — DOM listeners
  - `this.registerInterval(setInterval(...))` — timers
- Never call `.off()` / `.detach()` manually on events passed to `registerEvent()` — double-cleanup causes bugs.
- Never detach or close leaves in `onunload()` — this breaks Obsidian's restart state restoration.
- Raw `addEventListener` calls not wrapped in `registerDomEvent()` must be removed manually in `onunload()`.
- Keep `onload()` fast; defer expensive initialization until first use.

---

## API usage patterns

- **Atomic file edits**: use `app.vault.process()` for read-modify-write to prevent races between read and write.
- **Reading files**: use `vault.cachedRead()` for display-only reads; use `vault.read()` only when you intend to modify the file (guarantees fresh content).
- **Resolving wikilinks**: use `app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath)` to get a `TFile` from a wikilink path.
- **Active view**: use `app.workspace.getActiveViewOfType(MarkdownView)` — `activeLeaf` is deprecated.
- **Settings load**: always merge with `DEFAULT_SETTINGS` so new fields added in future versions don't land as `undefined`:
  ```typescript
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  ```
- **Settings save**: debounce `saveSettings()` when called from rapid UI interactions (text field `onChange`); use the `debounce()` helper from `'obsidian'`.
- All async vault operations (`vault.create`, `vault.modify`, `vault.read`, etc.) must be `await`ed or explicitly handled — silently dropped promises cause data loss.
- Use `requireApiVersion('x.y.z')` at runtime to guard calls to APIs introduced after `minAppVersion`.

---

## CSS and DOM conventions

- All plugin styles go in `styles.css` — Obsidian loads it automatically. Never inject a `<style>` element at runtime.
- Use Obsidian's CSS variables so the plugin respects themes:
  - Colors: `--color-base-00`…`--color-base-100`, `--color-accent`, `--text-normal`, `--text-muted`
  - Spacing: `--size-2-1`, `--size-4-2`, etc.
  - Font: `--font-text`, `--font-monospace`
  - Borders: `--border-width`, `--radius-s`, `--radius-m`
- Scope all selectors under a plugin-specific class (e.g., `.entity-notes-pill`) to avoid collisions with Obsidian core or other plugins.
- Do not target internal Obsidian selectors like `.workspace-leaf-content .cm-editor .cm-line` — these break across updates.

---

## Mobile compatibility

- Set `"isDesktopOnly": true` in `manifest.json` if the plugin uses Node.js or Electron APIs.
- Guard any Node.js / Electron code paths with `Platform.isDesktopApp` from `'obsidian'`.
- Status bar items are unavailable on mobile — guard with `Platform.isDesktopApp`.
- Do not use regex **lookbehind assertions** in code that runs on mobile — iOS does not support them.
- Use forward slashes for all file paths — mobile does not use backslashes.

---

## Performance

- In CM6 `update()`: return early if neither `update.docChanged` nor `update.viewportChanged` nor a relevant `StateEffect` was dispatched.
- Iterate only `view.visibleRanges`, not the full document.
- Implement `WidgetType.eq()` to allow CM6 to reuse DOM nodes when the widget is unchanged.
- Do not make async calls or vault I/O inside CM6 `update()`.
- Debounce vault `'modify'` event handlers — vault fires on every keystroke. Use `debounce(handler, 500)` from `'obsidian'`.

---

## Testing

- Pure functions with no Obsidian imports (string parsing, regex, filename sanitization, frontmatter builders) should be unit-tested with Vitest.
- Code that imports from `'obsidian'` can be tested using [`jest-environment-obsidian`](https://github.com/obsidian-community/jest-environment-obsidian), which stubs the module automatically.
- CM6 widgets and vault integration can only be reliably tested inside the real Obsidian environment using an embedded test runner.
- Keep business logic in standalone modules (like `PatternMatcher`, `keymapUtils`) to maximize the testable surface area.

---

## What to avoid

- Do not bundle `@codemirror/*` packages — they must be external.
- Do not maintain a custom in-memory index of notes. Use `app.metadataCache`.
- Do not hardcode entity types anywhere outside of the default settings.
- Do not touch `app.workspace.activeLeaf` — it is deprecated. Use `app.workspace.getActiveViewOfType(MarkdownView)`.
- Do not use `innerHTML`, `outerHTML`, or `insertAdjacentHTML`. Use `createEl` / DOM API.
- Do not inject `<style>` elements at runtime — put all CSS in `styles.css`.
- Do not parse frontmatter manually from file text — use `app.metadataCache`.
- Do not make document modifications inside a CM6 `ViewPlugin.update()` call — dispatch them in response to user actions.
- Do not use Node.js (`fs`, `path`, `child_process`) or Electron APIs in code paths reachable on mobile without a `Platform.isDesktopApp` guard.
- Do not use regex lookbehind assertions in code that runs on mobile (iOS does not support them).
- Do not drop promises from async vault operations — always `await` or `.catch()` them.