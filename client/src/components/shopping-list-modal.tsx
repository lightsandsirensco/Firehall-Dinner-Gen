import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Printer, Mail, CheckCircle, Loader2, ShoppingCart, Leaf, Lightbulb, Package, Check } from "lucide-react";
import type { ShoppingListResult } from "@/lib/shopping-list";
import { shoppingListToText } from "@/lib/shopping-list";
import { escapeHtml } from "@/lib/escape-html";
import { fetchWithCsrf } from "@/lib/csrf-fetch";
import { trackShoppingListAction, trackShoppingListOpen } from "@/lib/analytics";

interface ShoppingListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shoppingList: ShoppingListResult;
  recipeTitle: string;
  generatorType: "meal" | "pizza";
}

function buildPrintHtml(shoppingList: ShoppingListResult, recipeTitle: string): string {
  const e = escapeHtml;
  let fridgeHtml = "";
  if (shoppingList.fridge_used && shoppingList.fridge_used.length > 0) {
    fridgeHtml = `<div class="fridge-section">
      <h2>Using What's in the Fridge</h2>
      <ul>${shoppingList.fridge_used.map(item => `<li class="fridge-item">${e(item)}</li>`).join("")}</ul>
    </div>`;
    if (shoppingList.need_to_grab && shoppingList.need_to_grab.length > 0) {
      fridgeHtml += `<div class="grab-section">
        <h3>You May Need to Grab</h3>
        <ul>${shoppingList.need_to_grab.map(item => `<li>${e(item)}</li>`).join("")}</ul>
      </div>`;
    }
  }

  const sectionsHtml = shoppingList.sections.map(section => `
    <div class="section">
      <h2>${e(section.title)}</h2>
      <table><tbody>
        ${section.items.map(item => `<tr>
          <td class="checkbox">&#9744;</td>
          <td class="item-name">${e(item.name)}</td>
          <td class="item-amount">${item.amount ? `— ${e(item.amount)}` : ""}</td>
          <td class="item-notes">${e(item.notes)}</td>
        </tr>`).join("")}
      </tbody></table>
    </div>`).join("");

  let vegHtml = "";
  if (shoppingList.veg_option && shoppingList.veg_option.items.length > 0) {
    vegHtml = `<div class="section veg-section">
      <h2 style="color:#16a34a">Veg Option (1 Serving)</h2>
      <table><tbody>
        ${shoppingList.veg_option.items.map(item => `<tr>
          <td class="checkbox">&#9744;</td>
          <td class="item-name">${e(item.name)}</td>
          <td class="item-amount">${item.amount ? `— ${e(item.amount)}` : ""}</td>
          <td class="item-notes">${e(item.notes)}</td>
        </tr>`).join("")}
      </tbody></table>
    </div>`;
  }

  let budgetHtml = "";
  if (shoppingList.budget_swaps && shoppingList.budget_swaps.length > 0) {
    budgetHtml = `<div class="section">
      <h2>Budget Swaps</h2>
      <ul>${shoppingList.budget_swaps.map(swap => `<li>${e(swap)}</li>`).join("")}</ul>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Shopping List — ${e(recipeTitle)}</title>
<style>
  @page { margin: 0.75in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; background: #fff; line-height: 1.5; font-size: 14px; }
  h1 { font-size: 24px; font-weight: 800; margin-bottom: 2px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
  h2 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 8px; border-bottom: 2px solid #222; padding-bottom: 4px; }
  h3 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 8px 4px 0; vertical-align: top; border-bottom: 1px solid #eee; }
  .checkbox { width: 24px; font-size: 16px; }
  .item-name { font-weight: 600; }
  .item-amount { color: #333; white-space: nowrap; }
  .item-notes { color: #666; font-size: 13px; }
  .fridge-section { margin-bottom: 16px; }
  .fridge-section ul, .grab-section ul { padding-left: 20px; }
  .fridge-item { color: #16a34a; }
  .footer { text-align: center; color: #666; font-size: 12px; margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Shopping List</h1>
  <p class="subtitle">Based on: ${e(recipeTitle)}</p>
  ${fridgeHtml}
  ${sectionsHtml}
  ${vegHtml}
  ${budgetHtml}
  <div class="footer">www.lightsandsirensco.com</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

export function ShoppingListModal({ open, onOpenChange, shoppingList, recipeTitle, generatorType }: ShoppingListModalProps) {
  const [copied, setCopied] = useState(false);
  const [emailView, setEmailView] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (!open) return;
    trackShoppingListOpen({ recipeTitle, generatorType });
  }, [open, recipeTitle, generatorType]);

  const handleCopy = async () => {
    const text = shoppingListToText(shoppingList, recipeTitle);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackShoppingListAction({ recipeTitle, generatorType, action: "copy", status: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      trackShoppingListAction({ recipeTitle, generatorType, action: "copy", status: "success" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    trackShoppingListAction({ recipeTitle, generatorType, action: "print" });
    const html = buildPrintHtml(shoppingList, recipeTitle);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
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
    }, 300);
  };

  const totalItems = shoppingList.sections.reduce((sum, s) => sum + s.items.length, 0)
    + (shoppingList.veg_option?.items.length || 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col" data-testid="modal-shopping-list">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-wide text-foreground flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Shopping List
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Based on: {recipeTitle}</p>
        </DialogHeader>

        {emailView ? (
          emailStatus === "success" ? (
            <div className="flex flex-col items-center gap-3 py-6" data-testid="shopping-email-success">
              <CheckCircle className="w-12 h-12 text-green-500" />
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
              <Button variant="outline" onClick={handleCopy} data-testid="button-shopping-copy">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied" : "Copy List"}
              </Button>
              <Button variant="outline" onClick={handlePrint} data-testid="button-shopping-print">
                <Printer className="w-4 h-4 mr-2" />
                Print List
              </Button>
              <Button variant="outline" onClick={() => setEmailView(true)} data-testid="button-shopping-email">
                <Mail className="w-4 h-4 mr-2" />
                Email List
              </Button>
            </div>

            <Separator />

            <div className="overflow-y-auto flex-1 space-y-4 pr-1" data-testid="shopping-list-content">
              <p className="text-xs text-muted-foreground">{totalItems} items total</p>

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

              {shoppingList.sections.map((section, si) => (
                <div key={si} data-testid={`shopping-section-${si}`}>
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">{section.title}</h3>
                  <div className="space-y-1">
                    {section.items.map((item, ii) => (
                      <div key={ii} className="flex items-baseline gap-2 text-sm" data-testid={`shopping-item-${si}-${ii}`}>
                        <span className="text-muted-foreground/50 text-xs flex-shrink-0">&#9744;</span>
                        <span className="font-medium text-foreground">{item.name}</span>
                        {item.amount && <span className="text-muted-foreground">— {item.amount}</span>}
                        {item.notes && <span className="text-xs text-muted-foreground/70">({item.notes})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {shoppingList.veg_option && shoppingList.veg_option.items.length > 0 && (
                <div data-testid="shopping-veg-option">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="w-3.5 h-3.5 text-green-500" />
                    <h3 className="text-xs uppercase tracking-wider text-green-600 dark:text-green-400 font-medium">Veg Option (1 Serving)</h3>
                  </div>
                  <div className="space-y-1">
                    {shoppingList.veg_option.items.map((item, i) => (
                      <div key={i} className="flex items-baseline gap-2 text-sm" data-testid={`shopping-veg-item-${i}`}>
                        <span className="text-green-500/50 text-xs flex-shrink-0">&#9744;</span>
                        <span className="font-medium text-foreground">{item.name}</span>
                        {item.amount && <span className="text-muted-foreground">— {item.amount}</span>}
                        {item.notes && <span className="text-xs text-muted-foreground/70">({item.notes})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
