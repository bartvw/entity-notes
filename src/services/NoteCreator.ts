import { normalizePath } from 'obsidian';
import type { App, TFile } from 'obsidian';
import type { EntityType, PluginSettings } from '../types';

type FrontmatterOptions = Pick<PluginSettings, 'includeTitle' | 'includeEntityType' | 'includeTags' | 'includeCreated' | 'includeSourceNote'>;

export interface NoteCreatorResult {
    /** The created TFile. */
    file: TFile;
    /** The final note title after collision resolution. */
    title: string;
    /** The source line rewritten with the trigger tag removed and wikilink appended. */
    modifiedLine: string;
}

export class NoteCreator {
    constructor(private readonly app: App) {}

    /**
     * Creates the entity note and returns metadata needed to rewrite the source line.
     *
     * @param lineText      Full text of the matched editor line.
     * @param entityType    The matched entity type.
     * @param sourceNotePath Path of the note that contains the line (may be '' for unsaved notes).
     * @param date          ISO date string (YYYY-MM-DD). Defaults to today; injectable for tests.
     */
    async create(
        lineText: string,
        entityType: EntityType,
        sourceNotePath: string,
        options: FrontmatterOptions,
        date = NoteCreator.today(),
    ): Promise<NoteCreatorResult> {
        const rawTitle = NoteCreator.deriveTitle(lineText, entityType.triggerTag);
        const sourceNoteName = NoteCreator.resolveSourceNoteName(sourceNotePath);

        const targetFolder = normalizePath(entityType.targetFolder);
        await this.ensureFolder(targetFolder);

        const { filePath, title } = this.resolveFilePath(targetFolder, rawTitle);
        const content = NoteCreator.buildContent(title, entityType, sourceNoteName, date, options);
        const file = await this.app.vault.create(filePath, content);
        const modifiedLine = NoteCreator.buildModifiedLine(lineText, entityType.triggerTag, title);

        return { file, title, modifiedLine };
    }

    // ---------------------------------------------------------------------------
    // Static pure helpers — all testable without an Obsidian App instance
    // ---------------------------------------------------------------------------

    /**
     * Derives the note title from a matched editor line:
     * strips the trigger tag, strips leading markdown list / task markers,
     * normalises whitespace, then sanitises the result for use as a filename.
     */
    static deriveTitle(lineText: string, triggerTag: string): string {
        const re = NoteCreator.tagRegex(triggerTag);
        let s = lineText.replace(re, ' ').trim();

        // Strip leading list / task markers (same order as PatternMatcher)
        s = s.replace(/^\d+[.)]\s*/, '').trim();   // "1. " / "1)"
        s = s.replace(/^[-*+]\s*/, '').trim();     // "- " / "* " / "+ "
        s = s.replace(/^\[[ xX]\]\s*/, '').trim(); // "[ ] " / "[x] "

        s = s.replace(/\s+/g, ' ').trim();

