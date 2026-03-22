import type { EntityType } from '../types';

export interface MatchContext {
    /** True when the line falls inside a fenced code block (``` or ~~~). */
    inFencedBlock: boolean;
    /** True when the line falls inside the YAML frontmatter at the top of the file. */
    inFrontmatter: boolean;
}

export class PatternMatcher {
    /**
     * Computes the MatchContext for the line at `lineIndex` (0-based) by
     * scanning document lines from the start. The caller (CM6 ViewPlugin) is
     * responsible for providing the full document so context can be determined
     * accurately across the entire file.
     */
    static computeContext(lines: readonly string[], lineIndex: number): MatchContext {
        let inFrontmatter = false;
        let inFencedBlock = false;
        let fenceChar = '';
        let fenceLen = 0;

        for (let i = 0; i < lineIndex; i++) {
            const line = lines[i] ?? '';

            // YAML frontmatter is only valid when the file opens with ---
            if (i === 0) {
                if (line.trim() === '---') {
                    inFrontmatter = true;
                    continue; // line 0 opened frontmatter; skip fence detection
                }
                // else: line 0 is not frontmatter — fall through to fence detection
            }

            if (inFrontmatter) {
                const t = line.trim();
                if (t === '---' || t === '...') {
                    inFrontmatter = false;
                }
                continue;
            }

            // Fenced code block tracking
            if (!inFencedBlock) {
                const m = /^(`{3,}|~{3,})/.exec(line);
                if (m?.[1] !== undefined) {
                    inFencedBlock = true;
                    fenceChar = m[1][0] ?? '';
                    fenceLen = m[1].length;
                }
            } else {
                // Closing fence: same character, at least as many, nothing else on the line
                const closeRe = new RegExp(`^${fenceChar}{${fenceLen},}\\s*$`);
                if (closeRe.test(line)) {
                    inFencedBlock = false;
                    fenceChar = '';
                    fenceLen = 0;
                }
            }
        }

        return { inFrontmatter, inFencedBlock };
    }

    /**
     * Returns the first matching enabled EntityType for the given line, or null.
     *
     * A line matches when ALL of the following are true:
     *   - context.inFencedBlock and context.inFrontmatter are both false
     *   - at least one enabled entity type's trigger tag appears as a complete tag
     *   - the line has content beyond just the trigger tag (and any list markers)
     *
     * When multiple entity types match, the one whose tag appears leftmost wins.
     */
    match(line: string, entityTypes: EntityType[], context: MatchContext): EntityType | null {
        if (context.inFencedBlock || context.inFrontmatter) return null;

        let bestMatch: EntityType | null = null;
        let bestIndex = Infinity;

        for (const entityType of entityTypes) {
            if (!entityType.enabled) continue;
            const idx = this.findTagIndex(line, entityType.triggerTag);
            if (idx !== -1 && idx < bestIndex) {
                bestMatch = entityType;
                bestIndex = idx;
            }
        }

        if (bestMatch === null) return null;
        if (!this.hasMeaningfulContent(line, bestMatch.triggerTag)) return null;

        return bestMatch;
    }

    /**
     * Returns the index of the trigger tag within the line if it appears as a
     * complete tag, or -1. A complete tag is:
     *   - preceded by start-of-string or whitespace  ((?<!\S))
     *   - not followed by a character that continues an Obsidian tag
     *     (alphanumeric, -, _, /)
     */
    private findTagIndex(line: string, tag: string): number {
        const m = this.tagRegex(tag).exec(line);
        return m !== null ? m.index : -1;
    }

    /**
     * Returns true when the line contains content beyond the trigger tag and
     * any leading markdown list / task markers.
     */
    private hasMeaningfulContent(line: string, tag: string): boolean {
        let s = line.replace(this.tagRegex(tag), '').trim();
        s = s.replace(/^\d+[.)]\s*/, '').trim();   // ordered list: "1. " or "1)"
        s = s.replace(/^[-*+]\s*/, '').trim();     // unordered list: "- ", "* ", "+ "
        s = s.replace(/^\[[ xX]\]\s*/, '').trim(); // task checkbox: "[ ] " or "[x] "
        return s.length > 0;
    }

    private tagRegex(tag: string): RegExp {
        const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // (?<!\S)  = preceded by whitespace or start-of-string (zero-width)
        // (?![…])  = not followed by a tag-continuing character
        return new RegExp(`(?<!\\S)${escaped}(?![a-zA-Z0-9_\\-\\/])`, 'g');
    }
}
