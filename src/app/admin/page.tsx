import { createClient } from "@/lib/supabase/server";
import { AdminPanelClient } from "./admin-panel-client";

export default async function AdminPage() {
  const supabase = await createClient();

  const [
    { data: matches },
    { data: players },
    { data: teams },
    { data: awards },
    { data: state },
    { data: announcements },
    { data: photos },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .order("bracket", { ascending: true })
      .order("match_order", { ascending: true }),
    supabase.from("players").select("*").order("name", { ascending: true }),
    supabase.from("teams").select("*"),
    supabase.from("awards").select("*").order("awarded_at", { ascending: false }),
    supabase.from("tournament_state").select("*").eq("id", 1).single(),
    supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    supabase.from("guest_photos").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <AdminPanelClient
      initialMatches={matches ?? []}
      initialPlayers={players ?? []}
      initialTeams={teams ?? []}
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
