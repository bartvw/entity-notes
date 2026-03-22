import type { EntityType } from '../types';

/**
 * Parses an editor line and returns the first enabled EntityType whose
 * triggerTag appears in it, or null if none match.
 *
 * TODO: implement matching logic (whole-word tag check, skip lines that are
 *       already wikilinks, skip code blocks, etc.)
 */
export class PatternMatcher {
    match(line: string, entityTypes: EntityType[]): EntityType | null {
        for (const entityType of entityTypes) {
            if (entityType.enabled && line.includes(entityType.triggerTag)) {
                return entityType;
            }
        }
        return null;
    }
}
