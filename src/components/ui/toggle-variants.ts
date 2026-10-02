import { cva } from "class-variance-authority";

export const toggleVariants = cva(
  "group/toggle inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-secondary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-muted",
      },
      size: {
        default: "h-11 min-w-11 px-3",
        sm: "h-8 min-w-8 px-2.5 text-xs",
        lg: "h-12 min-w-12 px-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
