import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type RequireKeys<T extends object, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
