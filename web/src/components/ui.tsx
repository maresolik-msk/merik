import { cn } from "@/lib/utils";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type Variant = "primary" | "outline" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-brand text-white hover:bg-brand-dark shadow-sm",
    outline: "border border-line bg-white text-ink hover:border-brand hover:text-brand",
    ghost: "text-muted hover:text-ink hover:bg-soft",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-muted/70",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 placeholder:text-muted/70",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(20,20,25,0.04)]", className)}>
      {children}
    </div>
  );
}

export function Badge({ tone = "green", children }: { tone?: "green" | "red" | "gray"; children: ReactNode }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-brand-soft text-brand-dark",
    gray: "bg-soft text-muted",
  };
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-bold", tones[tone])}>{children}</span>
  );
}

export function Avatar({ name, color }: { name: string; color?: string }) {
  return (
    <span
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
      style={{ background: color ?? "#2563A8" }}
    >
      {name}
    </span>
  );
}