        return NoteCreator.sanitizeFilename(s);
    }

    /**
     * Removes characters that Obsidian forbids in filenames: * " \ / < > : | ?
     */
    static sanitizeFilename(title: string): string {
        return title.replace(/[*"\\/<>:|?]/g, '').trim();
    }

    /**
     * Replaces the entire source line with just `[[noteTitle]]`, preserving
     * any leading whitespace (indentation) and list marker (e.g. `  - `).
     */
    static buildModifiedLine(lineText: string, _triggerTag: string, noteTitle: string): string {
        const listMarkerMatch = lineText.match(/^(\s*)([-*+]|\d+[.)]) /);
        const prefix = listMarkerMatch ? `${listMarkerMatch[1]}${listMarkerMatch[2]} ` : '';
        return `${prefix}[[${noteTitle}]]`;
    }

    /**
     * Builds the full note content (YAML frontmatter block + empty body).
     */
    static buildContent(
        title: string,
        entityType: EntityType,
        sourceNoteName: string,
        date: string,
        options: FrontmatterOptions,
    ): string {
        return NoteCreator.buildFrontmatter(title, entityType, sourceNoteName, date, options) + '\n';
    }

    /**
     * Builds the YAML frontmatter string.
     *
     * Standard fields always win over conflicting keys in frontmatterTemplate.
     * The tags list is seeded with the entity type id; any tags in
     * frontmatterTemplate are merged in rather than replacing.
     */
    static buildFrontmatter(
        title: string,
        entityType: EntityType,
        sourceNoteName: string,
        date: string,
        options: FrontmatterOptions,
    ): string {
        const STANDARD_KEYS = new Set(['title', 'entity-type', 'tags', 'created', 'source-note']);

        // Build tags: seed with entity id, then merge from template
        const tags: string[] = [entityType.id];
        const templateTags = entityType.frontmatterTemplate['tags'];
        if (Array.isArray(templateTags)) {
            for (const t of templateTags) {
                if (typeof t === 'string' && !tags.includes(t)) tags.push(t);
            }
        } else if (typeof templateTags === 'string' && !tags.includes(templateTags)) {
            tags.push(templateTags);
        }

        const lines: string[] = ['---'];
        if (options.includeTitle)      lines.push(`title: "${escapeYamlString(title)}"`);
        if (options.includeEntityType) lines.push(`entity-type: "${entityType.id}"`);
        if (options.includeTags) {
            lines.push('tags:', ...tags.map(t => `  - ${t}`));
        }
        if (options.includeCreated)    lines.push(`created: "${date}"`);
        if (options.includeSourceNote) lines.push(`source-note: "[[${sourceNoteName}]]"`);

        // Append non-standard template fields in insertion order
        for (const [key, value] of Object.entries(entityType.frontmatterTemplate)) {
            if (STANDARD_KEYS.has(key)) continue;
            lines.push(serializeYamlField(key, value));
        }

        lines.push('---');
        return lines.join('\n');
    }

    /**
     * Returns the note name to embed in the source-note field.
     * Strips leading path segments and the .md extension.
     * Falls back to 'Untitled' for empty / unsaved paths.
     */
    static resolveSourceNoteName(sourceNotePath: string): string {
        if (!sourceNotePath) return 'Untitled';
        const basename = sourceNotePath.split('/').pop() ?? '';
        return basename.replace(/\.md$/i, '') || 'Untitled';
    }

    /** Returns today's local date as YYYY-MM-DD. */
    static today(): string {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // ---------------------------------------------------------------------------
    // Private instance helpers — require vault access
    // ---------------------------------------------------------------------------

    private async ensureFolder(folderPath: string): Promise<void> {
        if (this.app.vault.getAbstractFileByPath(folderPath)) return;
        await this.app.vault.createFolder(folderPath);
    }

    /**
     * Resolves a collision-free file path within targetFolder.
     * If `<title>.md` exists, tries `<title> 2.md`, `<title> 3.md`, …
     */
    private resolveFilePath(
        targetFolder: string,
        title: string,
    ): { filePath: string; title: string } {
        const base = `${targetFolder}/${title}`;
        if (!this.app.vault.getAbstractFileByPath(`${base}.md`)) {
            return { filePath: `${base}.md`, title };
        }
        for (let n = 2; ; n++) {
            const candidate = `${title} ${n}`;
            if (!this.app.vault.getAbstractFileByPath(`${targetFolder}/${candidate}.md`)) {
                return { filePath: `${targetFolder}/${candidate}.md`, title: candidate };
            }
        }
    }

    private static tagRegex(tag: string): RegExp {
        const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(?<!\\S)${escaped}(?![a-zA-Z0-9_\\-\\/])`, 'g');
    }
}

// ---------------------------------------------------------------------------
// YAML serialisation helpers (module-private)
// ---------------------------------------------------------------------------

function escapeYamlString(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function serializeYamlValue(value: unknown, indent = ''): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return `"${escapeYamlString(value)}"`;
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        return value
            .map(item => `\n${indent}  - ${serializeYamlValue(item, `${indent}  `)}`)
            .join('');
    }
    // Fallback for unexpected types
    return JSON.stringify(value);
}

function serializeYamlField(key: string, value: unknown): string {
    if (value === null || value === undefined) return `${key}: null`;
    if (Array.isArray(value)) {
        if (value.length === 0) return `${key}: []`;
        const items = value.map(item => `  - ${serializeYamlValue(item)}`);
        return [`${key}:`, ...items].join('\n');
    }
    return `${key}: ${serializeYamlValue(value)}`;
}
