import { describe, it, expect, vi } from 'vitest';
import { PatternMatcher } from './PatternMatcher';
import { NoteCreator } from './NoteCreator';
import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { EntityType } from '../types';

// Mirror the default entity types without importing settings.ts (which requires obsidian)
const DEFAULT_ENTITY_TYPES: EntityType[] = [
    { id: 'person',         name: 'Person',         triggerTag: '#person',         targetFolder: 'Entities/People',          color: '#4a90d9', enabled: true, frontmatterTemplate: {} },
    { id: 'idea',           name: 'Idea',           triggerTag: '#idea',           targetFolder: 'Entities/Ideas',           color: '#f5a623', enabled: true, frontmatterTemplate: {} },
    { id: 'accomplishment', name: 'Accomplishment', triggerTag: '#accomplishment', targetFolder: 'Entities/Accomplishments', color: '#7ed321', enabled: true, frontmatterTemplate: {} },
    { id: 'feedback',       name: 'Feedback',       triggerTag: '#feedback',       targetFolder: 'Entities/Feedback',        color: '#9b59b6', enabled: true, frontmatterTemplate: {} },
    { id: 'project',        name: 'Project',        triggerTag: '#project',        targetFolder: 'Entities/Projects',        color: '#e74c3c', enabled: true, frontmatterTemplate: {} },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockApp(): { app: App; mockCreate: ReturnType<typeof vi.fn> } {
    const mockCreate = vi.fn().mockImplementation(
        (path: string) => { const f = new TFile(); f.path = path; return Promise.resolve(f); },
    );
    const app = {
        vault: {
            getAbstractFileByPath: () => null,
            createFolder: vi.fn().mockResolvedValue(undefined),
            create: mockCreate,
        },
    } as unknown as App;
    return { app, mockCreate };
}

const NO_CONTEXT = { inFencedBlock: false, inFrontmatter: false };

// ---------------------------------------------------------------------------
// SPEC.md example — full pipeline
// ---------------------------------------------------------------------------

describe('PatternMatcher + NoteCreator integration', () => {
    it('matches and converts the SPEC.md project example end-to-end', async () => {
        const line = 'Redesign the onboarding flow #project';
        const FIXED_DATE = '2026-03-22';

        // Step 1: PatternMatcher identifies the entity type
        const matcher = new PatternMatcher();
        const matched = matcher.match(line, DEFAULT_ENTITY_TYPES, NO_CONTEXT);
        expect(matched).not.toBeNull();
        expect(matched!.id).toBe('project');

        // Step 2: NoteCreator creates the note and rewrites the line
        const { app, mockCreate } = makeMockApp();
        const result = await new NoteCreator(app).create(
            line, matched!, 'Daily Note 2026-03-22.md', FIXED_DATE,
        );

        expect(result.title).toBe('Redesign the onboarding flow');
        expect(result.modifiedLine).toBe('[[Redesign the onboarding flow]]');

        const [calledPath, calledContent] = mockCreate.mock.calls[0] as [string, string];
        expect(calledPath).toBe('Entities/Projects/Redesign the onboarding flow.md');
        expect(calledContent).toBe(
            '---\n' +
            'title: "Redesign the onboarding flow"\n' +
            'entity-type: "project"\n' +
            'tags:\n' +
            '  - project\n' +
            'created: "2026-03-22"\n' +
            'source-note: "[[Daily Note 2026-03-22]]"\n' +
            '---\n',
        );
    });

    it('returns null from PatternMatcher for a line inside a code block', () => {
        const matcher = new PatternMatcher();
        const result = matcher.match(
            'Redesign the onboarding flow #project',
            DEFAULT_ENTITY_TYPES,
            { inFencedBlock: true, inFrontmatter: false },
        );
        expect(result).toBeNull();
    });

    it('returns null from PatternMatcher for a disabled entity type', () => {
        const types = DEFAULT_ENTITY_TYPES.map(et =>
            et.id === 'project' ? { ...et, enabled: false } : et,
        );
        const matcher = new PatternMatcher();
        const result = matcher.match(
            'Redesign the onboarding flow #project',
            types,
            NO_CONTEXT,
        );
        expect(result).toBeNull();
    });

    it('strips the list marker from the title for a list item line', async () => {
        const line = '- Met Sarah #person';
        const FIXED_DATE = '2026-03-22';

        const matcher = new PatternMatcher();
        const matched = matcher.match(line, DEFAULT_ENTITY_TYPES, NO_CONTEXT);
        expect(matched).not.toBeNull();
        expect(matched!.id).toBe('person');

        const { app, mockCreate } = makeMockApp();
        const result = await new NoteCreator(app).create(
            line, matched!, 'Daily Note 2026-03-22.md', FIXED_DATE,
        );

        expect(result.title).toBe('Met Sarah');
        expect(result.modifiedLine).toBe('- [[Met Sarah]]');

        const [calledPath] = mockCreate.mock.calls[0] as [string, string];
        expect(calledPath).toBe('Entities/People/Met Sarah.md');
    });
});
