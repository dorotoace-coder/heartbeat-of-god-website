import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "ivory" | "parchment" | "white" | "dark" | "ink";

const tones: Record<Tone, string> = {
  ivory: "bg-ivory text-text",
  parchment: "bg-parchment text-text",
  white: "bg-white text-text",
  dark: "bg-plum text-white",
  ink: "bg-ink text-white",
};

export function Section({
  tone = "ivory",
  className,
  containerClassName,
  id,
  children,
  "aria-labelledby": labelledBy,
}: {
  tone?: Tone;
  className?: string;
  containerClassName?: string;
  id?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("relative px-5 py-20 sm:px-8 md:py-28", tones[tone], className)}>
      <div className={cn("mx-auto max-w-6xl", containerClassName)}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children, tone = "light", className }: { children: ReactNode; tone?: "light" | "dark"; className?: string }) {
  return (
    <p
      className={cn(
        "mb-4 inline-flex items-center gap-3 text-[0.72rem] font-bold uppercase tracking-[0.24em]",
        tone === "dark" ? "text-gold" : "text-gold-deep",
        className,
      )}
    >
      <span aria-hidden className={cn("h-px w-8", tone === "dark" ? "bg-gold/60" : "bg-gold-deep/50")} />
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  intro,
  id,
  tone = "light",
  align = "left",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  id?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <header className={cn("mb-12 md:mb-16", align === "center" && "mx-auto text-center", "max-w-3xl", className)}>
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      <Tag
        id={id}
        className={cn(
          "font-headline text-balance font-light leading-[1.08] tracking-tight",
          Tag === "h1" ? "text-5xl md:text-7xl" : "text-4xl md:text-[3.25rem]",
          tone === "dark" ? "text-white" : "text-text",
        )}
      >
        {title}
      </Tag>
      {intro && (
        <p className={cn("mt-6 text-pretty text-lg leading-relaxed", tone === "dark" ? "text-white/70" : "text-muted")}>{intro}</p>
      )}
    </header>
  );
}

export function Card({ className, children, tone = "light" }: { className?: string; children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <div
      className={cn(
        "rounded-3xl p-7 md:p-8 transition-all duration-300",
        tone === "dark"
          ? "border border-white/10 bg-white/[0.04] text-white"
          : "border border-line bg-white shadow-[0_1px_0_rgba(27,20,36,0.04),0_20px_50px_-30px_rgba(27,20,36,0.25)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
