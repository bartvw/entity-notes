import { describe, it, expect } from 'vitest';
import { PatternMatcher, type MatchContext, type MatchResult } from './PatternMatcher';
import type { EntityType } from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PERSON: EntityType = {
    id: 'person', name: 'Person', triggerTag: '#person',
    targetFolder: 'Entities/People', color: '#4a90d9', enabled: true,
    frontmatterTemplate: {},
};
const IDEA: EntityType = {
    id: 'idea', name: 'Idea', triggerTag: '#idea',
    targetFolder: 'Entities/Ideas', color: '#f5a623', enabled: true,
    frontmatterTemplate: {},
};
const DISABLED: EntityType = {
    ...PERSON, id: 'disabled', name: 'Disabled', triggerTag: '#disabled', enabled: false,
};

const CLEAR: MatchContext = { inFencedBlock: false, inFrontmatter: false };
const IN_CODE: MatchContext = { inFencedBlock: true, inFrontmatter: false };
const IN_FM: MatchContext = { inFrontmatter: true, inFencedBlock: false };

/** Shorthand: full-line result for an entity type. */
const fullLine = (entityType: EntityType): MatchResult =>
    ({ case: 'full-line', entityType });

/** Shorthand: unresolved-link result for an entity type and link text. */
const unresolvedLink = (entityType: EntityType, linkText: string): MatchResult =>
    ({ case: 'unresolved-link', entityType, linkText });

/** Always reports the link as unresolved (nothing exists in the vault). */
const noneResolved = () => false;

/** Always reports the link as resolved (everything exists in the vault). */
const allResolved = () => true;

// ---------------------------------------------------------------------------
// PatternMatcher.match — Case 2 (full-line)
// ---------------------------------------------------------------------------

