export interface EntityType {
    id: string;
    name: string;
    triggerTag: string;
    targetFolder: string;
    color: string;
    enabled: boolean;
    includeTitle: boolean;
    includeSourceNote: boolean;
    frontmatterTemplate: Record<string, unknown>;
    basesFile?: string;
}

export interface PluginSettings {
    entityTypes: EntityType[];
    convertOnEnter: boolean;
}
