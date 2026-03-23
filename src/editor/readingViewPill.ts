import type { EntityType } from '../types';

/**
 * Creates the pill <span> element used in Reading mode.
 * Produces the same visual output as EntityPillWidget.toDOM() so both modes
 * look identical. Pure function — no external dependencies.
 */
export function createPillElement(entityType: EntityType): HTMLElement {
    const span = document.createElement('span');
    span.className = 'entity-notes-pill';
    span.textContent = entityType.name.toLowerCase();
    span.style.backgroundColor = entityType.color;
    return span;
}

/**
 * Scans `el` for `<a class="internal-link">` elements and inserts an entity
 * pill immediately after each one that resolves to a known entity type.
 *
 * @param el             - The container element passed by MarkdownPostProcessor.
 * @param resolveEntityType - Caller-supplied lookup: given a link target string,
 *                           returns the matching enabled EntityType or null.
 */
export function injectPillsIntoElement(
    el: HTMLElement,
    resolveEntityTypes: (linkTarget: string) => EntityType[],
): void {
    el.querySelectorAll<HTMLAnchorElement>('a.internal-link').forEach(a => {
        const linkTarget = (a.getAttribute('data-href') ?? a.textContent ?? '').trim();
        if (!linkTarget) return;
        const entityTypes = resolveEntityTypes(linkTarget);
        // Insert pills in reverse order so each insertAdjacentElement('afterend') keeps them in order
        for (let i = entityTypes.length - 1; i >= 0; i--) {
            a.insertAdjacentElement('afterend', createPillElement(entityTypes[i]!));
        }
    });
}
