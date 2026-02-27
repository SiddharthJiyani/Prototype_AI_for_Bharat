import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-border text-foreground bg-transparent',
  success: 'bg-govgreen-100 text-govgreen-800 dark:bg-govgreen-900/40 dark:text-govgreen-300',
  warning: 'bg-saffron-100 text-saffron-800 dark:bg-saffron-900/40 dark:text-saffron-300',
  destructive: 'bg-destructive/15 text-destructive',
  muted: 'bg-muted text-muted-foreground',
}

export default function Badge({ children, variant = 'default', className = '', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
