import { describe, it, expect } from 'vitest';
import { isCursorAtLineEnd, findMatchForEnter } from './keymapUtils';
import type { PluginSettings } from '../types';

// ---------------------------------------------------------------------------
// isCursorAtLineEnd
// ---------------------------------------------------------------------------

describe('isCursorAtLineEnd', () => {
    const text = 'Hello #person';
    const from = 0;
    const len  = text.length; // 13

    it('returns true when cursor is at the very end of the line', () => {
        expect(isCursorAtLineEnd(from + len, from, text)).toBe(true);
    });

    it('returns false when cursor is one position before the end', () => {
        expect(isCursorAtLineEnd(from + len - 1, from, text)).toBe(false);
    });

    it('returns false when cursor is mid-line', () => {
        expect(isCursorAtLineEnd(from + 5, from, text)).toBe(false);
    });

    it('returns false when cursor is at the start of the line', () => {
        expect(isCursorAtLineEnd(from, from, text)).toBe(false);
    });

    it('returns true when line has trailing spaces and cursor is past trimmed end', () => {
        const padded = 'Hello #person   ';
        expect(isCursorAtLineEnd(from + padded.length, from, padded)).toBe(true);
    });

    it('returns true when line has trailing spaces and cursor is right after the last word', () => {
        const padded = 'Hello #person   ';
        expect(isCursorAtLineEnd(from + 13, from, padded)).toBe(true);
    });

    it('returns false when line has trailing spaces and cursor is mid-word', () => {
        const padded = 'Hello #person   ';
        expect(isCursorAtLineEnd(from + 5, from, padded)).toBe(false);
    });

    it('works correctly when line does not start at position 0', () => {
        const lineFrom = 42;
        expect(isCursorAtLineEnd(lineFrom + len, lineFrom, text)).toBe(true);
        expect(isCursorAtLineEnd(lineFrom + len - 1, lineFrom, text)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// findMatchForEnter
// ---------------------------------------------------------------------------

const PROJECT_SETTINGS: PluginSettings = {
    convertOnEnter: true,
    entityIdentification: 'entity-type-field',
    titleField:      { enabled: true, name: 'title' },
    entityTypeField: { enabled: true, name: 'entity-type' },
    tagsField:       { enabled: true, name: 'tags' },
    createdField:    { enabled: true, name: 'created' },
    sourceNoteField: { enabled: true, name: 'source-note' },
    entityTypes: [
        { id: 'project', name: 'Project', triggerTag: '#project',
          targetFolder: 'Entities/Projects', color: '#e74c3c', enabled: true,
          frontmatterTemplate: {} },
    ],
};

function makeState(lineText: string, cursorOffset: number, allLines?: string[]) {
    const lines = allLines ?? [lineText];
    // Find which line number (1-based) this lineText corresponds to
    const lineNumber = Math.max(1, lines.indexOf(lineText) + 1);
    const lineFrom = 0;
    const lineInfo = { from: lineFrom, to: lineFrom + lineText.length, text: lineText, number: lineNumber };
    return {
        selection: { main: { head: lineFrom + cursorOffset } },
        doc: {
            lineAt: () => lineInfo,
            lines: lines.length,
            line: (n: number) => {
                const t = lines[n - 1] ?? '';
                return { from: 0, to: t.length, text: t, number: n };
            },
        },
    };
}

describe('findMatchForEnter', () => {
    it('returns null when cursor is mid-line', () => {
        const state = makeState('Redesign the onboarding flow #project', 5);
        expect(findMatchForEnter(state, PROJECT_SETTINGS)).toBeNull();
    });

    it('returns null when line has no trigger tag', () => {
        const text = 'Just a regular line';
        const state = makeState(text, text.length);
        expect(findMatchForEnter(state, PROJECT_SETTINGS)).toBeNull();
    });

    it('returns null when the matching entity type is disabled', () => {
        const settings: PluginSettings = {
            ...PROJECT_SETTINGS,
            entityTypes: [{ ...PROJECT_SETTINGS.entityTypes[0]!, enabled: false }],
        };
        const text = 'Redesign the onboarding flow #project';
        const state = makeState(text, text.length);
        expect(findMatchForEnter(state, settings)).toBeNull();
    });

    it('returns the entity type and line number when cursor is at end of matched line', () => {
        const text = 'Redesign the onboarding flow #project';
        const state = makeState(text, text.length);
        const result = findMatchForEnter(state, PROJECT_SETTINGS);
        expect(result).not.toBeNull();
        expect(result!.entityType.id).toBe('project');
        expect(result!.lineNumber).toBe(1);
    });

    it('returns null when line is inside a fenced code block', () => {
        const lines = ['```', 'Redesign the onboarding flow #project', '```'];
        const text = lines[1]!;
        const state = makeState(text, text.length, lines);
        expect(findMatchForEnter(state, PROJECT_SETTINGS)).toBeNull();
    });
});
