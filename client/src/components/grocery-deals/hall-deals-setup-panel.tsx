import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  fetchGroceryPreferences,
  fetchNearbyStores,
  saveGroceryPreferences,
  trackGrocerySetupEvent,
} from "@/lib/grocery-stores/api";
import type { NearbyStore } from "@shared/grocery-stores/types";
import { cn } from "@/lib/utils";
import { PROTEIN_DEALS } from "@/lib/brand-copy";

type Step = 1 | 2 | 3 | 4;

interface HallDealsSetupPanelProps {
  hallId: string;
  onComplete?: () => void;
}

export function HallDealsSetupPanel({ hallId, onComplete }: HallDealsSetupPanelProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState<"CA" | "US">("CA");
  const [maxDistance, setMaxDistance] = useState("15");
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [defaultStoreId, setDefaultStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadPrefs = useCallback(async () => {
    if (!hallId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const prefs = await fetchGroceryPreferences(hallId);
      if (prefs.postal_code) setPostalCode(prefs.postal_code);
      if (prefs.country) setCountry(prefs.country as "CA" | "US");
      setMaxDistance(String(prefs.max_distance_km));
      if (prefs.preferred_stores.length > 0) {
        setSelected(new Set(prefs.preferred_stores.map((s) => s.store_id)));
        setDefaultStoreId(prefs.default_store_id);
        setStep(3);
      }
    } catch {
      /* fresh setup */
    } finally {
      setLoading(false);
    }
  }, [hallId]);

  useEffect(() => {
    void loadPrefs();
    void trackGrocerySetupEvent("grocery_setup_started", { hall_id: hallId });
  }, [hallId, loadPrefs]);

  const findStores = async () => {
    if (!hallId || !postalCode.trim()) return;
    setBusy(true);
    try {
      const result = await fetchNearbyStores(hallId, {
        postal_code: postalCode.trim(),
        country,
        radius_km: Number(maxDistance) || 15,
      });
      setStores(result.stores);
      void trackGrocerySetupEvent("nearby_stores_loaded", {
        hall_id: hallId,
        count: result.stores.length,
      });
      if (result.stores.length === 0) {
        toast({ title: "No stores found — try a wider radius", variant: "destructive" });
      } else {
        setStep(2);
      }
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : "Could not find stores",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleStore = (storeId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  const save = async () => {
    if (!hallId || selected.size === 0) return;
    setBusy(true);
    try {
      await saveGroceryPreferences(hallId, {
        postal_code: postalCode.trim(),
        country,
        max_distance_km: Number(maxDistance) || 15,
        default_store_id: defaultStoreId ?? [...selected][0] ?? null,
        preferred_store_ids: [...selected],
      });
      void trackGrocerySetupEvent("preferred_store_added", {
        hall_id: hallId,
        count: selected.size,
      });
      toast({ title: "Grocery preferences saved" });
      onComplete?.();
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : "Save failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
        <p className="font-medium text-foreground">{PROTEIN_DEALS.setupTitle}</p>
        <p className="text-muted-foreground mt-1">{PROTEIN_DEALS.setupLead}</p>
        <p className="text-xs text-muted-foreground mt-2">{PROTEIN_DEALS.proteinOnlyNote}</p>
      </div>

      <div className="flex gap-2 text-xs text-muted-foreground">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <span
            key={s}
            className={cn("px-2 py-1 rounded", step >= s ? "bg-primary/10 text-primary" : "bg-muted")}
          >
            Step {s}
          </span>
        ))}
      </div>

      {step === 1 && (
        <section className="rounded-xl border border-border/40 p-4 space-y-4">
          <h2 className="font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Step 1 — {PROTEIN_DEALS.setupPostal}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="postal">Postal code / ZIP</Label>
              <Input
                id="postal"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                placeholder="L4L 6A5"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={country}
                onChange={(e) => setCountry(e.target.value as "CA" | "US")}
              >
                <option value="CA">Canada</option>
                <option value="US">United States</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="radius">Max store distance (km)</Label>
              <Input
                id="radius"
                type="number"
                min={1}
                max={100}
                value={maxDistance}
                onChange={(e) => setMaxDistance(e.target.value)}
              />
            </div>
          </div>
          <Button disabled={busy || !postalCode.trim()} className="min-h-11" onClick={() => void findStores()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : PROTEIN_DEALS.findStores}
          </Button>
        </section>
      )}

      {step >= 2 && (
        <section className="rounded-xl border border-border/40 p-4 space-y-4">
          <h2 className="font-medium">Step 2 — {PROTEIN_DEALS.setupStores}</h2>
          <p className="text-sm text-muted-foreground">
            Choose the stores your crew actually shops at near {postalCode}.
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {stores.map((store) => {
              const isSelected = selected.has(store.store_id);
              return (
                <button
                  key={store.store_id}
                  type="button"
                  onClick={() => toggleStore(store.store_id)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-colors",
                    isSelected ? "border-primary bg-primary/5" : "border-border/40 hover:bg-muted/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{store.banner}</p>
                      <p className="text-sm text-muted-foreground">{store.name}</p>
                      {store.city && (
                        <p className="text-xs text-muted-foreground">
                          {store.city}
                          {store.province_state ? `, ${store.province_state}` : ""} · {store.distance_km}{" "}
                          km
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                      {store.supports_deals ? (
                        <Badge variant="secondary" className="text-xs">
                          Deals
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Store only
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {selected.size > 0 && (
            <div className="space-y-2">
              <Label htmlFor="default-store">Default shopping store</Label>
              <select
                id="default-store"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={defaultStoreId ?? ""}
                onChange={(e) => setDefaultStoreId(e.target.value || null)}
              >
                {[...selected].map((id) => {
                  const store = stores.find((s) => s.store_id === id);
                  return (
                    <option key={id} value={id}>
                      {store?.banner ?? id}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              disabled={busy || selected.size === 0}
              onClick={() => {
                setStep(4);
                void save();
              }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : PROTEIN_DEALS.saveStores}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
