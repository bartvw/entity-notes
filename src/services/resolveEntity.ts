import type { EntityType, PluginSettings } from '../types';

type ResolveOptions = Pick<
    PluginSettings,
    'entityIdentification' | 'entityTypeField' | 'tagsField' | 'entityTypes'
>;

/**
 * Returns all entity types that match a note's frontmatter, using whichever
 * identification method is configured.
 *
 * - entity-type-field mode: returns 0 or 1 results (exact field match)
 * - tag mode: returns one result per matching tag (can be multiple)
 *
 * Pure function — no Obsidian APIs required, fully testable.
 */
export function resolveEntitiesFromFrontmatter(
    frontmatter: Record<string, unknown> | undefined | null,
    options: ResolveOptions,
): EntityType[] {
    if (!frontmatter) return [];
    const { entityTypes, entityIdentification, entityTypeField, tagsField } = options;

    if (entityIdentification === 'tags') {
        const rawTags = frontmatter[tagsField.name];
        const tags: string[] = Array.isArray(rawTags)
            ? rawTags.map(String)
            : typeof rawTags === 'string' ? [rawTags] : [];
        return entityTypes.filter(e => e.enabled && tags.includes(e.id));
    }

    // Default: entity-type-field
    const entityTypeId = frontmatter[entityTypeField.name];
    if (typeof entityTypeId !== 'string') return [];
    const match = entityTypes.find(e => e.id === entityTypeId && e.enabled);
    return match ? [match] : [];
}
