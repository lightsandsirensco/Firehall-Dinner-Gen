/**
 * Where to land after sign-in — the Tonight dashboard (/tonight).
 * (Home is the landing page at "/"; signed-in users start their shift on Tonight.)
 */

export function postLoginDestination(options: {
  hasHall: boolean;
  authReturnTo: string | null | undefined;
  isNew?: boolean;
}): string {
  const returnTo = options.authReturnTo?.trim() || null;
  if (returnTo && isMeaningfulReturnTo(returnTo)) {
    return returnTo;
  }
  void options.hasHall;
  return "/tonight";
}

function isMeaningfulReturnTo(path: string): boolean {
  const bare = path.split("?")[0];
  if (!bare || bare === "/" || bare === "/home" || bare === "/tonight") return false;
  if (bare === "/about" || bare === "/faq") return false;
  return true;
}
