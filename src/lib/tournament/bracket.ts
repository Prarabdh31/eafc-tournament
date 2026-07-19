import type { Player, Match, BracketId } from "@/lib/types/database";

/** Lowest skill_rank drafts first (straight order, not snake). */
export function draftOrder(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.skill_rank - b.skill_rank);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Randomly splits players into two brackets of (near-)equal size,
 * minimizing the gap between total skill on each side. Samples many
 * random partitions and picks randomly among the most balanced —
 * gives real variety on "re-roll" while staying fair.
 */
export function splitBalanced(
  players: Player[]
): { bracketA: Player[]; bracketB: Player[]; diff: number } {
  const n = players.length;
  const sizeA = Math.ceil(n / 2);

  let candidates: { a: Player[]; b: Player[]; diff: number }[] = [];
  let bestDiff = Infinity;

  for (let i = 0; i < 400; i++) {
    const shuffled = shuffle(players);
    const a = shuffled.slice(0, sizeA);
    const b = shuffled.slice(sizeA);
    const sumA = a.reduce((s, p) => s + p.skill_rank, 0);
    const sumB = b.reduce((s, p) => s + p.skill_rank, 0);
    const diff = Math.abs(sumA - sumB);

    if (diff < bestDiff) {
      bestDiff = diff;
      candidates = [{ a, b, diff }];
    } else if (diff === bestDiff) {
      candidates.push({ a, b, diff });
    }
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { bracketA: pick.a, bracketB: pick.b, diff: pick.diff };
}

/** Classic recursive tournament seeding order (1v8, 4v5, 2v7, 3v6, ...). */
export function generateSeedOrder(bracketSize: number): number[] {
  let order = [1];
  let size = 1;
  while (size < bracketSize) {
    size *= 2;
    const next: number[] = [];
    for (const s of order) next.push(s, size + 1 - s);
    order = next;
  }
  return order;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

const ROUND_NAMES_FROM_END = ["SF", "QF", "R16", "R32", "R64"];
function roundLabel(roundsFromEnd: number): string {
  return ROUND_NAMES_FROM_END[roundsFromEnd - 1] ?? `R${roundsFromEnd}`;
}

/** Chronological tournament progression, earliest round first. */
const ROUND_PROGRESSION = [...ROUND_NAMES_FROM_END].reverse().concat("Final");

/** Sort key for a round name in actual tournament order (R64→...→SF→Final)
 * instead of alphabetical order, where "QF" would wrongly sort before "R16". */
export function roundSortIndex(round: string): number {
  const i = ROUND_PROGRESSION.indexOf(round);
  return i === -1 ? ROUND_PROGRESSION.length : i;
}

export type MatchInsert = Omit<Match, "created_at"> & { created_at?: string };

/** A match with no real opponent — the seeded player advances as a walkover. */
export function isByeMatch(match: Pick<Match, "status" | "player1_id" | "player2_id">): boolean {
  return match.status === "completed" && (!match.player1_id || !match.player2_id);
}

/**
 * Seeds players within a bracket by skill (highest first) and builds every
 * round of matches for that bracket up to (but not including) the cross-
 * bracket Final, wiring next_match_id/slot so winners can auto-advance.
 * Byes (non-power-of-2 sizes) auto-complete as a walkover, with the highest
 * remaining seeds receiving them first — standard tournament practice.
 */
function buildSingleBracket(
  bracketId: BracketId,
  players: Player[],
  teamByPlayer: Map<string, string>
): { matches: MatchInsert[]; finalMatch: MatchInsert | null } {
  const n = players.length;
  if (n === 0) return { matches: [], finalMatch: null };

  if (n === 1) {
    // A lone player in this bracket has no one to play — they're a bye
    // straight through to the cross-bracket Final. Still represented as a
    // real (already-completed) match row so the UI can display it as a bye
    // rather than leaving the Final's slot silently unfilled.
    const solo = players[0];
    const m: MatchInsert = {
      id: crypto.randomUUID(),
      round: roundLabel(1),
      bracket: bracketId,
      match_order: 0,
      player1_id: solo.id,
      player2_id: null,
      player1_team_id: teamByPlayer.get(solo.id) ?? null,
      player2_team_id: null,
      score1: 0,
      score2: 0,
      status: "completed",
      scheduled_time: null,
      started_at: null,
      completed_at: new Date().toISOString(),
      winner_id: solo.id,
      next_match_id: null,
      next_match_slot: null,
    };
    return { matches: [m], finalMatch: m };
  }

  const seeded = [...players].sort((a, b) => b.skill_rank - a.skill_rank);
  const size = nextPow2(n);
  const seedOrder = generateSeedOrder(size);
  const totalRounds = Math.log2(size);
  const slots: (Player | null)[] = seedOrder.map((seed) =>
    seed <= n ? seeded[seed - 1] : null
  );

  const all: MatchInsert[] = [];
  let prevRound: MatchInsert[] = [];

  for (let i = 0; i < size; i += 2) {
    const p1 = slots[i];
    const p2 = slots[i + 1];
    const isBye = !p1 || !p2;
    const winner = isBye ? p1 ?? p2 : null;

    const m: MatchInsert = {
      id: crypto.randomUUID(),
      round: roundLabel(totalRounds),
      bracket: bracketId,
      match_order: i / 2,
      player1_id: p1?.id ?? null,
      player2_id: p2?.id ?? null,
      player1_team_id: p1 ? teamByPlayer.get(p1.id) ?? null : null,
      player2_team_id: p2 ? teamByPlayer.get(p2.id) ?? null : null,
      score1: 0,
      score2: 0,
      status: isBye ? "completed" : "scheduled",
      scheduled_time: null,
      started_at: null,
      completed_at: isBye ? new Date().toISOString() : null,
      winner_id: winner?.id ?? null,
      next_match_id: null,
      next_match_slot: null,
    };
    all.push(m);
    prevRound.push(m);
  }

  for (let r = 2; r <= totalRounds; r++) {
    const label = roundLabel(totalRounds - r + 1);
    const nextRound: MatchInsert[] = [];

    for (let i = 0; i < prevRound.length; i += 2) {
      const left = prevRound[i];
      const right = prevRound[i + 1];
      const id = crypto.randomUUID();

      const m: MatchInsert = {
        id,
        round: label,
        bracket: bracketId,
        match_order: i / 2,
        player1_id: left.status === "completed" ? left.winner_id : null,
        player2_id: right.status === "completed" ? right.winner_id : null,
        player1_team_id:
          left.status === "completed" && left.winner_id
            ? teamByPlayer.get(left.winner_id) ?? null
            : null,
        player2_team_id:
          right.status === "completed" && right.winner_id
            ? teamByPlayer.get(right.winner_id) ?? null
            : null,
        score1: 0,
        score2: 0,
        status: "scheduled",
        scheduled_time: null,
        started_at: null,
        completed_at: null,
        winner_id: null,
        next_match_id: null,
        next_match_slot: null,
      };

      left.next_match_id = id;
      left.next_match_slot = 1;
      right.next_match_id = id;
      right.next_match_slot = 2;

      all.push(m);
      nextRound.push(m);
    }

    prevRound = nextRound;
  }

  return { matches: all, finalMatch: prevRound[0] ?? null };
}

/**
 * Builds the complete tournament: both brackets plus the cross-bracket
 * Final that the two bracket winners feed into.
 */
export function buildTournamentMatches(
  bracketA: Player[],
  bracketB: Player[],
  teamByPlayer: Map<string, string>
): MatchInsert[] {
  const a = buildSingleBracket("A", bracketA, teamByPlayer);
  const b = buildSingleBracket("B", bracketB, teamByPlayer);

  const final: MatchInsert = {
    id: crypto.randomUUID(),
    round: "Final",
    bracket: null,
    match_order: 0,
    player1_id: null,
    player2_id: null,
    player1_team_id: null,
    player2_team_id: null,
    score1: 0,
    score2: 0,
    status: "scheduled",
    scheduled_time: null,
    started_at: null,
    completed_at: null,
    winner_id: null,
    next_match_id: null,
    next_match_slot: null,
  };

  if (a.finalMatch) {
    a.finalMatch.next_match_id = final.id;
    a.finalMatch.next_match_slot = 1;
    if (a.finalMatch.status === "completed" && a.finalMatch.winner_id) {
      final.player1_id = a.finalMatch.winner_id;
      final.player1_team_id = teamByPlayer.get(a.finalMatch.winner_id) ?? null;
    }
  }
  if (b.finalMatch) {
    b.finalMatch.next_match_id = final.id;
    b.finalMatch.next_match_slot = 2;
    if (b.finalMatch.status === "completed" && b.finalMatch.winner_id) {
      final.player2_id = b.finalMatch.winner_id;
      final.player2_team_id = teamByPlayer.get(b.finalMatch.winner_id) ?? null;
    }
  }

  return [...a.matches, ...b.matches, final];
}
