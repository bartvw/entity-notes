import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseFileGenerator } from './BaseFileGenerator';
import type { EntityType, PluginSettings } from '../types';
import { TFile } from 'obsidian';
import type { App } from 'obsidian';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PERSON: EntityType = {
    id: 'person', name: 'Person', triggerTag: '#person',
    targetFolder: 'Entities/People', color: '#4a90d9', enabled: true, frontmatterTemplate: {},
};

const ALL_ON: PluginSettings = {
    entityTypes: [],
    convertOnEnter: false,
    entityIdentification: 'entity-type-field',
    titleField:      { enabled: true, name: 'title' },
    entityTypeField: { enabled: true, name: 'entity-type' },
    tagsField:       { enabled: true, name: 'tags' },
    createdField:    { enabled: true, name: 'created' },
    sourceNoteField: { enabled: true, name: 'source-note' },
};

// ---------------------------------------------------------------------------
// buildContent — filter
// ---------------------------------------------------------------------------

describe('BaseFileGenerator.buildContent — filter', () => {
    it('uses entity-type-field filter when mode is entity-type-field', () => {
        const content = BaseFileGenerator.buildContent(PERSON, ALL_ON);
        expect(content).toContain('- note["entity-type"] == "person"');
    });

    it('uses tags filter when mode is tags', () => {
        const settings = { ...ALL_ON, entityIdentification: 'tags' } as PluginSettings;
        const content = BaseFileGenerator.buildContent(PERSON, settings);
        expect(content).toContain('- file.tags.contains("person")');
    });

    it('uses the configured entity-type field name in the filter', () => {
        const settings: PluginSettings = {
            ...ALL_ON,
            entityTypeField: { enabled: true, name: 'custom-type' },
        };
        const content = BaseFileGenerator.buildContent(PERSON, settings);
        expect(content).toContain('- note["custom-type"] == "person"');
    });
});

// ---------------------------------------------------------------------------
// buildContent — order
// ---------------------------------------------------------------------------

describe('BaseFileGenerator.buildContent — order', () => {
    it('starts with file.name', () => {
        const content = BaseFileGenerator.buildContent(PERSON, ALL_ON);
        const orderSection = content.slice(content.indexOf('    order:'));
        const firstColumn = orderSection.split('\n')[1];
        expect(firstColumn?.trim()).toBe('- file.name');
    });

    it('includes all enabled standard fields', () => {
        const content = BaseFileGenerator.buildContent(PERSON, ALL_ON);
        expect(content).toContain('      - title');
        expect(content).toContain('      - entity-type');
        expect(content).toContain('      - tags');
        expect(content).toContain('      - created');
        expect(content).toContain('      - source-note');
    });

    it('excludes disabled standard fields', () => {
        const settings: PluginSettings = {
            ...ALL_ON,
            tagsField:  { enabled: false, name: 'tags' },
            createdField: { enabled: false, name: 'created' },
        };
        const content = BaseFileGenerator.buildContent(PERSON, settings);
        expect(content).not.toContain('      - tags');
        expect(content).not.toContain('      - created');
    });

    it('appends frontmatterTemplate keys after standard fields', () => {
        const et: EntityType = {
            ...PERSON,
            frontmatterTemplate: { company: '', role: '' },
        };
        const content = BaseFileGenerator.buildContent(et, ALL_ON);
        expect(content).toContain('      - company');
        expect(content).toContain('      - role');
        const companyIdx = content.indexOf('      - company');
        const sourceNoteIdx = content.indexOf('      - source-note');
        expect(companyIdx).toBeGreaterThan(sourceNoteIdx);
    });

    it('does not include frontmatterTemplate keys when template is empty', () => {
        const content = BaseFileGenerator.buildContent(PERSON, ALL_ON);
        // Only the standard order columns should appear — no extra lines
        const orderSection = content.slice(content.indexOf('    order:'), content.indexOf('    sort:'));
        const orderLines = orderSection.split('\n').filter(l => l.trim().startsWith('- '));
        expect(orderLines).toHaveLength(6); // file.name + 5 standard fields
    });
});

