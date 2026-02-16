import { useState, useRef } from "react";
import { FilterPanel, type FilterState } from "@/components/filter-panel";
import { RecipeCard } from "@/components/recipe-card";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { EmailModal } from "@/components/email-modal";
import { apiRequest } from "@/lib/queryClient";
import type { GenerateResponse } from "@shared/schema";
import { Flame } from "lucide-react";

export default function Home() {
  const [recipe, setRecipe] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTemplateId, setLastTemplateId] = useState<number | undefined>();
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const genCountRef = useRef(0);
  const emailPromptedRef = useRef(false);
  const [filters, setFilters] = useState<FilterState>({
    crew_size: 6,
    busy_level: "average",
    time_available: "25-40",
    appliances: ["stove", "oven"],
    proteins: ["chicken", "beef"],
    healthiness_preference: "balanced",
    allergens_to_avoid: [],
    vegetarian_swap_needed: false,
  });

  const handleGenerate = async (currentFilters: FilterState, templateId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest("POST", "/api/generate", {
        ...currentFilters,
        last_template_id: templateId,
      });
      const data: GenerateResponse = await res.json();
      setRecipe(data);
      setLastTemplateId(data.template_id);
      genCountRef.current += 1;
      if (genCountRef.current === 2 && !emailPromptedRef.current) {
        emailPromptedRef.current = true;
        setTimeout(() => setEmailModalOpen(true), 800);
      }
    } catch (err: any) {
      const msg = err?.message || "Something went wrong";
      if (msg.includes("No matching templates") || msg.includes("404")) {
        setError("no_match");
        setRecipe(null);
      } else if (msg.includes("429")) {
        try {
          const parsed = JSON.parse(msg.replace(/^\d+:\s*/, ""));
          setError(parsed.message || "Rate limit reached. Please wait a moment.");
        } catch {
          setError("Too many requests. Please wait a moment before generating again.");
        }
      } else if (msg.includes("503") || msg.includes("budget")) {
        setError("Daily recipe limit reached. Please try again tomorrow.");
      } else if (msg.includes("403")) {
        setError("Security check failed. Please refresh the page and try again.");
      } else {
        setError("Generation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    handleGenerate(filters);
  };

  const handleGenerateAnother = () => {
    handleGenerate(filters, lastTemplateId);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Flame className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-2xl leading-none tracking-wide text-foreground" data-testid="text-app-title">
                LIGHTS & SIRENS
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Firehall Meal Generator
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[380px] flex-shrink-0">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              onGenerate={handleGenerateClick}
              onGenerateAnother={handleGenerateAnother}
              isLoading={loading}
              hasRecipe={!!recipe}
            />
          </div>

          <div className="flex-1 min-w-0">
            {loading && <LoadingState />}
            {!loading && error === "no_match" && <ErrorState type="no_match" />}
            {!loading && error && error !== "no_match" && <ErrorState type="error" message={error} />}
            {!loading && !error && recipe && (
              <RecipeCard
                recipe={recipe}
                crewSize={filters.crew_size}
                onEmailClick={() => setEmailModalOpen(true)}
              />
            )}
            {!loading && !error && !recipe && <EmptyState />}
          </div>
        </div>
      </main>
      {recipe && (
        <EmailModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          recipe={recipe}
          crewSize={filters.crew_size}
          healthinessLevel={filters.healthiness_preference}
        />
      )}
      <footer className="text-center py-4 mt-6">
        <p className="text-xs text-muted-foreground/60">
          Powered by{" "}
          <a
            href="https://www.lightsandsirensco.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
            data-testid="link-attribution"
          >
            Lights &amp; Sirens Co.
          </a>
        </p>
      </footer>
    </div>
  );
}
