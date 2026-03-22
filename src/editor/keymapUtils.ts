/**
 * Returns true when the cursor is at or after the last non-whitespace
 * character of the line — the condition required for Convert on Enter.
 */
export function isCursorAtLineEnd(cursor: number, lineFrom: number, lineText: string): boolean {
    return cursor >= lineFrom + lineText.trimEnd().length;
}
