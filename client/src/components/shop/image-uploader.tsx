import { useRef, useState } from "react";
import { GripVertical, ImagePlus, Loader2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch, describeAdminError } from "@/lib/admin-api";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function filenameFromUrl(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1] ?? "";
}

/**
 * Product photo gallery — upload from phone library or desktop file picker,
 * instant previews, drag to reorder (index 0 = primary image), delete.
 * Stores plain `/uploads/shop/<file>` URLs — no IDs, no Stripe, no folders
 * the admin has to manage by hand.
 */
export function ShopImageUploader({
  value,
  onChange,
  max = 8,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const remainingSlots = max - value.length;
    const list = Array.from(files).slice(0, Math.max(remainingSlots, 0));
    if (list.length === 0) {
      setError(`You can add up to ${max} photos.`);
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of list) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError("Only JPEG, PNG, or WEBP photos are supported.");
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);
        const res = await adminFetch("/api/admin/shop/uploads", { method: "POST", body: formData });
        if (!res.ok) {
          setError(await describeAdminError(res, "Upload failed"));
          continue;
        }
        const body = (await res.json()) as { url: string };
        uploaded.push(body.url);
      }
      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAt = (index: number) => {
    const target = value[index];
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    if (target) {
      void adminFetch(`/api/admin/shop/uploads/${encodeURIComponent(filenameFromUrl(target))}`, {
        method: "DELETE",
      }).catch(() => {});
    }
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {value.map((url, index) => (
          <div
            key={url + index}
            draggable
            onDragStart={() => {
              dragIndex.current = index;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex.current !== null) reorder(dragIndex.current, index);
              dragIndex.current = null;
            }}
            className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted group touch-manipulation"
            data-testid={`shop-image-${index}`}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            {index === 0 && (
              <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5">
                <Star className="w-2.5 h-2.5 fill-current" /> Primary
              </span>
            )}
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute top-1.5 right-1.5 rounded-full bg-background/90 p-1 opacity-90 hover:opacity-100 min-h-6 min-w-6 flex items-center justify-center"
              aria-label="Remove photo"
              data-testid={`button-remove-image-${index}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-1.5 right-1.5 rounded-full bg-background/80 p-1 cursor-grab">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors min-h-20"
            data-testid="button-add-image"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            <span className="text-xs">{uploading ? "Uploading…" : "Add photo"}</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <p className="text-xs text-muted-foreground">
        First photo is the one shown in the Shop. Drag photos to reorder. JPEG, PNG, or WEBP — up to {max}.
      </p>
    </div>
  );
}
