import type { EventCategory } from "./types";

export const CATEGORY_META: Record<EventCategory, { label: string; color: string; tint: string }> = {
  LIVESTREAM:      { label: "Livestream",       color: "#8B7FFA", tint: "rgba(139,127,250,0.18)" },
  COLLAB:          { label: "Collab",           color: "#3FE0CD", tint: "rgba(63,224,205,0.18)" },
  BRAND_MEETING:   { label: "Brand meeting",    color: "#FFC257", tint: "rgba(255,194,87,0.18)" },
  CONTENT_DEADLINE:{ label: "Content deadline", color: "#FF8272", tint: "rgba(255,130,114,0.18)" },
  COMMUNITY:       { label: "Community",        color: "#6AB8FF", tint: "rgba(106,184,255,0.18)" },
  INDUSTRY_EVENT:  { label: "Industry event",   color: "#C792EA", tint: "rgba(199,146,234,0.18)" },
  MUSIC:           { label: "Music",            color: "#FF6FB5", tint: "rgba(255,111,181,0.18)" },
  SPORTS:          { label: "Sports",           color: "#5FE38A", tint: "rgba(95,227,138,0.18)" },
  ARTS_THEATRE:    { label: "Arts & theatre",   color: "#F2A6D8", tint: "rgba(242,166,216,0.18)" },
  FILM:            { label: "Film",             color: "#F7CE68", tint: "rgba(247,206,104,0.18)" },
  OTHER:           { label: "Other",            color: "#9891A8", tint: "rgba(152,145,168,0.18)" },
};
