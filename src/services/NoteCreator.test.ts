import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NoteCreator } from './NoteCreator';
import type { EntityType } from '../types';
import type { App, TFile } from 'obsidian';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PERSON: EntityType = {
    id: 'person', name: 'Person', triggerTag: '#person',
    targetFolder: 'Entities/People', color: '#4a90d9', enabled: true, frontmatterTemplate: {},
};

const PROJECT: EntityType = {
    id: 'project', name: 'Project', triggerTag: '#project',
    targetFolder: 'Entities/Projects', color: '#e74c3c', enabled: true, frontmatterTemplate: {},
};

const FIXED_DATE = '2026-03-22';

// ---------------------------------------------------------------------------
// NoteCreator.deriveTitle
// ---------------------------------------------------------------------------

describe('NoteCreator.deriveTitle', () => {
    it('strips the trigger tag from the end of the line', () => {
        expect(NoteCreator.deriveTitle('Sarah #person', '#person')).toBe('Sarah');
    });

    it('strips the trigger tag from the start of the line', () => {
        expect(NoteCreator.deriveTitle('#person Sarah', '#person')).toBe('Sarah');
    });

    it('strips the trigger tag from the middle of the line', () => {
        expect(NoteCreator.deriveTitle('Meet #person today', '#person')).toBe('Meet today');
    });

    it('normalises multiple spaces left by tag removal', () => {
        expect(NoteCreator.deriveTitle('a  #person  b', '#person')).toBe('a b');
    });

    it('strips a leading unordered list marker', () => {
        expect(NoteCreator.deriveTitle('- Met Sarah #person', '#person')).toBe('Met Sarah');
    });

    it('strips a leading asterisk list marker', () => {
        expect(NoteCreator.deriveTitle('* Met Sarah #person', '#person')).toBe('Met Sarah');
    });

    it('strips a leading task checkbox (unchecked)', () => {
        expect(NoteCreator.deriveTitle('- [ ] Reach out #person', '#person')).toBe('Reach out');
    });

    it('strips a leading task checkbox (checked)', () => {
        expect(NoteCreator.deriveTitle('- [x] Spoke to #person', '#person')).toBe('Spoke to');
    });

    it('strips a leading ordered list marker (period)', () => {
        expect(NoteCreator.deriveTitle('1. Contact #person', '#person')).toBe('Contact');
    });

    it('strips a leading ordered list marker (paren)', () => {
        expect(NoteCreator.deriveTitle('1) Contact #person', '#person')).toBe('Contact');
    });

    it('does not strip a tag that is a prefix of a longer tag', () => {
        // #personality should not be mistaken for #person + content
        expect(NoteCreator.deriveTitle('#personality trait', '#person')).toBe('#personality trait');
    });

    it('applies filename sanitization', () => {
        expect(NoteCreator.deriveTitle('Meeting: Q1 "plan" #person', '#person'))
            .toBe('Meeting Q1 plan');
    });
});

// ---------------------------------------------------------------------------
// NoteCreator.sanitizeFilename
// ---------------------------------------------------------------------------

describe('NoteCreator.sanitizeFilename', () => {
    it('removes *', () => expect(NoteCreator.sanitizeFilename('a*b')).toBe('ab'));
    it('removes "', () => expect(NoteCreator.sanitizeFilename('a"b')).toBe('ab'));
    it('removes \\', () => expect(NoteCreator.sanitizeFilename('a\\b')).toBe('ab'));
    it('removes /', () => expect(NoteCreator.sanitizeFilename('a/b')).toBe('ab'));
    it('removes <', () => expect(NoteCreator.sanitizeFilename('a<b')).toBe('ab'));
    it('removes >', () => expect(NoteCreator.sanitizeFilename('a>b')).toBe('ab'));
    it('removes :', () => expect(NoteCreator.sanitizeFilename('a:b')).toBe('ab'));
    it('removes |', () => expect(NoteCreator.sanitizeFilename('a|b')).toBe('ab'));
    it('removes ?', () => expect(NoteCreator.sanitizeFilename('a?b')).toBe('ab'));
    it('removes multiple illegal chars', () => {
        expect(NoteCreator.sanitizeFilename('a*"b\\/<>:|?c')).toBe('abc');
    });
    it('leaves a clean title unchanged', () => {
        expect(NoteCreator.sanitizeFilename('Redesign the onboarding flow')).toBe('Redesign the onboarding flow');
    });
    it('trims leading/trailing whitespace after removal', () => {
        expect(NoteCreator.sanitizeFilename(': title')).toBe('title');
    });
});

