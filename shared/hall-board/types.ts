export type BoardTonightStatus = "empty" | "voting" | "locked" | "on_hold" | "fed";

export type BoardNoteIntent = "broken" | "reminder" | "announcement" | "event";

export interface HallBoardTonight {
  dinner_title: string | null;
  dinner_slug: string | null;
  status: BoardTonightStatus;
  hold_note: string | null;
  cook_user_id: string | null;
  runner_user_id: string | null;
  /** Personal overlay — only true for the viewing user */
  you_are_cook: boolean;
  you_are_runner: boolean;
}

export interface HallBoardPulse {
  pulse_id: string;
  pulse_kind: string;
  title: string;
  href: string | null;
  priority: number;
}

export interface HallBoardNote {
  note_id: string;
  intent: BoardNoteIntent;
  title: string;
  body: string | null;
  pinned: boolean;
  event_at: string | null;
  expires_at: string | null;
  author_user_id: string;
  fixed_at: string | null;
  created_at: string;
}

export interface HallBoardPayload {
  hall_id: string;
  tonight: HallBoardTonight;
  pulses: HallBoardPulse[];
  pins: HallBoardNote[];
  coming_up: HallBoardNote[];
  can_manage: boolean;
}
