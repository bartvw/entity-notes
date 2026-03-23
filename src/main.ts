import { MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, EntityNotesSettingTab } from './settings';
import type { PluginSettings } from './types';
import { buildEntityButtonPlugin } from './editor/EntityButtonPlugin';
import { injectPillsIntoElement } from './editor/readingViewPill';

export default class EntityNotesPlugin extends Plugin {
    settings: PluginSettings;
    /**
     * Incremented on every settings save. The ViewPlugin checks this on each
     * CM6 transaction and rebuilds decorations when it changes, making settings
     * take effect without waiting for a document or viewport change.
     */
    settingsVersion = 0;

    async onload() {
        await this.loadSettings();
        this.registerEditorExtension(buildEntityButtonPlugin(this));
        this.addSettingTab(new EntityNotesSettingTab(this.app, this));

        // Inject entity pills into Reading mode via the markdown post-processor.
        // Each rendered block is scanned for internal links; those resolving to
        // a known entity note get a pill span inserted after them.
        this.registerMarkdownPostProcessor((el) => {
            injectPillsIntoElement(el, (linkTarget) => {
                const file = this.app.metadataCache.getFirstLinkpathDest(linkTarget, '');
                if (!file) return null;
                const cache = this.app.metadataCache.getFileCache(file);
                const entityTypeId: unknown = cache?.frontmatter?.[this.settings.entityTypeField.name];
                if (typeof entityTypeId !== 'string') return null;
                return this.settings.entityTypes.find(e => e.id === entityTypeId && e.enabled) ?? null;
            });
        });

        // Rebuild decorations whenever the metadata cache indexes a file so
        // the entity pill appears immediately after a note is created, without
        // waiting for the next user keystroke.
        this.registerEvent(
            this.app.metadataCache.on('changed', () => {
                this.settingsVersion++;
                this.triggerEditorRefresh();
            }),
        );
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData() as Partial<PluginSettings>,
        );
        // Migration: backfill FrontmatterField objects added after initial release.
        // Carry over the enabled state from older boolean flags when present.
        const old = this.settings as unknown as Record<string, unknown>;
        this.settings.titleField      ??= { enabled: (old['includeTitle']      as boolean) ?? true, name: 'title' };
        this.settings.entityTypeField ??= { enabled: (old['includeEntityType'] as boolean) ?? true, name: 'entity-type' };
        this.settings.tagsField       ??= { enabled: (old['includeTags']       as boolean) ?? true, name: 'tags' };
        this.settings.createdField    ??= { enabled: (old['includeCreated']    as boolean) ?? true, name: 'created' };
        this.settings.sourceNoteField ??= { enabled: (old['includeSourceNote'] as boolean) ?? true, name: 'source-note' };
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.settingsVersion++;
        this.triggerEditorRefresh();
    }

    /**
     * Dispatches an empty CM6 transaction to every open markdown editor.
     * This causes the ViewPlugin's update() to run, where it detects the
     * incremented settingsVersion and rebuilds decorations immediately.
     */
    private triggerEditorRefresh(): void {
        this.app.workspace.getLeavesOfType('markdown').forEach(leaf => {
            if (leaf.view instanceof MarkdownView) {
                // editor.cm is the underlying CM6 EditorView. It is not part of
                // Obsidian's published TypeScript types but is stable in practice
                // and widely used by the plugin ecosystem for exactly this purpose.
                const cm = (leaf.view.editor as unknown as { cm?: { dispatch(tr: object): void } }).cm;
                cm?.dispatch({});
            }
        });
    }
}
