import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MarketingConsentCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  /** Override the default copy for this specific call site (e.g. account signup). */
  label?: string;
}

const DEFAULT_LABEL =
  "Send me new recipes, firefighter meal ideas, and Firehall Meals updates by email.";

/**
 * Shared, unchecked-by-default marketing opt-in for email flows
 * (email-shopping-list, lead-magnet PDF), account signup, and Email Recipe.
 * Email Recipe is offered only as part of subscribing, so there the box gates
 * the email; the recipe itself always stays usable on the page. Everywhere
 * else the action must never require checking this box.
 */
export function MarketingConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
  label,
}: MarketingConsentCheckboxProps) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className="mt-0.5"
        data-testid={`checkbox-${id}`}
      />
      <Label
        htmlFor={id}
        className="text-sm font-normal leading-snug text-muted-foreground cursor-pointer"
      >
        {label ?? DEFAULT_LABEL}
      </Label>
    </div>
  );
}
