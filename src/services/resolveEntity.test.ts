import { describe, it, expect } from 'vitest';
import { resolveEntitiesFromFrontmatter } from './resolveEntity';
import type { EntityType, PluginSettings } from '../types';

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
const DISABLED: EntityType = { ...PERSON, id: 'disabled', enabled: false };

const BASE_OPTIONS: Pick<PluginSettings, 'entityIdentification' | 'entityTypeField' | 'tagsField' | 'entityTypes'> = {
    entityIdentification: 'entity-type-field',
    entityTypeField: { enabled: true, name: 'entity-type' },
    tagsField:       { enabled: true, name: 'tags' },
    entityTypes: [PERSON, PROJECT, DISABLED],
};

// ---------------------------------------------------------------------------
// entity-type-field mode
// ---------------------------------------------------------------------------

describe('resolveEntitiesFromFrontmatter — entity-type-field mode', () => {
    it('returns the matching entity type in an array', () => {
        const result = resolveEntitiesFromFrontmatter(
            { 'entity-type': 'person' },
            BASE_OPTIONS,
        );
        expect(result).toEqual([PERSON]);
    });

    it('returns empty array when entity-type field is absent', () => {
        expect(resolveEntitiesFromFrontmatter({}, BASE_OPTIONS)).toEqual([]);
    });

    it('returns empty array when entity-type value is not a string', () => {
        expect(resolveEntitiesFromFrontmatter({ 'entity-type': 42 }, BASE_OPTIONS)).toEqual([]);
    });

    it('returns empty array when entity-type value does not match any entity type', () => {
        expect(resolveEntitiesFromFrontmatter({ 'entity-type': 'unknown' }, BASE_OPTIONS)).toEqual([]);
    });

    it('returns empty array for a disabled entity type', () => {
        expect(resolveEntitiesFromFrontmatter({ 'entity-type': 'disabled' }, BASE_OPTIONS)).toEqual([]);
    });

    it('returns empty array when frontmatter is null', () => {
        expect(resolveEntitiesFromFrontmatter(null, BASE_OPTIONS)).toEqual([]);
    });

    it('returns empty array when frontmatter is undefined', () => {
        expect(resolveEntitiesFromFrontmatter(undefined, BASE_OPTIONS)).toEqual([]);
    });

    it('uses the configured entity-type field name', () => {
        const options = { ...BASE_OPTIONS, entityTypeField: { enabled: true, name: 'type' } };
        expect(resolveEntitiesFromFrontmatter({ type: 'person' }, options)).toEqual([PERSON]);
    });

    it('returns empty array when using default field name but frontmatter uses a custom name', () => {
        expect(resolveEntitiesFromFrontmatter({ type: 'person' }, BASE_OPTIONS)).toEqual([]);
    });

    it('returns at most one result even if the same id appears multiple times in entityTypes', () => {
        const result = resolveEntitiesFromFrontmatter({ 'entity-type': 'person' }, BASE_OPTIONS);
        expect(result).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// tag mode
// ---------------------------------------------------------------------------

describe('resolveEntitiesFromFrontmatter — tag mode', () => {
    const TAG_OPTIONS = { ...BASE_OPTIONS, entityIdentification: 'tags' as const };

    it('returns the matching entity type when tag is in array', () => {
        const result = resolveEntitiesFromFrontmatter(
            { tags: ['person', 'work'] },
            TAG_OPTIONS,
        );
        expect(result).toEqual([PERSON]);
    });

    it('returns multiple entity types when multiple tags match', () => {
        const result = resolveEntitiesFromFrontmatter(
            { tags: ['person', 'project'] },
            TAG_OPTIONS,
        );
        expect(result).toEqual([PERSON, PROJECT]);
    });

    it('preserves the order of entityTypes (not tag order)', () => {
        // entityTypes order is [PERSON, PROJECT, DISABLED]
        // tags are in reverse order — result should follow entityTypes order
        const result = resolveEntitiesFromFrontmatter(
            { tags: ['project', 'person'] },
            TAG_OPTIONS,
        );
        expect(result).toEqual([PERSON, PROJECT]);
    });

    it('returns empty array when no tags match', () => {
        expect(resolveEntitiesFromFrontmatter({ tags: ['work', 'q1'] }, TAG_OPTIONS)).toEqual([]);
    });

    it('returns empty array when tags field is absent', () => {
        expect(resolveEntitiesFromFrontmatter({}, TAG_OPTIONS)).toEqual([]);
    });

    it('excludes disabled entity types', () => {
        const result = resolveEntitiesFromFrontmatter(
            { tags: ['person', 'disabled'] },
            TAG_OPTIONS,
        );
        expect(result).toEqual([PERSON]);
    });

    it('handles a single string tag (not an array)', () => {
        expect(resolveEntitiesFromFrontmatter({ tags: 'person' }, TAG_OPTIONS)).toEqual([PERSON]);
    });

    it('returns empty array when tags value is neither string nor array', () => {
        expect(resolveEntitiesFromFrontmatter({ tags: 42 }, TAG_OPTIONS)).toEqual([]);
    });

    it('uses the configured tags field name', () => {
        const options = { ...TAG_OPTIONS, tagsField: { enabled: true, name: 'labels' } };
        expect(resolveEntitiesFromFrontmatter({ labels: ['person'] }, options)).toEqual([PERSON]);
    });

    it('returns empty array when frontmatter is null', () => {
        expect(resolveEntitiesFromFrontmatter(null, TAG_OPTIONS)).toEqual([]);
    });
});
