import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import type { EntityType, PluginSettings } from '../types';

export type BaseFileStatus = 'created' | 'skipped' | 'overwritten';

export interface BaseFileResult {
    entityType: EntityType;
    path: string;
    status: BaseFileStatus;
}

export class BaseFileGenerator {
    constructor(private readonly app: App) {}

    // ---------------------------------------------------------------------------
    // Pure helpers
    // ---------------------------------------------------------------------------

    static targetPath(entityType: EntityType): string {
        return `Entities/${entityType.id}.base`;
    }

    /**
     * Builds the YAML content for a `.base` file for the given entity type.
     * The filter expression adapts to the active entityIdentification mode.
     * Only enabled standard frontmatter fields are included in the column order.
     */
    static buildContent(entityType: EntityType, settings: PluginSettings): string {
        const filter = settings.entityIdentification === 'entity-type-field'
            ? `note["${settings.entityTypeField.name}"] == "${entityType.id}"`
            : `file.tags.contains("${entityType.id}")`;

        const standardFields = [
            settings.titleField,
            settings.entityTypeField,
            settings.tagsField,
            settings.createdField,
            settings.sourceNoteField,
        ];
        const enabledNames = standardFields.filter(f => f.enabled).map(f => f.name);
        const templateKeys = Object.keys(entityType.frontmatterTemplate);
        const orderColumns = ['file.name', ...enabledNames, ...templateKeys];

        return [
            'views:',
            '  - type: table',
            '    name: Table',
            '    filters:',
            '      and:',
            `        - ${filter}`,
            '    order:',
            ...orderColumns.map(col => `      - ${col}`),
            '    sort:',
            '      - property: file.name',
            '        direction: ASC',
            '',
        ].join('\n');
    }

    // ---------------------------------------------------------------------------
    // Vault I/O
    // ---------------------------------------------------------------------------

    /**
     * Generates `.base` files for the given entity types.
     * When `overwrite` is false, entity types whose target file already exists are skipped.
     * Mutates `entityType.basesFile` on created/overwritten entries.
     */
    async generate(
        entityTypes: EntityType[],
        settings: PluginSettings,
        overwrite: boolean,
    ): Promise<BaseFileResult[]> {
        if (!this.app.vault.getAbstractFileByPath('Entities')) {
            await this.app.vault.createFolder('Entities');
        }

        const results: BaseFileResult[] = [];

        for (const et of entityTypes) {
            const path = BaseFileGenerator.targetPath(et);
            const existing = this.app.vault.getAbstractFileByPath(path);
            const content = BaseFileGenerator.buildContent(et, settings);

            if (existing !== null) {
                if (!overwrite || !(existing instanceof TFile)) {
                    results.push({ entityType: et, path, status: 'skipped' });
                    continue;
                }
                await this.app.vault.modify(existing, content);
                et.basesFile = path;
                results.push({ entityType: et, path, status: 'overwritten' });
            } else {
                await this.app.vault.create(path, content);
                et.basesFile = path;
                results.push({ entityType: et, path, status: 'created' });
            }
        }

        return results;
    }
}
