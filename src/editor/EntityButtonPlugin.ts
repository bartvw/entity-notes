import type { Extension } from '@codemirror/state';
import type EntityNotesPlugin from '../main';

/**
 * Creates the CodeMirror 6 editor extension that watches for entity trigger
 * tags and injects inline "→ note" buttons next to matching lines.
 *
 * TODO: implement as a ViewPlugin that:
 *   1. runs on docChanged / viewportChanged
 *   2. iterates view.visibleRanges
 *   3. calls PatternMatcher for each line
 *   4. adds Decoration.widget(EntityWidget) at end of matching lines
 */
export function buildEntityButtonPlugin(_plugin: EntityNotesPlugin): Extension {
    // Stub — returns an empty extension until the ViewPlugin is implemented.
    return [];
}
