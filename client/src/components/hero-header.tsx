import heroTruckImg from "@assets/truck1_1773178049785.jpg";

interface HeroHeaderProps {
  title?: string;
  subtitle?: string;
}

export function HeroHeader({ title = "Firehall Meals", subtitle }: HeroHeaderProps) {
  return (
    <section
      className="relative w-full overflow-hidden bg-black"
      data-testid="hero-header"
    >
      <img
        src={heroTruckImg}
        alt=""
        className="w-full h-auto block"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/65" />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-5 gap-2">
        <h1
          className="font-heading text-3xl sm:text-4xl md:text-5xl leading-none tracking-wide text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          data-testid="text-page-title"
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-[#d4d4d4] text-sm sm:text-base max-w-md"
            data-testid="text-page-subtitle"
          >
            {subtitle}
          </p>
        )}
        <p
          className="text-white/70 text-[10px] uppercase tracking-[0.2em] font-medium mt-1"
          data-testid="text-app-tagline"
        >
          Firefighter Built. Firehall Tested.
        </p>
      </div>
    </section>
  );
}
