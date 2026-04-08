## Why

Entity notes are created and organised by type, but there is no structured way to browse or query all entities of a given type in one place. Obsidian Bases provides exactly this capability through `.base` files, but users must author them manually today.

## What Changes

- Add a "Create base files" button to the main settings screen that generates an Obsidian Bases `.base` file for each enabled entity type.
- Generated files are placed at `Entities/<id>.base` (hardcoded root, not configurable in v1).
- Each `.base` file contains a single table view filtered to the entity type, with columns derived from the entity type's enabled frontmatter fields and frontmatter template.
- The filter expression adapts to the active **Identify entities by** setting (`entity-type-field` vs `tags`).
- After generation, the path to each base file is stored in the `basesFile` field on the corresponding `EntityType`.
- If any base files already exist, a confirmation modal is shown summarising what will be created vs overwritten, with options to skip existing, overwrite all, or cancel.
- Only enabled entity types receive a base file.

## Capabilities

### New Capabilities

- `base-file-generation`: On-demand generation of Obsidian Bases `.base` files from entity type configuration, accessible via a button in the plugin settings.

### Modified Capabilities

<!-- No existing spec-level requirements change. -->

## Impact

- `src/types.ts` — `basesFile` field on `EntityType` is already defined; no change needed.
- `src/settings/` — new button and confirmation modal in the settings UI.
- New service `src/services/BaseFileGenerator.ts` responsible for generating `.base` file content and writing files to the vault.
- No changes to note creation, pattern detection, or pill rendering.
