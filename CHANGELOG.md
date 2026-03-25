# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.1] - 2026-03-25

### Fixed

- **Vault root as target folder.** Entity types can now be configured with an empty target folder to store notes directly in the vault root. Previously leaving the field blank blocked saving with a "Target folder is required" notice.

## [1.2.0] - 2026-03-25

### Added

- **Wikilink conversion.** When a trigger tag appears directly after an unresolved `[[wikilink]]`, a convert button now appears after the tag. Clicking it creates an entity note from the wikilink text and strips only the tag from the source line — the wikilink stays in place and now resolves to the new note. Previously the entire line was always replaced.
- **Multiple convert buttons per line.** A line with several unresolved wikilink+tag pairs (e.g. `[[Alice]] #person [[Project Alpha]] #project`) now shows a separate button for each pair. Each button converts only its own wikilink independently.
- **Convert on Enter converts all matches.** When Convert on Enter is enabled, pressing Enter at the end of a line with multiple unresolved wikilink+tag pairs creates all the entity notes and strips all the tags in one operation.

### Changed

- **Convert button placement.** The `→ EntityType` button now appears immediately after its trigger tag instead of at the end of the line, making it clear which tag each button belongs to.
- **Wikilinks in filenames are unwrapped.** When deriving a filename from a line that contains wikilinks (e.g. `Talked to [[Alice]] #person`), the brackets are stripped but the link text is kept — the note is named `Talked to Alice` rather than `Talked to`.
- **Title frontmatter field preserves wikilinks.** For line conversions, the `title` field now contains the line text with embedded wikilinks kept in full (e.g. `Talked to [[Alice]]`), while the filename strips the brackets. For wikilink conversions, the title field is the bare link text as before.
- **Note body.** Line conversions now include a note body containing the line text with the trigger tag and list/task markers stripped. Wikilink conversions produce no body. This replaces the previous behavior of writing only frontmatter for all conversions.

## [1.1.0] - 2026-03-23

### Added

- **Configurable frontmatter fields.** Each of the five standard fields (`title`, `entity-type`, `tags`, `created`, `source-note`) can now be toggled on/off and given a custom field name. Settings are global (apply to all entity types) and live under a new "Default frontmatter" section in the settings screen. Changing a name affects all notes created after saving; existing notes are not modified. Duplicate field names are rejected with a notice.
- **Configurable entity identification.** A new "Identify entities by" setting (Preferences) controls how the plugin detects entity notes for pill display: by the entity-type property (default) or by tags. In Tags mode, a note whose tags field contains multiple entity type ids shows a pill for each.

### Changed

- Settings screen is now structured in three sections: Preferences → Default frontmatter → Entities.

## [1.0.5] - 2026-03-23

### Fixed

- Indentation is now preserved when converting an indented list item (e.g. `  - My idea #idea` becomes `  - [[My idea]]` instead of losing the leading spaces).

## [1.0.4] - 2026-03-23

No user-facing changes. Development tooling improvements only.

## [1.0.3] - 2026-03-23

No user-facing changes. Development tooling improvements only.

## [1.0.2] - 2026-03-23

### Fixed

- Entity pill text color now respects the active Obsidian theme instead of always using white.
- Target folder paths configured in settings are now normalized for cross-platform compatibility (mixed slashes, trailing slashes, etc.).
- Settings modal headings now use the standard Obsidian heading style for consistent appearance.

## [1.0.1] - 2026-03-23

### Added

- Inline `→ EntityType` button appears at the end of any line containing a configured trigger tag (e.g. `#project`, `#person`). Clicking it creates a dedicated note and replaces the line with a wikilink.
- Entity pill badge rendered after wikilinks to known entity notes in Live Preview, Source mode, and Reading mode. The pill is visual only — never written to the file.
- **Convert on Enter** setting (default: off). When enabled, pressing Enter at the end of a matched line triggers the conversion and moves the cursor to the next line.
- Five built-in entity types: Person, Idea, Accomplishment, Feedback, Project. All are enabled by default and fully customizable.
- Settings UI to add, edit, and delete entity types. Each type exposes: name, trigger tag, target folder, pill color, enabled toggle, and a frontmatter template for extra fields.
- Created notes include YAML frontmatter: `title`, `entity-type`, `tags`, `created`, and `source-note` (wikilink back to the originating note).
- List items are handled naturally: `- Add dark mode support #idea` becomes `- [[Add dark mode support]]`.
- Trigger tags inside fenced code blocks and YAML frontmatter are ignored.
