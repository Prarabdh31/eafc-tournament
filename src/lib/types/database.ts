export type Phase =
  | "pre_draft"
  | "drafting"
  | "bracket_play"
  | "final"
  | "wc_final"
  | "complete";

export type MatchStatus = "scheduled" | "live" | "completed";
export type BracketId = "A" | "B";
export type AwardType = "trophy" | "medal";

export type Player = {
  id: string;
  name: string;
  photo_url: string | null;
  skill_rank: number;
  bracket: BracketId | null;
  seed: number | null;
  created_at: string;
}

export type Team = {
  id: string;
  name: string;
  crest_url: string | null;
  is_taken: boolean;
}

export type DraftPick = {
  id: string;
  pick_number: number;
  player_id: string;
  team_id: string;
  picked_at: string;
}

export type Match = {
  id: string;
  round: string;
  bracket: BracketId | null;
  match_order: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_team_id: string | null;
  player2_team_id: string | null;
  score1: number;
  score2: number;
  status: MatchStatus;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  winner_id: string | null;
  next_match_id: string | null;
  next_match_slot: 1 | 2 | null;
  created_at: string;
}

export type Award = {
  id: string;
  type: AwardType;
  category: string;
  player_id: string | null;
  awarded_at: string;
}

export type TournamentState = {
  id: number;
  phase: Phase;
  current_match_id: string | null;
  wc_final_kickoff: string;
  updated_at: string;
}

export type AnnouncementType = "info" | "alert" | "food" | "break";

export type Announcement = {
  id: string;
  text: string;
  type: AnnouncementType;
  is_active: boolean;
  created_at: string;
}

export type GuestPhoto = {
  id: string;
  url: string;
  caption: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      players: {
        Row: Player;
        Insert: Partial<Player> & Pick<Player, "name" | "skill_rank">;
        Update: Partial<Player>;
        Relationships: [];
      };
      teams: {
        Row: Team;
        Insert: Partial<Team> & Pick<Team, "name">;
        Update: Partial<Team>;
        Relationships: [];
      };
      draft_picks: {
        Row: DraftPick;
        Insert: Partial<DraftPick> &
          Pick<DraftPick, "pick_number" | "player_id" | "team_id">;
        Update: Partial<DraftPick>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: Partial<Match> & Pick<Match, "round">;
        Update: Partial<Match>;
        Relationships: [];
      };
      awards: {
        Row: Award;
        Insert: Partial<Award> & Pick<Award, "type" | "category">;
        Update: Partial<Award>;
        Relationships: [];
      };
      tournament_state: {
        Row: TournamentState;
        Insert: Partial<TournamentState>;
        Update: Partial<TournamentState>;
        Relationships: [];
      };
      announcements: {
        Row: Announcement;
        Insert: Partial<Announcement> & Pick<Announcement, "text">;
        Update: Partial<Announcement>;
        Relationships: [];
      };
      guest_photos: {
        Row: GuestPhoto;
        Insert: Partial<GuestPhoto> & Pick<GuestPhoto, "url">;
        Update: Partial<GuestPhoto>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
