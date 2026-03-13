import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-full border text-center text-sm font-semibold leading-none whitespace-nowrap tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b0f] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "border-[#f0d6a4]/38 bg-[linear-gradient(135deg,#f8f1e4,#ddb679)] text-[#17120c] shadow-[0_18px_42px_rgba(215,168,91,0.28)] hover:brightness-[1.04] hover:shadow-[0_20px_48px_rgba(215,168,91,0.32)]",
        secondary:
          "border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.09))] text-[#fafaf9] shadow-[0_14px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/28 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.12))]",
        warning:
          "border-amber-300/25 bg-[linear-gradient(135deg,rgba(245,158,11,0.18),rgba(245,158,11,0.06))] text-amber-100 shadow-[0_14px_30px_rgba(245,158,11,0.12)] hover:bg-amber-300/15",
        ghost:
          "border-white/10 bg-transparent text-stone-200 hover:border-white/14 hover:bg-white/[0.06] hover:text-stone-50",
      },
      size: {
        sm: "h-10 px-4",
        md: "h-11 px-5.5",
        lg: "h-12 px-6.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles>;

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
      className={cn(buttonStyles({ variant, size }), className)}
      {...props}
    />
  );
}
