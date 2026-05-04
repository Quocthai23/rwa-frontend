import * as React from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends React.ComponentProps<'input'> {
  rightAccessory?: React.ReactNode;
}

function Input({ className, type, rightAccessory, ...props }: InputProps) {
  return (
    <div className="relative flex w-full items-center">
      <input
        type={type}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-9 w-full min-w-0 rounded border border-neutral-200 bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-[#0c130f] dark:text-neutral-50 dark:placeholder-neutral-500',
          'focus-visible:border-primary-500 focus-visible:ring-primary-50 focus-visible:ring-[3px] focus-visible:ring-inset',
          'aria-invalid:border-red-500 aria-invalid:text-red-500 aria-invalid:ring-red-50 dark:aria-invalid:ring-red-50',
          className,
        )}
        {...props}
      />
      {rightAccessory ? (
        <div className="absolute right-0 flex items-center pr-2">{rightAccessory}</div>
      ) : null}
    </div>
  );
}

export { Input };
