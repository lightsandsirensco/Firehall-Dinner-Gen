import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlarmClock, ChefHat, ShoppingCart, Users, Utensils, Waves } from "lucide-react";
import { CTA, HOME } from "@/lib/brand-copy";

const VALUES = [
  { title: "Your crew size", body: "Portions scale without spreadsheet math.", icon: Users },
  { title: "Honest timing", body: "Steps that respect a real shift clock.", icon: AlarmClock },
  { title: "Shift-proof", body: "Food that survives calls and handoffs.", icon: Waves },
  { title: "Easy cleanup", body: "Fewer pans, faster reset.", icon: Utensils },
  {
    title: "Clear instructions",
    body: "Step-by-step directions anyone on the crew can follow.",
    icon: ChefHat,
  },
  {
    title: "Sized shopping lists",
    body: "Ingredients scaled for your crew — one grocery run.",
    icon: ShoppingCart,
  },
] as const;

export function HomeWhyCrews() {
  return (
    <section
      className="max-w-[1400px] mx-auto px-page py-16 sm:py-24"
      aria-labelledby="why-crews-heading"
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-12 lg:gap-16 items-start">
        <div className="lg:sticky lg:top-24">
          <h2
            id="why-crews-heading"
            className="font-heading text-2xl sm:text-4xl leading-[1.05] tracking-tight text-foreground"
          >
            {HOME.whyTitle}
          </h2>
          <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md">
            {HOME.whyLead}
          </p>
          <Button
            asChild
            className="mt-8 hidden sm:inline-flex font-heading font-semibold tracking-wide"
          >
            <Link href="/generator">{CTA.pickTonight}</Link>
          </Button>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2">
          {VALUES.map(({ title, body, icon: Icon }) => (
            <li key={title} className="border-l-2 border-primary/30 pl-5 py-0.5">
              <Icon className="w-4 h-4 text-primary/80 mb-3" aria-hidden />
              <h3 className="font-heading text-lg text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 sm:hidden">
        <Button asChild className="w-full h-12 font-heading font-semibold tracking-wide">
          <Link href="/generator">{CTA.pickTonight}</Link>
        </Button>
      </div>
    </section>
  );
}
