"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Minus, Plus, LogOut, Trash2, Megaphone, Camera, Upload } from "lucide-react";
import type {
  Match,
  Player,
  Team,
  Award,
  TournamentState,
  Phase,
  AwardType,
  Announcement,
  GuestPhoto,
  AnnouncementType,
} from "@/lib/types/database";
import {
  setCurrentMatch,
  setPhase,
  updateScore,
  startMatch,
  completeMatch,
  addAward,
  deleteAward,
} from "@/lib/actions/admin";
import {
  addAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  addPhotoRecord,
  deletePhotoRecord,
} from "@/lib/actions/live-features";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/actions/auth";
import { WcBlobField } from "@/components/wc/blob-field";
import { TeamCrest } from "@/components/wc/team-crest";
import { isByeMatch, roundSortIndex } from "@/lib/tournament/bracket";
import { AppBrand } from "@/components/wc/brand";

const PHASES: Phase[] = [
  "pre_draft",
  "drafting",
  "bracket_play",
  "final",
  "wc_final",
  "complete",
];

export function AdminPanelClient({
  initialMatches,
  initialPlayers,
  initialTeams,
  initialAwards,
  initialAnnouncements,
  initialPhotos,
  initialState,
}: {
  initialMatches: Match[];
  initialPlayers: Player[];
  initialTeams: Team[];
  initialAwards: Award[];
  initialAnnouncements: Announcement[];
  initialPhotos: GuestPhoto[];
  initialState: TournamentState;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const players = initialPlayers;
  const teams = initialTeams;
  const awards = initialAwards;
  const announcements = initialAnnouncements;
  const photos = initialPhotos;
  const state = initialState;

  const matches = [...initialMatches].sort(
    (a, b) =>
      (a.bracket ?? "").localeCompare(b.bracket ?? "") ||
      roundSortIndex(a.round) - roundSortIndex(b.round) ||
      a.match_order - b.match_order
  );

  const playerById = new Map(players.map((p) => [p.id, p]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const currentMatch = matches.find((m) => m.id === state.current_match_id) ?? null;
  const otherMatches = matches.filter((m) => m.id !== state.current_match_id);

  function refresh() {
    router.refresh();
  }

  function runAction(fn: () => Promise<void>, successMsg?: string) {
    startTransition(async () => {
      try {
        await fn();
        if (successMsg) toast.success(successMsg);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="wc-gradient-bg min-h-screen pb-24 text-white">
      <WcBlobField />
      <header className="wc-card relative sticky top-0 z-10 flex items-center justify-between rounded-none p-4">
        <AppBrand size="sm" subtitle="Control Panel" />
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="icon">
            <LogOut className="size-4" />
          </Button>
        </form>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 p-4">
        <Card className="wc-card border-amber-400/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-200">Tournament phase</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={state.phase}
              onValueChange={(value) => value && runAction(() => setPhase(value as Phase))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {currentMatch && (
          <MatchCard
            match={currentMatch}
            playerById={playerById}
            teamById={teamById}
            isCurrent
            disabled={isPending}
            onSetCurrent={() => {}}
            onScoreChange={(s1, s2) => runAction(() => updateScore(currentMatch.id, s1, s2))}
            onStart={() => runAction(() => startMatch(currentMatch.id), "Match live")}
            onComplete={() =>
              runAction(() => completeMatch(currentMatch.id), "Match completed — winner advanced")
            }
          />
        )}

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-white/50">
            All matches ({matches.length})
          </p>
          {otherMatches.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.4) }}
            >
              <MatchCard
                match={m}
                playerById={playerById}
                teamById={teamById}
                isCurrent={false}
                disabled={isPending}
                onSetCurrent={() => runAction(() => setCurrentMatch(m.id), "Now showing on display")}
                onScoreChange={(s1, s2) => runAction(() => updateScore(m.id, s1, s2))}
                onStart={() => runAction(() => startMatch(m.id), "Match live")}
                onComplete={() =>
                  runAction(() => completeMatch(m.id), "Match completed — winner advanced")
                }
              />
            </motion.div>
          ))}
        </div>

        <Separator className="bg-white/15" />

        <AwardsSection
          awards={awards}
          players={players}
          disabled={isPending}
          onAdd={(type, category, playerId) =>
            runAction(() => addAward(type, category, playerId), "Award recorded")
          }
          onDelete={(id) => runAction(() => deleteAward(id))}
        />

        <Separator className="bg-white/15" />

        <AnnouncementsSection
          announcements={announcements}
          disabled={isPending}
          onAdd={(text, type, isActive) =>
            runAction(() => addAnnouncement(text, type, isActive), "Announcement added")
          }
          onToggle={(id, isActive) =>
            runAction(() => toggleAnnouncement(id, isActive), "Announcement updated")
          }
          onDelete={(id) =>
            runAction(() => deleteAnnouncement(id), "Announcement deleted")
          }
        />

        <Separator className="bg-white/15" />

        <GuestPhotosSection
          photos={photos}
          disabled={isPending}
          onAdd={async (url, caption) => {
            return new Promise((resolve, reject) => {
              runAction(async () => {
                try {
                  await addPhotoRecord(url, caption);
                  resolve();
                } catch (e) {
                  reject(e);
                  throw e;
                }
              }, "Photo added to wall");
            });
          }}
          onDelete={(id, url) =>
            runAction(() => deletePhotoRecord(id, url), "Photo deleted")
          }
        />
      </div>
    </div>
  );
}

function MatchCard({
  match,
  playerById,
  teamById,
  isCurrent,
  disabled,
  onSetCurrent,
  onScoreChange,
  onStart,
  onComplete,
}: {
  match: Match;
  playerById: Map<string, Player>;
  teamById: Map<string, Team>;
  isCurrent: boolean;
  disabled: boolean;
  onSetCurrent: () => void;
  onScoreChange: (s1: number, s2: number) => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  const p1 = match.player1_id ? playerById.get(match.player1_id) : null;
  const p2 = match.player2_id ? playerById.get(match.player2_id) : null;
  const t1 = match.player1_team_id ? teamById.get(match.player1_team_id) : null;
  const t2 = match.player2_team_id ? teamById.get(match.player2_team_id) : null;
  const bye = isByeMatch(match);
  const byeTeam = match.player1_id ? t1 : t2;
  const byePlayerName = match.player1_id ? p1?.name : p2?.name;

  return (
    <Card
      className={
        isCurrent
          ? "wc-card border-amber-400/60 shadow-[0_0_24px_rgba(255,197,49,0.15)]"
          : "wc-card"
      }
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/80">
          {match.bracket ? `${match.round} · Bracket ${match.bracket}` : match.round}
        </CardTitle>
        <Badge variant={bye ? "outline" : match.status === "live" ? "default" : "secondary"}>
          {bye ? "bye" : match.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {bye ? (
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <TeamCrest team={byeTeam} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{byeTeam?.name ?? "TBD"}</p>
              <p className="truncate text-xs text-white/50">{byePlayerName ?? ""}</p>
            </div>
            <span className="ml-auto shrink-0 text-xs font-semibold uppercase tracking-wide text-white/40">
              Advances — no opponent
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <PlayerScore
              team={t1}
              playerName={p1?.name ?? ""}
              score={match.score1}
              disabled={disabled || !p1}
              onChange={(v) => onScoreChange(v, match.score2)}
            />
            <span className="text-white/40">vs</span>
            <PlayerScore
              team={t2}
              playerName={p2?.name ?? ""}
              score={match.score2}
              align="right"
              disabled={disabled || !p2}
              onChange={(v) => onScoreChange(match.score1, v)}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!isCurrent && (
            <Button size="sm" variant="outline" disabled={disabled} onClick={onSetCurrent}>
              Set as current
            </Button>
          )}
          {match.status === "scheduled" && p1 && p2 && (
            <Button size="sm" disabled={disabled} onClick={onStart}>
              Start match
            </Button>
          )}
          {match.status === "live" && (
            <Button size="sm" disabled={disabled} onClick={onComplete}>
              Complete & advance winner
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerScore({
  team,
  playerName,
  score,
  disabled,
  align = "left",
  onChange,
}: {
  team: Team | null | undefined;
  playerName: string;
  score: number;
  disabled: boolean;
  align?: "left" | "right";
  onChange: (v: number) => void;
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
        <TeamCrest team={team} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{team?.name ?? "TBD"}</p>
          <p className="truncate text-xs text-white/50">{playerName}</p>
        </div>
      </div>
      <div className={`mt-1 flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        <Button
          size="icon-sm"
          variant="outline"
          disabled={disabled || score <= 0}
          onClick={() => onChange(Math.max(0, score - 1))}
        >
          <Minus className="size-3" />
        </Button>
        <span className="w-8 text-center text-xl font-bold tabular-nums">{score}</span>
        <Button
          size="icon-sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange(score + 1)}
        >
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function AwardsSection({
  awards,
  players,
  disabled,
  onAdd,
  onDelete,
}: {
  awards: Award[];
  players: Player[];
  disabled: boolean;
  onAdd: (type: AwardType, category: string, playerId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [type, setType] = useState<AwardType>("medal");
  const [category, setCategory] = useState("");
  const [playerId, setPlayerId] = useState("");
  const playerById = new Map(players.map((p) => [p.id, p]));

  return (
    <Card className="wc-card border-amber-400/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-amber-200">🏅 Awards & medals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {awards.map((a) => (
          <div
            key={a.id}
            className="wc-card flex items-center justify-between rounded-lg px-3 py-2 text-sm"
          >
            <span>
              <Badge className="mr-2">{a.type}</Badge>
              {a.category} — {a.player_id ? playerById.get(a.player_id)?.name : "?"}
            </span>
            <Button size="sm" variant="ghost" disabled={disabled} onClick={() => onDelete(a.id)}>
              Remove
            </Button>
          </div>
        ))}

        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={type} onValueChange={(v) => v && setType(v as AwardType)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trophy">Trophy</SelectItem>
                <SelectItem value="medal">Medal</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 space-y-1">
              <Label htmlFor="award-category" className="sr-only">
                Category
              </Label>
              <Input
                id="award-category"
                placeholder="e.g. Golden Boot"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>
          <Select value={playerId} onValueChange={(v) => setPlayerId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              {players.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full"
            disabled={disabled || !category || !playerId}
            onClick={() => {
              onAdd(type, category, playerId);
              setCategory("");
              setPlayerId("");
            }}
          >
            Record award
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AnnouncementsSection({
  announcements,
  disabled,
  onAdd,
  onToggle,
  onDelete,
}: {
  announcements: Announcement[];
  disabled: boolean;
  onAdd: (text: string, type: AnnouncementType, isActive: boolean) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [type, setType] = useState<AnnouncementType>("info");
  const [isActive] = useState(true);

  return (
    <Card className="wc-card border-amber-400/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-amber-200 flex items-center gap-2">
          <Megaphone className="size-4" /> Live Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {announcements.length === 0 && (
            <p className="text-xs text-white/40 text-center py-2">No announcements created yet.</p>
          )}
          {announcements.map((a) => (
            <div
              key={a.id}
              className="wc-card flex items-center justify-between rounded-lg px-3 py-2 text-sm gap-2"
            >
              <div className="flex flex-col min-w-0">
                <span className="truncate font-medium text-white">{a.text}</span>
                <span className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">
                  {a.type}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant={a.is_active ? "default" : "outline"}
                  className="h-8 px-2.5 text-xs"
                  disabled={disabled}
                  onClick={() => onToggle(a.id, !a.is_active)}
                >
                  {a.is_active ? "Active" : "Inactive"}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300"
                  disabled={disabled}
                  onClick={() => onDelete(a.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-white/10" />

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="announce-text" className="text-xs text-white/70">Message Text</Label>
            <Input
              id="announce-text"
              placeholder="e.g. Pizza is ready! 🍕"
              value={text}
              disabled={disabled}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-white/70">Type</Label>
              <Select
                value={type}
                disabled={disabled}
                onValueChange={(v) => v && setType(v as AnnouncementType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info (Blue)</SelectItem>
                  <SelectItem value="alert">Alert (Red)</SelectItem>
                  <SelectItem value="food">Food (Gold)</SelectItem>
                  <SelectItem value="break">Break (Mint)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={disabled || !text.trim()}
                onClick={() => {
                  onAdd(text.trim(), type, isActive);
                  setText("");
                }}
              >
                Publish Announcement
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GuestPhotosSection({
  photos,
  disabled,
  onAdd,
  onDelete,
}: {
  photos: GuestPhoto[];
  disabled: boolean;
  onAdd: (url: string, caption: string | null) => Promise<void>;
  onDelete: (id: string, url: string) => void;
}) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createBrowserClient();
      
      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      
      const { error } = await supabase.storage
        .from("photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      await onAdd(urlData.publicUrl, caption.trim() || null);
      
      toast.success("Photo uploaded successfully!");
      setFile(null);
      setCaption("");
      
      const fileInput = document.getElementById("photo-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="wc-card border-amber-400/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-amber-200 flex items-center gap-2">
          <Camera className="size-4" /> Guest Photo Wall
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
          {photos.length === 0 && (
            <p className="col-span-3 text-xs text-white/40 text-center py-2">No photos uploaded yet.</p>
          )}
          {photos.map((p) => (
            <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption || "Guest Photo"} className="h-full w-full object-cover" />
              {p.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate text-center">
                  {p.caption}
                </div>
              )}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  size="icon-sm"
                  variant="destructive"
                  className="size-6 rounded-md bg-red-600/80 hover:bg-red-600"
                  disabled={disabled || uploading}
                  onClick={() => onDelete(p.id, p.url)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-white/10" />

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="photo-file" className="text-xs text-white/70">Select Image</Label>
            <Input
              id="photo-file"
              type="file"
              accept="image/*"
              disabled={disabled || uploading}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="file:text-white file:font-semibold text-xs file:bg-white/10 file:border-0 file:rounded-md file:px-2 file:py-1 cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="photo-caption" className="text-xs text-white/70">Caption (Optional)</Label>
            <Input
              id="photo-caption"
              placeholder="e.g. Sameer scoring a screamer!"
              value={caption}
              disabled={disabled || uploading}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          <Button
            className="w-full flex items-center justify-center gap-2"
            disabled={disabled || uploading || !file}
            onClick={handleUpload}
          >
            {uploading ? (
              <span>Uploading...</span>
            ) : (
              <>
                <Upload className="size-4" />
                Upload to Photo Wall
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


