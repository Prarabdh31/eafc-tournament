"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { splitBalanced, buildTournamentMatches } from "@/lib/tournament/bracket";
import type { Player } from "@/lib/types/database";

export async function addPlayer(name: string, skillRank: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("players").insert({ name, skill_rank: skillRank });
  if (error) throw new Error(error.message);
  revalidatePath("/draft");
}

export async function updatePlayer(id: string, patch: Partial<Pick<Player, "name" | "skill_rank">>) {
  const supabase = await createClient();
  const { error } = await supabase.from("players").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/draft");
}

export async function deletePlayer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/draft");
}

export async function startDraft() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournament_state")
    .update({ phase: "drafting", updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/draft");
}

export async function recordPick(pickNumber: number, playerId: string, teamId: string) {
  const supabase = await createClient();

  const { error: pickError } = await supabase
    .from("draft_picks")
    .insert({ pick_number: pickNumber, player_id: playerId, team_id: teamId });
  if (pickError) throw new Error(pickError.message);

  const { error: teamError } = await supabase
    .from("teams")
    .update({ is_taken: true })
    .eq("id", teamId);
  if (teamError) throw new Error(teamError.message);

  revalidatePath("/draft");
}

export async function undoLastPick(pickId: string, teamId: string) {
  const supabase = await createClient();
  const { error: delError } = await supabase.from("draft_picks").delete().eq("id", pickId);
  if (delError) throw new Error(delError.message);

  const { error: teamError } = await supabase
    .from("teams")
    .update({ is_taken: false })
    .eq("id", teamId);
  if (teamError) throw new Error(teamError.message);

  revalidatePath("/draft");
}

/**
 * Wipes all draft/tournament progress and reverts to pre_draft — clears
 * matches, draft_picks, awards, un-takes every team, and clears each
 * player's bracket/seed. Players and the team pool itself are kept intact
 * so the admin can immediately re-run the draft without re-entering anyone.
 */
export async function resetTournament() {
  const supabase = await createClient();
  const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

  const { error: stateError } = await supabase
    .from("tournament_state")
    .update({ phase: "pre_draft", current_match_id: null, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (stateError) throw new Error(stateError.message);

  const { error: matchError } = await supabase.from("matches").delete().neq("id", ZERO_UUID);
  if (matchError) throw new Error(matchError.message);

  const { error: pickError } = await supabase.from("draft_picks").delete().neq("id", ZERO_UUID);
  if (pickError) throw new Error(pickError.message);

  const { error: awardError } = await supabase.from("awards").delete().neq("id", ZERO_UUID);
  if (awardError) throw new Error(awardError.message);

  const { error: teamError } = await supabase
    .from("teams")
    .update({ is_taken: false })
    .eq("is_taken", true);
  if (teamError) throw new Error(teamError.message);

  const { error: playerError } = await supabase
    .from("players")
    .update({ bracket: null, seed: null })
    .not("bracket", "is", null);
  if (playerError) throw new Error(playerError.message);

  revalidatePath("/draft");
  revalidatePath("/admin");
  revalidatePath("/");
}

/**
 * Runs the bracket randomizer against current players + draft picks,
 * WITHOUT persisting — used to preview a result the admin can re-roll.
 */
export async function previewBrackets(players: Player[]) {
  const { bracketA, bracketB, diff } = splitBalanced(players);
  return {
    bracketA: bracketA.map((p) => p.id),
    bracketB: bracketB.map((p) => p.id),
    diff,
  };
}

/**
 * Persists a confirmed bracket split: writes players.bracket, generates
 * the full match tree (both brackets + Final), and advances tournament phase.
 */
export async function confirmBrackets(bracketAIds: string[], bracketBIds: string[]) {
  const supabase = await createClient();

  const { data: players, error: playersError } = await supabase.from("players").select("*");
  if (playersError) throw new Error(playersError.message);

  const { data: picks, error: picksError } = await supabase.from("draft_picks").select("*");
  if (picksError) throw new Error(picksError.message);

  const teamByPlayer = new Map<string, string>();
  for (const pick of picks ?? []) teamByPlayer.set(pick.player_id, pick.team_id);

  const byId = new Map((players ?? []).map((p) => [p.id, p as Player]));
  const bracketA = bracketAIds.map((id) => byId.get(id)!).filter(Boolean);
  const bracketB = bracketBIds.map((id) => byId.get(id)!).filter(Boolean);

  for (const p of bracketA) {
    const { error } = await supabase.from("players").update({ bracket: "A" }).eq("id", p.id);
    if (error) throw new Error(error.message);
  }
  for (const p of bracketB) {
    const { error } = await supabase.from("players").update({ bracket: "B" }).eq("id", p.id);
    if (error) throw new Error(error.message);
  }

  const matches = buildTournamentMatches(bracketA, bracketB, teamByPlayer);
  const { error: matchError } = await supabase.from("matches").insert(matches);
  if (matchError) throw new Error(matchError.message);

  const firstMatch = matches.find((m) => m.status === "scheduled") ?? matches[0];
  const { error: stateError } = await supabase
    .from("tournament_state")
    .update({
      phase: "bracket_play",
      current_match_id: firstMatch?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (stateError) throw new Error(stateError.message);

  revalidatePath("/draft");
  revalidatePath("/admin");
  revalidatePath("/");
}
