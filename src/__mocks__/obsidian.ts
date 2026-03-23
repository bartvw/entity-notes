/**
 * Minimal stub of the obsidian module for use in the Vitest test environment.
 * Only exports that are actually imported as values (not types) need to be here.
 */

/**
 * Mirrors the real normalizePath behaviour:
 * - Collapses backslashes and multiple slashes to a single forward slash
 * - Strips leading and trailing slashes
 * - Replaces non-breaking spaces with regular spaces
 */
export function normalizePath(path: string): string {
    return path
        .replace(/\u00A0/g, ' ')
        .replace(/[/\\]+/g, '/')
        .replace(/^\/|\/$/g, '');
}
