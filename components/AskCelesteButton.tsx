"use client";

import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCeleste } from "@/components/CelesteProvider";
import { cn } from "@/lib/utils";

type AskCelesteButtonProps = {
  question?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

export function AskCelesteButton({
  question,
  label = "Ask Celeste",
  variant = "outline",
  size = "sm",
  className
}: AskCelesteButtonProps) {
  const { openCeleste } = useCeleste();

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => openCeleste(question)}
    >
      <Moon className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
