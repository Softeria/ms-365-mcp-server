import { z } from 'zod';
import type GraphClient from '../graph-client.js';
import { OData, type Tool, type ToolPrecondition } from './types.js';

/**
 * Server-side guard: refuses the tool call unless the signed-in user is the
 * organizer of the referenced event. Calendars.ReadWrite covers any event the
 * user is an attendee of at the Graph layer — this guard narrows write
 * capability to organizer-owned events. Mutating an attendee-side copy via
 * PATCH/DELETE would silently change the user's local copy (or decline the
 * invite); neither is what calendar-event-update / calendar-event-delete
 * describe.
 *
 * Performs a tiny GET with $select=isOrganizer to avoid pulling the whole
 * event, via `makeRequest` (raw object; throws on Graph errors) — see
 * `assertIsDraft` in mail.ts for why `graphRequest` cannot be used here.
 */
const assertIsOrganizer: ToolPrecondition = async (
  graphClient: GraphClient,
  params: Record<string, unknown>
) => {
  const id = params['event-id'];
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('event-id is required and must be a non-empty string.');
  }
  const path = `/me/events/${encodeURIComponent(id)}?$select=isOrganizer`;
  let evt: { isOrganizer?: boolean } | null;
  try {
    evt = (await graphClient.makeRequest(path, { method: 'GET' })) as {
      isOrganizer?: boolean;
    } | null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `could not verify event is organized by the signed-in user (lookup failed: ${message}). The event may not exist or the signed-in user may not have access.`
    );
  }
  if (!evt || evt.isOrganizer !== true) {
    throw new Error(
      `event '${id}' was not organized by the signed-in user (isOrganizer=${String(evt?.isOrganizer)}). ` +
        'Only events you organize can be modified through this tool. Accepted/declined invites should be managed in Outlook directly.'
    );
  }
};

const dateTimeTimeZoneSchema = z
  .object({
    dateTime: z.string().describe('Local date-time, e.g. 2026-05-22T14:30:00'),
    timeZone: z
      .string()
      .describe('IANA or Windows timezone, e.g. America/New_York or Pacific Standard Time'),
  })
  .passthrough();

const attendeeSchema = z
  .object({
    emailAddress: z
      .object({
        address: z.string().describe('SMTP address'),
        name: z.string().optional(),
      })
      .passthrough(),
    type: z.enum(['required', 'optional', 'resource']).optional().describe('Defaults to required'),
  })
  .passthrough();

