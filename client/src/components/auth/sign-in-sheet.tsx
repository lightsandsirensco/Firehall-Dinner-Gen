import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/context";
import { SignInPanel } from "@/components/auth/sign-in-panel";

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
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading tracking-wide">Sign in to Firehall Meals</SheetTitle>
          <SheetDescription>
            Sync saves, connect to a hall, and unlock Hall Pro.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <SignInPanel active={signInOpen} dismissLabel="Continue as guest" onDismiss={closeSignIn} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
