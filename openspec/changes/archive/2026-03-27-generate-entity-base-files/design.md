## Context

The plugin already reserves a `basesFile?: string` field on `EntityType` for tracking the path to a generated Obsidian Bases file. The `entityIdentification` setting (`entity-type-field` | `tags`) and all frontmatter field names are already available at generation time. No new data model changes are needed.

Obsidian Bases `.base` files are YAML files with a `views` key. The plugin generates these files and writes them to the vault via `app.vault`.

## Goals / Non-Goals

**Goals:**
- Generate a valid `.base` file for each enabled entity type on demand.
- Place all base files under `Entities/` regardless of where entity notes live.
- Adapt the filter to the active `entityIdentification` setting.
- Derive columns from enabled standard frontmatter fields + `frontmatterTemplate` keys.
- Store the generated path in `EntityType.basesFile` and persist settings.
- Warn the user and ask for confirmation before overwriting existing files.

**Non-Goals:**
- Keeping base files in sync when settings change (manual regeneration is sufficient for v1).
- Configurable base file location.
- Support for view types other than table.
- Deleting base files when an entity type is deleted.

## Decisions

### New service: `BaseFileGenerator`

Introduce `src/services/BaseFileGenerator.ts` to own base file content generation and vault I/O, keeping it separate from the settings UI. This follows the existing separation between `NoteCreator` (service) and the settings tab (UI).

The service exposes a single async method:
```
generate(entityType, settings, app): Promise<{ path: string; existed: boolean }>
```

### File location: `Entities/<id>.base`

The `Entities/` root is hardcoded. Using the entity type `id` (lowercase, no spaces) as the filename is predictable and decoupled from the `targetFolder` path, which can be arbitrary.

The `Entities/` folder is created if it does not exist (same pattern as target folders in `NoteCreator`).

### `.base` file format

Generated YAML structure:

```yaml
views:
  - type: table
    name: Table
    filters:
      and:
        - <filter expression>
    order:
      - file.name
      - <enabled standard field names>
      - <frontmatterTemplate keys>
    sort:
      - property: file.name
        direction: ASC
```

Filter expression by `entityIdentification` mode:
- `entity-type-field`: `note["<entityTypeField.name>"] == "<entityType.id>"`
- `tags`: `file.tags.contains("<entityType.id>")`

Disabled standard fields are excluded from `order`. `frontmatterTemplate` keys are appended after standard fields in insertion order.

No `formulas` or `columnSize` sections are generated — Obsidian uses sensible defaults for both.

### Overwrite UX: single confirmation modal

When the button is clicked, the service first checks which entity types already have a file at their target path. If any exist, a single modal is shown:

> "X base file(s) will be created. Y already exist(s). How would you like to proceed?"
> [Skip existing] [Overwrite all] [Cancel]

If no files exist, generation proceeds immediately with no modal.

Uses Obsidian's `Modal` class with `createEl`/DOM API — no `innerHTML`.

### Button placement: main settings screen

A single "Create base files" button below the entity types list. This generates files for all enabled entity types in one action, consistent with the global nature of the operation. Per-entity-type buttons would add UI complexity for marginal benefit in v1.

## Risks / Trade-offs

- **`Entities/` folder assumption** — if the user has no entities under `Entities/` and uses a different root entirely, the base files land in an unexpected place. Mitigation: document the hardcoded location clearly; make it configurable in a future version.
- **Settings drift** — if the user renames a frontmatter field or changes `entityIdentification` after generating base files, the generated files become stale. Mitigation: none in v1; the button can be clicked again to regenerate. The `basesFile` path makes it easy to find and overwrite.
- **YAML serialisation** — the `.base` format is YAML; generating it by hand (template strings) is fragile if Obsidian's parser is strict. Mitigation: the structure is simple and flat; no library needed. Test with representative inputs.

## Open Questions

None — design is fully resolved based on explore session.
