/** Short Hall section title for the top bar crumb. */
export function hallSectionTitle(pathname: string): string {
  if (pathname.startsWith("/hall/canteen")) return "Canteen";
  if (pathname.startsWith("/hall/dues")) return "Dues";
  if (pathname.startsWith("/hall/logbook")) return "Log";
  if (pathname.startsWith("/hall/history")) return "Meals";
  if (pathname.startsWith("/hall/protein-deals")) return "Deals";
  if (pathname.startsWith("/hall/tools") || pathname.startsWith("/hall/more")) return "Tools";
  if (pathname.includes("/shift/")) return "Shift";
  if (pathname.startsWith("/hall/shopping")) return "Shopping";
  if (pathname.startsWith("/hall/settings") || pathname.startsWith("/halls/")) return "Settings";
  if (pathname.startsWith("/hall/join")) return "Join";
  if (pathname.startsWith("/hall/welcome")) return "Welcome";
  if (pathname.startsWith("/hall/features")) return "Features";
  return "Hall";
}
