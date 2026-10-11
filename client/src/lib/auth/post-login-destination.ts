/**
 * Where to land after sign-in — Shift (/shift), the signed-in home.
 * (Home is the landing page at "/"; /tonight is tonight's meal and hands off
 * to Shift when nothing is picked, so it isn't a meaningful return target.)
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
  return "/shift";
}

function isMeaningfulReturnTo(path: string): boolean {
  const bare = path.split("?")[0];
  if (!bare || bare === "/" || bare === "/home" || bare === "/tonight") return false;
  if (bare === "/about" || bare === "/faq") return false;
  return true;
}
