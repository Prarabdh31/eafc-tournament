"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import type { Player, Team, DraftPick, TournamentState } from "@/lib/types/database";
import { draftOrder } from "@/lib/tournament/bracket";
import {
  addPlayer,
  updatePlayer,
  deletePlayer,
  startDraft,
  recordPick,
  undoLastPick,
  previewBrackets,
  confirmBrackets,
  resetTournament,
} from "@/lib/actions/draft";
import { WcBlobField } from "@/components/wc/blob-field";
import { TeamCrest } from "@/components/wc/team-crest";
import { AppBrand } from "@/components/wc/brand";
import { RotateCcw } from "lucide-react";

export function DraftRoomClient({
  initialPlayers,
  initialTeams,
  initialPicks,
  initialState,
}: {
  initialPlayers: Player[];
  initialTeams: Team[];
  initialPicks: DraftPick[];
  initialState: TournamentState;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState(initialState.phase === "pre_draft" ? "roster" : "draft");
  const [preview, setPreview] = useState<{ bracketA: string[]; bracketB: string[]; diff: number } | null>(
    null
  );

  const players = initialPlayers;
  const teams = initialTeams;
  const picks = initialPicks;
  const state = initialState;

  const order = useMemo(() => draftOrder(players), [players]);
  const pickedPlayerIds = new Set(picks.map((p) => p.player_id));
  const onTheClockPlayer = order.find((p) => !pickedPlayerIds.has(p.id)) ?? null;
  const nextPickNumber = picks.length + 1;
  const availableTeams = teams.filter((t) => !t.is_taken);
  const draftComplete = players.length > 0 && picks.length === players.length;

  const playerById = new Map(players.map((p) => [p.id, p]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const teamByPlayerId = new Map(picks.map((pk) => [pk.player_id, teamById.get(pk.team_id)]));

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
    <div className="min-h-screen wc-gradient-bg p-4 text-white sm:p-8">
      <WcBlobField />
      <div className="relative mx-auto max-w-4xl space-y-6">
        <header className="flex items-start justify-between gap-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          <div className="space-y-2">
            <AppBrand size="sm" subtitle="Draft Room" />
            <p className="text-sm text-white/60">
              Phase: <Badge variant="secondary">{state.phase}</Badge>
            </p>
          </div>
          <ResetTournamentButton
            disabled={isPending}
            onConfirm={() => runAction(() => resetTournament(), "Tournament reset to pre-draft")}
          />
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="roster">1. Roster</TabsTrigger>
            <TabsTrigger value="draft">2. Draft</TabsTrigger>
            <TabsTrigger value="brackets">3. Brackets</TabsTrigger>
          </TabsList>

          {/* STEP 1: ROSTER */}
          <TabsContent value="roster" className="space-y-4">
            <Card className="wc-card">
              <CardHeader>
                <CardTitle className="text-base">Players ({players.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Skill rank</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...players]
                      .sort((a, b) => a.skill_rank - b.skill_rank)
                      .map((p) => (
                        <RosterRow
                          key={p.id}
                          player={p}
                          disabled={isPending}
                          onSave={(name, skill) =>
                            runAction(
                              () => updatePlayer(p.id, { name, skill_rank: skill }),
                              "Player updated"
                            )
                          }
                          onDelete={() => runAction(() => deletePlayer(p.id))}
                        />
                      ))}
                  </TableBody>
                </Table>
                <AddPlayerForm
                  disabled={isPending}
                  onAdd={(name, skill) => runAction(() => addPlayer(name, skill))}
                />
              </CardContent>
            </Card>

            <Card className="wc-card">
              <CardHeader>
                <CardTitle className="text-base">
                  National team pool ({teams.filter((t) => !t.is_taken).length} of {teams.length}{" "}
                  available)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {teams.map((t) => (
                    <div
                      key={t.id}
                      className={
                        "flex flex-col items-center gap-1.5 rounded-lg p-2 text-center " +
                        (t.is_taken ? "opacity-35" : "wc-card")
                      }
                    >
                      <TeamCrest team={t} size="sm" />
                      <span className="line-clamp-2 text-[11px] leading-tight text-white/80">
                        {t.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full"
              disabled={isPending || players.length < 2 || teams.length < players.length}
              onClick={() =>
                runAction(async () => {
                  await startDraft();
                  setTab("draft");
                }, "Draft started")
              }
            >
              Start Draft ({players.length} players, {teams.length} teams)
            </Button>
          </TabsContent>

          {/* STEP 2: DRAFT */}
          <TabsContent value="draft" className="space-y-4">
            <Card className="wc-card">
              <CardHeader>
                <CardTitle className="text-base">
                  {draftComplete ? "Draft complete" : `Pick ${nextPickNumber} of ${players.length}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {onTheClockPlayer && !draftComplete && (
                  <OnTheClock
                    player={onTheClockPlayer}
                    availableTeams={availableTeams}
                    disabled={isPending}
                    onPick={(teamId) =>
                      runAction(
                        () => recordPick(nextPickNumber, onTheClockPlayer.id, teamId),
                        `${onTheClockPlayer.name} drafted`
                      )
                    }
                  />
                )}

                {draftComplete && (
                  <p className="text-sm text-white/60">
                    All players have drafted a team. Head to the Brackets tab.
                  </p>
                )}

                <Separator className="bg-white/10" />

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-white/50">
                    Draft order (lowest skill first)
                  </p>
                  {order.map((p, i) => {
                    const pick = picks.find((pk) => pk.player_id === p.id);
                    const team = pick ? teamById.get(pick.team_id) : null;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md border border-white/15 px-3 py-2 text-sm"
                      >
                        <span>
                          {i + 1}. {p.name}{" "}
                          <span className="text-white/50">(skill {p.skill_rank})</span>
                        </span>
                        {team ? (
                          <span className="flex items-center gap-2">
                            <TeamCrest team={team} size="sm" />
                            <Badge>{team.name}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              onClick={() => runAction(() => undoLastPick(pick!.id, pick!.team_id))}
                            >
                              Undo
                            </Button>
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STEP 3: BRACKETS */}
          <TabsContent value="brackets" className="space-y-4">
            <Card className="wc-card">
              <CardHeader>
                <CardTitle className="text-base">Bracket randomizer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!draftComplete && (
                  <p className="text-sm text-white/60">
                    Finish the draft before generating brackets.
                  </p>
                )}

                {draftComplete && state.phase !== "bracket_play" && (
                  <>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await previewBrackets(players);
                          setPreview(result);
                        })
                      }
                    >
                      {preview ? "Re-roll" : "Randomize brackets"}
                    </Button>

                    {preview && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <BracketPreview
                          label="Bracket A"
                          ids={preview.bracketA}
                          playerById={playerById}
                          teamByPlayerId={teamByPlayerId}
                        />
                        <BracketPreview
                          label="Bracket B"
                          ids={preview.bracketB}
                          playerById={playerById}
                          teamByPlayerId={teamByPlayerId}
                        />
                      </div>
                    )}

                    {preview && (
                      <p className="text-xs text-white/50">
                        Skill sum difference between brackets: {preview.diff}
                      </p>
                    )}

                    {preview && (
                      <Button
                        size="lg"
                        className="w-full"
                        disabled={isPending}
                        onClick={() =>
                          runAction(
                            () => confirmBrackets(preview.bracketA, preview.bracketB),
                            "Brackets confirmed — matches generated"
                          )
                        }
                      >
                        Confirm & generate matches
                      </Button>
                    )}
                  </>
                )}

                {state.phase === "bracket_play" && (
                  <div className="space-y-3">
                    <p className="text-sm text-white/60">
                      Brackets are locked in. Recreate this seeding inside EAFC Tournament Mode,
                      then run the tournament from the Control Panel.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <BracketPreview
                        label="Bracket A"
                        ids={players
                          .filter((p) => p.bracket === "A")
                          .sort((a, b) => b.skill_rank - a.skill_rank)
                          .map((p) => p.id)}
                        playerById={playerById}
                        teamByPlayerId={teamByPlayerId}
                      />
                      <BracketPreview
                        label="Bracket B"
                        ids={players
                          .filter((p) => p.bracket === "B")
                          .sort((a, b) => b.skill_rank - a.skill_rank)
                          .map((p) => p.id)}
                        playerById={playerById}
                        teamByPlayerId={teamByPlayerId}
                      />
                    </div>
                    <Link
                      href="/admin"
                      className={buttonVariants({ size: "lg", className: "w-full" })}
                    >
                      Go to Control Panel
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RosterRow({
  player,
  disabled,
  onSave,
  onDelete,
}: {
  player: Player;
  disabled: boolean;
  onSave: (name: string, skill: number) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [skill, setSkill] = useState(String(player.skill_rank));

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="h-8 w-20"
          />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              disabled={disabled || !name || !skill}
              onClick={() => {
                onSave(name, Number(skill));
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setName(player.name);
                setSkill(String(player.skill_rank));
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{player.name}</TableCell>
      <TableCell>{player.skill_rank}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" disabled={disabled} onClick={onDelete}>
            Remove
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ResetTournamentButton({
  disabled,
  onConfirm,
}: {
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" disabled={disabled}>
            <RotateCcw className="size-3.5" />
            Reset Tournament
          </Button>
        }
      />
      <DialogContent className="wc-card border-none">
        <DialogHeader>
          <DialogTitle className="text-white">Reset the entire tournament?</DialogTitle>
          <DialogDescription className="text-white/60">
            This permanently deletes every match, draft pick, and award, un-takes every team, and
            reverts the tournament to <strong>pre-draft</strong>. Your player roster and the team
            pool itself are kept. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <DialogClose render={<Button variant="destructive" onClick={onConfirm} />}>
            Yes, reset everything
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPlayerForm({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (name: string, skill: number) => void;
}) {
  const [name, setName] = useState("");
  const [skill, setSkill] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name || !skill) return;
        onAdd(name, Number(skill));
        setName("");
        setSkill("");
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="player-name">Name</Label>
        <Input id="player-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="player-skill">Skill rank</Label>
        <Input
          id="player-skill"
          type="number"
          className="w-24"
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={disabled}>
        Add player
      </Button>
    </form>
  );
}

function OnTheClock({
  player,
  availableTeams,
  disabled,
  onPick,
}: {
  player: Player;
  availableTeams: Team[];
  disabled: boolean;
  onPick: (teamId: string) => void;
}) {
  const [teamId, setTeamId] = useState<string>("");
  return (
    <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-300">
        🎮 On the clock: {player.name} (skill {player.skill_rank})
      </p>
      <div className="flex flex-wrap gap-2">
        <Select value={teamId} onValueChange={(value) => setTeamId(value ?? "")}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {availableTeams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  {t.crest_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.crest_url} alt="" className="h-3.5 w-5 rounded-sm object-cover" />
                  ) : null}
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={disabled || !teamId}
          onClick={() => {
            onPick(teamId);
            setTeamId("");
          }}
        >
          Confirm pick
        </Button>
      </div>
    </div>
  );
}

function BracketPreview({
  label,
  ids,
  playerById,
  teamByPlayerId,
}: {
  label: string;
  ids: string[];
  playerById: Map<string, Player>;
  teamByPlayerId: Map<string, Team | undefined>;
}) {
  const sum = ids.reduce((s, id) => s + (playerById.get(id)?.skill_rank ?? 0), 0);
  const isA = label.trim().endsWith("A");
  return (
    <div className={`wc-card rounded-lg p-3 ${isA ? "border-emerald-400/30" : "border-sky-400/30"}`}>
      <p className={`mb-2 text-sm font-semibold ${isA ? "text-emerald-300" : "text-sky-300"}`}>
        {label} <span className="text-white/50">(skill sum {sum})</span>
      </p>
      <ol className="space-y-1 text-sm">
        {ids.map((id, i) => {
          const p = playerById.get(id);
          const team = teamByPlayerId.get(id);
          return (
            <li key={id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 truncate">
                {team && <TeamCrest team={team} size="sm" />}
                {i + 1}. {team?.name ?? p?.name}
              </span>
              <span className="shrink-0 text-white/50">skill {p?.skill_rank}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
