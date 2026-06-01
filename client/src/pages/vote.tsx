import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Clock, Trophy, Check, Vote as VoteIcon, Lock, Timer, Users, ChevronRight } from "lucide-react";
import { HeroHeader } from "@/components/hero-header";
import type { HallVoteResponse, HallVoteOption } from "@shared/schema";
import { trackHallVoteCast } from "@/lib/analytics";

function VoteBar({ option, totalVotes, isWinner, isUserVote }: {
  option: HallVoteOption;
  totalVotes: number;
  isWinner: boolean;
  isUserVote: boolean;
}) {
  const pct = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;

  return (
    <div
      className={`relative rounded-lg border p-4 transition-all ${
        isWinner ? "border-primary bg-primary/5" : "border-border/50 bg-card"
      } ${isUserVote ? "ring-2 ring-primary/40" : ""}`}
      data-testid={`vote-result-${option.option_id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isWinner && <Trophy className="w-4 h-4 text-primary flex-shrink-0" />}
          <span className="font-bold text-sm text-foreground truncate">{option.name}</span>
          {isUserVote && (
            <Badge variant="outline" className="text-[10px] flex-shrink-0">Your vote</Badge>
          )}
        </div>
        <span className="font-heading text-xl text-foreground ml-2">{pct}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isWinner ? "bg-primary" : "bg-muted-foreground/30"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-xs text-muted-foreground">
          {option.vote_count} {option.vote_count === 1 ? "vote" : "votes"}
        </span>
        {option.est_time && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />{option.est_time}
          </span>
        )}
      </div>
    </div>
  );
}

export default function VotePage() {
  const { voteId } = useParams<{ voteId: string }>();
  const [vote, setVote] = useState<HallVoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");
  const [hasVoted, setHasVoted] = useState(false);

  const fetchVote = useCallback(async () => {
    try {
      const res = await fetch(`/api/hall-vote/${voteId}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) {
          setError("This vote doesn't exist or has been removed.");
          setLoading(false);
          return;
        }
        throw new Error("Failed to load vote");
      }
      const data: HallVoteResponse = await res.json();
      setVote(data);
      if (data.user_vote !== undefined && data.user_vote !== null) {
        setHasVoted(true);
      }
    } catch {
      setError("Failed to load vote. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [voteId]);

  useEffect(() => {
    fetchVote();
  }, [fetchVote]);

  useEffect(() => {
    if (!vote || vote.status === "closed") return;

    const interval = setInterval(fetchVote, 3000);
    return () => clearInterval(interval);
  }, [vote?.status, fetchVote]);

  const handleVote = async (optionId: number) => {
    if (voting || hasVoted) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/hall-vote/${voteId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
        credentials: "include",
      });

      if (res.status === 409) {
        setHasVoted(true);
        await fetchVote();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to vote");
        return;
      }

      const data: HallVoteResponse = await res.json();
      setVote(data);
      setHasVoted(true);
      const chosen = data.options.find((o) => o.option_id === optionId);
      if (voteId && chosen) {
        trackHallVoteCast({
          voteId,
          optionId,
          optionName: chosen.name,
        });
      }
    } catch {
      setError("Failed to submit vote");
    } finally {
      setVoting(false);
    }
  };

  const handleClose = async () => {
    try {
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
      const csrf = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";

      const res = await fetch(`/api/hall-vote/${voteId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setVote(data);
      }
    } catch {
      // ignore close errors
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Flame className="w-10 h-10 mx-auto animate-pulse" style={{ color: "#C62828" }} />
          <p className="text-muted-foreground text-sm">Loading vote...</p>
        </div>
      </div>
    );
  }

  if (error && !vote) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <Flame className="w-10 h-10 mx-auto" style={{ color: "#C62828" }} />
          <h1 className="font-heading text-3xl tracking-wide text-foreground">VOTE NOT FOUND</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link href="/generator">
            <Button variant="outline" className="font-heading tracking-wider" data-testid="button-back-home">
              BACK TO MEALS
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!vote) return null;

  const isClosed = vote.status === "closed";
  const isExpired = new Date(vote.expires_at) <= new Date();
  const showResults = hasVoted || isClosed || isExpired;

  const maxVotes = Math.max(...vote.options.map((o) => o.vote_count));
  const winnerId = isClosed && vote.total_votes > 0
    ? vote.options.find((o) => o.vote_count === maxVotes)?.option_id
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background/95 backdrop-blur-sm border-b border-border/40 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6" style={{ color: "#C62828" }} />
              <span className="font-heading text-base leading-none tracking-wide text-foreground">FIREHALL MEALS</span>
            </div>
            <Link href="/generator">
              <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
                Generator <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      <HeroHeader title="Hall Vote" subtitle="Vote on tonight's crew meal" />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <VoteIcon className="w-5 h-5 text-primary" />
            <h1 className="font-heading text-3xl sm:text-4xl tracking-wide text-foreground" data-testid="text-vote-title">
              {vote.title.toUpperCase()}
            </h1>
          </div>

          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {vote.total_votes} {vote.total_votes === 1 ? "vote" : "votes"}
            </span>
            {!isClosed && !isExpired && (
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                <TimeRemaining expiresAt={vote.expires_at} />
              </span>
            )}
            {(isClosed || isExpired) && (
              <Badge variant="secondary" className="text-[10px]">
                <Lock className="w-3 h-3 mr-1" />
                Voting closed
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center" data-testid="text-vote-page-error">{error}</p>
        )}

        {!showResults ? (
          <div className="space-y-3">
            <p className="text-sm text-center text-muted-foreground">Tap your pick for tonight</p>
            {vote.options.map((opt) => (
              <button
                key={opt.option_id}
                onClick={() => handleVote(opt.option_id)}
                disabled={voting}
                className="w-full text-left rounded-xl border border-border/50 bg-card p-5 hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.98] disabled:opacity-60"
                data-testid={`button-vote-${opt.option_id}`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-heading text-3xl text-primary leading-none mt-0.5">{opt.option_id + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-base leading-snug">{opt.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{opt.description}</p>
                    <div className="flex gap-3 mt-2">
                      {opt.est_time && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />{opt.est_time}
                        </span>
                      )}
                      {opt.est_cost && (
                        <span className="text-xs text-muted-foreground">{opt.est_cost}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/40 flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {isClosed && winnerId !== undefined && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-primary font-medium">Winner</p>
                    <p className="font-bold text-foreground" data-testid="text-winner">
                      {vote.options.find((o) => o.option_id === winnerId)?.name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isClosed && hasVoted && (
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-green-500" />
                <span>Vote recorded — results update live</span>
              </div>
            )}

            {vote.options.map((opt) => (
              <VoteBar
                key={opt.option_id}
                option={opt}
                totalVotes={vote.total_votes}
                isWinner={winnerId === opt.option_id}
                isUserVote={vote.user_vote === opt.option_id}
              />
            ))}

            <p className="text-center text-xs text-muted-foreground">
              {vote.total_votes} total {vote.total_votes === 1 ? "vote" : "votes"}
            </p>

            {vote.can_close && !isClosed && (
              <Button
                variant="outline"
                className="w-full font-heading tracking-wider"
                onClick={handleClose}
                data-testid="button-close-vote"
              >
                <Lock className="w-4 h-4 mr-2" />
                CLOSE VOTING
              </Button>
            )}
          </div>
        )}

        <footer className="text-center pt-4">
          <p className="text-[10px] text-muted-foreground/40">
            Powered by{" "}
            <a href="https://www.lightsandsirensco.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted-foreground/60 transition-colors">
              Lights & Sirens Co.
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

function TimeRemaining({ expiresAt }: { expiresAt: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setText("Expired");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setText(hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span>{text}</span>;
}