describe('PatternMatcher.match — Case 2 (full-line)', () => {
    const pm = new PatternMatcher();

    // --- hits ---

    describe('matches', () => {
        it('tag at end of line', () => {
            expect(pm.match('Sarah attended the meeting #person', [PERSON], CLEAR)).toEqual(fullLine(PERSON));
        });

        it('tag at start of line', () => {
            expect(pm.match('#person Sarah', [PERSON], CLEAR)).toEqual(fullLine(PERSON));
        });

        it('tag mid-line', () => {
            expect(pm.match('#person attended the meeting', [PERSON], CLEAR)).toEqual(fullLine(PERSON));
        });

        it('tag on a list item with content', () => {
            expect(pm.match('- Met Sarah #person', [PERSON], CLEAR)).toEqual(fullLine(PERSON));
        });

        it('tag on a task item with content', () => {
            expect(pm.match('- [ ] Reach out to #person', [PERSON], CLEAR)).toEqual(fullLine(PERSON));
        });

        it('tag on a completed task item with content', () => {
            expect(pm.match('- [x] Spoke to #person', [PERSON], CLEAR)).toEqual(fullLine(PERSON));
        });

        it('tag on an ordered list item with content', () => {
            expect(pm.match('1. Contact #person', [PERSON], CLEAR)).toEqual(fullLine(PERSON));
        });

        it('returns leftmost tag when person appears before idea', () => {
            expect(pm.match('#person brainstormed an #idea', [PERSON, IDEA], CLEAR)).toEqual(fullLine(PERSON));
        });

        it('returns leftmost tag when idea appears before person', () => {
            expect(pm.match('new #idea for #person', [PERSON, IDEA], CLEAR)).toEqual(fullLine(IDEA));
        });

        it('entity type order in the array does not override line position', () => {
            // IDEA is listed first but #person appears first in the line
            expect(pm.match('#person with a new #idea', [IDEA, PERSON], CLEAR)).toEqual(fullLine(PERSON));
        });

        it('resolved wikilink followed by tag returns null — no meaningful plain-text content', () => {
            expect(pm.match('[[Sarah]] #person', [PERSON], CLEAR, allResolved)).toBeNull();
        });

        it('returns null when isLinkResolved is omitted — wikilink-only line has no title', () => {
            expect(pm.match('[[Sarah]] #person', [PERSON], CLEAR)).toBeNull();
        });

        it('line with plain text plus an embedded wikilink matches as full-line', () => {
            expect(pm.match('Met [[Sarah]] #person', [PERSON], CLEAR, allResolved)).toEqual(fullLine(PERSON));
        });

        it('resolved wikilink with only a timestamp prefix returns null — timestamp is not meaningful content', () => {
            // "- [ ] - 12:30 - [[some text]] #idea" where the link is resolved:
            // the only surrounding content is a timestamp, which is not a useful entity title
            expect(pm.match('- [ ] - 12:30 - [[some text]] #idea', [IDEA], CLEAR, allResolved)).toBeNull();
        });

        it('unresolved wikilink after timestamp in task item is detected as Case 1', () => {
            // Even with a timestamp prefix, an unresolved wikilink must trigger Case 1
            expect(pm.match('- [ ] - 12:30 - [[some text]] #idea', [IDEA], CLEAR, noneResolved))
                .toEqual(unresolvedLink(IDEA, 'some text'));
        });
    });

    // --- disabled ---

    describe('no-match — disabled entity type', () => {
        it('returns null for a disabled entity type', () => {
            expect(pm.match('test #disabled', [DISABLED], CLEAR)).toBeNull();
        });

        it('skips disabled, matches enabled', () => {
            expect(pm.match('test #disabled and #person notes', [DISABLED, PERSON], CLEAR)).toEqual(fullLine(PERSON));
        });
    });

    // --- block context ---

    describe('no-match — block context', () => {
        it('returns null inside a fenced code block', () => {
            expect(pm.match('example #person', [PERSON], IN_CODE)).toBeNull();
        });

        it('returns null inside YAML frontmatter', () => {
            expect(pm.match('tags: [person]', [PERSON], IN_FM)).toBeNull();
        });
    });

    // --- only tag (no title content) ---

    describe('no-match — line has no content beyond the tag', () => {
        it('line is only the trigger tag', () => {
            expect(pm.match('#person', [PERSON], CLEAR)).toBeNull();
        });

        it('line is the tag with surrounding whitespace', () => {
            expect(pm.match('  #person  ', [PERSON], CLEAR)).toBeNull();
        });

        it('unordered list marker + tag only', () => {
            expect(pm.match('- #person', [PERSON], CLEAR)).toBeNull();
        });

        it('task checkbox + tag only', () => {
            expect(pm.match('- [ ] #person', [PERSON], CLEAR)).toBeNull();
        });

        it('completed task checkbox + tag only', () => {
            expect(pm.match('- [x] #person', [PERSON], CLEAR)).toBeNull();
        });

        it('ordered list marker + tag only', () => {
            expect(pm.match('1. #person', [PERSON], CLEAR)).toBeNull();
        });

        it('ordered list marker with paren + tag only', () => {
            expect(pm.match('1) #person', [PERSON], CLEAR)).toBeNull();
        });
    });

    // --- tag boundary ---

    describe('no-match — tag is a prefix of a longer tag', () => {
        it('does not match #person inside #personality', () => {
            expect(pm.match('#personality is important', [PERSON], CLEAR)).toBeNull();
        });

        it('does not match #person in a hyphenated tag #person-name', () => {
            expect(pm.match('#person-name', [PERSON], CLEAR)).toBeNull();
        });

        it('does not match #person in a nested tag path #person/work', () => {
            expect(pm.match('#person/work', [PERSON], CLEAR)).toBeNull();
        });

        it('does not match #person in #person_role (underscore continues tag)', () => {
            expect(pm.match('#person_role', [PERSON], CLEAR)).toBeNull();
        });
    });

    // --- no tag present ---

    describe('no-match — tag absent', () => {
        it('returns null when no tag is present', () => {
            expect(pm.match('just some text', [PERSON], CLEAR)).toBeNull();
        });

        it('returns null with an empty entity types list', () => {
            expect(pm.match('text #person', [], CLEAR)).toBeNull();
        });

        it('returns null for an empty line', () => {
            expect(pm.match('', [PERSON], CLEAR)).toBeNull();
        });
    });
});

// ---------------------------------------------------------------------------
// PatternMatcher.match — Case 1 (unresolved-link)
// ---------------------------------------------------------------------------

