import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { ClientRecipeResponse } from "@shared/schema";
import { Vote, Copy, Check, ExternalLink, QrCode, Loader2, Users, Shuffle } from "lucide-react";
import { motion } from "framer-motion";

const TRY_ANOTHER_LABEL = "Try another direction";
const TRY_ANOTHER_DESC =
  "Crew wants a fresh draw — spin up a different dinner option and vote again.";

function buildTryAnotherPayload(): ClientRecipeResponse {
  return {
    title: TRY_ANOTHER_LABEL,
    servings: 6,
    tags: ["Hall vote"],
    timing: { prep_min: 0, cook_min: 0, total_min: 0 },
    ingredients: [],
    steps: [],
    chosen_protein: "any",
    primary_protein_source: "any",
    why_it_fits_tonight: TRY_ANOTHER_DESC,
    _signature: "hall-vote:try-another",
    _id: "hall-vote-try-another",
  };
}

interface HallVoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: ClientRecipeResponse[];
  onGenerateAnother?: () => void;
  isGenerating?: boolean;
}

export function HallVoteModal({
  open,
  onOpenChange,
  recipes,
  onGenerateAnother,
  isGenerating = false,
}: HallVoteModalProps) {
  const [step, setStep] = useState<"confirm" | "share">("confirm");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [voteId, setVoteId] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");

  const voteOptions = useMemo(() => {
    const real = recipes.filter(Boolean).slice(0, 5);
    if (real.length >= 2) return real;
    if (real.length === 1) return [real[0], buildTryAnotherPayload()];
    return [];
  }, [recipes]);

  const canCreate = voteOptions.length >= 2;
  const usingTryAnother = recipes.length === 1;

  useEffect(() => {
    if (!open) return;
    setStep("confirm");
    setShareUrl("");
    setVoteId("");
    setCopied(false);
    setQrDataUrl("");
    setError("");
  }, [open]);

  const handleCreate = async () => {
    if (!canCreate) return;
    setLoading(true);
    setError("");
    try {
      const options = voteOptions.map((r) => ({
        name: r.title,
        description: r.why_it_fits_tonight || r.title,
        est_cost: r.budget_level === "low" ? "$" : r.budget_level === "splurge" ? "$$$" : "$$",
        est_time: r.timing ? `${r.timing.total_min} min` : "",
        recipe_payload: r,
      }));

      const res = await apiRequest("POST", "/api/hall-vote", {
        title: "Tonight's Hall Vote",
        options,
      });
      const data = await res.json();
      setVoteId(data.vote_id);
      setShareUrl(data.share_url);
      setStep("share");

      try {
        const QRCode = await import("qrcode");
        const url = await QRCode.toDataURL(data.share_url, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#ffffff", light: "#00000000" },
        });
        setQrDataUrl(url);
      } catch {
        /* non-critical */
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create vote";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.querySelector<HTMLInputElement>('[data-testid="input-share-url"]');
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep("confirm");
      setShareUrl("");
      setVoteId("");
      setCopied(false);
      setQrDataUrl("");
      setError("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-wide flex items-center gap-2">
            <Vote className="w-5 h-5 text-primary" />
            {step === "confirm" ? "Hall Vote" : "Gather the crew"}
          </DialogTitle>
        </DialogHeader>

        {step === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {usingTryAnother ? (
                <>
                  The crew gathers around the table — vote on tonight&apos;s meal or send it back
                  for another draw. Add a second real option anytime.
                </>
              ) : (
                <>
                  Line up the options, share the QR, and let the hall pick dinner. No accounts —
                  just scan and vote.
                </>
              )}
            </p>

            <div className="space-y-2">
              {voteOptions.map((r, i) => {
                const isAlt = r._id === "hall-vote-try-another";
                return (
                  <div
                    key={(r as ClientRecipeResponse & { _id?: string })._id || i}
                    className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${
                      isAlt ? "border-dashed border-primary/40 bg-primary/5" : "border-border/50"
                    }`}
                    data-testid={`vote-option-preview-${i}`}
                  >
                    <span className="font-heading text-2xl text-primary w-6 text-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{r.title}</p>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {r.timing && r.timing.total_min > 0 && (
                          <span className="text-xs text-muted-foreground">{r.timing.total_min} min</span>
                        )}
                        {r.chosen_protein && !isAlt && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4">
                            {r.chosen_protein}
                          </Badge>
                        )}
                        {isAlt && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-4">
                            Regenerate path
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {usingTryAnother && onGenerateAnother && (
              <Button
                type="button"
                variant="outline"
                className="w-full font-heading tracking-wider gap-2"
                onClick={() => {
                  handleClose();
                  onGenerateAnother();
                }}
                disabled={isGenerating}
                data-testid="button-vote-add-second-meal"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shuffle className="w-4 h-4" />
                )}
                Different Meal
              </Button>
            )}

            {error && (
              <p className="text-sm text-destructive" data-testid="text-vote-error">
                {error}
              </p>
            )}

            <Button
              onClick={handleCreate}
              disabled={loading || !canCreate}
              className="w-full min-h-[48px] font-heading text-lg tracking-wider"
              data-testid="button-create-vote"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating vote…
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Start Hall Vote
                </>
              )}
            </Button>
          </div>
        )}

        {step === "share" && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground text-center">
              Prop the phone on the counter — crew scans, taps, and the hall decides.
            </p>

            {qrDataUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex justify-center"
              >
                <div className="relative">
                  <motion.div
                    className="absolute -inset-3 rounded-2xl bg-primary/25 blur-xl"
                    animate={{ opacity: [0.35, 0.65, 0.35] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="relative bg-zinc-950 border-2 border-primary/50 rounded-2xl p-5 shadow-2xl shadow-primary/20">
                    <img
                      src={qrDataUrl}
                      alt="QR code — scan to vote on tonight's hall dinner"
                      className="w-[min(280px,72vw)] h-[min(280px,72vw)]"
                      data-testid="img-qr-code"
                    />
                    <p className="text-xs text-center text-primary font-semibold uppercase tracking-widest mt-3 flex items-center justify-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5" />
                      Scan to vote
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="text-sm"
                data-testid="input-share-url"
              />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 min-h-[44px] min-w-[44px]"
                onClick={handleCopy}
                data-testid="button-copy-link"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full min-h-[48px] font-heading tracking-wider"
              onClick={() => window.open(`/vote/${voteId}`, "_blank")}
              data-testid="button-open-results"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open live results
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
