import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        success:
          "border-transparent bg-success text-success-foreground",
        warning:
          "border-transparent bg-warning text-warning-foreground",
        outline: "text-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
        // Treatment status variants
        novo: "border-primary/20 bg-primary/10 text-primary",
        em_tratamento: "border-success/20 bg-success/10 text-success",
        alta_sucesso: "border-primary/20 bg-primary/10 text-primary",
        abandono: "border-destructive/20 bg-destructive/10 text-destructive",
        aguardando_retorno: "border-warning/20 bg-warning/10 text-warning",
        // Financial status variants
        pago: "border-success/20 bg-success/10 text-success",
        pendente: "border-warning/20 bg-warning/10 text-warning",
        reembolso: "border-muted-foreground/20 bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