describe('PatternMatcher.match — Case 1 (unresolved-link)', () => {
    const pm = new PatternMatcher();

    describe('matches', () => {
        it('bare wikilink followed by tag', () => {
            expect(pm.match('[[Sarah]] #person', [PERSON], CLEAR, noneResolved))
                .toEqual(unresolvedLink(PERSON, 'Sarah'));
        });

        it('wikilink with multi-word link text', () => {
            expect(pm.match('[[Project Alpha]] #idea', [IDEA], CLEAR, noneResolved))
                .toEqual(unresolvedLink(IDEA, 'Project Alpha'));
        });

        it('wikilink on a list item', () => {
            expect(pm.match('- [[Sarah]] #person', [PERSON], CLEAR, noneResolved))
                .toEqual(unresolvedLink(PERSON, 'Sarah'));
        });

        it('wikilink on an indented list item', () => {
            expect(pm.match('  - [[Sarah]] #person', [PERSON], CLEAR, noneResolved))
                .toEqual(unresolvedLink(PERSON, 'Sarah'));
        });

        it('wikilink preceded by other text on the line', () => {
            // Spec: other content before/after is left unchanged; Case 1 still applies
            expect(pm.match('Build [[Project Alpha]] #project', [IDEA, PERSON, { ...PERSON, id: 'project', triggerTag: '#project' } as EntityType], CLEAR, noneResolved))
                .toEqual(unresolvedLink(expect.objectContaining({ id: 'project' }) as EntityType, 'Project Alpha'));
        });

        it('multiple spaces between ]] and tag', () => {
            expect(pm.match('[[Sarah]]   #person', [PERSON], CLEAR, noneResolved))
                .toEqual(unresolvedLink(PERSON, 'Sarah'));
        });

        it('leftmost tag wins when multiple tags are present and first is directly after wikilink', () => {
            expect(pm.match('[[Note]] #person other #idea', [PERSON, IDEA], CLEAR, noneResolved))
                .toEqual(unresolvedLink(PERSON, 'Note'));
        });

        it('tag after second wikilink when first wikilink has no tag', () => {
            expect(pm.match('[[Alice]] [[Bob]] #person', [PERSON], CLEAR, noneResolved))
                .toEqual(unresolvedLink(PERSON, 'Bob'));
        });

        it('two wikilink+tag pairs — leftmost tag wins, identifies correct wikilink', () => {
            expect(pm.match('[[Alice]] #person [[Bob]] #idea', [PERSON, IDEA], CLEAR, noneResolved))
                .toEqual(unresolvedLink(PERSON, 'Alice'));
        });

        it('resolved first wikilink + unresolved second wikilink + tag', () => {
            const resolver = (text: string) => text === 'Alice'; // Alice exists, Bob does not
            expect(pm.match('[[Alice]] [[Bob]] #person', [PERSON], CLEAR, resolver))
                .toEqual(unresolvedLink(PERSON, 'Bob'));
        });

        it('resolved wikilink+tag followed by unresolved wikilink+same tag', () => {
            // [[Alice]] #person is resolved → should not break; [[Bob]] #person is unresolved → Case 1
            const resolver = (text: string) => text === 'Alice';
            expect(pm.match('[[Alice]] #person [[Bob]] #person', [PERSON], CLEAR, resolver))
                .toEqual(unresolvedLink(PERSON, 'Bob'));
        });

        it('both wikilinks resolved + tag returns null — no plain-text content', () => {
            expect(pm.match('[[Alice]] [[Bob]] #person', [PERSON], CLEAR, allResolved))
                .toBeNull();
        });
    });

    describe('no-match', () => {
        it('returns null when link is resolved — no plain-text title available', () => {
            expect(pm.match('[[Sarah]] #person', [PERSON], CLEAR, allResolved)).toBeNull();
        });

        it('returns null for disabled entity type', () => {
            expect(pm.match('[[Sarah]] #disabled', [DISABLED], CLEAR, noneResolved)).toBeNull();
        });

        it('returns null inside a fenced code block', () => {
            expect(pm.match('[[Sarah]] #person', [PERSON], IN_CODE, noneResolved)).toBeNull();
        });

        it('returns null inside YAML frontmatter', () => {
            expect(pm.match('[[Sarah]] #person', [PERSON], IN_FM, noneResolved)).toBeNull();
        });

        it('tag directly adjacent to ]] without space is not a valid tag boundary', () => {
            // #person must be preceded by whitespace per tag regex — no match at all
            expect(pm.match('[[Sarah]]#person', [PERSON], CLEAR, noneResolved)).toBeNull();
        });

        it('tag follows wikilink but is not the first token after ]]', () => {
            // "extra" text separates ]] from #person — falls through to Case 2 full-line match
            expect(pm.match('[[Sarah]] extra #person', [PERSON], CLEAR, noneResolved))
                .toEqual(fullLine(PERSON));
        });
    });

    describe('link text extraction', () => {
        it('extracts plain link text', () => {
            const result = pm.match('[[My Note]] #idea', [IDEA], CLEAR, noneResolved) as MatchResult & { case: 'unresolved-link' };
            expect(result.linkText).toBe('My Note');
        });

        it('extracts the target from an aliased link (part before |)', () => {
            // [[Target|Alias]] — vault lookup and note title use "Target"
            const result = pm.match('[[Target|Alias]] #person', [PERSON], CLEAR, noneResolved) as MatchResult & { case: 'unresolved-link' };
            expect(result.linkText).toBe('Target');
        });
    });
});

