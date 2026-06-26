export function formatStationLabel(stationNumber: string | null | undefined): string | null {
  const trimmed = stationNumber?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().startsWith("station") ? trimmed : `Station ${trimmed}`;
}

export function formatMemberCountLabel(count: number): string {
  if (count <= 0) return "0 Members";
  if (count === 1) return "1 Member";
  return `${count} Members`;
}

/** Returns a trimmed custom photo URL, or null when unset. */
export function getHallPhotoUrl(photoUrl: string | null | undefined): string | null {
  const trimmed = photoUrl?.trim();
  return trimmed || null;
}

export function formatCanteenManagerLabel(displayName: string | null | undefined): string | null {
  const trimmed = displayName?.trim();
  return trimmed || null;
}

export function resolveCanteenManagerDisplayName(
  displayName: string | null | undefined,
  managerUserId: string | null | undefined,
  members: Array<{ user_id: string; role: string; display_name: string | null }>,
): string | null {
  const fromHall = formatCanteenManagerLabel(displayName);
  if (fromHall) return fromHall;

  const managerId = managerUserId?.trim();
  if (managerId) {
    const member = members.find((m) => m.user_id === managerId);
    const name = formatCanteenManagerLabel(member?.display_name);
    if (name) return name;
  }

  const roleManager = members.find((m) => m.role === "canteen_manager");
  return formatCanteenManagerLabel(roleManager?.display_name);
}
