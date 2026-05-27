import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initClientPerformance } from "@/lib/performance";
import { initDeferredAnalytics } from "@/lib/analytics-deferred";
import { initRoutePrefetch } from "@/lib/route-prefetch";

initClientPerformance();
initDeferredAnalytics();
initRoutePrefetch();

if (import.meta.env.DEV) {
  import("@shared/classic-hall-meals").then(({ validateAllClassicMeals }) => {
    validateAllClassicMeals("client-boot");
  });
}

createRoot(document.getElementById("root")!).render(<App />);
