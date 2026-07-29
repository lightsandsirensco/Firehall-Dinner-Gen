import { CheckCircle2, AlertTriangle, Info } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

const VARIANT_ICON = {
  success: CheckCircle2,
  destructive: AlertTriangle,
  default: Info,
} as const

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = VARIANT_ICON[(variant as keyof typeof VARIANT_ICON) ?? "default"]
        return (
          <Toast key={id} variant={variant} {...props}>
            <Icon
              className={
                "mt-0.5 h-5 w-5 shrink-0 " +
                (variant === "success"
                  ? "text-[hsl(var(--success))]"
                  : variant === "destructive"
                    ? "text-destructive-foreground"
                    : "text-muted-foreground")
              }
              aria-hidden
            />
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
