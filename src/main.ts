import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, EntityNotesSettingTab } from './settings';
import type { PluginSettings } from './types';
import { buildEntityButtonPlugin } from './editor/EntityButtonPlugin';

export default class EntityNotesPlugin extends Plugin {
    settings: PluginSettings;

    async onload() {
        await this.loadSettings();
        this.registerEditorExtension(buildEntityButtonPlugin(this));
        this.addSettingTab(new EntityNotesSettingTab(this.app, this));
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData() as Partial<PluginSettings>,
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
