import { Flame } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/context";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { BRAND_NAME } from "@/lib/brand-copy";

export function SignInSheet() {
  const { signInOpen, closeSignIn } = useAuth();

  return (
    <Sheet
      open={signInOpen}
      onOpenChange={(open) => {
        if (!open) closeSignIn();
      }}
    >
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="w-4 h-4 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">{BRAND_NAME}</span>
          </div>
          <SheetTitle className="font-heading tracking-wide text-2xl">Welcome back</SheetTitle>
          <SheetDescription className="text-[15px]">
            Sign in to sync your saved meals and preferences.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <SignInPanel active={signInOpen} dismissLabel="Continue as guest" onDismiss={closeSignIn} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
