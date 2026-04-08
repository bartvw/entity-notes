## 1. BaseFileGenerator service

- [x] 1.1 Create `src/services/BaseFileGenerator.ts` with a `buildContent(entityType, settings)` method that returns the YAML string for a `.base` file
- [x] 1.2 Implement filter expression: `note["<field>"] == "<id>"` for `entity-type-field` mode and `file.tags.contains("<id>")` for `tags` mode
- [x] 1.3 Implement `order` list: `file.name` first, then enabled standard fields by configured name, then `frontmatterTemplate` keys
- [x] 1.4 Implement `sort` section: single entry `file.name ASC`
- [x] 1.5 Add unit tests for `buildContent` covering both identification modes, disabled fields, and frontmatterTemplate keys

## 2. Vault I/O

- [x] 2.1 Add `generate(entityTypes, settings, app)` method to `BaseFileGenerator` that writes `.base` files to the vault and returns a result per entity type (created / skipped / overwritten)
- [x] 2.2 Create `Entities/` folder via `app.vault.createFolder` if it does not exist before writing files
- [x] 2.3 Use `app.vault.create` for new files and `app.vault.modify` for overwrites
- [x] 2.4 After writing, update `entityType.basesFile` with the file path on each `EntityType`

## 3. Overwrite confirmation modal

- [x] 3.1 Create `src/BaseFilesConfirmModal.ts` extending Obsidian `Modal`
- [x] 3.2 Display a summary: "X file(s) will be created, Y already exist(s)"
- [x] 3.3 Render three buttons using `createEl`/DOM API: Skip existing, Overwrite all, Cancel
- [x] 3.4 Resolve a promise with the user's choice so the settings button handler can await it

## 4. Settings UI

- [x] 4.1 Add a "Create base files" button to the main settings screen below the entity types list
- [x] 4.2 On click: collect enabled entity types, check which target paths already exist
- [x] 4.3 If any exist, open `BaseFilesConfirmModal` and await the user's choice
- [x] 4.4 Call `BaseFileGenerator.generate` with the appropriate skip/overwrite flag based on the modal result
- [x] 4.5 Call `saveSettings()` after generation to persist updated `basesFile` paths
