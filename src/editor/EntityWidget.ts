import { WidgetType } from '@codemirror/view';
import type EntityNotesPlugin from '../main';
import type { EntityType } from '../types';

/**
 * CM6 WidgetType that renders the inline "→ note" button next to a matching
 * entity trigger tag.
 *
 * TODO: implement toDOM (using createEl / DOM API — no innerHTML),
 *       wire click handler → NoteCreator, and return eq() correctly.
 */
export class EntityWidget extends WidgetType {
    constructor(
        private readonly plugin: EntityNotesPlugin,
        private readonly entityType: EntityType,
        private readonly lineText: string,
    ) {
        super();
    }

    eq(other: EntityWidget): boolean {
        return other.entityType.id === this.entityType.id &&
               other.lineText === this.lineText;
    }

    toDOM(_view: unknown): HTMLElement {
        // TODO: implement button using createEl; wire click → NoteCreator
        const btn = document.createElement('button');
        btn.textContent = `→ ${this.entityType.name}`;
        return btn;
    }
}
