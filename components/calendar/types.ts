export type EventCategory =
  | "LIVESTREAM"
  | "COLLAB"
  | "BRAND_MEETING"
  | "CONTENT_DEADLINE"
  | "COMMUNITY"
  | "INDUSTRY_EVENT"
  | "MUSIC"
  | "SPORTS"
  | "ARTS_THEATRE"
  | "FILM"
  | "OTHER";

export type RsvpStatus = "GOING" | "INTERESTED" | "DECLINED";

export type OccurrenceDTO = {
  eventId: string;
  start: string;
  end: string;
  originalStart: string;
  event: {
    id: string;
    title: string;
    description: string | null;
    category: EventCategory;
    location: string | null;
    isVirtual: boolean;
    timezone: string;
    recurrenceRule: string | null;
    source: "PLATFORM" | "CONFS_TECH" | "TICKETMASTER";
    host: { id: string; name: string; handle: string; image: string | null } | null;
    attendeeCount: number;
    visibleAttendeeCount: number;
    myRsvp: RsvpStatus | null;
    myRsvpVisible: boolean;
  };
};

export type HolidayDTO = {
  id: string;
  date: string;
  name: string;
  localName: string | null;
  countryCode: string;
};
