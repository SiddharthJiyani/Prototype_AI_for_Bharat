/**
 * Merge class names, filtering out falsy values.
 * Lightweight alternative to clsx + tailwind-merge for prototype use.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
