import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/Section";
import { cn } from "@/lib/cn";

/** Dark, reverent page header shared by every interior page. */
export default function PageHero({
  eyebrow,
  title,
  intro,
  children,
  aside,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("hero-aura relative overflow-hidden px-5 pb-20 pt-36 text-white sm:px-8 md:pb-28 md:pt-44", className)}>
      <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-60" />
      <div className={cn("relative mx-auto max-w-6xl", aside && "grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]")}>
        <div className="animate-fade-up">
          <Eyebrow tone="dark">{eyebrow}</Eyebrow>
          <h1 className="font-headline text-balance text-5xl font-light leading-[1.05] tracking-tight md:text-7xl">{title}</h1>
          {intro && <p className="mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-white/70 md:text-xl">{intro}</p>}
          {children && <div className="mt-10 flex flex-wrap gap-3">{children}</div>}
        </div>
        {aside && <div className="animate-fade-up [animation-delay:150ms]">{aside}</div>}
      </div>
    </section>
  );
}
