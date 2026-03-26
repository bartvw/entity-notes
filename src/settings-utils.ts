/**
 * Pure helpers used by the settings UI.
 * No Obsidian imports — safe to unit-test with plain Vitest.
 */

export function coerceValue(key: string, value: string): unknown {
    if (key === 'tags') {
        return value.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
    if (value === 'true')  return true;
    if (value === 'false') return false;
    if (value.trim() !== '' && !isNaN(Number(value))) return Number(value);
    return value;
}

/**
 * Generates a unique entity-type id from a display name.
 * Lowercases, replaces whitespace with hyphens, removes non-alphanumeric chars.
 */
export function generateId(name: string, existingIds: string[]): string {
    const base = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'entity';
    if (!existingIds.includes(base)) return base;
    for (let n = 2; ; n++) {
        const candidate = `${base}-${n}`;
        if (!existingIds.includes(candidate)) return candidate;
    }
}
