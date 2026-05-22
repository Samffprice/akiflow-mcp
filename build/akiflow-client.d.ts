/**
 * Akiflow API Client
 * Adapted from Raycast extension by @shrimpwtf
 */
export interface TaskDoc {
    parent_task_id?: string | null;
    parent_task_name?: string | null;
    team_id?: string;
    team_name?: string;
    space_id?: string;
    space_name?: string;
    folder_id?: string | null;
    folder_name?: string | null;
    list_id?: string;
    list_name?: string;
    url?: string;
    local_url?: string;
    created_at?: string;
    updated_at?: string;
    hash?: string;
    identifier?: string;
    title?: string;
    status?: string;
    priority_label?: string;
    project_id?: string;
    project_name?: string;
    assignee_id?: string;
    assignee_name?: string;
    labels?: string[];
    due_at?: string;
    mutable_id?: string;
}
export interface TaskContent {
    preventAutoCalendarLock?: boolean;
    aiListId?: string | null;
    aiListIdPredictedAt?: number;
    aiMethod?: number | null;
    shouldMarkAsDoneRemote?: boolean;
}
export interface TaskLink {
    url?: string;
    title?: string;
}
export interface Task {
    id?: string;
    user_id?: number;
    recurring_id?: string | null;
    title?: string;
    description?: string | null;
    date?: string | null;
    datetime?: string | null;
    datetime_tz?: string;
    original_date?: string | null;
    original_datetime?: string | null;
    duration?: number | null;
    recurrence?: string | null;
    recurrence_version?: string | null;
    status?: number;
    priority?: number | null;
    dailyGoal?: number | null;
    done?: boolean;
    done_at?: string | null;
    read_at?: string | null;
    listId?: string | null;
    section_id?: string | null;
    tags_ids?: string[] | null;
    sorting?: number;
    sorting_label?: number | null;
    origin?: string | null;
    due_date?: string | null;
    connector_id?: string | null;
    origin_id?: string | null;
    origin_account_id?: string | null;
    akiflow_account_id?: string | null;
    doc?: TaskDoc | null;
    calendar_id?: string | null;
    time_slot_id?: string | null;
    links?: TaskLink[];
    content?: TaskContent | null;
    trashed_at?: string | null;
    plan_unit?: string | null;
    plan_period?: string | null;
    search_text?: string;
    global_list_id_updated_at?: string | null;
    global_tags_ids_updated_at?: string | null;
    global_created_at?: string;
    global_updated_at?: string;
    data?: Record<string, unknown>;
    deleted_at?: string | null;
}
export interface Project {
    id: string;
    user_id: number;
    parent_id: string | null;
    title: string | null;
    icon: string | null;
    color: string | null;
    sorting: number | null;
    type: "folder" | null;
    global_created_at: string;
    global_updated_at: string;
    data: Record<string, unknown>;
    deleted_at: string | null;
}
export interface Tag {
    id: string;
    user_id: number;
    title: string;
    sorting: number;
    global_created_at: string;
    global_updated_at: string;
    data: Record<string, unknown>;
    deleted_at: string | null;
}
export interface CalendarContent {
    colorId: string;
    freeBusy: boolean;
    backgroundColor: string;
    foregroundColor: string;
}
export interface CalendarSettings {
    visible?: boolean;
    notificationsEnabled?: boolean;
    visibleMobile?: boolean;
    notificationsEnabledMobile?: boolean;
}
export interface CalendarFingerprints {
    colorId: string;
    backgroundColor: string;
    foregroundColor: string;
}
export interface Calendar {
    id: string;
    user_id: number;
    origin_id: string;
    connector_id: string;
    akiflow_account_id: string;
    origin_account_id: string;
    etag: string;
    title: string;
    description: string | null;
    content: CalendarContent;
    primary: boolean;
    akiflow_primary: boolean;
    read_only: boolean;
    url: string;
    color: string;
    icon: unknown;
    sync_status: unknown;
    settings: CalendarSettings;
    webhook_id: string | null;
    webhook_resource_id: string | null;
    global_updated_at: string;
    global_created_at: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: unknown;
    timezone: string;
    last_synced_at: string | null;
    webhook_updated_at: string | null;
    sync_token: string | null;
    fingerprints: CalendarFingerprints;
    hidden_at: unknown;
    clear_job_id: unknown;
    stored_visible_any: boolean;
    data: string;
    change_id: number;
}
export interface TimeSlot {
    id: string;
    user_id?: number;
    recurring_id?: string | null;
    calendar_id: string;
    label_id?: string | null;
    section_id?: string | null;
    status?: string;
    title: string;
    description?: string | null;
    original_start_time?: string | null;
    start_time: string;
    end_time: string;
    start_datetime_tz?: string;
    recurrence?: string | null;
    color?: string | null;
    content?: Record<string, unknown>;
    global_label_id_updated_at?: string | null;
    global_created_at?: string;
    global_updated_at?: string;
    data?: Record<string, unknown>;
    deleted_at?: string | null;
}
export interface EventAttendee {
    email: string;
    name?: string;
    response_status?: string;
    self?: boolean;
    organizer?: boolean;
}
export interface EventRecurrence {
    rule?: string;
    exceptions?: string[];
}
export interface Event {
    id: string;
    user_id: number;
    calendar_id: string;
    origin_id: string;
    connector_id: string;
    akiflow_account_id: string;
    origin_account_id: string;
    etag?: string;
    title: string;
    description: string | null;
    location?: string | null;
    start_datetime: string;
    end_datetime: string;
    start_date?: string | null;
    end_date?: string | null;
    timezone?: string;
    all_day: boolean;
    status?: string;
    visibility?: string;
    busy?: boolean;
    recurring_id?: string | null;
    recurrence?: EventRecurrence | null;
    attendees?: EventAttendee[];
    organizer?: EventAttendee;
    html_link?: string;
    content?: Record<string, unknown>;
    global_created_at: string;
    global_updated_at: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    change_id?: number;
}
export interface TranscriptTimestamp {
    absolute: string;
    relative: number;
}
export interface TranscriptEntry {
    duration: number;
    paragraph: string;
    speakerId: string;
    speakerName: string;
    startTimestamp: TranscriptTimestamp;
    endTimestamp: TranscriptTimestamp;
}
export interface ActionItem {
    id: string;
    title: string;
    dueDate?: string | null;
}
export interface RecordingData {
    title: string;
    startTime: string;
    endTime: string;
    summary?: string | null;
    transcript?: TranscriptEntry[];
    actionItems?: ActionItem[];
}
export interface FeedItem {
    id: string;
    userId: number;
    referenceType: string;
    referenceId: string;
    contentUpdatedAt: string;
    readAt: string | null;
    archiveAt: string;
    clearAt: string;
    lifecycleRules?: Record<string, unknown>;
    version: number;
    data: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    etag: string;
}
export interface Recording {
    id: string;
    userId: number;
    recallEventId: string;
    originEventId: string;
    akiflowAccountId: string;
    botId: string;
    data: RecordingData;
    duration: number;
    trashedAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    etag: string;
    feedItem: FeedItem;
}
export interface MeetingBrief {
    id: string;
    userId?: number;
    originEventId?: string;
    akiflowAccountId?: string;
    data?: Record<string, unknown>;
    feedItem?: FeedItem;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
    etag?: string;
}
export interface AkiPaginatedResponse<T> {
    data: T[];
    next_cursor?: string | null;
}
export declare class AkiflowClient {
    private refreshToken;
    private accessToken;
    private tokenPromise;
    private readonly TASKS_URL;
    private readonly PROJECTS_URL;
    private readonly TAGS_URL;
    private readonly EVENTS_URL;
    private readonly CALENDARS_URL;
    private readonly TIME_SLOTS_URL;
    private readonly AKI_API_URL;
    private readonly TOKEN_URL;
    private headers;
    projects: Record<string, Project>;
    tags: Record<string, Tag>;
    private readonly syncStore;
    constructor(refreshToken: string);
    /**
     * Get access token from refresh token
     */
    private getAccessToken;
    /**
     * Ensure we have a valid access token
     */
    private ensureToken;
    /**
     * Make authenticated API request with auto-retry on 401
     */
    private request;
    private syncV5Collection;
    /**
     * Akiflow's PATCH endpoints return the upserted records wrapped in an
     * object envelope (e.g. { data: [...] }), not a bare array. Normalize the
     * response to an array so cache merges and tool responses behave correctly.
     */
    private asList;
    private mergeV5Items;
    private refreshAkiCollection;
    private mergeAkiItem;
    /**
     * Validate task parameters
     */
    private validateTask;
    /**
     * Get all tasks
     */
    getTasks(): Promise<{
        data: Task[];
    }>;
    /**
     * Create a new task (uses PATCH with client-side generated UUID)
     */
    createTask(task: Task): Promise<Task[]>;
    /**
     * Update existing task(s)
     */
    updateTasks(tasks: Task[]): Promise<Task[]>;
    /**
     * Update a single task
     */
    updateTask(task: Task): Promise<Task[]>;
    /**
     * Mark task as done
     */
    markTaskDone(taskId: string): Promise<Task[]>;
    /**
     * Get all projects (labels)
     */
    getProjects(): Promise<{
        data: Project[];
    }>;
    /**
     * Get all tags
     */
    getTags(): Promise<{
        data: Tag[];
    }>;
    /**
     * Get calendar events (v5)
     */
    getEvents(): Promise<{
        data: Event[];
    }>;
    /**
     * Create a new event (uses PATCH with client-side generated UUID)
     */
    createEvent(event: {
        title: string;
        calendar_id: string;
        start_datetime: string;
        end_datetime: string;
        description?: string | null;
        location?: string | null;
        all_day?: boolean;
        attendees?: EventAttendee[] | null;
    }): Promise<Event[]>;
    /**
     * Update event(s)
     */
    updateEvents(events: Partial<Event>[]): Promise<Event[]>;
    /**
     * Update a single event
     */
    updateEvent(event: Partial<Event>): Promise<Event[]>;
    /**
     * Get calendars
     */
    getCalendars(): Promise<{
        data: Calendar[];
    }>;
    /**
     * Get time slots
     */
    getTimeSlots(): Promise<{
        data: TimeSlot[];
    }>;
    /**
     * Create a new time slot (uses PATCH with client-side generated UUID)
     */
    createTimeSlot(slot: {
        title: string;
        calendar_id: string;
        start_time: string;
        end_time: string;
        label_id?: string | null;
    }): Promise<TimeSlot[]>;
    /**
     * Update time slot(s)
     */
    updateTimeSlots(slots: Partial<TimeSlot>[]): Promise<TimeSlot[]>;
    /**
     * Update a single time slot
     */
    updateTimeSlot(slot: Partial<TimeSlot>): Promise<TimeSlot[]>;
    getRecordings(cursor?: string, perPage?: number): Promise<AkiPaginatedResponse<Recording>>;
    getAllRecordings(): Promise<Recording[]>;
    getRecording(id: string): Promise<{
        data: Recording;
    }>;
    getRecordingAudio(id: string): Promise<ArrayBuffer>;
    createTaskFromActionItem(recordingId: string, actionItemId: string): Promise<unknown>;
    generateFollowupEmail(recordingId: string, data?: Record<string, unknown>): Promise<unknown>;
    getMeetingBriefs(cursor?: string, perPage?: number): Promise<AkiPaginatedResponse<MeetingBrief>>;
    getAllMeetingBriefs(): Promise<MeetingBrief[]>;
    getMeetingBrief(id: string): Promise<{
        data: MeetingBrief;
    }>;
}
