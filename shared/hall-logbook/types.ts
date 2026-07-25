export interface HallLogbookEntry {
  entry_id: string;
  category: string;
  title: string;
  body: string | null;
  source: "auto" | "human";
  author_user_id: string | null;
  created_at: string;
}

export interface HallLogbookPayload {
  hall_id: string;
  last_read_at: string | null;
  unread_count: number;
  entries: HallLogbookEntry[];
}
