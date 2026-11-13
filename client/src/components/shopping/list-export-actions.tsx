import { useState } from "react";
import { Check, Copy, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildAislePrintHtml, formatAisleListText, type AisleExportDocument } from "@shared/shopping";

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export function printAisleList(doc: AisleExportDocument): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(buildAislePrintHtml(doc));
  win.document.close();
}

/**
 * Copy / Print / Share for any aisle list. Share hands plain text to the
 * phone's share sheet (texts, WhatsApp, email) so anyone on the crew can use
 * the list without an account; it falls back to copying.
 */
export function ListExportActions({
  getDocument,
  onAction,
  testIdPrefix = "list",
}: {
  getDocument: () => AisleExportDocument;
  onAction?: (action: "copy" | "print" | "share") => void;
  testIdPrefix?: string;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    await copyText(formatAisleListText(getDocument()));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onAction?.("copy");
  };

  const share = async () => {
    const doc = getDocument();
    try {
      await navigator.share({ title: doc.title, text: formatAisleListText(doc) });
      onAction?.("share");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copyText(formatAisleListText(doc));
      toast({ title: "List copied", description: "Paste it into a text or group chat." });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {canShare ? (
        <Button type="button" variant="outline" size="sm" className="min-h-10 gap-1.5" onClick={() => void share()} data-testid={`${testIdPrefix}-share`}>
          <Share2 className="h-4 w-4" aria-hidden />
          Share
        </Button>
      ) : null}
      <Button type="button" variant="outline" size="sm" className="min-h-10 gap-1.5" onClick={() => void copy()} data-testid={`${testIdPrefix}-copy`}>
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-10 gap-1.5"
        onClick={() => {
          printAisleList(getDocument());
          onAction?.("print");
        }}
        data-testid={`${testIdPrefix}-print`}
      >
        <Printer className="h-4 w-4" aria-hidden />
        Print
      </Button>
    </div>
  );
}
