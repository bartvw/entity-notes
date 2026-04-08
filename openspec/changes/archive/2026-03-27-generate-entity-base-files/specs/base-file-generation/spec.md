## ADDED Requirements

### Requirement: Generate base files on demand
The plugin SHALL provide a "Create base files" button on the main settings screen. When clicked, it SHALL generate one Obsidian Bases `.base` file for each enabled entity type and write it to the vault at `Entities/<entityType.id>.base`.

#### Scenario: Button generates files for all enabled entity types
- **WHEN** the user clicks "Create base files" and no base files already exist
- **THEN** a `.base` file is created at `Entities/<id>.base` for each enabled entity type
- **THEN** no modal or confirmation is shown
- **THEN** `EntityType.basesFile` is updated with the path for each created file and settings are saved

#### Scenario: Disabled entity types are skipped
- **WHEN** the user clicks "Create base files"
- **THEN** no base file is created for entity types whose `enabled` flag is false

#### Scenario: `Entities/` folder is created if missing
- **WHEN** the user clicks "Create base files" and no `Entities/` folder exists in the vault
- **THEN** the folder is created before any base files are written

### Requirement: Confirm before overwriting existing base files
When one or more base files already exist at their target paths, the plugin SHALL show a confirmation modal before proceeding.

#### Scenario: Some base files already exist
- **WHEN** the user clicks "Create base files" and at least one `.base` file already exists at its target path
- **THEN** a modal is shown listing how many files will be created and how many already exist
- **THEN** the modal offers three actions: Skip existing, Overwrite all, Cancel

#### Scenario: User chooses Skip existing
- **WHEN** the user selects "Skip existing" in the confirmation modal
- **THEN** only entity types without an existing base file at their target path receive a new file
- **THEN** existing files are left unchanged

#### Scenario: User chooses Overwrite all
- **WHEN** the user selects "Overwrite all" in the confirmation modal
- **THEN** base files are written for all enabled entity types, replacing any existing files

#### Scenario: User cancels
- **WHEN** the user selects "Cancel" in the confirmation modal
- **THEN** no files are created or modified

### Requirement: Base file content — entity-type-field mode
When the **Identify entities by** setting is `entity-type-field`, the generated `.base` file SHALL filter notes using the configured entity-type field name and the entity type id.

#### Scenario: Filter expression uses configured field name
- **WHEN** a base file is generated and `entityIdentification` is `entity-type-field`
- **THEN** the filter is `note["<entityTypeField.name>"] == "<entityType.id>"`

### Requirement: Base file content — tags mode
When the **Identify entities by** setting is `tags`, the generated `.base` file SHALL filter notes by tag.

#### Scenario: Filter expression uses tag containment
- **WHEN** a base file is generated and `entityIdentification` is `tags`
- **THEN** the filter is `file.tags.contains("<entityType.id>")`

### Requirement: Base file column order
The generated `.base` file SHALL include a column order with `file.name` first, followed by enabled standard frontmatter fields (using their configured names), followed by keys from `frontmatterTemplate`.

#### Scenario: Disabled standard fields are excluded
- **WHEN** a base file is generated and a standard frontmatter field is disabled
- **THEN** that field's name does not appear in the `order` list

#### Scenario: frontmatterTemplate keys are appended
- **WHEN** a base file is generated and the entity type has one or more `frontmatterTemplate` entries
- **THEN** those keys appear in `order` after the standard fields, in insertion order

### Requirement: Base file default sort
The generated `.base` file SHALL sort by `file.name` ascending by default.

#### Scenario: Sort is set to file.name ASC
- **WHEN** a base file is generated
- **THEN** the `sort` section contains a single entry: `property: file.name`, `direction: ASC`
