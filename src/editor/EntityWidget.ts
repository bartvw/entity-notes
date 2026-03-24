import { WidgetType, EditorView } from '@codemirror/view';
import { Notice } from 'obsidian';
import type EntityNotesPlugin from '../main';
import { NoteCreator } from '../services/NoteCreator';
import type { MatchResult, PositionedMatch } from '../services/PatternMatcher';

/**
 * CM6 WidgetType that renders the inline "→ EntityType" button next to a
 * matched trigger-tag line. On click it calls NoteCreator and dispatches a
 * CM6 transaction to rewrite the source line.
 */
export class EntityWidget extends WidgetType {
    constructor(
        private readonly plugin: EntityNotesPlugin,
        private readonly matchResult: MatchResult,
        private readonly lineText: string,
        private readonly lineNumber: number, // 1-based CM6 line number
    ) {
        super();
    }

    eq(other: EntityWidget): boolean {
        return (
            other.matchResult.entityType.id === this.matchResult.entityType.id &&
            other.lineText === this.lineText &&
            other.lineNumber === this.lineNumber
        );
    }

    toDOM(view: EditorView): HTMLElement {
        const { entityType } = this.matchResult;
        const container = document.createElement('span');
        container.className = 'entity-notes-plugin';

        const button = container.createEl('button', {
            cls: 'entity-notes-convert-button',
            attr: {
                'aria-label': `Convert to ${entityType.name} note`,
                type: 'button',
            },
        });
        button.textContent = `→ ${entityType.name}`;

        button.addEventListener('mousedown', (e: MouseEvent) => {
            // preventDefault stops the editor stealing focus / moving the cursor.
            // stopPropagation prevents CM6 from also handling this mousedown.
            e.preventDefault();
            e.stopPropagation();
            convertLine(this.plugin, this.matchResult, this.lineNumber, view).catch((err: unknown) => {
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
 * Converts all matched entities on a line in one go (used by the Enter keymap).
 * Notes are created sequentially; each result's modifiedLine feeds the next call
 * so that all tags are stripped before the single editor dispatch.
 */
export async function convertAllOnLine(
    plugin: EntityNotesPlugin,
    matches: PositionedMatch[],
    lineNumber: number,
    view: EditorView,
): Promise<void> {
    const line = view.state.doc.line(lineNumber);
    const sourceNotePath = plugin.app.workspace.getActiveFile()?.path ?? '';
    let currentText = line.text;

    for (const { matchResult } of matches) {
        const { entityType } = matchResult;

        if (matchResult.case === 'unresolved-link') {
            // Verify the specific [[linkText]] … #tag unit still exists in currentText.
            // A plain includes(triggerTag) check would pass even when the tag remains from
            // an unrelated position, causing NoteCreator.create to strip the wrong occurrence.
            // Note: when two identical wikilinks appear (e.g. [[Alice]] #person [[Alice]] #person),
            // the second note is collision-resolved to a different filename ("Alice 2") but
            // the wikilink text cannot be updated to match — this is an inherent Case 1 limitation.
            const escapedLink = matchResult.linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const escapedTag = entityType.triggerTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`\\[\\[${escapedLink}(?:\\|[^\\]]+)?\\]\\]\\s*${escapedTag}(?![a-zA-Z0-9_\\-\\/])`);
            if (!re.test(currentText)) continue;
        } else if (!currentText.includes(entityType.triggerTag)) {
            continue;
        }

        const linkText = matchResult.case === 'unresolved-link' ? matchResult.linkText : undefined;
        const result = await new NoteCreator(plugin.app).create(
            currentText, entityType, sourceNotePath, plugin.settings, undefined, linkText,
        );
        currentText = result.modifiedLine;
    }

    if (currentText === line.text) return; // nothing was converted

    const freshLine = view.state.doc.line(lineNumber);
    if (freshLine.text !== line.text) {
        new Notice(
            `entity-notes: notes were created but the source line changed — please add the links manually.`,
        );
        return;
    }

    view.dispatch({
        changes: { from: freshLine.from, to: freshLine.to, insert: currentText },
    });
}

/**
 * Performs the entity conversion for a single matched line. Shared by
 * EntityWidget (button click) and the Convert-on-Enter keymap handler.
 */
export async function convertLine(
    plugin: EntityNotesPlugin,
    matchResult: MatchResult,
    lineNumber: number,
    view: EditorView,
): Promise<void> {
    const { entityType } = matchResult;
    // Re-read from current state (not from any stale closure at render time)
    const line = view.state.doc.line(lineNumber);

    // Guard 1 — user may have already edited the line before triggering
    if (!line.text.includes(entityType.triggerTag)) return;

    const sourceNotePath = plugin.app.workspace.getActiveFile()?.path ?? '';
    const linkText = matchResult.case === 'unresolved-link' ? matchResult.linkText : undefined;

    const result = await new NoteCreator(plugin.app).create(
        line.text,
        entityType,
        sourceNotePath,
        plugin.settings,
        undefined,
        linkText,
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
