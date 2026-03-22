import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import type EntityNotesPlugin from '../main';
import { PatternMatcher } from '../services/PatternMatcher';
import { EntityWidget } from './EntityWidget';
import { EntityPillWidget } from './EntityPillWidget';

/**
 * Creates the CM6 editor extension that watches for entity trigger tags in
 * visible lines and injects an inline "→ EntityType" button next to each match.
 *
 * Decorations are rebuilt on document/viewport changes and also when
 * plugin.settingsVersion increments (triggered by saveSettings() dispatching
 * an empty CM6 transaction to all open editors after every settings save).
 */
export function buildEntityButtonPlugin(plugin: EntityNotesPlugin): Extension {
    return ViewPlugin.fromClass(
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
                        const entityTypeId = cache?.frontmatter?.['entity-type'];
                        if (typeof entityTypeId === 'string') {
                            const et = entityTypes.find(e => e.id === entityTypeId && e.enabled);
                            if (et) {
                                builder.add(
                                    line.to,
                                    line.to,
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