// ---------------------------------------------------------------------------
// NoteCreator.buildModifiedLine
// ---------------------------------------------------------------------------

describe('NoteCreator.buildModifiedLine', () => {
    it('replaces the entire line with just the wikilink', () => {
        expect(NoteCreator.buildModifiedLine('Redesign the onboarding flow #project', '#project', 'Redesign the onboarding flow'))
            .toBe('[[Redesign the onboarding flow]]');
    });

    it('replaces the entire line regardless of tag position', () => {
        expect(NoteCreator.buildModifiedLine('#project Redesign the onboarding flow', '#project', 'Redesign the onboarding flow'))
            .toBe('[[Redesign the onboarding flow]]');
    });

    it('replaces entire line with mid-line tag', () => {
        expect(NoteCreator.buildModifiedLine('Redesign #project the flow', '#project', 'Redesign the flow'))
            .toBe('[[Redesign the flow]]');
    });

    it('replaces entire line with multiple spaces', () => {
        expect(NoteCreator.buildModifiedLine('a  #person  b', '#person', 'a b'))
            .toBe('[[a b]]');
    });

    it('uses the collision-resolved title in the wikilink', () => {
        expect(NoteCreator.buildModifiedLine('Sarah #person', '#person', 'Sarah 2'))
            .toBe('[[Sarah 2]]');
    });

    it('preserves a dash list marker', () => {
        expect(NoteCreator.buildModifiedLine('- Met Sarah #person', '#person', 'Met Sarah'))
            .toBe('- [[Met Sarah]]');
    });

    it('preserves an asterisk list marker', () => {
        expect(NoteCreator.buildModifiedLine('* Task item #task', '#task', 'Task item'))
            .toBe('* [[Task item]]');
    });

    it('preserves a numbered list marker', () => {
        expect(NoteCreator.buildModifiedLine('1. Buy milk #task', '#task', 'Buy milk'))
            .toBe('1. [[Buy milk]]');
    });
});

// ---------------------------------------------------------------------------
// NoteCreator.buildFrontmatter
// ---------------------------------------------------------------------------

