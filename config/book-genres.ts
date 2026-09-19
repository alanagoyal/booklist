export const BOOK_GENRE_CONFIG_VERSION = "2026-09-19-v1";
export const JEV_MODEL = "jev-1.13.0";
export const TAG_PROBABILITY_THRESHOLD = 0.75;
export const MAX_TAGS_PER_BOOK = 4;

export const BROAD_SHELVES = {
  fiction: {
    label: "Fiction",
    description: "An invented narrative, including literary and genre fiction.",
  },
  nonfiction: {
    label: "Nonfiction",
    description: "A factual, analytical, instructional, or documentary work.",
  },
  poetry: {
    label: "Poetry",
    description: "A collection or book primarily composed of poems.",
  },
  drama: {
    label: "Drama",
    description: "A play or collection of plays written primarily for performance.",
  },
  other: {
    label: null,
    description: "The book does not clearly fit fiction, nonfiction, poetry, or drama.",
  },
} as const;

export type BroadShelfKey = keyof typeof BROAD_SHELVES;

export const BOOK_GENRE_TAGS = [
  {
    key: "literary_fiction",
    label: "Literary Fiction",
    definition:
      "Fiction primarily valued for prose, character, theme, or formal ambition rather than a genre convention.",
  },
  {
    key: "historical_fiction",
    label: "Historical Fiction",
    definition:
      "Fiction set substantially in a past historical period; exclude factual works of history.",
  },
  {
    key: "science_fiction",
    label: "Science Fiction",
    definition:
      "Fiction built around speculative science, technology, space, time travel, or future societies.",
  },
  {
    key: "fantasy",
    label: "Fantasy",
    definition:
      "Fiction built around magic, mythic beings, or an invented world governed by supernatural rules.",
  },
  {
    key: "mystery_crime",
    label: "Mystery / Crime",
    definition:
      "Fiction centered on a crime, investigation, detective, or unresolved mystery.",
  },
  {
    key: "horror",
    label: "Horror",
    definition:
      "Fiction intended substantially to frighten, unsettle, or evoke dread.",
  },
  {
    key: "romance",
    label: "Romance",
    definition:
      "Fiction in which a central romantic relationship drives the story.",
  },
  {
    key: "biography",
    label: "Biography",
    definition:
      "A factual account of another person's life; exclude autobiographies and memoirs written by the subject.",
  },
  {
    key: "memoir",
    label: "Memoir",
    definition:
      "A factual first-person account of the author's own life or a meaningful part of it.",
  },
  {
    key: "history",
    label: "History",
    definition:
      "A factual work explaining past events, periods, societies, or historical figures; exclude historical fiction.",
  },
  {
    key: "business",
    label: "Business",
    definition:
      "A substantive work about companies, management, strategy, entrepreneurship, markets, or professional organizations.",
  },
  {
    key: "economics",
    label: "Economics",
    definition:
      "A substantive work about economic systems, incentives, trade, money, labor, or economic policy.",
  },
  {
    key: "politics",
    label: "Politics",
    definition:
      "A substantive work about government, political power, ideology, public policy, or political movements.",
  },
  {
    key: "philosophy",
    label: "Philosophy",
    definition:
      "A substantive work of philosophical argument or inquiry into ethics, knowledge, reality, meaning, or logic.",
  },
  {
    key: "science",
    label: "Science",
    definition:
      "A substantive factual work about the natural or formal sciences and their discoveries.",
  },
  {
    key: "technology",
    label: "Technology",
    definition:
      "A substantive work about computing, engineering, technological systems, or the technology industry.",
  },
  {
    key: "psychology",
    label: "Psychology",
    definition:
      "A substantive work about cognition, emotion, behavior, mental processes, or psychological research.",
  },
  {
    key: "self_help",
    label: "Self-Help",
    definition:
      "A practical book whose central purpose is helping the reader change habits, behavior, wellbeing, or personal performance.",
  },
  {
    key: "children",
    label: "Children",
    definition:
      "A book written primarily for children younger than the young-adult audience.",
  },
  {
    key: "young_adult",
    label: "Young Adult",
    definition:
      "A book written primarily for teenage readers, usually with adolescent protagonists or concerns.",
  },
  {
    key: "classic",
    label: "Classic",
    definition:
      "A widely recognized, enduring work with established literary or intellectual significance; not merely an older book.",
  },
] as const;

export type BookGenreTag = (typeof BOOK_GENRE_TAGS)[number];

export const BOOK_GENRES = [
  "Fiction",
  "Nonfiction",
  ...BOOK_GENRE_TAGS.map((tag) => tag.label),
  "Poetry",
  "Drama",
] as const;
