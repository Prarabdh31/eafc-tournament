"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AwardType, Phase } from "@/lib/types/database";

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function setCurrentMatch(matchId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_state")
    .update({ current_match_id: matchId, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  refresh();
}

export async function setPhase(phase: Phase) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_state")
    .update({ phase, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  refresh();
}

export async function updateScore(matchId: string, score1: number, score2: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ score1, score2 }).eq("id", matchId);
  if (error) throw new Error(error.message);
  refresh();
}

export async function startMatch(matchId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ status: "live", started_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw new Error(error.message);
  await setCurrentMatch(matchId);
}

export async function completeMatch(matchId: string) {
  const supabase = await createClient();

  const { data: match, error: fetchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (!match) throw new Error("Match not found");
  if (match.score1 === match.score2) throw new Error("Scores are tied — enter a winner");

  const winnerId = match.score1 > match.score2 ? match.player1_id : match.player2_id;
  const winnerTeamId =
    match.score1 > match.score2 ? match.player1_team_id : match.player2_team_id;

  const { error: updateError } = await supabase
    .from("matches")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      winner_id: winnerId,
    })
    .eq("id", matchId);
  if (updateError) throw new Error(updateError.message);

  if (match.next_match_id && match.next_match_slot) {
    const advancePatch =
      match.next_match_slot === 1
        ? { player1_id: winnerId, player1_team_id: winnerTeamId }
        : { player2_id: winnerId, player2_team_id: winnerTeamId };
    const { error: advanceError } = await supabase
      .from("matches")
      .update(advancePatch)
      .eq("id", match.next_match_id);
    if (advanceError) throw new Error(advanceError.message);
  }

  refresh();
}

export async function addAward(type: AwardType, category: string, playerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("awards").insert({ type, category, player_id: playerId });
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteAward(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("awards").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh();
}
