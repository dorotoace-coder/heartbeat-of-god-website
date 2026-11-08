import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "gold" | "light" | "dark" | "ghost-light" | "ghost-dark";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-300 ease-out active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  gold: "bg-gold text-ink hover:bg-gold-soft shadow-[0_10px_30px_-12px_rgba(217,180,90,0.7)]",
  light: "bg-white text-ink hover:bg-ivory",
  dark: "bg-plum text-white hover:bg-plum-soft shadow-[0_10px_30px_-14px_rgba(28,10,45,0.8)]",
  "ghost-light": "border border-white/25 text-white hover:bg-white/10 hover:border-white/40",
  "ghost-dark": "border border-text/20 text-text hover:bg-text/5 hover:border-text/40",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-[0.95rem]",
};

export function buttonClass(variant: Variant = "gold", size: Size = "lg", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

/** Internal link styled as a button. */
export function ButtonLink({ href, variant, size, className, children, ...rest }: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

/** External link styled as a button — always opens safely in a new tab. */
export function ExternalButton({ href, variant, size, className, children, ...rest }: CommonProps & ComponentProps<"a">) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size, className)} {...rest}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function Button({ variant, size, className, children, ...rest }: CommonProps & ComponentProps<"button">) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
