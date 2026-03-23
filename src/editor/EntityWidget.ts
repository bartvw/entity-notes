import { WidgetType, EditorView } from '@codemirror/view';
import { Notice } from 'obsidian';
import type EntityNotesPlugin from '../main';
import type { EntityType } from '../types';
import { NoteCreator } from '../services/NoteCreator';

/**
 * CM6 WidgetType that renders the inline "→ EntityType" button next to a
 * matched trigger-tag line. On click it calls NoteCreator and dispatches a
 * CM6 transaction to rewrite the source line.
 */
export class EntityWidget extends WidgetType {
    constructor(
        private readonly plugin: EntityNotesPlugin,
        private readonly entityType: EntityType,
        private readonly lineText: string,
        private readonly lineNumber: number, // 1-based CM6 line number
    ) {
        super();
    }

    eq(other: EntityWidget): boolean {
        return (
            other.entityType.id === this.entityType.id &&
            other.lineText === this.lineText &&
            other.lineNumber === this.lineNumber
        );
    }

    toDOM(view: EditorView): HTMLElement {
        const container = document.createElement('span');
        container.className = 'entity-notes-plugin';

        const button = container.createEl('button', {
            cls: 'entity-notes-convert-button',
            attr: {
                'aria-label': `Convert to ${this.entityType.name} note`,
                type: 'button',
            },
        });
        button.textContent = `→ ${this.entityType.name}`;

        button.addEventListener('mousedown', (e: MouseEvent) => {
            // preventDefault stops the editor stealing focus / moving the cursor.
            // stopPropagation prevents CM6 from also handling this mousedown.
            e.preventDefault();
            e.stopPropagation();
            convertLine(this.plugin, this.entityType, this.lineNumber, view).catch((err: unknown) => {
                console.error('[entity-notes] Failed to create note:', err);
                new Notice('Entity notes: could not create note — see console');
            });
        });

        return container;
    }

    ignoreEvent(): boolean {
        // Return false so CM6 is informed of the event; stopPropagation in
        // the handler prevents it from reaching the editor's own logic.
        return false;
    }

    get estimatedHeight(): number {
        return -1; // -1 = inline widget; do not reserve extra vertical space
    }

}

/**
 * Performs the entity conversion for a single matched line. Shared by
 * EntityWidget (button click) and the Convert-on-Enter keymap handler.
 */
export async function convertLine(
    plugin: EntityNotesPlugin,
    entityType: EntityType,
    lineNumber: number,
    view: EditorView,
): Promise<void> {
    // Re-read from current state (not from any stale closure at render time)
    const line = view.state.doc.line(lineNumber);

    // Guard 1 — user may have already edited the line before triggering
    if (!line.text.includes(entityType.triggerTag)) return;

    const sourceNotePath = plugin.app.workspace.getActiveFile()?.path ?? '';

    const result = await new NoteCreator(plugin.app).create(
        line.text,
        entityType,
        sourceNotePath,
        plugin.settings,
    );

    // Guard 2 — re-read after the async vault operation; another edit may
    // have landed while we were awaiting
    const freshLine = view.state.doc.line(lineNumber);
    if (freshLine.text !== line.text) {
        new Notice(
            `entity-notes: note "${result.title}" was created but the source line changed — please add the link manually.`,
        );
        return;
    }

    view.dispatch({
        changes: { from: freshLine.from, to: freshLine.to, insert: result.modifiedLine },
    });
}
