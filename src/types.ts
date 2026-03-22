export interface EntityType {
    id: string;
    name: string;
    triggerTag: string;
    targetFolder: string;
    enabled: boolean;
    frontmatterTemplate: Record<string, unknown>;
    basesFile?: string;
}

export interface PluginSettings {
    entityTypes: EntityType[];
}
