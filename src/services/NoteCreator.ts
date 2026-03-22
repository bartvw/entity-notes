import type { App, TFile } from 'obsidian';
import type { EntityType } from '../types';

/**
 * Creates a dedicated Markdown note for an entity and updates the source line.
 *
 * TODO: implement create():
 *   1. extract title from lineText (strip triggerTag, sanitize for filename)
 *   2. ensure targetFolder exists (app.vault.createFolder if needed)
 *   3. build YAML frontmatter: title, entity-type, tags, created, source-note,
 *      plus merged frontmatterTemplate fields
 *   4. app.vault.create(path, content)
 *   5. caller is responsible for rewriting the source line to a wikilink
 */
export class NoteCreator {
    constructor(private readonly app: App) {}

    async create(
        lineText: string,
        entityType: EntityType,
        sourceNotePath: string,
    ): Promise<TFile> {
        void lineText;
        void entityType;
        void sourceNotePath;
        throw new Error('NoteCreator.create is not yet implemented');
    }
}
