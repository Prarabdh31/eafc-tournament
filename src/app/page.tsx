import { createClient } from "@/lib/supabase/server";
import { HomeDisplayClient } from "./home-display-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const [
    { data: players },
    { data: teams },
    { data: matches },
    { data: draftPicks },
    { data: awards },
    { data: state },
    { data: announcements },
    { data: photos },
  ] = await Promise.all([
    supabase.from("players").select("*"),
    supabase.from("teams").select("*"),
    supabase.from("matches").select("*"),
    supabase.from("draft_picks").select("*").order("pick_number", { ascending: true }),
    supabase.from("awards").select("*").order("awarded_at", { ascending: true }),
    supabase.from("tournament_state").select("*").eq("id", 1).single(),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    supabase.from("guest_photos").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <HomeDisplayClient
      initialPlayers={players ?? []}
      initialTeams={teams ?? []}
      initialMatches={matches ?? []}
      initialDraftPicks={draftPicks ?? []}
      initialAwards={awards ?? []}
      initialAnnouncements={announcements ?? []}
      initialPhotos={photos ?? []}
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
