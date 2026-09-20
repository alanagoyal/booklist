import { Book, Person } from "@/types";
import { BOOK_GENRES } from "@/config/book-genres";

export const FIELD_VALUES = {
  type: [
    "Anthropologist",
    "Architect",
    "Art Critic",
    "Author or Publisher",
    "Biographer",
    "Chef or Food Writer",
    "Economist",
    "Engineer or Technologist",
    "Entertainer",
    "Entrepreneur",
    "Executive",
    "Historian or Philosopher",
    "Investor",
    "Journalist",
    "Librarian or Teacher",
    "Musician or Filmmaker",
    "Product Manager or Designer",
    "Scientist"
  ],
  genres: BOOK_GENRES,
} as const;
