import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { useExperience } from '@/lib/experience/useExperience';

const baseClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded transition-all outline-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 disabled:opacity-50 disabled:cursor-not-allowed";

const appButtonVariants = cva(baseClasses, {
  variants: {
    variant: {
      // Primary variants
      'primary-contained': 'bg-primary-500 !text-white border-0',
      'primary-outline':
        'bg-background !text-primary-500 border-1 border-primary-500 dark:border-primary-500',
      'primary-ghost': 'bg-primary-50 !text-primary-500 border-0 dark:bg-primary-900/25',

      // Red/Error variants
      'red-contained': 'bg-red-500 !text-white border-0',
      'red-outline': 'bg-background !text-red-500 border-1 border-red-500 dark:border-red-400',
      'red-ghost': 'bg-red-50 !text-red-500 border-0 dark:bg-red-900/20',

      // Green/Success variants
      'green-contained': 'bg-green-500 !text-white border-0',
      'green-outline':
        'bg-background !text-green-500 border-1 border-green-500 dark:border-green-400',
      'green-ghost': 'bg-green-50 !text-green-500 border-0 dark:bg-green-900/20',

      // Neutral variants
      'neutral-contained':
        'bg-neutral-100 !text-neutral-900 border-0 dark:bg-neutral-800 dark:!text-neutral-50',
      'neutral-outline':
        'bg-background !text-neutral-900 border-1 border-neutral-200 dark:!text-neutral-50 dark:border-neutral-800',
      'neutral-ghost':
        'bg-neutral-100 !text-neutral-900 border-0 dark:bg-neutral-800 dark:!text-neutral-50',

      // White/Light variants
      'white-contained': 'bg-background !text-neutral-900 border-0 dark:!text-neutral-50',
      'white-outline':
        'bg-background !text-neutral-900 border-1 border-neutral-200 dark:!text-neutral-50 dark:border-neutral-800',
    },
  },
  defaultVariants: {
    variant: 'primary-contained',
  },
});

const webButtonVariants = cva(baseClasses, {
  variants: {
    variant: {
      // Primary variants
      'primary-contained': 'bg-primary-500 !text-white border-0',
      'primary-outline':
        'bg-background text-primary-500 border-1 border-primary-500 dark:border-primary-500',
      'primary-ghost': 'bg-primary-50 text-primary-500 border-0 dark:bg-primary-900/25',

      // Red/Error variants
      'red-contained': 'bg-red-500 text-white border-0',
      'red-outline': 'bg-background text-red-500 border-1 border-red-500 dark:border-red-400',
      'red-ghost': 'bg-red-50 text-red-500 border-0 dark:bg-red-900/20',

      // Green/Success variants
      'green-contained': 'bg-green-500 text-white border-0',
      'green-outline':
        'bg-background text-green-500 border-1 border-green-500 dark:border-green-400',
      'green-ghost': 'bg-green-50 text-green-500 border-0 dark:bg-green-900/20',

      // Neutral variants
      'neutral-contained':
        'bg-neutral-100 text-neutral-900 border-0 dark:bg-neutral-800 dark:text-neutral-50',
      'neutral-outline':
        'bg-background text-neutral-900 border-1 border-neutral-200 dark:text-neutral-50 dark:border-neutral-800',
      'neutral-ghost':
        'bg-neutral-100 text-neutral-900 border-0 dark:bg-neutral-800 dark:text-neutral-50',

      // White/Light variants
      'white-contained': 'bg-background text-neutral-900 border-0 dark:text-neutral-50',
      'white-outline':
        'bg-background text-neutral-900 border-1 border-neutral-200 dark:text-neutral-50 dark:border-neutral-800',
    },
  },
  defaultVariants: {
    variant: 'primary-contained',
  },
});

// Backward-compatible alias used by shared atoms (calendar/pagination).
// Keep this stable to avoid breaking existing imports.
const buttonVariants = webButtonVariants;

type AppButtonVariantsProps = VariantProps<typeof appButtonVariants>;
type WebButtonVariantsProps = VariantProps<typeof webButtonVariants>;
type ButtonVariant = NonNullable<
  AppButtonVariantsProps['variant'] | WebButtonVariantsProps['variant']
>;

function Button({
  className,
  variant = 'primary-contained',
  asChild = false,
  content,
  children,
  ...props
}: React.ComponentProps<'button'> & {
  variant?: ButtonVariant;
  asChild?: boolean;
  content?: React.ReactNode;
}) {
  const Comp = asChild ? Slot : 'button';
  const experience = useExperience();
  const buttonVariant = experience === 'app' ? appButtonVariants : webButtonVariants;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariant({ variant, className }))}
      {...props}
    >
      {content ?? children}
    </Comp>
  );
}

export { Button, buttonVariants, appButtonVariants, webButtonVariants };
