# entity-notes — Obsidian Plugin

Watches the editor for lines matching user-configured trigger tags (e.g. `#person`) and shows an inline convert button. Clicking it creates a dedicated Markdown note with YAML frontmatter and replaces the line with a wikilink.

**Behavior spec:** `SPEC.md` is the source of truth for intended behavior. Defer to it when in doubt.
**Data types:** See `src/types.ts` for `EntityType`, `PluginSettings`, `FrontmatterField`.

---

## Commands

```bash
pnpm run dev       # esbuild watch mode (outputs main.js)
pnpm run build     # type-check + production build
pnpm test          # vitest run
pnpm run lint      # eslint
```

---

## Development workflow

Start every non-trivial change by writing a failing test before touching the implementation. Skip only when a test is not feasible (e.g. pure CM6 widget rendering that cannot run outside Obsidian).

---

## Architecture

- **Separation of concerns** — UI (`src/editor/`) is separate from business logic (`src/services/`) and data (`app.metadataCache`).
- **Native-first** — `app.metadataCache` and `app.vault` are the source of truth. No custom indexes.
- **Unidirectional flow** — User action → Service → File system → UI update. Never update UI directly from user input.
- **Configuration-driven** — Entity types are never hardcoded outside default settings.

---

## CodeMirror 6

All `@codemirror/*` and `@lezer/*` packages **must be marked external** in `esbuild.config.mjs` — Obsidian provides them at runtime. Bundling a second copy silently breaks CM6's internal class identity checks.

In `ViewPlugin.update()`:
- Return early if `!update.docChanged && !update.viewportChanged` and no relevant `StateEffect` was dispatched.
- Iterate `view.visibleRanges` only — never the full document.
- No async calls or vault I/O.
- Dispatch document mutations via `view.dispatch()` from user action handlers, never from inside `update()`.

Implement `WidgetType.eq()` on every widget so CM6 can reuse DOM nodes.
Register keymap handlers with `Prec.highest` when they must fire before Obsidian's own handlers.

---

## Obsidian plugin rules

**Lifecycle**
- Register all listeners through the framework: `registerEvent()`, `registerDomEvent()`, `registerInterval()` — they are auto-cleaned on unload.
- Never call `.off()` / `.detach()` on refs passed to `registerEvent()`.
- Never detach or close leaves in `onunload()`.
- Keep `onload()` fast; defer expensive work.

**API**
- Atomic read-modify-write: `app.vault.process()`.
- Display reads: `vault.cachedRead()`. Reads before modification: `vault.read()`.
- Wikilink resolution: `app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath)`.
- Active view: `app.workspace.getActiveViewOfType(MarkdownView)` — `activeLeaf` is deprecated.
- Settings load: `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` — ensures new fields never land as `undefined`.
- Debounce `saveSettings()` on rapid UI input using `debounce()` from `'obsidian'`.
- Always `await` or `.catch()` vault operations — dropped promises cause data loss.

**DOM and CSS**
- Never use `innerHTML`, `outerHTML`, or `insertAdjacentHTML` — use `createEl()` / DOM API.
- Never inject `<style>` elements — all styles go in `styles.css`.
- Use Obsidian CSS variables (`--text-normal`, `--color-accent`, `--radius-s`, etc.) so the plugin respects themes.
- Scope all selectors under a plugin-specific class (e.g. `.entity-notes-pill`).

**Mobile**
- No regex lookbehind assertions — iOS does not support them.
- No Node.js / Electron APIs in mobile code paths without a `Platform.isDesktopApp` guard.
- Set `"isDesktopOnly": true` in `manifest.json` if desktop-only APIs are unavoidable.
- Use forward slashes in all file paths.

**Events**
- Debounce vault `'modify'` handlers — fires on every keystroke.
- `metadataCache.on('changed')` is the correct hook for reacting to note index updates.

---

## Testing

- Unit-test pure functions (string parsing, regex, filename sanitization) with Vitest — these have no Obsidian imports and run in Node.
- For code that imports from `'obsidian'`, use [`jest-environment-obsidian`](https://github.com/obsidian-community/jest-environment-obsidian) to stub the module.
- CM6 widgets and vault integration require an in-Obsidian test runner.
- Keep business logic in standalone modules (`PatternMatcher`, `keymapUtils`) to maximise the testable surface area.
