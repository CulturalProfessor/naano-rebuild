"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/loading";

/**
 * The button that knows it is waiting.
 *
 * Two rules it enforces everywhere it is used:
 *
 *  1. The spinner slides in beside the label rather than popping in, and a
 *     full-width button (size "lg") never changes size at all.
 *  2. A pending button is not just disabled, it says what it is doing. "Sending
 *     the offer…" is feedback; a greyed-out button with the same label is a
 *     bug as far as the person clicking it is concerned.
 */

const VARIANTS = {
  primary:
    "bg-brand text-white hover:bg-brand-strong disabled:hover:bg-brand shadow-[var(--shadow-card)]",
  secondary:
    "border border-line bg-surface text-ink hover:border-ink-mute disabled:hover:border-line",
  quiet: "text-ink-soft hover:text-ink",
  danger:
    "border border-line bg-surface text-danger hover:border-danger/40 disabled:hover:border-line",
} as const;

const SIZES = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "w-full px-4 py-3",
} as const;

export type ActionButtonProps = {
  pending?: boolean;
  pendingLabel?: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"button">, "className" | "children">;

export function ActionButton({
  pending = false,
  pendingLabel,
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center rounded-card font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {/*
        The slot animates open rather than appearing, so the label slides
        instead of jumping. Both states set every box property in one string:
        writing w-4 and w-0 on the same element lets Tailwind's own class
        order decide the winner, and w-4 wins, which leaves a permanent
        indent under every idle label.
      */}
      <span
        className={`grid shrink-0 place-items-center overflow-hidden transition-all duration-150 ${
          pending ? "mr-2 w-4 opacity-100" : "mr-0 w-0 opacity-0"
        }`}
      >
        {pending && (
          <Spinner
            size="sm"
            tone={variant === "primary" ? "on-brand" : "brand"}
          />
        )}
      </span>
      <span>{pending && pendingLabel ? pendingLabel : children}</span>
    </button>
  );
}

/**
 * The same button for a plain `<form action={serverAction}>` with no
 * useActionState around it. It reads its own pending state from the form.
 */
export function SubmitButton(props: Omit<ActionButtonProps, "pending">) {
  const { pending } = useFormStatus();
  return <ActionButton {...props} type="submit" pending={pending} />;
}
