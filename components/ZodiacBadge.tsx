import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ELEMENT_COLORS, getZodiacFromBirthday } from "@/lib/zodiac";

type ZodiacBadgeProps = {
  birthday: string;
  className?: string;
};

export function ZodiacBadge({ birthday, className }: ZodiacBadgeProps) {
  const sign = getZodiacFromBirthday(birthday);
  if (!sign) return null;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        ELEMENT_COLORS[sign.element],
        className
      )}
    >
      {sign.symbol} {sign.name}
    </Badge>
  );
}
