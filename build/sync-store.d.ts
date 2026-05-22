export type V5CacheKey = "tasks" | "projects" | "tags" | "events" | "calendars" | "timeSlots";
export type AkiCacheKey = "recordings" | "meetingBriefs";
export interface V5EntityState<T> {
    itemsById: Record<string, T>;
    syncToken: string | null;
    updatedAt: string | null;
}
export interface AkiEntityState<T> {
    itemsById: Record<string, T>;
    updatedAt: string | null;
}
export declare class SyncStore {
    private readonly filePath;
    private state;
    private initPromise;
    constructor(filePath?: string);
    init(): Promise<void>;
    getV5State<T>(key: V5CacheKey): V5EntityState<T>;
    getAkiState<T>(key: AkiCacheKey): AkiEntityState<T>;
    setV5State<T>(key: V5CacheKey, value: V5EntityState<T>): Promise<void>;
    setAkiState<T>(key: AkiCacheKey, value: AkiEntityState<T>): Promise<void>;
    private load;
    private save;
}
