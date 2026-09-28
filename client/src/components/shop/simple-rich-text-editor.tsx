import { useEffect, useRef } from "react";
import { Bold, List } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Toolbar-only rich text box — Bold + Bullet list, nothing else. The admin
 * never sees or types markup; this stores a small sanitized-on-save HTML
 * string under the hood (server/shop/sanitize-html.ts re-sanitizes on every
 * save regardless of what this produces).
 */
export function SimpleRichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValueSetFromOutside = useRef<string>(value);

  // Only push `value` into the DOM when it changed from OUTSIDE this editor
  // (e.g. loading a different product) — never on every keystroke, or the
  // cursor jumps to the start on each render.
  useEffect(() => {
    if (ref.current && value !== lastValueSetFromOutside.current && document.activeElement !== ref.current) {
      ref.current.innerHTML = value || "";
      lastValueSetFromOutside.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML === "" && value) {
      ref.current.innerHTML = value;
    }
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitChange = () => {
    const html = ref.current?.innerHTML ?? "";
    lastValueSetFromOutside.current = html;
    onChange(html);
  };

  const runCommand = (command: "bold" | "insertUnorderedList") => {
    ref.current?.focus();
    document.execCommand(command);
    emitChange();
  };

  return (
    <div className="rounded-lg border border-input bg-background overflow-hidden">
      <div className="flex items-center gap-1 border-b border-input bg-muted/40 px-2 py-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand("bold")}
          aria-label="Bold"
          data-testid="button-rte-bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => runCommand("insertUnorderedList")}
          aria-label="Bullet list"
          data-testid="button-rte-bullets"
        >
          <List className="w-4 h-4" />
        </Button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        data-placeholder={placeholder}
        className="min-h-28 px-3 py-2 text-sm focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        data-testid="input-rte-description"
      />
    </div>
  );
}
