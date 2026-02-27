import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import type { ClientRecipeResponse } from "@shared/schema";
import { Vote, Copy, Check, ExternalLink, QrCode, Loader2 } from "lucide-react";

interface HallVoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: ClientRecipeResponse[];
}

export function HallVoteModal({ open, onOpenChange, recipes }: HallVoteModalProps) {
  const [step, setStep] = useState<"confirm" | "share">("confirm");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [voteId, setVoteId] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const options = recipes.map((r) => ({
        name: r.title,
        description: r.why_it_fits_tonight,
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
          width: 200,
          margin: 2,
          color: { dark: "#ffffff", light: "#00000000" },
        });
        setQrDataUrl(url);
      } catch {
        // QR generation failed - non-critical
      }
    } catch (err: any) {
      setError(err.message || "Failed to create vote");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-wide flex items-center gap-2">
            <Vote className="w-5 h-5 text-primary" />
            {step === "confirm" ? "START HALL VOTE" : "SHARE WITH THE CREW"}
          </DialogTitle>
        </DialogHeader>

        {step === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Let the crew vote on tonight's meal. Share the link and whoever gets the most votes wins.
            </p>

            <div className="space-y-2">
              {recipes.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card"
                  data-testid={`vote-option-preview-${i}`}
                >
                  <span className="font-heading text-2xl text-primary w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{r.title}</p>
                    <div className="flex gap-2 mt-0.5">
                      {r.timing && (
                        <span className="text-xs text-muted-foreground">{r.timing.total_min} min</span>
                      )}
                      {r.chosen_protein && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{r.chosen_protein}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="text-vote-error">{error}</p>
            )}

            <Button
              onClick={handleCreate}
              disabled={loading}
              className="w-full font-heading text-lg tracking-wider"
              data-testid="button-create-vote"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  CREATING VOTE...
                </>
              ) : (
                <>
                  <Vote className="w-4 h-4 mr-2" />
                  CREATE VOTE
                </>
              )}
            </Button>
          </div>
        )}

        {step === "share" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send this link to the crew. They can vote from their phones — no sign-up needed.
            </p>

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
                onClick={handleCopy}
                data-testid="button-copy-link"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {qrDataUrl && (
              <div className="flex justify-center py-2">
                <div className="bg-card border border-border/50 rounded-lg p-4">
                  <img
                    src={qrDataUrl}
                    alt="QR Code for voting link"
                    className="w-[180px] h-[180px]"
                    data-testid="img-qr-code"
                  />
                  <p className="text-[10px] text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <QrCode className="w-3 h-3" />
                    Scan to vote
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full font-heading tracking-wider"
              onClick={() => window.open(`/vote/${voteId}`, "_blank")}
              data-testid="button-open-results"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              OPEN LIVE RESULTS
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
