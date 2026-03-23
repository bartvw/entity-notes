import type { EntityType, PluginSettings } from '../types';

type ResolveOptions = Pick<
    PluginSettings,
    'entityIdentification' | 'entityTypeField' | 'tagsField' | 'entityTypes'
>;

/**
 * Determines which entity type (if any) a note's frontmatter belongs to,
 * using whichever identification method is configured.
 *
 * Pure function — no Obsidian APIs required, fully testable.
 */
export function resolveEntityFromFrontmatter(
    frontmatter: Record<string, unknown> | undefined | null,
    options: ResolveOptions,
): EntityType | null {
    if (!frontmatter) return null;
    const { entityTypes, entityIdentification, entityTypeField, tagsField } = options;

    if (entityIdentification === 'tag') {
        const rawTags = frontmatter[tagsField.name];
        const tags: string[] = Array.isArray(rawTags)
            ? rawTags.map(String)
            : typeof rawTags === 'string' ? [rawTags] : [];
        return entityTypes.find(e => e.enabled && tags.includes(e.id)) ?? null;
    }

    // Default: entity-type-field
    const entityTypeId = frontmatter[entityTypeField.name];
    if (typeof entityTypeId !== 'string') return null;
    return entityTypes.find(e => e.id === entityTypeId && e.enabled) ?? null;
}
