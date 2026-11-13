import { useState, useEffect, useMemo } from "react";
import { AisleShoppingList, type AisleRow } from "@/components/shopping/aisle-shopping-list";
import { ListExportActions } from "@/components/shopping/list-export-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, CheckCircle, Loader2, ShoppingCart, Lightbulb, Package, Check, Users } from "lucide-react";
import {
  REQUIRED_SECTION,
  VEG_OPTION_SECTION,
  shoppingLineKey,
  shoppingListToExportDocument,
  type ShoppingListResult,
} from "@/lib/shopping-list";
import { fetchWithCsrf } from "@/lib/csrf-fetch";
import { trackShoppingListAction, trackShoppingListOpen } from "@/lib/analytics";
import { useHallMembership } from "@/lib/hall-membership/context";
import { useAuth } from "@/lib/auth/context";
import { useHallFeature } from "@/lib/billing/hooks";
import { addRecipeToHallShoppingList } from "@/lib/hall-shopping-list/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MarketingConsentCheckbox } from "@/components/marketing-consent-checkbox";

const RECIPE_CHECKS_KEY = "firehall_recipe_shopping_checks_v1";
const MAX_SAVED_RECIPES = 30;

function readAllChecks(): Record<string, string[]> {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECIPE_CHECKS_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadRecipeChecks(listKey: string): Set<string> {
  const saved = readAllChecks()[listKey];
  return new Set(Array.isArray(saved) ? saved : []);
}

function saveRecipeChecks(listKey: string, checked: Set<string>): void {
  try {
    const all = readAllChecks();
    delete all[listKey];
    if (checked.size > 0) all[listKey] = [...checked];
    const keys = Object.keys(all);
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_SAVED_RECIPES))) delete all[old];
    localStorage.setItem(RECIPE_CHECKS_KEY, JSON.stringify(all));
  } catch {
    /* storage unavailable (private mode) — checks stay in memory */
  }
}

interface ShoppingListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shoppingList: ShoppingListResult;
  recipeTitle: string;
  recipeSlug?: string;
  generatorType: "meal" | "pizza";
}

