import { z } from 'zod';
import type GraphClient from '../graph-client.js';
import { OData, type Tool, type ToolPrecondition } from './types.js';
import { flattenedSearch, searchRequestSchema } from './search.js';
import { compact, listShape, person } from './shapes.js';

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

interface GraphEvent {
  id?: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string };
  isAllDay?: boolean;
  isCancelled?: boolean;
  location?: { displayName?: string };
  organizer?: { emailAddress?: { name?: string; address?: string } };
  attendees?: {
    emailAddress?: { name?: string; address?: string };
    type?: string;
    status?: { response?: string };
  }[];
  onlineMeeting?: { joinUrl?: string } | null;
  isOrganizer?: boolean;
  responseStatus?: { response?: string };
  showAs?: string;
  type?: string;
  seriesMasterId?: string;
  categories?: string[];
  webLink?: string;
  body?: { content?: string };
}

/**
 * Event summary: id for follow-ups, when/where/who, and the Teams join link.
 * Attendees read "Name <address> (response)"; optional attendees are marked.
 */
function eventSummary(e: GraphEvent) {
  return {
    id: e.id,
    subject: e.subject,
    start: e.start?.dateTime,
    end: e.end?.dateTime,
    timeZone: e.start?.timeZone,
    isAllDay: e.isAllDay || undefined,
    isCancelled: e.isCancelled || undefined,
    location: e.location?.displayName,
    organizer: person(e.organizer),
    attendees: e.attendees?.map((a) => {
      const response = a.status?.response;
      const tags = [
        a.type === 'optional' ? 'optional' : undefined,
        response && response !== 'none' ? response : undefined,
      ].filter(Boolean);
      return tags.length > 0 ? `${person(a)} (${tags.join(', ')})` : person(a);
    }),
    joinUrl: e.onlineMeeting?.joinUrl,
  };
}

/** calendar-event-get / create / update: the summary plus your role, links, and the body. */
function shapeEvent(raw: unknown) {
  const e = (raw ?? {}) as GraphEvent;
  return compact({
    ...eventSummary(e),
    isOrganizer: e.isOrganizer,
    myResponse: e.isOrganizer ? undefined : e.responseStatus?.response,
    showAs: e.showAs,
    type: e.type === 'singleInstance' ? undefined : e.type,
    seriesMasterId: e.seriesMasterId,
    categories: e.categories,
    webLink: e.webLink,
    body: e.body?.content,
  });
}

const shapeEventList = listShape((e) => compact(eventSummary(e as GraphEvent)));

interface GraphDateTime {
  dateTime?: string;
  timeZone?: string;
}

interface GraphScheduleInfo {
  scheduleId?: string;
  availabilityView?: string;
  scheduleItems?: { status?: string; start?: GraphDateTime; end?: GraphDateTime }[];
  workingHours?: {
    daysOfWeek?: string[];
    startTime?: string;
    endTime?: string;
    timeZone?: { name?: string };
  };
  error?: { message?: string };
}

/**
 * getSchedule → per person: busy blocks (status + times, no subjects) and
 * working hours. Times are in the `timezone` param's zone (else UTC).
 */
function shapeSchedule(raw: unknown) {
  const value = ((raw as { value?: GraphScheduleInfo[] } | null)?.value ?? []).map((s) => ({
    email: s.scheduleId,
    availabilityView: s.availabilityView,
    busy: (s.scheduleItems ?? [])
      .filter((item) => item.status !== 'free')
      .map((item) => ({
        status: item.status,
        start: item.start?.dateTime,
        end: item.end?.dateTime,
      })),
    ...(s.workingHours
      ? {
          workingHours: {
            days: s.workingHours.daysOfWeek,
            start: s.workingHours.startTime,
            end: s.workingHours.endTime,
            timeZone: s.workingHours.timeZone?.name,
          },
        }
      : {}),
    ...(s.error ? { error: s.error.message } : {}),
  }));
  return { schedules: value };
}

interface GraphMeetingTimeSuggestion {
  confidence?: number;
  organizerAvailability?: string;
  suggestionReason?: string;
  meetingTimeSlot?: { start?: GraphDateTime; end?: GraphDateTime };
  attendeeAvailability?: {
    attendee?: { emailAddress?: { address?: string } };
    availability?: string;
  }[];
  locations?: { displayName?: string }[];
}

