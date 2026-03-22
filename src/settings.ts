import { App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import type EntityNotesPlugin from './main';
import type { EntityType, PluginSettings } from './types';

export const DEFAULT_ENTITY_TYPES: EntityType[] = [
    { id: 'person',         name: 'Person',         triggerTag: '#person',         targetFolder: 'Entities/People',          color: '#4a90d9', enabled: true, frontmatterTemplate: {} },
    { id: 'idea',           name: 'Idea',           triggerTag: '#idea',           targetFolder: 'Entities/Ideas',           color: '#f5a623', enabled: true, frontmatterTemplate: {} },
    { id: 'accomplishment', name: 'Accomplishment', triggerTag: '#accomplishment', targetFolder: 'Entities/Accomplishments', color: '#7ed321', enabled: true, frontmatterTemplate: {} },
    { id: 'feedback',       name: 'Feedback',       triggerTag: '#feedback',       targetFolder: 'Entities/Feedback',        color: '#9b59b6', enabled: true, frontmatterTemplate: {} },
    { id: 'project',        name: 'Project',        triggerTag: '#project',        targetFolder: 'Entities/Projects',        color: '#e74c3c', enabled: true, frontmatterTemplate: {} },
];

export const DEFAULT_SETTINGS: PluginSettings = {
    entityTypes: DEFAULT_ENTITY_TYPES,
};

// ---------------------------------------------------------------------------
// Settings tab
// ---------------------------------------------------------------------------

export class EntityNotesSettingTab extends PluginSettingTab {
    plugin: EntityNotesPlugin;

    constructor(app: App, plugin: EntityNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const entityTypes = this.plugin.settings.entityTypes;

        if (entityTypes.length === 0) {
            containerEl.createEl('p', { text: 'No entity types configured. Add one below.' });
        }

        for (const et of entityTypes) {
            new Setting(containerEl)
                .setName(et.name)
                .setDesc(et.triggerTag)
                .addToggle(toggle => toggle
                    .setValue(et.enabled)
                    .setTooltip('Enabled')
                    .onChange(async value => {
                        et.enabled = value;
                        await this.plugin.saveSettings();
                    }),
                )
                .addExtraButton(btn => btn
                    .setIcon('pencil')
                    .setTooltip('Edit')
                    .onClick(() => {
                        new EntityTypeModal(this.app, this.plugin, et, () => this.display()).open();
                    }),
                )
                .addExtraButton(btn => btn
                    .setIcon('trash')
                    .setTooltip('Delete')
                    .onClick(async () => {
                        this.plugin.settings.entityTypes =
                            this.plugin.settings.entityTypes.filter(e => e !== et);
                        await this.plugin.saveSettings();
                        this.display();
                    }),
                );
        }

        new Setting(containerEl)
            .addButton(btn => btn
                .setButtonText('Add entity type')
                .setCta()
                .onClick(() => {
                    new EntityTypeModal(this.app, this.plugin, null, () => this.display()).open();
                }),
            );
    }
}

// ---------------------------------------------------------------------------
// Add / Edit modal
// ---------------------------------------------------------------------------

class EntityTypeModal extends Modal {
    private readonly isNew: boolean;
    private readonly draft: EntityType;
    private templatePairs: Array<{ key: string; value: string }>;
    private templateContainer: HTMLElement | null = null;

    constructor(
        app: App,
        private readonly plugin: EntityNotesPlugin,
        entityType: EntityType | null,
        private readonly onComplete: () => void,
    ) {
        super(app);
        this.isNew = entityType === null;
        if (entityType !== null) {
            this.draft = { ...entityType };
            this.templatePairs = Object.entries(entityType.frontmatterTemplate).map(
                ([key, value]) => ({ key, value: valueToString(value) }),
            );
        } else {
            this.draft = {
                id: '',
                name: '',
                triggerTag: '',
                targetFolder: '',
                color: '#7c3aed',
                enabled: true,
                frontmatterTemplate: {},
            };
            this.templatePairs = [];
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: this.isNew ? 'Add entity type' : 'Edit entity type' });
        this.buildForm(contentEl);
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private buildForm(el: HTMLElement): void {
        // Track the trigger-tag input so we can auto-fill it when the name changes.
        let triggerTagInputEl: HTMLInputElement | null = null;

        new Setting(el)
            .setName('Name')
            .setDesc('Display label, e.g. Person')
            .addText(text => {
                text.setPlaceholder('Person')
                    .setValue(this.draft.name)
                    .onChange(v => {
                        this.draft.name = v;
                        // Auto-fill trigger tag for new entity types only.
                        if (this.isNew && triggerTagInputEl !== null) {
                            const autoTag = '#' + v.toLowerCase().replace(/\s+/g, '');
                            this.draft.triggerTag = autoTag;
                            triggerTagInputEl.value = autoTag;
                        }
                    });
            });

        new Setting(el)
            .setName('Trigger tag')
            .setDesc('Hashtag that activates detection, e.g. #person')
            .addText(text => {
                triggerTagInputEl = text.inputEl;
                text.setPlaceholder('#person')
                    .setValue(this.draft.triggerTag)
                    .onChange(v => { this.draft.triggerTag = v; });
            });

        new Setting(el)
            .setName('Target folder')
            .setDesc('Vault path where entity notes are created, e.g. Entities/People')
            .addText(text => {
                // eslint-disable-next-line obsidianmd/ui/sentence-case
                text.setPlaceholder('Entities/People')
                    .setValue(this.draft.targetFolder)
                    .onChange(v => { this.draft.targetFolder = v; });
            });

        new Setting(el)
            .setName('Enabled')
            .setDesc('Disabled entity types are ignored by the editor')
            .addToggle(toggle => {
                toggle.setValue(this.draft.enabled)
                    .onChange(v => { this.draft.enabled = v; });
            });

        const colorSetting = new Setting(el)
            .setName('Color')
            .setDesc('Background color of the entity pill badge');
        const colorInput = colorSetting.controlEl.createEl('input', {
            attr: { type: 'color', value: this.draft.color },
        });
        colorInput.addEventListener('input', () => { this.draft.color = colorInput.value; });

        // Frontmatter template ------------------------------------------------

        el.createEl('h3', { text: 'Frontmatter template' });
        el.createEl('p', {
            text: 'Extra fields written into every note created by this entity type. '
                + 'Standard fields (title, entity-type, tags, created, source-note) are '
                + 'always included and cannot be overridden here. '
                + 'For the tags key, enter a comma-separated list to add multiple tags.',
            cls: 'setting-item-description',
        });

        this.templateContainer = el.createDiv({ cls: 'entity-notes-template-rows' });
        this.renderTemplateRows();

        new Setting(el)
            .addButton(btn => btn
                .setButtonText('Add field')
                .onClick(() => {
                    this.templatePairs.push({ key: '', value: '' });
                    this.renderTemplateRows();
                }),
            );

        // Save / Cancel -------------------------------------------------------

        new Setting(el)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()),
            )
            .addButton(btn => btn
                .setButtonText('Save')
                .setCta()
                .onClick(() => { void this.handleSave(); }),
            );
    }

    private renderTemplateRows(): void {
        if (this.templateContainer === null) return;
        this.templateContainer.empty();

        this.templatePairs.forEach((pair, index) => {
            const row = this.templateContainer!.createDiv({ cls: 'entity-notes-template-row' });

            const keyInput = row.createEl('input', {
                attr: { type: 'text', placeholder: 'Key' },
            });
            keyInput.value = pair.key;
            keyInput.addEventListener('input', () => { pair.key = keyInput.value; });

            const valueInput = row.createEl('input', {
                attr: { type: 'text', placeholder: 'Value' },
            });
            valueInput.value = pair.value;
            valueInput.addEventListener('input', () => { pair.value = valueInput.value; });

            const deleteBtn = row.createEl('button', { text: '×', attr: { type: 'button' } });
            deleteBtn.addEventListener('click', () => {
                this.templatePairs.splice(index, 1);
                this.renderTemplateRows();
            });
        });
    }

    private async handleSave(): Promise<void> {
        const name = this.draft.name.trim();
        const tag  = this.draft.triggerTag.trim();
        const dir  = this.draft.targetFolder.trim();

        if (!name) { new Notice('Name is required.'); return; }
        if (!tag)  { new Notice('Trigger tag is required.'); return; }
        if (!tag.startsWith('#')) { new Notice('Trigger tag must start with #.'); return; }
        if (!dir)  { new Notice('Target folder is required.'); return; }

        // Build frontmatter template from the key-value pairs.
        const template: Record<string, unknown> = {};
        for (const { key, value } of this.templatePairs) {
            const k = key.trim();
            if (k === '') continue;
            template[k] = coerceValue(k, value.trim());
        }

        this.draft.name              = name;
        this.draft.triggerTag        = tag;
        this.draft.targetFolder      = dir;
        this.draft.frontmatterTemplate = template;

        const entityTypes = this.plugin.settings.entityTypes;

        if (this.isNew) {
            this.draft.id = generateId(name, entityTypes.map(et => et.id));
            entityTypes.push({ ...this.draft });
        } else {
            const idx = entityTypes.findIndex(et => et.id === this.draft.id);
            if (idx !== -1) entityTypes[idx] = { ...this.draft };
        }

        await this.plugin.saveSettings();
        this.close();
        this.onComplete();
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a template value to a display string for the UI text input.
 * Arrays are joined as comma-separated; everything else is stringified.
 */
function valueToString(value: unknown): string {
    if (Array.isArray(value)) return value.map(String).join(', ');
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return '';
}

/**
 * Coerces a raw string from the UI to an appropriate JS value:
 *   - "tags" key → string[] (split on commas)
 *   - "true" / "false" → boolean
 *   - numeric strings → number
 *   - everything else → string
 */
function coerceValue(key: string, value: string): unknown {
    if (key === 'tags') {
        return value.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
    if (value === 'true')  return true;
    if (value === 'false') return false;
    if (value !== '' && !isNaN(Number(value))) return Number(value);
    return value;
}

/**
 * Generates a unique entity-type id from a display name.
 * Lowercases, replaces whitespace with hyphens, removes non-alphanumeric chars.
 */
function generateId(name: string, existingIds: string[]): string {
    const base = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'entity';
    if (!existingIds.includes(base)) return base;
    for (let n = 2; ; n++) {
        const candidate = `${base}-${n}`;
        if (!existingIds.includes(candidate)) return candidate;
    }
}
