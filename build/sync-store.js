import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const emptyV5State = () => ({
    itemsById: {},
    syncToken: null,
    updatedAt: null,
});
const emptyAkiState = () => ({
    itemsById: {},
    updatedAt: null,
});
const createEmptyState = () => ({
    version: 1,
    v5: {
        tasks: emptyV5State(),
        projects: emptyV5State(),
        tags: emptyV5State(),
        events: emptyV5State(),
        calendars: emptyV5State(),
        timeSlots: emptyV5State(),
    },
    aki: {
        recordings: emptyAkiState(),
        meetingBriefs: emptyAkiState(),
    },
});
export class SyncStore {
    filePath;
    state = createEmptyState();
    initPromise = null;
    constructor(filePath) {
        this.filePath =
            filePath ?? path.join(os.homedir(), ".akiflow-mcp", "cache.json");
    }
    async init() {
        if (!this.initPromise) {
            this.initPromise = this.load();
        }
        await this.initPromise;
    }
    getV5State(key) {
        return this.state.v5[key];
    }
    getAkiState(key) {
        return this.state.aki[key];
    }
    async setV5State(key, value) {
        this.state.v5[key] = value;
        await this.save();
    }
    async setAkiState(key, value) {
        this.state.aki[key] = value;
        await this.save();
    }
    async load() {
        try {
            const raw = await readFile(this.filePath, "utf8");
            const parsed = JSON.parse(raw);
            this.state = {
                ...createEmptyState(),
                ...parsed,
                v5: {
                    ...createEmptyState().v5,
                    ...(parsed.v5 ?? {}),
                },
                aki: {
                    ...createEmptyState().aki,
                    ...(parsed.aki ?? {}),
                },
            };
        }
        catch {
            this.state = createEmptyState();
        }
    }
    async save() {
        await mkdir(path.dirname(this.filePath), { recursive: true });
        await writeFile(this.filePath, JSON.stringify(this.state, null, 2), "utf8");
    }
}
