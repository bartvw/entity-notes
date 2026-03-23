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

export interface PluginSettings {
    entityTypes: EntityType[];
    convertOnEnter: boolean;
    includeTitle: boolean;
    includeEntityType: boolean;
    includeTags: boolean;
    includeCreated: boolean;
    includeSourceNote: boolean;
}
