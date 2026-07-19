import { createClient } from "@/lib/supabase/server";
import { DraftRoomClient } from "./draft-room-client";

export default async function DraftPage() {
  const supabase = await createClient();

  const [{ data: players }, { data: teams }, { data: picks }, { data: state }] =
    await Promise.all([
      supabase.from("players").select("*").order("skill_rank", { ascending: true }),
      supabase.from("teams").select("*").order("name", { ascending: true }),
      supabase.from("draft_picks").select("*").order("pick_number", { ascending: true }),
      supabase.from("tournament_state").select("*").eq("id", 1).single(),
    ]);

  return (
    <DraftRoomClient
      initialPlayers={players ?? []}
      initialTeams={teams ?? []}
      initialPicks={picks ?? []}
      initialState={
        state ?? {
          id: 1,
          phase: "pre_draft",
          current_match_id: null,
          wc_final_kickoff: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
    />
  );
}
