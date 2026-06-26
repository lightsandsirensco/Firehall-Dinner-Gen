import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { HALL_LINKED } from "@/lib/brand-copy";
import { useToast } from "@/hooks/use-toast";
import { trackHallJoined } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface JoinHallFormProps {
  initialJoinCode?: string;
  initialInviteToken?: string;
  initialInviteCode?: string;
  onJoined?: (hallId: string) => void;
  className?: string;
  /** Hide advanced hall ID join — activation funnel */
  compact?: boolean;
}

export function JoinHallForm({
  initialJoinCode,
  initialInviteToken,
  initialInviteCode,
  onJoined,
  className,
  compact = false,
}: JoinHallFormProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState(initialJoinCode ?? "");
  const [hallId, setHallId] = useState("");

  const handleJoin = async (payload: Record<string, string | undefined>) => {
    const joinBody = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => typeof v === "string" && v.length > 0),
    ) as Record<string, string>;
    setBusy(true);
    try {
      const res = await apiRequest("POST", "/api/halls/join", joinBody);
      const data = await res.json();
      trackHallJoined(data.hall.hall_id, data.via);
      toast({ title: `Linked to ${data.hall.hall_name}` });
      onJoined?.(data.hall.hall_id);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message.includes("401")
          ? "Sign in first, then try your code again."
          : "Check your code — it may be wrong or expired.";
      toast({ title: `Could not ${HALL_LINKED.join.toLowerCase()}`, description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCodeJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    const payload =
      initialInviteToken || (code.length > 10 && !code.includes(" "))
        ? { invite_token: initialInviteToken ?? code }
        : code.length <= 8
          ? { join_code: code }
          : { invite_code: code };
    await handleJoin(payload);
  };

  const handleIdJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hallId.trim()) return;
    await handleJoin({ hall_id: hallId.trim() });
  };

  if (initialInviteToken || initialInviteCode) {
    return (
      <Button
        type="button"
        className={className}
        disabled={busy}
        onClick={() =>
          void handleJoin({
            ...(initialInviteToken ? { invite_token: initialInviteToken } : {}),
            ...(initialInviteCode ? { invite_code: initialInviteCode } : {}),
          })
        }
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join this hall"}
      </Button>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <form onSubmit={(e) => void handleCodeJoin(e)} className="space-y-2">
        <Label htmlFor="join-code">Hall or invite code</Label>
        <div className="flex gap-2">
          <Input
            id="join-code"
            placeholder="6-char hall code or invite"
            className="min-h-11"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            autoFocus
          />
          <Button type="submit" variant="secondary" className="min-h-11" disabled={busy || !joinCode.trim()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use a permanent crew code or a one-time invite code.
        </p>
      </form>

      {!compact && (
      <form onSubmit={(e) => void handleIdJoin(e)} className="space-y-2">
        <Label htmlFor="join-hall-id">Hall ID (advanced)</Label>
        <div className="flex gap-2">
          <Input
            id="join-hall-id"
            placeholder="Hall ID"
            value={hallId}
            onChange={(e) => setHallId(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={busy || !hallId.trim()}>
            Join
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}
