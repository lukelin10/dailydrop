/**
 * Utility functions for the application
 */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for combining class names with Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely ensures a value is an array
 * 
 * @param value - The value to ensure is an array
 * @returns The value if it's an array, or an empty array if not
 */
export function ensureArray<T>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}