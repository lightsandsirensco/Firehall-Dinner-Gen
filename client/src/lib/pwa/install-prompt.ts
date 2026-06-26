import {
  PWA_INSTALL_PROMPT_MIN_VISITS,
  PWA_INSTALLED_KEY,
  PWA_PROMPT_DISMISSED_KEY,
} from "@shared/pwa/constants";
import { trackPwaInstalled } from "@/lib/analytics";
import { getPwaVisitCount } from "@/lib/pwa/visit-count";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) notifyListener(listener);
}

function notifyListener(listener: () => void): void {
  try {
    listener();
  } catch {
    /* ignore */
  }
}

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(PWA_INSTALLED_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone;
}

export function isPwaPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PWA_PROMPT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPwaPrompt(): void {
  try {
    localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
  notify();
}

export function canShowPwaInstallPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (isPwaInstalled() || isPwaPromptDismissed()) return false;
  if (!deferredPrompt) return false;
  return getPwaVisitCount() >= PWA_INSTALL_PROMPT_MIN_VISITS;
}

export function subscribePwaInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initPwaInstallPrompt(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    try {
      localStorage.setItem(PWA_INSTALLED_KEY, "1");
    } catch {
      /* ignore */
    }
    trackPwaInstalled({ method: "appinstalled" });
    notify();
  });
}

export async function promptPwaInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  const prompt = deferredPrompt;
  deferredPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  if (choice.outcome === "accepted") {
    try {
      localStorage.setItem(PWA_INSTALLED_KEY, "1");
    } catch {
      /* ignore */
    }
  } else {
    dismissPwaPrompt();
  }
  notify();
  return choice.outcome;
}
