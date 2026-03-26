import { describe, expect, it } from 'vitest';
import { coerceValue, generateId } from './settings-utils';

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

describe('generateId', () => {
    it('lowercases a simple name', () => {
        expect(generateId('Person', [])).toBe('person');
    });

    it('replaces spaces with hyphens', () => {
        expect(generateId('My Project', [])).toBe('my-project');
    });

    it('removes special characters', () => {
        expect(generateId('Hello! World#1', [])).toBe('hello-world1');
    });

    it('falls back to "entity" when the base is empty', () => {
        expect(generateId('!!!', [])).toBe('entity');
    });

    it('appends -2 when the base id is already taken', () => {
        expect(generateId('Person', ['person'])).toBe('person-2');
    });

    it('appends -3 when base and -2 are already taken', () => {
        expect(generateId('Person', ['person', 'person-2'])).toBe('person-3');
    });
});

// ---------------------------------------------------------------------------
// coerceValue
// ---------------------------------------------------------------------------

describe('coerceValue', () => {
    it('splits the "tags" key into a trimmed string array', () => {
        expect(coerceValue('tags', 'work, personal')).toEqual(['work', 'personal']);
    });

    it('returns a single-element array for a single tag', () => {
        expect(coerceValue('tags', 'work')).toEqual(['work']);
    });

    it('returns an empty array for an empty tags value', () => {
        expect(coerceValue('tags', '')).toEqual([]);
    });

    it('coerces "true" to boolean true', () => {
        expect(coerceValue('someKey', 'true')).toBe(true);
    });

    it('coerces "false" to boolean false', () => {
        expect(coerceValue('someKey', 'false')).toBe(false);
    });

    it('coerces a numeric string to a number', () => {
        expect(coerceValue('priority', '3')).toBe(3);
    });

    it('returns plain strings unchanged', () => {
        expect(coerceValue('status', 'active')).toBe('active');
    });

    it('coerces negative numeric strings to numbers', () => {
        expect(coerceValue('priority', '-5')).toBe(-5);
    });

    it('coerces floating point strings to numbers', () => {
        expect(coerceValue('rate', '3.14')).toBe(3.14);
    });

    it('does not coerce mixed-case "True" to boolean', () => {
        expect(coerceValue('flag', 'True')).toBe('True');
    });

    it('does not coerce whitespace-only strings to 0', () => {
        expect(coerceValue('priority', '   ')).toBe('   ');
    });
});
