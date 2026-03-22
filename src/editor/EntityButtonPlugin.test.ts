import { describe, it, expect } from 'vitest';
import { isCursorAtLineEnd } from './keymapUtils';

describe('isCursorAtLineEnd', () => {
    const text = 'Hello #person';
    const from = 0;
    const len  = text.length; // 13

    it('returns true when cursor is at the very end of the line', () => {
        expect(isCursorAtLineEnd(from + len, from, text)).toBe(true);
    });

    it('returns true when cursor is one character before the end', () => {
        // last non-whitespace is at index 12; cursor at 12 is still >= trimEnd length (13)? No —
        // trimEnd().length === 13 so cursor must be >= 13. Position 12 is one short.
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
        // trimEnd().length === 13; cursor at 13 is >= 13
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
