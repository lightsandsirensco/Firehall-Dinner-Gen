const STORAGE_KEY = "firehall_red_lead_pdf_unlocked";

export function isRedLeadPdfUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markRedLeadPdfUnlocked(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore quota errors */
  }
}
