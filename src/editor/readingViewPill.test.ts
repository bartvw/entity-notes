// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createPillElement, injectPillsIntoElement } from './readingViewPill';
import type { EntityType } from '../types';

const PROJECT: EntityType = {
    id: 'project', name: 'Project', triggerTag: '#project',
    targetFolder: 'Entities/Projects', color: '#e74c3c', enabled: true,
    frontmatterTemplate: {},
};

const PERSON: EntityType = {
    id: 'person', name: 'Person', triggerTag: '#person',
    targetFolder: 'Entities/People', color: '#4a90d9', enabled: true,
    frontmatterTemplate: {},
};

// ---------------------------------------------------------------------------
// createPillElement
// ---------------------------------------------------------------------------

describe('createPillElement', () => {
    it('produces a span with the correct class', () => {
        const el = createPillElement(PROJECT);
        expect(el.tagName).toBe('SPAN');
        expect(el.className).toBe('entity-notes-pill');
    });

    it('displays the entity type name in lowercase', () => {
        const el = createPillElement(PROJECT);
        expect(el.textContent).toBe('project');
    });

    it('sets the background color from entityType.color', () => {
        const el = createPillElement(PROJECT);
        // jsdom normalises hex → rgb
        expect(el.style.backgroundColor).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// injectPillsIntoElement
// ---------------------------------------------------------------------------

function makeLink(dataHref: string, text?: string): HTMLAnchorElement {
    const a = document.createElement('a');
    a.className = 'internal-link';
    a.setAttribute('data-href', dataHref);
    a.textContent = text ?? dataHref;
    return a;
}

function makeContainer(...links: HTMLAnchorElement[]): HTMLElement {
    const div = document.createElement('div');
    for (const a of links) div.appendChild(a);
    return div;
}

describe('injectPillsIntoElement', () => {
    it('does nothing when there are no internal links', () => {
        const el = document.createElement('div');
        el.textContent = 'Plain text';
        injectPillsIntoElement(el, () => PROJECT);
        expect(el.querySelectorAll('.entity-notes-pill').length).toBe(0);
    });

    it('does nothing when resolver returns null', () => {
        const el = makeContainer(makeLink('Some Note'));
        injectPillsIntoElement(el, () => null);
        expect(el.querySelectorAll('.entity-notes-pill').length).toBe(0);
    });

    it('inserts a pill immediately after the matched link', () => {
        const link = makeLink('Redesign the onboarding flow');
        const el = makeContainer(link);
        injectPillsIntoElement(el, () => PROJECT);

        const pills = el.querySelectorAll('.entity-notes-pill');
        expect(pills.length).toBe(1);
        expect(pills[0]!.previousElementSibling).toBe(link);
        expect(pills[0]!.textContent).toBe('project');
    });

    it('inserts pills for each matching link independently', () => {
        const link1 = makeLink('Redesign the onboarding flow');
        const link2 = makeLink('Met Sarah');
        const el = makeContainer(link1, link2);

        injectPillsIntoElement(el, (target) => {
            if (target === 'Redesign the onboarding flow') return PROJECT;
            if (target === 'Met Sarah') return PERSON;
            return null;
        });

        expect(el.querySelectorAll('.entity-notes-pill').length).toBe(2);
    });

    it('skips a link when resolver returns null for that specific target', () => {
        const link1 = makeLink('Entity Note');
        const link2 = makeLink('Regular Note');
        const el = makeContainer(link1, link2);

        injectPillsIntoElement(el, (target) => target === 'Entity Note' ? PROJECT : null);

        const pills = el.querySelectorAll('.entity-notes-pill');
        expect(pills.length).toBe(1);
        expect(pills[0]!.previousElementSibling).toBe(link1);
    });

    it('falls back to link text content when data-href is absent', () => {
        const a = document.createElement('a');
        a.className = 'internal-link';
        a.textContent = 'Fallback note';
        const el = makeContainer(a);

        let resolved = '';
        injectPillsIntoElement(el, (target) => { resolved = target; return null; });
        expect(resolved).toBe('Fallback note');
    });

    it('ignores links that are not internal-link class', () => {
        const a = document.createElement('a');
        a.href = 'https://example.com';
        a.textContent = 'External';
        const el = makeContainer(a);

        injectPillsIntoElement(el, () => PROJECT);
        expect(el.querySelectorAll('.entity-notes-pill').length).toBe(0);
    });
});