describe('NoteCreator.buildFrontmatter', () => {
    it('produces the standard frontmatter fields in order', () => {
        const fm = NoteCreator.buildFrontmatter('Redesign the onboarding flow', PROJECT, 'Daily Note 2026-03-22', FIXED_DATE);
        expect(fm).toBe([
            '---',
            'title: "Redesign the onboarding flow"',
            'entity-type: "project"',
            'tags:',
            '  - project',
            'created: "2026-03-22"',
            'source-note: "[[Daily Note 2026-03-22]]"',
            '---',
        ].join('\n'));
    });

    it('escapes double-quotes in the title', () => {
        const fm = NoteCreator.buildFrontmatter('The "big" idea', PERSON, 'Note', FIXED_DATE);
        expect(fm).toContain('title: "The \\"big\\" idea"');
    });

    it('escapes backslashes in the title', () => {
        const fm = NoteCreator.buildFrontmatter('path\\to\\thing', PERSON, 'Note', FIXED_DATE);
        expect(fm).toContain('title: "path\\\\to\\\\thing"');
    });

    it('seeds tags with the entity type id', () => {
        const fm = NoteCreator.buildFrontmatter('Title', PERSON, 'Note', FIXED_DATE);
        expect(fm).toContain('  - person');
    });

    it('merges additional tags from frontmatterTemplate (array)', () => {
        const et: EntityType = { ...PERSON, frontmatterTemplate: { tags: ['work', 'q1'] } };
        const fm = NoteCreator.buildFrontmatter('Title', et, 'Note', FIXED_DATE);
        expect(fm).toContain('  - person');
        expect(fm).toContain('  - work');
        expect(fm).toContain('  - q1');
    });

    it('merges a single string tag from frontmatterTemplate', () => {
        const et: EntityType = { ...PERSON, frontmatterTemplate: { tags: 'work' } };
        const fm = NoteCreator.buildFrontmatter('Title', et, 'Note', FIXED_DATE);
        expect(fm).toContain('  - person');
        expect(fm).toContain('  - work');
    });

    it('does not duplicate entity-type id if it also appears in template tags', () => {
        const et: EntityType = { ...PERSON, frontmatterTemplate: { tags: ['person', 'extra'] } };
        const fm = NoteCreator.buildFrontmatter('Title', et, 'Note', FIXED_DATE);
        const tagLines = fm.split('\n').filter(l => l.startsWith('  - '));
        const personLines = tagLines.filter(l => l.trim() === '- person');
        expect(personLines).toHaveLength(1);
    });

    it('appends non-standard string fields from frontmatterTemplate', () => {
        const et: EntityType = { ...PERSON, frontmatterTemplate: { department: 'Engineering' } };
        const fm = NoteCreator.buildFrontmatter('Title', et, 'Note', FIXED_DATE);
        expect(fm).toContain('department: "Engineering"');
    });

    it('appends non-standard number fields', () => {
        const et: EntityType = { ...PERSON, frontmatterTemplate: { priority: 3 } };
        const fm = NoteCreator.buildFrontmatter('Title', et, 'Note', FIXED_DATE);
        expect(fm).toContain('priority: 3');
    });

    it('appends non-standard boolean fields', () => {
        const et: EntityType = { ...PERSON, frontmatterTemplate: { draft: true } };
        const fm = NoteCreator.buildFrontmatter('Title', et, 'Note', FIXED_DATE);
        expect(fm).toContain('draft: true');
    });

    it('appends non-standard array fields', () => {
        const et: EntityType = { ...PERSON, frontmatterTemplate: { aliases: ['S', 'SP'] } };
        const fm = NoteCreator.buildFrontmatter('Title', et, 'Note', FIXED_DATE);
        expect(fm).toContain('aliases:');
        expect(fm).toContain('  - "S"');
        expect(fm).toContain('  - "SP"');
    });

    it('standard fields win over conflicting template keys', () => {
        const et: EntityType = {
            ...PERSON, frontmatterTemplate: {
                title: 'OVERRIDE',
                'entity-type': 'OVERRIDE',
                created: 'OVERRIDE',
                'source-note': 'OVERRIDE',
            },
        };
        const fm = NoteCreator.buildFrontmatter('Real Title', et, 'Real Note', FIXED_DATE);
        expect(fm).toContain('title: "Real Title"');
        expect(fm).toContain('entity-type: "person"');
        expect(fm).toContain('created: "2026-03-22"');
        expect(fm).toContain('source-note: "[[Real Note]]"');
        expect(fm).not.toContain('OVERRIDE');
    });

    it('wraps content between --- delimiters', () => {
        const fm = NoteCreator.buildFrontmatter('T', PERSON, 'N', FIXED_DATE);
        expect(fm.startsWith('---\n')).toBe(true);
        expect(fm.endsWith('\n---')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// NoteCreator.resolveSourceNoteName
// ---------------------------------------------------------------------------

describe('NoteCreator.resolveSourceNoteName', () => {
    it('strips the path and .md extension', () => {
        expect(NoteCreator.resolveSourceNoteName('Daily/2026-03-22.md')).toBe('2026-03-22');
    });

    it('handles a filename-only path', () => {
        expect(NoteCreator.resolveSourceNoteName('Note.md')).toBe('Note');
    });

    it('handles a path without .md extension', () => {
        expect(NoteCreator.resolveSourceNoteName('Daily/2026-03-22')).toBe('2026-03-22');
    });

    it('returns Untitled for an empty path', () => {
        expect(NoteCreator.resolveSourceNoteName('')).toBe('Untitled');
    });
});

// ---------------------------------------------------------------------------
// NoteCreator.today
// ---------------------------------------------------------------------------

describe('NoteCreator.today', () => {
    it('returns a string matching YYYY-MM-DD', () => {
        expect(NoteCreator.today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

// ---------------------------------------------------------------------------
// NoteCreator.create  (integration — mocked vault)
// ---------------------------------------------------------------------------

describe('NoteCreator.create', () => {
    let getAbstractFileByPath: ReturnType<typeof vi.fn>;
    let createFolder: ReturnType<typeof vi.fn>;
    let create: ReturnType<typeof vi.fn>;
    let app: App;
    let nc: NoteCreator;

    beforeEach(() => {
        getAbstractFileByPath = vi.fn().mockReturnValue(null);   // nothing exists by default
        createFolder = vi.fn().mockResolvedValue(undefined);
        create = vi.fn().mockImplementation(
            // eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast
            (path: string) => Promise.resolve({ path } as unknown as TFile),
        );
        app = {
            vault: { getAbstractFileByPath, createFolder, create },
        } as unknown as App;
        nc = new NoteCreator(app);
    });

    it('creates the target folder when it does not exist', async () => {
        await nc.create('Sarah #person', PERSON, 'Notes/Daily.md', FIXED_DATE);
        expect(createFolder).toHaveBeenCalledWith('Entities/People');
    });

    it('skips createFolder when the folder already exists', async () => {
        getAbstractFileByPath.mockImplementation((p: string) =>
            p === 'Entities/People' ? { path: p } : null,
        );
        await nc.create('Sarah #person', PERSON, 'Notes/Daily.md', FIXED_DATE);
        expect(createFolder).not.toHaveBeenCalled();
    });

    it('creates the note at the correct path', async () => {
        await nc.create('Sarah #person', PERSON, 'Notes/Daily.md', FIXED_DATE);
        expect(create).toHaveBeenCalledWith(
            'Entities/People/Sarah.md',
            expect.any(String),
        );
    });

    it('returns the created TFile', async () => {
        const result = await nc.create('Sarah #person', PERSON, 'Notes/Daily.md', FIXED_DATE);
        expect(result.file).toEqual({ path: 'Entities/People/Sarah.md' });
    });

    it('returns the derived title', async () => {
        const result = await nc.create('Sarah #person', PERSON, 'Notes/Daily.md', FIXED_DATE);
        expect(result.title).toBe('Sarah');
    });

    it('returns the modified line with wikilink', async () => {
        const result = await nc.create('Sarah #person', PERSON, 'Notes/Daily.md', FIXED_DATE);
        expect(result.modifiedLine).toBe('[[Sarah]]');
    });

    it('writes correct frontmatter content into the file', async () => {
        await nc.create('Sarah #person', PERSON, 'Notes/Daily.md', FIXED_DATE);
        const content: string = create.mock.calls[0]?.[1] as string;
        expect(content).toContain('title: "Sarah"');
        expect(content).toContain('entity-type: "person"');
        expect(content).toContain('  - person');
        expect(content).toContain(`created: "${FIXED_DATE}"`);
        expect(content).toContain('source-note: "[[Daily]]"');
    });

    it('resolves source note name from path', async () => {
        await nc.create('Sarah #person', PERSON, 'Journals/2026-03-22.md', FIXED_DATE);
        const content: string = create.mock.calls[0]?.[1] as string;
        expect(content).toContain('source-note: "[[2026-03-22]]"');
    });

    it('uses Untitled for an empty source note path', async () => {
        await nc.create('Sarah #person', PERSON, '', FIXED_DATE);
        const content: string = create.mock.calls[0]?.[1] as string;
        expect(content).toContain('source-note: "[[Untitled]]"');
    });

    it('strips list markers when deriving the title', async () => {
        const result = await nc.create('- Met Sarah #person', PERSON, 'Daily.md', FIXED_DATE);
        expect(result.title).toBe('Met Sarah');
        expect(result.file.path).toBe('Entities/People/Met Sarah.md');
    });

    describe('collision handling', () => {
        it('appends " 2" when the title already exists', async () => {
            getAbstractFileByPath.mockImplementation((p: string) => {
                if (p === 'Entities/People/Sarah.md') return { path: p };
                return null;
            });
            const result = await nc.create('Sarah #person', PERSON, 'Daily.md', FIXED_DATE);
            expect(result.title).toBe('Sarah 2');
            expect(result.file.path).toBe('Entities/People/Sarah 2.md');
        });

        it('increments to " 3" when both title and " 2" exist', async () => {
            getAbstractFileByPath.mockImplementation((p: string) => {
                if (p === 'Entities/People/Sarah.md') return { path: p };
                if (p === 'Entities/People/Sarah 2.md') return { path: p };
                return null;
            });
            const result = await nc.create('Sarah #person', PERSON, 'Daily.md', FIXED_DATE);
            expect(result.title).toBe('Sarah 3');
        });

        it('includes the collision-resolved title in the wikilink', async () => {
            getAbstractFileByPath.mockImplementation((p: string) =>
                p === 'Entities/People/Sarah.md' ? { path: p } : null,
            );
            const result = await nc.create('Sarah #person', PERSON, 'Daily.md', FIXED_DATE);
            expect(result.modifiedLine).toBe('[[Sarah 2]]');
        });
    });

    describe('spec example (end-to-end)', () => {
        it('matches the spec example exactly', async () => {
            const result = await nc.create(
                'Redesign the onboarding flow #project',
                PROJECT,
                'Daily/Daily Note 2026-03-22.md',
                FIXED_DATE,
            );

            expect(result.modifiedLine).toBe('[[Redesign the onboarding flow]]');

            const content: string = create.mock.calls[0]?.[1] as string;
            expect(content).toContain('title: "Redesign the onboarding flow"');
            expect(content).toContain('entity-type: "project"');
            expect(content).toContain('  - project');
            expect(content).toContain('created: "2026-03-22"');
            expect(content).toContain('source-note: "[[Daily Note 2026-03-22]]"');
        });
    });
});
