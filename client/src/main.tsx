import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV) {
  import("@shared/classic-hall-meals").then(({ validateAllClassicMeals }) => {
    validateAllClassicMeals("client-boot");
  });
}

createRoot(document.getElementById("root")!).render(<App />);
