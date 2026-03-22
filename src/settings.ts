import { App, PluginSettingTab } from 'obsidian';
import type EntityNotesPlugin from './main';
import type { EntityType, PluginSettings } from './types';

export const DEFAULT_ENTITY_TYPES: EntityType[] = [
    { id: 'person',         name: 'Person',         triggerTag: '#person',         targetFolder: 'Entities/People',          enabled: true, frontmatterTemplate: {} },
    { id: 'idea',           name: 'Idea',           triggerTag: '#idea',           targetFolder: 'Entities/Ideas',           enabled: true, frontmatterTemplate: {} },
    { id: 'accomplishment', name: 'Accomplishment', triggerTag: '#accomplishment', targetFolder: 'Entities/Accomplishments', enabled: true, frontmatterTemplate: {} },
    { id: 'feedback',       name: 'Feedback',       triggerTag: '#feedback',       targetFolder: 'Entities/Feedback',        enabled: true, frontmatterTemplate: {} },
    { id: 'project',        name: 'Project',        triggerTag: '#project',        targetFolder: 'Entities/Projects',        enabled: true, frontmatterTemplate: {} },
    { id: 'task',           name: 'Task',           triggerTag: '#task',           targetFolder: 'Entities/Tasks',           enabled: true, frontmatterTemplate: {} },
];

export const DEFAULT_SETTINGS: PluginSettings = {
    entityTypes: DEFAULT_ENTITY_TYPES,
};

export class EntityNotesSettingTab extends PluginSettingTab {
    plugin: EntityNotesPlugin;

    constructor(app: App, plugin: EntityNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Entity Notes' });

        // TODO: implement entity-type management UI (add / edit / delete / reorder)
    }
}
