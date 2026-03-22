import { describe, it, expect } from 'vitest';
import { PatternMatcher, type MatchContext } from './PatternMatcher';
import type { EntityType } from '../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PERSON: EntityType = {
    id: 'person', name: 'Person', triggerTag: '#person',
    targetFolder: 'Entities/People', enabled: true, frontmatterTemplate: {},
};
const IDEA: EntityType = {
    id: 'idea', name: 'Idea', triggerTag: '#idea',
    targetFolder: 'Entities/Ideas', enabled: true, frontmatterTemplate: {},
};
const DISABLED: EntityType = {
    ...PERSON, id: 'disabled', name: 'Disabled', triggerTag: '#disabled', enabled: false,
};

const CLEAR: MatchContext = { inFencedBlock: false, inFrontmatter: false };
const IN_CODE: MatchContext = { inFencedBlock: true, inFrontmatter: false };
const IN_FM: MatchContext = { inFrontmatter: true, inFencedBlock: false };

// ---------------------------------------------------------------------------
// PatternMatcher.match
// ---------------------------------------------------------------------------

describe('PatternMatcher.match', () => {
    const pm = new PatternMatcher();

    // --- hits ---

    describe('matches', () => {
        it('tag at end of line', () => {
            expect(pm.match('Sarah attended the meeting #person', [PERSON], CLEAR)).toBe(PERSON);
        });

        it('tag at start of line', () => {
            expect(pm.match('#person Sarah', [PERSON], CLEAR)).toBe(PERSON);
        });

        it('tag mid-line', () => {
            expect(pm.match('#person attended the meeting', [PERSON], CLEAR)).toBe(PERSON);
        });

        it('tag on a list item with content', () => {
            expect(pm.match('- Met Sarah #person', [PERSON], CLEAR)).toBe(PERSON);
        });

        it('tag on a task item with content', () => {
            expect(pm.match('- [ ] Reach out to #person', [PERSON], CLEAR)).toBe(PERSON);
        });

        it('tag on a completed task item with content', () => {
            expect(pm.match('- [x] Spoke to #person', [PERSON], CLEAR)).toBe(PERSON);
        });

        it('tag on an ordered list item with content', () => {
            expect(pm.match('1. Contact #person', [PERSON], CLEAR)).toBe(PERSON);
        });

        it('returns leftmost tag when person appears before idea', () => {
            expect(pm.match('#person brainstormed an #idea', [PERSON, IDEA], CLEAR)).toBe(PERSON);
        });

        it('returns leftmost tag when idea appears before person', () => {
            expect(pm.match('new #idea for #person', [PERSON, IDEA], CLEAR)).toBe(IDEA);
        });

        it('entity type order in the array does not override line position', () => {
            // IDEA is listed first but #person appears first in the line
            expect(pm.match('#person with a new #idea', [IDEA, PERSON], CLEAR)).toBe(PERSON);
        });
    });

    // --- disabled ---

    describe('no-match — disabled entity type', () => {
        it('returns null for a disabled entity type', () => {
            expect(pm.match('test #disabled', [DISABLED], CLEAR)).toBeNull();
        });

        it('skips disabled, matches enabled', () => {
            expect(pm.match('test #disabled and #person notes', [DISABLED, PERSON], CLEAR)).toBe(PERSON);
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
            expect(pm.match(doc[3] ?? '', [PERSON], ctx)).toBe(PERSON);
        });

        it('does not match inside YAML frontmatter', () => {
            const doc = ['---', 'tags: [person]', '---', '#person real note'];
            const ctx = PatternMatcher.computeContext(doc, 1);
            expect(pm.match(doc[1] ?? '', [PERSON], ctx)).toBeNull();
        });

        it('matches content after YAML frontmatter', () => {
            const doc = ['---', 'tags: [person]', '---', 'real #person note'];
            const ctx = PatternMatcher.computeContext(doc, 3);
            expect(pm.match(doc[3] ?? '', [PERSON], ctx)).toBe(PERSON);
        });
    });
});