// ---------------------------------------------------------------------------
// buildContent — sort
// ---------------------------------------------------------------------------

describe('BaseFileGenerator.buildContent — sort', () => {
    it('sorts by file.name ascending', () => {
        const content = BaseFileGenerator.buildContent(PERSON, ALL_ON);
        expect(content).toContain('      - property: file.name');
        expect(content).toContain('        direction: ASC');
    });
});

// ---------------------------------------------------------------------------
// generate — vault I/O
// ---------------------------------------------------------------------------

describe('BaseFileGenerator.generate', () => {
    let getAbstractFileByPath: ReturnType<typeof vi.fn>;
    let createFolder: ReturnType<typeof vi.fn>;
    let create: ReturnType<typeof vi.fn>;
    let modify: ReturnType<typeof vi.fn>;
    let app: App;
    let generator: BaseFileGenerator;

    beforeEach(() => {
        getAbstractFileByPath = vi.fn().mockReturnValue(null);
        createFolder = vi.fn().mockResolvedValue(undefined);
        create = vi.fn().mockImplementation((path: string) => {
            const f = new TFile(); f.path = path; return Promise.resolve(f);
        });
        modify = vi.fn().mockResolvedValue(undefined);
        app = { vault: { getAbstractFileByPath, createFolder, create, modify } } as unknown as App;
        generator = new BaseFileGenerator(app);
    });

    it('creates the Entities/ folder when it does not exist', async () => {
        await generator.generate([{ ...PERSON }], ALL_ON, false);
        expect(createFolder).toHaveBeenCalledWith('Entities');
    });

    it('skips createFolder when Entities/ already exists', async () => {
        getAbstractFileByPath.mockImplementation((p: string) =>
            p === 'Entities' ? { path: p } : null,
        );
        await generator.generate([{ ...PERSON }], ALL_ON, false);
        expect(createFolder).not.toHaveBeenCalled();
    });

    it('creates a file at Entities/<id>.base', async () => {
        await generator.generate([{ ...PERSON }], ALL_ON, false);
        expect(create).toHaveBeenCalledWith('Entities/person.base', expect.any(String));
    });

    it('returns status "created" for new files', async () => {
        const results = await generator.generate([{ ...PERSON }], ALL_ON, false);
        expect(results[0]?.status).toBe('created');
    });

    it('sets basesFile on the entityType after creation', async () => {
        const et = { ...PERSON };
        await generator.generate([et], ALL_ON, false);
        expect(et.basesFile).toBe('Entities/person.base');
    });

    it('skips existing files when overwrite is false', async () => {
        getAbstractFileByPath.mockImplementation((p: string) =>
            p === 'Entities' ? { path: p } : p === 'Entities/person.base' ? { path: p } : null,
        );
        const results = await generator.generate([PERSON], ALL_ON, false);
        expect(create).not.toHaveBeenCalled();
        expect(modify).not.toHaveBeenCalled();
        expect(results[0]?.status).toBe('skipped');
    });

    it('overwrites existing files when overwrite is true', async () => {
        const existingFile = Object.assign(new TFile(), { path: 'Entities/person.base' });
        getAbstractFileByPath.mockImplementation((p: string) =>
            p === 'Entities' ? { path: p } : p === 'Entities/person.base' ? existingFile : null,
        );
        const results = await generator.generate([{ ...PERSON }], ALL_ON, true);
        expect(modify).toHaveBeenCalledWith(existingFile, expect.any(String));
        expect(results[0]?.status).toBe('overwritten');
    });

    it('does not set basesFile when skipped', async () => {
        getAbstractFileByPath.mockImplementation((p: string) =>
            p === 'Entities' ? { path: p } : p === 'Entities/person.base' ? { path: p } : null,
        );
        const et = { ...PERSON };
        await generator.generate([et], ALL_ON, false);
        expect(et.basesFile).toBeUndefined();
    });
});
