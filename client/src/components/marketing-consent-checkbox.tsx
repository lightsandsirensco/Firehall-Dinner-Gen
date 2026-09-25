import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MarketingConsentCheckboxProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Shared, unchecked-by-default marketing opt-in for transactional email flows
 * (email-a-recipe, email-shopping-list, lead-magnet PDF). Requesting the
 * transactional action must never require checking this box.
 */
export function MarketingConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
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
        Send me new recipes, firefighter meal ideas, and Firehall Meals updates by email.
      </Label>
    </div>
  );
}
