import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeExternalUrl(value: string, fallbackPrefix = "https://"): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `${fallbackPrefix}${trimmedValue}`;
}
