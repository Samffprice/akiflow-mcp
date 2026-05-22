/**
 * Akiflow API Client
 * Adapted from Raycast extension by @shrimpwtf
 */
import axios from "axios";
import { SyncStore, } from "./sync-store.js";
export class AkiflowClient {
    refreshToken;
    accessToken = "";
    tokenPromise = null;
    TASKS_URL = "https://api.akiflow.com/v5/tasks";
    PROJECTS_URL = "https://api.akiflow.com/v5/labels";
    TAGS_URL = "https://api.akiflow.com/v5/tags";
    EVENTS_URL = "https://api.akiflow.com/v5/events";
    // Event reads use v5 (GET), but writes must POST to the v3 endpoint.
    EVENTS_WRITE_URL = "https://api.akiflow.com/v3/events";
    CALENDARS_URL = "https://api.akiflow.com/v5/calendars";
    TIME_SLOTS_URL = "https://api.akiflow.com/v5/time_slots";
    AKI_API_URL = "https://aki.akiflow.com/api/v1";
    TOKEN_URL = "https://web.akiflow.com/oauth/refreshToken";
    headers = {
        "Akiflow-Platform": "mac",
        Authorization: "",
        Referer: "https://web.akiflow.com/app/stable/29a83ee24d87ff96/static/js/801.chunk.js",
        "Akiflow-Client-Id": "b4edaac3-5dc7-4b20-bf58-de51efc2bec4",
        "Akiflow-Version": "2.71.5",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    projects = {};
    tags = {};
    syncStore = new SyncStore();
    constructor(refreshToken) {
        this.refreshToken = refreshToken;
    }
    /**
     * Get access token from refresh token
     */
    async getAccessToken() {
        const response = await axios.post(this.TOKEN_URL, {
            client_id: "10",
            refresh_token: this.refreshToken,
        }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        });
        if (response.status === 200 && response.data.access_token) {
            return response.data.access_token;
        }
        throw new Error(`Failed to get access token: ${response.status}`);
    }
    /**
     * Ensure we have a valid access token
     */
    async ensureToken() {
        if (!this.tokenPromise) {
            this.tokenPromise = (async () => {
                this.accessToken = await this.getAccessToken();
                this.headers.Authorization = `Bearer ${this.accessToken}`;
            })();
        }
        await this.tokenPromise;
    }
    /**
     * Make authenticated API request with auto-retry on 401
     */
    async request(method, url, data) {
        await this.ensureToken();
        try {
            const response = await axios.request({
                method,
                url,
                headers: this.headers,
                data,
            });
            return response.data;
        }
        catch (error) {
            // Token expired, refresh and retry once
            if (error.response?.status === 401) {
                this.tokenPromise = null;
                await this.ensureToken();
                const response = await axios.request({
                    method,
                    url,
                    headers: this.headers,
                    data,
                });
                return response.data;
            }
            throw error;
        }
    }
    async syncV5Collection(key, url, isDeleted, extraParams) {
        await this.syncStore.init();
        const state = this.syncStore.getV5State(key);
        let merged = { ...state.itemsById };
        const runSync = async (syncToken) => {
            let nextSyncToken = syncToken ?? null;
            let pageToken = syncToken;
            const seen = new Set();
            for (;;) {
                const params = new URLSearchParams({ limit: "2500", ...(extraParams ?? {}) });
                if (pageToken) {
                    params.set("sync_token", pageToken);
                }
                const response = await this.request("GET", `${url}?${params.toString()}`);
                for (const item of response.data ?? []) {
                    const id = item.id;
                    if (!id)
                        continue;
                    if (isDeleted(item)) {
                        delete merged[id];
                    }
                    else {
                        merged[id] = item;
                    }
                }
                nextSyncToken = response.sync_token ?? nextSyncToken;
                if (!response.has_next_page || !response.sync_token) {
                    break;
                }
                if (seen.has(response.sync_token)) {
                    break;
                }
                seen.add(response.sync_token);
                pageToken = response.sync_token;
            }
            return nextSyncToken;
        };
        let syncToken = state.syncToken;
        try {
            syncToken = await runSync(state.syncToken ?? undefined);
        }
        catch (error) {
            if (state.syncToken && error.response?.status === 400) {
                merged = {};
                syncToken = await runSync();
            }
            else {
                throw error;
            }
        }
        await this.syncStore.setV5State(key, {
            itemsById: merged,
            syncToken,
            updatedAt: new Date().toISOString(),
        });
        return Object.values(merged);
    }
    /**
     * Akiflow's PATCH endpoints return the upserted records wrapped in an
     * object envelope (e.g. { data: [...] }), not a bare array. Normalize the
     * response to an array so cache merges and tool responses behave correctly.
     */
    asList(response) {
        if (Array.isArray(response))
            return response;
        if (response && typeof response === "object") {
            if (Array.isArray(response.data))
                return response.data;
            if (Array.isArray(response.items))
                return response.items;
            if (typeof response.id === "string")
                return [response];
        }
        return [];
    }
    async mergeV5Items(key, items, isDeleted) {
        await this.syncStore.init();
        const state = this.syncStore.getV5State(key);
        const itemsById = { ...state.itemsById };
        for (const item of items) {
            const id = item.id;
            if (!id)
                continue;
            if (isDeleted(item)) {
                delete itemsById[id];
            }
            else {
                itemsById[id] = item;
            }
        }
        await this.syncStore.setV5State(key, {
            itemsById,
            syncToken: state.syncToken,
            updatedAt: new Date().toISOString(),
        });
    }
    async refreshAkiCollection(key, fetchPage, isDeleted, maxAgeMs = 60_000) {
        await this.syncStore.init();
        const state = this.syncStore.getAkiState(key);
        const updatedAtMs = state.updatedAt ? Date.parse(state.updatedAt) : 0;
        if (updatedAtMs && Date.now() - updatedAtMs < maxAgeMs) {
            return Object.values(state.itemsById);
        }
        const itemsById = {};
        let cursor;
        const seen = new Set();
        for (;;) {
            const response = await fetchPage(cursor);
            for (const item of response.data ?? []) {
                if (isDeleted(item))
                    continue;
                itemsById[item.id] = item;
            }
            cursor = response.next_cursor ?? undefined;
            if (!cursor || seen.has(cursor))
                break;
            seen.add(cursor);
        }
        await this.syncStore.setAkiState(key, {
            itemsById,
            updatedAt: new Date().toISOString(),
        });
        return Object.values(itemsById);
    }
    async mergeAkiItem(key, item) {
        await this.syncStore.init();
        const state = this.syncStore.getAkiState(key);
        await this.syncStore.setAkiState(key, {
            itemsById: {
                ...state.itemsById,
                [item.id]: item,
            },
            updatedAt: new Date().toISOString(),
        });
    }
    /**
     * Validate task parameters
     */
    validateTask(task) {
        if (task.priority !== undefined &&
            task.priority !== null &&
            ![-1, 1, 2, 3].includes(task.priority)) {
            throw new Error(`Invalid priority: ${task.priority}. Valid: -1 (goal), 1 (high), 2 (medium), 3 (low), null (none)`);
        }
        if (task.status !== undefined && ![1, 2, 4, 7, 10].includes(task.status)) {
            throw new Error(`Invalid status: ${task.status}. Valid: 1 (Inbox), 2 (Planned), 4 (Snoozed), 7 (Someday), 10 (Scheduled)`);
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (task.date && !dateRegex.test(task.date)) {
            throw new Error(`Invalid date format: ${task.date}. Expected: YYYY-MM-DD`);
        }
        if (task.due_date && !dateRegex.test(task.due_date)) {
            throw new Error(`Invalid due_date format: ${task.due_date}. Expected: YYYY-MM-DD`);
        }
    }
    /**
     * Get all tasks
     */
    async getTasks() {
        return {
            data: await this.syncV5Collection("tasks", this.TASKS_URL, (task) => !!task.deleted_at || !!task.trashed_at),
        };
    }
    /**
     * Create a new task (uses PATCH with client-side generated UUID)
     */
    async createTask(task) {
        if (!task.title) {
            throw new Error("'title' is required for creating a task");
        }
        this.validateTask(task);
        const now = new Date();
        const nowISO = now.toISOString();
        const sorting = now.getTime();
        const newTask = {
            id: crypto.randomUUID(),
            status: task.status ?? 1,
            title: task.title,
            sorting,
            sorting_label: sorting,
            duration: task.duration ?? 0,
            date: task.date ?? null,
            datetime: task.datetime ?? null,
            plan_unit: null,
            plan_period: null,
            tags_ids: task.tags_ids ?? null,
            time_slot_id: null,
            links: [],
            done: false,
            done_at: null,
            datetime_tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
            data: {},
            original_date: null,
            original_datetime: null,
            recurring_id: null,
            recurrence: null,
            search_text: "",
            due_date: task.due_date ?? null,
            calendar_id: null,
            recurrence_version: null,
            content: null,
            origin: null,
            connector_id: null,
            origin_id: null,
            origin_account_id: null,
            doc: null,
            trashed_at: null,
            global_created_at: nowISO,
            deleted_at: null,
            global_updated_at: nowISO,
            global_list_id_updated_at: null,
            global_tags_ids_updated_at: null,
            // Optional fields from input
            ...(task.description && { description: task.description }),
            ...(task.priority !== undefined && { priority: task.priority }),
            ...(task.listId && { listId: task.listId }),
        };
        const result = this.asList(await this.request("PATCH", this.TASKS_URL, [newTask]));
        await this.mergeV5Items("tasks", result, (task) => !!task.deleted_at || !!task.trashed_at);
        return result;
    }
    /**
     * Update existing task(s)
     */
    async updateTasks(tasks) {
        for (const task of tasks) {
            if (!task.id) {
                throw new Error("'id' is required for updating a task");
            }
            this.validateTask(task);
        }
        const result = this.asList(await this.request("PATCH", this.TASKS_URL, tasks));
        await this.mergeV5Items("tasks", result, (task) => !!task.deleted_at || !!task.trashed_at);
        return result;
    }
    /**
     * Update a single task
     */
    async updateTask(task) {
        return this.updateTasks([task]);
    }
    /**
     * Mark task as done
     */
    async markTaskDone(taskId) {
        const now = new Date().toISOString();
        return this.updateTask({
            id: taskId,
            done: true,
            done_at: now,
            global_updated_at: now,
        });
    }
    /**
     * Get all projects (labels)
     */
    async getProjects() {
        const response = {
            data: await this.syncV5Collection("projects", this.PROJECTS_URL, (project) => !!project.deleted_at),
        };
        // Build projects cache
        this.projects = {};
        for (const project of response.data) {
            if (project.deleted_at === null) {
                this.projects[project.id] = project;
            }
        }
        return response;
    }
    /**
     * Get all tags
     */
    async getTags() {
        const response = {
            data: await this.syncV5Collection("tags", this.TAGS_URL, (tag) => !!tag.deleted_at),
        };
        // Build tags cache
        this.tags = {};
        for (const tag of response.data) {
            if (tag.deleted_at === null) {
                this.tags[tag.id] = tag;
            }
        }
        return response;
    }
    /**
     * Get calendar events (v5)
     */
    async getEvents() {
        return {
            data: await this.syncV5Collection("events", this.EVENTS_URL, (event) => !!event.deleted_at),
        };
    }
    /**
     * Create a new event (uses PATCH with client-side generated UUID)
     */
    async createEvent(event) {
        if (!event.title) {
            throw new Error("'title' is required for creating an event");
        }
        if (!event.calendar_id) {
            throw new Error("'calendar_id' is required for creating an event");
        }
        if (!event.start_datetime) {
            throw new Error("'start_datetime' is required for creating an event");
        }
        if (!event.end_datetime) {
            throw new Error("'end_datetime' is required for creating an event");
        }
        const nowISO = new Date().toISOString();
        // Event writes must carry the target calendar's account/origin identity,
        // so resolve the calendar from the calendar list first.
        const calendars = await this.getCalendars();
        const calendar = calendars.data.find((c) => c.id === event.calendar_id);
        if (!calendar) {
            throw new Error(`Calendar ${event.calendar_id} not found. Use get-calendars to list valid calendars.`);
        }
        if (calendar.read_only) {
            throw new Error(`Calendar "${calendar.title}" is read-only. Pick a writable calendar.`);
        }
        const allDay = event.all_day ?? false;
        const toUtc = (s) => `${new Date(s).toISOString().slice(0, 19)}.000Z`;
        const newEvent = {
            id: crypto.randomUUID(),
            title: event.title,
            description: event.description ?? null,
            start_time: allDay ? null : toUtc(event.start_datetime),
            end_time: allDay ? null : toUtc(event.end_datetime),
            start_date: allDay ? event.start_datetime.split("T")[0] : null,
            end_date: allDay ? event.end_datetime.split("T")[0] : null,
            status: "confirmed",
            start_datetime_tz: calendar.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            end_datetime_tz: null,
            creator_id: calendar.origin_id,
            organizer_id: calendar.origin_id,
            origin_id: null,
            connector_id: calendar.connector_id,
            akiflow_account_id: calendar.akiflow_account_id,
            origin_account_id: calendar.origin_account_id,
            recurring_id: null,
            origin_recurring_id: null,
            calendar_id: event.calendar_id,
            origin_calendar_id: calendar.origin_id,
            original_start_time: null,
            original_start_date: null,
            origin_updated_at: null,
            etag: null,
            content: { sendUpdates: "all" },
            attendees: event.attendees ?? [],
            recurrence: null,
            recurrence_exception: false,
            declined: false,
            read_only: false,
            hidden: false,
            url: null,
            meeting_status: null,
            meeting_url: null,
            meeting_icon: null,
            meeting_solution: null,
            color: null,
            calendar_color: calendar.color ?? null,
            task_id: null,
            time_slot_id: null,
            recurrence_exception_delete: false,
            recurrence_sync_retry: null,
            errors: null,
            global_created_at: null,
            deleted_at: null,
            global_updated_at: nowISO,
            ...(event.location && { location: event.location }),
        };
        const result = this.asList(await this.request("POST", this.EVENTS_WRITE_URL, [newEvent]));
        await this.mergeV5Items("events", result, (event) => !!event.deleted_at);
        return result;
    }
    /**
     * Update event(s)
     */
    async updateEvents(events) {
        for (const event of events) {
            if (!event.id) {
                throw new Error("'id' is required for updating an event");
            }
        }
        // v3 event writes need the full event object, so merge each change over the
        // cached event. Refresh the cache from the API if any target is missing.
        await this.syncStore.init();
        let cached = this.syncStore.getV5State("events").itemsById;
        if (events.some((e) => !cached[e.id])) {
            await this.getEvents();
            cached = this.syncStore.getV5State("events").itemsById;
        }
        const nowISO = new Date().toISOString();
        const toUtc = (s) => `${new Date(s).toISOString().slice(0, 19)}.000Z`;
        const payload = events.map((e) => {
            const existing = cached[e.id];
            if (!existing) {
                throw new Error(`Event ${e.id} not found. Use get-events to load it before editing.`);
            }
            const merged = { ...existing };
            if (e.title !== undefined)
                merged.title = e.title;
            if (e.description !== undefined)
                merged.description = e.description;
            if (e.location !== undefined)
                merged.location = e.location;
            const allDay = e.all_day ?? merged.all_day ?? false;
            if (e.start_datetime !== undefined) {
                merged.start_time = allDay ? null : toUtc(e.start_datetime);
                merged.start_date = allDay ? e.start_datetime.split("T")[0] : null;
            }
            if (e.end_datetime !== undefined) {
                merged.end_time = allDay ? null : toUtc(e.end_datetime);
                merged.end_date = allDay ? e.end_datetime.split("T")[0] : null;
            }
            // Drop convenience aliases that are not real event columns.
            delete merged.start_datetime;
            delete merged.end_datetime;
            delete merged.all_day;
            merged.global_updated_at = nowISO;
            return merged;
        });
        const result = this.asList(await this.request("POST", this.EVENTS_WRITE_URL, payload));
        await this.mergeV5Items("events", result, (event) => !!event.deleted_at);
        return result;
    }
    /**
     * Update a single event
     */
    async updateEvent(event) {
        return this.updateEvents([event]);
    }
    /**
     * Get calendars
     */
    async getCalendars() {
        return {
            data: await this.syncV5Collection("calendars", this.CALENDARS_URL, (calendar) => calendar.deleted_at !== null && calendar.deleted_at !== undefined, { with_deleted: "false" }),
        };
    }
    /**
     * Get time slots
     */
    async getTimeSlots() {
        return {
            data: await this.syncV5Collection("timeSlots", this.TIME_SLOTS_URL, (slot) => !!slot.deleted_at),
        };
    }
    /**
     * Create a new time slot (uses PATCH with client-side generated UUID)
     */
    async createTimeSlot(slot) {
        if (!slot.title) {
            throw new Error("'title' is required for creating a time slot");
        }
        if (!slot.calendar_id) {
            throw new Error("'calendar_id' is required for creating a time slot");
        }
        if (!slot.start_time) {
            throw new Error("'start_time' is required for creating a time slot");
        }
        if (!slot.end_time) {
            throw new Error("'end_time' is required for creating a time slot");
        }
        const nowISO = new Date().toISOString();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const newSlot = {
            id: crypto.randomUUID(),
            title: slot.title,
            start_time: slot.start_time,
            end_time: slot.end_time,
            calendar_id: slot.calendar_id,
            start_datetime_tz: timezone,
            status: "confirmed",
            data: {},
            recurring_id: null,
            label_id: slot.label_id ?? null,
            section_id: null,
            recurrence: null,
            global_created_at: nowISO,
            deleted_at: null,
            global_updated_at: nowISO,
            global_label_id_updated_at: null,
        };
        const result = this.asList(await this.request("PATCH", this.TIME_SLOTS_URL, [newSlot]));
        await this.mergeV5Items("timeSlots", result, (slot) => !!slot.deleted_at);
        return result;
    }
    /**
     * Update time slot(s)
     */
    async updateTimeSlots(slots) {
        for (const slot of slots) {
            if (!slot.id) {
                throw new Error("'id' is required for updating a time slot");
            }
        }
        const result = this.asList(await this.request("PATCH", this.TIME_SLOTS_URL, slots));
        await this.mergeV5Items("timeSlots", result, (slot) => !!slot.deleted_at);
        return result;
    }
    /**
     * Update a single time slot
     */
    async updateTimeSlot(slot) {
        return this.updateTimeSlots([slot]);
    }
    async getRecordings(cursor, perPage = 100) {
        const params = new URLSearchParams({ per_page: String(perPage) });
        if (cursor)
            params.set("cursor", cursor);
        return this.request("GET", `${this.AKI_API_URL}/recordings?${params.toString()}`);
    }
    async getAllRecordings() {
        return this.refreshAkiCollection("recordings", (cursor) => this.getRecordings(cursor), (recording) => !!recording.deletedAt || !!recording.trashedAt);
    }
    async getRecording(id) {
        const response = await this.request("GET", `${this.AKI_API_URL}/recordings/${id}`);
        await this.mergeAkiItem("recordings", response.data);
        return response;
    }
    async getRecordingAudio(id) {
        await this.ensureToken();
        const response = await (await import("axios")).default.get(`${this.AKI_API_URL}/recordings/audio/${id}`, { headers: this.headers, responseType: "arraybuffer" });
        return response.data;
    }
    async createTaskFromActionItem(recordingId, actionItemId) {
        return this.request("POST", `${this.AKI_API_URL}/recordings/createTaskFromActionItem/${recordingId}/${actionItemId}`);
    }
    async generateFollowupEmail(recordingId, data) {
        return this.request("POST", `${this.AKI_API_URL}/recordings/generateFollowupEmail/${recordingId}`, data);
    }
    async getMeetingBriefs(cursor, perPage = 100) {
        const params = new URLSearchParams({ per_page: String(perPage) });
        if (cursor)
            params.set("cursor", cursor);
        return this.request("GET", `${this.AKI_API_URL}/researches?${params.toString()}`);
    }
    async getAllMeetingBriefs() {
        return this.refreshAkiCollection("meetingBriefs", (cursor) => this.getMeetingBriefs(cursor), (brief) => !!brief.deletedAt);
    }
    async getMeetingBrief(id) {
        const response = await this.request("GET", `${this.AKI_API_URL}/researches/${id}`);
        await this.mergeAkiItem("meetingBriefs", response.data);
        return response;
    }
}
