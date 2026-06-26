import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Link2, Loader2, QrCode, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackHallInviteSent } from "@/lib/analytics";
import type { HallInviteMethod, HallInviteRecord } from "@shared/hall-membership/types";
import { fetchHallInvites } from "@/lib/hall-membership/api";
import { cn } from "@/lib/utils";

interface HallInvitePanelProps {
  hallId: string;
  joinCode: string;
  canManage: boolean;
  className?: string;
}

const METHODS: Array<{ method: HallInviteMethod; label: string; icon: typeof Link2 }> = [
  { method: "link", label: "Link", icon: Link2 },
  { method: "qr", label: "QR code", icon: QrCode },
  { method: "code", label: "Code", icon: Hash },
];

export function HallInvitePanel({ hallId, joinCode, canManage, className }: HallInvitePanelProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<HallInviteMethod | null>(null);
  const [invites, setInvites] = useState<HallInviteRecord[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [activeInvite, setActiveInvite] = useState<HallInviteRecord | null>(null);

  const loadInvites = async () => {
    if (!canManage) return;
    const rows = await fetchHallInvites(hallId);
    setInvites(rows);
  };

  useEffect(() => {
    void loadInvites();
  }, [hallId, canManage]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const createInvite = async (method: HallInviteMethod) => {
    setBusy(method);
    try {
      const res = await apiRequest("POST", `/api/halls/${encodeURIComponent(hallId)}/invites`, {
        method,
        max_uses: method === "code" ? 10 : null,
        expires_in_hours: 72,
      });
      const body = await res.json();
      const invite = body.invite as HallInviteRecord;
      trackHallInviteSent(hallId, method);
      setActiveInvite(invite);
      await loadInvites();

      if (method === "qr" && invite.invite_url) {
        const url = await QRCode.toDataURL(invite.invite_url, { width: 240, margin: 2 });
        setQrDataUrl(url);
      } else {
        setQrDataUrl(null);
      }

      toast({ title: `${method} invite ready` });
    } catch {
      toast({ title: "Could not create invite", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
        <p className="text-sm font-medium">Permanent hall code</p>
        <p className="text-2xl font-mono tracking-widest mt-1">{joinCode || "—"}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() => void copyText(joinCode, "Hall code")}
        >
          <Copy className="w-3.5 h-3.5 mr-1.5" />
          Copy code
        </Button>
      </div>

      {canManage && (
        <>
          <p className="text-sm text-muted-foreground">Invite crew by link, QR, or one-time code.</p>
          <div className="flex flex-wrap gap-2">
            {METHODS.map(({ method, label, icon: Icon }) => (
              <Button
                key={method}
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => void createInvite(method)}
              >
                {busy === method ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Icon className="w-3.5 h-3.5 mr-1.5" />
                    {label}
                  </>
                )}
              </Button>
            ))}
          </div>

          {activeInvite && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              {activeInvite.invite_url && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Invite link</p>
                  <p className="text-sm break-all mt-1">{activeInvite.invite_url}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => void copyText(activeInvite.invite_url!, "Invite link")}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy link
                  </Button>
                </div>
              )}
              {activeInvite.invite_code && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Invite code</p>
                  <p className="text-xl font-mono mt-1">{activeInvite.invite_code}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={() => void copyText(activeInvite.invite_code!, "Invite code")}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy code
                  </Button>
                </div>
              )}
              {qrDataUrl && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Scan to join</p>
                  <img src={qrDataUrl} alt="Hall invite QR code" className="rounded-lg border border-border/40" />
                </div>
              )}
            </div>
          )}

          {invites.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1">
              {invites.slice(0, 5).map((inv) => (
                <li key={inv.invite_id}>
                  {inv.method} · {inv.use_count}
                  {inv.max_uses != null ? `/${inv.max_uses}` : ""} uses · expires{" "}
                  {new Date(inv.expires_at).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