export function ShoppingListModal({
  open,
  onOpenChange,
  shoppingList,
  recipeTitle,
  recipeSlug,
  generatorType,
}: ShoppingListModalProps) {
  const { toast } = useToast();
  const { authenticated } = useAuth();
  const { activeHallId, activeHall } = useHallMembership();
  const canUseSharedList = useHallFeature("shared_shopping_lists", activeHallId);
  const [copied, setCopied] = useState(false);
  const [emailView, setEmailView] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [hallAddBusy, setHallAddBusy] = useState(false);
  const [hallAddDone, setHallAddDone] = useState(false);
  const listKey = recipeSlug || recipeTitle;
  const [checkedItems, setCheckedItems] = useState<Set<string>>(() => loadRecipeChecks(listKey));

  const canAddToHallList = authenticated && Boolean(activeHallId) && canUseSharedList;

  const rows = useMemo<AisleRow[]>(() => {
    const toRows = (title: string, items: ShoppingListResult["sections"][number]["items"]) =>
      items.map((item) => {
        const id = shoppingLineKey(title, item.name);
        return { id, name: item.name, amount: item.amount, notes: item.notes, section: title, checked: checkedItems.has(id) };
      });
    return [
      ...shoppingList.sections.flatMap((s) => toRows(s.title, s.items)),
      ...(shoppingList.veg_option ? toRows(VEG_OPTION_SECTION, shoppingList.veg_option.items) : []),
    ];
  }, [shoppingList, checkedItems]);

  const toggleChecked = (key: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveRecipeChecks(listKey, next);
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    trackShoppingListOpen({ recipeTitle, generatorType });
    setHallAddDone(false);
    setCheckedItems(loadRecipeChecks(listKey));
  }, [open, recipeTitle, generatorType, listKey]);

  const exportDocument = () => shoppingListToExportDocument(shoppingList, recipeTitle, checkedItems);

  const handleAddToHallList = async () => {
    if (!activeHallId || hallAddBusy) return;
    setHallAddBusy(true);
    try {
      await addRecipeToHallShoppingList(activeHallId, {
        recipe_title: recipeTitle,
        recipe_slug: recipeSlug,
        sections: shoppingList.sections,
      });
      setHallAddDone(true);
      toast({
        title: "Added to firehouse list",
        description: activeHall?.hall_name
          ? `${recipeTitle} ingredients are on ${activeHall.hall_name}'s grocery run.`
          : undefined,
      });
    } catch {
      toast({ title: "Could not add to firehouse list", variant: "destructive" });
    } finally {
      setHallAddBusy(false);
    }
  };

  const handleExportAction = (action: "copy" | "print" | "share") => {
    trackShoppingListAction({ recipeTitle, generatorType, action, ...(action === "print" ? {} : { status: "success" as const }) });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setEmailStatus("loading");
    setEmailError("");

    try {
      const sectionsData = shoppingList.sections.map(s => ({
        title: s.title,
        items: s.items.map(i => {
          let line = i.name;
          if (i.amount) line += ` — ${i.amount}`;
          if (i.notes) line += ` (${i.notes})`;
          return line;
        }),
      }));

      const res = await fetchWithCsrf("/api/email-shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          recipe_title: recipeTitle,
          shopping_list_sections: sectionsData,
          generator_type: generatorType,
          timestamp: new Date().toISOString(),
          marketing_consent: marketingConsent,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || `Server error (${res.status}). Please try again.`;
        console.error("[shopping-list-modal] Email failed:", res.status, msg);
        setEmailStatus("error");
        setEmailError(msg);
        trackShoppingListAction({ recipeTitle, generatorType, action: "email", status: "error" });
        return;
      }

      setEmailStatus("success");
      trackShoppingListAction({ recipeTitle, generatorType, action: "email", status: "success" });
    } catch (err: any) {
      console.error("[shopping-list-modal] Network error:", err);
      setEmailStatus("error");
      setEmailError("Network error. Check your connection and try again.");
      trackShoppingListAction({ recipeTitle, generatorType, action: "email", status: "error" });
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setEmailView(false);
      setEmailStatus("idle");
      setEmail("");
      setEmailError("");
      setMarketingConsent(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col" data-testid="modal-shopping-list">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Shopping List
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Based on: {recipeTitle}</p>
        </DialogHeader>

        {emailView ? (
          emailStatus === "success" ? (
            <div className="flex flex-col items-center gap-3 py-6 fade-up" data-testid="shopping-email-success">
              <CheckCircle className="w-12 h-12 text-[hsl(var(--success))] success-pop" />
              <p className="text-lg font-heading tracking-wide text-foreground">Shopping list sent!</p>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="shopping-email-input" className="text-sm text-foreground">Email</Label>
                <Input
                  id="shopping-email-input"
                  type="email"
                  placeholder="firefighter@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={emailStatus === "loading"}
                  data-testid="input-shopping-email"
                />
              </div>
              {emailStatus === "error" && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
              <MarketingConsentCheckbox
                id="shopping-list-marketing-consent"
                checked={marketingConsent}
                onCheckedChange={setMarketingConsent}
                disabled={emailStatus === "loading"}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEmailView(false)}
                  disabled={emailStatus === "loading"}
                  data-testid="button-shopping-back"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-heading tracking-wider"
                  disabled={emailStatus === "loading" || !email.trim()}
                  data-testid="button-shopping-send-email"
                >
                  {emailStatus === "loading" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {emailStatus === "loading" ? "SENDING..." : "SEND LIST"}
                </Button>
              </div>
            </form>
          )
        ) : (
          <>
            <div className="flex gap-2 flex-wrap">
              {canAddToHallList ? (
                <Button
                  variant="default"
                  onClick={() => void handleAddToHallList()}
                  disabled={hallAddBusy || hallAddDone}
                  data-testid="button-shopping-add-hall"
                >
                  {hallAddBusy ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : hallAddDone ? (
                    <Check className="w-4 h-4 mr-2 success-pop" />
                  ) : (
                    <Users className="w-4 h-4 mr-2" />
                  )}
                  {hallAddDone ? "On firehouse list" : "Add to firehouse list"}
                </Button>
              ) : null}
              <ListExportActions getDocument={exportDocument} onAction={handleExportAction} testIdPrefix="button-shopping" />
              <Button variant="outline" size="sm" className="min-h-10" onClick={() => setEmailView(true)} data-testid="button-shopping-email">
                <Mail className="w-4 h-4 mr-2" />
                Email List
              </Button>
            </div>

            <Separator />

            <div className="overflow-y-auto flex-1 space-y-4 pr-1" data-testid="shopping-list-content">
              {shoppingList.fridge_used && shoppingList.fridge_used.length > 0 && (
                <div data-testid="shopping-fridge-used">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Using what's in the fridge</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {shoppingList.fridge_used.map((item, i) => (
                      <Badge key={i} variant="outline" className="capitalize text-xs" data-testid={`shopping-fridge-item-${i}`}>
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {shoppingList.need_to_grab && shoppingList.need_to_grab.length > 0 && (
                <div data-testid="shopping-need-to-grab">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">You may need to grab</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {shoppingList.need_to_grab.map((item, i) => (
                      <Badge key={i} variant="secondary" className="capitalize text-xs" data-testid={`shopping-grab-item-${i}`}>
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <AisleShoppingList
                listId={`recipe:${listKey}`}
                rows={rows}
                leadingSections={[REQUIRED_SECTION]}
                onToggle={(row) => toggleChecked(row.id)}
                testIdPrefix="shopping"
              />

              {shoppingList.budget_swaps && shoppingList.budget_swaps.length > 0 && (
                <div data-testid="shopping-budget-swaps">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Budget Swaps</h3>
                  </div>
                  <div className="space-y-1">
                    {shoppingList.budget_swaps.map((swap, i) => (
                      <p key={i} className="text-xs text-muted-foreground leading-relaxed" data-testid={`shopping-swap-${i}`}>
                        {swap}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