const locationSchema = z
  .object({
    displayName: z.string().optional(),
    address: z
      .object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        countryOrRegion: z.string().optional(),
        postalCode: z.string().optional(),
      })
      .passthrough()
      .optional(),
    coordinates: z
      .object({ latitude: z.number().optional(), longitude: z.number().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

const eventBodySchema = z
  .object({
    contentType: z.enum(['text', 'html', 'Text', 'HTML']).describe('text or html'),
    content: z.string(),
  })
  .passthrough();

/**
 * Mutable Event resource. Required-on-create fields (subject, start, end) are
 * documented but not enforced because calendar-event-update uses the same
 * schema for partial updates. Graph validates server-side either way.
 */
const eventWriteSchema = z
  .object({
    subject: z.string().optional().describe('Event subject; required for create.'),
    body: eventBodySchema.optional(),
    start: dateTimeTimeZoneSchema
      .optional()
      .describe('Event start; required for create. Use the timezone field too.'),
    end: dateTimeTimeZoneSchema.optional().describe('Event end; required for create.'),
    location: locationSchema.optional(),
    locations: z.array(locationSchema).optional().describe('For multi-location events.'),
    attendees: z.array(attendeeSchema).optional(),
    isAllDay: z.boolean().optional(),
    isOnlineMeeting: z.boolean().optional(),
    onlineMeetingProvider: z
      .enum(['teamsForBusiness', 'skypeForBusiness', 'skypeForConsumer', 'unknown'])
      .optional(),
    importance: z.enum(['low', 'normal', 'high']).optional(),
    sensitivity: z.enum(['normal', 'personal', 'private', 'confidential']).optional(),
    showAs: z.enum(['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown']).optional(),
    categories: z.array(z.string()).optional(),
    reminderMinutesBeforeStart: z.number().optional(),
    isReminderOn: z.boolean().optional(),
  })
  .passthrough();

export const calendarTools: readonly Tool[] = [
  {
    name: 'calendar-event-get',
    description: 'Get a single calendar event by id.',
    method: 'GET',
    path: '/me/events/{event-id}',
    scopes: ['Calendars.Read'],
    supportsTimezone: true,
    supportsExpandExtendedProperties: true,
    params: [
      {
        name: 'event-id',
        location: 'path',
        schema: z.string().describe('Calendar event id'),
      },
      OData.select,
      OData.expand,
    ],
  },
  {
    name: 'calendar-view',
    description:
      "Expanded calendar view between two times. Recurring events are expanded into individual occurrences over the window — usually what an LLM actually wants when asked 'what's on the calendar this week'.",
    method: 'GET',
    path: '/me/calendarView',
    scopes: ['Calendars.Read'],
    projection: 'event',
    supportsTimezone: true,
    supportsExpandExtendedProperties: true,
    params: [
      {
        name: 'startDateTime',
        location: 'query',
        schema: z.string().describe('ISO 8601 start of the window, e.g. 2026-05-22T00:00:00Z'),
      },
      {
        name: 'endDateTime',
        location: 'query',
        schema: z.string().describe('ISO 8601 end of the window, e.g. 2026-05-29T00:00:00Z'),
      },
      OData.filter,
      OData.select,
      OData.orderby,
      OData.top,
      OData.skip,
      OData.expand,
    ],
  },

  // ---------- Write tools (PR 4) ----------

  {
    name: 'calendar-event-create',
    description:
      "Create a calendar event on the signed-in user's default calendar. Returns the created event including its id. Requires subject, start, and end at minimum.",
    method: 'POST',
    path: '/me/events',
    scopes: ['Calendars.ReadWrite'],
    params: [
      {
        name: 'body',
        location: 'body',
        schema: eventWriteSchema,
      },
    ],
    llmTip:
      'Resolve attendee SMTP addresses with user-search (or known contacts) before creating; do not invent addresses. ' +
      'Set start.timeZone and end.timeZone explicitly — Graph defaults to UTC if you omit them, which is rarely what users want.',
  },
  {
    name: 'calendar-event-update',
    description:
      'Update fields on an existing calendar event by id. Any field omitted is left unchanged. Use calendar-event-get first if you need to read the current values before mutating. The server refuses this call if the signed-in user is not the organizer (isOrganizer=true) — accepted/declined invites must be managed by the human in Outlook.',
    method: 'PATCH',
    path: '/me/events/{event-id}',
    scopes: ['Calendars.ReadWrite'],
    precondition: assertIsOrganizer,
    params: [
      {
        name: 'event-id',
        location: 'path',
        schema: z.string().describe('Calendar event id (must satisfy isOrganizer=true)'),
      },
      {
        name: 'body',
        location: 'body',
        schema: eventWriteSchema,
      },
    ],
  },
  {
    name: 'calendar-event-delete',
    description:
      'Delete a calendar event by id. For organizers of recurring events this deletes the whole series — use calendar-event-update with a cancel-style change if a single occurrence is intended. The server refuses this call if the signed-in user is not the organizer (isOrganizer=true) — the LLM cannot decline invites or mass-clear the calendar through this tool.',
    method: 'DELETE',
    path: '/me/events/{event-id}',
    scopes: ['Calendars.ReadWrite'],
    precondition: assertIsOrganizer,
    params: [
      {
        name: 'event-id',
        location: 'path',
        schema: z.string().describe('Calendar event id (must satisfy isOrganizer=true)'),
      },
    ],
  },
];
