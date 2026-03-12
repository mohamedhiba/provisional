import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full border text-sm font-semibold tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b0f] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "border-[#f0d6a4]/25 bg-[linear-gradient(135deg,#f6efe2,#d8b070)] text-stone-950 shadow-[0_16px_40px_rgba(215,168,91,0.2)] hover:brightness-[1.03]",
        secondary:
          "border-white/12 bg-white/[0.06] text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.1]",
        warning:
          "border-amber-300/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.06))] text-amber-100 shadow-[0_14px_30px_rgba(245,158,11,0.12)] hover:bg-amber-300/15",
      },
      size: {
        sm: "h-10 px-4",
        md: "h-11 px-5",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
