# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
- List items are handled naturally: `- Met Alice #person` becomes `- [[Met Alice]]`.
- Trigger tags inside fenced code blocks and YAML frontmatter are ignored.