// ---------------------------------------------------------------------------
// PatternMatcher.computeContext
// ---------------------------------------------------------------------------

describe('PatternMatcher.computeContext', () => {
    describe('plain document (no blocks)', () => {
        const doc = ['First line', 'Second #person', 'Third'];

        it('any line in a plain document has clear context', () => {
            expect(PatternMatcher.computeContext(doc, 0)).toEqual(CLEAR);
            expect(PatternMatcher.computeContext(doc, 1)).toEqual(CLEAR);
            expect(PatternMatcher.computeContext(doc, 2)).toEqual(CLEAR);
        });
    });

    describe('YAML frontmatter', () => {
        const doc = [
            '---',             // 0 — opening delimiter
            'title: My Note',  // 1 — inside FM
            'tags: [person]',  // 2 — inside FM
            '---',             // 3 — closing delimiter (still considered inside when computing context for it)
            'Content #person', // 4 — after FM
        ];

        it('line 0 (the opening ---) is NOT considered inside frontmatter', () => {
            expect(PatternMatcher.computeContext(doc, 0)).toEqual(CLEAR);
        });

        it('lines inside frontmatter are in frontmatter', () => {
            expect(PatternMatcher.computeContext(doc, 1)).toEqual(IN_FM);
            expect(PatternMatcher.computeContext(doc, 2)).toEqual(IN_FM);
        });

        it('the closing --- is treated as inside frontmatter', () => {
            // We have not yet processed it when computing context for it
            expect(PatternMatcher.computeContext(doc, 3)).toEqual(IN_FM);
        });

        it('lines after the closing --- are not inside frontmatter', () => {
            expect(PatternMatcher.computeContext(doc, 4)).toEqual(CLEAR);
        });

        it('frontmatter only opens when line 0 is ---', () => {
            const notFm = ['Some text', '---', 'not frontmatter', '---', 'normal'];
            expect(PatternMatcher.computeContext(notFm, 2)).toEqual(CLEAR);
            expect(PatternMatcher.computeContext(notFm, 4)).toEqual(CLEAR);
        });

        it('frontmatter can be closed with ...', () => {
            const withDots = ['---', 'key: value', '...', 'Content'];
            expect(PatternMatcher.computeContext(withDots, 2)).toEqual(IN_FM);   // ... line itself
            expect(PatternMatcher.computeContext(withDots, 3)).toEqual(CLEAR);   // after ...
        });
    });

    describe('fenced code blocks — backtick', () => {
        const doc = [
            'Before block',     // 0
            '```typescript',    // 1 — opening fence
            'const x = 1;',    // 2 — inside block
            '```',             // 3 — closing fence (still inside when computing for it)
            'After block',     // 4
        ];

        it('line before the block is not in block', () => {
            expect(PatternMatcher.computeContext(doc, 0)).toEqual(CLEAR);
        });

        it('the opening fence line is NOT inside the block', () => {
            expect(PatternMatcher.computeContext(doc, 1)).toEqual(CLEAR);
        });

        it('lines inside the block are in block', () => {
            expect(PatternMatcher.computeContext(doc, 2)).toEqual(IN_CODE);
        });

        it('the closing fence line is treated as inside the block', () => {
            expect(PatternMatcher.computeContext(doc, 3)).toEqual(IN_CODE);
        });

        it('line after closing fence is not in block', () => {
            expect(PatternMatcher.computeContext(doc, 4)).toEqual(CLEAR);
        });

        it('opening fence with a language tag still opens the block', () => {
            const withLang = ['```typescript', 'code', '```', 'text'];
            expect(PatternMatcher.computeContext(withLang, 1)).toEqual(IN_CODE);
        });
    });

    describe('fenced code blocks — tilde', () => {
        const doc = ['~~~', 'content', '~~~', 'After'];

        it('lines inside a tilde block are in block', () => {
            expect(PatternMatcher.computeContext(doc, 1)).toEqual(IN_CODE);
        });

        it('line after closing tilde fence is not in block', () => {
            expect(PatternMatcher.computeContext(doc, 3)).toEqual(CLEAR);
        });
    });

    describe('multiple code blocks', () => {
        const doc = [
            'text',      // 0
            '```',       // 1
            'code1',     // 2
            '```',       // 3
            'between',   // 4
            '```',       // 5
            'code2',     // 6
            '```',       // 7
            'end',       // 8
        ];

        it('line between blocks is not in block', () => {
            expect(PatternMatcher.computeContext(doc, 4)).toEqual(CLEAR);
        });

        it('lines in the second block are in block', () => {
            expect(PatternMatcher.computeContext(doc, 6)).toEqual(IN_CODE);
        });

        it('line after second block is not in block', () => {
            expect(PatternMatcher.computeContext(doc, 8)).toEqual(CLEAR);
        });
    });

    describe('code block after frontmatter', () => {
        const doc = [
            '---',              // 0
            'title: Note',      // 1 — FM
            '---',              // 2 — closing FM (inside when computing for it)
            'Some text',        // 3
            '```',              // 4 — opens code block
            'code #person',     // 5 — inside block
            '```',              // 6 — closes block (inside when computing for it)
            '#person note',     // 7 — clear
        ];

        it('frontmatter lines are in frontmatter', () => {
            expect(PatternMatcher.computeContext(doc, 1)).toEqual(IN_FM);
        });

        it('text after frontmatter is clear', () => {
            expect(PatternMatcher.computeContext(doc, 3)).toEqual(CLEAR);
        });

        it('line inside code block is in block', () => {
            expect(PatternMatcher.computeContext(doc, 5)).toEqual(IN_CODE);
        });

        it('line after code block is clear', () => {
            expect(PatternMatcher.computeContext(doc, 7)).toEqual(CLEAR);
        });
    });

    // --- integration: computeContext + match ---

    describe('integration: computeContext feeds match', () => {
        const pm = new PatternMatcher();

        it('does not match inside a fenced code block', () => {
            const doc = ['```', 'example #person', '```', 'real #person note'];
            const ctx = PatternMatcher.computeContext(doc, 1);
            expect(pm.match(doc[1] ?? '', [PERSON], ctx)).toBeNull();
        });

        it('matches after a fenced code block', () => {
            const doc = ['```', 'example #person', '```', 'real #person note'];
            const ctx = PatternMatcher.computeContext(doc, 3);
            expect(pm.match(doc[3] ?? '', [PERSON], ctx)).toEqual(fullLine(PERSON));
        });

        it('does not match inside YAML frontmatter', () => {
            const doc = ['---', 'tags: [person]', '---', '#person real note'];
            const ctx = PatternMatcher.computeContext(doc, 1);
            expect(pm.match(doc[1] ?? '', [PERSON], ctx)).toBeNull();
        });

        it('matches content after YAML frontmatter', () => {
            const doc = ['---', 'tags: [person]', '---', 'real #person note'];
            const ctx = PatternMatcher.computeContext(doc, 3);
            expect(pm.match(doc[3] ?? '', [PERSON], ctx)).toEqual(fullLine(PERSON));
        });
    });
});

