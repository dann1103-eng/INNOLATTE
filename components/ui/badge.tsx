import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
  {
    variants: {
      tone: {
        gray: "bg-slate-100 text-slate-700 border-slate-200",
        green: "bg-green-100 text-green-800 border-green-200",
        amber: "bg-amber-100 text-amber-800 border-amber-200",
        blue: "bg-blue-100 text-blue-800 border-blue-200",
        red: "bg-red-100 text-red-800 border-red-200",
        brand: "bg-brand-100 text-brand-800 border-brand-200",
      },
    },
    defaultVariants: {
      tone: "gray",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
