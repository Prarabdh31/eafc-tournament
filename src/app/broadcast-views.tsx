"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Match, Player, Team, DraftPick, Award, Announcement, GuestPhoto } from "@/lib/types/database";
import { TeamCrest } from "@/components/wc/team-crest";
import { isByeMatch, roundSortIndex } from "@/lib/tournament/bracket";
import { AlertTriangle, Pizza, Clock, Info } from "lucide-react";

export type Lookups = {
  playerById: Map<string, Player>;
  teamById: Map<string, Team>;
  teamByPlayerId: Map<string, Team | undefined>;
};

export function buildLookups(
  players: Player[],
  teams: Team[],
  draftPicks: DraftPick[]
): Lookups {
  const playerById = new Map(players.map((p) => [p.id, p]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const teamByPlayerId = new Map<string, Team | undefined>();
  for (const pick of draftPicks) teamByPlayerId.set(pick.player_id, teamById.get(pick.team_id));
  return { playerById, teamById, teamByPlayerId };
}

/** Small uppercase view label with a solid backing — guarantees contrast
 * regardless of which blob color happens to sit behind it. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="wc-card inline-block rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
      {children}
    </p>
  );
}

export function NowPlayingView({ match, lookups }: { match: Match; lookups: Lookups }) {
  const p1 = match.player1_id ? lookups.playerById.get(match.player1_id) : null;
  const p2 = match.player2_id ? lookups.playerById.get(match.player2_id) : null;
  const t1 = match.player1_team_id ? lookups.teamById.get(match.player1_team_id) : null;
  const t2 = match.player2_team_id ? lookups.teamById.get(match.player2_team_id) : null;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]">
      <SectionLabel>
        {match.status === "live" ? "⚽ Live Now" : "Now Playing"} · {match.round}
        {match.bracket ? ` · Bracket ${match.bracket}` : ""}
      </SectionLabel>
      <div className="flex w-full max-w-4xl items-center justify-center gap-6 sm:gap-16">
        <div className="flex flex-1 flex-col items-center gap-3">
          <TeamCrest team={t1} size="lg" />
          <p className="text-center text-2xl font-black text-white sm:text-3xl">
            {t1?.name ?? "TBD"}
          </p>
          <p className="text-center text-sm text-white/60">{p1?.name ?? ""}</p>
        </div>
        <div className="flex items-center gap-4 text-5xl font-black tabular-nums text-white sm:text-8xl">
          <span>{match.score1}</span>
          <span className="text-white/30">–</span>
          <span>{match.score2}</span>
        </div>
        <div className="flex flex-1 flex-col items-center gap-3">
          <TeamCrest team={t2} size="lg" />
          <p className="text-center text-2xl font-black text-white sm:text-3xl">
            {t2?.name ?? "TBD"}
          </p>
          <p className="text-center text-sm text-white/60">{p2?.name ?? ""}</p>
        </div>
      </div>
    </div>
  );
}

const BRACKET_STYLE = {
  A: {
    border: "border-emerald-400/30",
    ring: "shadow-[0_0_30px_rgba(16,185,129,0.12)]",
    title: "text-emerald-300",
    row: "bg-emerald-400/10",
  },
  B: {
    border: "border-sky-400/30",
    ring: "shadow-[0_0_30px_rgba(56,189,248,0.12)]",
    title: "text-sky-300",
    row: "bg-sky-400/10",
  },
} as const;

function BracketSlot({
  team,
  player,
  isWinner,
  isBye,
  align,
}: {
  team: Team | null | undefined;
  player: Player | null | undefined;
  isWinner: boolean;
  isBye?: boolean;
  align: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <TeamCrest team={team} size="sm" />
      <div className="min-w-0">
        <p className={"truncate text-sm " + (isWinner ? "font-bold text-amber-300" : "text-white")}>
          {isWinner && align === "left" ? "🏅 " : ""}
          {team?.name ?? (isBye ? "— bye —" : "TBD")}
          {isWinner && align === "right" ? " 🏅" : ""}
        </p>
        <p className="truncate text-[11px] text-white/50">{player?.name ?? ""}</p>
      </div>
    </div>
  );
}

export function BracketOverviewView({
  matches,
  lookups,
}: {
  matches: Match[];
  lookups: Lookups;
}) {
  const byBracket = (b: "A" | "B") =>
    matches
      .filter((m) => m.bracket === b)
      .sort((a, b2) => roundSortIndex(a.round) - roundSortIndex(b2.round) || a.match_order - b2.match_order);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <SectionLabel>🏆 Bracket Overview</SectionLabel>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2">
        {(["A", "B"] as const).map((b) => {
          const style = BRACKET_STYLE[b];
          return (
            <div key={b} className={`wc-card rounded-2xl p-4 ${style.border} ${style.ring}`}>
              <p className={`mb-3 text-center text-lg font-bold ${style.title}`}>Bracket {b}</p>
              <div className="space-y-2">
                {byBracket(b).map((m, i) => {
                  const p1 = m.player1_id ? lookups.playerById.get(m.player1_id) : null;
                  const p2 = m.player2_id ? lookups.playerById.get(m.player2_id) : null;
                  const t1 = m.player1_team_id ? lookups.teamById.get(m.player1_team_id) : null;
                  const t2 = m.player2_team_id ? lookups.teamById.get(m.player2_team_id) : null;
                  const bye = isByeMatch(m);
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${style.row} ${bye ? "opacity-70" : ""}`}
                    >
                      <BracketSlot
                        team={t1}
                        player={p1}
                        isWinner={m.winner_id === m.player1_id}
                        isBye={bye}
                        align="left"
                      />
                      <span
                        className={`shrink-0 text-xs ${bye ? "font-semibold uppercase tracking-wide text-white/40" : "text-white/50"}`}
                      >
                        {bye
                          ? "Bye"
                          : m.status === "scheduled"
                            ? m.round
                            : `${m.score1}-${m.score2}`}
                      </span>
                      <BracketSlot
                        team={t2}
                        player={p2}
                        isWinner={m.winner_id === m.player2_id}
                        isBye={bye}
                        align="right"
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StandingsView({ matches, lookups }: { matches: Match[]; lookups: Lookups }) {
  const completed = matches
    .filter((m) => m.status === "completed" && !isByeMatch(m))
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <SectionLabel>📊 Results So Far</SectionLabel>
      <div className="w-full max-w-2xl space-y-2">
        {completed.length === 0 && (
          <p className="text-center text-white/50">No completed matches yet</p>
        )}
        {completed.slice(0, 8).map((m, i) => {
          const t1 = m.player1_team_id ? lookups.teamById.get(m.player1_team_id) : null;
          const t2 = m.player2_team_id ? lookups.teamById.get(m.player2_team_id) : null;
          const p1 = m.player1_id ? lookups.playerById.get(m.player1_id) : null;
          const p2 = m.player2_id ? lookups.playerById.get(m.player2_id) : null;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="wc-card flex items-center justify-between gap-3 rounded-xl px-4 py-2"
            >
              <div className="flex flex-1 items-center justify-end gap-2 text-right">
                <div className="min-w-0">
                  <p
                    className={
                      "truncate " +
                      (m.winner_id === m.player1_id ? "font-bold text-amber-300" : "text-white/80")
                    }
                  >
                    {t1?.name ?? "TBD"}
                  </p>
                  <p className="truncate text-xs text-white/50">{p1?.name ?? ""}</p>
                </div>
                <TeamCrest team={t1} size="sm" />
              </div>
              <span className="shrink-0 font-mono text-lg font-bold text-white">
                {m.score1} – {m.score2}
              </span>
              <div className="flex flex-1 items-center gap-2 text-left">
                <TeamCrest team={t2} size="sm" />
                <div className="min-w-0">
                  <p
                    className={
                      "truncate " +
                      (m.winner_id === m.player2_id ? "font-bold text-amber-300" : "text-white/80")
                    }
                  >
                    {t2?.name ?? "TBD"}
                  </p>
                  <p className="truncate text-xs text-white/50">{p2?.name ?? ""}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function UpcomingMatchView({ match, lookups }: { match: Match; lookups: Lookups }) {
  const p1 = match.player1_id ? lookups.playerById.get(match.player1_id) : null;
  const p2 = match.player2_id ? lookups.playerById.get(match.player2_id) : null;
  const t1 = match.player1_team_id ? lookups.teamById.get(match.player1_team_id) : null;
  const t2 = match.player2_team_id ? lookups.teamById.get(match.player2_team_id) : null;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]">
      <SectionLabel>
        ⏭ Up Next · {match.round}
        {match.bracket ? ` · Bracket ${match.bracket}` : ""}
      </SectionLabel>
      <div className="flex items-center gap-8 sm:gap-16">
        <div className="flex flex-col items-center gap-3">
          <TeamCrest team={t1} size="lg" />
          <p className="text-xl font-black text-white sm:text-2xl">{t1?.name ?? "TBD"}</p>
          <p className="text-sm text-white/60">{p1?.name ?? ""}</p>
        </div>
        <span className="text-3xl font-black text-[#FFD23F]">VS</span>
        <div className="flex flex-col items-center gap-3">
          <TeamCrest team={t2} size="lg" />
          <p className="text-xl font-black text-white sm:text-2xl">{t2?.name ?? "TBD"}</p>
          <p className="text-sm text-white/60">{p2?.name ?? ""}</p>
        </div>
      </div>
    </div>
  );
}

export function PlayerSpotlightView({
  player,
  team,
}: {
  player: Player;
  team: Team | undefined;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]">
      <SectionLabel>🌟 Player Spotlight</SectionLabel>
      <TeamCrest team={team} size="lg" />
      <h2 className="text-4xl font-black text-white sm:text-6xl">{team?.name ?? "No team drafted yet"}</h2>
      <p className="text-xl text-white/70">{player.name}</p>
      {player.bracket && (
        <span
          className={
            "rounded-full px-4 py-1 text-sm font-semibold text-white " +
            (player.bracket === "A" ? "bg-[#3DBB5E]" : "bg-[#2E45D6]")
          }
        >
          Bracket {player.bracket}
        </span>
      )}
    </div>
  );
}

function useCountdown(target: string) {
  // Start at null on both server and client — reading Date.now() during
  // the initial render would diverge between SSR time and hydration time
  // and trigger a hydration mismatch. The real value is set client-only.
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    function tick() {
      setRemaining(new Date(target).getTime() - Date.now());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return remaining;
}

export function WcFinalCountdownView({ kickoff }: { kickoff: string }) {
  const remaining = useCountdown(kickoff);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)]">
      <SectionLabel>🏆 FIFA World Cup 2026 Final</SectionLabel>
      <div className="flex items-center gap-8 sm:gap-16">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/flags/argentina.png"
            alt="Argentina"
            className="size-10 rounded-full object-cover ring-4 ring-[#FFD23F]/30 sm:size-16"
          />
          <p className="text-3xl font-black text-white sm:text-5xl">Argentina</p>
        </div>
        <span className="text-2xl text-white/40 sm:text-3xl">vs</span>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/flags/spain.png"
            alt="Spain"
            className="size-10 rounded-full object-cover ring-4 ring-[#FFD23F]/30 sm:size-16"
          />
          <p className="text-3xl font-black text-white sm:text-5xl">Spain</p>
        </div>
      </div>
      {remaining === null ? (
        <div className="flex gap-4 font-mono text-4xl font-black tabular-nums opacity-0 sm:text-6xl">
          <TimeUnit value={0} label="hrs" />
          <span>:</span>
          <TimeUnit value={0} label="min" />
          <span>:</span>
          <TimeUnit value={0} label="sec" />
        </div>
      ) : remaining <= 0 ? (
        <p className="text-2xl font-bold text-amber-300">Kickoff!</p>
      ) : (
        <CountdownClock remaining={remaining} />
      )}
    </div>
  );
}

function CountdownClock({ remaining }: { remaining: number }) {
  const totalSeconds = Math.max(0, Math.floor(remaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="wc-card flex gap-4 rounded-2xl px-8 py-5 font-mono text-4xl font-black tabular-nums text-amber-200 sm:text-6xl">
      <TimeUnit value={hours} label="hrs" />
      <span className="text-white/30">:</span>
      <TimeUnit value={minutes} label="min" />
      <span className="text-white/30">:</span>
      <TimeUnit value={seconds} label="sec" />
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span>{String(value).padStart(2, "0")}</span>
      <span className="font-sans text-xs font-normal uppercase tracking-widest text-white/40">
        {label}
      </span>
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** Golden Boot leaderboard — goals scored, summed across every match a
 * player has appeared in (bye walkovers don't count as goals). */
export function TopScorersView({ matches, lookups }: { matches: Match[]; lookups: Lookups }) {
  const goals = new Map<string, number>();
  for (const m of matches) {
    if (isByeMatch(m)) continue;
    if (m.player1_id) goals.set(m.player1_id, (goals.get(m.player1_id) ?? 0) + m.score1);
    if (m.player2_id) goals.set(m.player2_id, (goals.get(m.player2_id) ?? 0) + m.score2);
  }

  const ranked = [...goals.entries()]
    .map(([playerId, total]) => ({
      player: lookups.playerById.get(playerId),
      team: lookups.teamByPlayerId.get(playerId),
      total,
    }))
    .filter((r) => r.player)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <SectionLabel>⚽ Golden Boot Race</SectionLabel>
      <div className="w-full max-w-xl space-y-2">
        {ranked.length === 0 && <p className="text-center text-white/50">No goals scored yet</p>}
        {ranked.map((r, i) => (
          <motion.div
            key={r.player!.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className="wc-card flex items-center gap-3 rounded-xl px-4 py-2.5"
          >
            <span className="w-8 shrink-0 text-center text-lg font-black text-amber-300">
              {MEDALS[i] ?? `#${i + 1}`}
            </span>
            <TeamCrest team={r.team} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-white">{r.team?.name ?? r.player!.name}</p>
              <p className="truncate text-xs text-white/50">{r.player!.name}</p>
            </div>
            <span className="shrink-0 font-mono text-2xl font-black text-white">{r.total}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Draft recap — the full pick order, team-first, for anyone who missed
 * the draft or wants to relive it. */
export function DraftBoardView({
  draftPicks,
  lookups,
}: {
  draftPicks: DraftPick[];
  lookups: Lookups;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <SectionLabel>📋 Draft Board</SectionLabel>
      <div className="grid max-h-[65vh] w-full max-w-4xl grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
        {draftPicks.map((pick, i) => {
          const player = lookups.playerById.get(pick.player_id);
          const team = lookups.teamById.get(pick.team_id);
          return (
            <motion.div
              key={pick.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.6) }}
              className="wc-card flex items-center gap-2 rounded-lg px-3 py-2"
            >
              <span className="w-6 shrink-0 text-center text-xs font-bold text-white/40">
                {pick.pick_number}
              </span>
              <TeamCrest team={team} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{team?.name ?? "TBD"}</p>
                <p className="truncate text-[11px] text-white/50">{player?.name ?? ""}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Trophy case — admin-recorded awards, currently invisible anywhere else
 * in the app. Trophy first, then medals in the order they were awarded. */
export function TrophyCaseView({ awards, lookups }: { awards: Award[]; lookups: Lookups }) {
  const ordered = [...awards].sort((a, b) => (a.type === b.type ? 0 : a.type === "trophy" ? -1 : 1));

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <SectionLabel>🏆 Trophy Case</SectionLabel>
      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {ordered.length === 0 && <p className="col-span-2 text-center text-white/50">No awards yet</p>}
        {ordered.map((a, i) => {
          const player = a.player_id ? lookups.playerById.get(a.player_id) : null;
          const team = a.player_id ? lookups.teamByPlayerId.get(a.player_id) : null;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className={`wc-card flex items-center gap-3 rounded-2xl p-4 ${
                a.type === "trophy" ? "border-amber-400/50" : "border-white/15"
              }`}
            >
              <span className="text-3xl">{a.type === "trophy" ? "🏆" : "🎖️"}</span>
              <TeamCrest team={team} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-amber-200">{a.category}</p>
                <p className="truncate font-bold text-white">{player?.name ?? "—"}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/** Aggregate broadcast "match facts" — goals, matches played/remaining,
 * scoring rate, and the biggest win margin so far. */
export function StatsDashboardView({ matches, lookups }: { matches: Match[]; lookups: Lookups }) {
  const real = matches.filter((m) => !isByeMatch(m));
  const played = real.filter((m) => m.status === "completed");
  const remaining = real.filter((m) => m.status !== "completed");
  const totalGoals = played.reduce((s, m) => s + m.score1 + m.score2, 0);
  const avgGoals = played.length ? (totalGoals / played.length).toFixed(1) : "0.0";

  const biggest = [...played].sort(
    (a, b) => Math.abs(b.score1 - b.score2) - Math.abs(a.score1 - a.score2)
  )[0];
  const biggestMargin = biggest ? Math.abs(biggest.score1 - biggest.score2) : 0;
  const biggestWinnerTeamId =
    biggest && biggestMargin > 0
      ? biggest.score1 > biggest.score2
        ? biggest.player1_team_id
        : biggest.player2_team_id
      : null;
  const biggestWinner = biggestWinnerTeamId ? lookups.teamById.get(biggestWinnerTeamId) : null;

  const tiles = [
    { label: "Goals Scored", value: totalGoals, icon: "⚽" },
    { label: "Matches Played", value: played.length, icon: "✅" },
    { label: "Matches Remaining", value: remaining.length, icon: "⏳" },
    { label: "Goals / Match", value: avgGoals, icon: "📈" },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <SectionLabel>📊 Tournament Pulse</SectionLabel>
      <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
            className="wc-card flex flex-col items-center gap-1 rounded-2xl p-5"
          >
            <span className="text-2xl">{t.icon}</span>
            <span className="text-3xl font-black text-white">{t.value}</span>
            <span className="text-center text-[11px] uppercase tracking-wide text-white/50">
              {t.label}
            </span>
          </motion.div>
        ))}
      </div>
      {biggest && biggestMargin > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="wc-card flex items-center gap-3 rounded-2xl px-6 py-3"
        >
          <span className="text-xl">🔥</span>
          <p className="text-sm text-white/80">
            Biggest win: <span className="font-bold text-amber-300">{biggestWinner?.name ?? "?"}</span>{" "}
            by {biggestMargin} goal{biggestMargin === 1 ? "" : "s"}
          </p>
        </motion.div>
      )}
    </div>
  );
}

/** Live Announcements view. Displays the active announcements.
 * If there are multiple active announcements, it shows the latest one. */
export function AnnouncementView({ announcements }: { announcements: Announcement[] }) {
  const active = announcements[0]; // get the latest active one
  if (!active) return null;

  const styleMap = {
    info: {
      bg: "bg-blue-600",
      border: "border-blue-400",
      icon: <Info className="size-16 text-blue-200" />,
      title: "Notice",
    },
    alert: {
      bg: "bg-red-600",
      border: "border-red-400",
      icon: <AlertTriangle className="size-16 text-red-200" />,
      title: "Attention",
    },
    food: {
      bg: "bg-amber-500",
      border: "border-amber-400",
      icon: <Pizza className="size-16 text-amber-100" />,
      title: "Food Alert",
    },
    break: {
      bg: "bg-[#4fe0c0]",
      border: "border-teal-300",
      icon: <Clock className="size-16 text-teal-900" />,
      title: "Intermission",
    },
  };

  const currentStyle = styleMap[active.type] || styleMap.info;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <SectionLabel>📢 Live Broadcast Ticker</SectionLabel>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className={`w-full max-w-2xl rounded-3xl border-4 p-8 text-center shadow-[0_15px_30px_rgba(0,0,0,0.5)] ${currentStyle.bg} ${currentStyle.border}`}
      >
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-white/15 p-4 animate-bounce">
            {currentStyle.icon}
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
            {currentStyle.title}
          </p>
          <h2 className="text-3xl font-black text-white sm:text-5xl leading-tight">
            {active.text}
          </h2>
        </div>
      </motion.div>
    </div>
  );
}

/** Photo Wall slideshow. Rotates through uploaded photos, displaying
 * them as physical polaroids with captions and realistic tilts. */
export function PhotoWallView({ photos }: { photos: GuestPhoto[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [photos]);

  const photo = photos[index % photos.length];
  if (!photo) return null;

  const tilt = index % 2 === 0 ? 3 : -3;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
      <SectionLabel>📸 Watch Party Snaps</SectionLabel>
      
      <div className="relative flex items-center justify-center h-[55vh] w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.8, rotate: tilt * 1.5, y: 30 }}
            animate={{ opacity: 1, scale: 1, rotate: tilt, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotate: -tilt, y: -30 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute bg-white text-black p-4 pb-8 rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.6)] border-[12px] border-white max-w-full"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <div className="aspect-[4/3] w-[320px] max-w-full overflow-hidden bg-gray-100 rounded-sm border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption || "Watch Party Photo"} className="h-full w-full object-cover" />
            </div>
            {photo.caption && (
              <p className="mt-4 text-center text-lg font-bold tracking-tight text-gray-700 italic font-mono px-2 truncate">
                &ldquo;{photo.caption}&rdquo;
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
