# Akiflow MCP Server

MCP server for Akiflow task management with Meeting Assistant support.

> **This is a fork** of [`shrimpwtf/akiflow-mcp`](https://github.com/shrimpwtf/akiflow-mcp) (npm `@shrimpwtf/mcp-akiflow`) with fixes for broken write operations. See [What this fork fixes](#what-this-fork-fixes). It runs directly via `npx` from this repo — no separate publish step.

## Features

- Get tasks, events, calendars with filters
- Create and update tasks
- Schedule/unschedule tasks on calendar
- Mark tasks done
- List projects and tags
- **Meeting Assistant**: Get recordings with summaries, transcripts, and action items
- **Meeting Briefs**: Get pre-meeting research briefs
- **Action Items → Tasks**: Create Akiflow tasks directly from meeting action items
- Auto-refreshing authentication
- Persistent local cache with per-entity sync tokens for faster repeated queries

## Setup

### 1. Get Your Refresh Token

1. Open Akiflow web app (web.akiflow.com)
2. Open DevTools: `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux)
3. Go to **Network** tab
4. Refresh the page or wait for a `refreshToken` request
5. Copy the `refresh_token` value from the request/response

### 2. Configure MCP

This fork runs straight from GitHub via `npx` (no npm publish needed).

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`) or **Claude Code** (`~/.claude.json`):

```json
{
  "mcpServers": {
    "akiflow": {
      "command": "npx",
      "args": ["-y", "github:Samffprice/akiflow-mcp"],
      "env": {
        "AKIFLOW_REFRESH_TOKEN": "your_refresh_token_here"
      }
    }
  }
}
```

For a reproducible, pinned setup, target a specific commit instead of the default branch:

```json
"args": ["-y", "github:Samffprice/akiflow-mcp#<commit-sha>"]
```

**Claude Code CLI** one-liner (user scope, available in all projects):

```bash
claude mcp add akiflow -s user \
  -e AKIFLOW_REFRESH_TOKEN="your_refresh_token_here" \
  -- npx -y github:Samffprice/akiflow-mcp
```

> The compiled `build/` is committed to this repo, so `npx` runs it with no build step. The first launch will `git clone` and install dependencies, which takes a few seconds; subsequent launches are cached.

### What this fork fixes

Upstream `@shrimpwtf/mcp-akiflow@0.3.0` has two write-path bugs that this fork resolves:

1. **All write tools failed with `items is not iterable`.** Akiflow's V5 `PATCH` endpoints return a wrapped envelope (`{ success, message, data: [...] }`), but the code passed the whole object into the cache merge, which expected an array. The write actually succeeded server-side, so retries created duplicates. Fixed by unwrapping the response (`asList()`) at every write site — `add-task`, `edit-task`, `mark-done`, events, and time slots. (Same root cause as upstream PR #1.)

2. **`add-event` / `edit-event` never worked (HTTP 405).** Event writes were sent as `PATCH /v5/events`, but that route is read-only (`GET, HEAD` only). Real event writes go to `POST /v3/events` with a payload carrying the target calendar's identity (`akiflow_account_id`, `origin_account_id`, `origin_calendar_id`, creator/organizer ids, `connector_id`), which the old code left null. This fork resolves the calendar via `get-calendars`, populates those fields, converts times to UTC, and posts to the correct endpoint. Events now create and update and sync to Google Calendar.

## Sync Model

- v5 entities (`tasks`, `events`, `tags`, `labels`, `time_slots`, `calendars`) are cached locally and refreshed with per-entity `sync_token`s
- Meeting Assistant resources (`recordings`, `researches`) are cached separately using cursor-based refreshes
- Tool queries run against the merged local cache after refresh, so date filtering and sorting happen on a complete local view rather than partial API deltas

## Available Tools

### Tasks

#### `get-tasks`
List tasks with optional filters.
- `done` (boolean): Filter by completion status (default: false)
- `status` (string): `1`=Inbox, `2`=Planned, `4`=Snoozed, `7`=Someday, `10`=Scheduled
- `limit` (number): Max tasks to return