/** findMeetingTimes → slot times, confidence, and only the attendees who are NOT free. */
function shapeMeetingTimes(raw: unknown) {
  const r = raw as {
    emptySuggestionsReason?: string;
    meetingTimeSuggestions?: GraphMeetingTimeSuggestion[];
  } | null;
  const suggestions = (r?.meetingTimeSuggestions ?? []).map((s) => {
    const notFree = (s.attendeeAvailability ?? [])
      .filter((a) => a.availability !== 'free')
      .map((a) => ({ email: a.attendee?.emailAddress?.address, availability: a.availability }));
    const locations = (s.locations ?? []).map((l) => l.displayName).filter(Boolean);
    return {
      start: s.meetingTimeSlot?.start?.dateTime,
      end: s.meetingTimeSlot?.end?.dateTime,
      timeZone: s.meetingTimeSlot?.start?.timeZone,
      confidence: s.confidence,
      organizerAvailability: s.organizerAvailability,
      ...(notFree.length > 0 ? { notFree } : {}),
      ...(locations.length > 0 ? { locations } : {}),
      ...(s.suggestionReason ? { reason: s.suggestionReason } : {}),
    };
  });
  return {
    suggestions,
    ...(r?.emptySuggestionsReason ? { emptySuggestionsReason: r.emptySuggestionsReason } : {}),
  };
}

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
    shape: shapeEvent,
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
    shape: shapeEventList,
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

  {
    name: 'calendar-event-search',
    description:
      "Search the signed-in user's own calendar by keyword (subject, body, location, attendees) across " +
      'all dates. Use calendar-view instead when you know the time window. Returns ' +
      '{ hits, moreResultsAvailable, nextFrom? }; for the next page resend with from = nextFrom.',
    method: 'POST',
    path: '/search/query',
    scopes: ['Calendars.Read'],
    readOnly: true,
    execute: flattenedSearch((event) => ({
      subject: event['subject'],
      start: event['start'],
      end: event['end'],
      isAllDay: event['isAllDay'],
    })),
    params: [
      {
        name: 'body',
        location: 'body',
        schema: searchRequestSchema({
          entityTypes: z.array(z.literal('event')).default(['event']),
          queryDescription: 'Keywords to find, e.g. "quarterly review" or a person\'s name.',
          maxSize: 25,
        }),
      },
    ],
    llmTip:
      'Each hit has hitId (the event id — pass it to calendar-event-get for attendees, body, ' +
      'location), subject, start, end, and a summary snippet. Graph limits: only your own primary ' +
      'calendar is searched and results cannot be sorted.',
  },
  {
    name: 'calendar-schedule-get',
    description:
      'Free/busy for people or rooms over a time window. Returns { schedules: [{ email, ' +
      'availabilityView, busy: [{ status, start, end }], workingHours }] } — no event subjects. Use ' +
      'this to check whether specific people are free; use calendar-meeting-times-find to get suggested slots.',
    method: 'POST',
    path: '/me/calendar/getSchedule',
    scopes: ['Calendars.Read'],
    readOnly: true,
    supportsTimezone: true,
    shape: shapeSchedule,
    params: [
      {
        name: 'body',
        location: 'body',
        schema: z.object({
          schedules: z
            .array(z.string())
            .min(1)
            .max(20)
            .describe(
              'SMTP addresses of users, distribution lists, or rooms. Resolve with user-search; do not invent.'
            ),
          startTime: dateTimeTimeZoneSchema.describe('Window start.'),
          endTime: dateTimeTimeZoneSchema.describe('Window end.'),
          availabilityViewInterval: z
            .number()
            .int()
            .min(5)
            .max(1440)
            .optional()
            .describe('Minutes per availabilityView slot (default 30).'),
        }),
      },
    ],
    llmTip:
      'availabilityView has one digit per slot: 0 free, 1 tentative, 2 busy, 3 out of office, ' +
      '4 working elsewhere. Pass the timezone param so returned times match the user.',
  },
  {
    name: 'calendar-meeting-times-find',
    description:
      'Suggest meeting times when the organizer (you) and the attendees are all free, within ' +
      'working hours by default. Returns { suggestions: [{ start, end, timeZone, confidence, ' +
      'notFree? }], emptySuggestionsReason? }, where notFree lists only attendees who are not free. ' +
      'Does not create anything — book the chosen slot with calendar-event-create.',
    method: 'POST',
    path: '/me/findMeetingTimes',
    scopes: ['Calendars.Read.Shared'],
    readOnly: true,
    supportsTimezone: true,
    shape: shapeMeetingTimes,
    params: [
      {
        name: 'body',
        location: 'body',
        schema: z
          .object({
            attendees: z
              .array(attendeeSchema)
              .optional()
              .describe(
                'People (type required/optional) and rooms (type resource). Omit for you only.'
              ),
            timeConstraint: z
              .object({
                activityDomain: z
                  .enum(['work', 'personal', 'unrestricted'])
                  .optional()
                  .describe(
                    'work (default): working hours; personal: adds weekends; unrestricted: any time.'
                  ),
                timeSlots: z
                  .array(z.object({ start: dateTimeTimeZoneSchema, end: dateTimeTimeZoneSchema }))
                  .describe('Windows to search within.'),
              })
              .optional(),
            meetingDuration: z
              .string()
              .optional()
              .describe('ISO 8601 duration, e.g. PT30M or PT1H (default PT30M).'),
            maxCandidates: z
              .number()
              .int()
              .min(1)
              .max(20)
              .optional()
              .describe('Maximum suggestions to return.'),
            isOrganizerOptional: z
              .boolean()
              .optional()
              .describe('true if you need not attend (default false).'),
            minimumAttendeePercentage: z
              .number()
              .min(0)
              .max(100)
              .optional()
              .describe('Only return slots where at least this % of attendees are free.'),
            returnSuggestionReasons: z
              .boolean()
              .optional()
              .describe('Include a short reason with each suggestion.'),
          })
          .passthrough(),
      },
    ],
    llmTip:
      'Empty meetingTimeSuggestions comes with an emptySuggestionsReason (e.g. AttendeesUnavailable, ' +
      'OrganizerUnavailable) — widen timeSlots, lower minimumAttendeePercentage, or mark attendees optional.',
  },

  // ---------- Write tools (PR 4) ----------

  {
    name: 'calendar-event-create',
    description:
      "Create a calendar event on the signed-in user's default calendar. Returns the event's id, times, attendees, join link, and webLink. Requires subject, start, and end at minimum.",
    method: 'POST',
    path: '/me/events',
    scopes: ['Calendars.ReadWrite'],
    shape: shapeEvent,
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
    shape: shapeEvent,
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
