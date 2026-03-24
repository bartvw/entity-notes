import type { EntityType } from '../types';

export interface MatchContext {
    /** True when the line falls inside a fenced code block (``` or ~~~). */
    inFencedBlock: boolean;
    /** True when the line falls inside the YAML frontmatter at the top of the file. */
    inFrontmatter: boolean;
}

export type MatchResult =
    /** Case 2: tag on a line without a preceding unresolved wikilink. The full line is converted. */
    | { case: 'full-line'; entityType: EntityType }
    /** Case 1: tag directly after an unresolved wikilink. Only that wikilink is converted. */
    | { case: 'unresolved-link'; entityType: EntityType; linkText: string };

export interface PositionedMatch {
    matchResult: MatchResult;
    /** Character index in the line string immediately after the trigger tag. */
    tagEnd: number;
}

/** Matches `[[Target]]` or `[[Target|Alias]]` directly before a non-whitespace character. */
const UNRESOLVED_LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?]]\s*(?=\S)/g;

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
     * Returns a MatchResult for the given line, or null.
     *
     * A line matches when ALL of the following are true:
     *   - context.inFencedBlock and context.inFrontmatter are both false
     *   - at least one enabled entity type's trigger tag appears as a complete tag
     *   - the line has content beyond just the trigger tag (and any list markers)
     *
     * When multiple entity types match, the one whose tag appears leftmost wins.
     *
     * **Case 1 (unresolved-link):** when the winning tag appears directly after an
     * unresolved wikilink (i.e. `isLinkResolved` returns false for that link text),
     * returns `{ case: 'unresolved-link', entityType, linkText }`.
     *
     * **Case 2 (full-line):** all other matches return `{ case: 'full-line', entityType }`.
     *
     * `isLinkResolved` defaults to `() => true` (all links treated as resolved), so
     * Case 1 never triggers unless an explicit resolver is provided.
     */
    match(
        line: string,
        entityTypes: EntityType[],
        context: MatchContext,
        isLinkResolved: (linkText: string) => boolean = () => true,
    ): MatchResult | null {
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

        // Case 1: winning tag directly follows an unresolved wikilink.
        // Scan every [[...]] on the line; the first one whose immediately
        // following non-whitespace token is the winning tag, and whose link
        // does not resolve, produces a Case 1 result.
        UNRESOLVED_LINK_RE.lastIndex = 0;
        let linkMatch: RegExpExecArray | null;
        while ((linkMatch = UNRESOLVED_LINK_RE.exec(line)) !== null) {
            const linkEnd = linkMatch.index + linkMatch[0].length;
            if (this.findTagIndex(line.slice(linkEnd), bestMatch.triggerTag) === 0) {
                const linkText = linkMatch[1] ?? '';
                if (!isLinkResolved(linkText)) {
                    return { case: 'unresolved-link', entityType: bestMatch, linkText };
                }
                // Link is resolved — this tag occurrence is accounted for; keep scanning
                // in case a later wikilink on the same line is followed by the same tag
                // and is unresolved (e.g. [[Alice]] #person [[Bob]] #person, Alice resolved).
            }
        }

        if (!this.hasMeaningfulContent(line, bestMatch.triggerTag)) return null;

        return { case: 'full-line', entityType: bestMatch };
    }

    /**
     * Returns all conversion opportunities on the line as `PositionedMatch` entries,
     * each carrying the `MatchResult` and the character index immediately after the tag.
     *
     * **Case 1 (multiple possible):** every unresolved wikilink that is directly followed
     * by a known trigger tag produces one entry. If any Case 1 entries are found, they are
     * returned and Case 2 is not evaluated.
     *
     * **Case 2 (at most one):** when no Case 1 entries exist, falls back to the single
     * full-line match logic (leftmost tag wins).
     */
    matchAll(
        line: string,
        entityTypes: EntityType[],
        context: MatchContext,
        isLinkResolved: (linkText: string) => boolean = () => true,
    ): PositionedMatch[] {
        if (context.inFencedBlock || context.inFrontmatter) return [];

        const enabledTypes = entityTypes.filter(et => et.enabled);
        if (enabledTypes.length === 0) return [];

        // Case 1: collect a result for each unresolved wikilink immediately followed by a tag.
        const results: PositionedMatch[] = [];
        UNRESOLVED_LINK_RE.lastIndex = 0;
        let linkMatch: RegExpExecArray | null;
        while ((linkMatch = UNRESOLVED_LINK_RE.exec(line)) !== null) {
            const linkEnd = linkMatch.index + linkMatch[0].length;
            const rest = line.slice(linkEnd);
            for (const entityType of enabledTypes) {
                if (this.findTagIndex(rest, entityType.triggerTag) === 0) {
                    const linkText = linkMatch[1] ?? '';
                    if (!isLinkResolved(linkText)) {
                        results.push({
                            matchResult: { case: 'unresolved-link', entityType, linkText },
                            tagEnd: linkEnd + entityType.triggerTag.length,
                        });
                    }
                    break; // at most one tag per wikilink
                }
            }
        }
        if (results.length > 0) return results;

        // Case 2: no unresolved-link matches — try single full-line match.
        let bestMatch: EntityType | null = null;
        let bestIndex = Infinity;
        for (const entityType of enabledTypes) {
            const idx = this.findTagIndex(line, entityType.triggerTag);
            if (idx !== -1 && idx < bestIndex) {
                bestMatch = entityType;
                bestIndex = idx;
            }
        }
        if (bestMatch === null) return [];
        if (!this.hasMeaningfulContent(line, bestMatch.triggerTag)) return [];
        return [{
            matchResult: { case: 'full-line', entityType: bestMatch },
            tagEnd: bestIndex + bestMatch.triggerTag.length,
        }];
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
     * Returns true when the line contains content beyond the trigger tag,
     * any leading markdown list / task markers, and any wikilinks.
     * A line whose only non-tag content is wikilinks (e.g. `[[Note]] #tag`)
     * does not have a meaningful plain-text title for Case 2.
     */
    private hasMeaningfulContent(line: string, tag: string): boolean {
        let s = line.replace(this.tagRegex(tag), '').trim();
        s = s.replace(/\[\[[^\]]*\]\]/g, '').trim(); // strip wikilinks
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
