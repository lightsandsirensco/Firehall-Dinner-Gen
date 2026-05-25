import { scheduleNonCriticalScripts } from "@/lib/performance";

/** Load gtag + Clarity after first paint — keeps cellular first load fast */
export function initDeferredAnalytics(): void {
  scheduleNonCriticalScripts(() => {
    const gtagId = "G-LYT598M5KT";
    const clarityId = "CLARITY_PROJECT_ID";

    const w = window as Window & { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    function gtag(...args: unknown[]) {
      w.dataLayer?.push(args);
    }
    (window as Window & { gtag?: typeof gtag }).gtag = gtag;
    gtag("js", new Date());
    gtag("config", gtagId);

    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
    document.head.appendChild(gtagScript);

    const clarityScript = document.createElement("script");
    clarityScript.async = true;
    clarityScript.text = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${clarityId}");
    `;
    document.head.appendChild(clarityScript);
  });
}