// ---------------------------------------------------------------------------
// PatternMatcher.matchAll
// ---------------------------------------------------------------------------

describe('PatternMatcher.matchAll', () => {
    const pm = new PatternMatcher();

    it('returns [] inside a fenced code block', () => {
        expect(pm.matchAll('Hello #person', [PERSON], IN_CODE)).toEqual([]);
    });

    it('returns [] inside frontmatter', () => {
        expect(pm.matchAll('title: #person', [PERSON], IN_FM)).toEqual([]);
    });

    it('returns [] when no entity types are enabled', () => {
        expect(pm.matchAll('Hello #disabled', [DISABLED], CLEAR)).toEqual([]);
    });

    it('returns [] when line has no trigger tag', () => {
        expect(pm.matchAll('Just a regular line', [PERSON], CLEAR)).toEqual([]);
    });

    // Case 2 ----------------------------------------------------------------

    it('returns one full-line entry for a plain matched line', () => {
        const results = pm.matchAll('Meet Alice #person', [PERSON], CLEAR);
        expect(results).toHaveLength(1);
        expect(results[0]!.matchResult).toEqual(fullLine(PERSON));
    });

    it('tagEnd points just after the trigger tag for Case 2', () => {
        const line = 'Meet Alice #person';
        const results = pm.matchAll(line, [PERSON], CLEAR);
        expect(results[0]!.tagEnd).toBe(line.indexOf('#person') + '#person'.length);
    });

    it('returns [] for Case 2 when line has no meaningful content', () => {
        expect(pm.matchAll('#person', [PERSON], CLEAR)).toEqual([]);
    });

    // Case 1 — single -------------------------------------------------------

    it('returns one unresolved-link entry for a single unresolved wikilink', () => {
        const results = pm.matchAll('[[Alice]] #person', [PERSON], CLEAR, noneResolved);
        expect(results).toHaveLength(1);
        expect(results[0]!.matchResult).toEqual(unresolvedLink(PERSON, 'Alice'));
    });

    it('tagEnd points just after the trigger tag for Case 1', () => {
        const line = '[[Alice]] #person';
        const results = pm.matchAll(line, [PERSON], CLEAR, noneResolved);
        expect(results[0]!.tagEnd).toBe(line.indexOf('#person') + '#person'.length);
    });

    it('returns [] for a resolved wikilink with tag and no other content', () => {
        expect(pm.matchAll('[[Alice]] #person', [PERSON], CLEAR, allResolved)).toEqual([]);
    });

    // Case 1 — multiple wikilinks on same line -------------------------------

    it('returns two entries for two unresolved wikilinks with tags', () => {
        const line = '[[Alice]] #person [[Bob]] #person';
        const results = pm.matchAll(line, [PERSON], CLEAR, noneResolved);
        expect(results).toHaveLength(2);
        expect(results[0]!.matchResult).toEqual(unresolvedLink(PERSON, 'Alice'));
        expect(results[1]!.matchResult).toEqual(unresolvedLink(PERSON, 'Bob'));
    });

    it('returns two entries for two wikilinks with different entity types', () => {
        const line = '[[Alice]] #person [[My Idea]] #idea';
        const results = pm.matchAll(line, [PERSON, IDEA], CLEAR, noneResolved);
        expect(results).toHaveLength(2);
        expect(results[0]!.matchResult).toEqual(unresolvedLink(PERSON, 'Alice'));
        expect(results[1]!.matchResult).toEqual(unresolvedLink(IDEA, 'My Idea'));
    });

    it('skips resolved wikilinks and only returns entries for unresolved ones', () => {
        const line = '[[Alice]] #person [[Bob]] #person';
        const resolver = (text: string) => text === 'Alice'; // Alice resolved, Bob not
        const results = pm.matchAll(line, [PERSON], CLEAR, resolver);
        expect(results).toHaveLength(1);
        expect(results[0]!.matchResult).toEqual(unresolvedLink(PERSON, 'Bob'));
    });

    it('tagEnds are correct for two Case 1 matches', () => {
        const line = '[[Alice]] #person [[Bob]] #person';
        const results = pm.matchAll(line, [PERSON], CLEAR, noneResolved);
        // first tag ends after the first '#person'
        expect(results[0]!.tagEnd).toBe(line.indexOf('#person') + '#person'.length);
        // second tag ends after the second '#person'
        expect(results[1]!.tagEnd).toBe(line.lastIndexOf('#person') + '#person'.length);
    });
});