#### `add-task`
Create a new task.
- `title` (string, required): Task title
- `description` (string): Task description
- `date` (string): Plan date (`YYYY-MM-DD`)
- `datetime` (string): Plan datetime (ISO 8601)
- `due_date` (string): Deadline (`YYYY-MM-DD`)
- `duration` (number): Duration in minutes
- `priority` (string): `-1`=goal, `1`=high, `2`=medium, `3`=low
- `status` (string): `1`=Inbox, `2`=Planned, `7`=Someday, `10`=Scheduled
- `listId` (string): Project UUID
- `tags_ids` (array): Tag UUIDs

#### `edit-task`
Update an existing task.
- `id` (string, required): Task UUID
- All fields from `add-task` (optional, nullable to clear values)

#### `mark-done`
Mark a task as completed.
- `id` (string, required): Task UUID

#### `schedule-task`
Schedule a task on the calendar.
- `id` (string, required): Task UUID
- `date` (string, required): Date (`YYYY-MM-DD`)
- `datetime` (string): Specific time (ISO 8601)
- `duration` (number): Duration in minutes (default: 30)

#### `unschedule-task`
Remove a task from the calendar.
- `id` (string, required): Task UUID
- `to_inbox` (boolean): Move to inbox (default: true)

### Calendar

#### `get-events`
Get calendar events.
- `limit` (number): Max events to return
- `calendar_id` (string): Filter by calendar ID

#### `get-calendars`
Get all calendars with metadata.

#### `add-event`
Create a calendar event (syncs to the source calendar, e.g. Google).
- `title` (string, required): Event title
- `calendar_id` (string, required): Calendar UUID (must be a writable calendar — see `get-calendars`)
- `start_datetime` (string, required): Start time (ISO 8601, e.g. `2026-05-22T09:00:00-05:00`)
- `end_datetime` (string, required): End time (ISO 8601)
- `description` (string): Event description
- `location` (string): Event location
- `all_day` (boolean): All-day event

#### `edit-event`
Edit a calendar event. Changes sync back to the source calendar.
- `id` (string, required): Event UUID
- `title`, `description`, `location`, `start_datetime`, `end_datetime`, `all_day` (all optional)

#### `add-time-slot`
Create a time slot (Akiflow-internal calendar block; does **not** sync to external calendars).
- `title` (string, required): Time slot title
- `calendar_id` (string, required): Calendar UUID
- `start_time` (string, required): Start time (ISO 8601)
- `end_time` (string, required): End time (ISO 8601)
- `label_id` (string): Project/label UUID

#### `edit-time-slot`
Edit a time slot.
- `id` (string, required): Time slot UUID
- `title`, `start_time`, `end_time`, `label_id` (all optional)

### Meeting Assistant

Requires the Meeting Assistant add-on in Akiflow.

#### `get-recordings`
List meeting recordings.
- `limit` (number): Max recordings to return

#### `get-recording`
Get full detail for a single recording including summary, action items, and transcript.
- `id` (string, required): Recording UUID

#### `get-meeting-briefs`
List pre-meeting research briefs.
- `limit` (number): Max briefs to return

#### `get-meeting-brief`
Get full detail for a single pre-meeting brief.
- `id` (string, required): Meeting brief UUID

#### `create-task-from-action-item`
Create an Akiflow task from a meeting recording's action item.
- `recording_id` (string, required): Recording UUID
- `action_item_id` (string, required): Action item ID within the recording

### Organization

#### `get-projects`
List all projects and folders.

#### `get-tags`
List all tags.

## API Details

### Task Status
- `1`: Inbox
- `2`: Planned
- `4`: Snoozed
- `7`: Someday
- `10`: Scheduled

### Task Priority
- `-1`: Goal
- `1`: High
- `2`: Medium
- `3`: Low
- `null`: None

### Date Formats
- Date: `YYYY-MM-DD`
- Datetime: ISO 8601 (`2026-01-26T10:00:00.000Z`)

## Security

- Refresh token is sensitive - treat like a password
- Never commit tokens to git
- Access tokens auto-refresh on 401

## License

MIT
