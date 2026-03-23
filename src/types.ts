export interface EntityType {
    id: string;
    name: string;
    triggerTag: string;
    targetFolder: string;
    color: string;
    enabled: boolean;
    frontmatterTemplate: Record<string, unknown>;
    basesFile?: string;
}

export interface FrontmatterField {
    enabled: boolean;
    name: string;
}

export interface PluginSettings {
    entityTypes: EntityType[];
    convertOnEnter: boolean;
    titleField: FrontmatterField;
    entityTypeField: FrontmatterField;
    tagsField: FrontmatterField;
    createdField: FrontmatterField;
    sourceNoteField: FrontmatterField;
}
