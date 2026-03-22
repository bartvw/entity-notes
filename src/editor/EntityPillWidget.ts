import { WidgetType } from '@codemirror/view';
import type { EntityType } from '../types';

/**
 * CM6 WidgetType that renders a styled pill badge after a wikilink on a
 * converted entity line. Visual-only — never written to the file.
 */
export class EntityPillWidget extends WidgetType {
    constructor(private readonly entityType: EntityType) {
        super();
    }

    eq(other: EntityPillWidget): boolean {
        return (
            other.entityType.id === this.entityType.id &&
            other.entityType.color === this.entityType.color
        );
    }

    toDOM(): HTMLElement {
        const span = document.createElement('span');
        span.className = 'entity-notes-pill';
        span.textContent = this.entityType.name.toLowerCase();
        span.style.backgroundColor = this.entityType.color;
        return span;
    }

    ignoreEvent(): boolean {
        return true;
    }

    get estimatedHeight(): number {
        return -1; // inline widget
    }
}
