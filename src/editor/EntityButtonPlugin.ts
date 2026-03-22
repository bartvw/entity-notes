import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate, keymap } from '@codemirror/view';
import { RangeSetBuilder, Prec } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { Notice } from 'obsidian';
import type EntityNotesPlugin from '../main';
import { PatternMatcher } from '../services/PatternMatcher';
import { EntityWidget, convertLine } from './EntityWidget';
import { EntityPillWidget } from './EntityPillWidget';
import { isCursorAtLineEnd } from './keymapUtils';

/**
 * Creates the CM6 editor extension that watches for entity trigger tags in
 * visible lines and injects an inline "→ EntityType" button next to each match.
 *
 * Decorations are rebuilt on document/viewport changes and also when
 * plugin.settingsVersion increments (triggered by saveSettings() dispatching
 * an empty CM6 transaction to all open editors after every settings save).
 */
export function buildEntityButtonPlugin(plugin: EntityNotesPlugin): Extension {
    const viewPlugin = ViewPlugin.fromClass(
        class {
            decorations: DecorationSet;
            // Instantiate once per plugin registration; PatternMatcher is stateless
            // but holding a single instance is cleaner and avoids repeated allocations.
            private readonly matcher = new PatternMatcher();
            private settingsVersion = plugin.settingsVersion;

            constructor(view: EditorView) {
                this.decorations = buildDecorations(view, plugin, this.matcher);
            }

            update(update: ViewUpdate): void {
                const settingsChanged = plugin.settingsVersion !== this.settingsVersion;
                if (update.docChanged || update.viewportChanged || settingsChanged) {
                    this.settingsVersion = plugin.settingsVersion;
                    this.decorations = buildDecorations(update.view, plugin, this.matcher);
                }
            }
        },
        { decorations: v => v.decorations },
    );

    const enterKeymap = keymap.of([{
        key: 'Enter',
        run(view: EditorView): boolean {
            if (!plugin.settings.convertOnEnter) return false;

            const { state } = view;
            // Only handle a bare cursor with no selection
            if (!state.selection.main.empty) return false;

            const cursor = state.selection.main.head;
            const line = state.doc.lineAt(cursor);

            // Cursor must be at or after the last non-whitespace character
            if (!isCursorAtLineEnd(cursor, line.from, line.text)) return false;

            // Collect all lines for context computation
            const docLines: string[] = [];
            for (let i = 1; i <= state.doc.lines; i++) {
                docLines.push(state.doc.line(i).text);
            }

            const context = PatternMatcher.computeContext(docLines, line.number - 1);
            const match = new PatternMatcher().match(line.text, plugin.settings.entityTypes, context);

            if (match === null) return false;

            convertLine(plugin, match, line.number, view).catch((err: unknown) => {
                console.error('[entity-notes] Failed to create note:', err);
                new Notice('Entity notes: could not create note — see console');
            });

            return true; // prevent the default newline insertion
        },
    }]);

    return [viewPlugin, Prec.highest(enterKeymap)];
}

function buildDecorations(
    view: EditorView,
    plugin: EntityNotesPlugin,
    matcher: PatternMatcher,
): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const entityTypes = plugin.settings.entityTypes;

    // Collect all lines once so PatternMatcher.computeContext can scan from
    // line 0 for each visible line (needed to detect code blocks / frontmatter).
    const docLines: string[] = [];
    for (let i = 1; i <= view.state.doc.lines; i++) {
        docLines.push(view.state.doc.line(i).text);
    }

    for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
            const line = view.state.doc.lineAt(pos);

            const context = PatternMatcher.computeContext(docLines, line.number - 1);
            const match = matcher.match(line.text, entityTypes, context);

            if (match !== null) {
                builder.add(
                    line.to,
                    line.to,
                    Decoration.widget({
                        widget: new EntityWidget(plugin, match, line.text, line.number),
                        side: 1,
                    }),
                );
            } else {
                // Pill detection: find a [[wikilink]] and check its frontmatter
                const linkMatch = line.text.match(/\[\[([^\]|#^]+?)(?:\|[^\]]+)?\]\]/);
                if (linkMatch) {
                    const linkText = linkMatch[1]!.trim();
                    const file = plugin.app.metadataCache.getFirstLinkpathDest(linkText, '');
                    if (file) {
                        const cache = plugin.app.metadataCache.getFileCache(file);
                        const entityTypeId: unknown = cache?.frontmatter?.['entity-type'];
                        if (typeof entityTypeId === 'string') {
                            const et = entityTypes.find(e => e.id === entityTypeId && e.enabled);
                            if (et) {
                                const afterLink = line.from + linkMatch.index! + linkMatch[0].length;
                                builder.add(
                                    afterLink,
                                    afterLink,
                                    Decoration.widget({
                                        widget: new EntityPillWidget(et),
                                        side: 1,
                                    }),
                                );
                            }
                        }
                    }
                }
            }

            // Advance past the newline character. Without +1 the last line in
            // a visible range would loop infinitely (pos === to forever).
            pos = line.to + 1;
        }
    }

    return builder.finish();
}
