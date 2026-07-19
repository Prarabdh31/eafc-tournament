"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { Player, Team, Match, DraftPick, Award, TournamentState, Announcement, GuestPhoto } from "@/lib/types/database";
import {
  buildLookups,
  NowPlayingView,
  BracketOverviewView,
  StandingsView,
  UpcomingMatchView,
  PlayerSpotlightView,
  WcFinalCountdownView,
  TopScorersView,
  DraftBoardView,
  TrophyCaseView,
  StatsDashboardView,
  AnnouncementView,
  PhotoWallView,
} from "./broadcast-views";
import { isByeMatch } from "@/lib/tournament/bracket";
import { WcBlobField } from "@/components/wc/blob-field";
import { AppBrand } from "@/components/wc/brand";

const ROTATE_MS = 12000;

type ViewId =
  | "now_playing"
  | "bracket"
  | "standings"
  | "upcoming"
  | "spotlight"
  | "top_scorers"
  | "draft_board"
  | "trophy_case"
  | "stats_dashboard"
  | "announcements"
  | "photo_wall"
  | "wc_final";

export function HomeDisplayClient({
  initialPlayers,
  initialTeams,
  initialMatches,
  initialDraftPicks,
  initialAwards,
  initialAnnouncements,
  initialPhotos,
  initialState,
}: {
  initialPlayers: Player[];
  initialTeams: Team[];
  initialMatches: Match[];
  initialDraftPicks: DraftPick[];
  initialAwards: Award[];
  initialAnnouncements: Announcement[];
  initialPhotos: GuestPhoto[];
  initialState: TournamentState;
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [teams, setTeams] = useState(initialTeams);
  const [matches, setMatches] = useState(initialMatches);
  const [draftPicks, setDraftPicks] = useState(initialDraftPicks);
  const [awards, setAwards] = useState(initialAwards);
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [photos, setPhotos] = useState(initialPhotos);
  const [state, setState] = useState(initialState);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [viewIndex, setViewIndex] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const [p, t, m, dp, aw, ts, ann, ph] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("teams").select("*"),
        supabase.from("matches").select("*"),
        supabase.from("draft_picks").select("*").order("pick_number", { ascending: true }),
        supabase.from("awards").select("*").order("awarded_at", { ascending: true }),
        supabase.from("tournament_state").select("*").eq("id", 1).single(),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }),
        supabase.from("guest_photos").select("*").order("created_at", { ascending: false }),
      ]);
      if (p.data) setPlayers(p.data);
      if (t.data) setTeams(t.data);
      if (m.data) setMatches(m.data);
      if (dp.data) setDraftPicks(dp.data);
      if (aw.data) setAwards(aw.data);
      if (ts.data) setState(ts.data);
      if (ann.data) setAnnouncements(ann.data);
      if (ph.data) setPhotos(ph.data);
    }

    const channel = supabase
      .channel("home-display")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_state" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "draft_picks" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "awards" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "guest_photos" }, refetch)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const lookups = useMemo(() => buildLookups(players, teams, draftPicks), [players, teams, draftPicks]);

  const currentMatch = matches.find((m) => m.id === state.current_match_id) ?? null;
  const upcomingMatch =
    matches
      .filter(
        (m) =>
          m.status === "scheduled" &&
          m.player1_id &&
          m.player2_id &&
          m.id !== state.current_match_id
      )
      .sort((a, b) => a.round.localeCompare(b.round))[0] ?? null;

  const draftedPlayers = players.filter((p) => lookups.teamByPlayerId.get(p.id));
  const hasGoals = matches.some((m) => !isByeMatch(m) && (m.score1 > 0 || m.score2 > 0));
  const hasRealMatches = matches.some((m) => !isByeMatch(m));

  const availableViews = useMemo<ViewId[]>(() => {
    const views: ViewId[] = [];
    if (currentMatch) views.push("now_playing");
    if (matches.some((m) => m.bracket)) views.push("bracket");
    if (upcomingMatch) views.push("upcoming");
    if (hasRealMatches) views.push("stats_dashboard");
    if (matches.some((m) => m.status === "completed")) views.push("standings");
    if (hasGoals) views.push("top_scorers");
    if (draftedPlayers.length > 0) views.push("spotlight");
    if (draftPicks.length > 0) views.push("draft_board");
    if (awards.length > 0) views.push("trophy_case");
    if (announcements.some((a) => a.is_active)) views.push("announcements");
    if (photos.length > 0) views.push("photo_wall");
    views.push("wc_final");
    return views.length > 0 ? views : ["wc_final"];
  }, [
    currentMatch,
    matches,
    upcomingMatch,
    draftedPlayers.length,
    draftPicks.length,
    awards.length,
    hasGoals,
    hasRealMatches,
    announcements,
    photos,
  ]);

  const indexRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % availableViews.length;
      setViewIndex(indexRef.current);
      if (availableViews[indexRef.current] === "spotlight") {
        setSpotlightIndex((i) => (i + 1) % Math.max(1, draftedPlayers.length));
      }
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [availableViews, draftedPlayers.length]);

  const safeViewIndex = viewIndex % availableViews.length;
  const activeView = availableViews[safeViewIndex] ?? "wc_final";
  const spotlightPlayer = draftedPlayers[spotlightIndex % Math.max(1, draftedPlayers.length)];

  return (
    <div className="wc-gradient-bg relative flex h-screen w-screen flex-col overflow-hidden text-white">
      <WcBlobField />
      <div className="wc-confetti pointer-events-none absolute inset-x-0 top-0 h-6 opacity-70" />
      <div className="wc-confetti pointer-events-none absolute inset-x-0 bottom-0 h-6 rotate-180 opacity-70" />

      <header className="z-10 flex items-center justify-between px-8 py-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
        <AppBrand size="md" subtitle="FC26 Watch Party Cup" />
        <span className="wc-card rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/90">
          {state.phase.replace("_", " ")}
        </span>
      </header>

      <main className="relative z-10 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full"
          >
            {activeView === "now_playing" && currentMatch && (
              <NowPlayingView match={currentMatch} lookups={lookups} />
            )}
            {activeView === "bracket" && <BracketOverviewView matches={matches} lookups={lookups} />}
            {activeView === "standings" && <StandingsView matches={matches} lookups={lookups} />}
            {activeView === "upcoming" && upcomingMatch && (
              <UpcomingMatchView match={upcomingMatch} lookups={lookups} />
            )}
            {activeView === "spotlight" && spotlightPlayer && (
              <PlayerSpotlightView
                player={spotlightPlayer}
                team={lookups.teamByPlayerId.get(spotlightPlayer.id)}
              />
            )}
            {activeView === "stats_dashboard" && (
              <StatsDashboardView matches={matches} lookups={lookups} />
            )}
            {activeView === "top_scorers" && <TopScorersView matches={matches} lookups={lookups} />}
            {activeView === "draft_board" && (
              <DraftBoardView draftPicks={draftPicks} lookups={lookups} />
            )}
            {activeView === "trophy_case" && <TrophyCaseView awards={awards} lookups={lookups} />}
            {activeView === "announcements" && (
              <AnnouncementView announcements={announcements.filter((a) => a.is_active)} />
            )}
            {activeView === "photo_wall" && (
              <PhotoWallView photos={photos} />
            )}
            {activeView === "wc_final" && <WcFinalCountdownView kickoff={state.wc_final_kickoff} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {currentMatch && currentMatch.status === "live" && activeView !== "now_playing" && (
        <ScoreBug match={currentMatch} lookups={lookups} />
      )}
    </div>
  );
}

function ScoreBug({
  match,
  lookups,
}: {
  match: Match;
  lookups: ReturnType<typeof buildLookups>;
}) {
  const p1 = match.player1_id ? lookups.playerById.get(match.player1_id) : null;
  const p2 = match.player2_id ? lookups.playerById.get(match.player2_id) : null;

  return (
    <div className="wc-card absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border-amber-400/40 px-5 py-2 text-sm font-semibold shadow-lg">
      <span className="text-rose-400">● LIVE</span>
      <span>{p1?.name ?? "TBD"}</span>
      <span className="font-mono text-amber-300">
        {match.score1}–{match.score2}
      </span>
      <span>{p2?.name ?? "TBD"}</span>
    </div>
  );
}
