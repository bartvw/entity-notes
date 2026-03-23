import { describe, it, expect } from 'vitest';
import { resolveEntityFromFrontmatter } from './resolveEntity';
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

describe('resolveEntityFromFrontmatter — entity-type-field mode', () => {
    it('returns the matching entity type', () => {
        const result = resolveEntityFromFrontmatter(
            { 'entity-type': 'person' },
            BASE_OPTIONS,
        );
        expect(result).toBe(PERSON);
    });

    it('returns null when entity-type field is absent', () => {
        expect(resolveEntityFromFrontmatter({}, BASE_OPTIONS)).toBeNull();
    });

    it('returns null when entity-type value is not a string', () => {
        expect(resolveEntityFromFrontmatter({ 'entity-type': 42 }, BASE_OPTIONS)).toBeNull();
    });

    it('returns null when entity-type value does not match any entity type', () => {
        expect(resolveEntityFromFrontmatter({ 'entity-type': 'unknown' }, BASE_OPTIONS)).toBeNull();
    });

    it('returns null for a disabled entity type', () => {
        expect(resolveEntityFromFrontmatter({ 'entity-type': 'disabled' }, BASE_OPTIONS)).toBeNull();
    });

    it('returns null when frontmatter is null', () => {
        expect(resolveEntityFromFrontmatter(null, BASE_OPTIONS)).toBeNull();
    });

    it('returns null when frontmatter is undefined', () => {
        expect(resolveEntityFromFrontmatter(undefined, BASE_OPTIONS)).toBeNull();
    });

    it('uses the configured entity-type field name', () => {
        const options = { ...BASE_OPTIONS, entityTypeField: { enabled: true, name: 'type' } };
        const result = resolveEntityFromFrontmatter({ type: 'person' }, options);
        expect(result).toBe(PERSON);
    });

    it('returns null when using the default field name but frontmatter uses a custom name', () => {
        const result = resolveEntityFromFrontmatter({ type: 'person' }, BASE_OPTIONS);
        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// tag mode
// ---------------------------------------------------------------------------

describe('resolveEntityFromFrontmatter — tag mode', () => {
    const TAG_OPTIONS = { ...BASE_OPTIONS, entityIdentification: 'tag' as const };

    it('returns the matching entity type when tag is in array', () => {
        const result = resolveEntityFromFrontmatter(
            { tags: ['person', 'work'] },
            TAG_OPTIONS,
        );
        expect(result).toBe(PERSON);
    });

    it('returns the first matching entity type when multiple tags match', () => {
        const result = resolveEntityFromFrontmatter(
            { tags: ['project', 'person'] },
            TAG_OPTIONS,
        );
        // entityTypes order is [PERSON, PROJECT, DISABLED], so PERSON is found first via person tag
        // but project comes first in the tags array — find() iterates entityTypes, not tags
        expect(result).toBe(PERSON);
    });

    it('returns null when no tags match', () => {
        expect(resolveEntityFromFrontmatter({ tags: ['work', 'q1'] }, TAG_OPTIONS)).toBeNull();
    });

    it('returns null when tags field is absent', () => {
        expect(resolveEntityFromFrontmatter({}, TAG_OPTIONS)).toBeNull();
    });

    it('returns null for a disabled entity type', () => {
        expect(resolveEntityFromFrontmatter({ tags: ['disabled'] }, TAG_OPTIONS)).toBeNull();
    });

    it('handles a single string tag (not an array)', () => {
        const result = resolveEntityFromFrontmatter({ tags: 'person' }, TAG_OPTIONS);
        expect(result).toBe(PERSON);
    });

    it('returns null when tags value is neither string nor array', () => {
        expect(resolveEntityFromFrontmatter({ tags: 42 }, TAG_OPTIONS)).toBeNull();
    });

    it('uses the configured tags field name', () => {
        const options = { ...TAG_OPTIONS, tagsField: { enabled: true, name: 'labels' } };
        const result = resolveEntityFromFrontmatter({ labels: ['person'] }, options);
        expect(result).toBe(PERSON);
    });

    it('returns null when frontmatter is null', () => {
        expect(resolveEntityFromFrontmatter(null, TAG_OPTIONS)).toBeNull();
    });
});
