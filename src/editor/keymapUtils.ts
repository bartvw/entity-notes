import { PatternMatcher } from '../services/PatternMatcher';
import type { EntityType, PluginSettings } from '../types';

/**
 * Returns true when the cursor is at or after the last non-whitespace
 * character of the line — the condition required for Convert on Enter.
 */
export function isCursorAtLineEnd(cursor: number, lineFrom: number, lineText: string): boolean {
    return cursor >= lineFrom + lineText.trimEnd().length;
}

// ---------------------------------------------------------------------------
// findMatchForEnter
// ---------------------------------------------------------------------------

interface LineInfo { from: number; to: number; text: string; number: number; }

interface StateShape {
    selection: { main: { head: number } };
    doc: {
        lineAt(pos: number): LineInfo;
        lines: number;
        line(n: number): LineInfo;
    };
}

export interface EnterMatch {
    entityType: EntityType;
    lineNumber: number;
}

/**
 * Checks whether the cursor is at the end of a matched entity line.
 * Returns the matched entity type and line number, or null if Enter should
 * behave normally (no conversion). Extracted for unit testing without CM6/obsidian.
 */
export function findMatchForEnter(
    state: StateShape,
    settings: PluginSettings,
): EnterMatch | null {
    const cursor = state.selection.main.head;
    const line = state.doc.lineAt(cursor);

    if (!isCursorAtLineEnd(cursor, line.from, line.text)) return null;

    const docLines: string[] = [];
    for (let i = 1; i <= state.doc.lines; i++) {
        docLines.push(state.doc.line(i).text);
    }

    const context = PatternMatcher.computeContext(docLines, line.number - 1);
    const entityType = new PatternMatcher().match(line.text, settings.entityTypes, context);

    if (entityType === null) return null;
    return { entityType, lineNumber: line.number };
}
