import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { fetchWithCsrf } from "@/lib/csrf-fetch";

/**
 * Self-service account deletion. Destructive-action confirmation required —
 * this is intentionally never a single click. On success, clears local
 * account state and returns the user to a public page.
 */
export function DeleteAccountSection() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetchWithCsrf("/api/auth/account", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || `Server error (${res.status}). Please try again.`);
        setDeleting(false);
        return;
      }

      // Clear all cached account/auth state before leaving so no stale
      // personalized data from the deleted account lingers in memory.
      queryClient.clear();
      setOpen(false);
      navigate("/");
    } catch {
      setError("Network error. Check your connection and try again.");
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-2" data-testid="delete-account-section">
      <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
      <AlertDialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 touch-manipulation border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            data-testid="button-delete-account"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent data-testid="dialog-delete-account">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your profile, saved recipes, preferences, and hall memberships. This
              cannot be undone. Shared hall content (like notes and canteen records other
              crew members rely on) is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-sm text-destructive" data-testid="text-delete-account-error">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-account"
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Yes, delete my account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
